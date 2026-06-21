import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Toaster } from 'react-hot-toast'
import { ReactNode } from 'react'
import { QueryProvider } from '@/components/shared/QueryProvider'
import { AuthInit } from '@/components/shared/AuthInit'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryProvider>
        <AuthInit />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', fontSize: '14px', maxWidth: '380px' },
          }}
        />
      </QueryProvider>
    </NextIntlClientProvider>
  )
}
