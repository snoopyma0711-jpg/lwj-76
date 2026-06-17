export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'ready'
  | 'picked_up'
  | 'delayed'
  | 'failed'
  | 'cancelled'
  | 'partial'

export type StockChangeType = 'in' | 'out' | 'adjust'

export interface Store {
  id: string
  name: string
  address: string
  manager: string
  phone: string
}

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  price: number
  image?: string
  description?: string
  warningThreshold: number
}

export interface OrderItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  actualQuantity?: number
  note?: string
}

export interface ContactRecord {
  id: string
  time: string
  type: 'phone' | 'sms' | 'wechat' | 'onsite'
  operator: string
  content: string
}

export interface OrderStatusLog {
  id: string
  status: OrderStatus
  time: string
  operator: string
  remark?: string
}

export interface Order {
  id: string
  orderNo: string
  createdAt: string
  storeId: string
  storeName: string
  items: OrderItem[]
  totalAmount: number
  contactName: string
  contactPhone: string
  scheduledPickupTime: string
  actualPickupTime?: string
  pickupPerson?: string
  pickupPersonIdCard?: string
  status: OrderStatus
  remark?: string
  contactRecords: ContactRecord[]
  statusLogs: OrderStatusLog[]
  operator?: string
}

export interface StoreStock {
  productId: string
  storeId: string
  quantity: number
  lockedQuantity: number
  updatedAt: string
}

export interface StockRecord {
  id: string
  time: string
  productId: string
  productName: string
  storeId: string
  storeName: string
  type: StockChangeType
  quantity: number
  beforeQuantity: number
  afterQuantity: number
  operator: string
  relatedOrderNo?: string
  remark?: string
}

export interface AppState {
  stores: Store[]
  products: Product[]
  orders: Order[]
  stocks: StoreStock[]
  stockRecords: StockRecord[]
  currentUser: {
    name: string
    role: 'manager' | 'staff'
    storeId: string
  }
}

export type AppAction =
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'ADD_STATUS_LOG'; payload: { orderId: string; log: OrderStatusLog } }
  | { type: 'ADD_CONTACT_RECORD'; payload: { orderId: string; record: ContactRecord } }
  | { type: 'UPDATE_STOCK'; payload: StoreStock }
  | { type: 'ADD_STOCK_RECORD'; payload: StockRecord }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'UPDATE_STORE'; payload: Store }
