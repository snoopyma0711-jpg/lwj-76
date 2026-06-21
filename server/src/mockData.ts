import type { Database, Store, Product, Order, StoreStock, StockRecord, OrderItem, ContactRecord, OrderStatusLog, OrderStatus, Transfer, TransferStatus, TransferType, TransferStatusLog, TransferItem, Supplier, Purchase, PurchaseStatus, PurchaseItem, PurchaseReceiveItem, PurchaseStatusLog, PaymentRecord, ReconciliationStatus, PaymentStatus, PaymentMethod } from './types'
import { formatDate, generateTransferNo, generatePurchaseNo } from './utils'

const storeList = [
  { id: 'store-001', name: '朝阳大悦城店', address: '北京市朝阳区朝阳北路101号大悦城B1层', manager: '张店长', phone: '010-85551234' },
  { id: 'store-002', name: '海淀中关村店', address: '北京市海淀区中关村大街19号新中关购物中心L2层', manager: '李店长', phone: '010-62567890' },
  { id: 'store-003', name: '西城金融街店', address: '北京市西城区金城坊街2号金融街购物中心B1', manager: '王店长', phone: '010-66223344' },
  { id: 'store-004', name: '东城王府井店', address: '北京市东城区王府井大街138号北京APM L3层', manager: '赵店长', phone: '010-65284567' },
]

const productList = [
  { id: 'prod-001', sku: 'SKU-A001', name: '新鲜草莓礼盒装', category: '生鲜水果', unit: '盒', price: 58.0, warningThreshold: 10 },
  { id: 'prod-002', sku: 'SKU-A002', name: '进口车厘子', category: '生鲜水果', unit: '斤', price: 198.0, warningThreshold: 15 },
  { id: 'prod-003', sku: 'SKU-B001', name: '手冲精品咖啡豆', category: '咖啡茶饮', unit: '袋', price: 88.0, warningThreshold: 5 },
  { id: 'prod-004', sku: 'SKU-B002', name: '日式抹茶粉', category: '咖啡茶饮', unit: '罐', price: 128.0, warningThreshold: 8 },
  { id: 'prod-005', sku: 'SKU-C001', name: '手工巧克力礼盒', category: '烘焙甜点', unit: '盒', price: 168.0, warningThreshold: 12 },
  { id: 'prod-006', sku: 'SKU-C002', name: '现烤芝士蛋糕', category: '烘焙甜点', unit: '个', price: 138.0, warningThreshold: 5 },
  { id: 'prod-007', sku: 'SKU-D001', name: '有机冷榨果汁', category: '饮料冲调', unit: '箱', price: 32.0, warningThreshold: 25 },
  { id: 'prod-008', sku: 'SKU-D002', name: '无糖乌龙茶', category: '饮料冲调', unit: '箱', price: 68.0, warningThreshold: 25 },
  { id: 'prod-009', sku: 'SKU-E001', name: '农家散养土鸡蛋', category: '肉禽蛋品', unit: '盒', price: 38.0, warningThreshold: 15 },
  { id: 'prod-010', sku: 'SKU-E002', name: '澳洲进口牛排原切', category: '肉禽蛋品', unit: '袋', price: 128.0, warningThreshold: 8 },
  { id: 'prod-011', sku: 'SKU-F001', name: '挪威三文鱼刺身级', category: '海鲜水产', unit: '份', price: 158.0, warningThreshold: 6 },
  { id: 'prod-012', sku: 'SKU-F002', name: '阿根廷红虾', category: '海鲜水产', unit: '盒', price: 188.0, warningThreshold: 8 },
  { id: 'prod-013', sku: 'SKU-A003', name: '阳光玫瑰葡萄', category: '生鲜水果', unit: '串', price: 45.0, warningThreshold: 8 },
  { id: 'prod-014', sku: 'SKU-A004', name: '海南金煌芒果', category: '生鲜水果', unit: '个', price: 18.8, warningThreshold: 20 },
  { id: 'prod-015', sku: 'SKU-A005', name: '新疆阿克苏冰糖心苹果', category: '生鲜水果', unit: '斤', price: 12.5, warningThreshold: 30 },
  { id: 'prod-016', sku: 'SKU-B003', name: '意式浓缩拼配咖啡豆', category: '咖啡茶饮', unit: '袋', price: 128.0, warningThreshold: 5 },
  { id: 'prod-017', sku: 'SKU-B004', name: '金骏眉红茶礼盒', category: '咖啡茶饮', unit: '盒', price: 258.0, warningThreshold: 4 },
  { id: 'prod-018', sku: 'SKU-C003', name: '法式马卡龙套装', category: '烘焙甜点', unit: '盒', price: 98.0, warningThreshold: 10 },
  { id: 'prod-019', sku: 'SKU-C004', name: '招牌提拉米苏', category: '烘焙甜点', unit: '份', price: 42.0, warningThreshold: 8 },
  { id: 'prod-020', sku: 'SKU-D003', name: '速溶咖啡1+2原味', category: '饮料冲调', unit: '盒', price: 45.0, warningThreshold: 15 },
  { id: 'prod-021', sku: 'SKU-D004', name: '特仑苏纯牛奶', category: '饮料冲调', unit: '箱', price: 65.0, warningThreshold: 20 },
  { id: 'prod-022', sku: 'SKU-D005', name: '德运全脂高钙奶粉', category: '饮料冲调', unit: '袋', price: 89.0, warningThreshold: 10 },
  { id: 'prod-023', sku: 'SKU-E003', name: '黑猪五花肉', category: '肉禽蛋品', unit: '斤', price: 42.0, warningThreshold: 12 },
  { id: 'prod-024', sku: 'SKU-F003', name: '北海道帆立贝柱', category: '海鲜水产', unit: '袋', price: 138.0, warningThreshold: 6 },
  { id: 'prod-025', sku: 'SKU-B005', name: '茉莉花茶', category: '咖啡茶饮', unit: '罐', price: 68.0, warningThreshold: 10 },
  { id: 'prod-026', sku: 'SKU-C005', name: '手工黄油曲奇礼盒', category: '烘焙甜点', unit: '盒', price: 78.0, warningThreshold: 12 },
]

