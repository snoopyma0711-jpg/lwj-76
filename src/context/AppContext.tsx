import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import type { AppState, AppAction, Order, StoreStock, StockRecord, Product } from '../types'
import { mockStores, mockProducts, mockOrders, mockStocks, mockStockRecords } from '../data/mockData'

const initialState: AppState = {
  stores: mockStores,
  products: mockProducts,
  orders: mockOrders,
  stocks: mockStocks,
  stockRecords: mockStockRecords,
  currentUser: {
    name: '张店长',
    role: 'manager',
    storeId: 'store-001',
  },
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
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
  getProductStocks: (productId: string) => (StoreStock & { storeName: string })[]
  getWarningProducts: () => (Product & {
    storeWarnings: { storeId: string; storeName: string; quantity: number; threshold: number }[]
    totalQuantity: number
  })[]
  getOrdersAffectedByStock: (productId: string, storeId?: string) => Order[]
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

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
        getProductStocks,
        getWarningProducts,
        getOrdersAffectedByStock,
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
