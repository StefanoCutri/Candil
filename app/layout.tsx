import type { Metadata } from 'next'
import { Bricolage_Grotesque, Libre_Baskerville } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import TopProgress from '@/components/TopProgress'

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-baskerville',
  display: 'swap'
})

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
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
    <html lang="es" className={`${display.variable} ${GeistSans.variable} ${libreBaskerville.variable}`}>
      <body className="font-sans antialiased"><TopProgress />{children}</body>
    </html>
  )
}
