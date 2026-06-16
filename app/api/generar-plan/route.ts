import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkGenerationLimit } from '@/lib/tierLimits'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    return await generarPlan(request)
  } catch (e) {
    // Catch-all: cualquier error no manejado termina acá en vez de un 500 mudo
    console.error('[generar-plan] Error no manejado:', e)
    return NextResponse.json({ error: 'Error interno generando el plan' }, { status: 500 })
  }
}

async function generarPlan(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { examenId } = await request.json()
  if (!examenId) return NextResponse.json({ error: 'examenId requerido' }, { status: 400 })

  const { data: examen, error: examenError } = await supabase
    .from('examenes')
    .select('*, temas(*), disponibilidad(*)')
    .eq('id', examenId)
    .eq('user_id', user.id)
    .single()

  if (examenError || !examen) {
    console.error('[generar-plan] Error trayendo examen:', {
      examenId,
      userId: user.id,
      code: examenError?.code,
      message: examenError?.message,
      details: examenError?.details,
      hint: examenError?.hint,
    })
    return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })
  }

  const check = await checkGenerationLimit(supabase, user.id)
  if (!check.allowed) {
    return NextResponse.json(
      { error: `Llegaste al límite de ${check.limit} planes con IA este mes. Pasate a Pro para seguir generando.` },
      { status: 429 }
    )
  }

  const prompt = `
Materia: ${examen.materia}
Tipo de examen: ${examen.tipo}
Fecha del examen: ${examen.fecha}
Hora del examen: ${examen.hora ?? 'no especificada'}
Preferencia horaria: ${examen.preferencia_horario}

Temas a estudiar:
${(examen.temas ?? []).map((t: { nombre: string; ya_lo_se: boolean; peso: number | null }, i: number) =>
  `${i + 1}. ${t.nombre}${t.ya_lo_se ? ' [YA LO SÉ]' : ''}${t.peso ? ` (peso: ${t.peso}%)` : ''}`
).join('\n')}

Disponibilidad horaria:
${(examen.disponibilidad ?? [])
  .filter((d: { bloqueado: boolean }) => !d.bloqueado)
  .map((d: { dia: string; horas: number }) => `${d.dia}: ${d.horas} horas`)
  .join('\n')}
`

  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `Sos Candil, un asistente de estudio cálido y humano. Tu tarea es generar un plan de estudio personalizado.

Recibís:
- Materia y tipo de examen
- Lista de temas (con los que ya sabe marcados y el peso de cada uno)
- Fechas disponibles con horas por día
- Preferencia de horario (mañana/tarde/noche)
- Fecha y hora del examen

Generás un plan en formato JSON con esta estructura:
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
  "resumen": "Mensaje cálido de 2 líneas resumiendo el plan",
  "consejo": "Un consejo específico para este examen"
}

Reglas:
- Los tipos de bloque son: "estudio" | "repaso" | "pausa" | "simulacro"
- Distribuí los temas proporcionalmente a su peso en el examen
- Los temas marcados como "ya lo sé" solo necesitan un repaso breve al final
- Incluí pausas de 15-20 min cada 1.5-2 horas de estudio
- El último día antes del examen es solo repaso general y simulacro, no contenido nuevo
- Los bloques en el horario preferido del usuario son los más densos
- Tono cálido en descripciones y mensajes, como un amigo que te acompaña
- Respondé SOLO con el JSON, sin texto adicional, sin markdown, sin backticks`,
      messages: [{ role: 'user', content: prompt }]
    })
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      // `e.error` trae el cuerpo exacto que devolvió Anthropic (type + message),
      // que es lo que de verdad explica el fallo (modelo inválido, auth, rate limit, etc.)
      console.error('[generar-plan] Error de la API de Anthropic:', {
        status: e.status,
        name: e.name,
        message: e.message,
        error: e.error,
        requestId: e.requestID,
        headers: e.headers,
        apiKeyPresente: Boolean(process.env.ANTHROPIC_API_KEY),
      })
      console.error('[generar-plan] Error de Anthropic (objeto completo):', e)
      return NextResponse.json(
        {
          error: 'Error generando el plan con IA',
          detalle: e.error ?? e.message,
          status: e.status,
        },
        { status: 500 }
      )
    }
    console.error('[generar-plan] Error inesperado llamando a Anthropic:', e)
    return NextResponse.json(
      { error: 'Error generando el plan con IA', detalle: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }

  const jsonText = (message.content[0] as { type: string; text: string }).text.trim()

  console.log('[generar-plan] Respuesta completa de Anthropic:', {
    stopReason: message.stop_reason,
    largoTotal: jsonText.length,
    textoCompleto: jsonText,
  })

  // La IA a veces envuelve el JSON en un bloque markdown pese al system prompt.
  const textoLimpio = jsonText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()

  let planData: unknown

  try {
    planData = JSON.parse(textoLimpio)
  } catch (e) {
    console.error('[generar-plan] Error parseando JSON de la IA:', {
      parseError: e instanceof Error ? e.message : e,
      stopReason: message.stop_reason,
      primerosCaracteres: jsonText.slice(0, 300),
      ultimosCaracteres: jsonText.slice(-300),
      largoTotal: jsonText.length,
    })
    return NextResponse.json({ error: 'Error parseando plan de IA' }, { status: 500 })
  }

  const planParsed = planData as { dias?: unknown[] }
  if (!planParsed.dias || planParsed.dias.length === 0) {
    return NextResponse.json(
      { error: 'No hay temas cargados. Agregá temas en el paso 2 del wizard.' },
      { status: 400 }
    )
  }

  const { data: plan, error: planError } = await supabase
    .from('planes')
    .insert({ examen_id: examenId, contenido: planData })
    .select()
    .single()

  if (planError || !plan) {
    console.error('[generar-plan] Error insertando en planes:', {
      examenId,
      code: planError?.code,
      message: planError?.message,
      details: planError?.details,
      hint: planError?.hint,
    })
    return NextResponse.json({ error: 'Error guardando plan' }, { status: 500 })
  }

  const planTyped = planData as { dias?: { fecha: string; dia_nombre: string; bloques?: { hora_inicio: string; hora_fin: string; tema: string; tipo: string; duracion_minutos: number }[] }[] }
  const bloques = (planTyped.dias ?? []).flatMap((dia, diaIdx: number) =>
    (dia.bloques ?? []).map((bloque, bloqueIdx: number) => ({
      plan_id: plan.id,
      dia: dia.fecha,
      hora_inicio: bloque.hora_inicio,
      hora_fin: bloque.hora_fin,
      tema: bloque.tema,
      tipo: bloque.tipo,
      completado: false,
      orden: diaIdx * 100 + bloqueIdx
    }))
  )

  if (bloques.length > 0) {
    const { error: bloquesError } = await supabase.from('bloques').insert(bloques)
    if (bloquesError) {
      console.error('[generar-plan] Error insertando bloques:', {
        planId: plan.id,
        cantidad: bloques.length,
        code: bloquesError.code,
        message: bloquesError.message,
        details: bloquesError.details,
        hint: bloquesError.hint,
      })
    }
  }

  return NextResponse.json({ planId: plan.id })
}
