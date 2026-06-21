'use client'
import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api'
import { Spinner } from '@/components/ui/index'
import { formatPrice } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, Minus, ShoppingBag, Star,
  Trophy, ChefHat, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string; restaurantId: string }>
}) {
  const { restaurantId } = use(params)
  const id = Number(restaurantId)

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', id],
    queryFn: () => analyticsApi.get(id),
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error || !data) return (
    <div className="text-center py-16 text-gray-400">
      <BarChart2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Analitik verisi yüklenemedi</p>
    </div>
  )

  const revenueDelta = data.prevMonthRevenue > 0
    ? ((data.monthRevenue - data.prevMonthRevenue) / data.prevMonthRevenue) * 100
    : null
  const orderDelta = data.prevMonthOrderCount > 0
    ? ((data.monthOrderCount - data.prevMonthOrderCount) / data.prevMonthOrderCount) * 100
    : null

  return (
    <div className="space-y-6 pb-8">

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          title="Bu Ay Ciro"
          value={formatPrice(data.monthRevenue)}
          delta={revenueDelta}
          sub={`Geçen ay: ${formatPrice(data.prevMonthRevenue)}`}
          accent="emerald"
        />
        <KpiCard
          title="Bu Ay Sipariş"
          value={String(data.monthOrderCount)}
          delta={orderDelta}
          sub={`Geçen ay: ${data.prevMonthOrderCount}`}
          accent="blue"
        />
        <KpiCard
          title="Ort. Sipariş"
          value={formatPrice(data.avgOrderValue)}
          accent="violet"
        />
        <KpiCard
          title="Ortalama Puan"
          value={data.avgRating > 0 ? `${data.avgRating.toFixed(1)} / 5` : '—'}
          sub={data.reviewCount > 0 ? `${data.reviewCount} değerlendirme` : 'Henüz yorum yok'}
          accent="amber"
          icon={<Star className="h-4 w-4" />}
        />
      </div>

      {/* Top items */}
      {data.topItems.length > 0 && (
        <section>
          <SectionTitle icon={<Trophy className="h-4 w-4 text-amber-500" />} title="En Çok Satan Ürünler" />
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {data.topItems.map((item, i) => (
              <div key={item.menuItemId} className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-gray-50')}>
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                  i === 0 ? 'bg-amber-100 text-amber-600' :
                  i === 1 ? 'bg-gray-100 text-gray-500' :
                  i === 2 ? 'bg-orange-100 text-orange-500' : 'bg-gray-50 text-gray-400'
                )}>
                  {i + 1}
                </span>
                <span className="flex-1 font-semibold text-gray-900 text-sm truncate">{item.name}</span>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900">{item.orderCount} adet</p>
                  <p className="text-xs text-gray-400">{formatPrice(item.totalRevenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Waiter stats */}
      {data.waiterStats.length > 0 && (
        <section>
          <SectionTitle icon={<ChefHat className="h-4 w-4 text-blue-500" />} title="Garson Performansı (Bu Ay)" />
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {data.waiterStats
              .sort((a, b) => b.deliveredCount - a.deliveredCount)
              .map((w, i) => {
                const maxCount = data.waiterStats[0]?.deliveredCount || 1
                const pct = Math.round((w.deliveredCount / maxCount) * 100)
                return (
                  <div key={w.userId} className={cn('px-4 py-3', i > 0 && 'border-t border-gray-50')}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-gray-900 text-sm">{w.name}</span>
                      <span className="font-black text-gray-900 text-sm">{w.deliveredCount} sipariş</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      )}

      {data.topItems.length === 0 && data.waiterStats.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <BarChart2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Bu ay için henüz veri yok</p>
        </div>
      )}
    </div>
  )
}

function KpiCard({ title, value, delta, sub, accent, icon }: {
  title: string
  value: string
  delta?: number | null
  sub?: string
  accent: 'emerald' | 'blue' | 'violet' | 'amber'
  icon?: React.ReactNode
}) {
  const accentMap = {
    emerald: 'bg-emerald-50 border-emerald-100',
    blue: 'bg-blue-50 border-blue-100',
    violet: 'bg-violet-50 border-violet-100',
    amber: 'bg-amber-50 border-amber-100',
  }
  const textMap = {
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    violet: 'text-violet-700',
    amber: 'text-amber-700',
  }

  return (
    <div className={cn('rounded-2xl border p-4', accentMap[accent])}>
      <p className="text-xs font-semibold text-gray-500 mb-2">{title}</p>
      <div className="flex items-end gap-2">
        <p className={cn('text-xl font-black', textMap[accent])}>{value}</p>
        {icon}
      </div>
      {delta !== undefined && delta !== null && (
        <div className={cn('flex items-center gap-1 mt-1.5 text-xs font-bold',
          delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'
        )}>
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
        </div>
      )}
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="font-black text-gray-900 text-sm uppercase tracking-wide">{title}</h2>
    </div>
  )
}
