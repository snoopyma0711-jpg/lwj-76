import type { Order, OrderStatus, Store, Product, StoreStock, StockRecord } from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
const OPERATOR_NAME = '张店长'

interface ApiResult<T = any> {
  success: boolean
  message: string
  data?: T
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-operator': OPERATOR_NAME,
    ...(options.headers as Record<string, string> || {}),
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
    const data = await res.json() as ApiResult<T>
    return data
  } catch (err: any) {
    return { success: false, message: `网络请求失败: ${err?.message || err}` }
  }
}

export const api = {
  health: () => request('/health'),

  getStores: () => request<Store[]>('/stores'),
  getProducts: (params?: { category?: string; keyword?: string }) => {
    const qs = new URLSearchParams()
    if (params?.category) qs.set('category', params.category)
    if (params?.keyword) qs.set('keyword', params.keyword)
    return request<Product[]>(`/products${qs.toString() ? '?' + qs.toString() : ''}`)
  },

  getOrders: (params?: {
    keyword?: string
    status?: OrderStatus | '' | 'overdue'
    storeId?: string
    startDate?: string
    endDate?: string
  }) => {
    const qs = new URLSearchParams()
    if (params?.keyword) qs.set('keyword', params.keyword)
    if (params?.status) qs.set('status', params.status)
    if (params?.storeId) qs.set('storeId', params.storeId)
    if (params?.startDate) qs.set('startDate', params.startDate)
    if (params?.endDate) qs.set('endDate', params.endDate)
    return request<Order[]>(`/orders${qs.toString() ? '?' + qs.toString() : ''}`)
  },
  getOrderById: (id: string) => request<Order>(`/orders/${id}`),
  getOrderByNo: (orderNo: string) => request<Order>(`/orders/by-no/${encodeURIComponent(orderNo)}`),
  createOrder: (data: {
    storeId: string
    items: { productId: string; quantity: number }[]
    contactName: string
    contactPhone: string
    scheduledPickupTime: string
    remark?: string
  }) => request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateOrderInfo: (orderId: string, data: {
    contactName?: string
    contactPhone?: string
    scheduledPickupTime?: string
    remark?: string
  }) => request(`/orders/${orderId}/info`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateOrderRemark: (orderId: string, remark: string) => request(`/orders/${orderId}/remark`, {
    method: 'PUT',
    body: JSON.stringify({ remark }),
  }),
  addContactRecord: (orderId: string, data: {
    type: 'phone' | 'sms' | 'wechat' | 'onsite'
    content: string
  }) => request(`/orders/${orderId}/contact`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  processOrderDelay: (orderId: string, data: {
    newScheduledTime: string
    remark?: string
  }) => request(`/orders/${orderId}/delay`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  processOrderFailed: (orderId: string, data: { remark?: string }) => request(`/orders/${orderId}/failed`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  cancelOrder: (orderId: string, reason: string) => request(`/orders/${orderId}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  }),
  completeOrderPickup: (orderId: string, data: {
    pickupPerson: string
    pickupPersonIdCard?: string
    itemsActual: { productId: string; actualQuantity: number }[]
  }) => request(`/orders/${orderId}/pickup`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getStocks: (params?: { storeId?: string; productId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.storeId) qs.set('storeId', params.storeId)
    if (params?.productId) qs.set('productId', params.productId)
    return request<(StoreStock & { productName: string; sku: string; category: string; unit: string; price: number; warningThreshold: number; storeName: string })[]>(`/stocks${qs.toString() ? '?' + qs.toString() : ''}`)
  },
  getStockRecords: (params?: { storeId?: string; productId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.storeId) qs.set('storeId', params.storeId)
    if (params?.productId) qs.set('productId', params.productId)
    return request<StockRecord[]>(`/stock-records${qs.toString() ? '?' + qs.toString() : ''}`)
  },
  processStockIn: (data: {
    productId: string
    storeId: string
    quantity: number
    remark?: string
  }) => request('/stocks/in', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  processStockAdjust: (data: {
    productId: string
    storeId: string
    quantity: number
    remark?: string
  }) => request('/stocks/adjust', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getStatsSummary: () => request<{
    todayNew: number
    pending: number
    overdue: number
    completedToday: number
    warningCount: number
    storeStats: Array<Store & { completed: number; total: number; completionRate: number; pendingCount: number }>
    trend: Array<{ date: string; newOrders: number; completed: number }>
  }>('/stats/summary'),
}
