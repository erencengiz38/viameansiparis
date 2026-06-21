import apiClient from './api-client'
import type {
  LoginResponse, Restaurant, TableItem, Category,
  MenuItem, MenuResponse, Order, Staff, Role,
  WaiterRequest, Review, Analytics, RestaurantSettings,
  TableOverviewResponse, DailyReportResponse
} from '@/types'

// ─── Auth ───────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/api/auth/login', { email, password }).then(r => r.data),
  me: () =>
    apiClient.get<{
      userId: number
      email: string
      fullName: string
      role: string
      restaurants: { id: number; name: string }[]
    }>('/api/auth/me').then(r => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch('/api/auth/change-password', { currentPassword, newPassword }),
}

// ─── Menu (public) ──────────────────────────────
export const menuApi = {
  getByQrToken: (qrToken: string) =>
    apiClient.get<MenuResponse>(`/api/menu/qr/${qrToken}`).then(r => r.data),

  getMyOrders: (qrToken: string, sessionToken: string) =>
    apiClient.get<Order[]>(`/api/orders/table/${qrToken}/my-orders`, { params: { sessionToken } }).then(r => r.data),

  placeOrder: (qrToken: string, body: {
    sessionToken: string
    note?: string
    lat?: number
    lng?: number
    items: { menuItemId: number; quantity: number; note?: string; selectedOptionIds: number[] }[]
  }) => apiClient.post<Order>(`/api/orders/table/${qrToken}`, body).then(r => r.data),
}

// ─── Table Actions (müşteri) ─────────────────────
export const tableApi = {
  callWaiter: (qrToken: string, sessionToken: string) =>
    apiClient.post(`/api/table/${qrToken}/call-waiter`, { sessionToken }).then(r => r.data),
  requestBill: (qrToken: string, sessionToken: string) =>
    apiClient.post(`/api/table/${qrToken}/request-bill`, { sessionToken }).then(r => r.data),
}

// ─── Owner ──────────────────────────────────────
export const ownerApi = {
  // Restoranlar
  getRestaurants: () =>
    apiClient.get<Restaurant[]>('/api/owner/restaurants').then(r => r.data),
  createRestaurant: (data: { name: string; address?: string; phone?: string }) =>
    apiClient.post<Restaurant>('/api/owner/restaurants', data).then(r => r.data),
  updateRestaurant: (id: number, data: { name: string; address?: string; phone?: string }) =>
    apiClient.put<Restaurant>(`/api/owner/restaurants/${id}`, data).then(r => r.data),
  deleteRestaurant: (id: number) =>
    apiClient.delete(`/api/owner/restaurants/${id}`),

  // Masalar
  getTables: (restaurantId: number) =>
    apiClient.get<TableItem[]>(`/api/owner/restaurants/${restaurantId}/tables`).then(r => r.data),
  addTable: (restaurantId: number, tableNumber: number) =>
    apiClient.post<TableItem>(`/api/owner/restaurants/${restaurantId}/tables`, { tableNumber }).then(r => r.data),
  regenerateQr: (restaurantId: number, tableId: number) =>
    apiClient.post<TableItem>(`/api/owner/restaurants/${restaurantId}/tables/${tableId}/regenerate-qr`).then(r => r.data),
  renameTable: (restaurantId: number, tableId: number, tableNumber: number) =>
    apiClient.patch<TableItem>(`/api/owner/restaurants/${restaurantId}/tables/${tableId}/rename`, { tableNumber }).then(r => r.data),
  deactivateTable: (restaurantId: number, tableId: number) =>
    apiClient.delete(`/api/owner/restaurants/${restaurantId}/tables/${tableId}`),
  toggleTableSession: (restaurantId: number, tableId: number) =>
    apiClient.patch<TableItem>(`/api/owner/restaurants/${restaurantId}/tables/${tableId}/toggle-session`).then(r => r.data),
  toggleTableGeo: (restaurantId: number, tableId: number) =>
    apiClient.patch<TableItem>(`/api/owner/restaurants/${restaurantId}/tables/${tableId}/toggle-geo`).then(r => r.data),
  setGeoForAllTables: (restaurantId: number, enable: boolean) =>
    apiClient.patch(`/api/owner/restaurants/${restaurantId}/tables/geo-all?enable=${enable}`),
  bulkCreateTables: (restaurantId: number, upTo: number) =>
    apiClient.post<TableItem[]>(`/api/owner/restaurants/${restaurantId}/tables/bulk`, { upTo }).then(r => r.data),

  // Kategoriler
  getRestaurant: (restaurantId: number) =>
    apiClient.get<Restaurant>(`/api/owner/restaurants/${restaurantId}`).then(r => r.data),
  getCategories: (restaurantId: number) =>
    apiClient.get<Category[]>(`/api/owner/restaurants/${restaurantId}/categories`).then(r => r.data),
  createCategory: (restaurantId: number, data: { name: string; nameEn?: string; imageUrl?: string; displayOrder: number }) =>
    apiClient.post<Category>(`/api/owner/restaurants/${restaurantId}/categories`, data).then(r => r.data),
  deleteCategory: (restaurantId: number, categoryId: number) =>
    apiClient.delete(`/api/owner/restaurants/${restaurantId}/categories/${categoryId}`),
  reorderCategories: (restaurantId: number, orders: { id: number; displayOrder: number }[]) =>
    apiClient.patch(`/api/owner/restaurants/${restaurantId}/categories/reorder`, orders),
  reorderMenuItems: (restaurantId: number, orders: { id: number; displayOrder: number }[]) =>
    apiClient.patch(`/api/owner/restaurants/${restaurantId}/menu-items/reorder`, orders),

  // Menü kalemleri
  getMenuItems: (restaurantId: number) =>
    apiClient.get<MenuItem[]>(`/api/owner/restaurants/${restaurantId}/menu-items`).then(r => r.data),
  createMenuItem: (restaurantId: number, data: unknown) =>
    apiClient.post<MenuItem>(`/api/owner/restaurants/${restaurantId}/menu-items`, data).then(r => r.data),
  updateMenuItem: (restaurantId: number, itemId: number, data: unknown) =>
    apiClient.put<MenuItem>(`/api/owner/restaurants/${restaurantId}/menu-items/${itemId}`, data).then(r => r.data),
  toggleAvailability: (restaurantId: number, itemId: number) =>
    apiClient.patch(`/api/owner/restaurants/${restaurantId}/menu-items/${itemId}/toggle-availability`),
  deleteMenuItem: (restaurantId: number, itemId: number) =>
    apiClient.delete(`/api/owner/restaurants/${restaurantId}/menu-items/${itemId}`),

  // Personel
  getStaff: (restaurantId: number) =>
    apiClient.get<Staff[]>(`/api/owner/restaurants/${restaurantId}/staff`).then(r => r.data),
  createStaff: (restaurantId: number, data: { email: string; password: string; fullName: string; role: 'CHEF' | 'WAITER' | 'CASHIER' }) =>
    apiClient.post<Staff>(`/api/owner/restaurants/${restaurantId}/staff`, data).then(r => r.data),
  removeStaff: (restaurantId: number, userId: number) =>
    apiClient.delete(`/api/owner/restaurants/${restaurantId}/staff/${userId}`),

  // Siparişler
  getOrders: (restaurantId: number) =>
    apiClient.get<Order[]>(`/api/owner/restaurants/${restaurantId}/orders`).then(r => r.data),
  cancelOrder: (restaurantId: number, orderId: number) =>
    apiClient.patch<Order>(`/api/owner/restaurants/${restaurantId}/orders/${orderId}/cancel`).then(r => r.data),

  // Aktif masa özeti & sipariş detayı
  getTablesOverview: (restaurantId: number) =>
    apiClient.get<import('@/types').TableOverviewResponse[]>(`/api/owner/restaurants/${restaurantId}/tables/overview`).then(r => r.data),
  getTableOrders: (restaurantId: number, tableId: number) =>
    apiClient.get<Order[]>(`/api/owner/restaurants/${restaurantId}/tables/${tableId}/orders`).then(r => r.data),
}

