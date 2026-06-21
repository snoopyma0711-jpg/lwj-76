import type { Database, Order, OrderStatus, OrderItem, StoreStock, StockRecord, Transfer, TransferType, TransferStatus, TransferItem, Supplier, Purchase, PurchaseStatus, PurchaseItem, PurchaseReceiveItem, PaymentRecord, PaymentMethod, ReconciliationStatus, PaymentStatus } from './types'
import { createMockDatabase } from './mockData'
import { nowStr, generateOrderNo, isValidPhone, orderStatusMap, generateTransferNo, transferStatusMap, generatePurchaseNo, purchaseStatusMap } from './utils'
import { v4 as uuidv4 } from 'uuid'

const db: Database = createMockDatabase()

export function getDb(): Database {
  return db
}

export function getStores() {
  return db.stores
}

export function getProducts(category?: string, keyword?: string) {
  let list = db.products.slice()
  if (category) list = list.filter((p) => p.category === category)
  if (keyword) {
    const kw = keyword.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(kw) || p.sku.toLowerCase().includes(kw))
  }
  return list
}

export function getStocks(storeId?: string, productId?: string) {
  let list = db.stocks.slice()
  if (storeId) list = list.filter((s) => s.storeId === storeId)
  if (productId) list = list.filter((s) => s.productId === productId)
  return list.map((s) => {
    const product = db.products.find((p) => p.id === s.productId)
    const store = db.stores.find((st) => st.id === s.storeId)
    return {
      ...s,
      productName: product?.name || '',
      sku: product?.sku || '',
      category: product?.category || '',
      unit: product?.unit || '',
      price: product?.price || 0,
      warningThreshold: product?.warningThreshold || 0,
      storeName: store?.name || '',
    }
  })
}

export function getStockRecords(storeId?: string, productId?: string) {
  let list = db.stockRecords.slice()
  if (storeId) list = list.filter((r) => r.storeId === storeId)
  if (productId) list = list.filter((r) => r.productId === productId)
  return list.sort((a, b) => (a.time < b.time ? 1 : -1))
}

export function getOrders(params?: {
  keyword?: string
  status?: OrderStatus | '' | 'overdue'
  storeId?: string
  startDate?: string
  endDate?: string
}) {
  let list = db.orders.slice()
  if (params?.keyword?.trim()) {
    const kw = params.keyword.trim().toLowerCase()
    list = list.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(kw) ||
        o.contactName.toLowerCase().includes(kw) ||
        o.contactPhone.includes(kw) ||
        o.items.some((it) => it.productName.toLowerCase().includes(kw) || it.sku.toLowerCase().includes(kw)),
    )
  }
  if (params?.status) {
    if (params.status === 'overdue') {
      list = list.filter(
        (o) =>
          ['pending', 'confirmed', 'ready', 'delayed'].includes(o.status) &&
          new Date(o.scheduledPickupTime).getTime() < Date.now(),
      )
    } else {
      list = list.filter((o) => o.status === params.status)
    }
  }
  if (params?.storeId) list = list.filter((o) => o.storeId === params.storeId)
  if (params?.startDate) list = list.filter((o) => o.createdAt.slice(0, 10) >= params.startDate!)
  if (params?.endDate) list = list.filter((o) => o.createdAt.slice(0, 10) <= params.endDate!)
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getOrderById(id: string): Order | undefined {
  return db.orders.find((o) => o.id === id)
}

export function getOrderByNo(orderNo: string): Order | undefined {
  return db.orders.find((o) => o.orderNo === orderNo)
}

export interface CreateOrderParams {
  storeId: string
  items: { productId: string; quantity: number }[]
  contactName: string
  contactPhone: string
  scheduledPickupTime: string
  remark?: string
  operator?: string
}

export function createOrder(params: CreateOrderParams): { success: boolean; message: string; data?: Order } {
  const { storeId, items, contactName, contactPhone, scheduledPickupTime, remark, operator = '系统' } = params
  if (!storeId) return { success: false, message: '请选择门店' }
  const store = db.stores.find((s) => s.id === storeId)
  if (!store) return { success: false, message: '门店不存在' }
  if (!items || items.length === 0) return { success: false, message: '请添加至少一个商品' }
  if (!contactName.trim()) return { success: false, message: '请输入联系人姓名' }
  if (contactName.length > 20) return { success: false, message: '联系人姓名过长（最多20字）' }
  if (!contactPhone.trim()) return { success: false, message: '请输入联系电话' }
  if (!isValidPhone(contactPhone)) return { success: false, message: '请输入正确的手机号' }
  if (!scheduledPickupTime) return { success: false, message: '请选择约定自提时间' }
  if (new Date(scheduledPickupTime).getTime() < Date.now()) {
    return { success: false, message: '约定自提时间不能早于当前时间' }
  }

  const orderItems: OrderItem[] = []
  let totalAmount = 0
  for (const it of items) {
    if (!it.quantity || it.quantity <= 0) return { success: false, message: '商品数量必须大于0' }
    const product = db.products.find((p) => p.id === it.productId)
    if (!product) return { success: false, message: '商品不存在' }
    const stock = db.stocks.find((s) => s.productId === it.productId && s.storeId === storeId)
    const availableQty = stock ? stock.quantity - stock.lockedQuantity : 0
    if (it.quantity > availableQty) {
      return { success: false, message: `商品「${product.name}」库存不足，当前可用${availableQty}件` }
    }
    orderItems.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: it.quantity,
      unitPrice: product.price,
    })
    totalAmount += product.price * it.quantity
  }

  const time = nowStr()
  const order: Order = {
    id: uuidv4(),
    orderNo: generateOrderNo(db.orders.length),
    createdAt: time,
    storeId,
    storeName: store.name,
    items: orderItems,
    totalAmount: Math.round(totalAmount * 100) / 100,
    contactName: contactName.trim(),
    contactPhone: contactPhone.trim(),
    scheduledPickupTime,
    status: 'pending',
    remark: remark?.trim() || undefined,
    contactRecords: [],
    statusLogs: [
      {
        id: uuidv4(),
        status: 'pending',
        time,
        operator,
        remark: '订单已创建，待确认',
      },
    ],
    operator,
  }
  db.orders.unshift(order)
  return { success: true, message: '订单创建成功', data: order }
}

export interface UpdateOrderInfoParams {
  orderId: string
  contactName?: string
  contactPhone?: string
  scheduledPickupTime?: string
  remark?: string
  operator?: string
}

