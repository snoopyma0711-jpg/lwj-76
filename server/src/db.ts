import type { Database, Order, OrderStatus, OrderItem, StoreStock, StockRecord } from './types'
import { createMockDatabase } from './mockData'
import { nowStr, generateOrderNo, isValidPhone, orderStatusMap } from './utils'
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
