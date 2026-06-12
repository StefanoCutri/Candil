import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const PRICE_IDS: Record<string, string | undefined> = {
    'pro:mensual': process.env.STRIPE_PRO_PRICE_ID,
    'pro:anual': process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    'plus:mensual': process.env.STRIPE_PLUS_PRICE_ID,
    'plus:anual': process.env.STRIPE_PLUS_ANNUAL_PRICE_ID,
  }
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

  const { planId, periodo } = await request.json() as { planId: 'pro' | 'plus'; periodo?: 'mensual' | 'anual' }
  if (planId !== 'pro' && planId !== 'plus') {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  }

  const ciclo = periodo === 'anual' ? 'anual' : 'mensual'
  const priceId = PRICE_IDS[`${planId}:${ciclo}`]
  if (!priceId) {
    return NextResponse.json({ error: `Falta configurar el price ID de ${planId} ${ciclo}` }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin

  // Reusar el customer de Stripe si ya existe
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgrade=success`,
    cancel_url: `${appUrl}/precios`,
    client_reference_id: user.id,
    ...(profile?.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: user.email }),
    metadata: { userId: user.id, plan: planId },
    subscription_data: { metadata: { userId: user.id, plan: planId } },
  })

  return NextResponse.json({ url: session.url })
}
