import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

export const LOCALES = ['es', 'en', 'pt'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'es'

export default getRequestConfig(async () => {
  let locale: string | undefined = (await cookies()).get('candil-locale')?.value

  if (!locale || !LOCALES.includes(locale as Locale)) {
    // Detección por Accept-Language; default: español
    const al = ((await headers()).get('accept-language') ?? '').toLowerCase()
    locale = al.startsWith('en') ? 'en' : al.startsWith('pt') ? 'pt' : DEFAULT_LOCALE
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  }
})