const firstNames = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '郑']
const lastNames = ['先生', '女士', '小姐']
const staffNames = ['小李', '小王', '小张', '小陈', '小赵', '小刘']

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickItems(productList: Product[]): OrderItem[] {
  const count = rand(1, 4)
  const picked = new Set<string>()
  const items: OrderItem[] = []
  for (let i = 0; i < count; i++) {
    const product = pick(productList)
    if (picked.has(product.id)) continue
    picked.add(product.id)
    const qty = rand(1, 5)
    items.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: qty,
      unitPrice: product.price,
    })
  }
  return items
}

function generateMockOrders(stores: Store[], products: Product[]): Order[] {
  const orders: Order[] = []
  const statuses: OrderStatus[] = ['pending', 'confirmed', 'ready', 'delayed', 'picked_up', 'partial', 'failed', 'cancelled']
  const storeMap: Record<string, Store> = {}
  stores.forEach((s) => (storeMap[s.id] = s))

  for (let idx = 1; idx <= 103; idx++) {
    const daysAgo = rand(0, 14)
    const createDate = new Date()
    createDate.setDate(createDate.getDate() - daysAgo)
    createDate.setHours(rand(8, 20), rand(0, 59), rand(0, 59), 0)

    const storeId = pick(stores).id
    const items = pickItems(products)
    let total = 0
    items.forEach((it) => (total += it.unitPrice * it.quantity))

    const firstName = pick(firstNames)
    const contactName = firstName + pick(['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛']) + pick(lastNames)
    const phonePrefix = ['138', '139', '137', '136', '135', '158', '159', '188', '186', '189', '176', '177']
    const contactPhone = pick(phonePrefix) + String(rand(1000, 9999)) + String(rand(1000, 9999))

    const scheduledDate = new Date(createDate)
    scheduledDate.setMinutes(scheduledDate.getMinutes() + rand(60, 60 * 48))

    let status: OrderStatus = pick(statuses)
    if (daysAgo === 0 && status === 'picked_up') {
      const hr = createDate.getHours()
      if (hr > new Date().getHours()) status = pick(['pending', 'confirmed', 'ready'])
    }

    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const orderNo = `TP${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${String(idx).padStart(4, '0')}`

    let actualPickupTime: string | undefined
    let pickupPerson: string | undefined
    let pickupPersonIdCard: string | undefined

    if (status === 'picked_up' || status === 'partial') {
      const ap = new Date(scheduledDate)
      ap.setMinutes(ap.getMinutes() + rand(10, 120))
      actualPickupTime = formatDate(ap)
      pickupPerson = Math.random() > 0.4 ? contactName : pick(firstNames) + pick(['伟', '芳', '娜', '敏']) + pick(lastNames)
      pickupPersonIdCard = Math.random() > 0.7 ? '110101' + String(rand(1980, 2002)) + String(pad(rand(1, 12))) + String(pad(rand(1, 28))) + String(rand(1000, 9999)) : undefined
    }

    const statusLogs: OrderStatusLog[] = [
      {
        id: `log-${idx}-1`,
        status: 'pending',
        time: formatDate(createDate),
        operator: pick(staffNames),
        remark: '订单已创建',
      },
    ]
    if (status !== 'pending') {
      const confirmedTime = new Date(createDate)
      confirmedTime.setMinutes(confirmedTime.getMinutes() + rand(5, 60))
      statusLogs.push({
        id: `log-${idx}-2`,
        status: 'confirmed',
        time: formatDate(confirmedTime),
        operator: pick(staffNames),
        remark: '订单已确认，备货中',
      })
      if (['ready', 'delayed', 'picked_up', 'partial', 'failed', 'cancelled'].includes(status)) {
        const readyTime = new Date(createDate)
        readyTime.setMinutes(readyTime.getMinutes() + rand(30, 180))
        statusLogs.push({
          id: `log-${idx}-3`,
          status: 'ready',
          time: formatDate(readyTime),
          operator: pick(staffNames),
          remark: '商品已备好，等待顾客自提',
        })
      }
      if (status === 'delayed') {
        statusLogs.push({
          id: `log-${idx}-4`,
          status: 'delayed',
          time: formatDate(scheduledDate),
          operator: pick(staffNames),
          remark: '顾客申请延期，新取货时间另行通知',
        })
      }
      if (status === 'picked_up') {
        statusLogs.push({
          id: `log-${idx}-4`,
          status: 'picked_up',
          time: actualPickupTime!,
          operator: pick(staffNames),
          remark: '顾客已完成自提',
        })
      }
      if (status === 'partial') {
        statusLogs.push({
          id: `log-${idx}-4`,
          status: 'partial',
          time: actualPickupTime!,
          operator: pick(staffNames),
          remark: '部分商品缺货，已完成部分取货',
        })
      }
      if (status === 'failed') {
        const failTime = new Date(scheduledDate)
        failTime.setDate(failTime.getDate() + rand(1, 3))
        statusLogs.push({
          id: `log-${idx}-4`,
          status: 'failed',
          time: formatDate(failTime),
          operator: pick(staffNames),
          remark: '多次拨打顾客电话无人接听，已发送短信提醒',
        })
      }
      if (status === 'cancelled') {
        const cancelTime = new Date(createDate)
        cancelTime.setMinutes(cancelTime.getMinutes() + rand(30, 240))
        statusLogs.push({
          id: `log-${idx}-4`,
          status: 'cancelled',
          time: formatDate(cancelTime),
          operator: pick(staffNames),
          remark: Math.random() > 0.5 ? '顾客主动取消订单' : '门店缺货无法履约，已退款',
        })
      }
    }

    const contactRecords: ContactRecord[] = []
    if (Math.random() > 0.6) {
      const crTime = new Date(createDate)
      crTime.setMinutes(crTime.getMinutes() + rand(10, 120))
      contactRecords.push({
        id: `cr-${idx}-1`,
        time: formatDate(crTime),
        type: pick(['phone', 'sms', 'wechat'] as any),
        operator: pick(staffNames),
        content: Math.random() > 0.5 ? '电话联系顾客确认订单，顾客表示下班后到店自提' : '已通过短信发送门店地址和导航链接',
      })
    }
    if (status === 'delayed' || status === 'failed') {
      const crTime = new Date(scheduledDate)
      crTime.setMinutes(crTime.getMinutes() + rand(30, 180))
      contactRecords.push({
        id: `cr-${idx}-2`,
        time: formatDate(crTime),
        type: 'phone',
        operator: pick(staffNames),
        content: '顾客未按时到店，电话沟通中',
      })
    }

    const actualItems = status === 'partial'
      ? items.map((it) => ({ ...it, actualQuantity: Math.max(1, it.quantity - rand(0, it.quantity)) }))
      : items

    orders.push({
      id: `order-${String(idx).padStart(5, '0')}`,
      orderNo,
      createdAt: formatDate(createDate),
      storeId,
      storeName: storeMap[storeId].name,
      items: actualItems,
      totalAmount: Math.round(total * 100) / 100,
      contactName,
      contactPhone,
      scheduledPickupTime: formatDate(scheduledDate),
      actualPickupTime,
      pickupPerson,
      pickupPersonIdCard,
      status,
      remark: Math.random() > 0.7 ? '请提前备好货，顾客到店即取' : undefined,
      contactRecords,
      statusLogs,
      operator: pick(staffNames),
    })
  }
  return orders
}

