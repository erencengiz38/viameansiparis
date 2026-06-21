'use client'
import { useState, use } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ownerApi } from '@/lib/api'
import { getErrorMessage, formatPrice } from '@/lib/utils'
import { Card, CardBody, Modal, EmptyState, Spinner, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Pencil, Trash2, Eye, EyeOff, UtensilsCrossed, X, Tag, ChevronRight, ChevronUp, ChevronDown, Sparkles } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useForm, useFieldArray } from 'react-hook-form'
import type { MenuItem, Category } from '@/types'
import { cn } from '@/lib/utils'

interface MenuItemForm {
  name: string
  nameEn?: string
  description?: string
  descriptionEn?: string
  basePrice: number
  campaignPrice?: number | string
  campaignEndsAt?: string
  categoryId?: string
  imageUrl?: string
  available: boolean
  displayOrder: number
  optionGroups: {
    name: string
    required: boolean
    multiSelect: boolean
    displayOrder: number
    options: { name: string; additionalPrice: number; displayOrder: number }[]
  }[]
}

type Tab = 'categories' | 'items'

interface AiMenuResult {
  categories: {
    name: string
    nameEn: string
    items: {
      name: string
      nameEn?: string
      description?: string
      descriptionEn?: string
      price: number
    }[]
  }[]
}

