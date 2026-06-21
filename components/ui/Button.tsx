'use client'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children, variant = 'primary', size = 'md', loading, fullWidth, className, disabled, ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

  const variants = {
    primary:   'bg-[#57CF42] text-white hover:bg-[#4ab938] shadow-md shadow-[#57CF42]/30',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    ghost:     'text-gray-700 hover:bg-gray-100',
    danger:    'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    outline:   'border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300',
    success:   'bg-[#57CF42] text-white hover:bg-[#4ab938] shadow-md shadow-[#57CF42]/30',
  }

  const sizes = {
    sm:  'h-9 px-4 text-sm',
    md:  'h-11 px-5 text-sm',
    lg:  'h-13 px-7 text-base',
    xl:  'h-14 px-8 text-base',
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
})
Button.displayName = 'Button'