function generateMockTransfers(stores: Store[], products: Product[]): Transfer[] {
  const transfers: Transfer[] = []
  const staffNames = ['小李', '小王', '小张', '小陈', '小赵', '小刘']
  const statuses: TransferStatus[] = ['pending', 'approved', 'outbound', 'in_transit', 'inbound', 'completed', 'rejected']
  const reasons = [
    '库存预警，急需补货',
    '促销活动备货',
    '门店间库存调配',
    '新品上架首批补货',
    '季节性商品调整',
    '大促活动前备货',
  ]
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')

  for (let idx = 1; idx <= 28; idx++) {
    const daysAgo = rand(0, 14)
    const createDate = new Date()
    createDate.setDate(createDate.getDate() - daysAgo)
    createDate.setHours(rand(8, 20), rand(0, 59), rand(0, 59), 0)

    const type: TransferType = Math.random() > 0.5 ? 'replenish' : 'transfer'
    const toStore = pick(stores)
    const fromStore = type === 'transfer' ? pick(stores.filter((s) => s.id !== toStore.id)) : stores[0]
    const fromStoreId = type === 'transfer' ? fromStore.id : 'hq-warehouse'
    const fromStoreName = type === 'transfer' ? fromStore.name : '总部仓库'

    const itemCount = rand(1, 5)
    const pickedProducts = new Set<string>()
    const items: TransferItem[] = []
    for (let i = 0; i < itemCount; i++) {
      const product = pick(products)
      if (pickedProducts.has(product.id)) continue
      pickedProducts.add(product.id)
      const qty = rand(2, 20)
      items.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: qty,
        unitPrice: product.price,
      })
    }
    let total = 0
    items.forEach((it) => (total += it.unitPrice * it.quantity))

    let status: TransferStatus = pick(statuses)
    if (daysAgo === 0) {
      const hr = createDate.getHours()
      if (hr > d.getHours()) {
        status = pick(['pending', 'approved'] as TransferStatus[])
      }
    }
    if (status === 'rejected' && type === 'replenish') {
      status = 'pending'
    }

    const expectedDate = new Date(createDate)
    expectedDate.setHours(expectedDate.getHours() + rand(6, 72))

    const statusLogs: TransferStatusLog[] = [
      {
        id: `tlog-${idx}-0`,
        status: 'pending',
        time: formatDate(createDate),
        operator: pick(staffNames),
        remark: pick(reasons),
      },
    ]

    const actualItems = items.map((it) => ({ ...it }))

    if (status !== 'pending' && status !== 'rejected') {
      const approvedTime = new Date(createDate)
      approvedTime.setMinutes(approvedTime.getMinutes() + rand(15, 120))
      statusLogs.push({
        id: `tlog-${idx}-1`,
        status: 'approved',
        time: formatDate(approvedTime),
        operator: pick(staffNames),
        remark: '已审批通过，请尽快安排出库',
      })

      if (['outbound', 'in_transit', 'inbound', 'completed'].includes(status)) {
        const outboundTime = new Date(approvedTime)
        outboundTime.setHours(outboundTime.getHours() + rand(1, 8))
        statusLogs.push({
          id: `tlog-${idx}-2`,
          status: 'outbound',
          time: formatDate(outboundTime),
          operator: pick(staffNames),
          remark: '商品已出库，正在安排运输',
        })
        actualItems.forEach((it) => (it.actualOutboundQuantity = it.quantity))

        if (['in_transit', 'inbound', 'completed'].includes(status)) {
          const transitTime = new Date(outboundTime)
          transitTime.setHours(transitTime.getHours() + rand(1, 24))
          statusLogs.push({
            id: `tlog-${idx}-3`,
            status: 'in_transit',
            time: formatDate(transitTime),
            operator: pick(staffNames),
            remark: '商品运输中',
          })

          if (['inbound', 'completed'].includes(status)) {
            const inboundTime = new Date(transitTime)
            inboundTime.setHours(inboundTime.getHours() + rand(2, 48))
            statusLogs.push({
              id: `tlog-${idx}-4`,
              status: 'completed',
              time: formatDate(inboundTime),
              operator: pick(staffNames),
              remark: '已确认入库，调拨完成',
            })
            actualItems.forEach((it) => (it.actualInboundQuantity = it.actualOutboundQuantity))
          }
        }
      }
    }

    if (status === 'rejected') {
      statusLogs.push({
        id: `tlog-${idx}-r`,
        status: 'rejected',
        time: formatDate(createDate),
        operator: pick(staffNames),
        remark: '库存充足，暂不需要调拨/补货',
      })
    }

    transfers.push({
      id: `transfer-${String(idx).padStart(5, '0')}`,
      transferNo: `TR${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${String(idx).padStart(4, '0')}`,
      type,
      fromStoreId,
      fromStoreName,
      toStoreId: toStore.id,
      toStoreName: toStore.name,
      items: actualItems,
      totalAmount: Math.round(total * 100) / 100,
      expectedArrivalTime: formatDate(expectedDate),
      actualOutboundTime: actualItems.some((it) => it.actualOutboundQuantity !== undefined)
        ? formatDate(expectedDate)
        : undefined,
      actualInboundTime: actualItems.some((it) => it.actualInboundQuantity !== undefined)
        ? formatDate(expectedDate)
        : undefined,
      reason: pick(reasons),
      status: status === 'inbound' ? 'in_transit' : status,
      rejectReason: status === 'rejected' ? '库存充足，暂不需要调拨/补货' : undefined,
      statusLogs,
      createdAt: formatDate(createDate),
      createdBy: pick(staffNames),
      operator: pick(staffNames),
    })
  }
  return transfers
}

