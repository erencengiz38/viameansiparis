import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Masalar',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