// ─── Image Upload ────────────────────────────────
export const imageApi = {
  upload: (restaurantId: number, file: File, context: string = 'item') => {
    const form = new FormData()
    form.append('file', file)
    form.append('context', context)
    return apiClient.post<{ url: string; filename: string }>(
      `/api/owner/restaurants/${restaurantId}/images`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data)
  }
}

// ─── Chef ───────────────────────────────────────
export const chefApi = {
  getActiveOrders: (restaurantId: number) =>
    apiClient.get<Order[]>(`/api/chef/restaurants/${restaurantId}/orders/active`).then(r => r.data),
  markPreparing: (restaurantId: number, orderId: number) =>
    apiClient.patch<Order>(`/api/chef/restaurants/${restaurantId}/orders/${orderId}/preparing`).then(r => r.data),
  markReady: (restaurantId: number, orderId: number) =>
    apiClient.patch<Order>(`/api/chef/restaurants/${restaurantId}/orders/${orderId}/ready`).then(r => r.data),
  getMenuItems: (restaurantId: number) =>
    apiClient.get<MenuItem[]>(`/api/chef/restaurants/${restaurantId}/menu-items`).then(r => r.data),
  toggleAvailability: (restaurantId: number, itemId: number) =>
    apiClient.patch(`/api/chef/restaurants/${restaurantId}/menu-items/${itemId}/toggle-availability`),
}

