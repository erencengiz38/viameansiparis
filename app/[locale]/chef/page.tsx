'use client'
import { use, useCallback, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { chefApi, authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { getErrorMessage, timeAgo } from '@/lib/utils'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState, Spinner } from '@/components/ui/index'
import { UtensilsCrossed, CheckCircle2, BookOpen, AlertTriangle, Search, X, Clock, BellOff } from 'lucide-react'
import { useWebSocket, type WsOrderEvent } from '@/hooks/useWebSocket'
import { useNotification } from '@/hooks/useNotification'
import type { Order, MenuItem } from '@/types'
import { cn } from '@/lib/utils'

export default function ChefPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const { isAuthenticated } = useAuthStore()
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    staleTime: Infinity,
    enabled: isAuthenticated,
  })
  const restaurantId = me?.restaurants?.[0]?.id ?? null

  if (meLoading) return (
    <AppShell title="Mutfak" locale={locale}>
      <div className="flex items-center justify-center py-20"><Spinner /></div>
    </AppShell>
  )
  if (!restaurantId) return (
    <AppShell title="Mutfak" locale={locale}>
      <EmptyState icon={<UtensilsCrossed className="h-12 w-12" />} title="Restorana atanmamışsınız" description="Restoran sahibi sizi bir restorana atamalı." />
    </AppShell>
  )
  return <ChefDashboard restaurantId={restaurantId} locale={locale} restaurantName={me?.restaurants?.[0]?.name} />
}

// ─── Notification permission banner ─────────────────────────
function NotificationBanner() {
  const [status, setStatus] = useState<NotificationPermission | 'hidden'>(() => {
    if (typeof Notification === 'undefined') return 'hidden'
    return Notification.permission
  })

  if (status === 'granted' || status === 'hidden') return null

  const requestPermission = async () => {
    const result = await Notification.requestPermission()
    setStatus(result === 'granted' ? 'granted' : result)
  }

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-2xl px-4 py-3 border',
      status === 'denied' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    )}>
      <BellOff className={cn('h-5 w-5 flex-shrink-0', status === 'denied' ? 'text-red-400' : 'text-amber-500')} />
      <p className="text-sm font-medium text-gray-700 flex-1">
        {status === 'denied'
          ? 'Bildirimler engellenmiş — tarayıcı ayarlarından izin verin.'
          : 'Anlık bildirim almak için izin verin.'}
      </p>
      {status === 'default' && (
        <button
          onClick={requestPermission}
          className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 whitespace-nowrap"
        >
          Bildirime İzin Ver
        </button>
      )}
    </div>
  )
}

