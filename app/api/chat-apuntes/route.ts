import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MAX_ARCHIVOS = 5
const MAX_BYTES = 12 * 1024 * 1024 // tope total para no reventar el contexto

export async function POST(request: Request) {
  try {
    return await handler(request)
  } catch (e) {
    console.error('[chat-apuntes] Error no manejado:', e)
    return NextResponse.json({ error: 'Algo salió mal leyendo tus apuntes. Intentá de nuevo.' }, { status: 500 })
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
    return NextResponse.json({ error: 'El chat con apuntes es una feature Plus.', code: 'plus_required' }, { status: 403 })
  }

  const { examenId, mensaje, historial } = await request.json() as {
    examenId: string; mensaje: string; historial?: { role: 'user' | 'assistant'; content: string }[]
  }
  if (!mensaje?.trim()) return NextResponse.json({ error: 'Escribí una pregunta.' }, { status: 400 })

  const { data: archivos } = await supabase
    .from('archivos')
    .select('nombre, tipo, storage_path, tamanio_bytes')
    .eq('examen_id', examenId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_ARCHIVOS)

  console.log('[chat-apuntes] Apuntes encontrados para examen', examenId, ':', archivos?.length ?? 0)
  if (!archivos || archivos.length === 0) {
    return NextResponse.json({ error: 'Subí apuntes primero para poder chatear con ellos.' }, { status: 400 })
  }

  // Descargar y convertir a bloques solo en el primer turno (cuando no hay historial)
  const esPrimerTurno = !historial || historial.length === 0
  // Tipado laxo: esta versión del SDK no exporta ContentBlockParam a nivel top,
  // pero el endpoint sí acepta document (PDF) e image en runtime.
  const contentBlocks: Record<string, unknown>[] = []
  let acumulado = 0

  if (esPrimerTurno) {
    for (const a of archivos) {
      if (acumulado + (a.tamanio_bytes ?? 0) > MAX_BYTES) continue
      const { data: blob } = await supabase.storage.from('apuntes').download(a.storage_path)
      if (!blob) continue
      const b64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
      acumulado += a.tamanio_bytes ?? 0
      if (a.tipo === 'pdf') {
        contentBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } })
      } else {
        const mt = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg'
        contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mt as 'image/jpeg' | 'image/png' | 'image/webp', data: b64 } })
      }
    }
  }
  contentBlocks.push({ type: 'text', text: mensaje })

  const messages = [
    ...((historial ?? []).slice(-8)),
    { role: 'user', content: esPrimerTurno ? contentBlocks : mensaje },
  ] as unknown as Anthropic.MessageParam[]

  let response: Anthropic.Message
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `Sos Candil, un tutor cálido que responde SOLO en base a los apuntes que el estudiante subió. Si la respuesta no está en los apuntes, decilo con honestidad y sugerí qué buscar. Tono de amigo que ya rindió, en "vos". Respuestas claras y al grano.`,
      messages,
    })
  } catch (e) {
    console.error('[chat-apuntes] Error Anthropic:', e)
    return NextResponse.json({ error: 'No pude leer tus apuntes ahora, intentá de nuevo.' }, { status: 500 })
  }

  const text = (response.content.find(b => b.type === 'text') as { text: string } | undefined)?.text ?? ''
  return NextResponse.json({ respuesta: text })
}
