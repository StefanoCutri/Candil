import type { SupabaseClient } from '@supabase/supabase-js'

// Generaciones de IA por mes según plan. Plus no tiene límite.
const LIMITES: Record<string, number> = { free: 5, pro: 30 }

export type GenerationCheck =
  | { allowed: true }
  | { allowed: false; limit: number; used: number }

export async function checkGenerationLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<GenerationCheck> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, ai_generations_this_month, ai_generations_reset_at')
    .eq('id', userId)
    .single()

  if (profileError) {
    // Si la migración no corrió, acá aparece "column ... does not exist" (code 42703)
    console.error('[tierLimits] Error leyendo profile:', {
      userId,
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    })
  }

  const plan = profile?.plan ?? 'free'
  if (plan === 'plus') return { allowed: true }

  const limit = LIMITES[plan] ?? LIMITES.free
  const used = profile?.ai_generations_this_month ?? 0
  const resetAt = profile?.ai_generations_reset_at ? new Date(profile.ai_generations_reset_at) : null
  const now = new Date()

  // Reset mensual: arranca el contador de nuevo (en 1, contando esta generación)
  if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    const { error } = await supabase
      .from('profiles')
      .update({ ai_generations_this_month: 1, ai_generations_reset_at: now.toISOString() })
      .eq('id', userId)
    if (error) console.error('[tierLimits] Error reseteando contador mensual:', { userId, code: error.code, message: error.message })
    return { allowed: true }
  }

  if (used >= limit) return { allowed: false, limit, used }

  const { error } = await supabase
    .from('profiles')
    .update({ ai_generations_this_month: used + 1 })
    .eq('id', userId)
  if (error) console.error('[tierLimits] Error incrementando contador:', { userId, code: error.code, message: error.message })
  return { allowed: true }
}
