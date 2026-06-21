import { getRequestConfig } from 'next-intl/server'
import { routing } from './i18n'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // Geçersiz locale → default'a düş
  if (!locale || !routing.locales.includes(locale as 'tr' | 'en')) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})
