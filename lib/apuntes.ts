// Descarga los apuntes de un examen desde Storage y los convierte en bloques
// de contenido (document/image) para mandarle a Claude. Compartido por
// chat-apuntes, guia-estudio, flashcards y resumen-notebook.
import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_ARCHIVOS = 5
const MAX_BYTES = 12 * 1024 * 1024 // tope total para no reventar el contexto

export async function fetchApuntesBlocks(
  supabase: SupabaseClient,
  examenId: string,
  userId: string
): Promise<Record<string, unknown>[]> {
  const { data: archivos } = await supabase
    .from('archivos')
    .select('nombre, tipo, storage_path, tamanio_bytes')
    .eq('examen_id', examenId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_ARCHIVOS)

  const blocks: Record<string, unknown>[] = []
  let acumulado = 0
  for (const a of archivos ?? []) {
    if (acumulado + (a.tamanio_bytes ?? 0) > MAX_BYTES) continue
    const { data: blob } = await supabase.storage.from('apuntes').download(a.storage_path)
    if (!blob) continue
    const b64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
    acumulado += a.tamanio_bytes ?? 0
    if (a.tipo === 'pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } })
    } else {
      const mt = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg'
      blocks.push({ type: 'image', source: { type: 'base64', media_type: mt, data: b64 } })
    }
  }
  return blocks
}
