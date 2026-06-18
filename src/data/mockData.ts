import type { Store, Product, Order, StoreStock, StockRecord, OrderStatus, Transfer, TransferStatus, TransferType } from '../types'

export const mockStores: Store[] = [
  {
    id: 'store-001',
    name: '朝阳大悦城店',
    address: '北京市朝阳区朝阳北路101号大悦城B1层',
    manager: '张伟',
    phone: '010-85551234',
  },
  {
    id: 'store-002',
    name: '海淀中关村店',
    address: '北京市海淀区中关村大街15号',
    manager: '李娜',
    phone: '010-62667890',
  },
  {
    id: 'store-003',
    name: '西城金融街店',
    address: '北京市西城区金融街7号',
    manager: '王芳',
    phone: '010-66554321',
  },
  {
    id: 'store-004',
    name: '东城王府井店',
    address: '北京市东城区王府井大街138号',
    manager: '刘强',
    phone: '010-65128888',
  },
]

export const mockProducts: Product[] = [
  {
    id: 'prod-001',
    sku: 'SKU-A001',
    name: '新鲜草莓礼盒装',
    category: '生鲜水果',
    unit: '盒',
    price: 58.0,
    warningThreshold: 10,
    description: '丹东99草莓，精选大果，2斤装',
  },
  {
    id: 'prod-002',
    sku: 'SKU-A002',
    name: '进口车厘子',
    category: '生鲜水果',
    unit: '箱',
    price: 198.0,
    warningThreshold: 5,
    description: '智利进口JJ级车厘子，2.5kg装',
  },
  {
    id: 'prod-003',
    sku: 'SKU-B001',
    name: '手冲精品咖啡豆',
    category: '咖啡茶饮',
    unit: '袋',
    price: 88.0,
    warningThreshold: 15,
    description: '埃塞俄比亚耶加雪菲，浅烘，200g',
  },
  {
    id: 'prod-004',
    sku: 'SKU-B002',
    name: '日式抹茶粉',
    category: '咖啡茶饮',
    unit: '罐',
    price: 128.0,
    warningThreshold: 8,
    description: '宇治抹茶，茶道级别，30g装',
  },
  {
    id: 'prod-005',
    sku: 'SKU-C001',
    name: '手工巧克力礼盒',
    category: '烘焙甜点',
    unit: '盒',
    price: 168.0,
    warningThreshold: 12,
    description: '比利时进口可可，8口味混合装',
  },
  {
    id: 'prod-006',
    sku: 'SKU-C002',
    name: '现烤芝士蛋糕',
    category: '烘焙甜点',
    unit: '个',
    price: 138.0,
    warningThreshold: 5,
    description: '北海道重芝士，6寸，需提前预订',
  },
  {
    id: 'prod-007',
    sku: 'SKU-D001',
    name: '有机冷榨果汁',
    category: '饮料冲调',
    unit: '瓶',
    price: 32.0,
    warningThreshold: 20,
    description: '混合果蔬汁，NFC冷榨，300ml',
  },
  {
    id: 'prod-008',
    sku: 'SKU-D002',
    name: '精酿啤酒组合',
    category: '饮料冲调',
    unit: '组',
    price: 158.0,
    warningThreshold: 10,
    description: '6种口味精酿啤酒，330ml*6',
  },
  {
    id: 'prod-009',
    sku: 'SKU-E001',
    name: '和牛雪花牛排',
    category: '肉禽蛋品',
    unit: '份',
    price: 288.0,
    warningThreshold: 6,
    description: 'A5级和牛，200g装，附调味包',
  },
  {
    id: 'prod-010',
    sku: 'SKU-E002',
    name: '挪威三文鱼',
    category: '海鲜水产',
    unit: '份',
    price: 128.0,
    warningThreshold: 8,
    description: '冰鲜三文鱼中段，500g装',
  },
]

const productMap = mockProducts.reduce((acc, p) => {
  acc[p.id] = p
  return acc
}, {} as Record<string, Product>)

const storeMap = mockStores.reduce((acc, s) => {
  acc[s.id] = s
  return acc
}, {} as Record<string, Store>)

const contactNames = ['李明', '王磊', '张小红', '刘洋', '陈静', '杨帆', '赵雪', '孙浩', '周琳', '吴迪',
  '郑涛', '冯娜', '蒋勇', '沈燕', '韩梅', '黄晓明', '董洁', '肖战', '王一博', '杨紫']
