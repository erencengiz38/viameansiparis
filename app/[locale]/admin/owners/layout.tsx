import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sahip Yönetimi',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
