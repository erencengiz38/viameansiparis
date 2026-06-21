import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(price)
}

export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Az önce'
  if (diffMins < 60) return `${diffMins} dk`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} sa`
  return `${Math.floor(diffHours / 24)} gün`
}

export function getRolePath(role: string): string {
  switch (role) {
    case 'ADMIN': return '/admin'
    case 'OWNER': return '/owner/restaurants'
    case 'CHEF': return '/chef'
    case 'WAITER': return '/waiter'
    case 'CASHIER': return '/cashier'
    default: return '/login'
  }
}


export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const e = error as { response?: { data?: { message?: string } } }
    return e.response?.data?.message ?? 'Bir hata oluştu'
  }
  if (error instanceof Error) return error.message
  return 'Beklenmeyen bir hata oluştu'
}
