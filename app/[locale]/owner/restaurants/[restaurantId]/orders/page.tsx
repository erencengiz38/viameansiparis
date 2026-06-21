'use client'
import { use } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ownerApi } from '@/lib/api'
import { getErrorMessage, formatPrice, timeAgo } from '@/lib/utils'
import { Card, CardBody, EmptyState, Spinner } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { OrderStatusBadge } from '@/components/ui/OrderStatusBadge'
import { ShoppingBag, X } from 'lucide-react'
import type { Order } from '@/types'

export default function OrdersPage({ params }: { params: Promise<{ restaurantId: string; locale: string }> }) {
  const { restaurantId, locale } = use(params)
  const t = useTranslations('order')
  const qc = useQueryClient()
  const rId = Number(restaurantId)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['owner-orders', rId],
    queryFn: () => ownerApi.getOrders(rId),
    refetchInterval: 15_000,
  })

  const cancelMutation = useMutation({
    mutationFn: (orderId: number) => ownerApi.cancelOrder(rId, orderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-orders', rId] }); toast.success('Sipariş iptal edildi') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isLoading) return <Spinner />

  const active = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status))
  const past = orders.filter(o => ['DELIVERED', 'CANCELLED'].includes(o.status))

  return (
    <div className="space-y-5">
      <h3 className="font-bold text-gray-900">Siparişler</h3>

      {orders.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-12 w-12" />} title="Henüz sipariş yok" />
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Aktif</p>
              <div className="space-y-3">
                {active.map(order => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onCancel={() => { if (confirm('İptal etmek istediğinizden emin misiniz?')) cancelMutation.mutate(order.id) }}
                  />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Geçmiş</p>
              <div className="space-y-2">
                {past.slice(0, 20).map(order => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OrderRow({ order, onCancel }: { order: Order; onCancel?: () => void }) {
  return (
    <Card>
      <CardBody className="py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">Masa {order.tableNumber}</span>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{timeAgo(order.createdAt)}</span>
            {onCancel && !['DELIVERED', 'CANCELLED'].includes(order.status) && (
              <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-50">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1">
          {order.items.map(item => (
            <p key={item.id} className="text-xs text-gray-500">
              {item.quantity}x {item.menuItemName}
              {item.selectedOptions.length > 0 && ` (${item.selectedOptions.map(o=>o.optionName).join(', ')})`}
            </p>
          ))}
        </div>
        <p className="text-sm font-bold text-gray-900 mt-2">{formatPrice(order.totalAmount)}</p>
      </CardBody>
    </Card>
  )
}
