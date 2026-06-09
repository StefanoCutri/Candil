import type { Metadata } from 'next'
import { Libre_Baskerville } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

const baskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-baskerville',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Candil — Tu plan de estudio con IA',
  description: 'Cargá tu examen, decinos tu tiempo. Candil arma el plan. Vos estudiás.',
  keywords: ['estudio', 'examen', 'planificación', 'IA', 'estudiantes'],
  openGraph: {
    title: 'Candil — Tu plan de estudio con IA',
    description: 'Cargá tu examen, decinos tu tiempo. Candil arma el plan. Vos estudiás.',
    type: 'website'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${baskerville.variable} ${GeistSans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
