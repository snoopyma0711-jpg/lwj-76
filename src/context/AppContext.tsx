import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'
import type { AppState, AppAction, Order, StoreStock, StockRecord, Product, Transfer, TransferType, TransferStatus, TransferItem } from '../types'
import { mockStores, mockProducts, mockOrders, mockStocks, mockStockRecords, mockTransfers } from '../data/mockData'
import { orderStatusMap } from '../utils/constants'
import { api } from '../services/api'

const initialState: AppState = {
  stores: mockStores,
  products: mockProducts,
  orders: mockOrders,
  stocks: mockStocks,
  stockRecords: mockStockRecords,
  transfers: mockTransfers,
  currentUser: {
    name: '张店长',
    role: 'manager',
    storeId: 'store-001',
  },
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ORDERS': {
      return { ...state, orders: action.payload }
    }
    case 'SET_STOCKS': {
      return { ...state, stocks: action.payload }
    }
    case 'SET_STORES': {
      return { ...state, stores: action.payload }
    }
    case 'SET_PRODUCTS': {
      return { ...state, products: action.payload }
    }
    case 'SET_STOCK_RECORDS': {
      return { ...state, stockRecords: action.payload }
    }
    case 'UPDATE_ORDER': {
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.id ? action.payload : o,
        ),
      }
    }
    case 'ADD_ORDER': {
      return {
        ...state,
        orders: [action.payload, ...state.orders],
      }
    }
    case 'ADD_STATUS_LOG': {
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.orderId
            ? { ...o, statusLogs: [...o.statusLogs, action.payload.log], status: action.payload.log.status }
            : o,
        ),
      }
    }
    case 'ADD_CONTACT_RECORD': {
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.orderId
            ? { ...o, contactRecords: [action.payload.record, ...o.contactRecords] }
            : o,
        ),
      }
    }
    case 'UPDATE_STOCK': {
      const existing = state.stocks.find(
        (s) => s.productId === action.payload.productId && s.storeId === action.payload.storeId,
      )
      if (existing) {
        return {
          ...state,
          stocks: state.stocks.map((s) =>
            s.productId === action.payload.productId && s.storeId === action.payload.storeId
              ? action.payload
              : s,
          ),
        }
      }
      return {
        ...state,
        stocks: [...state.stocks, action.payload],
      }
    }
    case 'ADD_STOCK_RECORD': {
      return {
        ...state,
        stockRecords: [action.payload, ...state.stockRecords],
      }
    }
    case 'UPDATE_PRODUCT': {
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? action.payload : p,
        ),
      }
    }
    case 'UPDATE_STORE': {
      return {
        ...state,
        stores: state.stores.map((s) =>
          s.id === action.payload.id ? action.payload : s,
        ),
      }
    }
    case 'SET_TRANSFERS': {
      return { ...state, transfers: action.payload }
    }
    case 'ADD_TRANSFER': {
      return {
        ...state,
        transfers: [action.payload, ...state.transfers],
      }
    }
    case 'UPDATE_TRANSFER': {
      return {
        ...state,
        transfers: state.transfers.map((t) =>
          t.id === action.payload.id ? action.payload : t,
        ),
      }
    }
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  completeOrderPickup: (params: {
    order: Order
    pickupPerson: string
    pickupPersonIdCard?: string
    itemsActual: { productId: string; actualQuantity: number }[]
  }) => { success: boolean; message: string }
  processOrderDelay: (params: {
    order: Order
    newScheduledTime: string
    remark?: string
  }) => { success: boolean; message: string }
  processOrderFailed: (params: {
    order: Order
    remark?: string
  }) => { success: boolean; message: string }
  processStockIn: (params: {
    productId: string
    storeId: string
    quantity: number
    operator: string
    remark?: string
  }) => { success: boolean; message: string }
  processStockAdjust: (params: {
    productId: string
    storeId: string
    quantity: number
    operator: string
    remark?: string
  }) => { success: boolean; message: string }
  updateOrderRemark: (params: {
    order: Order
    remark: string
  }) => void
  addContactRecord: (params: {
    order: Order
    type: 'phone' | 'sms' | 'wechat' | 'onsite'
    content: string
    operator: string
  }) => void
  createOrder: (params: {
    storeId: string
    items: { productId: string; quantity: number }[]
    contactName: string
    contactPhone: string
    scheduledPickupTime: string
    remark?: string
  }) => { success: boolean; message: string; order?: Order }
  updateOrderInfo: (params: {
    order: Order
    contactName?: string
    contactPhone?: string
    scheduledPickupTime?: string
    remark?: string
  }) => { success: boolean; message: string }
  cancelOrder: (params: {
    order: Order
    reason: string
  }) => { success: boolean; message: string }
  getProductStocks: (productId: string) => (StoreStock & { storeName: string })[]
  getWarningProducts: () => (Product & {
    storeWarnings: { storeId: string; storeName: string; quantity: number; threshold: number }[]
    totalQuantity: number
  })[]
  getOrdersAffectedByStock: (productId: string, storeId?: string) => Order[]
  createTransfer: (params: {
    type: TransferType
    fromStoreId: string
    toStoreId: string
    items: { productId: string; quantity: number }[]
    reason: string
    expectedArrivalTime?: string
  }) => { success: boolean; message: string; transfer?: Transfer }
  approveTransfer: (params: {
    transfer: Transfer
    remark?: string
  }) => { success: boolean; message: string }
  rejectTransfer: (params: {
    transfer: Transfer
    reason: string
  }) => { success: boolean; message: string }
  processTransferOutbound: (params: {
    transfer: Transfer
    itemsActual?: { productId: string; actualQuantity: number }[]
    remark?: string
  }) => { success: boolean; message: string }
  processTransferInTransit: (params: {
    transfer: Transfer
    remark?: string
  }) => { success: boolean; message: string }
  processTransferInbound: (params: {
    transfer: Transfer
    itemsActual?: { productId: string; actualQuantity: number }[]
    remark?: string
  }) => { success: boolean; message: string }
  getStoreAvailableStock: (storeId: string, productId: string) => number
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      const [storesRes, productsRes, ordersRes, stocksRes, stockRecordsRes] = await Promise.allSettled([
        api.getStores(),
        api.getProducts(),
        api.getOrders(),
        api.getStocks(),
        api.getStockRecords(),
      ])

      if (cancelled) return

      if (storesRes.status === 'fulfilled' && storesRes.value.success && storesRes.value.data) {
        dispatch({ type: 'SET_STORES', payload: storesRes.value.data })
      }
      if (productsRes.status === 'fulfilled' && productsRes.value.success && productsRes.value.data) {
        dispatch({ type: 'SET_PRODUCTS', payload: productsRes.value.data })
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.success && ordersRes.value.data) {
        dispatch({ type: 'SET_ORDERS', payload: ordersRes.value.data })
      }
      if (stocksRes.status === 'fulfilled' && stocksRes.value.success && stocksRes.value.data) {
        dispatch({ type: 'SET_STOCKS', payload: stocksRes.value.data })
      }
      if (stockRecordsRes.status === 'fulfilled' && stockRecordsRes.value.success && stockRecordsRes.value.data) {
        dispatch({ type: 'SET_STOCK_RECORDS', payload: stockRecordsRes.value.data })
      }
    }

    void loadInitialData()

    return () => {
      cancelled = true
    }
  }, [])

  const formatDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const nowStr = () => formatDate(new Date())

  const completeOrderPickup: AppContextValue['completeOrderPickup'] = ({
    order,
    pickupPerson,
    pickupPersonIdCard,
    itemsActual,
  }) => {
    if (!pickupPerson.trim()) {
      return { success: false, message: '取货人姓名不能为空' }
    }

    const product = state.products.find((p) => p.id === order.items[0].productId)

    let allFull = true
    for (const item of order.items) {
      const actual = itemsActual.find((a) => a.productId === item.productId)?.actualQuantity ?? item.quantity
      if (actual < item.quantity) {
        allFull = false
      }
      if (actual > item.quantity) {
        return { success: false, message: `商品「${item.productName}」实际数量不能超过购买数量` }
      }
      if (actual < 0) {
        return { success: false, message: `商品「${item.productName}」实际数量不能为负数` }
      }
      const stock = state.stocks.find(
        (s) => s.productId === item.productId && s.storeId === order.storeId,
      )
      const availableQty = stock ? stock.quantity - stock.lockedQuantity : 0
      if (actual > availableQty) {
        return { success: false, message: `商品「${item.productName}」库存不足，当前可用${availableQty}件` }
      }
    }

    const newStatus = allFull ? 'picked_up' : 'partial'
    const actualPickupTime = nowStr()

    const newItems = order.items.map((item) => {
      const actual = itemsActual.find((a) => a.productId === item.productId)?.actualQuantity ?? item.quantity
      return { ...item, actualQuantity: actual }
    })

    const updatedOrder: Order = {
      ...order,
      status: newStatus,
      items: newItems,
      actualPickupTime,
      pickupPerson,
      pickupPersonIdCard: pickupPersonIdCard || undefined,
      statusLogs: [
        ...order.statusLogs,
        {
          id: `log-${Date.now()}`,
          status: newStatus,
          time: actualPickupTime,
          operator: state.currentUser.name,
          remark: allFull ? '顾客已完成自提' : '部分商品缺货，已完成部分取货',
        },
      ],
    }

    dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder })

    for (const item of newItems) {
      if (item.actualQuantity && item.actualQuantity > 0) {
        const stock = state.stocks.find(
          (s) => s.productId === item.productId && s.storeId === order.storeId,
        )
        if (stock) {
          const newStock: StoreStock = {
            ...stock,
            quantity: stock.quantity - item.actualQuantity,
            updatedAt: actualPickupTime,
          }
          dispatch({ type: 'UPDATE_STOCK', payload: newStock })
          const record: StockRecord = {
            id: `stock-rec-${Date.now()}-${item.productId}`,
            time: actualPickupTime,
            productId: item.productId,
            productName: item.productName,
            storeId: order.storeId,
            storeName: order.storeName,
            type: 'out',
            quantity: item.actualQuantity,
            beforeQuantity: stock.quantity,
            afterQuantity: stock.quantity - item.actualQuantity,
            operator: state.currentUser.name,
            relatedOrderNo: order.orderNo,
            remark: '订单自提出库',
          }
          dispatch({ type: 'ADD_STOCK_RECORD', payload: record })
        }
      }
    }

    return { success: true, message: '核销成功' }
  }

  const processOrderDelay: AppContextValue['processOrderDelay'] = ({
    order,
    newScheduledTime,
    remark,
  }) => {
    if (!newScheduledTime) {
      return { success: false, message: '请选择新的取货时间' }
    }
    const time = nowStr()
    const updatedOrder: Order = {
      ...order,
      status: 'delayed',
      scheduledPickupTime: newScheduledTime,
      statusLogs: [
        ...order.statusLogs,
        {
          id: `log-${Date.now()}`,
          status: 'delayed',
          time,
          operator: state.currentUser.name,
          remark: remark || `已延期，新取货时间：${newScheduledTime}`,
        },
      ],
    }
    dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder })
    return { success: true, message: '订单已延期处理' }
  }

  const processOrderFailed: AppContextValue['processOrderFailed'] = ({
    order,
    remark,
  }) => {
    const time = nowStr()
    const updatedOrder: Order = {
      ...order,
      status: 'failed',
      statusLogs: [
        ...order.statusLogs,
        {
          id: `log-${Date.now()}`,
          status: 'failed',
          time,
          operator: state.currentUser.name,
          remark: remark || '自提失败，顾客未取货',
        },
      ],
    }
    dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder })
    return { success: true, message: '已标记为自提失败' }
  }

  const processStockIn: AppContextValue['processStockIn'] = ({
    productId,
    storeId,
    quantity,
    operator,
    remark,
  }) => {
    if (quantity <= 0) {
      return { success: false, message: '入库数量必须大于0' }
    }
    const product = state.products.find((p) => p.id === productId)
    const store = state.stores.find((s) => s.id === storeId)
    if (!product || !store) {
      return { success: false, message: '商品或门店不存在' }
    }
    const time = nowStr()
    const existing = state.stocks.find((s) => s.productId === productId && s.storeId === storeId)
    const beforeQty = existing?.quantity ?? 0
    const newStock: StoreStock = {
      productId,
      storeId,
      quantity: beforeQty + quantity,
      lockedQuantity: existing?.lockedQuantity ?? 0,
      updatedAt: time,
    }
    dispatch({ type: 'UPDATE_STOCK', payload: newStock })
    const record: StockRecord = {
      id: `stock-rec-${Date.now()}`,
      time,
      productId,
      productName: product.name,
      storeId,
      storeName: store.name,
      type: 'in',
      quantity,
      beforeQuantity: beforeQty,
      afterQuantity: beforeQty + quantity,
      operator,
      remark: remark || '采购入库',
    }
    dispatch({ type: 'ADD_STOCK_RECORD', payload: record })
    return { success: true, message: '入库成功' }
  }

  const processStockAdjust: AppContextValue['processStockAdjust'] = ({
    productId,
    storeId,
    quantity,
    operator,
    remark,
  }) => {
    if (quantity < 0) {
      return { success: false, message: '调整后数量不能为负数' }
    }
    const product = state.products.find((p) => p.id === productId)
    const store = state.stores.find((s) => s.id === storeId)
    if (!product || !store) {
      return { success: false, message: '商品或门店不存在' }
    }
    const time = nowStr()
    const existing = state.stocks.find((s) => s.productId === productId && s.storeId === storeId)
    const beforeQty = existing?.quantity ?? 0
    const newStock: StoreStock = {
      productId,
      storeId,
      quantity,
      lockedQuantity: existing?.lockedQuantity ?? 0,
      updatedAt: time,
    }
    dispatch({ type: 'UPDATE_STOCK', payload: newStock })
    const record: StockRecord = {
      id: `stock-rec-${Date.now()}`,
      time,
      productId,
      productName: product.name,
      storeId,
      storeName: store.name,
      type: 'adjust',
      quantity: quantity - beforeQty,
      beforeQuantity: beforeQty,
      afterQuantity: quantity,
      operator,
      remark: remark || '库存盘点调整',
    }
    dispatch({ type: 'ADD_STOCK_RECORD', payload: record })
    return { success: true, message: '库存调整成功' }
  }

  const updateOrderRemark: AppContextValue['updateOrderRemark'] = ({ order, remark }) => {
    dispatch({
      type: 'UPDATE_ORDER',
      payload: { ...order, remark },
    })
  }

  const addContactRecord: AppContextValue['addContactRecord'] = ({
    order,
    type,
    content,
    operator,
  }) => {
    if (!content.trim()) return
    dispatch({
      type: 'ADD_CONTACT_RECORD',
      payload: {
        orderId: order.id,
        record: {
          id: `cr-${Date.now()}`,
          time: nowStr(),
          type,
          operator,
          content: content.trim(),
        },
      },
    })
  }

  const getProductStocks: AppContextValue['getProductStocks'] = (productId) => {
    return state.stocks
      .filter((s) => s.productId === productId)
      .map((s) => ({
        ...s,
        storeName: state.stores.find((st) => st.id === s.storeId)?.name ?? '-',
      }))
  }

  const getWarningProducts: AppContextValue['getWarningProducts'] = () => {
    const warningMap = new Map<string, typeof state.products[0] & {
      storeWarnings: any[]
      totalQuantity: number
    }>()

    for (const stock of state.stocks) {
      const product = state.products.find((p) => p.id === stock.productId)
      if (!product) continue
      if (stock.quantity <= product.warningThreshold) {
        const storeName = state.stores.find((s) => s.id === stock.storeId)?.name ?? '-'
        if (!warningMap.has(product.id)) {
          warningMap.set(product.id, {
            ...product,
            storeWarnings: [],
            totalQuantity: 0,
          })
        }
        const entry = warningMap.get(product.id)!
        entry.storeWarnings.push({
          storeId: stock.storeId,
          storeName,
          quantity: stock.quantity,
          threshold: product.warningThreshold,
        })
      }
    }

    for (const entry of warningMap.values()) {
      entry.totalQuantity = state.stocks
        .filter((s) => s.productId === entry.id)
        .reduce((sum, s) => sum + s.quantity, 0)
    }

    return Array.from(warningMap.values())
  }

  const getOrdersAffectedByStock: AppContextValue['getOrdersAffectedByStock'] = (
    productId,
    storeId,
  ) => {
    return state.orders.filter((o) => {
      if (storeId && o.storeId !== storeId) return false
      if (!['pending', 'confirmed', 'ready', 'delayed'].includes(o.status)) return false
      return o.items.some((item) => item.productId === productId)
    })
  }

  const generateOrderNo = () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const seq = String(state.orders.length + 1).padStart(4, '0')
    return `TP${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${seq}`
  }

  const createOrder: AppContextValue['createOrder'] = ({
    storeId,
    items,
    contactName,
    contactPhone,
    scheduledPickupTime,
    remark,
  }) => {
    if (!storeId) return { success: false, message: '请选择门店' }
    if (!items || items.length === 0) return { success: false, message: '请添加至少一个商品' }
    if (!contactName.trim()) return { success: false, message: '请输入联系人姓名' }
    if (contactName.length > 20) return { success: false, message: '联系人姓名过长（最多20字）' }
    if (!contactPhone.trim()) return { success: false, message: '请输入联系电话' }
    if (!/^1[3-9]\d{9}$/.test(contactPhone.trim())) return { success: false, message: '请输入正确的手机号' }
    if (!scheduledPickupTime) return { success: false, message: '请选择约定自提时间' }
    if (new Date(scheduledPickupTime).getTime() < Date.now()) {
      return { success: false, message: '约定自提时间不能早于当前时间' }
    }

    const store = state.stores.find((s) => s.id === storeId)
    if (!store) return { success: false, message: '门店不存在' }

    const orderItems: Order['items'] = []
    let totalAmount = 0
    for (const it of items) {
      if (!it.quantity || it.quantity <= 0) {
        return { success: false, message: '商品数量必须大于0' }
      }
      const product = state.products.find((p) => p.id === it.productId)
      if (!product) return { success: false, message: '商品不存在' }
      const stock = state.stocks.find((s) => s.productId === it.productId && s.storeId === storeId)
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
      id: `order-${Date.now()}`,
      orderNo: generateOrderNo(),
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
          id: `log-${Date.now()}-1`,
          status: 'pending',
          time,
          operator: state.currentUser.name,
          remark: '订单已创建，待确认',
        },
      ],
      operator: state.currentUser.name,
    }

    dispatch({ type: 'ADD_ORDER', payload: order })
    return { success: true, message: '订单创建成功', order }
  }

  const updateOrderInfo: AppContextValue['updateOrderInfo'] = ({
    order,
    contactName,
    contactPhone,
    scheduledPickupTime,
    remark,
  }) => {
    if (['picked_up', 'cancelled', 'failed'].includes(order.status)) {
      return { success: false, message: `订单状态为「${orderStatusMap[order.status].label}」，无法修改` }
    }
    const changes: Partial<Order> = {}
    if (contactName !== undefined) {
      if (!contactName.trim()) return { success: false, message: '联系人姓名不能为空' }
      if (contactName.length > 20) return { success: false, message: '联系人姓名过长（最多20字）' }
      changes.contactName = contactName.trim()
    }
    if (contactPhone !== undefined) {
      if (!contactPhone.trim()) return { success: false, message: '联系电话不能为空' }
      if (!/^1[3-9]\d{9}$/.test(contactPhone.trim())) return { success: false, message: '请输入正确的手机号' }
      changes.contactPhone = contactPhone.trim()
    }
    if (scheduledPickupTime !== undefined) {
      if (!scheduledPickupTime) return { success: false, message: '约定自提时间不能为空' }
      if (new Date(scheduledPickupTime).getTime() < Date.now()) {
        return { success: false, message: '约定自提时间不能早于当前时间' }
      }
      changes.scheduledPickupTime = scheduledPickupTime
    }
    if (remark !== undefined) {
      if (remark.length > 500) return { success: false, message: '备注不能超过500字' }
      changes.remark = remark.trim() || undefined
    }
    if (Object.keys(changes).length === 0) {
      return { success: false, message: '没有需要保存的修改' }
    }
    const time = nowStr()
    const updatedOrder: Order = {
      ...order,
      ...changes,
      statusLogs: [
        ...order.statusLogs,
        {
          id: `log-${Date.now()}`,
          status: order.status,
          time,
          operator: state.currentUser.name,
          remark: `订单信息已修改${Object.keys(changes).map((k) => ({
            contactName: '（联系人）',
            contactPhone: '（联系电话）',
            scheduledPickupTime: '（自提时间）',
            remark: '（备注）',
          } as Record<string, string>)[k]).join('')}`,
        },
      ],
    }
    dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder })
    return { success: true, message: '订单信息已更新' }
  }

  const cancelOrder: AppContextValue['cancelOrder'] = ({ order, reason }) => {
    if (['picked_up', 'cancelled', 'failed'].includes(order.status)) {
      return { success: false, message: `订单状态为「${orderStatusMap[order.status].label}」，无法取消` }
    }
    if (!reason.trim()) return { success: false, message: '请填写取消原因' }
    if (reason.length > 500) return { success: false, message: '取消原因不能超过500字' }
    const time = nowStr()
    const updatedOrder: Order = {
      ...order,
      status: 'cancelled',
      statusLogs: [
        ...order.statusLogs,
        {
          id: `log-${Date.now()}`,
          status: 'cancelled',
          time,
          operator: state.currentUser.name,
          remark: reason.trim(),
        },
      ],
    }
    dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder })
    return { success: true, message: '订单已取消' }
  }

  const getStoreAvailableStock: AppContextValue['getStoreAvailableStock'] = (storeId, productId) => {
    const stock = state.stocks.find((s) => s.storeId === storeId && s.productId === productId)
    return stock ? stock.quantity - stock.lockedQuantity : 0
  }

  const generateTransferNo = () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const seq = String(state.transfers.length + 1).padStart(4, '0')
    return `TR${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${seq}`
  }

  const createTransfer: AppContextValue['createTransfer'] = ({
    type,
    fromStoreId,
    toStoreId,
    items,
    reason,
    expectedArrivalTime,
  }) => {
    if (!toStoreId) return { success: false, message: '请选择调入门店' }
    if (type === 'transfer' && !fromStoreId) return { success: false, message: '请选择调出门店' }
    if (type === 'transfer' && fromStoreId === toStoreId) {
      return { success: false, message: '调出门店和调入门店不能相同' }
    }
    if (!items || items.length === 0) return { success: false, message: '请添加至少一个商品' }
    if (!reason.trim()) return { success: false, message: '请填写申请原因' }
    if (reason.length > 500) return { success: false, message: '申请原因不能超过500字' }

    const toStore = state.stores.find((s) => s.id === toStoreId)
    if (!toStore) return { success: false, message: '调入门店不存在' }

    let fromStoreName = '总部仓库'
    if (type === 'transfer') {
      const fromStore = state.stores.find((s) => s.id === fromStoreId)
      if (!fromStore) return { success: false, message: '调出门店不存在' }
      fromStoreName = fromStore.name
    }

    const transferItems: Transfer['items'] = []
    let totalAmount = 0

    for (const it of items) {
      if (!it.quantity || it.quantity <= 0) {
        return { success: false, message: '商品数量必须大于0' }
      }
      const product = state.products.find((p) => p.id === it.productId)
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
      id: `transfer-${Date.now()}`,
      transferNo: generateTransferNo(),
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
          id: `tlog-${Date.now()}-0`,
          status: 'pending',
          time,
          operator: state.currentUser.name,
          remark: reason.trim(),
        },
      ],
      createdAt: time,
      createdBy: state.currentUser.name,
      operator: state.currentUser.name,
    }

    dispatch({ type: 'ADD_TRANSFER', payload: transfer })
    return { success: true, message: '申请提交成功', transfer }
  }

  const approveTransfer: AppContextValue['approveTransfer'] = ({ transfer, remark }) => {
    if (transfer.status !== 'pending') {
      return { success: false, message: '只有待处理的申请才能审批' }
    }
    const time = nowStr()
    const updatedTransfer: Transfer = {
      ...transfer,
      status: 'approved',
      statusLogs: [
        ...transfer.statusLogs,
        {
          id: `tlog-${Date.now()}`,
          status: 'approved',
          time,
          operator: state.currentUser.name,
          remark: remark || '已审批通过，请尽快安排出库',
        },
      ],
    }
    dispatch({ type: 'UPDATE_TRANSFER', payload: updatedTransfer })
    return { success: true, message: '审批通过' }
  }

  const rejectTransfer: AppContextValue['rejectTransfer'] = ({ transfer, reason }) => {
    if (transfer.status !== 'pending') {
      return { success: false, message: '只有待处理的申请才能拒绝' }
    }
    if (!reason.trim()) return { success: false, message: '请填写拒绝原因' }
    if (reason.length > 500) return { success: false, message: '拒绝原因不能超过500字' }
    const time = nowStr()
    const updatedTransfer: Transfer = {
      ...transfer,
      status: 'rejected',
      rejectReason: reason.trim(),
      statusLogs: [
        ...transfer.statusLogs,
        {
          id: `tlog-${Date.now()}`,
          status: 'rejected',
          time,
          operator: state.currentUser.name,
          remark: reason.trim(),
        },
      ],
    }
    dispatch({ type: 'UPDATE_TRANSFER', payload: updatedTransfer })
    return { success: true, message: '已拒绝申请' }
  }

  const processTransferOutbound: AppContextValue['processTransferOutbound'] = ({
    transfer,
    itemsActual,
    remark,
  }) => {
    if (!['approved', 'outbound'].includes(transfer.status)) {
      return { success: false, message: '当前状态不允许出库操作' }
    }

    const time = nowStr()
    const actualItems = transfer.items.map((item) => {
      const actual = itemsActual?.find((a) => a.productId === item.productId)?.actualQuantity ?? item.quantity
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
        const stock = state.stocks.find(
          (s) => s.productId === item.productId && s.storeId === transfer.fromStoreId,
        )
        const available = stock ? stock.quantity - stock.lockedQuantity : 0
        if (item.actualOutboundQuantity > available) {
          return { success: false, message: `商品「${item.productName}」库存不足，当前可用${available}件` }
        }
      }
    }

    for (const item of actualItems) {
      if (item.actualOutboundQuantity === undefined || item.actualOutboundQuantity <= 0) continue
      if (transfer.type === 'transfer') {
        const stock = state.stocks.find(
          (s) => s.productId === item.productId && s.storeId === transfer.fromStoreId,
        )
        if (stock) {
          const newStock: StoreStock = {
            ...stock,
            quantity: stock.quantity - item.actualOutboundQuantity,
            updatedAt: time,
          }
          dispatch({ type: 'UPDATE_STOCK', payload: newStock })
          const record: StockRecord = {
            id: `stock-rec-${Date.now()}-${item.productId}`,
            time,
            productId: item.productId,
            productName: item.productName,
            storeId: transfer.fromStoreId,
            storeName: transfer.fromStoreName,
            type: 'out',
            quantity: item.actualOutboundQuantity,
            beforeQuantity: stock.quantity,
            afterQuantity: stock.quantity - item.actualOutboundQuantity,
            operator: state.currentUser.name,
            relatedOrderNo: transfer.transferNo,
            remark: '门店调拨出库',
          }
          dispatch({ type: 'ADD_STOCK_RECORD', payload: record })
        }
      }
    }

    const updatedTransfer: Transfer = {
      ...transfer,
      status: 'outbound',
      items: actualItems,
      actualOutboundTime: time,
      statusLogs: [
        ...transfer.statusLogs,
        {
          id: `tlog-${Date.now()}`,
          status: 'outbound',
          time,
          operator: state.currentUser.name,
          remark: remark || '商品已出库，正在安排运输',
        },
      ],
    }
    dispatch({ type: 'UPDATE_TRANSFER', payload: updatedTransfer })
    return { success: true, message: '出库成功' }
  }

  const processTransferInTransit: AppContextValue['processTransferInTransit'] = ({ transfer, remark }) => {
    if (transfer.status !== 'outbound') {
      return { success: false, message: '只有已出库的申请才能标记为运输中' }
    }
    const time = nowStr()
    const updatedTransfer: Transfer = {
      ...transfer,
      status: 'in_transit',
      statusLogs: [
        ...transfer.statusLogs,
        {
          id: `tlog-${Date.now()}`,
          status: 'in_transit',
          time,
          operator: state.currentUser.name,
          remark: remark || '商品运输中',
        },
      ],
    }
    dispatch({ type: 'UPDATE_TRANSFER', payload: updatedTransfer })
    return { success: true, message: '已标记为运输中' }
  }

  const processTransferInbound: AppContextValue['processTransferInbound'] = ({
    transfer,
    itemsActual,
    remark,
  }) => {
    if (!['in_transit', 'inbound'].includes(transfer.status)) {
      return { success: false, message: '当前状态不允许入库操作' }
    }

    const time = nowStr()
    const actualItems = transfer.items.map((item) => {
      const actual = itemsActual?.find((a) => a.productId === item.productId)?.actualQuantity
        ?? item.actualOutboundQuantity
        ?? item.quantity
      if (actual < 0) {
        throw new Error(`商品「${item.productName}」实际入库数量不能为负数`)
      }
      return { ...item, actualInboundQuantity: actual }
    })

    for (const item of actualItems) {
      if (item.actualInboundQuantity === undefined || item.actualInboundQuantity <= 0) continue
      const stock = state.stocks.find(
        (s) => s.productId === item.productId && s.storeId === transfer.toStoreId,
      )
      const beforeQty = stock?.quantity ?? 0
      const newStock: StoreStock = {
        productId: item.productId,
        storeId: transfer.toStoreId,
        quantity: beforeQty + item.actualInboundQuantity,
        lockedQuantity: stock?.lockedQuantity ?? 0,
        updatedAt: time,
      }
      dispatch({ type: 'UPDATE_STOCK', payload: newStock })
      const record: StockRecord = {
        id: `stock-rec-${Date.now()}-${item.productId}`,
        time,
        productId: item.productId,
        productName: item.productName,
        storeId: transfer.toStoreId,
        storeName: transfer.toStoreName,
        type: 'in',
        quantity: item.actualInboundQuantity,
        beforeQuantity: beforeQty,
        afterQuantity: beforeQty + item.actualInboundQuantity,
        operator: state.currentUser.name,
        relatedOrderNo: transfer.transferNo,
        remark: '门店调拨入库',
      }
      dispatch({ type: 'ADD_STOCK_RECORD', payload: record })
    }

    const updatedTransfer: Transfer = {
      ...transfer,
      status: 'completed',
      items: actualItems,
      actualInboundTime: time,
      statusLogs: [
        ...transfer.statusLogs,
        {
          id: `tlog-${Date.now()}`,
          status: 'completed',
          time,
          operator: state.currentUser.name,
          remark: remark || '已确认入库，调拨完成',
        },
      ],
    }
    dispatch({ type: 'UPDATE_TRANSFER', payload: updatedTransfer })
    return { success: true, message: '入库成功，调拨已完成' }
  }

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        completeOrderPickup,
        processOrderDelay,
        processOrderFailed,
        processStockIn,
        processStockAdjust,
        updateOrderRemark,
        addContactRecord,
        createOrder,
        updateOrderInfo,
        cancelOrder,
        getProductStocks,
        getWarningProducts,
        getOrdersAffectedByStock,
        createTransfer,
        approveTransfer,
        rejectTransfer,
        processTransferOutbound,
        processTransferInTransit,
        processTransferInbound,
        getStoreAvailableStock,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider')
  }
  return ctx
}
