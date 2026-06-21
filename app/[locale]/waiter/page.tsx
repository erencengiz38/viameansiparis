'use client'
import { use, useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { waiterApi, authApi } from '@/lib/api'
import { useNotification } from '@/hooks/useNotification'
import { useAuthStore } from '@/store/auth'
import { getErrorMessage, formatPrice, timeAgo } from '@/lib/utils'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState, Spinner } from '@/components/ui/index'
import {
  CheckCheck, Users, UtensilsCrossed, Bell, Receipt,
  HandMetal, Clock, CheckCircle2, Search, BellOff, LayoutGrid, Lock,
} from 'lucide-react'
import { useWebSocket, type WsOrderEvent } from '@/hooks/useWebSocket'
import type { Order, WaiterRequest, TableOverviewResponse } from '@/types'
import { cn } from '@/lib/utils'

export default function WaiterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const { isAuthenticated } = useAuthStore()
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    staleTime: Infinity,
    enabled: isAuthenticated,
  })
  const restaurantId = me?.restaurants?.[0]?.id ?? null

  if (isLoading) return <AppShell title="Servis" locale={locale}><div className="flex items-center justify-center py-20"><Spinner /></div></AppShell>
  if (!restaurantId) return (
    <AppShell title="Servis" locale={locale}>
      <EmptyState icon={<Users className="h-12 w-12" />} title="Restorana atanmamışsınız" description="Restoran sahibi sizi bir restorana atamalı." />
    </AppShell>
  )
  return <WaiterDashboard restaurantId={restaurantId} locale={locale} restaurantName={me?.restaurants?.[0]?.name} />
}

// ─── Countdown hook — epoch millis input, no TZ ambiguity ────
function useCountdown(expiresAtMs: number) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000)))
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [expiresAtMs])
  return remaining
}

