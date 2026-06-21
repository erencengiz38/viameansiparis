import { Badge } from './index'
import type { OrderStatus } from '@/types'

const statusConfig: Record<OrderStatus, { label: string; variant: 'warning' | 'info' | 'success' | 'gray' | 'danger' }> = {
  PENDING:   { label: 'Bekliyor',       variant: 'warning' },
  PREPARING: { label: 'Hazırlanıyor',   variant: 'info'    },
  READY:     { label: 'Hazır',          variant: 'success' },
  DELIVERED: { label: 'Teslim Edildi',  variant: 'gray'    },
  CANCELLED: { label: 'İptal Edildi',   variant: 'danger'  },
}

export function OrderStatusBadge({ status, locale }: { status: OrderStatus; locale?: string }) {
  const config = statusConfig[status]
  const labels: Record<string, Record<OrderStatus, string>> = {
    en: {
      PENDING: 'Pending', PREPARING: 'Preparing', READY: 'Ready',
      DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
    }
  }
  const label = locale === 'en' ? (labels.en[status] || config.label) : config.label
  return <Badge variant={config.variant}>{label}</Badge>
}
