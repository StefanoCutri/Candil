import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import PerfilClient, { type PerfilExamen } from './PerfilClient'

export default async function PerfilPage() {
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
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: examenes } = await supabase
    .from('examenes')
    .select('id, materia, fecha, estado, planes(id, bloques(id, completado, hora_inicio, hora_fin))')
    .eq('user_id', user.id)
    .order('fecha', { ascending: false })

  // Horas estudiadas = suma de duración de bloques completados
  let horasEstudiadas = 0
  let rendidos = 0
  const lista: PerfilExamen[] = (examenes ?? []).map((e) => {
    const bloques = e.planes?.[0]?.bloques ?? []
    for (const b of bloques) {
      if (!b.completado) continue
      const [hi, mi] = (b.hora_inicio ?? '00:00').split(':').map(Number)
      const [hf, mf] = (b.hora_fin ?? '00:00').split(':').map(Number)
      const min = (hf * 60 + mf) - (hi * 60 + mi)
      if (min > 0) horasEstudiadas += min / 60
    }
    if (e.estado === 'completado') rendidos++
    return { id: e.id, materia: e.materia, fecha: e.fecha, estado: e.estado, planId: e.planes?.[0]?.id ?? null }
  })

  const nombre = profile?.nombre ?? user.email?.split('@')[0] ?? 'estudiante'

  return (
    <PerfilClient
      nombre={nombre}
      email={user.email ?? ''}
      plan={profile?.plan ?? 'free'}
      racha={profile?.racha_dias ?? 0}
      mejorRacha={profile?.mejor_racha ?? 0}
      totalExamenes={lista.length}
      rendidos={rendidos}
      horasEstudiadas={Math.round(horasEstudiadas)}
      examenes={lista}
    />
  )
}