export function updateOrderInfo(params: UpdateOrderInfoParams): { success: boolean; message: string } {
  const order = db.orders.find((o) => o.id === params.orderId)
  if (!order) return { success: false, message: '订单不存在' }
  if (['picked_up', 'cancelled', 'failed'].includes(order.status)) {
    return { success: false, message: `订单状态为「${orderStatusMap[order.status].label}」，无法修改` }
  }
  const changes: Partial<Order> = {}
  if (params.contactName !== undefined) {
    if (!params.contactName.trim()) return { success: false, message: '联系人姓名不能为空' }
    if (params.contactName.length > 20) return { success: false, message: '联系人姓名过长（最多20字）' }
    changes.contactName = params.contactName.trim()
  }
  if (params.contactPhone !== undefined) {
    if (!params.contactPhone.trim()) return { success: false, message: '联系电话不能为空' }
    if (!isValidPhone(params.contactPhone)) return { success: false, message: '请输入正确的手机号' }
    changes.contactPhone = params.contactPhone.trim()
  }
  if (params.scheduledPickupTime !== undefined) {
    if (!params.scheduledPickupTime) return { success: false, message: '约定自提时间不能为空' }
    if (new Date(params.scheduledPickupTime).getTime() < Date.now()) {
      return { success: false, message: '约定自提时间不能早于当前时间' }
    }
    changes.scheduledPickupTime = params.scheduledPickupTime
  }
  if (params.remark !== undefined) {
    if (params.remark.length > 500) return { success: false, message: '备注不能超过500字' }
    changes.remark = params.remark.trim() || undefined
  }
  if (Object.keys(changes).length === 0) return { success: false, message: '没有需要保存的修改' }

  const time = nowStr()
  const idx = db.orders.findIndex((o) => o.id === order.id)
  db.orders[idx] = {
    ...order,
    ...changes,
    statusLogs: [
      ...order.statusLogs,
      {
        id: uuidv4(),
        status: order.status,
        time,
        operator: params.operator || '系统',
        remark: `订单信息已修改${Object.keys(changes)
          .map((k) =>
            ({
              contactName: '（联系人）',
              contactPhone: '（联系电话）',
              scheduledPickupTime: '（自提时间）',
              remark: '（备注）',
            } as Record<string, string>)[k],
          )
          .join('')}`,
      },
    ],
  }
  return { success: true, message: '订单信息已更新' }
}

export function updateOrderRemark(orderId: string, remark: string, operator = '系统'): { success: boolean; message: string } {
  const order = db.orders.find((o) => o.id === orderId)
  if (!order) return { success: false, message: '订单不存在' }
  if (remark.length > 500) return { success: false, message: '备注不能超过500字' }
  const idx = db.orders.findIndex((o) => o.id === orderId)
  db.orders[idx] = { ...order, remark: remark.trim() || undefined }
  return { success: true, message: '备注已更新' }
}

export function addContactRecord(params: {
  orderId: string
  type: 'phone' | 'sms' | 'wechat' | 'onsite'
  content: string
  operator: string
}): { success: boolean; message: string } {
  const order = db.orders.find((o) => o.id === params.orderId)
  if (!order) return { success: false, message: '订单不存在' }
  if (!params.content.trim()) return { success: false, message: '联系内容不能为空' }
  if (params.content.length > 500) return { success: false, message: '联系内容不能超过500字' }
  const idx = db.orders.findIndex((o) => o.id === params.orderId)
  db.orders[idx] = {
    ...order,
    contactRecords: [
      {
        id: uuidv4(),
        time: nowStr(),
        type: params.type,
        operator: params.operator,
        content: params.content.trim(),
      },
      ...order.contactRecords,
    ],
  }
  return { success: true, message: '联系记录已添加' }
}

export function processOrderDelay(params: {
  orderId: string
  newScheduledTime: string
  remark?: string
  operator?: string
}): { success: boolean; message: string } {
  const order = db.orders.find((o) => o.id === params.orderId)
  if (!order) return { success: false, message: '订单不存在' }
  if (!params.newScheduledTime) return { success: false, message: '请选择新的取货时间' }
  if (new Date(params.newScheduledTime).getTime() < Date.now()) {
    return { success: false, message: '新的取货时间不能早于当前时间' }
  }
  if (!['pending', 'confirmed', 'ready', 'delayed'].includes(order.status)) {
    return { success: false, message: '当前状态无法处理延期' }
  }
  const time = nowStr()
  const idx = db.orders.findIndex((o) => o.id === params.orderId)
  db.orders[idx] = {
    ...order,
    status: 'delayed',
    scheduledPickupTime: params.newScheduledTime,
    statusLogs: [
      ...order.statusLogs,
      {
        id: uuidv4(),
        status: 'delayed',
        time,
        operator: params.operator || '系统',
        remark: params.remark || `已延期，新取货时间：${params.newScheduledTime}`,
      },
    ],
  }
  return { success: true, message: '订单已延期处理' }
}

export function processOrderFailed(params: {
  orderId: string
  remark?: string
  operator?: string
}): { success: boolean; message: string } {
  const order = db.orders.find((o) => o.id === params.orderId)
  if (!order) return { success: false, message: '订单不存在' }
  if (!['pending', 'confirmed', 'ready', 'delayed'].includes(order.status)) {
    return { success: false, message: '当前状态无法标记失败' }
  }
  const time = nowStr()
  const idx = db.orders.findIndex((o) => o.id === params.orderId)
  db.orders[idx] = {
    ...order,
    status: 'failed',
    statusLogs: [
      ...order.statusLogs,
      {
        id: uuidv4(),
        status: 'failed',
        time,
        operator: params.operator || '系统',
        remark: params.remark || '自提失败，顾客未取货',
      },
    ],
  }
  return { success: true, message: '已标记为自提失败' }
}

export function cancelOrder(params: {
  orderId: string
  reason: string
  operator?: string
}): { success: boolean; message: string } {
  const order = db.orders.find((o) => o.id === params.orderId)
  if (!order) return { success: false, message: '订单不存在' }
  if (['picked_up', 'cancelled', 'failed'].includes(order.status)) {
    return { success: false, message: `订单状态为「${orderStatusMap[order.status].label}」，无法取消` }
  }
  if (!params.reason.trim()) return { success: false, message: '请填写取消原因' }
  if (params.reason.length > 500) return { success: false, message: '取消原因不能超过500字' }
  const time = nowStr()
  const idx = db.orders.findIndex((o) => o.id === params.orderId)
  db.orders[idx] = {
    ...order,
    status: 'cancelled',
    cancelReason: params.reason.trim(),
    statusLogs: [
      ...order.statusLogs,
      {
        id: uuidv4(),
        status: 'cancelled',
        time,
        operator: params.operator || '系统',
        remark: params.reason.trim(),
      },
    ],
  }
  return { success: true, message: '订单已取消' }
}