// ─── Request card ────────────────────────────────────────────
function RequestCard({ req, onClaim, claiming }: {
  req: WaiterRequest
  onClaim: () => void
  claiming: boolean
}) {
  const seconds = useCountdown(req.expiresAt)
  const isUrgent = seconds <= 15
  const isBill = req.type === 'REQUEST_BILL'

  if (seconds === 0) return null

  return (
    <div className={cn(
      'rounded-2xl border-2 bg-white overflow-hidden transition-all',
      isBill ? 'border-violet-300 shadow-lg shadow-violet-100' : 'border-orange-300 shadow-lg shadow-orange-100',
      isUrgent && 'animate-pulse'
    )}>
      <div className={cn('px-4 py-3 flex items-center justify-between', isBill ? 'bg-violet-50' : 'bg-orange-50')}>
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', isBill ? 'bg-violet-100' : 'bg-orange-100')}>
            {isBill ? <Receipt className="h-5 w-5 text-violet-600" /> : <Bell className="h-5 w-5 text-orange-500" />}
          </div>
          <div>
            <p className="font-black text-gray-900 text-base">Masa {req.tableNumber}</p>
            <p className={cn('text-xs font-semibold', isBill ? 'text-violet-600' : 'text-orange-600')}>
              {isBill ? 'Hesap istiyor' : 'Garson çağırıyor'}
            </p>
          </div>
        </div>
        <div className={cn('flex items-center gap-1.5 rounded-xl px-3 py-1.5', isUrgent ? 'bg-red-100' : 'bg-white/80')}>
          <Clock className={cn('h-3.5 w-3.5', isUrgent ? 'text-red-500' : 'text-gray-400')} />
          <span className={cn('font-black text-sm tabular-nums', isUrgent ? 'text-red-600' : 'text-gray-600')}>
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="px-4 py-3">
        <button
          onClick={onClaim}
          disabled={claiming}
          className={cn(
            'w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60',
            isBill
              ? 'bg-violet-600 hover:bg-violet-700 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          )}
        >
          <HandMetal className="h-4 w-4" strokeWidth={2.5} />
          İşim Bende
        </button>
      </div>
    </div>
  )
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
      status === 'denied'
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'
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

type Tab = 'live' | 'table' | 'tables'

// ─── Main dashboard ──────────────────────────────────────────
function WaiterDashboard({ restaurantId, locale, restaurantName }: {
  restaurantId: number
  locale: string
  restaurantName?: string
}) {
  const qc = useQueryClient()
  const { notify } = useNotification()
  const [tab, setTab] = useState<Tab>('live')

  const { data: preparingOrders = [], isLoading: l1, refetch: r1 } = useQuery({
    queryKey: ['waiter-preparing', restaurantId],
    queryFn: () => waiterApi.getPreparingOrders(restaurantId),
    refetchInterval: 20_000,
  })

  const { data: readyOrders = [], isLoading: l2, refetch: r2 } = useQuery({
    queryKey: ['waiter-ready', restaurantId],
    queryFn: () => waiterApi.getReadyOrders(restaurantId),
    refetchInterval: 20_000,
  })

  const { data: requests = [], isLoading: l3, refetch: r3 } = useQuery({
    queryKey: ['waiter-requests', restaurantId],
    queryFn: () => waiterApi.getPendingRequests(restaurantId),
    refetchInterval: 10_000,
  })

  const onWsEvent = useCallback((event: WsOrderEvent) => {
    const type = event.type as string
    if (type === 'REQUEST_NEW') {
      r3()
      qc.invalidateQueries({ queryKey: ['waiter-requests', restaurantId] })
      const isBill = event.requestType === 'REQUEST_BILL'
      notify(
        isBill ? '💳 Hesap İsteniyor' : '🔔 Garson Çağrısı',
        `Masa ${event.tableNumber} ${isBill ? 'hesap istiyor' : 'garson çağırıyor'}`
      )
    } else if (type === 'REQUEST_CLAIMED') {
      r3()
      qc.invalidateQueries({ queryKey: ['waiter-requests', restaurantId] })
    } else if (type === 'ORDER_READY' || type === 'READY') {
      r1(); r2()
      qc.invalidateQueries({ queryKey: ['waiter-preparing', restaurantId] })
      qc.invalidateQueries({ queryKey: ['waiter-ready', restaurantId] })
      notify('✅ Sipariş Hazır', `Masa ${event.tableNumber} siparişi servise hazır`)
    } else {
      r1(); r2()
      qc.invalidateQueries({ queryKey: ['waiter-preparing', restaurantId] })
      qc.invalidateQueries({ queryKey: ['waiter-ready', restaurantId] })
    }
  }, [r1, r2, r3, qc, restaurantId, notify])

  useWebSocket({ restaurantId, enabled: true, onEvent: onWsEvent })

  const claimMutation = useMutation({
    mutationFn: (requestId: number) => waiterApi.claimRequest(restaurantId, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waiter-requests', restaurantId] })
      toast.success('Göreve koştunuz!')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deliverMutation = useMutation({
    mutationFn: (orderId: number) => waiterApi.markDelivered(restaurantId, orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waiter-ready', restaurantId] })
      toast.success('Teslim edildi')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const isLoading = l1 || l2 || l3
  const activeRequests = requests.filter(r => r.status === 'PENDING')

  if (isLoading) return (
    <AppShell title="Servis" locale={locale}>
      <div className="flex items-center justify-center py-20"><Spinner /></div>
    </AppShell>
  )

  return (
    <AppShell title={restaurantName ? `${restaurantName} — Servis` : 'Servis'} locale={locale}>
      <div className="space-y-4 pb-8">

        <NotificationBanner />

        {/* Tab bar */}
        <div className="flex rounded-2xl bg-gray-100 p-1 gap-1">
          <button
            onClick={() => setTab('live')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tab === 'live' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Bell className="h-4 w-4" />
            Canlı
            {(activeRequests.length + readyOrders.length) > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                {activeRequests.length + readyOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('table')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tab === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Search className="h-4 w-4" />
            Masa Sorgula
          </button>
          <button
            onClick={() => setTab('tables')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tab === 'tables' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Masalar
          </button>
        </div>

        {/* ── CANLI EKRAN ── */}
        {tab === 'live' && (
          <div className="space-y-5">
            {/* Özet */}
            <div className="grid grid-cols-3 gap-2">
              <StatChip value={activeRequests.length} label="İstek" active={activeRequests.length > 0} activeColor="text-orange-500" activeBg="bg-orange-50 border-orange-200" />
              <StatChip value={readyOrders.length} label="Servis" active={readyOrders.length > 0} activeColor="text-emerald-600" activeBg="bg-emerald-50 border-emerald-200" />
              <StatChip value={preparingOrders.length} label="Mutfak" active={preparingOrders.length > 0} activeColor="text-blue-500" activeBg="bg-blue-50 border-blue-200" />
            </div>

            {activeRequests.length > 0 && (
              <section>
                <SectionHeader color="bg-orange-400" title="Masa İstekleri" />
                <div className="space-y-3">
                  {activeRequests.map(req => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      onClaim={() => claimMutation.mutate(req.id)}
                      claiming={claimMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {readyOrders.length > 0 && (
              <section>
                <SectionHeader color="bg-emerald-500" title="Servise Çık" />
                <div className="space-y-3">
                  {readyOrders.map(order => (
                    <WaiterOrderCard
                      key={order.id}
                      order={order}
                      status="ready"
                      onDeliver={() => deliverMutation.mutate(order.id)}
                      loading={deliverMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {preparingOrders.length > 0 && (
              <section>
                <SectionHeader color="bg-blue-400" title="Mutfakta Hazırlanıyor" />
                <div className="space-y-3">
                  {preparingOrders.map(order => (
                    <WaiterOrderCard key={order.id} order={order} status="preparing" />
                  ))}
                </div>
              </section>
            )}

            {activeRequests.length === 0 && readyOrders.length === 0 && preparingOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="font-bold text-gray-700">Her şey yolunda</p>
                <p className="text-sm text-gray-400 mt-1">Yeni sipariş veya istek geldiğinde burada görünür</p>
              </div>
            )}
          </div>
        )}

        {/* ── MASA SORGULA ── */}
        {tab === 'table' && (
          <TableLookup restaurantId={restaurantId} />
        )}

        {/* ── MASALAR ── */}
        {tab === 'tables' && (
          <TablesOverview restaurantId={restaurantId} />
        )}
      </div>
    </AppShell>
  )
}

// ─── Masa sorgula ──────────────────────────────────────────────
function TableLookup({ restaurantId }: { restaurantId: number }) {
  const [input, setInput] = useState('')
  const [searched, setSearched] = useState<number | null>(null)

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['waiter-table-daily', restaurantId, searched],
    queryFn: () => waiterApi.getTableDailyOrders(restaurantId, searched!),
    enabled: searched !== null,
    staleTime: 0,
  })

  const handleSearch = () => {
    const n = parseInt(input, 10)
    if (!n || n < 1) { toast.error('Geçerli bir masa numarası girin'); return }
    setSearched(n)
  }

  const totalAmount = (orders ?? []).reduce((s, o) => s + o.totalAmount, 0)

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 font-medium">
        Bugünkü siparişleri sorgula (gece 01:00 – gece 01:00 arası)
      </p>

      {/* Arama kutusu */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Masa numarası..."
            className="w-full h-12 rounded-2xl border border-gray-200 bg-white pl-4 pr-4 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <button
          onClick={handleSearch}
          className="h-12 px-5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded-2xl flex items-center gap-2 transition-all active:scale-95"
        >
          <Search className="h-4 w-4" />
          Ara
        </button>
      </div>

      {/* Sonuçlar */}
      {searched !== null && (
        <>
          {isLoading && <div className="flex items-center justify-center py-10"><Spinner /></div>}
          {isError && <p className="text-center text-red-500 text-sm py-6">Bir hata oluştu.</p>}
          {!isLoading && !isError && orders && (
            orders.length === 0 ? (
              <EmptyState
                icon={<UtensilsCrossed className="h-10 w-10" />}
                title={`Masa ${searched} için bugün sipariş yok`}
              />
            ) : (
              <div className="space-y-3">
                {/* Özet şerit */}
                <div className="bg-gray-900 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs font-medium">Masa {searched} — Bugün toplam</p>
                    <p className="text-white text-2xl font-black">{formatPrice(totalAmount)}</p>
                  </div>
                  <p className="text-gray-400 text-sm">{orders.length} sipariş</p>
                </div>

                {orders.map(order => (
                  <TableLookupOrderCard key={order.id} order={order} />
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}

// ─── Masalar genel görünüm ────────────────────────────────────
function TablesOverview({ restaurantId }: { restaurantId: number }) {
  const { data: tables = [], isLoading, isError } = useQuery({
    queryKey: ['waiter-tables-overview', restaurantId],
    queryFn: () => waiterApi.getTablesOverview(restaurantId),
    refetchInterval: 15_000,
  })

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner /></div>
  if (isError) return <p className="text-center text-red-500 text-sm py-6">Bir hata oluştu.</p>
  if (tables.length === 0) return (
    <EmptyState icon={<LayoutGrid className="h-10 w-10" />} title="Masa bulunamadı" />
  )

  return (
    <div className="grid grid-cols-2 gap-3">
      {tables.map((t: TableOverviewResponse) => {
        const hasOrders = t.activeOrderCount > 0
        return (
          <div
            key={t.tableId}
            className={cn(
              'relative rounded-2xl border-2 bg-white p-4 shadow-sm transition-all',
              hasOrders ? 'border-emerald-400 shadow-emerald-50' : 'border-gray-200'
            )}
          >
            {/* Lock badge */}
            {!t.sessionOpen && (
              <span className="absolute top-2 right-2 flex items-center gap-1 bg-red-100 text-red-500 text-xs font-bold px-1.5 py-0.5 rounded-full">
                <Lock className="h-3 w-3" />
              </span>
            )}

            {/* Table number */}
            <p className="text-3xl font-black text-gray-900 leading-none">{t.tableNumber}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Masa</p>

            {/* Order count badge */}
            <div className="mt-3 flex items-center gap-2">
              <span className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                hasOrders ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
              )}>
                {t.activeOrderCount} sipariş
              </span>
            </div>

            {/* Total */}
            <p className="mt-2 text-sm font-black text-gray-800">{formatPrice(t.activeTotal)}</p>

            {/* Last order time */}
            {t.lastOrderAt && (
              <p className="mt-1 text-xs text-gray-400">{timeAgo(t.lastOrderAt)}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Table lookup order card ─────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Bekliyor',       color: 'bg-amber-100 text-amber-700' },
  PREPARING:  { label: 'Hazırlanıyor',   color: 'bg-sky-100 text-sky-700' },
  READY:      { label: 'Hazır',          color: 'bg-emerald-100 text-emerald-700' },
  DELIVERED:  { label: 'Teslim Edildi',  color: 'bg-gray-100 text-gray-500' },
  CANCELLED:  { label: 'İptal',          color: 'bg-red-100 text-red-500' },
}

function TableLookupOrderCard({ order }: { order: Order }) {
  const st = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-500' }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <Clock className="h-3 w-3" />
          <span>{timeAgo(order.createdAt)}</span>
        </div>
        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', st.color)}>{st.label}</span>
      </div>
      <div className="px-5 py-3 space-y-2">
        {order.items.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <p className="text-sm text-gray-900 font-medium">
              <span className="font-black">{item.quantity}×</span> {item.menuItemName}
              {item.selectedOptions.length > 0 && (
                <span className="text-gray-400 font-normal"> · {item.selectedOptions.map(o => o.optionName).join(', ')}</span>
              )}
            </p>
            <p className="text-sm font-semibold text-gray-600 whitespace-nowrap">{formatPrice(item.lineTotal)}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-gray-50 flex justify-between items-center">
        <p className="text-xs text-gray-400">Sipariş tutarı</p>
        <p className="text-sm font-bold text-gray-900">{formatPrice(order.totalAmount)}</p>
      </div>
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────
function StatChip({ value, label, active, activeColor, activeBg }: {
  value: number; label: string; active: boolean; activeColor: string; activeBg: string
}) {
  return (
    <div className={cn('rounded-xl p-3 text-center border-2 transition-all', active ? activeBg : 'bg-gray-50 border-gray-100')}>
      <p className={cn('text-2xl font-black', active ? activeColor : 'text-gray-300')}>{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function SectionHeader({ color, title }: { color: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={cn('w-2 h-2 rounded-full', color)} />
      <h2 className="font-black text-gray-900 uppercase tracking-wide text-xs">{title}</h2>
    </div>
  )
}

function WaiterOrderCard({ order, status, onDeliver, loading }: {
  order: Order
  status: 'preparing' | 'ready'
  onDeliver?: () => void
  loading?: boolean
}) {
  const isReady = status === 'ready'
  return (
    <div className={cn(
      'rounded-xl border bg-white overflow-hidden',
      isReady ? 'border-emerald-200 shadow-md shadow-emerald-50' : 'border-gray-100 shadow-sm'
    )}>
      <div className={cn('flex items-center justify-between px-4 py-2.5', isReady ? 'bg-emerald-50' : 'bg-gray-50')}>
        <div className="flex items-center gap-2">
          <span className="font-black text-gray-900">Masa {order.tableNumber}</span>
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', isReady ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-700')}>
            {isReady ? 'HAZIR' : 'HAZIRLANIYOR'}
          </span>
        </div>
        <span className="text-xs text-gray-400">{timeAgo(order.createdAt)}</span>
      </div>

      <div className="px-4 py-3 space-y-2">
        {order.items.map(item => (
          <div key={item.id} className="flex items-center gap-2.5">
            {item.imageUrl
              ? <img src={item.imageUrl} alt={item.menuItemName} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
              : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><UtensilsCrossed className="h-4 w-4 text-gray-300" /></div>
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="bg-gray-900 text-white text-xs font-black px-1.5 py-0.5 rounded">×{item.quantity}</span>
                <span className="font-semibold text-gray-900 text-sm truncate">{item.menuItemName}</span>
              </div>
              {item.selectedOptions.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{item.selectedOptions.map(o => o.optionName).join(' · ')}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-3 flex items-center gap-3">
        <span className="font-black text-gray-900">{formatPrice(order.totalAmount)}</span>
        {isReady && onDeliver && (
          <button
            onClick={onDeliver}
            disabled={loading}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold text-sm rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4" strokeWidth={2.5} />
            Teslim Edildi
          </button>
        )}
      </div>
    </div>
  )
}
