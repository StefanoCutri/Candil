import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Cliente admin: el webhook no tiene sesión de usuario, necesita la service role key para pasar RLS
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId ?? session.client_reference_id
    const plan = session.metadata?.plan === 'plus' ? 'plus' : 'pro'

    if (userId) {
      await supabase
        .from('profiles')
        .update({
          plan,
          stripe_customer_id: (session.customer as string) ?? null,
          stripe_subscription_id: (session.subscription as string) ?? null,
        })
        .eq('id', userId)
    }
  }

  // Cancelación o falta de pago: volver a Free
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabase
      .from('profiles')
      .update({ plan: 'free', stripe_subscription_id: null })
      .eq('stripe_customer_id', sub.customer as string)
  }

  return NextResponse.json({ received: true })
}