export function completeOrderPickup(params: {
  orderId: string
  pickupPerson: string
  pickupPersonIdCard?: string
  itemsActual: { productId: string; actualQuantity: number }[]
  operator?: string
}): { success: boolean; message: string } {
  const order = db.orders.find((o) => o.id === params.orderId)
  if (!order) return { success: false, message: '订单不存在' }
  if (!['pending', 'confirmed', 'ready', 'delayed'].includes(order.status)) {
    return { success: false, message: `该订单状态为「${orderStatusMap[order.status].label}」，无需核销` }
  }
  if (!params.pickupPerson.trim()) return { success: false, message: '取货人姓名不能为空' }
  if (params.pickupPerson.length > 20) return { success: false, message: '取货人姓名过长（最多20字）' }

  let allFull = true
  for (const item of order.items) {
    const actual = params.itemsActual.find((a) => a.productId === item.productId)?.actualQuantity ?? item.quantity
    if (actual < item.quantity) allFull = false
    if (actual > item.quantity) return { success: false, message: `商品「${item.productName}」实际数量不能超过购买数量` }
    if (actual < 0) return { success: false, message: `商品「${item.productName}」实际数量不能为负数` }
    const stock = db.stocks.find((s) => s.productId === item.productId && s.storeId === order.storeId)
    const availableQty = stock ? stock.quantity - stock.lockedQuantity : 0
    if (actual > availableQty) {
      return { success: false, message: `商品「${item.productName}」库存不足，当前可用${availableQty}件` }
    }
  }

  const newStatus = allFull ? 'picked_up' : 'partial'
  const time = nowStr()
  const newItems = order.items.map((item) => {
    const actual = params.itemsActual.find((a) => a.productId === item.productId)?.actualQuantity ?? item.quantity
    return { ...item, actualQuantity: actual }
  })
  const idx = db.orders.findIndex((o) => o.id === params.orderId)
  db.orders[idx] = {
    ...order,
    status: newStatus,
    items: newItems,
    actualPickupTime: time,
    pickupPerson: params.pickupPerson.trim(),
    pickupPersonIdCard: params.pickupPersonIdCard?.trim() || undefined,
    statusLogs: [
      ...order.statusLogs,
      {
        id: uuidv4(),
        status: newStatus,
        time,
        operator: params.operator || '系统',
        remark: allFull ? '顾客已完成自提' : '部分商品缺货，已完成部分取货',
      },
    ],
  }

  for (const item of newItems) {
    if (item.actualQuantity && item.actualQuantity > 0) {
      const stockIdx = db.stocks.findIndex((s) => s.productId === item.productId && s.storeId === order.storeId)
      if (stockIdx > -1) {
        const stock = db.stocks[stockIdx]
        const beforeQty = stock.quantity
        db.stocks[stockIdx] = {
          ...stock,
          quantity: Math.max(0, stock.quantity - item.actualQuantity),
          updatedAt: time,
        }
        const record: StockRecord = {
          id: uuidv4(),
          time,
          productId: item.productId,
          productName: item.productName,
          storeId: order.storeId,
          storeName: order.storeName,
          type: 'out',
          quantity: -item.actualQuantity,
          beforeQuantity: beforeQty,
          afterQuantity: beforeQty - item.actualQuantity,
          operator: params.operator || '系统',
          relatedOrderNo: order.orderNo,
          remark: '订单自提出库',
        }
        db.stockRecords.unshift(record)
      }
    }
  }

  return { success: true, message: '核销成功' }
}

export function processStockIn(params: {
  productId: string
  storeId: string
  quantity: number
  operator: string
  remark?: string
}): { success: boolean; message: string } {
  if (params.quantity <= 0) return { success: false, message: '入库数量必须大于0' }
  const product = db.products.find((p) => p.id === params.productId)
  const store = db.stores.find((s) => s.id === params.storeId)
  if (!product || !store) return { success: false, message: '商品或门店不存在' }
  const time = nowStr()
  const existingIdx = db.stocks.findIndex((s) => s.productId === params.productId && s.storeId === params.storeId)
  let beforeQty = 0
  if (existingIdx > -1) {
    beforeQty = db.stocks[existingIdx].quantity
    db.stocks[existingIdx] = {
      ...db.stocks[existingIdx],
      quantity: beforeQty + params.quantity,
      updatedAt: time,
    }
  } else {
    const newStock: StoreStock = {
      productId: params.productId,
      storeId: params.storeId,
      quantity: params.quantity,
      lockedQuantity: 0,
      updatedAt: time,
    }
    db.stocks.push(newStock)
  }
  db.stockRecords.unshift({
    id: uuidv4(),
    time,
    productId: params.productId,
    productName: product.name,
    storeId: params.storeId,
    storeName: store.name,
    type: 'in',
    quantity: params.quantity,
    beforeQuantity: beforeQty,
    afterQuantity: beforeQty + params.quantity,
    operator: params.operator,
    remark: params.remark || '采购入库',
  })
  return { success: true, message: '入库成功' }
}

export function processStockAdjust(params: {
  productId: string
  storeId: string
  quantity: number
  operator: string
  remark?: string
}): { success: boolean; message: string } {
  if (params.quantity < 0) return { success: false, message: '调整后数量不能为负数' }
  const product = db.products.find((p) => p.id === params.productId)
  const store = db.stores.find((s) => s.id === params.storeId)
  if (!product || !store) return { success: false, message: '商品或门店不存在' }
  const time = nowStr()
  const existingIdx = db.stocks.findIndex((s) => s.productId === params.productId && s.storeId === params.storeId)
  let beforeQty = 0
  if (existingIdx > -1) {
    beforeQty = db.stocks[existingIdx].quantity
    db.stocks[existingIdx] = {
      ...db.stocks[existingIdx],
      quantity: params.quantity,
      updatedAt: time,
    }
  } else {
    const newStock: StoreStock = {
      productId: params.productId,
      storeId: params.storeId,
      quantity: params.quantity,
      lockedQuantity: 0,
      updatedAt: time,
    }
    db.stocks.push(newStock)
  }
  db.stockRecords.unshift({
    id: uuidv4(),
    time,
    productId: params.productId,
    productName: product.name,
    storeId: params.storeId,
    storeName: store.name,
    type: 'adjust',
    quantity: params.quantity - beforeQty,
    beforeQuantity: beforeQty,
    afterQuantity: params.quantity,
    operator: params.operator,
    remark: params.remark || '库存盘点调整',
  })
  return { success: true, message: '库存调整成功' }
}

