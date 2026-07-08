import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkGenerationLimit } from '@/lib/tierLimits'
import { isUuid, sanitizeText, wrapUserInput, PROMPT_GUARD, checkRateLimit, RATE_LIMIT_MSG, MAX_LEN } from '@/lib/security'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    return await regenerarPlan(request)
  } catch (e) {
    console.error('[regenerar-plan] Error no manejado:', e)
    return NextResponse.json({ error: 'Error interno reorganizando el plan' }, { status: 500 })
  }
}

async function regenerarPlan(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!checkRateLimit(user.id, 'regenerar-plan')) {
    return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const examenId = body?.examenId
  if (!isUuid(examenId)) return NextResponse.json({ error: 'examenId requerido' }, { status: 400 })

  // Solo Pro y Plus
  const { data: profileTier } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  const tier = profileTier?.plan ?? 'free'
  if (tier !== 'pro' && tier !== 'plus') {
    return NextResponse.json({ error: 'upgrade_required' }, { status: 403 })
  }

  const { data: examen, error: examenError } = await supabase
    .from('examenes')
    .select('*, disponibilidad(*)')
    .eq('id', examenId)
    .eq('user_id', user.id)
    .single()

  if (examenError || !examen) {
    console.error('[regenerar-plan] Examen no encontrado:', { examenId, message: examenError?.message })
    return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })
  }

  const { data: plan } = await supabase
    .from('planes')
    .select('id, contenido')
    .eq('examen_id', examenId)
    .single()
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  const { data: bloques } = await supabase
    .from('bloques')
    .select('*')
    .eq('plan_id', plan.id)
    .order('orden')

  const hoy = new Date()
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  if (examen.fecha < hoyStr) {
    return NextResponse.json({ error: 'El examen ya pasó' }, { status: 400 })
  }

  const completados = (bloques ?? []).filter(b => b.completado)
  const pendientes = (bloques ?? []).filter(b => !b.completado && b.tipo !== 'pausa')
  const temasPendientes = [...new Set(pendientes.map(b => b.tema))]

  if (temasPendientes.length === 0) {
    return NextResponse.json({ error: 'No hay temas pendientes para reorganizar' }, { status: 400 })
  }

  // Cuenta como una generación de IA
  const check = await checkGenerationLimit(supabase, user.id)
  if (!check.allowed) {
    return NextResponse.json(
      { error: `Llegaste al límite de ${check.limit} planes con IA este mes.` },
      { status: 429 }
    )
  }

  // Bloques completados de hoy en adelante se mantienen; la IA solo reparte lo pendiente
  const disponibilidadRestante = (examen.disponibilidad ?? [])
    .filter((d: { bloqueado: boolean; dia: string }) => !d.bloqueado && d.dia >= hoyStr)

  const prompt = `
Materia: ${wrapUserInput(sanitizeText(examen.materia, MAX_LEN.materia))}
Tipo de examen: ${examen.tipo}
Fecha del examen: ${examen.fecha}
Hora del examen: ${examen.hora ?? 'no especificada'}
Preferencia horaria: ${examen.preferencia_horario}
Hoy es: ${hoyStr}

El estudiante se atrasó. Estos son los temas que le quedan pendientes (NO incluir los que ya completó):
${temasPendientes.map((t, i) => `${i + 1}. ${wrapUserInput(sanitizeText(String(t), MAX_LEN.tema))}`).join('\n')}

Bloques que YA completó y que se mantienen (no los repitas):
${completados.map(b => `- ${b.dia} ${String(b.hora_inicio).slice(0, 5)}: ${b.tema}`).join('\n') || '(ninguno)'}

Disponibilidad horaria desde hoy hasta el examen:
${disponibilidadRestante.map((d: { dia: string; horas: number }) => `${d.dia}: ${d.horas} horas`).join('\n') || `Cada día desde ${hoyStr} hasta ${examen.fecha}: 2 horas`}
`

  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `Sos Candil, un asistente de estudio cálido y humano. El estudiante se atrasó con su plan y hay que reorganizarlo.

Tu tarea: distribuir SOLO los temas pendientes en los días que quedan desde HOY hasta el examen (sin incluir días anteriores a hoy). No repitas temas ya completados.

Respondé un plan en formato JSON con esta estructura:
{
  "dias": [
    {
      "fecha": "YYYY-MM-DD",
      "dia_nombre": "Viernes",
      "bloques": [
        {
          "hora_inicio": "20:00",
          "hora_fin": "21:30",
          "tema": "Nombre del tema",
          "tipo": "estudio",
          "descripcion": "Qué hacer en este bloque",
          "duracion_minutos": 90
        }
      ]
    }
  ],
  "resumen": "Mensaje cálido de 2 líneas resumiendo el plan reorganizado",
  "consejo": "Un consejo específico, empático con el atraso, sin culpar"
}

Reglas:
- Los tipos de bloque son: "estudio" | "repaso" | "pausa" | "simulacro"
- Solo usá fechas desde hoy hasta el día del examen inclusive
- Incluí pausas de 15-20 min cada 1.5-2 horas de estudio
- El último día antes del examen es repaso general y simulacro
- Tono cálido, como un amigo que te acompaña sin juzgarte
- Respondé SOLO con el JSON, sin texto adicional, sin markdown, sin backticks

${PROMPT_GUARD}`,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error('[regenerar-plan] Error de Anthropic:', { status: e.status, message: e.message, error: e.error })
      return NextResponse.json({ error: 'Error reorganizando el plan con IA' }, { status: 500 })
    }
    console.error('[regenerar-plan] Error llamando a Anthropic:', e)
    return NextResponse.json({ error: 'Error reorganizando el plan con IA' }, { status: 500 })
  }

  const jsonText = (message.content[0] as { type: string; text: string }).text.trim()
  const textoLimpio = jsonText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()

  type PlanIA = {
    dias?: { fecha: string; dia_nombre: string; bloques?: { hora_inicio: string; hora_fin: string; tema: string; tipo: string; descripcion?: string; duracion_minutos?: number }[] }[]
    resumen?: string
    consejo?: string
  }
  let nuevoPlan: PlanIA
  try {
    nuevoPlan = JSON.parse(textoLimpio)
  } catch (e) {
    console.error('[regenerar-plan] Error parseando JSON de la IA:', {
      parseError: e instanceof Error ? e.message : e,
      primerosCaracteres: jsonText.slice(0, 300),
    })
    return NextResponse.json({ error: 'Error parseando el plan de IA' }, { status: 500 })
  }

  if (!nuevoPlan.dias || nuevoPlan.dias.length === 0) {
    return NextResponse.json({ error: 'No pude reorganizar el plan esta vez. Probá de nuevo.' }, { status: 400 })
  }

  // Contenido final = días pasados (con completados intactos) + días nuevos desde hoy
  const contenidoViejo = (plan.contenido ?? {}) as PlanIA
  const diasPasados = (contenidoViejo.dias ?? []).filter(d => d.fecha < hoyStr)
  // De los días pasados, conservar solo los bloques completados (lo pendiente pasa al nuevo reparto)
  const completadosSet = new Set(completados.map(b => `${b.dia}|${String(b.hora_inicio).slice(0, 5)}|${b.tema}`))
  const diasPasadosFiltrados = diasPasados
    .map(d => ({
      ...d,
      bloques: (d.bloques ?? []).filter(b => completadosSet.has(`${d.fecha}|${b.hora_inicio.slice(0, 5)}|${b.tema}`)),
    }))
    .filter(d => (d.bloques ?? []).length > 0)

  const contenidoNuevo = {
    dias: [...diasPasadosFiltrados, ...nuevoPlan.dias],
    resumen: nuevoPlan.resumen ?? contenidoViejo.resumen ?? '',
    consejo: nuevoPlan.consejo ?? contenidoViejo.consejo ?? '',
  }

  const { error: updError } = await supabase
    .from('planes')
    .update({ contenido: contenidoNuevo })
    .eq('id', plan.id)
  if (updError) {
    console.error('[regenerar-plan] Error actualizando plan:', updError)
    return NextResponse.json({ error: 'Error guardando el plan reorganizado' }, { status: 500 })
  }

  // Reemplazar bloques NO completados por los nuevos
  const { error: delError } = await supabase
    .from('bloques')
    .delete()
    .eq('plan_id', plan.id)
    .eq('completado', false)
  if (delError) {
    console.error('[regenerar-plan] Error borrando bloques pendientes:', delError)
    return NextResponse.json({ error: 'Error actualizando los bloques' }, { status: 500 })
  }

  const maxOrdenCompletado = completados.reduce((m, b) => Math.max(m, b.orden ?? 0), 0)
  const nuevosBloques = nuevoPlan.dias.flatMap((dia, diaIdx) =>
    (dia.bloques ?? []).map((bloque, bloqueIdx) => ({
      plan_id: plan.id,
      dia: dia.fecha,
      hora_inicio: bloque.hora_inicio,
      hora_fin: bloque.hora_fin,
      tema: bloque.tema,
      tipo: bloque.tipo,
      descripcion: bloque.descripcion ?? null,
      duracion_minutos: bloque.duracion_minutos ?? null,
      completado: false,
      orden: maxOrdenCompletado + 100 + diaIdx * 100 + bloqueIdx,
    }))
  )

  if (nuevosBloques.length > 0) {
    const { error: insError } = await supabase.from('bloques').insert(nuevosBloques)
    if (insError) {
      console.error('[regenerar-plan] Error insertando bloques nuevos:', insError)
      return NextResponse.json({ error: 'Error guardando los bloques nuevos' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, planId: plan.id })
}
