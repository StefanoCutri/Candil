import { redirect } from 'next/navigation'

// El chat de ajuste ahora es un panel lateral dentro de la vista del plan.
export default async function AjustarRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/plan/${id}`)
}
