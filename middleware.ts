import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n'
import { NextRequest, NextResponse } from 'next/server'

const intlMiddleware = createMiddleware(routing)

const protectedPaths = ['/admin', '/owner', '/chef', '/waiter']

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Locale prefix çıkar
  const pathnameWithoutLocale = routing.locales.reduce((acc, locale) => {
    return acc.replace(new RegExp(`^/${locale}`), '')
  }, pathname)

  // Korumalı path kontrolü
  const isProtected = protectedPaths.some(p => pathnameWithoutLocale.startsWith(p))

  if (isProtected) {
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      const locale = routing.locales.find(l => pathname.startsWith(`/${l}`)) || routing.defaultLocale
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
