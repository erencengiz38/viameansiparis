export type Role = 'ADMIN' | 'OWNER' | 'CHEF' | 'WAITER' | 'CASHIER'
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'

export interface LoginResponse {
  accessToken: string
  tokenType: string
  userId: number
  fullName: string
  role: Role
}

export type PlanType = 'SIMPLE' | 'FULL'

export interface Restaurant {
  id: number
  name: string
  address?: string
  phone?: string
  active: boolean
  planType?: PlanType
}

export interface TableItem {
  id: number
  tableNumber: number
  qrToken: string
  qrImageUrl: string
  active: boolean
  sessionOpen: boolean
  geoProtection: boolean
}

export interface Category {
  id: number
  name: string
  nameEn?: string
  imageUrl?: string
  displayOrder: number
  active: boolean
}

export interface MenuItemOption {
  id: number
  name: string
  additionalPrice: number
  available: boolean
  displayOrder: number
}

export interface MenuItemOptionGroup {
  id: number
  name: string
  required: boolean
  multiSelect: boolean
  displayOrder: number
  options: MenuItemOption[]
}

export interface MenuItem {
  id: number
  name: string
  nameEn?: string
  description?: string
  descriptionEn?: string
  basePrice: number
  campaignPrice?: number
  campaignEndsAt?: string
  campaignActive?: boolean
  categoryId?: number
  categoryName?: string
  imageUrl?: string
  available: boolean
  displayOrder: number
  optionGroups: MenuItemOptionGroup[]
}

export interface MenuResponse {
  restaurantId: number
  restaurantName: string
  tableNumber: number
  sessionToken: string
  geoProtection: boolean
  geoLat?: number
  geoLng?: number
  geoRadius: number
  planType: PlanType
  categories: {
    id: number
    name: string
    nameEn?: string
    imageUrl?: string
    displayOrder: number
    items: MenuItem[]
  }[]
}

export interface SelectedOption {
  optionId: number
  groupName: string
  optionName: string
  additionalPrice: number
}

export interface OrderItemResponse {
  id: number
  menuItemId: number
  menuItemName: string
  imageUrl?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  note?: string
  selectedOptions: SelectedOption[]
}

export interface Order {
  id: number
  restaurantId: number
  tableId: number
  tableNumber: number
  status: OrderStatus
  note?: string
  totalAmount: number
  createdAt: string
  updatedAt: string
  items: OrderItemResponse[]
}

export interface Staff {
  userId: number
  email: string
  fullName: string
  role: Role
  active: boolean
}

// Cart types (frontend only)
export interface CartItem {
  menuItem: MenuItem
  quantity: number
  note?: string
  selectedOptions: MenuItemOption[]
}

export type WaiterRequestType = 'CALL_WAITER' | 'REQUEST_BILL'
export type WaiterRequestStatus = 'PENDING' | 'CLAIMED' | 'EXPIRED'

export interface WaiterRequest {
  id: number
  restaurantId: number
  tableId: number
  tableNumber: number
  type: WaiterRequestType
  status: WaiterRequestStatus
  claimedByName?: string
  expiresAt: number  // epoch millis
  createdAt: string
}

export interface Review {
  id: number
  restaurantId: number
  orderId?: number
  rating: number
  comment?: string
  createdAt: string
}

export interface Analytics {
  monthRevenue: number
  prevMonthRevenue: number
  monthOrderCount: number
  prevMonthOrderCount: number
  avgOrderValue: number
  avgRating: number
  reviewCount: number
  topItems: { menuItemId: number; name: string; orderCount: number; totalRevenue: number }[]
  waiterStats: { userId: number; name: string; deliveredCount: number }[]
}

export interface RestaurantSettings {
  id: number
  name: string
  address?: string
  phone?: string
  logoUrl?: string
  currency: string
  reviewsEnabled: boolean
  geoLat?: number
  geoLng?: number
  geoRadiusMeters: number
}

export interface TableOverviewResponse {
  tableId: number
  tableNumber: number
  sessionOpen: boolean
  activeOrderCount: number
  activeTotal: number
  lastOrderAt: string | null
}

export interface DailyReportResponse {
  totalRevenue: number
  totalOrders: number
  tables: { tableNumber: number; orderCount: number; total: number }[]
}
