// Helper del cliente: verifica logros contra la API y emite un evento por cada
// logro nuevo. <LogroToast /> (montado en el layout) escucha y muestra el toast.
'use client'

import type { Logro } from './logros'
import type { AccionLogro, ContextoLogro } from './checkLogros'

export const LOGRO_EVENT = 'candil-logro'

export async function verificarLogros(accion: AccionLogro, ctx: ContextoLogro = {}) {
  try {
    const res = await fetch('/api/check-logros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, ctx }),
    })
    if (!res.ok) return
    const data = await res.json().catch(() => null)
    for (const logro of (data?.nuevos ?? []) as Logro[]) {
      window.dispatchEvent(new CustomEvent(LOGRO_EVENT, { detail: logro }))
    }
  } catch {
    // best-effort: un fallo acá nunca debe romper la acción principal
  }
}
