import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = { title: 'Kasiyer Paneli' }

export default function CashierLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