function getStoreAvailableStock(storeId: string, productId: string): number {
  const stock = db.stocks.find((s) => s.storeId === storeId && s.productId === productId)
  return stock ? stock.quantity - stock.lockedQuantity : 0
}

export function getTransfers(params?: {
  keyword?: string
  status?: TransferStatus | 'all'
  type?: TransferType | 'all'
  storeId?: string
  startDate?: string
  endDate?: string
}) {
  let list = db.transfers.slice()
  if (params?.keyword?.trim()) {
    const kw = params.keyword.trim().toLowerCase()
    list = list.filter(
      (t) =>
        t.transferNo.toLowerCase().includes(kw) ||
        t.fromStoreName.toLowerCase().includes(kw) ||
        t.toStoreName.toLowerCase().includes(kw) ||
        t.items.some((it) => it.productName.toLowerCase().includes(kw) || it.sku.toLowerCase().includes(kw)),
    )
  }
  if (params?.status && params.status !== 'all') {
    list = list.filter((t) => t.status === params.status)
  }
  if (params?.type && params.type !== 'all') {
    list = list.filter((t) => t.type === params.type)
  }
  if (params?.storeId) {
    list = list.filter((t) => t.fromStoreId === params.storeId || t.toStoreId === params.storeId)
  }
  if (params?.startDate) list = list.filter((t) => t.createdAt.slice(0, 10) >= params.startDate!)
  if (params?.endDate) list = list.filter((t) => t.createdAt.slice(0, 10) <= params.endDate!)
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getTransferById(id: string): Transfer | undefined {
  return db.transfers.find((t) => t.id === id)
}

export function getTransferByNo(transferNo: string): Transfer | undefined {
  return db.transfers.find((t) => t.transferNo === transferNo)
}

export interface CreateTransferParams {
  type: TransferType
  fromStoreId: string
  toStoreId: string
  items: { productId: string; quantity: number }[]
  reason: string
  expectedArrivalTime?: string
  operator?: string
}

export function createTransfer(params: CreateTransferParams): { success: boolean; message: string; data?: Transfer } {
  const { type, fromStoreId, toStoreId, items, reason, expectedArrivalTime, operator = '系统' } = params
  if (!toStoreId) return { success: false, message: '请选择调入门店' }
  if (type === 'transfer' && !fromStoreId) return { success: false, message: '请选择调出门店' }
  if (type === 'transfer' && fromStoreId === toStoreId) {
    return { success: false, message: '调出门店和调入门店不能相同' }
  }
  if (!items || items.length === 0) return { success: false, message: '请添加至少一个商品' }
  if (!reason.trim()) return { success: false, message: '请填写申请原因' }
  if (reason.length > 500) return { success: false, message: '申请原因不能超过500字' }

  const toStore = db.stores.find((s) => s.id === toStoreId)
  if (!toStore) return { success: false, message: '调入门店不存在' }

  let fromStoreName = '总部仓库'
  if (type === 'transfer') {
    const fromStore = db.stores.find((s) => s.id === fromStoreId)
    if (!fromStore) return { success: false, message: '调出门店不存在' }
    fromStoreName = fromStore.name
  }

  const transferItems: TransferItem[] = []
  let totalAmount = 0

  for (const it of items) {
    if (!it.quantity || it.quantity <= 0) {
      return { success: false, message: '商品数量必须大于0' }
    }
    const product = db.products.find((p) => p.id === it.productId)
    if (!product) return { success: false, message: '商品不存在' }

    if (type === 'transfer') {
      const available = getStoreAvailableStock(fromStoreId, it.productId)
      if (it.quantity > available) {
        return { success: false, message: `商品「${product.name}」在${fromStoreName}库存不足，当前可用${available}件` }
      }
    }

    transferItems.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: it.quantity,
      unitPrice: product.price,
    })
    totalAmount += product.price * it.quantity
  }

  const time = nowStr()
  const transfer: Transfer = {
    id: uuidv4(),
    transferNo: generateTransferNo(db.transfers.length),
    type,
    fromStoreId,
    fromStoreName,
    toStoreId,
    toStoreName: toStore.name,
    items: transferItems,
    totalAmount: Math.round(totalAmount * 100) / 100,
    expectedArrivalTime,
    reason: reason.trim(),
    status: 'pending',
    statusLogs: [
      {
        id: uuidv4(),
        status: 'pending',
        time,
        operator,
        remark: reason.trim(),
      },
    ],
    createdAt: time,
    createdBy: operator,
    operator,
  }
  db.transfers.unshift(transfer)
  return { success: true, message: '申请提交成功', data: transfer }
}

export function approveTransfer(params: {
  transferId: string
  remark?: string
  operator?: string
}): { success: boolean; message: string } {
  const transfer = db.transfers.find((t) => t.id === params.transferId)
  if (!transfer) return { success: false, message: '申请不存在' }
  if (transfer.status !== 'pending') {
    return { success: false, message: '只有待处理的申请才能审批' }
  }
  const time = nowStr()
  const idx = db.transfers.findIndex((t) => t.id === params.transferId)
  db.transfers[idx] = {
    ...transfer,
    status: 'approved',
    statusLogs: [
      ...transfer.statusLogs,
      {
        id: uuidv4(),
        status: 'approved',
        time,
        operator: params.operator || '系统',
        remark: params.remark || '已审批通过，请尽快安排出库',
      },
    ],
  }
  return { success: true, message: '审批通过' }
}