function ChefDashboard({ restaurantId, locale, restaurantName }: {
  restaurantId: number
  locale: string
  restaurantName?: string
}) {
  const qc = useQueryClient()
  const { notify } = useNotification()
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [search, setSearch] = useState('')

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['chef-orders', restaurantId],
    queryFn: () => chefApi.getActiveOrders(restaurantId),
    refetchInterval: 15_000,
  })

  const { data: menuItems = [], isLoading: menuLoading } = useQuery({
    queryKey: ['chef-menu', restaurantId],
    queryFn: () => chefApi.getMenuItems(restaurantId),
    staleTime: 30_000,
    enabled: activeTab === 'menu',
  })

  const onWsEvent = useCallback((event: WsOrderEvent) => {
    refetch()
    qc.invalidateQueries({ queryKey: ['chef-orders', restaurantId] })
    if (event.type === 'NEW_ORDER') {
      notify('🍽️ Yeni Sipariş', `Masa ${event.tableNumber} sipariş verdi`)
      toast.success(`Masa ${event.tableNumber} — yeni sipariş`, {
        duration: 6000,
        style: { background: '#18181b', color: '#fff', fontWeight: '600', fontSize: '14px', borderRadius: '12px' },
      })
    } else if (event.type === 'ORDER_UPDATED') {
      notify('➕ Sipariş Güncellendi', `Masa ${event.tableNumber} siparişine ekleme yapıldı`)
      toast(`Masa ${event.tableNumber} — siparişe ekleme yapıldı`, {
        duration: 5000,
        icon: '➕',
        style: { background: '#1e3a5f', color: '#fff', fontWeight: '600', fontSize: '14px', borderRadius: '12px' },
      })
    }
  }, [refetch, qc, restaurantId, notify])

  useWebSocket({ restaurantId, enabled: true, onEvent: onWsEvent })

  const readyMutation = useMutation({
    mutationFn: (orderId: number) => chefApi.markReady(restaurantId, orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chef-orders', restaurantId] })
      toast.success('Hazır işaretlendi', { duration: 3000 })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: (itemId: number) => chefApi.toggleAvailability(restaurantId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chef-menu', restaurantId] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const pending   = orders.filter(o => o.status === 'PENDING')
  const preparing = orders.filter(o => o.status === 'PREPARING')
  const outOfStock = menuItems.filter(i => !i.available).length

  const filtered = search.trim()
    ? menuItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : menuItems

  const grouped = filtered.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const cat = item.categoryName ?? 'Kategorisiz'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  if (isLoading) return (
    <AppShell title="Mutfak" locale={locale}>
      <div className="flex items-center justify-center py-20"><Spinner /></div>
    </AppShell>
  )

  return (
    <AppShell title={restaurantName ? `${restaurantName} — Mutfak` : 'Mutfak'} locale={locale}>
      <div className="space-y-4 pb-8">

        <NotificationBanner />

        {/* Tab seçici */}
        <div className="flex rounded-2xl bg-gray-100 p-1 gap-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              activeTab === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <UtensilsCrossed className="h-4 w-4" />
            Siparişler
            {(pending.length + preparing.length) > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                {pending.length + preparing.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              activeTab === 'menu' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <BookOpen className="h-4 w-4" />
            Menü
            {outOfStock > 0 && (
              <span className="bg-rose-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                {outOfStock}
              </span>
            )}
          </button>
        </div>

        {/* ── SİPARİŞLER ── */}
        {activeTab === 'orders' && (
          <div className="space-y-5">
            {/* Sayaçlar */}
            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                'rounded-2xl p-4 text-center border border-gray-100 transition-all',
                pending.length > 0 ? 'bg-amber-50' : 'bg-white'
              )}>
                <p className={cn('text-3xl font-black', pending.length > 0 ? 'text-amber-500' : 'text-gray-200')}>
                  {pending.length}
                </p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Bekliyor</p>
              </div>
              <div className={cn(
                'rounded-2xl p-4 text-center border border-gray-100 transition-all',
                preparing.length > 0 ? 'bg-sky-50' : 'bg-white'
              )}>
                <p className={cn('text-3xl font-black', preparing.length > 0 ? 'text-sky-400' : 'text-gray-200')}>
                  {preparing.length}
                </p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Hazırlanıyor</p>
              </div>
            </div>

            {orders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-gray-300" />
                </div>
                <p className="font-semibold text-gray-500">Bekleyen sipariş yok</p>
                <p className="text-sm text-gray-400 mt-1">Yeni siparişler anında burada görünür</p>
              </div>
            )}

            {pending.length > 0 && (
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Yeni Siparişler</p>
                <div className="space-y-3">
                  {pending.map(order => (
                    <ChefOrderCard key={order.id} order={order} isNew
                      onReady={() => readyMutation.mutate(order.id)}
                      loading={readyMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {preparing.length > 0 && (
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Hazırlanıyor</p>
                <div className="space-y-3">
                  {preparing.map(order => (
                    <ChefOrderCard key={order.id} order={order}
                      onReady={() => readyMutation.mutate(order.id)}
                      loading={readyMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── MENÜ ── */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Ürün ara..."
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {menuLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner /></div>
            ) : menuItems.length === 0 ? (
              <EmptyState icon={<BookOpen className="h-12 w-12" />} title="Henüz menü kalemi yok" />
            ) : (
              <>
                {outOfStock > 0 && !search && (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                    <p className="text-rose-600 text-sm font-medium">
                      {outOfStock} ürün tükendi — müşteriler göremez
                    </p>
                  </div>
                )}

                {filtered.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    "{search}" için sonuç bulunamadı
                  </div>
                )}

                {Object.entries(grouped).map(([category, items]) => (
                  <section key={category}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{category}</p>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id} className={cn(
                          'flex items-center gap-3 bg-white rounded-xl border px-4 py-3 transition-all',
                          item.available ? 'border-gray-100' : 'border-rose-100 bg-rose-50/30'
                        )}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className={cn('w-11 h-11 rounded-lg object-cover flex-shrink-0', !item.available && 'opacity-40 grayscale')} />
                          ) : (
                            <div className={cn('w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0', !item.available && 'opacity-40')}>
                              <UtensilsCrossed className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn('font-semibold text-sm', item.available ? 'text-gray-900' : 'text-gray-400 line-through')}>{item.name}</p>
                            {!item.available && <p className="text-rose-500 text-xs font-medium mt-0.5">Tükendi</p>}
                          </div>
                          <button
                            onClick={() => toggleMutation.mutate(item.id)}
                            disabled={toggleMutation.isPending}
                            className={cn(
                              'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95',
                              item.available ? 'bg-gray-100 text-gray-600 hover:bg-rose-100 hover:text-rose-600' : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                            )}
                          >
                            {item.available ? 'Tükendi İşaretle' : 'Tekrar Var'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

const SWIPE_THRESHOLD = 110

function ChefOrderCard({ order, isNew, onReady, loading }: {
  order: Order
  isNew?: boolean
  onReady: () => void
  loading: boolean
}) {
  const [offsetX, setOffsetX] = useState(0)
  const [fired, setFired] = useState(false)
  const startX = useRef(0)
  const dragging = useRef(false)

  const progress = Math.min(offsetX / SWIPE_THRESHOLD, 1)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    dragging.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return
    const dx = e.touches[0].clientX - startX.current
    if (dx > 0) setOffsetX(Math.min(dx, 180))
  }

  const handleTouchEnd = () => {
    dragging.current = false
    if (offsetX >= SWIPE_THRESHOLD && !fired) {
      setFired(true)
      setOffsetX(400)
      setTimeout(() => onReady(), 220)
    } else {
      setOffsetX(0)
    }
  }

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Arka plan — swipe reveal */}
      <div
        className="absolute inset-0 flex items-center px-6 gap-2 bg-emerald-500 rounded-2xl"
        style={{ opacity: progress }}
      >
        <CheckCircle2 className="h-6 w-6 text-white" strokeWidth={2.5} />
        <span className="text-white font-bold text-sm">Hazır!</span>
      </div>

      {/* Kart */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragging.current ? 'none' : 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'rounded-2xl bg-white overflow-hidden border',
          isNew ? 'border-amber-200 shadow-md shadow-amber-50' : 'border-gray-100 shadow-sm'
        )}
      >
        {/* Başlık */}
        <div className={cn(
          'flex items-center justify-between px-5 py-3',
          isNew ? 'bg-amber-50' : 'bg-gray-50/80'
        )}>
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-gray-900 text-lg">Masa {order.tableNumber}</span>
            {isNew && (
              <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-md tracking-wide">
                YENİ
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <Clock className="h-3 w-3" />
            <span>{timeAgo(order.createdAt)}</span>
          </div>
        </div>

        {/* Ürünler */}
        <div className="px-5 py-4 space-y-3">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.menuItemName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="h-5 w-5 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-semibold text-sm leading-snug">
                  <span className="font-black">{item.quantity} Adet</span>{' '}
                  {item.menuItemName}
                </p>
                {item.selectedOptions.length > 0 && (
                  <p className="text-gray-400 text-xs mt-0.5">
                    {item.selectedOptions.map(o => o.optionName).join(' · ')}
                  </p>
                )}
                {item.note && (
                  <p className="text-amber-600 text-xs font-medium mt-0.5">Not: {item.note}</p>
                )}
              </div>
            </div>
          ))}

          {order.note && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium">
              Sipariş notu: {order.note}
            </div>
          )}
        </div>

        {/* Hazır butonu */}
        <div className="px-5 pb-5">
          <button
            onClick={onReady}
            disabled={loading || fired}
            className="w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
            Hazır, Servise Çıkabilir
          </button>
        </div>
      </div>
    </div>
  )
}
