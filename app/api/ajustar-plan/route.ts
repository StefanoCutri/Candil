import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkGenerationLimit } from '@/lib/tierLimits'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
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

  if (profile?.plan !== 'pro' && profile?.plan !== 'plus') {
    return NextResponse.json({ error: 'Solo disponible en Pro' }, { status: 403 })
  }

  const check = await checkGenerationLimit(supabase, user.id)
  if (!check.allowed) {
    return NextResponse.json(
      { error: `Llegaste al límite de ${check.limit} ajustes con IA este mes.` },
      { status: 429 }
    )
  }

  const { planId, mensaje, historial } = await request.json()

  const { data: plan } = await supabase
    .from('planes')
    .select('contenido, examenes(materia)')
    .eq('id', planId)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  const messages = [
    ...(historial ?? []).slice(-6),
    { role: 'user', content: mensaje }
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `Sos Candil, asistente de estudio. El usuario tiene un plan de estudio para "${(plan.examenes as unknown as { materia: string })?.materia}" y quiere modificarlo.

Plan actual (JSON):
${JSON.stringify(plan.contenido, null, 2)}

Si el usuario pide un cambio específico:
1. Aplicá el cambio al plan
2. Respondé con el JSON actualizado entre las etiquetas <plan> y </plan>
3. Seguido de un mensaje corto y cálido explicando qué cambió

Si el usuario hace una pregunta o no pide cambios concretos, respondé normalmente sin etiquetas.

Tono: cálido, directo, como un amigo que te ayuda.`,
    messages
  })

  const text = (response.content[0] as { text: string }).text

  const planMatch = text.match(/<plan>([\s\S]*?)<\/plan>/)
  if (planMatch) {
    try {
      const newPlan = JSON.parse(planMatch[1].trim())
      await supabase
        .from('planes')
        .update({ contenido: newPlan, updated_at: new Date().toISOString() })
        .eq('id', planId)

      // Re-sincronizar bloques con el contenido nuevo, preservando los ya completados
      const horaKey = (h: string | null | undefined) => (h ?? '').slice(0, 5)
      const { data: oldBloques } = await supabase
        .from('bloques')
        .select('dia, hora_inicio, tema, completado')
        .eq('plan_id', planId)
      const doneMap = new Map(
        (oldBloques ?? []).map(b => [`${b.dia}|${horaKey(b.hora_inicio)}|${b.tema}`, b.completado])
      )

      const planTyped = newPlan as { dias?: { fecha: string; bloques?: { hora_inicio: string; hora_fin: string; tema: string; tipo: string }[] }[] }
      const nuevos = (planTyped.dias ?? []).flatMap((dia, diaIdx) =>
        (dia.bloques ?? []).map((bloque, bloqueIdx) => ({
          plan_id: planId,
          dia: dia.fecha,
          hora_inicio: bloque.hora_inicio,
          hora_fin: bloque.hora_fin,
          tema: bloque.tema,
          tipo: bloque.tipo,
          completado: doneMap.get(`${dia.fecha}|${horaKey(bloque.hora_inicio)}|${bloque.tema}`) ?? false,
          orden: diaIdx * 100 + bloqueIdx,
        }))
      )

      await supabase.from('bloques').delete().eq('plan_id', planId)
      if (nuevos.length > 0) {
        await supabase.from('bloques').insert(nuevos)
      }

      const respuesta = text.replace(/<plan>[\s\S]*?<\/plan>/, '').trim()
      return NextResponse.json({ respuesta: respuesta || 'Listo, ajusté tu plan.', actualizado: true })
    } catch {
      // fall through
    }
  }

  return NextResponse.json({ respuesta: text })
}
