import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import DashboardClient, { type ExamenRow } from './DashboardClient'

export default async function DashboardPage() {
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
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: examenes } = await supabase
    .from('examenes')
    .select('id, materia, tipo, fecha, estado, temas(id), planes(id, bloques(id, completado))')
    .eq('user_id', user.id)
    .order('fecha', { ascending: true })

  const nombre = profile?.nombre
    ?? user.user_metadata?.full_name
    ?? user.email?.split('@')[0]
    ?? (await getTranslations('common'))('student')

  return (
    <DashboardClient
      nombre={nombre}
      email={user.email ?? null}
      racha={profile?.racha_dias ?? 0}
      ultimaActividad={profile?.ultima_actividad ?? null}
      examenes={(examenes ?? []) as unknown as ExamenRow[]}
    />
  )
}
