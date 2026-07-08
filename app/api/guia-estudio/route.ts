import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkGenerationLimit } from '@/lib/tierLimits'
import { fetchApuntesBlocks } from '@/lib/apuntes'
import { isUuid, sanitizeText, wrapUserInput, PROMPT_GUARD, checkRateLimit, RATE_LIMIT_MSG, MAX_LEN } from '@/lib/security'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    return await handler(request)
  } catch (e) {
    console.error('[guia-estudio] Error no manejado:', e)
    return NextResponse.json({ error: 'Algo salió mal generando la guía. Intentá de nuevo.' }, { status: 500 })
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
    return NextResponse.json({ error: 'La guía de estudio es una feature Pro.', code: 'pro_required' }, { status: 403 })
  }

  if (!checkRateLimit(user.id, 'guia-estudio')) {
    return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 })
  }

  const body = await request.json().catch(() => null) as { examenId?: unknown } | null
  const examenId = body?.examenId
  if (!isUuid(examenId)) return NextResponse.json({ error: 'examenId requerido' }, { status: 400 })

  const { data: examen } = await supabase
    .from('examenes')
    .select('materia, tipo, temas(nombre, ya_lo_se)')
    .eq('id', examenId)
    .eq('user_id', user.id)
    .single()
  if (!examen) return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })

  const temas = (examen.temas ?? []) as { nombre: string; ya_lo_se: boolean }[]
  if (temas.length === 0) return NextResponse.json({ error: 'Este examen no tiene temas.' }, { status: 400 })

  // Cuenta como 1 generación de IA
  const check = await checkGenerationLimit(supabase, user.id)
  if (!check.allowed) {
    return NextResponse.json(
      { error: `Llegaste al límite de ${check.limit} generaciones con IA este mes.` },
      { status: 429 }
    )
  }

  const apuntes = await fetchApuntesBlocks(supabase, examenId, user.id)
  const listaTemas = temas.map(t => `- ${wrapUserInput(sanitizeText(t.nombre, MAX_LEN.tema))}${t.ya_lo_se ? ' [ya lo sabe]' : ''}`).join('\n')
  const pedido = `Materia: ${wrapUserInput(sanitizeText(examen.materia, MAX_LEN.materia))} (tipo de examen: ${examen.tipo})

Temas del examen:
${listaTemas}

${apuntes.length > 0 ? 'Arriba tenés los apuntes que subió el estudiante: basá la guía en ellos y complementá con conocimiento general de la materia.' : 'No hay apuntes subidos: armá la guía con conocimiento general de la materia.'}`

  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: `Sos Candil, un tutor cálido. Generás una GUÍA DE ESTUDIO estructurada en Markdown.

Formato:
- Un título de la guía (# Guía de estudio — materia)
- Por cada tema: un encabezado (## Tema), y debajo bullet points concisos con:
  * **Conceptos clave** con definiciones cortas
  * **Definiciones** importantes
  * **Relaciones** con otros temas cuando existan
- Extensión: el equivalente a 1-2 páginas por tema, conciso y estudiable
- Solo Markdown, sin backticks de código alrededor del documento

${PROMPT_GUARD}`,
      messages: [{ role: 'user', content: [...apuntes, { type: 'text', text: pedido }] as unknown as Anthropic.MessageParam["content"] }],
    })
  } catch (e) {
    console.error('[guia-estudio] Error Anthropic:', e)
    return NextResponse.json({ error: 'No pude generar la guía, intentá de nuevo.' }, { status: 500 })
  }

  const guia = (message.content.find(b => b.type === 'text') as { text: string } | undefined)?.text?.trim() ?? ''
  if (!guia) return NextResponse.json({ error: 'No pude generar la guía, intentá de nuevo.' }, { status: 500 })
  return NextResponse.json({ guia })
}
