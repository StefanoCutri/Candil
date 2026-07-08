import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { fetchApuntesBlocks } from '@/lib/apuntes'
import { isUuid, sanitizeText, wrapUserInput, PROMPT_GUARD, checkRateLimit, RATE_LIMIT_MSG, MAX_LEN } from '@/lib/security'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    return await handler(request)
  } catch (e) {
    console.error('[flashcards] Error no manejado:', e)
    return NextResponse.json({ error: 'Algo salió mal generando las flashcards. Intentá de nuevo.' }, { status: 500 })
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
  if (profile?.plan !== 'pro' && profile?.plan !== 'plus') {
    return NextResponse.json({ error: 'Las flashcards son una feature Pro.', code: 'pro_required' }, { status: 403 })
  }

  if (!checkRateLimit(user.id, 'flashcards')) {
    return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 })
  }

  const body = await request.json().catch(() => null) as { examenId?: unknown } | null
  const examenId = body?.examenId
  if (!isUuid(examenId)) return NextResponse.json({ error: 'examenId requerido' }, { status: 400 })

  const { data: examen } = await supabase
    .from('examenes')
    .select('materia, temas(nombre, ya_lo_se)')
    .eq('id', examenId)
    .eq('user_id', user.id)
    .single()
  if (!examen) return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })

  const temas = (examen.temas ?? []) as { nombre: string; ya_lo_se: boolean }[]
  if (temas.length === 0) return NextResponse.json({ error: 'Este examen no tiene temas.' }, { status: 400 })

  const apuntes = await fetchApuntesBlocks(supabase, examenId, user.id)
  const pedido = `Materia: ${wrapUserInput(sanitizeText(examen.materia, MAX_LEN.materia))}

Temas:
${temas.map(t => `- ${wrapUserInput(sanitizeText(t.nombre, MAX_LEN.tema))}`).join('\n')}

${apuntes.length > 0 ? 'Basá las flashcards en los apuntes de arriba, cubriendo todos los temas.' : 'No hay apuntes: usá conocimiento general de la materia, cubriendo todos los temas.'}`

  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: `Sos Candil, un tutor cálido. Generás flashcards de estudio en JSON puro, sin markdown ni backticks.

Estructura exacta:
{ "flashcards": [ { "frente": "pregunta corta", "dorso": "respuesta concisa" } ] }

Reglas: entre 15 y 20 flashcards. "frente" es una pregunta corta y directa; "dorso" la respuesta concisa (1-3 líneas). Cubrí todos los temas. Respondé SOLO con el JSON.

${PROMPT_GUARD}`,
      messages: [{ role: 'user', content: [...apuntes, { type: 'text', text: pedido }] as unknown as Anthropic.MessageParam["content"] }],
    })
  } catch (e) {
    console.error('[flashcards] Error Anthropic:', e)
    return NextResponse.json({ error: 'No pude generar las flashcards, intentá de nuevo.' }, { status: 500 })
  }

  const raw = ((message.content.find(b => b.type === 'text') as { text: string } | undefined)?.text ?? '')
    .replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  try {
    const data = JSON.parse(raw) as { flashcards?: { frente?: unknown; dorso?: unknown }[] }
    const flashcards = (data.flashcards ?? [])
      .filter(f => typeof f?.frente === 'string' && typeof f?.dorso === 'string')
      .map(f => ({ frente: f.frente as string, dorso: f.dorso as string }))
    if (flashcards.length === 0) throw new Error('sin flashcards')
    return NextResponse.json({ flashcards })
  } catch {
    console.error('[flashcards] JSON inválido:', raw.slice(0, 300))
    return NextResponse.json({ error: 'No pude armar las flashcards, intentá de nuevo.' }, { status: 500 })
  }
}