const supplierList: Supplier[] = [
  { id: 'supplier-001', name: '北京新发地农产品批发市场', contact: '刘经理', phone: '13800138001', address: '北京市丰台区新发地农产品批发市场', category: '生鲜水果', remark: '主要供应各类时令水果，价格优惠' },
  { id: 'supplier-002', name: '上海农产品中心批发市场', contact: '陈经理', phone: '13800138002', address: '上海市浦东新区沪南路2000号', category: '肉禽蛋品', remark: '供应各类肉类、禽蛋产品，品质保证' },
  { id: 'supplier-003', name: '广州江南果菜批发市场', contact: '黄经理', phone: '13800138003', address: '广州市白云区增槎路926号', category: '海鲜水产', remark: '各类海鲜水产，每日新鲜直达' },
  { id: 'supplier-004', name: '咖啡原料供应商联盟', contact: '周经理', phone: '13800138004', address: '上海市静安区南京西路1688号', category: '咖啡茶饮', remark: '进口咖啡豆、茶叶等原料供应商' },
  { id: 'supplier-005', name: '烘焙原料一站式', contact: '吴经理', phone: '13800138005', address: '广州市天河区珠江新城华夏路10号', category: '烘焙甜点', remark: '各类烘焙原料、半成品供应' },
  { id: 'supplier-006', name: '饮料饮品批发中心', contact: '郑经理', phone: '13800138006', address: '深圳市南山区科技园南区', category: '饮料冲调', remark: '各类饮料、冲调产品批发' },
]

