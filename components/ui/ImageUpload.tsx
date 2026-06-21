'use client'
import { useState, useRef } from 'react'
import { imageApi } from '@/lib/api'
import { Upload, X, Image as ImageIcon, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ImageUploadProps {
  restaurantId: number
  value?: string
  onChange: (url: string) => void
  context?: string
  label?: string
}

interface PexelsPhoto {
  id: number
  url: string
  thumb: string
  alt: string
}

export function ImageUpload({ restaurantId, value, onChange, context = 'item', label = 'Görsel' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [pexelsOpen, setPexelsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [photos, setPhotos] = useState<PexelsPhoto[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error('Sadece JPG, PNG veya WebP yüklenebilir')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya 5 MB\'ı geçemez')
      return
    }
    setUploading(true)
    try {
      const result = await imageApi.upload(restaurantId, file, context)
      onChange(result.url)
      toast.success('Görsel yüklendi')
    } catch {
      toast.error('Yükleme başarısız')
    } finally {
      setUploading(false)
    }
  }

  const searchPexels = async () => {
    if (!query.trim()) return
    setSearching(true)
    setPhotos([])
    try {
      const res = await fetch(`/nextapi/pexels?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setPhotos(data.photos ?? [])
    } catch {
      toast.error('Pexels araması başarısız')
    } finally {
      setSearching(false)
    }
  }

  const selectPhoto = (photo: PexelsPhoto) => {
    onChange(photo.url)
    setPexelsOpen(false)
    setPhotos([])
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      <div className="flex items-center gap-3">
        {/* Preview */}
        {value ? (
          <div className="relative w-16 h-16 flex-shrink-0">
            <img src={value} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-dashed border-gray-200">
            <ImageIcon className="h-6 w-6 text-gray-300" />
          </div>
        )}

        <div className="flex flex-col gap-2 flex-1">
          {/* Upload button */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed text-sm font-semibold transition-all',
              uploading
                ? 'border-gray-200 text-gray-400 cursor-wait'
                : 'border-[#57CF42]/40 text-[#57CF42] hover:border-[#57CF42] hover:bg-[#57CF42]/5'
            )}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Yükleniyor...' : 'Resim Yükle'}
          </button>

          {/* Pexels button */}
          <button
            type="button"
            onClick={() => { setPexelsOpen(o => !o); setPhotos([]); setQuery('') }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed text-sm font-semibold transition-all border-violet-200 text-violet-600 hover:border-violet-400 hover:bg-violet-50"
          >
            <Search className="h-4 w-4" />
            Pexels'ten Ara
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <p className="text-xs text-gray-400">JPG, PNG veya WebP — max 5 MB</p>

      {/* Pexels search panel */}
      {pexelsOpen && (
        <div className="border border-violet-100 rounded-2xl overflow-hidden bg-white shadow-sm">
          {/* Search input */}
          <div className="flex gap-2 p-3 border-b border-gray-100">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchPexels()}
              placeholder="Örn: köfte, pizza, salata..."
              className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300"
              autoFocus
            />
            <button
              type="button"
              onClick={searchPexels}
              disabled={searching || !query.trim()}
              className="h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Ara
            </button>
            <button
              type="button"
              onClick={() => setPexelsOpen(false)}
              className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results grid */}
          {searching && (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Aranıyor...
            </div>
          )}

          {!searching && photos.length === 0 && query && (
            <div className="py-8 text-center text-gray-400 text-sm">
              Sonuç bulunamadı
            </div>
          )}

          {!searching && photos.length === 0 && !query && (
            <div className="py-6 text-center text-gray-400 text-sm">
              Yukarıya arama terimi gir, Enter'a bas
            </div>
          )}

          {photos.length > 0 && (
            <div className="p-3 grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto">
              {photos.map(photo => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => selectPhoto(photo)}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-violet-400 transition-all group"
                  title={photo.alt}
                >
                  <img
                    src={photo.thumb}
                    alt={photo.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </button>
              ))}
            </div>
          )}

          {photos.length > 0 && (
            <p className="text-[10px] text-gray-300 text-right px-3 pb-2">
              Görseller Pexels.com'dan • Fotoğrafçılara teşekkürler
            </p>
          )}
        </div>
      )}
    </div>
  )
}
