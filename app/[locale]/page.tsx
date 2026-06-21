'use client'
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { ChefHat } from 'lucide-react'

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const router = useRouter()
  const { role, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      // Giriş yapılmamışsa landing page'e yönlendir
      router.replace(`/${locale}/landing`)
      return
    }
    const dest: Record<string, string> = {
      ADMIN:  `/${locale}/admin`,
      OWNER:  `/${locale}/owner/restaurants`,
      CHEF:   `/${locale}/chef`,
      WAITER: `/${locale}/waiter`,
    }
    router.replace(dest[role ?? ''] ?? `/${locale}/landing`)
  }, [role, isAuthenticated, locale, router])

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-[#57CF42]/10 rounded-2xl flex items-center justify-center">
          <ChefHat className="h-8 w-8 text-[#57CF42]" />
        </div>
        <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-[#57CF42] rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  )
}
