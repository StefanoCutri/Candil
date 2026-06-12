import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import PublicoClient, { type PlanPublico } from './PublicoClient'

export default async function PlanPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  )

  const { data: plan } = await supabase
    .from('planes')
    .select('contenido, examenes(materia, fecha, tipo, profiles(nombre))')
    .eq('token_publico', token)
    .single()

  if (!plan) notFound()

  // El join puede venir null si las RLS no permiten lectura pública de examenes/profiles
  const examen = plan.examenes as unknown as { materia: string; fecha: string; tipo: string; profiles?: { nombre: string | null } | null } | null

  const data: PlanPublico = {
    contenido: plan.contenido,
    materia: examen?.materia ?? 'Plan de estudio',
    fecha: examen?.fecha ?? null,
    tipo: examen?.tipo ?? null,
    autor: examen?.profiles?.nombre ?? null,
  }

  return <PublicoClient plan={data} />
}
