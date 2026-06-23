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
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan !== 'plus') {
    return NextResponse.json({ error: 'El audio resumen es una feature Plus.', code: 'plus_required' }, { status: 403 })
  }

  const { examenId } = await request.json() as { examenId: string }
  const { data: examen } = await supabase
    .from('examenes')
    .select('materia, tipo, temas(nombre, ya_lo_se)')
    .eq('id', examenId)
    .eq('user_id', user.id)
    .single()
  if (!examen) return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })

  const temas = (examen.temas ?? []) as { nombre: string; ya_lo_se: boolean }[]
  if (temas.length === 0) return NextResponse.json({ error: 'Este examen no tiene temas.' }, { status: 400 })

  // 1) Claude arma el guion del resumen
  let guion = ''
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: `Sos Candil. Escribís un resumen hablado para escuchar (como un audio de repaso), cálido y claro, en "vos" rioplatense. Sin títulos ni markdown ni listas con guiones: texto corrido y natural para ser leído en voz alta. Máximo ~250 palabras.`,
      messages: [{ role: 'user', content: `Materia: ${examen.materia}. Hacé un repaso hablado de estos temas: ${temas.map(t => t.nombre).join(', ')}.` }],
    })
    guion = (msg.content[0] as { text: string }).text.trim()
  } catch (e) {
    console.error('[audio-resumen] Error Anthropic:', e)
    return NextResponse.json({ error: 'No pude armar el resumen, intentá de nuevo.' }, { status: 500 })
  }

  // 2) TTS (OpenAI). Si no hay key, devolvemos el guion en texto como fallback.
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[audio-resumen] OPENAI_API_KEY no configurada — devuelvo el guion en texto, sin audio.')
    return NextResponse.json({ guion, audio: null, aviso: 'Audio no disponible todavía: falta configurar la key de TTS.' })
  }

  try {
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'alloy', input: guion, response_format: 'mp3' }),
    })
    if (!ttsRes.ok) {
      const detalle = await ttsRes.text().catch(() => '')
      console.error('[audio-resumen] TTS falló:', ttsRes.status, detalle)
      return NextResponse.json({ guion, audio: null, aviso: 'No pude generar el audio ahora.' })
    }
    const buf = Buffer.from(await ttsRes.arrayBuffer())
    const dataUrl = `data:audio/mp3;base64,${buf.toString('base64')}`
    return NextResponse.json({ guion, audio: dataUrl })
  } catch (e) {
    console.error('[audio-resumen] Error TTS:', e)
    return NextResponse.json({ guion, audio: null, aviso: 'No pude generar el audio ahora.' })
  }
}