// ─── Waiter ─────────────────────────────────────
export const waiterApi = {
  getPreparingOrders: (restaurantId: number) =>
    apiClient.get<Order[]>(`/api/waiter/restaurants/${restaurantId}/orders/preparing`).then(r => r.data),
  getReadyOrders: (restaurantId: number) =>
    apiClient.get<Order[]>(`/api/waiter/restaurants/${restaurantId}/orders/ready`).then(r => r.data),
  markDelivered: (restaurantId: number, orderId: number) =>
    apiClient.patch<Order>(`/api/waiter/restaurants/${restaurantId}/orders/${orderId}/delivered`).then(r => r.data),
  getTables: (restaurantId: number) =>
    apiClient.get<TableItem[]>(`/api/waiter/restaurants/${restaurantId}/tables`).then(r => r.data),
  getPendingRequests: (restaurantId: number) =>
    apiClient.get<WaiterRequest[]>(`/api/waiter/restaurants/${restaurantId}/requests`).then(r => r.data),
  claimRequest: (restaurantId: number, requestId: number) =>
    apiClient.patch(`/api/waiter/restaurants/${restaurantId}/requests/${requestId}/claim`).then(r => r.data),
  getMenuItems: (restaurantId: number) =>
    apiClient.get<MenuItem[]>(`/api/waiter/restaurants/${restaurantId}/menu-items`).then(r => r.data),
  getTableDailyOrders: (restaurantId: number, tableNumber: number) =>
    apiClient.get<Order[]>(`/api/waiter/restaurants/${restaurantId}/tables/${tableNumber}/daily-orders`).then(r => r.data),
  getTablesOverview: (restaurantId: number) =>
    apiClient.get<TableOverviewResponse[]>(`/api/waiter/restaurants/${restaurantId}/tables/overview`).then(r => r.data),
}

// ─── Cashier ────────────────────────────────────
export const cashierApi = {
  getTables: (restaurantId: number) =>
    apiClient.get<TableItem[]>(`/api/cashier/restaurants/${restaurantId}/tables`).then(r => r.data),
  getTableOrders: (restaurantId: number, tableId: number) =>
    apiClient.get<Order[]>(`/api/cashier/restaurants/${restaurantId}/tables/${tableId}/orders`).then(r => r.data),
  checkout: (restaurantId: number, tableId: number) =>
    apiClient.post(`/api/cashier/restaurants/${restaurantId}/tables/${tableId}/checkout`).then(r => r.data),
  getDailyReport: (restaurantId: number) =>
    apiClient.get<DailyReportResponse>(`/api/cashier/restaurants/${restaurantId}/daily-report`).then(r => r.data),
}

// ─── Reviews ────────────────────────────────────
export const reviewApi = {
  submit: (qrToken: string, data: { orderId: number; sessionToken: string; rating: number; comment?: string }) =>
    apiClient.post<Review>(`/api/menu/qr/${qrToken}/review`, data).then(r => r.data),
  getRestaurantReviews: (restaurantId: number) =>
    apiClient.get<Review[]>(`/api/owner/restaurants/${restaurantId}/reviews`).then(r => r.data),
}

// ─── Analytics ──────────────────────────────────
export const analyticsApi = {
  get: (restaurantId: number) =>
    apiClient.get<Analytics>(`/api/owner/restaurants/${restaurantId}/analytics`).then(r => r.data),
}

// ─── Settings ───────────────────────────────────
export const settingsApi = {
  get: (restaurantId: number) =>
    apiClient.get<RestaurantSettings>(`/api/owner/restaurants/${restaurantId}/settings`).then(r => r.data),
  update: (restaurantId: number, data: Partial<RestaurantSettings>) =>
    apiClient.put<RestaurantSettings>(`/api/owner/restaurants/${restaurantId}/settings`, data).then(r => r.data),
}

// ─── Admin ──────────────────────────────────────
export const adminApi = {
  getOwners: () =>
    apiClient.get<Staff[]>('/api/admin/owners').then(r => r.data),
  createOwner: (data: { email: string; password: string; fullName: string }) =>
    apiClient.post<Staff>('/api/admin/owners', data).then(r => r.data),
  getAllRestaurants: () =>
    apiClient.get<Restaurant[]>('/api/admin/restaurants').then(r => r.data),
  setRestaurantPlan: (restaurantId: number, planType: 'SIMPLE' | 'FULL') =>
    apiClient.patch<Restaurant>(`/api/admin/restaurants/${restaurantId}/plan`, null, { params: { planType } }).then(r => r.data),
  transferRestaurantOwner: (restaurantId: number, toOwnerId: number) =>
    apiClient.patch<Restaurant>(`/api/admin/restaurants/${restaurantId}/transfer-owner`, null, { params: { toOwnerId } }).then(r => r.data),
  deactivateUser: (userId: number) =>
    apiClient.patch(`/api/admin/users/${userId}/deactivate`),
  activateUser: (userId: number) =>
    apiClient.patch(`/api/admin/users/${userId}/activate`),
  impersonate: (userId: number) =>
    apiClient.post<LoginResponse>(`/api/admin/impersonate/${userId}`).then(r => r.data),
  getMenuItems: (restaurantId: number) =>
    apiClient.get<MenuItem[]>(`/api/admin/restaurants/${restaurantId}/menu-items`).then(r => r.data),
  getStaff: (restaurantId: number) =>
    apiClient.get<Staff[]>(`/api/admin/restaurants/${restaurantId}/staff`).then(r => r.data),
  getOrders: (restaurantId: number) =>
    apiClient.get<Order[]>(`/api/admin/restaurants/${restaurantId}/orders`).then(r => r.data),
}
