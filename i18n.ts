import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
  localePrefix: 'always'
})

export const locales = routing.locales
export type Locale = (typeof routing.locales)[number]
export const defaultLocale = routing.defaultLocale
