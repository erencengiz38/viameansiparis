'use client'
import dynamic from 'next/dynamic'
import { use, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { settingsApi, ownerApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Spinner } from '@/components/ui/index'
import { Settings, Store, Phone, MapPin, Globe, Star, Shield, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const MapPicker = dynamic(() => import('@/components/map-picker'), { ssr: false })

export default function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string; restaurantId: string }>
}) {
  const { restaurantId } = use(params)
  const id = Number(restaurantId)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings', id],
    queryFn: () => settingsApi.get(id),
  })

  const { data: restaurant } = useQuery({
    queryKey: ['owner-restaurant', id],
    queryFn: () => ownerApi.getRestaurant(id),
    staleTime: 60_000,
  })

  const isSimple = restaurant?.planType === 'SIMPLE'

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    logoUrl: '',
    currency: 'TRY',
    reviewsEnabled: true,
    geoLat: null as number | null,
    geoLng: null as number | null,
    geoRadiusMeters: 30,
  })

  const [mapOpen, setMapOpen] = useState(false)

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        logoUrl: data.logoUrl ?? '',
        currency: data.currency ?? 'TRY',
        reviewsEnabled: data.reviewsEnabled ?? true,
        geoLat: data.geoLat ?? null,
        geoLng: data.geoLng ?? null,
        geoRadiusMeters: data.geoRadiusMeters ?? 30,
      })
    }
  }, [data])

  const geoAllMutation = useMutation({
    mutationFn: (enable: boolean) => ownerApi.setGeoForAllTables(id, enable),
    onSuccess: (_, enable) => toast.success(enable ? 'Tüm masalarda konum koruması açıldı' : 'Tüm masalarda konum koruması kapatıldı'),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.update(id, {
      ...form,
      geoLat: form.geoLat ?? undefined,
      geoLng: form.geoLng ?? undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', id] })
      toast.success('Ayarlar kaydedildi')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-5 pb-8">
      <FieldGroup icon={<Store className="h-4 w-4 text-gray-400" />} label="Restoran Adı">
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
          placeholder="Restoranın adı"
        />
      </FieldGroup>

      <FieldGroup icon={<MapPin className="h-4 w-4 text-gray-400" />} label="Adres">
        <textarea
          value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors resize-none"
          rows={2}
          placeholder="Restoran adresi"
        />
      </FieldGroup>

      <FieldGroup icon={<Phone className="h-4 w-4 text-gray-400" />} label="Telefon">
        <input
          type="tel"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
          placeholder="05XX XXX XX XX"
        />
      </FieldGroup>

      <FieldGroup icon={<Globe className="h-4 w-4 text-gray-400" />} label="Para Birimi">
        <select
          value={form.currency}
          onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
        >
          <option value="TRY">₺ Türk Lirası (TRY)</option>
          <option value="USD">$ ABD Doları (USD)</option>
          <option value="EUR">€ Euro (EUR)</option>
          <option value="GBP">£ İngiliz Sterlini (GBP)</option>
        </select>
      </FieldGroup>

      {!isSimple && (
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Star className="h-4 w-4 text-amber-400" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Müşteri Yorumları</p>
              <p className="text-xs text-gray-400 mt-0.5">Sipariş sonrası yorum ve puanlama</p>
            </div>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, reviewsEnabled: !f.reviewsEnabled }))}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
              form.reviewsEnabled ? 'bg-emerald-500' : 'bg-gray-200'
            )}
          >
            <span className={cn(
              'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all',
              form.reviewsEnabled ? 'left-6' : 'left-1'
            )} />
          </button>
        </div>
      </div>
      )}

      {/* Sahte Sipariş Koruması */}
      {!isSimple && (
      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2.5">
          <Shield className="h-4 w-4 text-blue-500" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">Sahte Sipariş Koruması</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Müşterilerin konumunu doğrulayarak restoran dışından gelen siparişleri engeller.
              Masalar sayfasından istediğiniz masalar için ayrı ayrı aktifleştirebilirsiniz.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => geoAllMutation.mutate(true)}
            disabled={geoAllMutation.isPending}
            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            Tümüne Aç
          </button>
          <button
            onClick={() => geoAllMutation.mutate(false)}
            disabled={geoAllMutation.isPending}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-xs py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            Tümüne Kapat
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Restoran Konumu</p>

          {form.geoLat && form.geoLng ? (
            <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
              <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs font-mono text-blue-800 flex-1">
                {form.geoLat.toFixed(5)}, {form.geoLng.toFixed(5)}
              </span>
              <button
                onClick={() => setMapOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Değiştir
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, geoLat: null, geoLng: null }))}
                className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                Sil
              </button>
            </div>
          ) : (
            <button
              onClick={() => setMapOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-blue-50 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-4 py-3 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Haritadan Konum Seç
            </button>
          )}
        </div>

        {form.geoLat && form.geoLng && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kabul Mesafesi</p>
              <span className="text-sm font-bold text-gray-900">{form.geoRadiusMeters} metre</span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={5}
              value={form.geoRadiusMeters}
              onChange={e => setForm(f => ({ ...f, geoRadiusMeters: Number(e.target.value) }))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>10m (sıkı)</span>
              <span>500m (geniş)</span>
            </div>
          </div>
        )}
      </div>
      )}

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !form.name.trim()}
        className="w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white font-bold py-3.5 rounded-2xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saveMutation.isPending ? <Spinner /> : <Settings className="h-4 w-4" />}
        Ayarları Kaydet
      </button>

      {/* Harita Modal */}
      {mapOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden w-full sm:max-w-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-bold text-gray-900 text-sm">Konumu Haritadan Seç</span>
              <button
                onClick={() => setMapOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div style={{ height: '380px' }}>
              <MapPicker
                initialLat={form.geoLat}
                initialLng={form.geoLng}
                onChange={(lat, lng) => setForm(f => ({ ...f, geoLat: lat, geoLng: lng }))}
              />
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-gray-400 truncate">
                {form.geoLat
                  ? `${form.geoLat.toFixed(5)}, ${form.geoLng?.toFixed(5)}`
                  : 'Haritaya tıklayarak konum seçin'}
              </span>
              <button
                onClick={() => setMapOpen(false)}
                className="flex-shrink-0 bg-gray-900 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldGroup({ icon, label, children }: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}
