import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isUuid, sniffMime } from '@/lib/security'

const MB = 1024 * 1024
const LIMITES = {
  pro: { porArchivo: 10 * MB, total: 500 * MB },
  plus: { porArchivo: 50 * MB, total: 5 * 1024 * MB },
} as const

async function handlePOST(request: Request) {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan as keyof typeof LIMITES | undefined
  if (plan !== 'pro' && plan !== 'plus') {
    return NextResponse.json({ error: 'Subir apuntes es una feature Pro' }, { status: 403 })
  }
  const limite = LIMITES[plan]

  const form = await request.formData()
  const archivo = form.get('archivo')
  const examenId = form.get('examenId')
  if (!(archivo instanceof File) || !isUuid(examenId)) {
    return NextResponse.json({ error: 'Faltan archivo o examenId' }, { status: 400 })
  }

  // El examen tiene que ser del usuario
  const { data: examen } = await supabase
    .from('examenes')
    .select('id')
    .eq('id', examenId)
    .eq('user_id', user.id)
    .single()
  if (!examen) return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })

  if (archivo.size > limite.porArchivo) {
    return NextResponse.json(
      { error: `El archivo supera el máximo de ${limite.porArchivo / MB}MB de tu plan` },
      { status: 400 }
    )
  }

  // Tipo real por magic bytes: el Content-Type y la extensión los controla el
  // cliente y no alcanzan para bloquear ejecutables, HTML, SVG, etc.
  const buffer = Buffer.from(await archivo.arrayBuffer())
  const mimeReal = sniffMime(buffer)
  console.log(`[upload-archivo] tipo detectado: ${mimeReal ?? 'desconocido/rechazado'} — "${archivo.name}" (${archivo.size} bytes, user ${user.id})`)
  if (!mimeReal) {
    return NextResponse.json({ error: 'Solo se aceptan PDFs e imágenes (JPG, PNG, WebP)' }, { status: 400 })
  }
  const esPdf = mimeReal === 'application/pdf'

  const { data: existentes } = await supabase
    .from('archivos')
    .select('tamanio_bytes')
    .eq('user_id', user.id)
  const usado = (existentes ?? []).reduce((s, a) => s + (a.tamanio_bytes ?? 0), 0)
  if (usado + archivo.size > limite.total) {
    return NextResponse.json(
      { error: 'Te quedaste sin espacio. Borrá algún apunte o pasate a Plus.' },
      { status: 400 }
    )
  }

  const nombreLimpio = archivo.name.replace(/[^\w.\-]+/g, '_')
  const storagePath = `${user.id}/${examenId}/${Date.now()}_${nombreLimpio}`

  const { error: uploadError } = await supabase.storage
    .from('apuntes')
    .upload(storagePath, buffer, { contentType: mimeReal })
  if (uploadError) {
    return NextResponse.json({ error: 'Algo salió mal subiendo el archivo, intentá de nuevo' }, { status: 500 })
  }

  const { data: registro, error: dbError } = await supabase
    .from('archivos')
    .insert({
      examen_id: examenId,
      user_id: user.id,
      nombre: archivo.name.replace(/<[^>]*>?/g, '').slice(0, 200),
      tipo: esPdf ? 'pdf' : 'imagen',
      storage_path: storagePath,
      tamanio_bytes: archivo.size,
    })
    .select()
    .single()

  if (dbError || !registro) {
    // No dejar el archivo huérfano en storage
    await supabase.storage.from('apuntes').remove([storagePath])
    return NextResponse.json({ error: 'Algo salió mal, intentá de nuevo' }, { status: 500 })
  }

  return NextResponse.json({ archivo: registro })
}

export async function POST(request: Request) {
  try {
    return await handlePOST(request)
  } catch (e) {
    console.error('[upload-archivo] Error inesperado:', e)
    return NextResponse.json({ error: 'Algo salió mal. Probá de nuevo.' }, { status: 500 })
  }
}
