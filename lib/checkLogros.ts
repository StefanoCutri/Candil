// Verificación de logros (server-side). Consulta el estado actual del usuario,
// compara contra los logros definidos y persiste los nuevos en profiles.
import type { SupabaseClient } from '@supabase/supabase-js'
import { LOGROS, nivelParaXp, type Logro } from './logros'

export type AccionLogro =
  | 'completar_bloque'
  | 'generar_plan'
  | 'compartir'
  | 'unirse_grupo'
  | 'racha'

export type ContextoLogro = {
  hora?: number          // hora local del cliente (0-23) al completar un bloque
  diaCompleto?: boolean  // completó todos los bloques del día
  tresSeguidos?: boolean // completó 3 bloques seguidos sin saltar
  progreso?: number      // % de progreso del plan actual
}

// Qué logros se verifican en cada acción
const LOGROS_POR_ACCION: Record<AccionLogro, string[]> = {
  completar_bloque: ['primer_bloque', 'madrugador', 'noctambulo', 'sin_pausas', 'dia_perfecto', 'mitad_plan', 'plan_completo'],
  generar_plan: ['primer_plan', '5_planes', '10_planes'],
  compartir: ['primer_share'],
  unirse_grupo: ['primer_grupo'],
  racha: ['racha_3', 'racha_7', 'racha_30'],
}

async function contarPlanes(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from('examenes')
    .select('id, planes(id)')
    .eq('user_id', userId)
  return (data ?? []).reduce((s, e) => s + ((e.planes as { id: string }[] | null)?.length ?? 0), 0)
}

async function contarBloquesCompletados(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from('examenes')
    .select('planes(bloques(id, completado))')
    .eq('user_id', userId)
  let total = 0
  for (const e of data ?? []) {
    for (const p of (e.planes as { bloques: { completado: boolean }[] }[] | null) ?? []) {
      total += (p.bloques ?? []).filter(b => b.completado).length
    }
  }
  return total
}

export async function checkLogros(
  supabase: SupabaseClient,
  userId: string,
  accion: AccionLogro,
  ctx: ContextoLogro = {}
): Promise<Logro[]> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('logros, xp, nivel, racha_dias')
    .eq('id', userId)
    .single()

  if (error) {
    // Si la migración 006 no corrió, acá aparece "column ... does not exist"
    console.error('[checkLogros] Error leyendo profile:', { userId, code: error.code, message: error.message })
    return []
  }

  const desbloqueados: string[] = Array.isArray(profile?.logros) ? profile.logros : []
  const candidatos = LOGROS.filter(
    l => LOGROS_POR_ACCION[accion].includes(l.id) && !desbloqueados.includes(l.id)
  )
  if (candidatos.length === 0) return []

  // Solo consultamos los contadores que algún candidato necesita
  const necesitaPlanes = candidatos.some(l => l.condicion.startsWith('planes_creados'))
  const necesitaBloques = candidatos.some(l => l.condicion.startsWith('bloques_completados'))
  const planesCreados = necesitaPlanes ? await contarPlanes(supabase, userId) : 0
  const bloquesCompletados = necesitaBloques ? await contarBloquesCompletados(supabase, userId) : 0
  const racha = profile?.racha_dias ?? 0

  const cumple = (l: Logro): boolean => {
    switch (l.id) {
      case 'primer_plan': return planesCreados >= 1
      case '5_planes': return planesCreados >= 5
      case '10_planes': return planesCreados >= 10
      case 'primer_bloque': return bloquesCompletados >= 1
      case 'racha_3': return racha >= 3
      case 'racha_7': return racha >= 7
      case 'racha_30': return racha >= 30
      case 'madrugador': return ctx.hora !== undefined && ctx.hora < 8
      case 'noctambulo': return ctx.hora !== undefined && (ctx.hora >= 0 && ctx.hora < 5)
      case 'sin_pausas': return ctx.tresSeguidos === true
      case 'dia_perfecto': return ctx.diaCompleto === true
      case 'mitad_plan': return (ctx.progreso ?? 0) >= 50
      case 'plan_completo': return (ctx.progreso ?? 0) >= 100
      case 'primer_share': return accion === 'compartir'
      case 'primer_grupo': return accion === 'unirse_grupo'
      default: return false
    }
  }

  const nuevos = candidatos.filter(cumple)
  if (nuevos.length === 0) return []

  const xpNuevo = (profile?.xp ?? 0) + nuevos.reduce((s, l) => s + l.xp, 0)
  const { error: updError } = await supabase
    .from('profiles')
    .update({
      logros: [...desbloqueados, ...nuevos.map(l => l.id)],
      xp: xpNuevo,
      nivel: nivelParaXp(xpNuevo).id,
    })
    .eq('id', userId)

  if (updError) {
    console.error('[checkLogros] Error guardando logros:', { userId, code: updError.code, message: updError.message })
    return []
  }

  return nuevos
}
