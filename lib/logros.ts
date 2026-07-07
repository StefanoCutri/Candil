// Definición de logros y niveles de Candil. Compartido entre cliente y servidor.

export type Logro = {
  id: string
  nombre: string
  desc: string
  icon: string
  xp: number
  condicion: string
}

export const LOGROS: Logro[] = [
  // Primeros pasos
  { id: 'primer_plan', nombre: 'Primer plan', desc: 'Generaste tu primer plan de estudio', icon: '🕯️', xp: 10, condicion: 'planes_creados >= 1' },
  { id: 'primer_bloque', nombre: 'Primer bloque', desc: 'Completaste tu primer bloque de estudio', icon: '✓', xp: 5, condicion: 'bloques_completados >= 1' },

  // Constancia
  { id: 'racha_3', nombre: '3 días seguidos', desc: 'Estudiaste 3 días consecutivos', icon: '🔥', xp: 15, condicion: 'racha >= 3' },
  { id: 'racha_7', nombre: 'Semana completa', desc: '7 días seguidos estudiando', icon: '🔥', xp: 30, condicion: 'racha >= 7' },
  { id: 'racha_30', nombre: 'Mes de fuego', desc: '30 días seguidos. Imparable.', icon: '🔥', xp: 100, condicion: 'racha >= 30' },

  // Productividad
  { id: 'madrugador', nombre: 'Madrugador', desc: 'Completaste un bloque antes de las 8am', icon: '🌅', xp: 10, condicion: 'bloque_antes_8am' },
  { id: 'noctambulo', nombre: 'Noctámbulo', desc: 'Completaste un bloque después de las 12am', icon: '🌙', xp: 10, condicion: 'bloque_despues_0am' },
  { id: 'sin_pausas', nombre: 'Sin pausas', desc: 'Completaste 3 bloques seguidos sin saltar', icon: '⚡', xp: 15, condicion: '3_bloques_seguidos' },
  { id: 'dia_perfecto', nombre: 'Día perfecto', desc: 'Completaste todos los bloques de un día', icon: '✦', xp: 20, condicion: 'dia_completo' },

  // Progreso
  { id: 'mitad_plan', nombre: 'Mitad del camino', desc: 'Llegaste al 50% de un plan', icon: '📊', xp: 15, condicion: 'progreso >= 50' },
  { id: 'plan_completo', nombre: 'Plan completo', desc: 'Completaste el 100% de un plan', icon: '🏆', xp: 50, condicion: 'progreso >= 100' },

  // Cantidad
  { id: '5_planes', nombre: 'Veterano', desc: 'Generaste 5 planes de estudio', icon: '📚', xp: 25, condicion: 'planes_creados >= 5' },
  { id: '10_planes', nombre: 'Experto', desc: '10 planes generados. Ya sos profesional.', icon: '🎓', xp: 50, condicion: 'planes_creados >= 10' },

  // Sociales
  { id: 'primer_share', nombre: 'Compartido', desc: 'Compartiste tu plan con alguien', icon: '🔗', xp: 10, condicion: 'plan_compartido' },
  { id: 'primer_grupo', nombre: 'En equipo', desc: 'Te uniste a un grupo de estudio', icon: '👥', xp: 15, condicion: 'en_grupo' },
]

export type Nivel = { id: string; nombre: string; xpMin: number; xpMax: number }

export const NIVELES: Nivel[] = [
  { id: 'vela_nueva', nombre: 'Vela nueva', xpMin: 0, xpMax: 49 },
  { id: 'candil_encendido', nombre: 'Candil encendido', xpMin: 50, xpMax: 149 },
  { id: 'llama_viva', nombre: 'Llama viva', xpMin: 150, xpMax: 349 },
  { id: 'luz_propia', nombre: 'Luz propia', xpMin: 350, xpMax: Infinity },
]

export function nivelParaXp(xp: number): Nivel {
  return NIVELES.find(n => xp >= n.xpMin && xp <= n.xpMax) ?? NIVELES[NIVELES.length - 1]
}
