'use client'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { HTMLAttributes, ReactNode, useEffect } from 'react'

// ─── Card ───────────────────────────────────────
export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-4 pt-4 pb-3 border-b border-gray-50', className)} {...props}>
      {children}
    </div>
  )
}

export function CardBody({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4', className)} {...props}>
      {children}
    </div>
  )
}

// ─── Badge ──────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gray'

export function Badge({ children, variant = 'default', className }: {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-700',
    gray: 'bg-gray-50 text-gray-500',
  }
  return (
    <span className={cn('inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

// ─── Modal ──────────────────────────────────────
export function Modal({ open, onClose, title, children, className }: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className={cn(
        'relative z-10 w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto',
        'sm:max-w-lg sm:mx-4',
        className
      )}>
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 pt-3 pb-4">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Empty State ────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-3 text-gray-300">{icon}</div>}
      <p className="font-medium text-gray-500">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Spinner ────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-800" />
    </div>
  )
}

// ─── Select ─────────────────────────────────────
export function Select({ label, error, children, className, ...props }: {
  label?: string
  error?: string
  children: ReactNode
} & HTMLAttributes<HTMLSelectElement> & { value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; name?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {(props as { required?: boolean }).required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={cn(
          'h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent',
          'transition-all duration-150',
          error && 'border-red-400',
          className
        )}
        {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
