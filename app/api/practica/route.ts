import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isUuid, sanitizeText, wrapUserInput, PROMPT_GUARD, checkRateLimit, RATE_LIMIT_MSG, MAX_LEN } from '@/lib/security'

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
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan !== 'pro' && profile?.plan !== 'plus') {
    return NextResponse.json({ error: 'Preguntas de práctica y simulacro son features Pro.', code: 'pro_required' }, { status: 403 })
  }

  if (!checkRateLimit(user.id, 'practica')) {
    return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 })
  }

  const body = await request.json().catch(() => null) as { examenId?: unknown; modo?: unknown } | null
  const examenId = body?.examenId
  const modo = body?.modo === 'simulacro' ? 'simulacro' : 'preguntas'
  if (!isUuid(examenId)) return NextResponse.json({ error: 'examenId requerido' }, { status: 400 })

  const { data: examen } = await supabase
    .from('examenes')
    .select('materia, tipo, temas(nombre, ya_lo_se)')
    .eq('id', examenId)
    .eq('user_id', user.id)
    .single()
  if (!examen) return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })

  const temas = (examen.temas ?? []) as { nombre: string; ya_lo_se: boolean }[]
  if (temas.length === 0) {
    return NextResponse.json({ error: 'Este examen no tiene temas para generar preguntas.' }, { status: 400 })
  }

  const esSimulacro = modo === 'simulacro'
  const materiaSegura = wrapUserInput(sanitizeText(examen.materia, MAX_LEN.materia))
  const listaTemas = temas.map(t => `- ${wrapUserInput(sanitizeText(t.nombre, MAX_LEN.tema))}`).join('\n')

  const instruccion = esSimulacro
    ? `Generá un SIMULACRO de examen completo de ${materiaSegura} (tipo: ${examen.tipo}). Entre 8 y 12 preguntas que cubran todos los temas, con dificultad realista de examen. Si el tipo incluye "multiple_choice", la mayoría deben tener 4 opciones. Si es oral o desarrollo, las preguntas son abiertas con una respuesta modelo.`
    : `Generá entre 6 y 8 PREGUNTAS DE PRÁCTICA de ${materiaSegura} para repasar los temas. Mezclá opción múltiple (4 opciones) con preguntas abiertas cortas. Priorizá los temas no marcados como ya sabidos.`

  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3072,
      system: `Sos Candil, un tutor cálido. Generás material de práctica en JSON puro, sin markdown ni backticks.

Estructura exacta:
{
  "titulo": "string corto",
  "duracion_min": number,
  "preguntas": [
    {
      "tema": "nombre del tema",
      "pregunta": "enunciado",
      "opciones": ["a", "b", "c", "d"] | null,
      "respuesta": "la respuesta correcta (si hay opciones, el texto de la correcta)",
      "explicacion": "por qué, en 1-2 líneas, tono de amigo que ya rindió"
    }
  ]
}

Reglas: "opciones" es null en preguntas abiertas. "duracion_min" estimá según cantidad/tipo. Respondé SOLO con el JSON.

${PROMPT_GUARD}`,
      messages: [{ role: 'user', content: `${instruccion}\n\nTemas:\n${listaTemas}` }],
    })
  } catch (e) {
    console.error('[practica] Error Anthropic:', e)
    return NextResponse.json({ error: 'No pude generar la práctica, intentá de nuevo.' }, { status: 500 })
  }

  const raw = (message.content[0] as { text: string }).text
    .replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    console.error('[practica] JSON inválido:', raw.slice(0, 300))
    return NextResponse.json({ error: 'No pude armar las preguntas, intentá de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ practica: data, modo })
}
