import { create } from 'zustand'
import type { CartItem, MenuItem, MenuItemOption } from '@/types'

interface CartState {
  items: CartItem[]
  qrToken: string | null
  sessionToken: string | null
  restaurantName: string | null
  tableNumber: number | null
  addItem: (menuItem: MenuItem, quantity: number, selectedOptions: MenuItemOption[], note?: string) => void
  removeItem: (index: number) => void
  updateQuantity: (index: number, quantity: number) => void
  clearCart: () => void
  setContext: (qrToken: string, restaurantName: string, tableNumber: number, sessionToken: string) => void
  setSessionToken: (token: string) => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  qrToken: null,
  sessionToken: null,
  restaurantName: null,
  tableNumber: null,

  addItem: (menuItem, quantity, selectedOptions, note) => {
    set((state) => ({
      items: [...state.items, { menuItem, quantity, selectedOptions, note }]
    }))
  },

  removeItem: (index) => {
    set((state) => ({
      items: state.items.filter((_, i) => i !== index)
    }))
  },

  updateQuantity: (index, quantity) => {
    if (quantity <= 0) { get().removeItem(index); return }
    set((state) => ({
      items: state.items.map((item, i) => i === index ? { ...item, quantity } : item)
    }))
  },

  clearCart: () => set({ items: [] }),

  setContext: (qrToken, restaurantName, tableNumber, sessionToken) =>
    set({ qrToken, restaurantName, tableNumber, sessionToken }),

  setSessionToken: (token) => set({ sessionToken: token }),

  getTotalPrice: () => {
    return get().items.reduce((total, item) => {
      const base = item.menuItem.campaignActive && item.menuItem.campaignPrice != null
        ? item.menuItem.campaignPrice
        : item.menuItem.basePrice
      const optionsTotal = item.selectedOptions.reduce((sum, opt) => sum + opt.additionalPrice, 0)
      return total + (base + optionsTotal) * item.quantity
    }, 0)
  },

  getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}))
