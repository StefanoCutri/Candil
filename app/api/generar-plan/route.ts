import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
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

  const { data: examen } = await supabase
    .from('examenes')
    .select('*, temas(*), disponibilidad(*)')
    .eq('id', examenId)
    .eq('user_id', user.id)
    .single()

  if (!examen) return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })

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

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
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

  const jsonText = (message.content[0] as { type: string; text: string }).text.trim()
  let planData: unknown

  try {
    planData = JSON.parse(jsonText)
  } catch {
    return NextResponse.json({ error: 'Error parseando plan de IA' }, { status: 500 })
  }

  const { data: plan, error: planError } = await supabase
    .from('planes')
    .insert({ examen_id: examenId, contenido: planData })
    .select()
    .single()

  if (planError || !plan) {
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
    await supabase.from('bloques').insert(bloques)
  }

  return NextResponse.json({ planId: plan.id })
}