export default function MenuPage({ params }: { params: Promise<{ restaurantId: string; locale: string }> }) {
  const { restaurantId, locale } = use(params)
  const tc = useTranslations('common')
  const qc = useQueryClient()
  const rId = Number(restaurantId)

  const [tab, setTab] = useState<Tab>('categories')
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)

  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiDescription, setAiDescription] = useState('')
  const [aiImageFile, setAiImageFile] = useState<File | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AiMenuResult | null>(null)
  const [aiCreating, setAiCreating] = useState(false)

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['menu-items', rId],
    queryFn: () => ownerApi.getMenuItems(rId),
  })

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['categories', rId],
    queryFn: () => ownerApi.getCategories(rId),
  })

  // ─── Category mutations ───────────────────────────────────
  const catForm = useForm<{ name: string; nameEn?: string; imageUrl?: string; displayOrder: number }>({
    defaultValues: { displayOrder: 0 }
  })

  const createCatMutation = useMutation({
    mutationFn: (d: { name: string; nameEn?: string; imageUrl?: string; displayOrder: number }) =>
      ownerApi.createCategory(rId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', rId] })
      toast.success(tc('success'))
      setCatModalOpen(false)
      catForm.reset({ displayOrder: 0 })
      setEditCat(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteCatMutation = useMutation({
    mutationFn: (catId: number) => ownerApi.deleteCategory(rId, catId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories', rId] }); toast.success(tc('success')) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openAddCat = () => {
    setEditCat(null)
    catForm.reset({ name: '', nameEn: '', imageUrl: '', displayOrder: categories.length })
    setCatModalOpen(true)
  }

  // ─── MenuItem mutations ───────────────────────────────────
  const itemForm = useForm<MenuItemForm>({
    defaultValues: { available: true, displayOrder: 0, optionGroups: [] }
  })

  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control: itemForm.control, name: 'optionGroups'
  })

  const openAddItem = () => {
    setEditItem(null)
    itemForm.reset({ available: true, displayOrder: items.length, optionGroups: [] })
    setItemModalOpen(true)
  }

  const openEditItem = (item: MenuItem) => {
    setEditItem(item)
    itemForm.reset({
      name: item.name,
      nameEn: item.nameEn,
      description: item.description,
      descriptionEn: item.descriptionEn,
      basePrice: item.basePrice,
      campaignPrice: item.campaignPrice ?? '',
      campaignEndsAt: item.campaignEndsAt ? item.campaignEndsAt.slice(0, 16) : '',
      categoryId: item.categoryId ? String(item.categoryId) : undefined,
      imageUrl: item.imageUrl,
      available: item.available,
      displayOrder: item.displayOrder,
      optionGroups: item.optionGroups.map(g => ({
        name: g.name, required: g.required, multiSelect: g.multiSelect,
        displayOrder: g.displayOrder,
        options: g.options.map(o => ({ name: o.name, additionalPrice: o.additionalPrice, displayOrder: o.displayOrder }))
      }))
    })
    setItemModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: MenuItemForm) => {
      const payload = {
        ...data,
        basePrice: Number(data.basePrice),
        campaignPrice: data.campaignPrice !== '' && data.campaignPrice != null ? Number(data.campaignPrice) : null,
        campaignEndsAt: data.campaignEndsAt || null,
        categoryId: data.categoryId ? Number(data.categoryId) : null,
        optionGroups: (data.optionGroups || []).map(g => ({
          ...g,
          options: (g.options || []).map(o => ({ ...o, additionalPrice: Number(o.additionalPrice) }))
        }))
      }
      return editItem
        ? ownerApi.updateMenuItem(rId, editItem.id, payload)
        : ownerApi.createMenuItem(rId, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-items', rId] })
      toast.success(tc('success'))
      setItemModalOpen(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: (itemId: number) => ownerApi.toggleAvailability(rId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-items', rId] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const reorderCatMutation = useMutation({
    mutationFn: (orders: { id: number; displayOrder: number }[]) =>
      ownerApi.reorderCategories(rId, orders),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', rId] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const reorderItemMutation = useMutation({
    mutationFn: (orders: { id: number; displayOrder: number }[]) =>
      ownerApi.reorderMenuItems(rId, orders),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-items', rId] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const moveCat = (idx: number, dir: -1 | 1) => {
    const arr = [...categories].sort((a, b) => a.displayOrder - b.displayOrder)
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    // Swap in array, then assign clean sequential displayOrder values
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
    reorderCatMutation.mutate(arr.map((cat, i) => ({ id: cat.id, displayOrder: i })))
  }

  const moveItem = (catId: number | undefined, idx: number, dir: -1 | 1) => {
    const arr = [...items.filter(i => i.categoryId === catId)].sort((a, b) => a.displayOrder - b.displayOrder)
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
    reorderItemMutation.mutate(arr.map((item, i) => ({ id: item.id, displayOrder: i })))
  }

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => ownerApi.deleteMenuItem(rId, itemId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-items', rId] }); toast.success(tc('success')) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // AI menü oluşturma
  const handleAiSubmit = async () => {
    if (!aiImageFile) return
    setAiLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', aiImageFile)
      fd.append('description', aiDescription)
      const res = await fetch('/nextapi/ai-menu', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Hata oluştu')
      setAiResult(data)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'AI hatası')
    } finally {
      setAiLoading(false)
    }
  }

  const fetchPexelsImage = async (query: string): Promise<string | undefined> => {
    try {
      const res = await fetch(`/nextapi/pexels?q=${encodeURIComponent(query + ' food')}`)
      const data = await res.json()
      return data.photos?.[0]?.url
    } catch {
      return undefined
    }
  }

  const handleAiCreate = async () => {
    if (!aiResult) return
    setAiCreating(true)
    try {
      const catMap: Record<string, number> = {}
      for (const cat of aiResult.categories) {
        const existing = categories.find(c => c.name.toLowerCase() === cat.name.toLowerCase())
        if (existing) {
          catMap[cat.name] = existing.id
        } else {
          const imageUrl = await fetchPexelsImage(cat.nameEn || cat.name)
          const created = await ownerApi.createCategory(rId, {
            name: cat.name,
            nameEn: cat.nameEn,
            imageUrl,
            displayOrder: categories.length,
          })
          catMap[cat.name] = created.id
        }
      }
      for (const cat of aiResult.categories) {
        for (const item of cat.items) {
          const imageUrl = await fetchPexelsImage(item.nameEn || item.name)
          await ownerApi.createMenuItem(rId, {
            name: item.name,
            nameEn: item.nameEn,
            description: item.description,
            descriptionEn: item.descriptionEn,
            basePrice: item.price,
            imageUrl,
            categoryId: catMap[cat.name] ?? null,
            available: true,
            displayOrder: 0,
            optionGroups: [],
          })
        }
      }
      await qc.invalidateQueries({ queryKey: ['categories', rId] })
      await qc.invalidateQueries({ queryKey: ['menu-items', rId] })
      toast.success('Menü başarıyla oluşturuldu!')
      setAiModalOpen(false)
      setAiResult(null)
      setAiImageFile(null)
      setAiDescription('')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Oluşturma hatası')
    } finally {
      setAiCreating(false)
    }
  }

  // Kategoriye göre grupla
  const grouped = categories.reduce((acc, cat) => {
    acc[cat.id] = { cat, items: items.filter(i => i.categoryId === cat.id) }
    return acc
  }, {} as Record<number, { cat: Category; items: MenuItem[] }>)
  const uncategorized = items.filter(i => !i.categoryId)

  return (
    <div className="space-y-4">
      {/* Tab bar + AI button */}
      <div className="flex gap-2 items-center">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl flex-1">
        <button
          onClick={() => setTab('categories')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all',
            tab === 'categories' ? 'bg-white text-[#57CF42] shadow-sm' : 'text-gray-500'
          )}
        >
          <Tag className="h-4 w-4" />
          Kategoriler
          {categories.length > 0 && (
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full', tab === 'categories' ? 'bg-gray-100' : 'bg-gray-200')}>
              {categories.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('items')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all',
            tab === 'items' ? 'bg-white text-[#57CF42] shadow-sm' : 'text-gray-500'
          )}
        >
          <UtensilsCrossed className="h-4 w-4" />
          Ürünler
          {items.length > 0 && (
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full', tab === 'items' ? 'bg-gray-100' : 'bg-gray-200')}>
              {items.length}
            </span>
          )}
        </button>
      </div>
      <button
        onClick={() => { setAiResult(null); setAiModalOpen(true) }}
        className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors flex-shrink-0"
        title="AI ile menü oluştur"
      >
        <Sparkles className="h-4 w-4" />
        AI
      </button>
      </div>

      {/* ═══ KATEGORİLER ═══════════════════════════════════ */}
      {tab === 'categories' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Kategoriler menüde gruplandırma sağlar</p>
            <Button size="sm" onClick={openAddCat}>
              <Plus className="h-4 w-4" />
              Ekle
            </Button>
          </div>

          {catsLoading ? <Spinner /> : categories.length === 0 ? (
            <EmptyState
              icon={<Tag className="h-12 w-12" />}
              title="Henüz kategori yok"
              description="Önce kategori ekleyin, ardından ürün ekleyebilirsiniz"
              action={
                <Button onClick={openAddCat}>
                  <Plus className="h-4 w-4" />
                  Kategori Ekle
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {[...categories].sort((a, b) => a.displayOrder - b.displayOrder).map((cat, idx, sorted) => {
                const catItemCount = items.filter(i => i.categoryId === cat.id).length
                return (
                  <Card key={cat.id}>
                    <CardBody className="flex items-center gap-3 py-3">
                      {cat.imageUrl ? (
                        <img src={cat.imageUrl} alt={cat.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Tag className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-300 w-4 text-right">{idx + 1}</span>
                          <p className="font-semibold text-gray-900 truncate">{cat.name}</p>
                        </div>
                        <p className="text-xs text-gray-400 pl-6">{catItemCount} ürün</p>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => moveCat(idx, -1)}
                          disabled={idx === 0 || reorderCatMutation.isPending}
                          className="w-8 h-8 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
                        >
                          <ChevronUp className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => moveCat(idx, 1)}
                          disabled={idx === sorted.length - 1 || reorderCatMutation.isPending}
                          className="w-8 h-8 rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
                        >
                          <ChevronDown className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`"${cat.name}" kategorisini silmek istiyor musunuz?`))
                              deleteCatMutation.mutate(cat.id)
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 ml-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Kategori ekleme ipucu */}
          {categories.length > 0 && (
            <div className="bg-blue-50 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ChevronRight className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Ürün eklemek için</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  "Ürünler" sekmesine geçin ve ürün eklerken kategori seçin
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ÜRÜNLER ═══════════════════════════════════════ */}
      {tab === 'items' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {categories.length === 0
                ? '⚠️ Önce kategori ekleyin'
                : `${categories.length} kategori mevcut`}
            </p>
            <Button size="sm" onClick={openAddItem}>
              <Plus className="h-4 w-4" />
              Ürün Ekle
            </Button>
          </div>

          {itemsLoading ? <Spinner /> : items.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed className="h-12 w-12" />}
              title="Henüz ürün yok"
              action={<Button onClick={openAddItem}><Plus className="h-4 w-4" />Ürün Ekle</Button>}
            />
          ) : (
            <div className="space-y-6">
              {[...categories].sort((a, b) => a.displayOrder - b.displayOrder).map(cat => {
                const catItems = [...items.filter(i => i.categoryId === cat.id)].sort((a, b) => a.displayOrder - b.displayOrder)
                if (catItems.length === 0) return null
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      {cat.imageUrl && (
                        <img src={cat.imageUrl} alt={cat.name} className="w-5 h-5 rounded-md object-cover" />
                      )}
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{cat.name}</p>
                      <span className="text-xs text-gray-300">{catItems.length}</span>
                    </div>
                    <div className="space-y-2">
                      {catItems.map((item, idx) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          idx={idx}
                          total={catItems.length}
                          onEdit={() => openEditItem(item)}
                          onToggle={() => toggleMutation.mutate(item.id)}
                          onDelete={() => { if (confirm('Silmek istediğinizden emin misiniz?')) deleteItemMutation.mutate(item.id) }}
                          onMoveUp={idx > 0 ? () => moveItem(cat.id, idx, -1) : undefined}
                          onMoveDown={idx < catItems.length - 1 ? () => moveItem(cat.id, idx, 1) : undefined}
                          reordering={reorderItemMutation.isPending}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              {uncategorized.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Kategorisiz</p>
                  <div className="space-y-2">
                    {[...uncategorized].sort((a, b) => a.displayOrder - b.displayOrder).map((item, idx) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        idx={idx}
                        total={uncategorized.length}
                        onEdit={() => openEditItem(item)}
                        onToggle={() => toggleMutation.mutate(item.id)}
                        onDelete={() => { if (confirm('Silmek istediğinizden emin misiniz?')) deleteItemMutation.mutate(item.id) }}
                        onMoveUp={idx > 0 ? () => moveItem(undefined, idx, -1) : undefined}
                        onMoveDown={idx < uncategorized.length - 1 ? () => moveItem(undefined, idx, 1) : undefined}
                        reordering={reorderItemMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Kategori Modal ─── */}
      <Modal
        open={catModalOpen}
        onClose={() => { setCatModalOpen(false); catForm.reset() }}
        title="Kategori Ekle"
      >
        <form onSubmit={catForm.handleSubmit(d => createCatMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kategori Adı (TR)" required
              placeholder="Ana Yemekler"
              error={catForm.formState.errors.name?.message}
              {...catForm.register('name', { required: 'Kategori adı zorunlu' })}
            />
            <Input
              label="Category Name (EN)"
              placeholder="Main Dishes"
              {...catForm.register('nameEn')}
            />
          </div>
          <ImageUpload
            restaurantId={rId}
            context="category"
            label="Kategori Görseli"
            value={catForm.watch('imageUrl') ?? ''}
            onChange={(url) => catForm.setValue('imageUrl', url)}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth type="button" onClick={() => { setCatModalOpen(false); catForm.reset() }}>
              {tc('cancel')}
            </Button>
            <Button fullWidth type="submit" loading={createCatMutation.isPending}>
              {tc('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── AI Modal ─── */}
      <Modal
        open={aiModalOpen}
        onClose={() => { setAiModalOpen(false); setAiResult(null) }}
        title="AI ile Menü Oluştur"
      >
        {!aiResult ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Menü resmini yükleyin. AI otomatik olarak ürünleri, kategorileri ve açıklamaları (TR + EN) oluşturacak.</p>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Menü Resmi</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setAiImageFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-violet-50 file:text-violet-700 file:font-semibold hover:file:bg-violet-100 transition-colors"
              />
              {aiImageFile && <p className="text-xs text-gray-400 mt-1">{aiImageFile.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Ek Açıklama (opsiyonel)</label>
              <textarea
                value={aiDescription}
                onChange={e => setAiDescription(e.target.value)}
                rows={3}
                placeholder="AI'a ek bilgi verin: mutfak türü, fiyat formatı, vb."
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth type="button" onClick={() => setAiModalOpen(false)}>İptal</Button>
              <Button
                fullWidth
                type="button"
                loading={aiLoading}
                disabled={!aiImageFile || aiLoading}
                onClick={handleAiSubmit}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Sparkles className="h-4 w-4" />
                Analiz Et
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-violet-50 rounded-xl p-3">
              <p className="text-sm font-semibold text-violet-900">{aiResult.categories.reduce((s, c) => s + c.items.length, 0)} ürün bulundu — {aiResult.categories.length} kategori</p>
              <p className="text-xs text-violet-600 mt-0.5">Onayladığınızda bunlar menüye eklenecek</p>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {aiResult.categories.map((cat, ci) => (
                <div key={ci}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{cat.name} {cat.nameEn ? `/ ${cat.nameEn}` : ''}</p>
                  <div className="space-y-1">
                    {cat.items.map((item, ii) => (
                      <div key={ii} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          {item.nameEn && <p className="text-xs text-gray-400 truncate">{item.nameEn}</p>}
                        </div>
                        <span className="text-sm font-bold text-gray-700 ml-3 flex-shrink-0">{item.price > 0 ? `₺${item.price}` : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth type="button" onClick={() => setAiResult(null)}>Geri</Button>
              <Button
                fullWidth
                type="button"
                loading={aiCreating}
                onClick={handleAiCreate}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Sparkles className="h-4 w-4" />
                Menüye Ekle
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Ürün Modal ─── */}
      <Modal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editItem ? 'Ürün Düzenle' : 'Ürün Ekle'}
        className="sm:max-w-2xl"
      >
        <form onSubmit={itemForm.handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ürün Adı (TR)" required
              placeholder="Adana Kebap"
              error={itemForm.formState.errors.name?.message}
              {...itemForm.register('name', { required: 'Ürün adı zorunlu' })}
            />
            <Input
              label="Item Name (EN)"
              placeholder="Adana Kebab"
              {...itemForm.register('nameEn')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fiyat (₺)" required type="number" step="0.01" min="0"
              placeholder="0.00"
              error={itemForm.formState.errors.basePrice?.message}
              {...itemForm.register('basePrice', { required: 'Fiyat zorunlu' })}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Kategori
                {categories.length === 0 && (
                  <span className="text-orange-500 text-xs ml-2">(önce kategori ekleyin)</span>
                )}
              </label>
              <select
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                disabled={categories.length === 0}
                {...itemForm.register('categoryId')}
              >
                <option value="">— Kategori seçin —</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Açıklama (TR)"
              placeholder="Ürün açıklaması"
              {...itemForm.register('description')}
            />
            <Input
              label="Description (EN)"
              placeholder="Product description"
              {...itemForm.register('descriptionEn')}
            />
          </div>

          {/* Kampanya */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 space-y-3">
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Kampanya (opsiyonel)</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Kampanya Fiyatı (₺)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...itemForm.register('campaignPrice')}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Bitiş Tarihi</label>
                <input
                  type="datetime-local"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  {...itemForm.register('campaignEndsAt')}
                />
              </div>
            </div>
            <p className="text-xs text-orange-500">Boş bırakılırsa kampanya süresiz devam eder. Kampanya fiyatı girilmezse kampanya aktif olmaz.</p>
          </div>

          <ImageUpload
            restaurantId={rId}
            context="item"
            label="Ürün Görseli"
            value={itemForm.watch('imageUrl') ?? ''}
            onChange={(url) => itemForm.setValue('imageUrl', url)}
          />

          {/* Seçenek Grupları */}
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            {/* Başlık */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-800">Seçenek Grupları</p>
                <p className="text-xs text-gray-400 mt-0.5">Örn: Usul (Antakya/Urfa) &nbsp;•&nbsp; Boy (Tek/Çift) &nbsp;•&nbsp; Pişirme (Az/Orta/İyi)</p>
              </div>
              <button
                type="button"
                onClick={() => appendGroup({ name: '', required: false, multiSelect: false, displayOrder: groupFields.length, options: [] })}
                className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-gray-700 active:scale-95 transition-all flex-shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Grup Ekle
              </button>
            </div>

            {groupFields.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">Henüz seçenek grubu yok</p>
                <p className="text-xs text-gray-300 mt-1">Ürünün boyutu, pişirme şekli gibi seçenekler buraya eklenir</p>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {groupFields.map((group, gi) => (
                <OptionGroupField
                  key={group.id}
                  groupIndex={gi}
                  register={itemForm.register}
                  control={itemForm.control}
                  onRemove={() => removeGroup(gi)}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth type="button" onClick={() => setItemModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button fullWidth type="submit" loading={saveMutation.isPending}>
              {tc('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Menu Item Card ──────────────────────────────────────────
function MenuItemCard({ item, idx, total, onEdit, onToggle, onDelete, onMoveUp, onMoveDown, reordering }: {
  item: MenuItem
  idx: number
  total: number
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  reordering?: boolean
}) {
  return (
    <Card className={!item.available ? 'opacity-60' : ''}>
      <CardBody className="flex items-center gap-3 py-3">
        {/* Sıra no + ok */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={!onMoveUp || reordering}
            className="w-8 h-8 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <span className="text-[10px] font-bold text-gray-400 leading-none">{idx + 1}</span>
          <button
            onClick={onMoveDown}
            disabled={!onMoveDown || reordering}
            className="w-8 h-8 rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="h-5 w-5 text-gray-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 truncate text-sm">{item.name}</p>
            {!item.available && <Badge variant="gray">Pasif</Badge>}
          </div>
          {item.description && <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>}
          <div className="flex items-center gap-2 mt-1 min-w-0 flex-wrap">
            {item.campaignActive ? (
              <>
                <p className="text-sm font-bold text-orange-500 flex-shrink-0">{formatPrice(item.campaignPrice!)}</p>
                <p className="text-xs text-gray-400 line-through flex-shrink-0">{formatPrice(item.basePrice)}</p>
                <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full flex-shrink-0">Kampanya</span>
              </>
            ) : (
              <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatPrice(item.basePrice)}</p>
            )}
            {item.optionGroups.length > 0 && (
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{item.optionGroups.length} seçenek</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggle} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400" title={item.available ? 'Pasif yap' : 'Aktif yap'}>
            {item.available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardBody>
    </Card>
  )
}

// ─── Option Group Field ──────────────────────────────────────
function OptionGroupField({ groupIndex, register, control, onRemove }: {
  groupIndex: number
  register: ReturnType<typeof useForm<MenuItemForm>>['register']
  control: ReturnType<typeof useForm<MenuItemForm>>['control']
  onRemove: () => void
}) {
  const { fields, append, remove } = useFieldArray({
    control, name: `optionGroups.${groupIndex}.options`
  })

  return (
    <div className="p-4 space-y-4 bg-white">
      {/* Grup adı satırı */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
            Grup Adı
          </label>
          <input
            placeholder="örn: Usul, Boy, Pişirme Şekli"
            className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
            {...register(`optionGroups.${groupIndex}.name`, { required: true })}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-6 p-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
          title="Grubu sil"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Ayarlar */}
      <div className="flex gap-3">
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-gray-900"
            {...register(`optionGroups.${groupIndex}.required`)}
          />
          <span className="text-sm text-gray-700 font-medium">Zorunlu</span>
        </label>
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-gray-900"
            {...register(`optionGroups.${groupIndex}.multiSelect`)}
          />
          <span className="text-sm text-gray-700 font-medium">Çoklu seçim</span>
        </label>
      </div>

      {/* Seçenekler listesi */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex-1">Seçenek Adı</p>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide w-28 text-right">Ek Fiyat (₺)</p>
          <div className="w-8" />
        </div>

        <div className="space-y-2">
          {fields.map((opt, oi) => (
            <div key={opt.id} className="flex items-center gap-2">
              <input
                placeholder="örn: Antakya usulü"
                className="flex-1 h-10 rounded-xl border border-gray-200 px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
                {...register(`optionGroups.${groupIndex}.options.${oi}.name`, { required: true })}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-28 h-10 rounded-xl border border-gray-200 px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors text-right"
                {...register(`optionGroups.${groupIndex}.options.${oi}.additionalPrice`)}
              />
              <button
                type="button"
                onClick={() => remove(oi)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => append({ name: '', additionalPrice: 0, displayOrder: fields.length })}
          className="w-full mt-3 flex items-center justify-center gap-2 h-9 border-2 border-dashed border-gray-200 text-gray-400 font-semibold text-sm rounded-xl hover:border-gray-400 hover:text-gray-600 transition-all"
        >
          <Plus className="h-4 w-4" />
          Seçenek Ekle
        </button>
      </div>
    </div>
  )
}
