import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Garson Paneli',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
