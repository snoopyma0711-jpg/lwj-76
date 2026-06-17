import express, { Request, Response } from 'express'
import cors from 'cors'
import * as db from './db'
import type { ApiResponse } from './types'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

const ok = <T = any>(res: Response, data?: T, message = 'success') => {
  const body: ApiResponse<T> = { success: true, message, data }
  res.json(body)
}

const fail = (res: Response, message: string, status = 400) => {
  const body: ApiResponse = { success: false, message }
  res.status(status).json(body)
}

const OPERATOR_HEADER = 'x-operator'
const getOperator = (req: Request) => {
  return (req.headers[OPERATOR_HEADER] as string) || '系统'
}

app.get('/api/health', (_req, res) => {
  ok(res, { status: 'ok', time: new Date().toISOString() }, '服务运行正常')
})

app.get('/api/stores', (_req, res) => {
  ok(res, db.getStores())
})

app.get('/api/products', (req, res) => {
  const { category, keyword } = req.query
  ok(res, db.getProducts(category as string | undefined, keyword as string | undefined))
})

app.get('/api/stocks', (req, res) => {
  const { storeId, productId } = req.query
  ok(res, db.getStocks(storeId as string | undefined, productId as string | undefined))
})

app.get('/api/stock-records', (req, res) => {
  const { storeId, productId } = req.query
  ok(res, db.getStockRecords(storeId as string | undefined, productId as string | undefined))
})

app.post('/api/stocks/in', (req, res) => {
  const { productId, storeId, quantity, remark } = req.body || {}
  const result = db.processStockIn({
    productId,
    storeId,
    quantity: Number(quantity),
    operator: getOperator(req),
    remark,
  })
  if (result.success) ok(res, null, result.message)
  else fail(res, result.message)
})

app.post('/api/stocks/adjust', (req, res) => {
  const { productId, storeId, quantity, remark } = req.body || {}
  const result = db.processStockAdjust({
    productId,
    storeId,
    quantity: Number(quantity),
    operator: getOperator(req),
    remark,
  })
  if (result.success) ok(res, null, result.message)
  else fail(res, result.message)
})

app.get('/api/orders', (req, res) => {
  const { keyword, status, storeId, startDate, endDate } = req.query
  const orders = db.getOrders({
    keyword: keyword as string,
    status: status as any,
    storeId: storeId as string,
    startDate: startDate as string,
    endDate: endDate as string,
  })
  ok(res, orders)
})

app.get('/api/orders/:id', (req, res) => {
  const order = db.getOrderById(req.params.id)
  if (!order) return fail(res, '订单不存在', 404)
  ok(res, order)
})

app.get('/api/orders/by-no/:orderNo', (req, res) => {
  const order = db.getOrderByNo(req.params.orderNo)
  if (!order) return fail(res, '订单不存在', 404)
  ok(res, order)
})

app.post('/api/orders', (req, res) => {
  const { storeId, items, contactName, contactPhone, scheduledPickupTime, remark } = req.body || {}
  const result = db.createOrder({
    storeId,
    items,
    contactName,
    contactPhone,
    scheduledPickupTime,
    remark,
    operator: getOperator(req),
  })
  if (result.success) ok(res, result.data, result.message)
  else fail(res, result.message)
})

app.put('/api/orders/:id/info', (req, res) => {
  const { contactName, contactPhone, scheduledPickupTime, remark } = req.body || {}
  const result = db.updateOrderInfo({
    orderId: req.params.id,
    contactName,
    contactPhone,
    scheduledPickupTime,
    remark,
    operator: getOperator(req),
  })
  if (result.success) ok(res, null, result.message)
  else fail(res, result.message)
})

app.put('/api/orders/:id/remark', (req, res) => {
  const { remark } = req.body || {}
  const result = db.updateOrderRemark(req.params.id, remark || '', getOperator(req))
  if (result.success) ok(res, null, result.message)
  else fail(res, result.message)
})