const staffNames = ['店员小王', '店员小李', '店员小张', '店长张伟', '店长李娜']

function randomPhone(): string {
  const prefixes = ['138', '139', '136', '137', '150', '151', '152', '158', '188', '186']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  let num = ''
  for (let i = 0; i < 8; i++) {
    num += Math.floor(Math.random() * 10)
  }
  return prefix + num
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000)
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
}

const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

function generateOrder(
  idx: number,
  dayOffset: number,
  hour: number,
  status: OrderStatus,
  storeId: string,
): Order {
  const createDate = addHours(addDays(today, dayOffset), hour)
  const scheduledDate = addHours(createDate, 2 + Math.floor(Math.random() * 6))

  const numItems = 1 + Math.floor(Math.random() * 3)
  const items = []
  const usedProducts = new Set<string>()
  let total = 0

  for (let i = 0; i < numItems; i++) {
    let prod: Product
    do {
      prod = mockProducts[Math.floor(Math.random() * mockProducts.length)]
    } while (usedProducts.has(prod.id))
    usedProducts.add(prod.id)

    const qty = 1 + Math.floor(Math.random() * 4)
    total += prod.price * qty

    let actualQty: number | undefined
    if (status === 'partial') {
      actualQty = Math.max(0, qty - Math.floor(Math.random() * qty))
    }

    items.push({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      quantity: qty,
      unitPrice: prod.price,
      actualQuantity: actualQty,
    })
  }

  const orderNo = `TP${formatDate(createDate).slice(0, 10).replace(/-/g, '')}${String(idx).padStart(4, '0')}`

  const contactIdx = Math.floor(Math.random() * contactNames.length)
  const contactName = contactNames[contactIdx]
  const contactPhone = randomPhone()

  const statusLogs = []
  const baseTime = createDate

  const initialLog = {
    id: `log-${idx}-0`,
    status: 'pending' as OrderStatus,
    time: formatDate(baseTime),
    operator: '系统',
    remark: '用户提交订单',
  }
  statusLogs.push(initialLog)

  if (status !== 'pending') {
    statusLogs.push({
      id: `log-${idx}-1`,
      status: 'confirmed',
      time: formatDate(addHours(baseTime, 0.1)),
      operator: staffNames[Math.floor(Math.random() * staffNames.length)],
      remark: '门店已确认接单',
    })
  }

  if (['ready', 'picked_up', 'delayed', 'failed', 'partial'].includes(status)) {
    statusLogs.push({
      id: `log-${idx}-2`,
      status: 'ready',
      time: formatDate(addHours(baseTime, 0.5)),
      operator: staffNames[Math.floor(Math.random() * staffNames.length)],
      remark: '商品已备好，等待顾客自提',
    })
  }

  let actualPickupTime: string | undefined
  let pickupPerson: string | undefined
  let pickupPersonIdCard: string | undefined

  if (status === 'picked_up' || status === 'partial') {
    const pickupTime = addHours(scheduledDate, Math.random() > 0.5 ? 0.5 : -0.2)
    actualPickupTime = formatDate(pickupTime)
    pickupPerson = Math.random() > 0.3 ? contactName : contactNames[Math.floor(Math.random() * contactNames.length)]
    pickupPersonIdCard = '110101********' + String(Math.floor(Math.random() * 10000)).padStart(4, '0')

    statusLogs.push({
      id: `log-${idx}-3`,
      status: status,
      time: actualPickupTime,
      operator: staffNames[Math.floor(Math.random() * staffNames.length)],
      remark: status === 'partial' ? '部分商品缺货，已完成部分取货' : '顾客已完成自提',
    })
  }

  if (status === 'delayed') {
    statusLogs.push({
      id: `log-${idx}-3`,
      status: 'delayed',
      time: formatDate(addHours(scheduledDate, 3)),
      operator: staffNames[Math.floor(Math.random() * staffNames.length)],
      remark: '顾客来电申请延期，已确认新的取货时间',
    })
  }

  if (status === 'failed') {
    statusLogs.push({
      id: `log-${idx}-3`,
      status: 'failed',
      time: formatDate(addHours(scheduledDate, 24)),
      operator: staffNames[Math.floor(Math.random() * staffNames.length)],
      remark: '顾客超时未取货，联系不上，自提失败',
    })
  }

  if (status === 'cancelled') {
    statusLogs.push({
      id: `log-${idx}-2`,
      status: 'cancelled',
      time: formatDate(addHours(baseTime, 1)),
      operator: staffNames[Math.floor(Math.random() * staffNames.length)],
      remark: '顾客申请取消订单，已同意',
    })
  }

  const contactRecords = []
  if (Math.random() > 0.4) {
    const types: Array<'phone' | 'sms' | 'wechat' | 'onsite'> = ['phone', 'sms', 'wechat', 'onsite']
    contactRecords.push({
      id: `cr-${idx}-0`,
      time: formatDate(addHours(baseTime, 0.3)),
      type: types[Math.floor(Math.random() * types.length)],
      operator: staffNames[Math.floor(Math.random() * staffNames.length)],
      content: '已电话确认订单信息和取货时间，顾客已知晓',
    })
  }

  if (status === 'delayed' || status === 'failed') {
    contactRecords.push({
      id: `cr-${idx}-1`,
      time: formatDate(addHours(scheduledDate, 1)),
      type: 'phone',
      operator: staffNames[Math.floor(Math.random() * staffNames.length)],
      content: status === 'delayed'
        ? '顾客表示今天无法来取货，申请延期到明天下午'
        : '多次拨打顾客电话无人接听，已发送短信提醒',
    })
  }

  const order: Order = {
    id: `order-${String(idx).padStart(5, '0')}`,
    orderNo,
    createdAt: formatDate(createDate),
    storeId,
    storeName: storeMap[storeId].name,
    items,
    totalAmount: Math.round(total * 100) / 100,
    contactName,
    contactPhone,
    scheduledPickupTime: formatDate(scheduledDate),
    actualPickupTime,
    pickupPerson,
    pickupPersonIdCard,
    status,
    remark: Math.random() > 0.7 ? '请提前备好货，顾客到店即取' : undefined,
    contactRecords: contactRecords as Order['contactRecords'],
    statusLogs: statusLogs as Order['statusLogs'],
    operator: staffNames[Math.floor(Math.random() * staffNames.length)],
  }

  return order
}

