import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente con cookies para identificar al usuario logueado
async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs: { name: string; value: string; options: CookieOptions }[]) {
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
}

// Cliente service-role: bypassa RLS. Solo en este server route, después de validar al usuario.
function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

async function requirePlus() {
  const auth = await getAuthClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const admin = getAdmin()
  const { data: profile } = await admin.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan !== 'plus') {
    return { error: NextResponse.json({ error: 'Los grupos de estudio son una feature Plus.', code: 'plus_required' }, { status: 403 }) }
  }
  return { user, admin }
}

export async function GET(request: Request) {
  const ctx = await requirePlus()
  if (ctx.error) return ctx.error
  const { user, admin } = ctx
  const id = new URL(request.url).searchParams.get('id')

  if (id) {
    // Detalle: validar membresía
    const { data: yo } = await admin.from('grupo_miembros').select('user_id').eq('grupo_id', id).eq('user_id', user.id).single()
    if (!yo) return NextResponse.json({ error: 'No sos parte de este grupo.' }, { status: 403 })

    const { data: grupo } = await admin.from('grupos').select('id, nombre, codigo, owner_id').eq('id', id).single()
    const { data: miembros } = await admin.from('grupo_miembros').select('user_id, joined_at, profiles(nombre)').eq('grupo_id', id)
    const { data: planes } = await admin
      .from('grupo_planes')
      .select('id, user_id, planes(token_publico, examenes(materia)), profiles(nombre)')
      .eq('grupo_id', id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ grupo, miembros, planes, soyOwner: grupo?.owner_id === user.id, yo: user.id })
  }

  // Lista de mis grupos
  const { data: mem } = await admin.from('grupo_miembros').select('grupo_id').eq('user_id', user.id)
  const ids = (mem ?? []).map(m => m.grupo_id)
  if (ids.length === 0) return NextResponse.json({ grupos: [] })
  const { data: grupos } = await admin.from('grupos').select('id, nombre, codigo').in('id', ids)
  // Conteo de miembros por grupo
  const { data: counts } = await admin.from('grupo_miembros').select('grupo_id').in('grupo_id', ids)
  const porGrupo: Record<string, number> = {}
  for (const c of counts ?? []) porGrupo[c.grupo_id] = (porGrupo[c.grupo_id] ?? 0) + 1
  return NextResponse.json({ grupos: (grupos ?? []).map(g => ({ ...g, miembros: porGrupo[g.id] ?? 1 })) })
}

export async function POST(request: Request) {
  const ctx = await requirePlus()
  if (ctx.error) return ctx.error
  const { user, admin } = ctx
  const body = await request.json() as { action: string; nombre?: string; codigo?: string; grupoId?: string; planId?: string }

  if (body.action === 'crear') {
    const nombre = (body.nombre ?? '').trim()
    if (!nombre) return NextResponse.json({ error: 'Poné un nombre al grupo.' }, { status: 400 })
    const { data: grupo, error } = await admin.from('grupos').insert({ nombre, owner_id: user.id }).select('id').single()
    if (error || !grupo) return NextResponse.json({ error: 'No pude crear el grupo.' }, { status: 500 })
    await admin.from('grupo_miembros').insert({ grupo_id: grupo.id, user_id: user.id })
    return NextResponse.json({ grupoId: grupo.id })
  }

  if (body.action === 'unirse') {
    const codigo = (body.codigo ?? '').trim().toUpperCase()
    if (!codigo) return NextResponse.json({ error: 'Ingresá un código.' }, { status: 400 })
    const { data: grupo } = await admin.from('grupos').select('id').eq('codigo', codigo).single()
    if (!grupo) return NextResponse.json({ error: 'No encontré ningún grupo con ese código.' }, { status: 404 })
    const { error } = await admin.from('grupo_miembros').upsert({ grupo_id: grupo.id, user_id: user.id })
    if (error) return NextResponse.json({ error: 'No pude unirte al grupo.' }, { status: 500 })
    return NextResponse.json({ grupoId: grupo.id })
  }

  if (body.action === 'salir') {
    if (!body.grupoId) return NextResponse.json({ error: 'Falta grupoId' }, { status: 400 })
    await admin.from('grupo_miembros').delete().eq('grupo_id', body.grupoId).eq('user_id', user.id)
    // Si era el dueño y queda vacío, borrar el grupo
    const { data: rest } = await admin.from('grupo_miembros').select('user_id').eq('grupo_id', body.grupoId)
    if (!rest || rest.length === 0) await admin.from('grupos').delete().eq('id', body.grupoId)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'compartir') {
    if (!body.grupoId || !body.planId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    // Validar membresía y que el plan sea del usuario
    const { data: yo } = await admin.from('grupo_miembros').select('user_id').eq('grupo_id', body.grupoId).eq('user_id', user.id).single()
    if (!yo) return NextResponse.json({ error: 'No sos parte de este grupo.' }, { status: 403 })
    const { data: plan } = await admin.from('planes').select('id, examenes(user_id)').eq('id', body.planId).single()
    const ownerId = (plan?.examenes as unknown as { user_id: string } | null)?.user_id
    if (!plan || ownerId !== user.id) return NextResponse.json({ error: 'Ese plan no es tuyo.' }, { status: 403 })
    await admin.from('grupo_planes').upsert({ grupo_id: body.grupoId, plan_id: body.planId, user_id: user.id }, { onConflict: 'grupo_id,plan_id' })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
