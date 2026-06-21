'use client'
import { useEffect, useState, use, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { menuApi, tableApi, reviewApi } from '@/lib/api'
import { getErrorMessage, formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cart'
import {
  ShoppingCart, Plus, Minus, X, UtensilsCrossed,
  Bell, Receipt, Check, ArrowLeft, ChefHat,
  Search, Trash2, Star, MapPin,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { MenuItem, MenuItemOption, MenuItemOptionGroup } from '@/types'
import { cn } from '@/lib/utils'

type Screen = 'categories' | 'items' | 'cart' | 'success'

interface Category {
  id: number
  name: string
  nameEn?: string
  imageUrl?: string
  displayOrder: number
  items: MenuItem[]
}

export default function CustomerMenuPage({ params }: { params: Promise<{ qrToken: string; locale: string }> }) {
  const { qrToken, locale } = use(params)
  const [lang, setLang] = useState<'tr' | 'en'>(locale === 'en' ? 'en' : 'tr')
  const isEn = lang === 'en'
  const [screen, setScreen] = useState<Screen>('categories')
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastOrderId, setLastOrderId] = useState<number | null>(null)
  const { setContext, setSessionToken, getTotalItems, getTotalPrice, sessionToken } = useCartStore()

  const { data: menu, isLoading, error } = useQuery({
    queryKey: ['menu', qrToken],
    queryFn: () => menuApi.getByQrToken(qrToken),
    staleTime: 60_000,
  })

  // Sayfa yenilenince localStorage'dan token'ı hemen al (API yanıtı beklenmeden)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(`st_${qrToken}`)
    if (stored && !sessionToken) setSessionToken(stored)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menu) return
    setContext(qrToken, menu.restaurantName, menu.tableNumber, menu.sessionToken)
    // Token'ı localStorage'a kaydet — URL yerine temiz saklama
    if (typeof window !== 'undefined') {
      localStorage.setItem(`st_${qrToken}`, menu.sessionToken)
      // Eski URL'de ?k= varsa temizle
      const url = new URL(window.location.href)
      if (url.searchParams.has('k')) {
        url.searchParams.delete('k')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [menu, qrToken, setContext])

  // Tüm ürünler flat liste — arama için
  const allItems = useMemo(() =>
    menu?.categories.flatMap(c => c.items.map(i => ({ ...i, categoryName: c.name }))) ?? [],
    [menu]
  )

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return allItems.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.nameEn?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.descriptionEn?.toLowerCase().includes(q)
    )
  }, [searchQuery, allItems])

  const isSearching = searchQuery.trim().length > 0

  const isSimple = menu?.planType === 'SIMPLE'

  const { data: myOrders = [] } = useQuery({
    queryKey: ['my-orders', qrToken, sessionToken],
    queryFn: () => menuApi.getMyOrders(qrToken, sessionToken!),
    enabled: !!sessionToken && !isSimple,
    refetchInterval: 10_000,
  })

  const previousTotal = myOrders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.totalAmount, 0)

  if (isLoading) return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <ChefHat className="h-10 w-10 text-gray-300 animate-pulse" />
        <p className="text-sm text-gray-400 font-medium">Menü yükleniyor...</p>
      </div>
    </div>
  )

  if (error || !menu) return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <UtensilsCrossed className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">Menü bulunamadı</p>
        <p className="text-sm text-gray-400 mt-1">Lütfen QR kodu tekrar tarayınız</p>
      </div>
    </div>
  )

  if (screen === 'success') return (
    <SuccessScreen
      tableNumber={menu.tableNumber}
      orderId={lastOrderId}
      qrToken={qrToken}
      sessionToken={sessionToken!}
      onBack={() => { setScreen('categories'); setActiveCategory(null); setLastOrderId(null) }}
    />
  )

  if (screen === 'cart' && !isSimple) return (
    <CartScreen
      qrToken={qrToken}
      geoProtection={menu.geoProtection}
      geoLat={menu.geoLat}
      geoLng={menu.geoLng}
      geoRadius={menu.geoRadius}
      previousOrders={myOrders}
      previousTotal={previousTotal}
      onBack={() => setScreen(activeCategory ? 'items' : 'categories')}
      onSuccess={(orderId) => { setLastOrderId(orderId); setScreen('success') }}
    />
  )

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {screen === 'items' && !isSearching && (
              <button
                onClick={() => { setScreen('categories'); setActiveCategory(null) }}
                className="p-1.5 -ml-1.5 rounded-xl hover:bg-gray-100 active:scale-90 transition-transform"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
            )}
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">
                {screen === 'items' && activeCategory && !isSearching
                  ? (isEn && activeCategory.nameEn ? activeCategory.nameEn : activeCategory.name)
                  : menu.restaurantName}
              </h1>
              {!isSimple && <p className="text-xs text-gray-400">Masa {menu.tableNumber}</p>}
            </div>
          </div>

          {!isSimple && (getTotalItems() > 0 ? (
            <button
              onClick={() => setScreen('cart')}
              className="flex items-center gap-2 bg-gray-900 text-white rounded-2xl px-3.5 py-2 text-sm font-semibold active:scale-95 transition-transform"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{getTotalItems()}</span>
              <span className="text-gray-400 text-xs font-normal">{formatPrice(getTotalPrice())}</span>
            </button>
          ) : previousTotal > 0 ? (
            <button
              onClick={() => setScreen('cart')}
              className="flex items-center gap-2 bg-orange-500 text-white rounded-2xl px-3.5 py-2 text-sm font-semibold active:scale-95 transition-transform"
            >
              <Receipt className="h-4 w-4" />
              <span>{formatPrice(previousTotal)}</span>
            </button>
          ) : (
            <button onClick={() => setScreen('cart')} className="text-gray-400 p-2">
              <ShoppingCart className="h-5 w-5" />
            </button>
          ))}
        </div>

        {/* Dil seçici */}
        <div className="flex justify-end gap-1.5 mb-2.5">
          <button
            onClick={() => setLang('tr')}
            className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all', lang === 'tr' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200')}
          >
            <FlagTR className="w-6 h-4 rounded-sm flex-shrink-0" />
            TR
          </button>
          <button
            onClick={() => setLang('en')}
            className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all', lang === 'en' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200')}
          >
            <FlagGB className="w-6 h-4 rounded-sm flex-shrink-0" />
            ENG
          </button>
        </div>

        {/* Arama */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search items...' : 'Ürün ara...'}
            className="w-full bg-gray-100 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 pb-40">
        {isSearching ? (
          <SearchResults
            results={searchResults}
            query={searchQuery}
            onSelect={setSelectedItem}
            isSimple={isSimple}
            isEn={isEn}
          />
        ) : screen === 'categories' ? (
          <CategoryGrid
            categories={menu.categories}
            onSelect={(cat) => { setActiveCategory(cat); setScreen('items') }}
            isEn={isEn}
          />
        ) : (
          activeCategory && (
            <ItemList
              items={activeCategory.items}
              onSelect={setSelectedItem}
              isSimple={isSimple}
              isEn={isEn}
            />
          )
        )}
      </div>

      {/* Alt bar */}
      {!isSimple && (
        <BottomBar
          qrToken={qrToken}
          sessionToken={menu.sessionToken}
          onCartClick={() => setScreen('cart')}
          totalItems={getTotalItems()}
          totalPrice={getTotalPrice()}
          previousTotal={previousTotal}
        />
      )}

      {/* Ürün detay modal */}
      {selectedItem && (
        <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} isSimple={isSimple} isEn={isEn} />
      )}
    </div>
  )
}

