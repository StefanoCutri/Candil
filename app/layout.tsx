import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import './globals.css'
import TopProgress from '@/components/TopProgress'
import LogroToast from '@/components/LogroToast'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')
  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords').split(','),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website'
    }
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <html lang={locale} className={GeistSans.variable}>
      <head>
        <script
          // Aplica el tema guardado antes del primer paint para evitar flash
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('candil-theme');if(t==='system'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}if(t==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TopProgress />{children}<LogroToast />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
