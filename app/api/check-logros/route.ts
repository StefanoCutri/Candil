import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkLogros, type AccionLogro, type ContextoLogro } from '@/lib/checkLogros'

const ACCIONES: AccionLogro[] = ['completar_bloque', 'generar_plan', 'compartir', 'unirse_grupo', 'racha']

export async function POST(request: Request) {
  try {
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

    const body = await request.json().catch(() => null)
    const accion = body?.accion as AccionLogro
    if (!ACCIONES.includes(accion)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const nuevos = await checkLogros(supabase, user.id, accion, (body?.ctx ?? {}) as ContextoLogro)
    return NextResponse.json({ nuevos })
  } catch (e) {
    console.error('[check-logros] Error inesperado:', e)
    return NextResponse.json({ error: 'Error verificando logros' }, { status: 500 })
  }
}
