'use client'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { LogOut, ChevronLeft, ShieldAlert, KeyRound } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Şifre güncellendi')
      onClose()
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Şifre güncellenemedi'
      toast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Şifre Değiştir</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Mevcut Şifre</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Yeni Şifre</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AppShell({ children, title, showBack, backHref, locale }: {
  children: ReactNode
  title?: string
  showBack?: boolean
  backHref?: string
  locale: string
}) {
  const tc = useTranslations('common')
  const { fullName, clearAuth, originalAdmin, returnToAdmin } = useAuthStore()
  const router = useRouter()
  const [showChangePassword, setShowChangePassword] = useState(false)

  const handleLogout = () => {
    clearAuth()
    router.push(`/${locale}/login`)
  }

  const handleReturnToAdmin = () => {
    returnToAdmin()
    router.push(`/${locale}/admin`)
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Admin impersonation banner */}
      {originalAdmin && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium z-50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            <span><span className="font-bold">{fullName}</span> hesabında görüntülüyorsunuz</span>
          </div>
          <button
            onClick={handleReturnToAdmin}
            className="bg-white text-amber-600 font-bold text-xs px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors flex-shrink-0"
          >
            Admin'e Dön
          </button>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 safe-top">
        <div className="flex items-center h-14 px-4 gap-3">
          {showBack ? (
            <Link href={backHref || '#'} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 flex-shrink-0">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Link>
          ) : null}

          {/* Branding */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Image
              src="/logo.png"
              alt="Viamean"
              width={32}
              height={32}
              className="object-contain brightness-0 flex-shrink-0"
            />
            <span className="font-bold text-gray-900 text-base leading-tight">Viamean Sipariş</span>
            {title && (
              <>
                <span className="text-gray-300 text-sm select-none flex-shrink-0">/</span>
                <span className="text-sm text-gray-500 truncate">{title}</span>
              </>
            )}
          </div>

          {fullName && (
            <button
              onClick={() => setShowChangePassword(true)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 flex-shrink-0"
              title="Şifre Değiştir"
            >
              <KeyRound className="h-5 w-5" />
            </button>
          )}

          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 flex-shrink-0">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main — tam genişlik, sidebar yok */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto p-4">
          {children}
        </div>
      </main>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}
