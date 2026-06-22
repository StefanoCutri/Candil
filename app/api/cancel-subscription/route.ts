import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
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
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No tenés una suscripción activa.' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('[cancel-subscription] STRIPE_SECRET_KEY no configurada — no se puede cancelar.')
    return NextResponse.json({ error: 'Pagos no configurados todavía.' }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  // Cancela al final del período: el usuario mantiene Pro hasta que termina lo pagado.
  await stripe.subscriptions.update(profile.stripe_subscription_id, { cancel_at_period_end: true })

  return NextResponse.json({ ok: true })
}
