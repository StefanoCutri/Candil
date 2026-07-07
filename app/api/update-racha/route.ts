import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function handlePOST() {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('racha_dias, mejor_racha, ultima_actividad')
    .eq('id', user.id)
    .single()

  // Fecha de hoy en local del servidor (YYYY-MM-DD)
  const hoy = new Date()
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  const ultima = profile?.ultima_actividad ?? null
  let racha = profile?.racha_dias ?? 0

  if (ultima === hoyStr) {
    // Ya contó hoy, no hacer nada
    return NextResponse.json({ racha, sinCambios: true })
  }

  // ¿La última actividad fue ayer?
  let fueAyer = false
  if (ultima) {
    const [y, m, d] = ultima.split('-').map(Number)
    const ayer = new Date(hoy)
    ayer.setDate(ayer.getDate() - 1)
    fueAyer = y === ayer.getFullYear() && m === ayer.getMonth() + 1 && d === ayer.getDate()
  }

  racha = fueAyer ? racha + 1 : 1
  const mejor = Math.max(profile?.mejor_racha ?? 0, racha)

  await supabase
    .from('profiles')
    .update({ racha_dias: racha, mejor_racha: mejor, ultima_actividad: hoyStr })
    .eq('id', user.id)

  // Los logros de racha los verifica el cliente vía /api/check-logros después de
  // esta actualización, así el toast se muestra donde el usuario está mirando.

  return NextResponse.json({ racha, mejor })
}

export async function POST() {
  try {
    return await handlePOST()
  } catch (e) {
    console.error('[update-racha] Error inesperado:', e)
    return NextResponse.json({ error: 'Algo salió mal. Probá de nuevo.' }, { status: 500 })
  }
}