export function rejectTransfer(params: {
  transferId: string
  reason: string
  operator?: string
}): { success: boolean; message: string } {
  const transfer = db.transfers.find((t) => t.id === params.transferId)
  if (!transfer) return { success: false, message: '申请不存在' }
  if (transfer.status !== 'pending') {
    return { success: false, message: '只有待处理的申请才能拒绝' }
  }
  if (!params.reason.trim()) return { success: false, message: '请填写拒绝原因' }
  if (params.reason.length > 500) return { success: false, message: '拒绝原因不能超过500字' }
  const time = nowStr()
  const idx = db.transfers.findIndex((t) => t.id === params.transferId)
  db.transfers[idx] = {
    ...transfer,
    status: 'rejected',
    rejectReason: params.reason.trim(),
    statusLogs: [
      ...transfer.statusLogs,
      {
        id: uuidv4(),
        status: 'rejected',
        time,
        operator: params.operator || '系统',
        remark: params.reason.trim(),
      },
    ],
  }
  return { success: true, message: '已拒绝申请' }
}

export function processTransferOutbound(params: {
  transferId: string
  itemsActual?: { productId: string; actualQuantity: number }[]
  remark?: string
  operator?: string
}): { success: boolean; message: string } {
  const transfer = db.transfers.find((t) => t.id === params.transferId)
  if (!transfer) return { success: false, message: '申请不存在' }
  if (!['approved', 'outbound'].includes(transfer.status)) {
    return { success: false, message: '当前状态不允许出库操作' }
  }

  const time = nowStr()
  const actualItems = transfer.items.map((item) => {
    const actual = params.itemsActual?.find((a) => a.productId === item.productId)?.actualQuantity ?? item.quantity
    if (actual < 0) {
      throw new Error(`商品「${item.productName}」实际出库数量不能为负数`)
    }
    if (actual > item.quantity) {
      throw new Error(`商品「${item.productName}」实际出库数量不能超过申请数量`)
    }
    return { ...item, actualOutboundQuantity: actual }
  })

  for (const item of actualItems) {
    if (item.actualOutboundQuantity === undefined) continue
    if (transfer.type === 'transfer' && item.actualOutboundQuantity > 0) {
      const available = getStoreAvailableStock(transfer.fromStoreId, item.productId)
      if (item.actualOutboundQuantity > available) {
        return { success: false, message: `商品「${item.productName}」库存不足，当前可用${available}件` }
      }
    }
  }

  for (const item of actualItems) {
    if (item.actualOutboundQuantity === undefined || item.actualOutboundQuantity <= 0) continue
    if (transfer.type === 'transfer') {
      const stockIdx = db.stocks.findIndex(
        (s) => s.productId === item.productId && s.storeId === transfer.fromStoreId,
      )
      if (stockIdx > -1) {
        const stock = db.stocks[stockIdx]
        const beforeQty = stock.quantity
        db.stocks[stockIdx] = {
          ...stock,
          quantity: Math.max(0, stock.quantity - item.actualOutboundQuantity),
          updatedAt: time,
        }
        const record: StockRecord = {
          id: uuidv4(),
          time,
          productId: item.productId,
          productName: item.productName,
          storeId: transfer.fromStoreId,
          storeName: transfer.fromStoreName,
          type: 'out',
          quantity: -item.actualOutboundQuantity,
          beforeQuantity: beforeQty,
          afterQuantity: beforeQty - item.actualOutboundQuantity,
          operator: params.operator || '系统',
          relatedOrderNo: transfer.transferNo,
          remark: '门店调拨出库',
        }
        db.stockRecords.unshift(record)
      }
    }
  }

  const idx = db.transfers.findIndex((t) => t.id === params.transferId)
  db.transfers[idx] = {
    ...transfer,
    status: 'outbound',
    items: actualItems,
    actualOutboundTime: time,
    statusLogs: [
      ...transfer.statusLogs,
      {
        id: uuidv4(),
        status: 'outbound',
        time,
        operator: params.operator || '系统',
        remark: params.remark || '商品已出库，正在安排运输',
      },
    ],
  }
  return { success: true, message: '出库成功' }
}

export function processTransferInTransit(params: {
  transferId: string
  remark?: string
  operator?: string
}): { success: boolean; message: string } {
  const transfer = db.transfers.find((t) => t.id === params.transferId)
  if (!transfer) return { success: false, message: '申请不存在' }
  if (transfer.status !== 'outbound') {
    return { success: false, message: '只有已出库的申请才能标记为运输中' }
  }
  const time = nowStr()
  const idx = db.transfers.findIndex((t) => t.id === params.transferId)
  db.transfers[idx] = {
    ...transfer,
    status: 'in_transit',
    statusLogs: [
      ...transfer.statusLogs,
      {
        id: uuidv4(),
        status: 'in_transit',
        time,
        operator: params.operator || '系统',
        remark: params.remark || '商品运输中',
      },
    ],
  }
  return { success: true, message: '已标记为运输中' }
}

export function processTransferInbound(params: {
  transferId: string
  itemsActual?: { productId: string; actualQuantity: number }[]
  remark?: string
  operator?: string
}): { success: boolean; message: string } {
  const transfer = db.transfers.find((t) => t.id === params.transferId)
  if (!transfer) return { success: false, message: '申请不存在' }
  if (!['in_transit', 'inbound'].includes(transfer.status)) {
    return { success: false, message: '当前状态不允许入库操作' }
  }

  const time = nowStr()
  const actualItems = transfer.items.map((item) => {
    const actual = params.itemsActual?.find((a) => a.productId === item.productId)?.actualQuantity
      ?? item.actualOutboundQuantity
      ?? item.quantity
    if (actual < 0) {
      throw new Error(`商品「${item.productName}」实际入库数量不能为负数`)
    }
    return { ...item, actualInboundQuantity: actual }
  })

  for (const item of actualItems) {
    if (item.actualInboundQuantity === undefined || item.actualInboundQuantity <= 0) continue
    const existingIdx = db.stocks.findIndex(
      (s) => s.productId === item.productId && s.storeId === transfer.toStoreId,
    )
    let beforeQty = 0
    if (existingIdx > -1) {
      beforeQty = db.stocks[existingIdx].quantity
      db.stocks[existingIdx] = {
        ...db.stocks[existingIdx],
        quantity: beforeQty + item.actualInboundQuantity,
        updatedAt: time,
      }
    } else {
      const newStock: StoreStock = {
        productId: item.productId,
        storeId: transfer.toStoreId,
        quantity: item.actualInboundQuantity,
        lockedQuantity: 0,
        updatedAt: time,
      }
      db.stocks.push(newStock)
    }
    const record: StockRecord = {
      id: uuidv4(),
      time,
      productId: item.productId,
      productName: item.productName,
      storeId: transfer.toStoreId,
      storeName: transfer.toStoreName,
      type: 'in',
      quantity: item.actualInboundQuantity,
      beforeQuantity: beforeQty,
      afterQuantity: beforeQty + item.actualInboundQuantity,
      operator: params.operator || '系统',
      relatedOrderNo: transfer.transferNo,
      remark: '门店调拨入库',
    }
    db.stockRecords.unshift(record)
  }

  const idx = db.transfers.findIndex((t) => t.id === params.transferId)
  db.transfers[idx] = {
    ...transfer,
    status: 'completed',
    items: actualItems,
    actualInboundTime: time,
    statusLogs: [
      ...transfer.statusLogs,
      {
        id: uuidv4(),
        status: 'completed',
        time,
        operator: params.operator || '系统',
        remark: params.remark || '已确认入库，调拨完成',
      },
    ],
  }
  return { success: true, message: '入库成功，调拨已完成' }
}

