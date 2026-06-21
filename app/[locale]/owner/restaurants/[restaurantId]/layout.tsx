'use client'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { ReactNode, use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { cn } from '@/lib/utils'
import { UtensilsCrossed, Users, QrCode, ShoppingBag, BarChart2, Settings, Star } from 'lucide-react'
import Link from 'next/link'
import { ownerApi } from '@/lib/api'

export default function RestaurantLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string; restaurantId: string }>
}) {
  const { locale, restaurantId } = use(params)
  const t = useTranslations('nav')
  const pathname = usePathname()
  const rId = Number(restaurantId)

  const { data: restaurant } = useQuery({
    queryKey: ['owner-restaurant', rId],
    queryFn: () => ownerApi.getRestaurant(rId),
    staleTime: 60_000,
  })

  const isSimple = restaurant?.planType === 'SIMPLE'

  const allTabs = [
    { href: `/${locale}/owner/restaurants/${restaurantId}/menu`, label: t('menu'), icon: <UtensilsCrossed className="h-4 w-4" />, simple: true },
    { href: `/${locale}/owner/restaurants/${restaurantId}/tables`, label: t('tables'), icon: <QrCode className="h-4 w-4" />, simple: true },
    { href: `/${locale}/owner/restaurants/${restaurantId}/staff`, label: t('staff'), icon: <Users className="h-4 w-4" />, simple: false },
    { href: `/${locale}/owner/restaurants/${restaurantId}/orders`, label: t('orders'), icon: <ShoppingBag className="h-4 w-4" />, simple: false },
    { href: `/${locale}/owner/restaurants/${restaurantId}/analytics`, label: t('analytics'), icon: <BarChart2 className="h-4 w-4" />, simple: false },
    { href: `/${locale}/owner/restaurants/${restaurantId}/reviews`, label: t('reviews'), icon: <Star className="h-4 w-4" />, simple: false },
    { href: `/${locale}/owner/restaurants/${restaurantId}/settings`, label: t('settings'), icon: <Settings className="h-4 w-4" />, simple: true },
  ]

  const tabs = isSimple ? allTabs.filter(tab => tab.simple) : allTabs

  return (
    <AppShell locale={locale} showBack backHref={`/${locale}/owner/restaurants`}>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-5 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex-1 justify-center transition-all',
                isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          )
        })}
      </div>
      {children}
    </AppShell>
  )
}