app.post('/api/orders/:id/contact', (req, res) => {
  const { type, content } = req.body || {}
  const result = db.addContactRecord({
    orderId: req.params.id,
    type,
    content,
    operator: getOperator(req),
  })
  if (result.success) ok(res, null, result.message)
  else fail(res, result.message)
})

app.put('/api/orders/:id/delay', (req, res) => {
  const { newScheduledTime, remark } = req.body || {}
  const result = db.processOrderDelay({
    orderId: req.params.id,
    newScheduledTime,
    remark,
    operator: getOperator(req),
  })
  if (result.success) ok(res, null, result.message)
  else fail(res, result.message)
})

app.put('/api/orders/:id/failed', (req, res) => {
  const { remark } = req.body || {}
  const result = db.processOrderFailed({
    orderId: req.params.id,
    remark,
    operator: getOperator(req),
  })
  if (result.success) ok(res, null, result.message)
  else fail(res, result.message)
})

app.put('/api/orders/:id/cancel', (req, res) => {
  const { reason } = req.body || {}
  const result = db.cancelOrder({
    orderId: req.params.id,
    reason: reason || '',
    operator: getOperator(req),
  })
  if (result.success) ok(res, null, result.message)
  else fail(res, result.message)
})

app.post('/api/orders/:id/pickup', (req, res) => {
  const { pickupPerson, pickupPersonIdCard, itemsActual } = req.body || {}
  const result = db.completeOrderPickup({
    orderId: req.params.id,
    pickupPerson,
    pickupPersonIdCard,
    itemsActual,
    operator: getOperator(req),
  })
  if (result.success) ok(res, null, result.message)
  else fail(res, result.message)
})

app.get('/api/stats/summary', (_req, res) => {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const orders = db.getDb().orders
  const todayNew = orders.filter((o) => o.createdAt.slice(0, 10) === todayStr).length
  const pending = orders.filter((o) => ['pending', 'confirmed', 'ready', 'delayed'].includes(o.status)).length
  const overdue = orders.filter(
    (o) =>
      ['pending', 'confirmed', 'ready', 'delayed'].includes(o.status) &&
      new Date(o.scheduledPickupTime).getTime() < Date.now(),
  ).length
  const completedToday = orders.filter((o) => o.status === 'picked_up' && o.actualPickupTime?.slice(0, 10) === todayStr).length

  const warningProducts = new Set<string>()
  const stocks = db.getStocks()
  for (const s of stocks) {
    if (s.quantity <= s.warningThreshold) {
      warningProducts.add(s.productId)
    }
  }
  const warningCount = warningProducts.size

  const stores = db.getStores()
  const storeStats = stores.map((s) => {
    const sOrders = orders.filter((o) => o.storeId === s.id)
    const completed = sOrders.filter((o) => o.status === 'picked_up' || o.status === 'partial').length
    const total = sOrders.length
    const rate = total === 0 ? 0 : Math.round((completed / total) * 10000) / 100
    return { ...s, completed, total, completionRate: rate, pendingCount: sOrders.filter((o) => ['pending', 'confirmed', 'ready', 'delayed'].includes(o.status)).length }
  })

  const trend = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    trend.push({
      date: ds,
      newOrders: orders.filter((o) => o.createdAt.slice(0, 10) === ds).length,
      completed: orders.filter((o) => o.actualPickupTime?.slice(0, 10) === ds && (o.status === 'picked_up' || o.status === 'partial')).length,
    })
  }

  ok(res, {
    todayNew,
    pending,
    overdue,
    completedToday,
    warningCount,
    storeStats,
    trend,
  })
})

app.use((_req, res) => {
  fail(res, '接口不存在', 404)
})

app.listen(PORT, () => {
  console.log(`🚀 到店自提后端服务启动成功`)
  console.log(`📍 服务地址: http://localhost:${PORT}`)
  console.log(`🔍 健康检查: http://localhost:${PORT}/api/health`)
})