function generateMockOrders(): Order[] {
  const orders: Order[] = []
  let idx = 1

  const statusDistribution: OrderStatus[] = [
    'pending', 'pending',
    'confirmed', 'confirmed', 'confirmed',
    'ready', 'ready', 'ready', 'ready',
    'picked_up', 'picked_up', 'picked_up', 'picked_up', 'picked_up', 'picked_up',
    'delayed',
    'failed',
    'cancelled',
    'partial',
  ]

  for (let dayOffset = -6; dayOffset <= 0; dayOffset++) {
    const ordersPerDay = dayOffset === 0 ? 18 : 12 + Math.floor(Math.random() * 8)
    for (let i = 0; i < ordersPerDay; i++) {
      const storeId = mockStores[Math.floor(Math.random() * mockStores.length)].id
      const hour = 9 + Math.floor(Math.random() * 10)
      const status = dayOffset === 0 && i < 5
        ? (['pending', 'confirmed', 'ready'] as OrderStatus[])[Math.floor(Math.random() * 3)]
        : statusDistribution[Math.floor(Math.random() * statusDistribution.length)]

      orders.push(generateOrder(idx, dayOffset, hour, status, storeId))
      idx++
    }
  }

  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const mockOrders: Order[] = generateMockOrders()

function generateMockStocks(): StoreStock[] {
  const stocks: StoreStock[] = []
  const productIds = mockProducts.map(p => p.id)
  const storeIds = mockStores.map(s => s.id)

  for (const storeId of storeIds) {
    for (const productId of productIds) {
      const threshold = productMap[productId].warningThreshold
      let qty: number
      const rand = Math.random()

      if (rand < 0.15) {
        qty = Math.floor(Math.random() * threshold)
      } else if (rand < 0.3) {
        qty = threshold + Math.floor(Math.random() * 5)
      } else {
        qty = threshold + 5 + Math.floor(Math.random() * 25)
      }

      const locked = Math.floor(Math.random() * Math.min(qty, 6))
      stocks.push({
        productId,
        storeId,
        quantity: qty,
        lockedQuantity: locked,
        updatedAt: formatDate(new Date(Date.now() - Math.random() * 86400000 * 3)),
      })
    }
  }

  return stocks
}

export const mockStocks: StoreStock[] = generateMockStocks()

function generateMockStockRecords(): StockRecord[] {
  const records: StockRecord[] = []
  const storeIds = mockStores.map(s => s.id)
  let ridx = 1

  const recentOrders = mockOrders.slice(0, 60).filter(o => o.status === 'picked_up' || o.status === 'partial')

  for (const order of recentOrders) {
    for (const item of order.items) {
      const stock = mockStocks.find(s => s.storeId === order.storeId && s.productId === item.productId)
      if (!stock) continue
      const actQty = item.actualQuantity ?? item.quantity
      if (actQty <= 0) continue

      records.push({
        id: `stock-rec-${String(ridx).padStart(5, '0')}`,
        time: order.actualPickupTime ?? order.createdAt,
        productId: item.productId,
        productName: item.productName,
        storeId: order.storeId,
        storeName: order.storeName,
        type: 'out',
        quantity: actQty,
        beforeQuantity: stock.quantity + actQty,
        afterQuantity: stock.quantity,
        operator: staffNames[Math.floor(Math.random() * staffNames.length)],
        relatedOrderNo: order.orderNo,
        remark: '订单自提出库',
      })
      ridx++
    }
  }

  for (let i = 0; i < 25; i++) {
    const storeId = storeIds[Math.floor(Math.random() * storeIds.length)]
    const product = mockProducts[Math.floor(Math.random() * mockProducts.length)]
    const stock = mockStocks.find(s => s.storeId === storeId && s.productId === product.id)!
    const qty = 10 + Math.floor(Math.random() * 30)

    records.push({
      id: `stock-rec-${String(ridx).padStart(5, '0')}`,
      time: formatDate(new Date(Date.now() - Math.random() * 86400000 * 6)),
      productId: product.id,
      productName: product.name,
      storeId,
      storeName: storeMap[storeId].name,
      type: 'in',
      quantity: qty,
      beforeQuantity: Math.max(0, stock.quantity - qty),
      afterQuantity: stock.quantity,
      operator: staffNames[Math.floor(Math.random() * staffNames.length)],
      remark: '采购入库',
    })
    ridx++
  }

  return records.sort((a, b) => b.time.localeCompare(a.time))
}

export const mockStockRecords: StockRecord[] = generateMockStockRecords()

function generateMockTransfers(): Transfer[] {
  const transfers: Transfer[] = []
  let idx = 1

  const statusDistribution: TransferStatus[] = [
    'pending', 'pending',
    'approved',
    'outbound',
    'in_transit',
    'inbound',
    'completed', 'completed', 'completed',
    'rejected',
  ]

  const types: TransferType[] = ['replenish', 'transfer', 'transfer', 'transfer']
  const reasons = [
    '库存预警，需要紧急补货',
    '周末促销活动，预计销量大增',
    '周边门店库存充足，申请调拨',
    '新品上市，提前备货',
    '节日备货，应对客流高峰',
  ]

  for (let dayOffset = -10; dayOffset <= 0; dayOffset++) {
    const transfersPerDay = dayOffset === 0 ? 3 : 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < transfersPerDay; i++) {
      const type = types[Math.floor(Math.random() * types.length)]
      const status = dayOffset === 0 && i < 1
        ? (['pending', 'approved'] as TransferStatus[])[Math.floor(Math.random() * 2)]
        : statusDistribution[Math.floor(Math.random() * statusDistribution.length)]

      const toStoreIdx = Math.floor(Math.random() * mockStores.length)
      let fromStoreIdx: number
      if (type === 'replenish') {
        fromStoreIdx = toStoreIdx
      } else {
        do {
          fromStoreIdx = Math.floor(Math.random() * mockStores.length)
        } while (fromStoreIdx === toStoreIdx)
      }

      const fromStore = mockStores[fromStoreIdx]
      const toStore = mockStores[toStoreIdx]

      const numItems = 1 + Math.floor(Math.random() * 3)
      const items = []
      const usedProducts = new Set<string>()
      let total = 0

      for (let j = 0; j < numItems; j++) {
        let prod: Product
        do {
          prod = mockProducts[Math.floor(Math.random() * mockProducts.length)]
        } while (usedProducts.has(prod.id))
        usedProducts.add(prod.id)

        const qty = 5 + Math.floor(Math.random() * 20)
        total += prod.price * qty

        let actualOutboundQty: number | undefined
        let actualInboundQty: number | undefined
        if (['outbound', 'in_transit', 'inbound', 'completed'].includes(status)) {
          actualOutboundQty = qty
        }
        if (status === 'completed') {
          actualInboundQty = qty
        }

        items.push({
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: qty,
          unitPrice: prod.price,
          actualOutboundQuantity: actualOutboundQty,
          actualInboundQuantity: actualInboundQty,
        })
      }

      const createDate = addHours(addDays(today, dayOffset), 9 + Math.floor(Math.random() * 8))
      const transferNo = `TR${formatDate(createDate).slice(0, 10).replace(/-/g, '')}${String(idx).padStart(4, '0')}`

      const statusLogs: Transfer['statusLogs'] = []
      const baseTime = createDate

      statusLogs.push({
        id: `tlog-${idx}-0`,
        status: 'pending' as TransferStatus,
        time: formatDate(baseTime),
        operator: staffNames[Math.floor(Math.random() * staffNames.length)],
        remark: reasons[Math.floor(Math.random() * reasons.length)],
      })

      if (status !== 'pending' && status !== 'rejected') {
        statusLogs.push({
          id: `tlog-${idx}-1`,
          status: 'approved',
          time: formatDate(addHours(baseTime, 0.5 + Math.random())),
          operator: '张店长',
          remark: '已审批通过，请尽快安排出库',
        })
      }

      if (['outbound', 'in_transit', 'inbound', 'completed'].includes(status)) {
        statusLogs.push({
          id: `tlog-${idx}-2`,
          status: 'outbound',
          time: formatDate(addHours(baseTime, 2 + Math.random() * 3)),
          operator: staffNames[Math.floor(Math.random() * staffNames.length)],
          remark: '商品已出库，正在安排运输',
        })
      }

      if (['in_transit', 'inbound', 'completed'].includes(status)) {
        statusLogs.push({
          id: `tlog-${idx}-3`,
          status: 'in_transit',
          time: formatDate(addHours(baseTime, 4 + Math.random() * 5)),
          operator: '物流系统',
          remark: '商品运输中，预计今日送达',
        })
      }

      if (['inbound', 'completed'].includes(status)) {
        statusLogs.push({
          id: `tlog-${idx}-4`,
          status: 'inbound',
          time: formatDate(addHours(baseTime, 8 + Math.random() * 4)),
          operator: '物流系统',
          remark: '商品已到达调入门店，等待确认入库',
        })
      }

      if (status === 'completed') {
        statusLogs.push({
          id: `tlog-${idx}-5`,
          status: 'completed',
          time: formatDate(addHours(baseTime, 10 + Math.random() * 3)),
          operator: staffNames[Math.floor(Math.random() * staffNames.length)],
          remark: '已确认入库，调拨完成',
        })
      }

      if (status === 'rejected') {
        statusLogs.push({
          id: `tlog-${idx}-1`,
          status: 'rejected',
          time: formatDate(addHours(baseTime, 1 + Math.random())),
          operator: '张店长',
          remark: '库存充足，无需调拨/补货，已拒绝',
        })
      }

      const expectedArrival = formatDate(addDays(baseTime, type === 'replenish' ? 3 : 1))

      let actualOutboundTime: string | undefined
      let actualInboundTime: string | undefined
      if (['outbound', 'in_transit', 'inbound', 'completed'].includes(status)) {
        actualOutboundTime = statusLogs.find(l => l.status === 'outbound')?.time
      }
      if (status === 'completed') {
        actualInboundTime = statusLogs.find(l => l.status === 'completed')?.time
      }

      const transfer: Transfer = {
        id: `transfer-${String(idx).padStart(5, '0')}`,
        transferNo,
        type,
        fromStoreId: fromStore.id,
        fromStoreName: type === 'replenish' ? '总部仓库' : fromStore.name,
        toStoreId: toStore.id,
        toStoreName: toStore.name,
        items,
        totalAmount: Math.round(total * 100) / 100,
        expectedArrivalTime: expectedArrival,
        actualOutboundTime,
        actualInboundTime,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        status,
        rejectReason: status === 'rejected' ? '库存充足，无需调拨/补货' : undefined,
        statusLogs,
        createdAt: formatDate(createDate),
        createdBy: staffNames[Math.floor(Math.random() * staffNames.length)],
        operator: staffNames[Math.floor(Math.random() * staffNames.length)],
      }

      transfers.push(transfer)
      idx++
    }
  }

  return transfers.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const mockTransfers: Transfer[] = generateMockTransfers()