export function getSuppliers(keyword?: string, category?: string) {
  let list = db.suppliers.slice()
  if (keyword) {
    const kw = keyword.toLowerCase()
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(kw) ||
        s.contact.toLowerCase().includes(kw) ||
        s.phone.includes(kw),
    )
  }
  if (category) list = list.filter((s) => s.category === category)
  return list
}

export function getPurchases(params?: {
  keyword?: string
  status?: PurchaseStatus | 'all'
  supplierId?: string
  storeId?: string
  startDate?: string
  endDate?: string
}) {
  let list = db.purchases.slice()
  if (params?.keyword?.trim()) {
    const kw = params.keyword.trim().toLowerCase()
    list = list.filter(
      (p) =>
        p.purchaseNo.toLowerCase().includes(kw) ||
        p.supplierName.toLowerCase().includes(kw) ||
        p.storeName.toLowerCase().includes(kw) ||
        p.items.some((it) => it.productName.toLowerCase().includes(kw) || it.sku.toLowerCase().includes(kw)),
    )
  }
  if (params?.status && params.status !== 'all') {
    list = list.filter((p) => p.status === params.status)
  }
  if (params?.supplierId) list = list.filter((p) => p.supplierId === params.supplierId)
  if (params?.storeId) list = list.filter((p) => p.storeId === params.storeId)
  if (params?.startDate) list = list.filter((p) => p.createdAt.slice(0, 10) >= params.startDate!)
  if (params?.endDate) list = list.filter((p) => p.createdAt.slice(0, 10) <= params.endDate!)
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getPurchaseById(id: string): Purchase | undefined {
  return db.purchases.find((p) => p.id === id)
}

export function getPurchaseByNo(purchaseNo: string): Purchase | undefined {
  return db.purchases.find((p) => p.purchaseNo === purchaseNo)
}

export interface CreatePurchaseParams {
  supplierId: string
  storeId: string
  items: { productId: string; quantity: number; unitPrice: number }[]
  expectedArrivalTime: string
  reason: string
  operator?: string
}

export function createPurchase(params: CreatePurchaseParams): { success: boolean; message: string; data?: Purchase } {
  const { supplierId, storeId, items, expectedArrivalTime, reason, operator = '系统' } = params
  if (!supplierId) return { success: false, message: '请选择供应商' }
  if (!storeId) return { success: false, message: '请选择入库门店' }
  if (!items || items.length === 0) return { success: false, message: '请添加至少一个商品' }
  if (!expectedArrivalTime) return { success: false, message: '请选择期望到货时间' }
  if (new Date(expectedArrivalTime).getTime() < Date.now()) {
    return { success: false, message: '期望到货时间不能早于当前时间' }
  }
  if (!reason.trim()) return { success: false, message: '请填写采购原因' }
  if (reason.length > 500) return { success: false, message: '采购原因不能超过500字' }

  const supplier = db.suppliers.find((s) => s.id === supplierId)
  if (!supplier) return { success: false, message: '供应商不存在' }
  const store = db.stores.find((s) => s.id === storeId)
  if (!store) return { success: false, message: '门店不存在' }

  const purchaseItems: PurchaseItem[] = []
  let totalAmount = 0

  for (const it of items) {
    if (!it.quantity || it.quantity <= 0) return { success: false, message: '商品数量必须大于0' }
    if (it.unitPrice < 0) return { success: false, message: '采购单价不能为负数' }
    const product = db.products.find((p) => p.id === it.productId)
    if (!product) return { success: false, message: '商品不存在' }

    purchaseItems.push({
      id: uuidv4(),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      receivedQuantity: 0,
      unit: product.unit,
    })
    totalAmount += it.unitPrice * it.quantity
  }

  const time = nowStr()
  const purchase: Purchase = {
    id: uuidv4(),
    purchaseNo: generatePurchaseNo(db.purchases.length),
    supplierId,
    supplierName: supplier.name,
    storeId,
    storeName: store.name,
    items: purchaseItems,
    receiveItems: [],
    totalAmount: Math.round(totalAmount * 100) / 100,
    expectedArrivalTime,
    reason: reason.trim(),
    status: 'pending_approval',
    reconciliationStatus: 'pending_reconciliation',
    paymentStatus: 'pending_payment',
    paidAmount: 0,
    paymentRecords: [],
    statusLogs: [
      {
        id: uuidv4(),
        status: 'pending_approval',
        time,
        operator,
        remark: reason.trim(),
      },
    ],
    createdAt: time,
    createdBy: operator,
    operator,
  }
  db.purchases.unshift(purchase)
  return { success: true, message: '采购申请已提交，等待审批', data: purchase }
}

export function approvePurchase(params: {
  purchaseId: string
  remark?: string
  operator?: string
}): { success: boolean; message: string; data?: Purchase } {
  const purchase = db.purchases.find((p) => p.id === params.purchaseId)
  if (!purchase) return { success: false, message: '采购单不存在' }
  if (purchase.status !== 'pending_approval') {
    return { success: false, message: '只有待审批的采购单才能审批' }
  }
  const time = nowStr()
  const idx = db.purchases.findIndex((p) => p.id === params.purchaseId)
  const updated: Purchase = {
    ...purchase,
    status: 'approved',
    statusLogs: [
      ...purchase.statusLogs,
      {
        id: uuidv4(),
        status: 'approved',
        time,
        operator: params.operator || '系统',
        remark: params.remark || '已审批通过，请尽快向供应商下单',
      },
    ],
  }
  db.purchases[idx] = updated
  return { success: true, message: '审批通过', data: updated }
}

export function rejectPurchase(params: {
  purchaseId: string
  reason: string
  operator?: string
}): { success: boolean; message: string; data?: Purchase } {
  const purchase = db.purchases.find((p) => p.id === params.purchaseId)
  if (!purchase) return { success: false, message: '采购单不存在' }
  if (purchase.status !== 'pending_approval') {
    return { success: false, message: '只有待审批的采购单才能拒绝' }
  }
  if (!params.reason.trim()) return { success: false, message: '请填写拒绝原因' }
  if (params.reason.length > 500) return { success: false, message: '拒绝原因不能超过500字' }
  const time = nowStr()
  const idx = db.purchases.findIndex((p) => p.id === params.purchaseId)
  const updated: Purchase = {
    ...purchase,
    status: 'cancelled',
    rejectReason: params.reason.trim(),
    statusLogs: [
      ...purchase.statusLogs,
      {
        id: uuidv4(),
        status: 'cancelled',
        time,
        operator: params.operator || '系统',
        remark: params.reason.trim(),
      },
    ],
  }
  db.purchases[idx] = updated
  return { success: true, message: '已拒绝采购申请', data: updated }
}

export function placePurchaseOrder(params: {
  purchaseId: string
  remark?: string
  operator?: string
}): { success: boolean; message: string; data?: Purchase } {
  const purchase = db.purchases.find((p) => p.id === params.purchaseId)
  if (!purchase) return { success: false, message: '采购单不存在' }
  if (!['approved', 'pending_order'].includes(purchase.status)) {
    return { success: false, message: '当前状态不允许下单操作' }
  }
  const time = nowStr()
  const idx = db.purchases.findIndex((p) => p.id === params.purchaseId)
  const updated: Purchase = {
    ...purchase,
    status: 'ordered',
    statusLogs: [
      ...purchase.statusLogs,
      {
        id: uuidv4(),
        status: 'ordered',
        time,
        operator: params.operator || '系统',
        remark: params.remark || '已向供应商下单，等待发货',
      },
    ],
  }
  db.purchases[idx] = updated
  return { success: true, message: '下单成功', data: updated }
}

export function receivePurchaseItem(params: {
  purchaseId: string
  items: { purchaseItemId: string; quantity: number; differenceReason?: string }[]
  remark?: string
  operator?: string
}): { success: boolean; message: string; data?: Purchase } {
  const purchase = db.purchases.find((p) => p.id === params.purchaseId)
  if (!purchase) return { success: false, message: '采购单不存在' }
  if (!['ordered', 'pending_arrival', 'partial_arrival'].includes(purchase.status)) {
    return { success: false, message: '当前状态不允许收货操作' }
  }
  if (!params.items || params.items.length === 0) {
    return { success: false, message: '请填写收货明细' }
  }

  const time = nowStr()
  const updatedItems = purchase.items.map((item) => {
    const receive = params.items.find((r) => r.purchaseItemId === item.id)
    if (!receive) return item
    if (receive.quantity <= 0) {
      throw new Error(`商品「${item.productName}」收货数量必须大于0`)
    }
    const remainingQty = item.quantity - item.receivedQuantity
    if (receive.quantity > remainingQty) {
      throw new Error(`商品「${item.productName}」收货数量不能超过剩余未收数量${remainingQty}${item.unit}`)
    }
    return { ...item, receivedQuantity: item.receivedQuantity + receive.quantity }
  })

  const newReceiveItems: PurchaseReceiveItem[] = params.items.map((r) => {
    const item = purchase.items.find((it) => it.id === r.purchaseItemId)
    if (!item) throw new Error('采购商品不存在')
    return {
      id: uuidv4(),
      purchaseItemId: r.purchaseItemId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: r.quantity,
      unit: item.unit,
      receivedTime: time,
      differenceReason: r.differenceReason,
    }
  })

  for (const receiveItem of newReceiveItems) {
    const existingIdx = db.stocks.findIndex(
      (s) => s.productId === receiveItem.productId && s.storeId === purchase.storeId,
    )
    let beforeQty = 0
    if (existingIdx > -1) {
      beforeQty = db.stocks[existingIdx].quantity
      db.stocks[existingIdx] = {
        ...db.stocks[existingIdx],
        quantity: beforeQty + receiveItem.quantity,
        updatedAt: time,
      }
    } else {
      const newStock: StoreStock = {
        productId: receiveItem.productId,
        storeId: purchase.storeId,
        quantity: receiveItem.quantity,
        lockedQuantity: 0,
        updatedAt: time,
      }
      db.stocks.push(newStock)
    }
    const record: StockRecord = {
      id: uuidv4(),
      time,
      productId: receiveItem.productId,
      productName: receiveItem.productName,
      storeId: purchase.storeId,
      storeName: purchase.storeName,
      type: 'in',
      quantity: receiveItem.quantity,
      beforeQuantity: beforeQty,
      afterQuantity: beforeQty + receiveItem.quantity,
      operator: params.operator || '系统',
      relatedOrderNo: purchase.purchaseNo,
      remark: `采购入库，${receiveItem.differenceReason || '数量正常'}`,
    }
    db.stockRecords.unshift(record)
  }

  const allReceived = updatedItems.every((it) => it.receivedQuantity >= it.quantity)
  const newStatus: PurchaseStatus = allReceived ? 'completed' : 'partial_arrival'

  const idx = db.purchases.findIndex((p) => p.id === params.purchaseId)
  const updated: Purchase = {
    ...purchase,
    items: updatedItems,
    receiveItems: [...newReceiveItems, ...purchase.receiveItems],
    status: newStatus,
    actualArrivalTime: purchase.actualArrivalTime || time,
    statusLogs: [
      ...purchase.statusLogs,
      {
        id: uuidv4(),
        status: newStatus,
        time,
        operator: params.operator || '系统',
        remark: params.remark || (allReceived ? '全部商品已到货，已完成入库' : '部分商品已到货，已入库'),
      },
    ],
  }
  db.purchases[idx] = updated
  return { success: true, message: '收货入库成功', data: updated }
}

export function cancelPurchase(params: {
  purchaseId: string
  reason: string
  operator?: string
}): { success: boolean; message: string; data?: Purchase } {
  const purchase = db.purchases.find((p) => p.id === params.purchaseId)
  if (!purchase) return { success: false, message: '采购单不存在' }
  if (['completed', 'cancelled'].includes(purchase.status)) {
    return { success: false, message: `当前状态为「${purchaseStatusMap[purchase.status].label}」，无法取消` }
  }
  if (purchase.receiveItems.length > 0) {
    return { success: false, message: '已有商品入库，无法取消采购单' }
  }
  if (!params.reason.trim()) return { success: false, message: '请填写取消原因' }
  if (params.reason.length > 500) return { success: false, message: '取消原因不能超过500字' }
  const time = nowStr()
  const idx = db.purchases.findIndex((p) => p.id === params.purchaseId)
  const updated: Purchase = {
    ...purchase,
    status: 'cancelled',
    cancelReason: params.reason.trim(),
    statusLogs: [
      ...purchase.statusLogs,
      {
        id: uuidv4(),
        status: 'cancelled',
        time,
        operator: params.operator || '系统',
        remark: params.reason.trim(),
      },
    ],
  }
  db.purchases[idx] = updated
  return { success: true, message: '采购单已取消', data: updated }
}

export function getPaymentRecords(params?: {
  purchaseId?: string
  supplierId?: string
  startDate?: string
  endDate?: string
}) {
  let list = db.paymentRecords.slice()
  if (params?.purchaseId) list = list.filter((r) => r.purchaseId === params.purchaseId)
  if (params?.supplierId) {
    const purchaseIds = db.purchases
      .filter((p) => p.supplierId === params.supplierId)
      .map((p) => p.id)
    list = list.filter((r) => purchaseIds.includes(r.purchaseId))
  }
  if (params?.startDate) list = list.filter((r) => r.paymentTime.slice(0, 10) >= params.startDate!)
  if (params?.endDate) list = list.filter((r) => r.paymentTime.slice(0, 10) <= params.endDate!)
  return list.sort((a, b) => (a.paymentTime < b.paymentTime ? 1 : -1))
}

export function reconcilePurchase(params: {
  purchaseId: string
  operator?: string
  remark?: string
}): { success: boolean; message: string; data?: Purchase } {
  const purchase = db.purchases.find((p) => p.id === params.purchaseId)
  if (!purchase) return { success: false, message: '采购单不存在' }
  if (purchase.status !== 'completed') {
    return { success: false, message: '只有已完成收货的采购单才能对账' }
  }
  if (purchase.reconciliationStatus === 'reconciled') {
    return { success: false, message: '该采购单已对账，无需重复对账' }
  }

  const time = nowStr()
  const idx = db.purchases.findIndex((p) => p.id === params.purchaseId)
  const updated: Purchase = {
    ...purchase,
    reconciliationStatus: 'reconciled',
    reconciliationTime: time,
    statusLogs: [
      ...purchase.statusLogs,
      {
        id: uuidv4(),
        status: purchase.status,
        time,
        operator: params.operator || '系统',
        remark: params.remark || '对账完成，等待付款',
      },
    ],
  }
  db.purchases[idx] = updated
  return { success: true, message: '对账完成', data: updated }
}

export function createPaymentRecord(params: {
  purchaseId: string
  amount: number
  paymentTime: string
  paymentMethod: PaymentMethod
  operator?: string
  remark?: string
}): { success: boolean; message: string; data?: { payment: PaymentRecord; purchase: Purchase } } {
  const purchase = db.purchases.find((p) => p.id === params.purchaseId)
  if (!purchase) return { success: false, message: '采购单不存在' }
  if (purchase.reconciliationStatus !== 'reconciled') {
    return { success: false, message: '请先完成对账再登记付款' }
  }
  if (purchase.paymentStatus === 'paid') {
    return { success: false, message: '该采购单已全额付款，无需再付款' }
  }

  if (!params.amount || params.amount <= 0) {
    return { success: false, message: '付款金额必须大于0' }
  }
  if (isNaN(params.amount)) {
    return { success: false, message: '付款金额格式不正确' }
  }

  const remainingAmount = Math.round((purchase.totalAmount - purchase.paidAmount) * 100) / 100
  if (params.amount > remainingAmount + 0.01) {
    return { success: false, message: `付款金额不能超过待付款金额 ${remainingAmount.toFixed(2)} 元` }
  }
  if (params.amount > purchase.totalAmount * 1.1) {
    return { success: false, message: '付款金额明显不合理，已超过采购总额的110%' }
  }

  if (!params.paymentTime) {
    return { success: false, message: '请选择付款时间' }
  }
  if (!params.paymentMethod) {
    return { success: false, message: '请选择付款方式' }
  }

  const validMethods: PaymentMethod[] = ['bank_transfer', 'alipay', 'wechat', 'cash', 'other']
  if (!validMethods.includes(params.paymentMethod)) {
    return { success: false, message: '付款方式不正确' }
  }

  if (params.remark && params.remark.length > 500) {
    return { success: false, message: '备注不能超过500字' }
  }

  const time = nowStr()
  const newPaidAmount = Math.round((purchase.paidAmount + params.amount) * 100) / 100
  const newPaymentStatus: PaymentStatus = 
    newPaidAmount >= purchase.totalAmount - 0.01 ? 'paid' : 'partial_payment'

  const paymentRecord: PaymentRecord = {
    id: uuidv4(),
    purchaseId: purchase.id,
    purchaseNo: purchase.purchaseNo,
    amount: Math.round(params.amount * 100) / 100,
    paymentTime: params.paymentTime,
    paymentMethod: params.paymentMethod,
    operator: params.operator || '系统',
    remark: params.remark?.trim() || undefined,
  }

  db.paymentRecords.unshift(paymentRecord)

  const updated: Purchase = {
    ...purchase,
    paidAmount: newPaidAmount,
    paymentStatus: newPaymentStatus,
    paymentRecords: [paymentRecord, ...purchase.paymentRecords],
    statusLogs: [
      ...purchase.statusLogs,
      {
        id: uuidv4(),
        status: purchase.status,
        time,
        operator: params.operator || '系统',
        remark: `登记付款 ${params.amount.toFixed(2)} 元，${newPaymentStatus === 'paid' ? '已全额付款' : `已付款 ${newPaidAmount.toFixed(2)} / ${purchase.totalAmount.toFixed(2)} 元`}`,
      },
    ],
  }

  const idx = db.purchases.findIndex((p) => p.id === params.purchaseId)
  db.purchases[idx] = updated

  return { success: true, message: '付款登记成功', data: { payment: paymentRecord, purchase: updated } }
}
