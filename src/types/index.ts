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

export type InventoryCheckStatus = 'pending' | 'checking' | 'pending_confirm' | 'completed' | 'cancelled'
export type InventoryCheckScope = 'full' | 'category' | 'partial'
export type DiscrepancyHandleStatus = 'pending' | 'handled'
export type ReviewStatus = 'pending_review' | 'review_passed' | 'review_rejected'

export interface ReviewInfo {
  reviewer: string
  reviewTime: string
  reviewConclusion: 'passed' | 'rejected'
  reviewRemark: string
  rejectReason?: string
}

export interface ReviewLog {
  id: string
  reviewer: string
  reviewTime: string
  reviewConclusion: 'passed' | 'rejected'
  reviewRemark: string
  rejectReason?: string
}

export interface InventoryCheckItem {
  productId: string
  productName: string
  sku: string
  systemQuantity: number
  actualQuantity: number | null
  unit: string
}

export interface InventoryCheckDiscrepancy {
  productId: string
  productName: string
  sku: string
  systemQuantity: number
  actualQuantity: number
  difference: number
  unit: string
  handleStatus: DiscrepancyHandleStatus
  handleReason?: string
  handleOperator?: string
  handleTime?: string
}

export interface InventoryCheckStatusLog {
  id: string
  status: InventoryCheckStatus
  time: string
  operator: string
  remark?: string
}

export interface InventoryCheck {
  id: string
  checkNo: string
  storeId: string
  storeName: string
  scope: InventoryCheckScope
  scopeCategory?: string
  scheduledTime: string
  startedTime?: string
  completedTime?: string
  items: InventoryCheckItem[]
  discrepancies: InventoryCheckDiscrepancy[]
  status: InventoryCheckStatus
  cancelReason?: string
  statusLogs: InventoryCheckStatusLog[]
  createdAt: string
  createdBy: string
  operator?: string
  remark?: string
  reviewStatus?: ReviewStatus
  reviewInfo?: ReviewInfo
  reviewLogs: ReviewLog[]
  submittedForReviewTime?: string
}

export type PurchaseStatus =
  | 'pending_approval'
  | 'approved'
  | 'pending_order'
  | 'ordered'
  | 'pending_arrival'
  | 'partial_arrival'
  | 'completed'
  | 'cancelled'

export type ReconciliationStatus = 'pending_reconciliation' | 'reconciled'
export type PaymentStatus = 'pending_payment' | 'partial_payment' | 'paid'
export type PaymentMethod = 'bank_transfer' | 'alipay' | 'wechat' | 'cash' | 'other'

export interface Supplier {
  id: string
  name: string
  contact: string
  phone: string
  address: string
  category: string
  remark?: string
}

export interface PurchaseItem {
  id: string
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  receivedQuantity: number
  unit: string
}

export interface PurchaseReceiveItem {
  id: string
  purchaseItemId: string
  productId: string
  productName: string
  sku: string
  quantity: number
  unit: string
  receivedTime: string
  differenceReason?: string
}

export interface PurchaseStatusLog {
  id: string
  status: PurchaseStatus
  time: string
  operator: string
  remark?: string
}

export interface PaymentRecord {
  id: string
  purchaseId: string
  purchaseNo: string
  amount: number
  paymentTime: string
  paymentMethod: PaymentMethod
  operator: string
  remark?: string
}

export interface Purchase {
  id: string
  purchaseNo: string
  supplierId: string
  supplierName: string
  storeId: string
  storeName: string
  items: PurchaseItem[]
  receiveItems: PurchaseReceiveItem[]
  totalAmount: number
  expectedArrivalTime: string
  actualArrivalTime?: string
  reason: string
  status: PurchaseStatus
  cancelReason?: string
  rejectReason?: string
  statusLogs: PurchaseStatusLog[]
  reconciliationStatus: ReconciliationStatus
  paymentStatus: PaymentStatus
  paidAmount: number
  paymentRecords: PaymentRecord[]
  reconciliationTime?: string
  createdAt: string
  createdBy: string
  operator?: string
}

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
  cancelReason?: string
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
  transfers: Transfer[]
  suppliers: Supplier[]
  purchases: Purchase[]
  inventoryChecks: InventoryCheck[]
  currentUser: {
    name: string
    role: 'manager' | 'staff'
    storeId: string
  }
}

export type TransferType = 'replenish' | 'transfer'
export type TransferStatus =
  | 'pending'
  | 'approved'
  | 'outbound'
  | 'in_transit'
  | 'inbound'
  | 'completed'
  | 'rejected'

export interface TransferItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  actualOutboundQuantity?: number
  actualInboundQuantity?: number
}

export interface TransferStatusLog {
  id: string
  status: TransferStatus
  time: string
  operator: string
  remark?: string
}

export interface Transfer {
  id: string
  transferNo: string
  type: TransferType
  fromStoreId: string
  fromStoreName: string
  toStoreId: string
  toStoreName: string
  items: TransferItem[]
  totalAmount: number
  expectedArrivalTime?: string
  actualOutboundTime?: string
  actualInboundTime?: string
  reason: string
  status: TransferStatus
  rejectReason?: string
  statusLogs: TransferStatusLog[]
  createdAt: string
  createdBy: string
  operator?: string
}

export type AppAction =
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_STOCKS'; payload: StoreStock[] }
  | { type: 'SET_STORES'; payload: Store[] }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_STOCK_RECORDS'; payload: StockRecord[] }
  | { type: 'SET_TRANSFERS'; payload: Transfer[] }
  | { type: 'SET_SUPPLIERS'; payload: Supplier[] }
  | { type: 'SET_PURCHASES'; payload: Purchase[] }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'ADD_STATUS_LOG'; payload: { orderId: string; log: OrderStatusLog } }
  | { type: 'ADD_CONTACT_RECORD'; payload: { orderId: string; record: ContactRecord } }
  | { type: 'UPDATE_STOCK'; payload: StoreStock }
  | { type: 'ADD_STOCK_RECORD'; payload: StockRecord }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'UPDATE_STORE'; payload: Store }
  | { type: 'ADD_TRANSFER'; payload: Transfer }
  | { type: 'UPDATE_TRANSFER'; payload: Transfer }
  | { type: 'ADD_PURCHASE'; payload: Purchase }
  | { type: 'UPDATE_PURCHASE'; payload: Purchase }
  | { type: 'SET_INVENTORY_CHECKS'; payload: InventoryCheck[] }
  | { type: 'ADD_INVENTORY_CHECK'; payload: InventoryCheck }
  | { type: 'UPDATE_INVENTORY_CHECK'; payload: InventoryCheck }
