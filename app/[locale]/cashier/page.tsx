'use client'
import { use, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cashierApi, authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { getErrorMessage, formatPrice, timeAgo } from '@/lib/utils'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState, Spinner } from '@/components/ui/index'
import { CreditCard, UtensilsCrossed, ChevronLeft, CheckCircle2, Clock, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Order, TableItem, DailyReportResponse } from '@/types'
import { useWebSocket, type WsOrderEvent } from '@/hooks/useWebSocket'

export default function CashierPage({ params }: { params: Promise<{ locale: string }> }) {
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
    <AppShell title="Kasiyer" locale={locale}>
      <div className="flex items-center justify-center py-20"><Spinner /></div>
    </AppShell>
  )
  if (!restaurantId) return (
    <AppShell title="Kasiyer" locale={locale}>
      <EmptyState
        icon={<CreditCard className="h-12 w-12" />}
        title="Restorana atanmamışsınız"
        description="Restoran sahibi sizi bir restorana atamalı."
      />
    </AppShell>
  )
  return (
    <CashierDashboard
      restaurantId={restaurantId}
      locale={locale}
      restaurantName={me?.restaurants?.[0]?.name}
    />
  )
}

type Tab = 'tables' | 'report'

function CashierDashboard({ restaurantId, locale, restaurantName }: {
  restaurantId: number
  locale: string
  restaurantName?: string
}) {
  const qc = useQueryClient()
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('tables')
  const [checkoutDone, setCheckoutDone] = useState(false)

  const handleWsEvent = useCallback((event: WsOrderEvent) => {
    if (event.restaurantId !== restaurantId) return
    if (['NEW_ORDER', 'ORDER_UPDATED', 'ORDER_CANCELLED'].includes(event.type)) {
      qc.invalidateQueries({ queryKey: ['cashier-tables', restaurantId] })
      qc.invalidateQueries({ queryKey: ['cashier-orders', restaurantId] })
    }
  }, [qc, restaurantId])

  useWebSocket({ restaurantId, onEvent: handleWsEvent })

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['cashier-tables', restaurantId],
    queryFn: () => cashierApi.getTables(restaurantId),
    refetchInterval: 30_000,
  })

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['cashier-orders', restaurantId, selectedTable?.id],
    queryFn: () => cashierApi.getTableOrders(restaurantId, selectedTable!.id),
    enabled: !!selectedTable,
    refetchInterval: 10_000,
  })

  const checkoutMutation = useMutation({
    mutationFn: () => cashierApi.checkout(restaurantId, selectedTable!.id),
    onSuccess: () => {
      setCheckoutDone(true)
      toast.success('Ödeme alındı')
      qc.invalidateQueries({ queryKey: ['cashier-tables', restaurantId] })
      qc.invalidateQueries({ queryKey: ['cashier-orders', restaurantId, selectedTable?.id] })
      setTimeout(() => {
        setSelectedTable(null)
        setCheckoutDone(false)
      }, 1200)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (selectedTable) {
    return (
      <AppShell title={restaurantName ? `${restaurantName} — Kasiyer` : 'Kasiyer'} locale={locale}>
        <TableOrderDetail
          table={selectedTable}
          orders={orders}
          isLoading={ordersLoading}
          onBack={() => { setSelectedTable(null); setCheckoutDone(false) }}
          onCheckout={() => {
            if (confirm(`Masa ${selectedTable.tableNumber} ödemesini onayla?`)) {
              checkoutMutation.mutate()
            }
          }}
          checkoutLoading={checkoutMutation.isPending}
          checkoutDone={checkoutDone}
        />
      </AppShell>
    )
  }

  return (
    <AppShell title={restaurantName ? `${restaurantName} — Kasiyer` : 'Kasiyer'} locale={locale}>
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => setActiveTab('tables')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg transition-all',
            activeTab === 'tables'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <CreditCard className="h-4 w-4" />
          Masalar
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg transition-all',
            activeTab === 'report'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <FileText className="h-4 w-4" />
          Rapor
        </button>
      </div>

      {activeTab === 'tables' ? (
        isLoading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : (
          <div className="space-y-4 pb-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Masalar — Ödeme almak için seç
            </p>

            {tables.length === 0 ? (
              <EmptyState icon={<CreditCard className="h-12 w-12" />} title="Aktif masa yok" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {tables.map(table => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-2 active:scale-95 transition-all hover:border-gray-300"
                  >
                    <span className="text-3xl font-black text-gray-900">{table.tableNumber}</span>
                    <span className="text-xs text-gray-400 font-medium">Masa</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        <DailyReport restaurantId={restaurantId} />
      )}
    </AppShell>
  )
}

function DailyReport({ restaurantId }: { restaurantId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['cashier-daily-report', restaurantId],
    queryFn: () => cashierApi.getDailyReport(restaurantId),
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20"><Spinner /></div>
  )

  const report = data as DailyReportResponse | undefined

  return (
    <div className="space-y-4 pb-8">
      {/* Summary card */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Bugün</p>
        <p className="text-white text-3xl font-black mb-1">
          {formatPrice(report?.totalRevenue ?? 0)}
        </p>
        <p className="text-gray-400 text-sm font-medium">
          {report?.totalOrders ?? 0} sipariş
        </p>
      </div>

      {/* Table rows */}
      {!report || report.tables.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm font-medium">
          Bugün henüz sipariş yok
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Masalar</p>
          {report.tables.map(t => (
            <div
              key={t.tableNumber}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between"
            >
              <span className="text-sm font-bold text-gray-900">Masa {t.tableNumber}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-medium">{t.orderCount} sipariş</span>
                <span className="text-sm font-black text-gray-900">{formatPrice(t.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TableOrderDetail({ table, orders, isLoading, onBack, onCheckout, checkoutLoading, checkoutDone }: {
  table: TableItem
  orders: Order[]
  isLoading: boolean
  onBack: () => void
  onCheckout: () => void
  checkoutLoading: boolean
  checkoutDone: boolean
}) {
  const openOrders = orders.filter(o => ['PENDING', 'PREPARING', 'READY'].includes(o.status))
  const allOrders = orders
  const billableOrders = orders.filter(o => o.status !== 'CANCELLED')

  const grandTotal = billableOrders.reduce((sum, o) => sum + o.totalAmount, 0)

  return (
    <div className="space-y-4 pb-8">
      {/* Geri başlık */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Tüm masalar
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-900">Masa {table.tableNumber}</h2>
        {openOrders.length > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
            {openOrders.length} açık sipariş
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : allOrders.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-12 w-12" />}
          title="Bu masaya ait sipariş bulunamadı"
        />
      ) : (
        <>
          <div className="space-y-3">
            {allOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>

          {/* Toplam */}
          <div className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs font-medium">Toplam Tutar</p>
              <p className="text-white text-2xl font-black">{formatPrice(grandTotal)}</p>
            </div>
            <button
              onClick={onCheckout}
              disabled={checkoutLoading || checkoutDone || grandTotal === 0}
              className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              {checkoutDone ? 'Alındı ✓' : 'Ödeme Alındı'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Bekliyor',       color: 'bg-amber-100 text-amber-700' },
  PREPARING:  { label: 'Hazırlanıyor',   color: 'bg-sky-100 text-sky-700' },
  READY:      { label: 'Hazır',          color: 'bg-emerald-100 text-emerald-700' },
  DELIVERED:  { label: 'Teslim Edildi',  color: 'bg-gray-100 text-gray-500' },
  CANCELLED:  { label: 'İptal',          color: 'bg-red-100 text-red-500' },
}

function OrderCard({ order }: { order: Order }) {
  const st = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-500' }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <Clock className="h-3 w-3" />
          <span>{new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          <span>·</span>
          <span>{timeAgo(order.createdAt)}</span>
        </div>
        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', st.color)}>{st.label}</span>
      </div>

      <div className="px-5 py-4 space-y-2.5">
        {order.items.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <p className="text-sm text-gray-900 font-medium flex-1 min-w-0">
              <span className="font-black">{item.quantity}×</span> {item.menuItemName}
              {item.selectedOptions.length > 0 && (
                <span className="text-gray-400 font-normal"> · {item.selectedOptions.map(o => o.optionName).join(', ')}</span>
              )}
            </p>
            <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              {formatPrice(item.lineTotal)}
            </p>
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