// ─── Category Grid ───────────────────────────────────────────
function CategoryGrid({ categories, onSelect, isEn }: {
  categories: Category[]
  onSelect: (cat: Category) => void
  isEn?: boolean
}) {
  if (categories.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16">
      <UtensilsCrossed className="h-12 w-12 text-gray-300 mb-3" />
      <p className="text-gray-500 font-medium">{isEn ? 'No menu items yet' : 'Henüz menü eklenmemiş'}</p>
    </div>
  )

  return (
    <div className="p-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{isEn ? 'Categories' : 'Kategoriler'}</p>
      <div className="grid grid-cols-2 gap-3">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat)}
            className="relative rounded-3xl overflow-hidden bg-gray-200 aspect-[4/3] active:scale-[0.97] transition-transform shadow-sm"
          >
            {cat.imageUrl ? (
              <img
                src={cat.imageUrl}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <UtensilsCrossed className="h-10 w-10 text-gray-400" />
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {/* Kampanya etiketi */}
            {cat.items.some(i => i.campaignActive) && (
              <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                Kampanya
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white font-bold text-sm leading-tight">{isEn && cat.nameEn ? cat.nameEn : cat.name}</p>
              <p className="text-white/70 text-xs mt-0.5">{cat.items.length} {isEn ? 'items' : 'ürün'}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Item List ───────────────────────────────────────────────
function ItemList({ items, onSelect, isSimple, isEn }: { items: MenuItem[]; onSelect: (item: MenuItem) => void; isSimple?: boolean; isEn?: boolean }) {
  return (
    <div className="divide-y divide-gray-50 bg-white">
      {items.map(item => (
        <MenuItemRow key={item.id} item={item} onSelect={() => onSelect(item)} isSimple={isSimple} isEn={isEn} />
      ))}
    </div>
  )
}

// ─── Search Results ─────────────────────────────────────────
function SearchResults({ results, query, onSelect, isSimple, isEn }: {
  results: (MenuItem & { categoryName: string })[]
  query: string
  onSelect: (item: MenuItem) => void
  isSimple?: boolean
  isEn?: boolean
}) {
  if (results.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Search className="h-10 w-10 text-gray-300 mb-3" />
      <p className="font-medium text-gray-500">{isEn ? `No results for "${query}"` : `"${query}" için sonuç bulunamadı`}</p>
      <p className="text-sm text-gray-400 mt-1">{isEn ? 'Try a different word' : 'Farklı bir kelime deneyin'}</p>
    </div>
  )

  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">
        {isEn ? `${results.length} results` : `${results.length} sonuç`}
      </p>
      <div className="divide-y divide-gray-50 bg-white">
        {results.map(item => (
          <div key={item.id}>
            <div className="px-4 pt-2.5">
              <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                {item.categoryName}
              </span>
            </div>
            <MenuItemRow item={item} onSelect={() => onSelect(item)} isSimple={isSimple} isEn={isEn} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Menu Item Row ───────────────────────────────────────────
function MenuItemRow({ item, onSelect, isSimple, isEn }: { item: MenuItem; onSelect: () => void; isSimple?: boolean; isEn?: boolean }) {
  const { addItem, removeItem, updateQuantity, items } = useCartStore()
  const cartItems = items.filter(i => i.menuItem.id === item.id)
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)
  const hasOptions = item.optionGroups.length > 0

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasOptions) { onSelect(); return }
    addItem(item, 1, [])
    toast.success(`${item.name} eklendi`, { duration: 1200, icon: '✓' })
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    const lastIdx = items.findLastIndex(i => i.menuItem.id === item.id)
    if (lastIdx === -1) return
    const last = items[lastIdx]
    if (last.quantity > 1) updateQuantity(lastIdx, last.quantity - 1)
    else removeItem(lastIdx)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 cursor-pointer',
        !item.available && 'opacity-40'
      )}
      onClick={onSelect}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed className="h-7 w-7 text-gray-300" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-tight">{isEn && item.nameEn ? item.nameEn : item.name}</p>
        {(isEn ? (item.descriptionEn || item.description) : item.description) && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{isEn ? (item.descriptionEn || item.description) : item.description}</p>
        )}
        {item.campaignActive ? (
          <div className="flex items-center gap-1.5 mt-1.5">
            <p className="text-sm font-bold text-orange-500">{formatPrice(item.campaignPrice!)}</p>
            <p className="text-xs text-gray-400 line-through">{formatPrice(item.basePrice)}</p>
          </div>
        ) : (
          <p className="text-sm font-bold text-gray-900 mt-1.5">{formatPrice(item.basePrice)}</p>
        )}
        {!item.available && <span className="text-xs text-red-400 font-medium">Tükendi</span>}
        {hasOptions && item.available && (
          <span className="text-xs text-gray-400">{item.optionGroups.length} seçenek</span>
        )}
      </div>

      {!isSimple && (
        <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
          {cartCount === 0 ? (
            <button
              onClick={handleAdd}
              disabled={!item.available}
              className={cn(
                'w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90',
                item.available ? 'bg-[#57CF42] text-white shadow-md shadow-[#57CF42]/30' : 'bg-gray-100 text-gray-300'
              )}
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-gray-900 rounded-2xl px-1.5 py-1">
              <button onClick={handleDecrement} className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                <Minus className="h-3.5 w-3.5 text-white" />
              </button>
              <span className="text-white text-sm font-bold w-5 text-center">{cartCount}</span>
              <button onClick={handleAdd} className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                <Plus className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Bottom Bar ─────────────────────────────────────────────
function BottomBar({ qrToken, sessionToken, onCartClick, totalItems, totalPrice, previousTotal }: {
  qrToken: string; sessionToken: string; onCartClick: () => void; totalItems: number; totalPrice: number; previousTotal: number
}) {
  const [waiterCalled, setWaiterCalled] = useState(false)
  const [billRequested, setBillRequested] = useState(false)

  const handleCallWaiter = async () => {
    if (waiterCalled) return
    try {
      await tableApi.callWaiter(qrToken, sessionToken)
      setWaiterCalled(true)
      toast.success('Garson çağrıldı, az sonra gelecek 🔔', { duration: 5000 })
      setTimeout(() => setWaiterCalled(false), 60000)
    } catch {
      toast.error('Bir hata oluştu, tekrar deneyin')
    }
  }

  const handleRequestBill = async () => {
    if (billRequested) return
    try {
      await tableApi.requestBill(qrToken, sessionToken)
      setBillRequested(true)
      toast.success('Hesap isteğiniz iletildi 🧾', { duration: 5000 })
    } catch {
      toast.error('Bir hata oluştu, tekrar deneyin')
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100">
      <div className="flex gap-2 px-4 pt-3 pb-2">
        <button
          onClick={handleCallWaiter}
          disabled={waiterCalled}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95',
            waiterCalled ? 'bg-[#57CF42]/10 border-[#57CF42]/30 text-[#3da32a]' : 'bg-white border-gray-200 text-gray-700'
          )}
        >
          <Bell className="h-4 w-4" />
          {waiterCalled ? 'Çağrıldı ✓' : 'Garson Çağır'}
        </button>
        <button
          onClick={handleRequestBill}
          disabled={billRequested}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95',
            billRequested ? 'bg-[#57CF42]/10 border-[#57CF42]/30 text-[#3da32a]' : 'bg-white border-gray-200 text-gray-700'
          )}
        >
          <Receipt className="h-4 w-4" />
          {billRequested ? 'İstendi ✓' : 'Hesap İste'}
        </button>
      </div>
      {(totalItems > 0 || previousTotal > 0) && (
        <div className="px-4 pb-4 space-y-2">
          {previousTotal > 0 && (
            <button
              onClick={onCartClick}
              className="w-full bg-orange-500 text-white rounded-xl py-2.5 flex items-center justify-between px-5 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span className="text-sm font-semibold">Toplam Hesabınız</span>
              </div>
              <span className="font-black text-base">{formatPrice(previousTotal + totalPrice)}</span>
            </button>
          )}
          {totalItems > 0 && (
            <button
              onClick={onCartClick}
              className="w-full bg-[#57CF42] hover:bg-[#4ab938] text-white rounded-xl py-3.5 flex items-center justify-between px-5 active:scale-[0.98] transition-transform shadow-lg shadow-[#57CF42]/30"
            >
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-lg">{totalItems}</span>
              <span className="font-semibold text-sm">Sepeti Görüntüle & Sipariş Ver</span>
              <span className="font-bold text-sm">{formatPrice(totalPrice)}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Item Detail Modal ───────────────────────────────────────
function ItemDetailModal({ item, onClose, isSimple, isEn }: { item: MenuItem; onClose: () => void; isSimple?: boolean; isEn?: boolean }) {
  const { addItem } = useCartStore()
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<Record<number, MenuItemOption[]>>({})
  const [errors, setErrors] = useState<Record<number, boolean>>({})

  const toggleOption = (group: MenuItemOptionGroup, option: MenuItemOption) => {
    setErrors(prev => ({ ...prev, [group.id]: false }))
    setSelectedOptions(prev => {
      const current = prev[group.id] || []
      if (group.multiSelect) {
        const exists = current.find(o => o.id === option.id)
        return { ...prev, [group.id]: exists ? current.filter(o => o.id !== option.id) : [...current, option] }
      }
      return { ...prev, [group.id]: current.find(o => o.id === option.id) ? [] : [option] }
    })
  }

  const getExtraTotal = () => Object.values(selectedOptions).flat().reduce((s, o) => s + o.additionalPrice, 0)
  const totalPrice = (item.basePrice + getExtraTotal()) * quantity

  const handleAdd = () => {
    const newErrors: Record<number, boolean> = {}
    item.optionGroups.forEach(g => { if (g.required && !(selectedOptions[g.id]?.length > 0)) newErrors[g.id] = true })
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); toast.error('Zorunlu seçenekleri doldurun'); return }
    addItem(item, quantity, Object.values(selectedOptions).flat(), note || undefined)
    toast.success(`${item.name} sepete eklendi`, { icon: '✓' })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto">
        <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-52 object-cover mt-2" />}
        <div className="p-5 space-y-5 pb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-3">
              <h2 className="text-xl font-bold text-gray-900">{isEn && item.nameEn ? item.nameEn : item.name}</h2>
              {(isEn ? (item.descriptionEn || item.description) : item.description) && (
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{isEn ? (item.descriptionEn || item.description) : item.description}</p>
              )}
              {item.campaignActive ? (
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-lg font-bold text-orange-500">{formatPrice(item.campaignPrice!)}</p>
                  <p className="text-sm text-gray-400 line-through">{formatPrice(item.basePrice)}</p>
                  <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Kampanya</span>
                </div>
              ) : (
                <p className="text-lg font-bold text-gray-900 mt-2">{formatPrice(item.basePrice)}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
          </div>

          {item.optionGroups.map(group => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-3">
                <p className="font-bold text-gray-900 text-sm">{group.name}</p>
                <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold', group.required ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-500')}>
                  {group.required ? 'Zorunlu' : 'İsteğe bağlı'}
                </span>
                {errors[group.id] && <span className="text-xs text-red-500 font-semibold ml-auto">⚠ Seçim yapınız</span>}
              </div>
              <div className="space-y-2">
                {group.options.filter(o => o.available).map(option => {
                  const isSelected = !!(selectedOptions[group.id] || []).find(o => o.id === option.id)
                  return (
                    <button key={option.id} onClick={() => toggleOption(group, option)}
                      className={cn('w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all active:scale-[0.98]',
                        isSelected ? 'border-[#57CF42] bg-[#57CF42] text-white' : 'border-gray-100 bg-gray-50 text-gray-800',
                        errors[group.id] && !isSelected && 'border-orange-200'
                      )}>
                      <div className="flex items-center gap-3">
                        <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', isSelected ? 'border-white bg-white' : 'border-gray-300')}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#57CF42]" />}
                        </div>
                        <span className="text-sm font-medium">{option.name}</span>
                      </div>
                      <span className={cn('text-sm font-semibold', isSelected ? 'text-white/80' : 'text-gray-500')}>
                        {option.additionalPrice > 0 ? `+${formatPrice(option.additionalPrice)}` : 'Ücretsiz'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {!isSimple && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 flex-shrink-0">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-90 transition-transform">
                  <Minus className="h-4 w-4 text-gray-700" />
                </button>
                <span className="w-8 text-center font-bold text-gray-900 text-base">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-90 transition-transform">
                  <Plus className="h-4 w-4 text-gray-700" />
                </button>
              </div>
              <button onClick={handleAdd} className="flex-1 bg-[#57CF42] hover:bg-[#4ab938] text-white rounded-2xl py-3.5 font-bold text-sm flex items-center justify-between px-5 active:scale-[0.98] transition-transform shadow-lg shadow-[#57CF42]/30">
                <span>Sepete Ekle</span>
                <span>{formatPrice(totalPrice)}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sipariş durumu renk/etiket haritası (CartScreen + SuccessScreen paylaşır) ──
const STATUS_CONFIG = {
  PENDING:    { label: 'Mutfağa İletildi',          bg: 'bg-blue-50',     text: 'text-blue-600',    dot: 'bg-blue-400',    pulse: true  },
  PREPARING:  { label: 'Hazırlanıyor...',            bg: 'bg-amber-50',    text: 'text-amber-600',   dot: 'bg-amber-400',   pulse: true  },
  READY:      { label: 'Hazır! Servis Geliyor 🎉',   bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500', pulse: true  },
  DELIVERED:  { label: 'Teslim Edildi ✓',           bg: 'bg-gray-50',     text: 'text-gray-500',    dot: 'bg-gray-300',    pulse: false },
  CANCELLED:  { label: 'İptal Edildi',               bg: 'bg-red-50',      text: 'text-red-500',     dot: 'bg-red-300',     pulse: false },
}

// ─── Verdiğiniz Siparişler bloğu ────────────────────────────
function PreviousOrdersBlock({ orders, previousTotal }: { orders: import('@/types').Order[]; previousTotal: number }) {
  const active = orders.filter(o => o.status !== 'CANCELLED')
  if (active.length === 0) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verdiğiniz Siparişler</p>
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs font-bold text-gray-700">{formatPrice(previousTotal)}</span>
      </div>
      {active.map(order => {
        const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING
        return (
          <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className={cn('px-4 py-2 flex items-center gap-2', cfg.bg)}>
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot, cfg.pulse && 'animate-pulse')} />
              <span className={cn('text-xs font-bold', cfg.text)}>{cfg.label}</span>
              <span className="ml-auto text-xs font-semibold text-gray-500">{formatPrice(order.totalAmount)}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.menuItemName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">
                      <span className="text-gray-400 font-medium">{item.quantity}×</span> {item.menuItemName}
                    </p>
                    {item.selectedOptions.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.selectedOptions.map(o => o.optionName).join(' · ')}</p>
                    )}
                    {item.note && <p className="text-xs text-amber-600 mt-0.5">Not: {item.note}</p>}
                  </div>
                  <span className="text-sm font-bold text-gray-700 flex-shrink-0">{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Cart Screen ─────────────────────────────────────────────
function CartScreen({ qrToken, geoProtection, geoLat, geoLng, geoRadius, previousOrders, previousTotal, onBack, onSuccess }: {
  qrToken: string
  geoProtection: boolean
  geoLat?: number
  geoLng?: number
  geoRadius: number
  previousOrders: import('@/types').Order[]
  previousTotal: number
  onBack: () => void
  onSuccess: (orderId: number) => void
}) {
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart, sessionToken } = useCartStore()
  const [orderNote, setOrderNote] = useState('')
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')

  const grandTotal = getTotalPrice() + previousTotal

  const requestGeo = () => {
    setGeoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setGeoStatus('granted')
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }

  const canOrder = !geoProtection || geoStatus === 'granted'

  const orderMutation = useMutation({
    mutationFn: () => menuApi.placeOrder(qrToken, {
      sessionToken: sessionToken!,
      note: orderNote || undefined,
      lat: geoProtection ? userLat ?? undefined : undefined,
      lng: geoProtection ? userLng ?? undefined : undefined,
      items: items.map(item => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        note: item.note,
        selectedOptionIds: item.selectedOptions.map(o => o.id),
      }))
    }),
    onSuccess: (order) => { clearCart(); onSuccess(order.id) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-transform">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900">Sepetim</h1>
        <span className="text-sm text-gray-400 ml-auto">{items.reduce((s, i) => s + i.quantity, 0)} ürün</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col flex-1 p-4 space-y-4">
          {previousOrders.filter(o => o.status !== 'CANCELLED').length > 0 ? (
            <>
              <PreviousOrdersBlock orders={previousOrders} previousTotal={previousTotal} />
              <button onClick={onBack} className="text-gray-900 text-sm font-semibold underline underline-offset-2 text-center">Menüye Dön</button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
                <ShoppingCart className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-500">Sepetiniz boş</p>
              <button onClick={onBack} className="mt-4 text-gray-900 text-sm font-semibold underline underline-offset-2">Menüye Dön</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-52">
            {/* Sepet başlığı */}
            <div className="flex items-center gap-2 pt-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sepetiniz</p>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Sepetteki yeni ürünler — en son eklenen üstte */}
            {[...items].map((cartItem, idx) => ({ cartItem, idx })).reverse().map(({ cartItem, idx }) => {
              const extraTotal = cartItem.selectedOptions.reduce((s, o) => s + o.additionalPrice, 0)
              const itemBase = cartItem.menuItem.campaignActive && cartItem.menuItem.campaignPrice != null
                ? cartItem.menuItem.campaignPrice
                : cartItem.menuItem.basePrice
              const lineTotal = (itemBase + extraTotal) * cartItem.quantity
              return (
                <div key={idx} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="flex items-stretch">
                    {cartItem.menuItem.imageUrl ? (
                      <img
                        src={cartItem.menuItem.imageUrl}
                        alt={cartItem.menuItem.name}
                        className="w-24 h-24 object-cover flex-shrink-0 rounded-l-2xl"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed className="h-7 w-7 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-tight">{cartItem.menuItem.name}</p>
                          {cartItem.selectedOptions.length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{cartItem.selectedOptions.map(o => o.name).join(' · ')}</p>
                          )}
                          {cartItem.note && <p className="text-xs text-amber-600 mt-0.5">Not: {cartItem.note}</p>}
                        </div>
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1.5 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(idx, cartItem.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                          >
                            <Minus className="h-3.5 w-3.5 text-gray-700" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-gray-900">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(idx, cartItem.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                          >
                            <Plus className="h-3.5 w-3.5 text-gray-700" />
                          </button>
                        </div>
                        <p className="font-bold text-gray-900 text-sm">{formatPrice(lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Genel not</p>
              <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="Siparişiniz için genel bir not..." rows={2}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white placeholder:text-gray-300" />
            </div>

            {/* Geçmiş siparişler — sepetten sonra */}
            {previousOrders.filter(o => o.status !== 'CANCELLED').length > 0 && (
              <PreviousOrdersBlock orders={previousOrders} previousTotal={previousTotal} />
            )}
          </div>
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 space-y-3">
            {/* Konum reddedildi — sipariş tamamen engellendi */}
            {geoProtection && geoStatus === 'denied' ? (
              <div className="bg-red-50 rounded-2xl px-4 py-4 border border-red-100 text-center">
                <MapPin className="h-6 w-6 text-red-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-red-700">Sipariş Verilemez</p>
                <p className="text-xs text-red-500 mt-1 leading-relaxed">
                  Bu masa için konum izni zorunludur.<br />
                  Tarayıcı ayarlarından konum iznini açıp sayfayı yenileyin.
                </p>
              </div>
            ) : (
              <>
                {/* Konum izni henüz verilmedi */}
                {geoProtection && geoStatus !== 'granted' && (
                  <div className="bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">Konum erişim izni gerekli</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          Bu masa için sipariş verebilmek amacıyla konumunuz doğrulanır.
                          Konum bilginiz yalnızca sipariş sırasında kullanılır.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={requestGeo}
                      disabled={geoStatus === 'requesting'}
                      className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {geoStatus === 'requesting'
                        ? <><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Konum alınıyor...</>
                        : <><MapPin className="h-4 w-4" />İzin Ver</>}
                    </button>
                  </div>
                )}
                <div className="space-y-1 px-1">
                  {previousTotal > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Bu sipariş</span>
                      <span className="text-sm font-semibold text-gray-600">{formatPrice(getTotalPrice())}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">
                      {previousTotal > 0 ? 'Ödenecek Tutar' : 'Toplam'}
                    </span>
                    <span className="text-xl font-black text-gray-900">{formatPrice(grandTotal)}</span>
                  </div>
                </div>
                <button
                  onClick={() => orderMutation.mutate()}
                  disabled={orderMutation.isPending || !canOrder}
                  className="w-full bg-[#57CF42] hover:bg-[#4ab938] text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 shadow-lg shadow-[#57CF42]/30"
                >
                  {orderMutation.isPending
                    ? <div className="h-5 w-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <><Check className="h-5 w-5" />Siparişi Onayla</>}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Success Screen ─────────────────────────────────────────
// ─── Sipariş durumu takip kartı ─────────────────────────────
function OrderStatusTracker({ qrToken, sessionToken }: { qrToken: string; sessionToken: string }) {
  const { data: orders = [] } = useQuery({
    queryKey: ['my-orders', qrToken],
    queryFn: () => menuApi.getMyOrders(qrToken, sessionToken),
    refetchInterval: (query) => {
      // Tüm siparişler teslim edildiyse polling durdur
      const allDone = (query.state.data ?? []).every(o => o.status === 'DELIVERED' || o.status === 'CANCELLED')
      return allDone ? false : 8_000
    },
    staleTime: 0,
  })

  if (orders.length === 0) return null

  // En "aktif" siparişi öne çıkar: önce READY, sonra PREPARING, sonra PENDING, sonra DELIVERED
  const priority = ['READY', 'PREPARING', 'PENDING', 'DELIVERED', 'CANCELLED']
  const topOrder = [...orders].sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status))[0]
  const cfg = STATUS_CONFIG[topOrder.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING

  return (
    <div className={cn('w-full max-w-sm rounded-2xl px-5 py-4 mb-4 border', cfg.bg,
      topOrder.status === 'READY' ? 'border-emerald-200' :
      topOrder.status === 'PREPARING' || topOrder.status === 'PENDING' ? 'border-amber-200' : 'border-gray-100'
    )}>
      <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Sipariş Durumu</p>
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className={cn('w-3 h-3 rounded-full', cfg.dot)} />
          {cfg.pulse && (
            <div className={cn('absolute inset-0 rounded-full animate-ping opacity-60', cfg.dot)} />
          )}
        </div>
        <p className={cn('font-bold text-base', cfg.text)}>{cfg.label}</p>
      </div>

      {/* Çok sipariş varsa mini liste */}
      {orders.length > 1 && (
        <div className="mt-3 space-y-1.5 border-t border-black/5 pt-3">
          {orders.map(o => {
            const c = STATUS_CONFIG[o.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING
            return (
              <div key={o.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
                  <span className="text-gray-500">{o.items.map(i => `${i.quantity}× ${i.menuItemName}`).join(', ')}</span>
                </div>
                <span className={cn('font-semibold', c.text)}>{c.label.split('!')[0].split('...')[0]}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SuccessScreen({ tableNumber, orderId, qrToken, sessionToken, onBack }: {
  tableNumber: number
  orderId: number | null
  qrToken: string
  sessionToken: string
  onBack: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewDone, setReviewDone] = useState(false)

  const reviewMutation = useMutation({
    mutationFn: () => reviewApi.submit(qrToken, {
      orderId: orderId!,
      sessionToken,
      rating,
      comment: comment.trim() || undefined,
    }),
    onSuccess: () => setReviewDone(true),
    onError: () => setReviewDone(true),
  })

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Check className="h-10 w-10 text-green-600" strokeWidth={2.5} />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Siparişiniz Alındı!</h1>
      <p className="text-gray-500 text-sm mb-5">
        <span className="font-semibold text-gray-700">Masa {tableNumber}</span>'e en kısa sürede getirilecek.
      </p>

      {/* Canlı sipariş durumu */}
      <OrderStatusTracker qrToken={qrToken} sessionToken={sessionToken} />

      {orderId && !reviewDone && (
        <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-5 text-left">
          <p className="font-bold text-gray-900 text-center mb-4">Deneyiminizi değerlendirin</p>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                className="transition-transform active:scale-90"
              >
                <Star className={cn('h-9 w-9 transition-colors', s <= (hovered || rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Yorumunuzu yazın... (isteğe bağlı)"
                rows={2}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-300 mb-3"
              />
              <button
                onClick={() => reviewMutation.mutate()}
                disabled={reviewMutation.isPending}
                className="w-full bg-amber-400 hover:bg-amber-500 text-white font-bold py-3 rounded-2xl text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {reviewMutation.isPending
                  ? <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Star className="h-4 w-4 fill-white" />}
                Değerlendirmeyi Gönder
              </button>
            </>
          )}
        </div>
      )}

      {reviewDone && (
        <div className="w-full max-w-sm bg-amber-50 rounded-3xl p-4 border border-amber-100 mb-5 flex items-center gap-3">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">Değerlendirmeniz için teşekkürler!</p>
        </div>
      )}

      <button onClick={onBack} className="px-8 py-3 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all">
        Menüye Dön
      </button>
    </div>
  )
}

// ─── Flag SVGs ───────────────────────────────────────────────
function FlagTR({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="30" height="20" fill="#E30A17"/>
      <circle cx="10.5" cy="10" r="5" fill="white"/>
      <circle cx="12.5" cy="10" r="4" fill="#E30A17"/>
      <polygon fill="white" points="19,7 19.7,9 21.9,9.1 20.1,10.4 20.8,12.4 19,11.2 17.2,12.4 17.9,10.4 16.1,9.1 18.3,9"/>
    </svg>
  )
}

function FlagGB({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="30" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="white" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 V30 M0,15 H60" stroke="white" strokeWidth="10"/>
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
    </svg>
  )
}