function generateMockPurchases(stores: Store[], products: Product[], suppliers: Supplier[]): { purchases: Purchase[], paymentRecords: PaymentRecord[] } {
  const purchases: Purchase[] = []
  const allPaymentRecords: PaymentRecord[] = []
  const staffNames = ['小李', '小王', '小张', '小陈', '小赵', '小刘']
  const statuses: PurchaseStatus[] = ['pending_approval', 'approved', 'pending_order', 'ordered', 'pending_arrival', 'partial_arrival', 'completed', 'cancelled']
  const paymentMethods: PaymentMethod[] = ['bank_transfer', 'alipay', 'wechat', 'cash', 'other']
  const reasons = [
    '库存预警，急需补货',
    '促销活动备货',
    '新品上架首批采购',
    '季节性商品调整',
    '大促活动前备货',
    '日常库存补充',
    '门店销量超预期',
  ]
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')

  for (let idx = 1; idx <= 35; idx++) {
    const daysAgo = rand(0, 14)
    const createDate = new Date()
    createDate.setDate(createDate.getDate() - daysAgo)
    createDate.setHours(rand(8, 20), rand(0, 59), rand(0, 59), 0)

    const supplier = pick(suppliers)
    const store = pick(stores)
    const categoryProducts = products.filter(p => {
      if (supplier.category === '生鲜水果') return p.category === '生鲜水果'
      if (supplier.category === '肉禽蛋品') return p.category === '肉禽蛋品'
      if (supplier.category === '海鲜水产') return p.category === '海鲜水产'
      if (supplier.category === '咖啡茶饮') return p.category === '咖啡茶饮'
      if (supplier.category === '烘焙甜点') return p.category === '烘焙甜点'
      if (supplier.category === '饮料冲调') return p.category === '饮料冲调'
      return true
    })
    if (categoryProducts.length === 0) continue

    const itemCount = rand(1, 5)
    const pickedProducts = new Set<string>()
    const items: PurchaseItem[] = []
    for (let i = 0; i < itemCount; i++) {
      const product = pick(categoryProducts)
      if (pickedProducts.has(product.id)) continue
      pickedProducts.add(product.id)
      const qty = rand(5, 50)
      const unitPrice = Math.round((product.price * (0.7 + Math.random() * 0.2)) * 100) / 100
      items.push({
        id: `pi-${idx}-${i}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: qty,
        unitPrice,
        receivedQuantity: 0,
        unit: product.unit,
      })
    }
    let total = 0
    items.forEach((it) => (total += it.unitPrice * it.quantity))

    let status: PurchaseStatus = pick(statuses)
    if (daysAgo === 0) {
      const hr = createDate.getHours()
      if (hr > d.getHours()) {
        status = pick(['pending_approval', 'approved', 'pending_order'] as PurchaseStatus[])
      }
    }

    const expectedDate = new Date(createDate)
    expectedDate.setHours(expectedDate.getHours() + rand(24, 120))

    const statusLogs: PurchaseStatusLog[] = [
      {
        id: `plog-${idx}-0`,
        status: 'pending_approval',
        time: formatDate(createDate),
        operator: pick(staffNames),
        remark: pick(reasons),
      },
    ]

    const actualItems = items.map((it) => ({ ...it }))
    const receiveItems: PurchaseReceiveItem[] = []

    let reconciliationStatus: ReconciliationStatus = 'pending_reconciliation'
    let paymentStatus: PaymentStatus = 'pending_payment'
    let paidAmount = 0
    const paymentRecords: PaymentRecord[] = []
    let reconciliationTime: string | undefined

    if (status !== 'pending_approval' && status !== 'cancelled') {
      const approvedTime = new Date(createDate)
      approvedTime.setMinutes(approvedTime.getMinutes() + rand(30, 240))
      statusLogs.push({
        id: `plog-${idx}-1`,
        status: 'approved',
        time: formatDate(approvedTime),
        operator: pick(staffNames),
        remark: '已审批通过，请尽快下单',
      })

      if (['pending_order', 'ordered', 'pending_arrival', 'partial_arrival', 'completed'].includes(status)) {
        const orderedTime = new Date(approvedTime)
        orderedTime.setHours(orderedTime.getHours() + rand(1, 24))
        statusLogs.push({
          id: `plog-${idx}-2`,
          status: 'ordered',
          time: formatDate(orderedTime),
          operator: pick(staffNames),
          remark: '已向供应商下单，等待发货',
        })

        if (['pending_arrival', 'partial_arrival', 'completed'].includes(status)) {
          const arrivalTime = new Date(orderedTime)
          arrivalTime.setHours(arrivalTime.getHours() + rand(24, 72))

          if (status === 'partial_arrival' || status === 'completed') {
            const isPartial = status === 'partial_arrival'
            actualItems.forEach((it, i) => {
              const receivedQty = isPartial ? rand(1, it.quantity - 1) : it.quantity
              it.receivedQuantity = receivedQty
              receiveItems.push({
                id: `pri-${idx}-${i}`,
                purchaseItemId: it.id,
                productId: it.productId,
                productName: it.productName,
                sku: it.sku,
                quantity: receivedQty,
                unit: it.unit,
                receivedTime: formatDate(arrivalTime),
                differenceReason: isPartial && receivedQty < it.quantity ? '供应商分批配送' : undefined,
              })
            })
            statusLogs.push({
              id: `plog-${idx}-3`,
              status: isPartial ? 'partial_arrival' : 'completed',
              time: formatDate(arrivalTime),
              operator: pick(staffNames),
              remark: isPartial ? '部分商品已到货，已入库' : '全部商品已到货，已完成入库',
            })

            if (status === 'completed') {
              const reconRand = Math.random()
              if (reconRand > 0.3) {
                const reconTime = new Date(arrivalTime)
                reconTime.setHours(reconTime.getHours() + rand(2, 48))
                reconciliationStatus = 'reconciled'
                reconciliationTime = formatDate(reconTime)

                const paymentRand = Math.random()
                if (paymentRand < 0.4) {
                  paymentStatus = 'paid'
                  paidAmount = Math.round(total * 100) / 100
                  const payTime = new Date(reconTime)
                  payTime.setHours(payTime.getHours() + rand(2, 72))
                  const paymentRecord: PaymentRecord = {
                    id: `pay-${idx}-1`,
                    purchaseId: `purchase-${String(idx).padStart(5, '0')}`,
                    purchaseNo: '',
                    amount: paidAmount,
                    paymentTime: formatDate(payTime),
                    paymentMethod: pick(paymentMethods),
                    operator: pick(staffNames),
                    remark: '全额付款',
                  }
                  paymentRecords.push(paymentRecord)
                  allPaymentRecords.push(paymentRecord)
                } else if (paymentRand < 0.7) {
                  paymentStatus = 'partial_payment'
                  const partialAmount = Math.round(total * 0.5 * 100) / 100
                  paidAmount = partialAmount
                  const payTime = new Date(reconTime)
                  payTime.setHours(payTime.getHours() + rand(2, 48))
                  const paymentRecord: PaymentRecord = {
                    id: `pay-${idx}-1`,
                    purchaseId: `purchase-${String(idx).padStart(5, '0')}`,
                    purchaseNo: '',
                    amount: partialAmount,
                    paymentTime: formatDate(payTime),
                    paymentMethod: pick(paymentMethods),
                    operator: pick(staffNames),
                    remark: '支付50%定金',
                  }
                  paymentRecords.push(paymentRecord)
                  allPaymentRecords.push(paymentRecord)
                }
              }
            }
          } else {
            statusLogs.push({
              id: `plog-${idx}-3`,
              status: 'pending_arrival',
              time: formatDate(arrivalTime),
              operator: pick(staffNames),
              remark: '供应商已发货，预计近期到货',
            })
          }
        }
      }
    }

    if (status === 'cancelled') {
      statusLogs.push({
        id: `plog-${idx}-r`,
        status: 'cancelled',
        time: formatDate(createDate),
        operator: pick(staffNames),
        remark: '库存情况变化，取消采购',
      })
    }

    const purchaseNo = generatePurchaseNo(idx - 1)
    const purchase: Purchase = {
      id: `purchase-${String(idx).padStart(5, '0')}`,
      purchaseNo,
      supplierId: supplier.id,
      supplierName: supplier.name,
      storeId: store.id,
      storeName: store.name,
      items: actualItems,
      receiveItems,
      totalAmount: Math.round(total * 100) / 100,
      expectedArrivalTime: formatDate(expectedDate),
      actualArrivalTime: receiveItems.length > 0 ? receiveItems[0].receivedTime : undefined,
      reason: pick(reasons),
      status,
      cancelReason: status === 'cancelled' ? '库存情况变化，取消采购' : undefined,
      statusLogs,
      reconciliationStatus,
      paymentStatus,
      paidAmount,
      paymentRecords: paymentRecords.map(r => ({ ...r, purchaseNo })),
      reconciliationTime,
      createdAt: formatDate(createDate),
      createdBy: pick(staffNames),
      operator: pick(staffNames),
    }
    purchases.push(purchase)
  }

  allPaymentRecords.forEach(pr => {
    const purchase = purchases.find(p => p.id === pr.purchaseId)
    if (purchase) {
      pr.purchaseNo = purchase.purchaseNo
    }
  })

  return { purchases, paymentRecords: allPaymentRecords }
}

export function createMockDatabase(): Database {
  const stores: Store[] = storeList as Store[]
  const products: Product[] = productList as Product[]
  const orders: Order[] = generateMockOrders(stores, products)
  const suppliers: Supplier[] = supplierList as Supplier[]

  const stocks: StoreStock[] = []
  const now = formatDate(new Date())
  for (const store of stores) {
    for (const product of products) {
      const baseQty = rand(5, 120)
      stocks.push({
        productId: product.id,
        storeId: store.id,
        quantity: baseQty,
        lockedQuantity: rand(0, Math.floor(baseQty / 4)),
        updatedAt: now,
      })
    }
  }

  const stockRecords: StockRecord[] = []
  for (let i = 0; i < 30; i++) {
    const store = pick(stores)
    const product = pick(products)
    const stock = stocks.find((s) => s.productId === product.id && s.storeId === store.id)!
    const type: 'in' | 'out' | 'adjust' = pick(['in', 'out', 'adjust'] as any)
    const qty = rand(1, 20)
    const before = type === 'in' ? Math.max(0, stock.quantity - qty) : stock.quantity + qty
    const after = stock.quantity
    const recTime = new Date()
    recTime.setDate(recTime.getDate() - rand(0, 10))
    stockRecords.push({
      id: `stock-rec-${i + 1}`,
      time: formatDate(recTime),
      productId: product.id,
      productName: product.name,
      storeId: store.id,
      storeName: store.name,
      type,
      quantity: type === 'in' ? qty : type === 'out' ? -qty : after - before,
      beforeQuantity: before,
      afterQuantity: after,
      operator: pick(staffNames),
      remark: type === 'in' ? '采购入库' : type === 'out' ? '订单出库' : '库存盘点调整',
    })
  }

  const transfers: Transfer[] = generateMockTransfers(stores, products)
  const { purchases, paymentRecords } = generateMockPurchases(stores, products, suppliers)

  return { stores, products, orders, stocks, stockRecords, transfers, suppliers, purchases, paymentRecords }
}
