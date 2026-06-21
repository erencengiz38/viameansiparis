'use client'
import Link from 'next/link'
import { UtensilsCrossed } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <UtensilsCrossed className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-5xl font-black text-gray-900 mb-2">404</h1>
        <p className="text-lg font-semibold text-gray-700 mb-1">Sayfa bulunamadı</p>
        <p className="text-sm text-gray-400 mb-8">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#57CF42] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#4ab938] transition-colors"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  )
}
