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
    console.error('[resumen-notebook] Error no manejado:', e)
    return NextResponse.json({ error: 'Algo salió mal generando el resumen. Intentá de nuevo.' }, { status: 500 })
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
    return NextResponse.json({ error: 'El resumen completo es una feature Plus.', code: 'plus_required' }, { status: 403 })
  }

  if (!checkRateLimit(user.id, 'resumen-notebook')) {
    return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 })
  }

  const body = await request.json().catch(() => null) as { examenId?: unknown } | null
  const examenId = body?.examenId
  if (!isUuid(examenId)) return NextResponse.json({ error: 'examenId requerido' }, { status: 400 })

  const { data: examen } = await supabase
    .from('examenes')
    .select('materia, tipo, temas(nombre)')
    .eq('id', examenId)
    .eq('user_id', user.id)
    .single()
  if (!examen) return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })

  const temas = (examen.temas ?? []) as { nombre: string }[]
  const apuntes = await fetchApuntesBlocks(supabase, examenId, user.id)
  if (apuntes.length === 0) {
    return NextResponse.json({ error: 'Subí apuntes primero para generar el resumen completo.' }, { status: 400 })
  }

  const pedido = `Materia: ${wrapUserInput(sanitizeText(examen.materia, MAX_LEN.materia))} (tipo de examen: ${examen.tipo})

Temas del examen:
${temas.map(t => `- ${wrapUserInput(sanitizeText(t.nombre, MAX_LEN.tema))}`).join('\n')}

Arriba están todos los apuntes que subió el estudiante. Generá el resumen ejecutivo sintetizando ese material.`

  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system: `Sos Candil, un tutor cálido. Generás un RESUMEN EJECUTIVO en Markdown que sintetiza todo el material que subió el estudiante.

Estructura:
- # Resumen — materia
- ## Overview general (qué cubre el material, en 1-2 párrafos)
- ## Conceptos más importantes (bullets con definiciones cortas)
- ## Relaciones entre temas (cómo se conectan)
- ## Lo que probablemente caiga en el examen (bullets, priorizados)

Extensión total: 1-2 páginas. Solo Markdown, sin backticks de código alrededor del documento.

${PROMPT_GUARD}`,
      messages: [{ role: 'user', content: [...apuntes, { type: 'text', text: pedido }] as unknown as Anthropic.MessageParam["content"] }],
    })
  } catch (e) {
    console.error('[resumen-notebook] Error Anthropic:', e)
    return NextResponse.json({ error: 'No pude generar el resumen, intentá de nuevo.' }, { status: 500 })
  }

  const resumen = (message.content.find(b => b.type === 'text') as { text: string } | undefined)?.text?.trim() ?? ''
  if (!resumen) return NextResponse.json({ error: 'No pude generar el resumen, intentá de nuevo.' }, { status: 500 })
  return NextResponse.json({ resumen })
}
