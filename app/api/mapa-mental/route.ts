import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    return await handler(request)
  } catch (e) {
    console.error('[mapa-mental] Error no manejado:', e)
    return NextResponse.json({ error: 'Error interno armando el mapa.' }, { status: 500 })
  }
}

async function handler(request: Request) {
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
  if (profile?.plan !== 'plus') {
    return NextResponse.json({ error: 'El mapa mental es una feature Plus.', code: 'plus_required' }, { status: 403 })
  }

  const { examenId } = await request.json() as { examenId: string }
  const { data: examen } = await supabase
    .from('examenes')
    .select('materia, temas(nombre)')
    .eq('id', examenId)
    .eq('user_id', user.id)
    .single()
  if (!examen) return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })

  const temas = (examen.temas ?? []) as { nombre: string }[]
  if (temas.length === 0) return NextResponse.json({ error: 'Este examen no tiene temas.' }, { status: 400 })

  console.log('[mapa-mental] Materia:', examen.materia, '· Temas reales:', temas.map(t => t.nombre))

  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `Sos Candil. Generás un mapa mental de estudio en JSON puro (sin markdown ni backticks).

Estructura exacta:
{
  "centro": "concepto central (la materia)",
  "ramas": [
    { "titulo": "tema o eje principal", "nodos": ["subconcepto clave", "..."] }
  ]
}

Reglas: una rama por tema importante. 2 a 5 nodos por rama, conceptos cortos (1-4 palabras). Respondé SOLO con el JSON.`,
      messages: [{ role: 'user', content: `Materia: ${examen.materia}\nTemas:\n${temas.map(t => `- ${t.nombre}`).join('\n')}` }],
    })
  } catch (e) {
    console.error('[mapa-mental] Error Anthropic:', e)
    return NextResponse.json({ error: 'No pude armar el mapa, intentá de nuevo.' }, { status: 500 })
  }

  const raw = (message.content[0] as { text: string }).text
    .replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  console.log('[mapa-mental] Respuesta IA:', { stopReason: message.stop_reason, largo: raw.length, raw })
  try {
    return NextResponse.json({ mapa: JSON.parse(raw) })
  } catch (e) {
    console.error('[mapa-mental] No pude parsear el JSON de la IA:', e, '· raw:', raw.slice(0, 400))
    return NextResponse.json({ error: 'No pude armar el mapa, intentá de nuevo.' }, { status: 500 })
  }
}
