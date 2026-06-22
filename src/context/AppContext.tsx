import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'
import type { AppState, AppAction, Order, StoreStock, StockRecord, Product, Transfer, TransferType, TransferStatus, TransferItem, Purchase, PurchaseStatus, Supplier, PaymentRecord, PaymentMethod, InventoryCheck, InventoryCheckScope } from '../types'
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
  suppliers: [],
  purchases: [],
  inventoryChecks: [],
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
    case 'SET_SUPPLIERS': {
      return { ...state, suppliers: action.payload }
    }
    case 'SET_PURCHASES': {
      return { ...state, purchases: action.payload }
    }
    case 'ADD_PURCHASE': {
      return {
        ...state,
        purchases: [action.payload, ...state.purchases],
      }
    }
    case 'UPDATE_PURCHASE': {
      return {
        ...state,
        purchases: state.purchases.map((p) =>
          p.id === action.payload.id ? action.payload : p,
        ),
      }
    }
    case 'SET_INVENTORY_CHECKS': {
      return { ...state, inventoryChecks: action.payload }
    }
    case 'ADD_INVENTORY_CHECK': {
      return {
        ...state,
        inventoryChecks: [action.payload, ...state.inventoryChecks],
      }
    }
    case 'UPDATE_INVENTORY_CHECK': {
      return {
        ...state,
        inventoryChecks: state.inventoryChecks.map((c) =>
          c.id === action.payload.id ? action.payload : c,
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
  }) => Promise<{ success: boolean; message: string; transfer?: Transfer }>
  approveTransfer: (params: {
    transfer: Transfer
    remark?: string
  }) => Promise<{ success: boolean; message: string }>
  rejectTransfer: (params: {
    transfer: Transfer
    reason: string
  }) => Promise<{ success: boolean; message: string }>
  processTransferOutbound: (params: {
    transfer: Transfer
    itemsActual?: { productId: string; actualQuantity: number }[]
    remark?: string
  }) => Promise<{ success: boolean; message: string }>
  processTransferInTransit: (params: {
    transfer: Transfer
    remark?: string
  }) => Promise<{ success: boolean; message: string }>
  processTransferInbound: (params: {
    transfer: Transfer
    itemsActual?: { productId: string; actualQuantity: number }[]
    remark?: string
  }) => Promise<{ success: boolean; message: string }>
  getStoreAvailableStock: (storeId: string, productId: string) => number
  refreshPurchases: () => Promise<void>
  refreshSuppliers: () => Promise<void>
  createPurchase: (params: {
    supplierId: string
    storeId: string
    items: { productId: string; quantity: number; unitPrice: number }[]
    expectedArrivalTime: string
    reason: string
  }) => Promise<{ success: boolean; message: string; purchase?: Purchase }>
  approvePurchase: (params: {
    purchase: Purchase
    remark?: string
  }) => Promise<{ success: boolean; message: string; data?: Purchase }>
  rejectPurchase: (params: {
    purchase: Purchase
    reason: string
  }) => Promise<{ success: boolean; message: string; data?: Purchase }>
  placePurchaseOrder: (params: {
    purchase: Purchase
    remark?: string
  }) => Promise<{ success: boolean; message: string; data?: Purchase }>
  receivePurchaseItem: (params: {
    purchase: Purchase
    items: { purchaseItemId: string; quantity: number; differenceReason?: string }[]
    remark?: string
  }) => Promise<{ success: boolean; message: string; data?: Purchase }>
  cancelPurchase: (params: {
    purchase: Purchase
    reason: string
  }) => Promise<{ success: boolean; message: string; data?: Purchase }>
  reconcilePurchase: (params: {
    purchase: Purchase
    remark?: string
  }) => Promise<{ success: boolean; message: string; data?: Purchase }>
  createPaymentRecord: (params: {
    purchase: Purchase
    amount: number
    paymentTime: string
    paymentMethod: PaymentMethod
    remark?: string
  }) => Promise<{ success: boolean; message: string; data?: { payment: PaymentRecord; purchase: Purchase } }>
  refreshInventoryChecks: () => Promise<void>
  createInventoryCheck: (params: {
    storeId: string
    scope: InventoryCheckScope
    scopeCategory?: string
    productIds?: string[]
    scheduledTime: string
    remark?: string
  }) => Promise<{ success: boolean; message: string; data?: InventoryCheck }>
  startInventoryCheck: (check: InventoryCheck) => Promise<{ success: boolean; message: string; data?: InventoryCheck }>
  saveInventoryCheckProgress: (params: {
    check: InventoryCheck
    items: { productId: string; actualQuantity: number | null }[]
  }) => Promise<{ success: boolean; message: string; data?: InventoryCheck }>
  confirmInventoryCheck: (check: InventoryCheck) => Promise<{ success: boolean; message: string; data?: InventoryCheck }>
  handleInventoryCheckDiscrepancy: (params: {
    check: InventoryCheck
    productId: string
    handleReason: string
  }) => Promise<{ success: boolean; message: string; data?: InventoryCheck }>
  cancelInventoryCheck: (params: {
    check: InventoryCheck
    reason: string
  }) => Promise<{ success: boolean; message: string; data?: InventoryCheck }>
  submitForReview: (check: InventoryCheck) => Promise<{ success: boolean; message: string; data?: InventoryCheck }>
  reviewInventoryCheck: (params: {
    check: InventoryCheck
    reviewConclusion: 'passed' | 'rejected'
    reviewRemark: string
    rejectReason?: string
  }) => Promise<{ success: boolean; message: string; data?: InventoryCheck }>
  getInventoryCheckExportData: (check: InventoryCheck) => Promise<{ success: boolean; message: string; data?: any }>
  exportInventoryCheck: (check: InventoryCheck) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      const [storesRes, productsRes, ordersRes, stocksRes, stockRecordsRes, transfersRes, suppliersRes, purchasesRes, inventoryChecksRes] = await Promise.allSettled([
        api.getStores(),
        api.getProducts(),
        api.getOrders(),
        api.getStocks(),
        api.getStockRecords(),
        api.getTransfers(),
        api.getSuppliers(),
        api.getPurchases(),
        api.getInventoryChecks(),
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
      if (transfersRes.status === 'fulfilled' && transfersRes.value.success && transfersRes.value.data) {
        dispatch({ type: 'SET_TRANSFERS', payload: transfersRes.value.data })
      }
      if (suppliersRes.status === 'fulfilled' && suppliersRes.value.success && suppliersRes.value.data) {
        dispatch({ type: 'SET_SUPPLIERS', payload: suppliersRes.value.data })
      }
      if (purchasesRes.status === 'fulfilled' && purchasesRes.value.success && purchasesRes.value.data) {
        dispatch({ type: 'SET_PURCHASES', payload: purchasesRes.value.data })
      }
      if (inventoryChecksRes.status === 'fulfilled' && inventoryChecksRes.value.success && inventoryChecksRes.value.data) {
        dispatch({ type: 'SET_INVENTORY_CHECKS', payload: inventoryChecksRes.value.data })
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

  const refreshTransfers = async () => {
    const res = await api.getTransfers()
    if (res.success && res.data) {
      dispatch({ type: 'SET_TRANSFERS', payload: res.data })
    }
  }

  const refreshStocksAndRecords = async () => {
    const [stocksRes, recordsRes] = await Promise.all([api.getStocks(), api.getStockRecords()])
    if (stocksRes.success && stocksRes.data) {
      dispatch({ type: 'SET_STOCKS', payload: stocksRes.data })
    }
    if (recordsRes.success && recordsRes.data) {
      dispatch({ type: 'SET_STOCK_RECORDS', payload: recordsRes.data })
    }
  }

  const getStoreAvailableStock: AppContextValue['getStoreAvailableStock'] = (storeId, productId) => {
    const stock = state.stocks.find((s) => s.storeId === storeId && s.productId === productId)
    return stock ? stock.quantity - stock.lockedQuantity : 0
  }

  const createTransfer: AppContextValue['createTransfer'] = async ({
    type,
    fromStoreId,
    toStoreId,
    items,
    reason,
    expectedArrivalTime,
  }) => {
    const res = await api.createTransfer({ type, fromStoreId, toStoreId, items, reason, expectedArrivalTime })
    if (res.success && res.data) {
      dispatch({ type: 'ADD_TRANSFER', payload: res.data })
      return { success: true, message: res.message, transfer: res.data }
    }
    return { success: false, message: res.message }
  }

  const approveTransfer: AppContextValue['approveTransfer'] = async ({ transfer, remark }) => {
    const res = await api.approveTransfer(transfer.id, { remark })
    if (res.success) {
      await refreshTransfers()
      return { success: true, message: res.message }
    }
    return { success: false, message: res.message }
  }

  const rejectTransfer: AppContextValue['rejectTransfer'] = async ({ transfer, reason }) => {
    const res = await api.rejectTransfer(transfer.id, { reason })
    if (res.success) {
      await refreshTransfers()
      return { success: true, message: res.message }
    }
    return { success: false, message: res.message }
  }

  const processTransferOutbound: AppContextValue['processTransferOutbound'] = async ({
    transfer,
    itemsActual,
    remark,
  }) => {
    const res = await api.processTransferOutbound(transfer.id, { itemsActual, remark })
    if (res.success) {
      await Promise.all([refreshTransfers(), refreshStocksAndRecords()])
      return { success: true, message: res.message }
    }
    return { success: false, message: res.message }
  }

  const processTransferInTransit: AppContextValue['processTransferInTransit'] = async ({ transfer, remark }) => {
    const res = await api.processTransferInTransit(transfer.id, { remark })
    if (res.success) {
      await refreshTransfers()
      return { success: true, message: res.message }
    }
    return { success: false, message: res.message }
  }

  const processTransferInbound: AppContextValue['processTransferInbound'] = async ({
    transfer,
    itemsActual,
    remark,
  }) => {
    const res = await api.processTransferInbound(transfer.id, { itemsActual, remark })
    if (res.success) {
      await Promise.all([refreshTransfers(), refreshStocksAndRecords()])
      return { success: true, message: res.message }
    }
    return { success: false, message: res.message }
  }

  const refreshPurchases: AppContextValue['refreshPurchases'] = async () => {
    const res = await api.getPurchases()
    if (res.success && res.data) {
      dispatch({ type: 'SET_PURCHASES', payload: res.data })
    }
  }

  const refreshSuppliers: AppContextValue['refreshSuppliers'] = async () => {
    const res = await api.getSuppliers()
    if (res.success && res.data) {
      dispatch({ type: 'SET_SUPPLIERS', payload: res.data })
    }
  }

  const createPurchase: AppContextValue['createPurchase'] = async ({
    supplierId,
    storeId,
    items,
    expectedArrivalTime,
    reason,
  }) => {
    const res = await api.createPurchase({ supplierId, storeId, items, expectedArrivalTime, reason })
    if (res.success && res.data) {
      dispatch({ type: 'ADD_PURCHASE', payload: res.data })
      return { success: true, message: res.message, purchase: res.data }
    }
    return { success: false, message: res.message }
  }

  const approvePurchase: AppContextValue['approvePurchase'] = async ({ purchase, remark }) => {
    const res = await api.approvePurchase(purchase.id, { remark })
    if (res.success) {
      if (res.data) {
        dispatch({ type: 'UPDATE_PURCHASE', payload: res.data })
      } else {
        await refreshPurchases()
      }
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const rejectPurchase: AppContextValue['rejectPurchase'] = async ({ purchase, reason }) => {
    const res = await api.rejectPurchase(purchase.id, { reason })
    if (res.success) {
      if (res.data) {
        dispatch({ type: 'UPDATE_PURCHASE', payload: res.data })
      } else {
        await refreshPurchases()
      }
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const placePurchaseOrder: AppContextValue['placePurchaseOrder'] = async ({ purchase, remark }) => {
    const res = await api.placePurchaseOrder(purchase.id, { remark })
    if (res.success) {
      if (res.data) {
        dispatch({ type: 'UPDATE_PURCHASE', payload: res.data })
      } else {
        await refreshPurchases()
      }
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const receivePurchaseItem: AppContextValue['receivePurchaseItem'] = async ({
    purchase,
    items,
    remark,
  }) => {
    const res = await api.receivePurchaseItem(purchase.id, { items, remark })
    if (res.success) {
      if (res.data) {
        dispatch({ type: 'UPDATE_PURCHASE', payload: res.data })
      }
      await refreshStocksAndRecords()
      if (!res.data) {
        await refreshPurchases()
      }
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const cancelPurchase: AppContextValue['cancelPurchase'] = async ({ purchase, reason }) => {
    const res = await api.cancelPurchase(purchase.id, { reason })
    if (res.success) {
      if (res.data) {
        dispatch({ type: 'UPDATE_PURCHASE', payload: res.data })
      } else {
        await refreshPurchases()
      }
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const reconcilePurchase: AppContextValue['reconcilePurchase'] = async ({ purchase, remark }) => {
    const res = await api.reconcilePurchase(purchase.id, { remark })
    if (res.success) {
      if (res.data) {
        dispatch({ type: 'UPDATE_PURCHASE', payload: res.data })
      } else {
        await refreshPurchases()
      }
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const createPaymentRecord: AppContextValue['createPaymentRecord'] = async ({ purchase, amount, paymentTime, paymentMethod, remark }) => {
    const res = await api.createPaymentRecord(purchase.id, { amount, paymentTime, paymentMethod, remark })
    if (res.success && res.data) {
      dispatch({ type: 'UPDATE_PURCHASE', payload: res.data.purchase })
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const refreshInventoryChecks: AppContextValue['refreshInventoryChecks'] = async () => {
    const res = await api.getInventoryChecks()
    if (res.success && res.data) {
      dispatch({ type: 'SET_INVENTORY_CHECKS', payload: res.data })
    }
  }

  const refreshInventoryCheckStocks = async () => {
    const [stocksRes, recordsRes] = await Promise.all([api.getStocks(), api.getStockRecords()])
    if (stocksRes.success && stocksRes.data) {
      dispatch({ type: 'SET_STOCKS', payload: stocksRes.data })
    }
    if (recordsRes.success && recordsRes.data) {
      dispatch({ type: 'SET_STOCK_RECORDS', payload: recordsRes.data })
    }
  }

  const createInventoryCheck: AppContextValue['createInventoryCheck'] = async (params) => {
    const res = await api.createInventoryCheck(params)
    if (res.success && res.data) {
      dispatch({ type: 'ADD_INVENTORY_CHECK', payload: res.data })
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const startInventoryCheck: AppContextValue['startInventoryCheck'] = async (check) => {
    const res = await api.startInventoryCheck(check.id)
    if (res.success && res.data) {
      dispatch({ type: 'UPDATE_INVENTORY_CHECK', payload: res.data })
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const saveInventoryCheckProgress: AppContextValue['saveInventoryCheckProgress'] = async ({ check, items }) => {
    const res = await api.saveInventoryCheckProgress(check.id, { items })
    if (res.success && res.data) {
      dispatch({ type: 'UPDATE_INVENTORY_CHECK', payload: res.data })
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const confirmInventoryCheck: AppContextValue['confirmInventoryCheck'] = async (check) => {
    const res = await api.confirmInventoryCheck(check.id)
    if (res.success && res.data) {
      dispatch({ type: 'UPDATE_INVENTORY_CHECK', payload: res.data })
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const handleInventoryCheckDiscrepancy: AppContextValue['handleInventoryCheckDiscrepancy'] = async ({ check, productId, handleReason }) => {
    const res = await api.handleInventoryCheckDiscrepancy(check.id, { productId, handleReason })
    if (res.success && res.data) {
      dispatch({ type: 'UPDATE_INVENTORY_CHECK', payload: res.data })
      await refreshInventoryCheckStocks()
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const cancelInventoryCheck: AppContextValue['cancelInventoryCheck'] = async ({ check, reason }) => {
    const res = await api.cancelInventoryCheck(check.id, reason)
    if (res.success && res.data) {
      dispatch({ type: 'UPDATE_INVENTORY_CHECK', payload: res.data })
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const submitForReview: AppContextValue['submitForReview'] = async (check) => {
    const res = await api.submitForReview(check.id)
    if (res.success && res.data) {
      dispatch({ type: 'UPDATE_INVENTORY_CHECK', payload: res.data })
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const reviewInventoryCheck: AppContextValue['reviewInventoryCheck'] = async ({ check, reviewConclusion, reviewRemark, rejectReason }) => {
    const res = await api.reviewInventoryCheck(check.id, { reviewConclusion, reviewRemark, rejectReason })
    if (res.success && res.data) {
      dispatch({ type: 'UPDATE_INVENTORY_CHECK', payload: res.data })
      await refreshInventoryCheckStocks()
      return { success: true, message: res.message, data: res.data }
    }
    return { success: false, message: res.message }
  }

  const getInventoryCheckExportData: AppContextValue['getInventoryCheckExportData'] = async (check) => {
    const res = await api.getInventoryCheckExportData(check.id)
    return res
  }

  const exportInventoryCheck: AppContextValue['exportInventoryCheck'] = (check) => {
    void (async () => {
      const res = await getInventoryCheckExportData(check)
      if (!res.success || !res.data) {
        return
      }
      const data = res.data

      const esc = (v: any) => {
        if (v === null || v === undefined) return ''
        const s = String(v)
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"'
        }
        return s
      }

      const lines: string[] = []

      lines.push('=== 门店盘点报告 ===')
      lines.push('')
      lines.push('【基本信息】')
      lines.push(`盘点编号,${esc(data.basicInfo.checkNo)}`)
      lines.push(`门店,${esc(data.basicInfo.storeName)}`)
      lines.push(`盘点范围,${esc(data.basicInfo.scope === 'full' ? '全店盘点' : data.basicInfo.scope === 'category' ? '分类盘点' : '部分盘点')}`)
      if (data.basicInfo.scopeCategory) {
        lines.push(`盘点分类,${esc(data.basicInfo.scopeCategory)}`)
      }
      lines.push(`计划时间,${esc(data.basicInfo.scheduledTime)}`)
      lines.push(`开始时间,${esc(data.basicInfo.startedTime || '-')}`)
      lines.push(`完成时间,${esc(data.basicInfo.completedTime || '-')}`)
      lines.push(`创建时间,${esc(data.basicInfo.createdAt)}`)
      lines.push(`创建人,${esc(data.basicInfo.createdBy)}`)
      lines.push(`盘点状态,${esc(data.basicInfo.status === 'pending' ? '待开始' : data.basicInfo.status === 'checking' ? '盘点中' : data.basicInfo.status === 'pending_confirm' ? '待确认' : data.basicInfo.status === 'completed' ? '已完成' : '已取消')}`)
      if (data.basicInfo.reviewStatus) {
        lines.push(`复核状态,${esc(data.basicInfo.reviewStatus === 'pending_review' ? '待复核' : data.basicInfo.reviewStatus === 'review_passed' ? '复核通过' : '复核驳回')}`)
      }
      if (data.basicInfo.remark) {
        lines.push(`备注,${esc(data.basicInfo.remark)}`)
      }
      lines.push('')

      lines.push('【盘点汇总】')
      lines.push(`商品总数,${data.itemSummary.totalItems}`)
      lines.push(`数量一致,${data.itemSummary.matchedItems}`)
      lines.push(`差异商品,${data.itemSummary.discrepancyItems}`)
      lines.push(`已处理差异,${data.itemSummary.handledDiscrepancies}`)
      lines.push(`待处理差异,${data.itemSummary.pendingDiscrepancies}`)
      lines.push('')

      lines.push('【商品明细】')
      lines.push('商品名称,SKU,系统数量,实际数量,单位,差异')
      for (const it of data.items) {
        lines.push(`${esc(it.productName)},${esc(it.sku)},${esc(it.systemQuantity)},${esc(it.actualQuantity ?? '-')},${esc(it.unit)},${esc(it.difference ?? '-')}`)
      }
      lines.push('')

      if (data.discrepancies.length > 0) {
        lines.push('【差异明细】')
        lines.push('商品名称,SKU,系统数量,实际数量,差异,单位,处理状态,处理原因,处理人,处理时间')
        for (const d of data.discrepancies) {
          lines.push(`${esc(d.productName)},${esc(d.sku)},${esc(d.systemQuantity)},${esc(d.actualQuantity)},${esc(d.difference)},${esc(d.unit)},${esc(d.handleStatus === 'handled' ? '已处理' : '待处理')},${esc(d.handleReason || '-')},${esc(d.handleOperator || '-')},${esc(d.handleTime || '-')}`)
        }
        lines.push('')
      }

      lines.push('【操作记录】')
      lines.push('状态,时间,操作人,备注')
      for (const log of data.statusLogs) {
        lines.push(`${esc(log.status)},${esc(log.time)},${esc(log.operator)},${esc(log.remark)}`)
      }
      lines.push('')

      if (data.reviewInfo) {
        lines.push('【复核信息】')
        lines.push(`复核人,${esc(data.reviewInfo.reviewer)}`)
        lines.push(`复核时间,${esc(data.reviewInfo.reviewTime)}`)
        lines.push(`复核结论,${esc(data.reviewInfo.reviewConclusion === 'passed' ? '通过' : '驳回')}`)
        lines.push(`复核备注,${esc(data.reviewInfo.reviewRemark)}`)
        if (data.reviewInfo.rejectReason) {
          lines.push(`驳回原因,${esc(data.reviewInfo.rejectReason)}`)
        }
        lines.push('')
      }

      if (data.reviewLogs.length > 0) {
        lines.push('【复核历史】')
        lines.push('复核人,复核时间,复核结论,复核备注,驳回原因')
        for (const log of data.reviewLogs) {
          lines.push(`${esc(log.reviewer)},${esc(log.reviewTime)},${esc(log.reviewConclusion === 'passed' ? '通过' : '驳回')},${esc(log.reviewRemark)},${esc(log.rejectReason || '-')}`)
        }
        lines.push('')
      }

      lines.push(`导出时间,${esc(data.exportTime)}`)
      lines.push(`导出人,${esc(data.exportedBy)}`)

      const csvContent = '\uFEFF' + lines.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `盘点报告_${data.basicInfo.checkNo}_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })()
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
        refreshPurchases,
        refreshSuppliers,
        createPurchase,
        approvePurchase,
        rejectPurchase,
        placePurchaseOrder,
        receivePurchaseItem,
        cancelPurchase,
        reconcilePurchase,
        createPaymentRecord,
        refreshInventoryChecks,
        createInventoryCheck,
        startInventoryCheck,
        saveInventoryCheckProgress,
        confirmInventoryCheck,
        handleInventoryCheckDiscrepancy,
        cancelInventoryCheck,
        submitForReview,
        reviewInventoryCheck,
        getInventoryCheckExportData,
        exportInventoryCheck,
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
