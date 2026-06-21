import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mutfak Ekranı',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
