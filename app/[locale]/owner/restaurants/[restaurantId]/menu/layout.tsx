import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Menü Yönetimi',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
