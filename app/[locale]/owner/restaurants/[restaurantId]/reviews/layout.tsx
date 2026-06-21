import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Yorumlar',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
