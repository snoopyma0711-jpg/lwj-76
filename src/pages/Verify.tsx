import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Card, Button, Modal, Input, EmptyState } from '../components/ui'
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  CalendarClock,
  Clock,
  Package,
  Minus,
  Plus,
  Hash,
  PackageCheck,
  AlertCircle,
} from 'lucide-react'
import type { Order } from '../types'
import { orderStatusMap, formatMoney, maskPhone, isOverdue } from '../utils/constants'

export default function Verify() {
  const { state, completeOrderPickup } = useApp()
  const [searchParams] = useSearchParams()

  const [orderNoInput, setOrderNoInput] = useState(searchParams.get('orderNo') || '')
  const [searchPhone, setSearchPhone] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [searchResult, setSearchResult] = useState<Order | null>(null)
  const [searchError, setSearchError] = useState('')
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  const [pickupPerson, setPickupPerson] = useState('')
  const [pickupPersonIdCard, setPickupPersonIdCard] = useState('')
  const [actualQuantities, setActualQuantities] = useState<Record<string, number>>({})
  const [verifyError, setVerifyError] = useState('')
  const [stockWarnings, setStockWarnings] = useState<string[]>([])

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const pendingOrders = useMemo(() => {
    return state.orders.filter(
      (o) => ['pending', 'confirmed', 'ready', 'delayed'].includes(o.status)
    )
  }, [state.orders])

  const todayStr = new Date().toISOString().slice(0, 10)

  const todayCompleted = state.orders.filter(
    (o) =>
      (o.status === 'picked_up' || o.status === 'partial') &&
      o.actualPickupTime?.slice(0, 10) === todayStr
  ).length

  const overdueCount = pendingOrders.filter((o) =>
    isOverdue(o.scheduledPickupTime, o.status)
  ).length

  const searchByOrderNo = () => {
    setSearchError('')
    const kw = orderNoInput.trim()
    if (!kw) {
      setSearchError('请输入订单编号')
      setSearchResult(null)
      return
    }
    const found = state.orders.find((o) => o.orderNo.toLowerCase() === kw.toLowerCase())
    if (!found) {
      setSearchError('没有找到订单号为「' + kw + '」的订单')
      setSearchResult(null)
      return
    }
    if (!['pending', 'confirmed', 'ready', 'delayed'].includes(found.status)) {
      setSearchError(
        '该订单状态为「' + orderStatusMap[found.status].label + '」，无需核销'
      )
      setSearchResult(null)
      return
    }
    setSearchResult(found)
  }

  const openVerify = (order: Order) => {
    setSelectedOrder(order)
    setPickupPerson(order.contactName)
    setPickupPersonIdCard('')
    const qtyMap: Record<string, number> = {}
    const warnings: string[] = []
    order.items.forEach((item) => {
      qtyMap[item.productId] = item.quantity
      const stock = state.stocks.find(
        (s) => s.productId === item.productId && s.storeId === order.storeId
      )
      const available = stock ? stock.quantity - stock.lockedQuantity : 0
      const prod = state.products.find((p) => p.id === item.productId)
      if (available < item.quantity) {
        warnings.push(
          '⚠️ ' + item.productName + '：库存仅 ' + available + ' 件，订单需要 ' + item.quantity + ' 件'
        )
      } else if (stock && prod && stock.quantity <= prod.warningThreshold) {
        warnings.push(
          '⚡ ' + item.productName + '：库存偏低（当前 ' + stock.quantity + ' 件），核销后可能触发预警'
        )
      }
    })
    setActualQuantities(qtyMap)
    setStockWarnings(warnings)
    setVerifyError('')
    setShowVerifyModal(true)
  }

  const closeVerify = () => {
    setShowVerifyModal(false)
    setSelectedOrder(null)
  }

  const adjustQty = (productId: string, delta: number) => {
    if (!selectedOrder) return
    const item = selectedOrder.items.find((i) => i.productId === productId)
    if (!item) return
    setActualQuantities((prev) => {
      const cur = prev[productId] ?? item.quantity
      const next = Math.max(0, Math.min(item.quantity, cur + delta))
      return { ...prev, [productId]: next }
    })
  }

  const submitVerify = () => {
    if (!selectedOrder) return
    setVerifyError('')

    if (!pickupPerson.trim()) {
      setVerifyError('请输入取货人姓名')
      return
    }
    if (pickupPerson.length > 20) {
      setVerifyError('取货人姓名过长（最多20字）')
      return
    }
    if (pickupPersonIdCard && !/^\d{6}[\d*]*$/.test(pickupPersonIdCard.trim())) {
      setVerifyError('证件号格式不正确')
      return
    }

    const itemsActual = selectedOrder.items.map((it) => ({
      productId: it.productId,
      actualQuantity: actualQuantities[it.productId] ?? it.quantity,
    }))

    const allZero = itemsActual.every((a) => a.actualQuantity === 0)
    if (allZero) {
      setVerifyError('至少要有一件商品实际取货数量大于 0')
      return
    }

    const res = completeOrderPickup({
      order: selectedOrder,
      pickupPerson: pickupPerson.trim(),
      pickupPersonIdCard: pickupPersonIdCard.trim() || undefined,
      itemsActual,
    })

    if (res.success) {
      closeVerify()
      setOrderNoInput('')
      setSearchResult(null)
      setToast({ message: '🎉 核销成功！', type: 'success' })
    } else {
      setVerifyError(res.message)
    }
  }

  const filteredOrders = searchPhone
    ? pendingOrders.filter(
        (o) =>
          o.contactName.includes(searchPhone.trim()) ||
          o.contactPhone.includes(searchPhone.trim())
      )
    : pendingOrders

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={
            'fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl text-white text-sm font-medium ' +
            (toast.type === 'success'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
              : 'bg-red-500')
          }
        >
          {toast.message}
        </div>
      )}

      <Card className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 !border-0 text-white overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-white/90 text-sm mb-1">
              <QrCode size={18} />
              <span>快速核销</span>
            </div>
            <div className="text-2xl font-bold mb-4">输入订单号，一秒完成核销</div>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                <Input
                  value={orderNoInput}
                  onChange={setOrderNoInput}
                  onKeyDown={(e) => e.key === 'Enter' && searchByOrderNo()}
                  placeholder="请输入订单编号，例如：TP202401150001"
                  className="!bg-white/10 !border-white/20 !text-white !placeholder-blue-200 !pl-11 !py-3 text-base focus:!border-white/40"
                />
              </div>
              <Button
                onClick={searchByOrderNo}
                variant="secondary"
                className="!bg-white !text-blue-600 !border-white hover:!bg-blue-50 !py-3 px-6 text-base font-semibold"
              >
                查找并核销
              </Button>
            </div>
            {searchError && (
              <div className="mt-3 p-3 rounded-lg bg-white/10 border border-white/20 text-sm flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{searchError}</span>
              </div>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-blue-100/70 flex-wrap">
              <span>💡 提示：可以直接在「订单管理」中点击「立即核销」按钮</span>
            </div>
          </div>
          <div className="lg:w-72 p-5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
            <div className="text-xs text-blue-100 mb-3">今日核销统计</div>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white/10">
                <div className="text-2xl font-bold mb-0.5">{todayCompleted}</div>
                <div className="text-xs text-blue-100/80">完成自提</div>
              </div>
              <div className="p-3 rounded-xl bg-white/10">
                <div className="text-2xl font-bold mb-0.5">{pendingOrders.length}</div>
                <div className="text-xs text-blue-100/80">待核销订单</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-400/20">
                <div className="text-2xl font-bold mb-0.5">{overdueCount}</div>
                <div className="text-xs text-amber-100">已逾期待处理</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {searchResult && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <span className="text-amber-600">🔍</span>
              <span>找到订单</span>
            </div>
          }
          className="!border-amber-200 bg-amber-50/30"
        >
          <SearchResultOrder order={searchResult} onVerify={() => openVerify(searchResult)} />
        </Card>
      )}

      <Card
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageCheck size={18} className="text-blue-500" />
              <span>待核销订单</span>
              <span className="text-xs text-gray-400 font-normal">
                共 {pendingOrders.length} 笔，点击订单可快速核销
              </span>
            </div>
            <div className="relative w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchPhone}
                onChange={setSearchPhone}
                placeholder="按联系人/手机号搜索"
                className="!pl-9"
              />
            </div>
          </div>
        }
      >
        {pendingOrders.length === 0 ? (
          <EmptyState
            title="太棒了！当前没有待核销订单"
            description="所有订单都已处理完成，继续保持！"
          />
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <SearchResultOrder key={order.id} order={order} onVerify={() => openVerify(order)} />
            ))}
            {searchPhone && filteredOrders.length === 0 && (
              <EmptyState
                title="没有找到匹配的订单"
                description="试试其他关键词或清空搜索框"
              />
            )}
          </div>
        )}
      </Card>

      <Modal
        open={showVerifyModal}
        title={selectedOrder ? '核销订单 · ' + selectedOrder.orderNo : '订单核销'}
        onClose={closeVerify}
        width="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeVerify}>取消</Button>
            <Button variant="success" onClick={submitVerify} className="gap-2">
              <CheckCircle2 size={16} />
              确认完成核销
            </Button>
          </>
        }
      >
        {selectedOrder && (
          <div className="space-y-5">
            {verifyError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
                <XCircle size={16} className="flex-shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}
            {stockWarnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-2">
                  <AlertTriangle size={16} />
                  库存提示
                </div>
                <div className="space-y-1">
                  {stockWarnings.map((w, i) => (
                    <div key={i} className="text-xs text-amber-700">{w}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-50/50">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Hash size={12} />
                  订单号
                </div>
                <div className="font-mono font-semibold text-gray-800">{selectedOrder.orderNo}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <MapPin size={12} />
                  门店
                </div>
                <div className="text-sm font-medium text-gray-800">{selectedOrder.storeName}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <CalendarClock size={12} />
                  下单时间
                </div>
                <div className="text-sm text-gray-800">{selectedOrder.createdAt}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Clock size={12} />
                  约定取货
                </div>
                <div
                  className={
                    'text-sm font-medium ' +
                    (isOverdue(selectedOrder.scheduledPickupTime, selectedOrder.status)
                      ? 'text-red-600'
                      : 'text-gray-800')
                  }
                >
                  {selectedOrder.scheduledPickupTime}
                  {isOverdue(selectedOrder.scheduledPickupTime, selectedOrder.status) && (
                    <span className="ml-1.5 text-xs text-red-500">(已逾期)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-3">
                <User size={16} />
                取货人信息
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-blue-700/80 mb-1.5">订单联系人</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-800">{selectedOrder.contactName}</span>
                    <span className="font-mono text-gray-500">{maskPhone(selectedOrder.contactPhone)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="实际取货人 *"
                  value={pickupPerson}
                  onChange={setPickupPerson}
                  placeholder="请输入实际取货人姓名"
                  required
                />
                <Input
                  label="取货人证件号"
                  value={pickupPersonIdCard}
                  onChange={setPickupPersonIdCard}
                  placeholder="身份证/其他证件，可选"
                />
              </div>
              <div className="mt-3 text-xs text-blue-600/70">
                💡 如非本人取货，请务必核实身份并登记证件信息，避免纠纷
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package size={16} />
                  商品确认
                  <span className="text-xs font-normal text-gray-400">
                    如有缺货，点击「-」调整实际取货数量
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => {
                  const actualQty = actualQuantities[item.productId] ?? item.quantity
                  const stock = state.stocks.find(
                    (s) => s.productId === item.productId && s.storeId === selectedOrder.storeId
                  )
                  const available = stock ? stock.quantity - stock.lockedQuantity : 0
                  return (
                    <div
                      key={item.productId}
                      className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 mb-1">{item.productName}</div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="text-gray-400 font-mono">SKU: {item.sku}</span>
                            <span className="text-gray-500">单价: {formatMoney(item.unitPrice)}</span>
                            <span className="text-gray-500">购买: x{item.quantity}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-xs">
                            {stock && (
                              <span className={available < item.quantity ? 'text-red-500' : 'text-gray-400'}>
                                库存: {available} 件
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => adjustQty(item.productId, -1)}
                              disabled={actualQty <= 0}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <div className="w-14 text-center font-bold text-lg text-gray-800">
                              {actualQty}
                            </div>
                            <button
                              onClick={() => adjustQty(item.productId, 1)}
                              disabled={actualQty >= item.quantity}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                      {actualQty < item.quantity && (
                        <div className="mt-2 pt-2 border-t border-gray-50 text-xs text-orange-600 bg-orange-50/50 rounded-lg px-3 py-2">
                          {actualQty === 0
                            ? '该商品全部缺货，将按部分缺货处理'
                            : '缺货 ' + (item.quantity - actualQty) + ' 件，请与顾客确认是否接受部分取货'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">本次核销商品</div>
                  <div className="text-sm text-gray-600">
                    {Object.values(actualQuantities).reduce((s, q) => s + q, 0)} 件
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">核销金额</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatMoney(
                      selectedOrder.items.reduce((sum, it) => {
                        const q = actualQuantities[it.productId] ?? it.quantity
                        return sum + it.unitPrice * q
                      }, 0)
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function SearchResultOrder({
  order,
  onVerify,
}: {
  order: Order
  onVerify: () => void
}) {
  const st = orderStatusMap[order.status]
  const overdue = isOverdue(order.scheduledPickupTime, order.status)
  return (
    <div
      className={
        'p-4 rounded-xl border transition-all hover:shadow-md ' +
        (overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white')
      }
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-gray-800">
              <Hash size={13} className="inline -mt-0.5 mr-1 text-gray-400" />
              {order.orderNo}
            </span>
            <span
              className={
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ' +
                st.bgColor + ' ' + st.color
            }
            >
              {st.label}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500 text-white">
                <AlertTriangle size={10} />
                已逾期
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <User size={12} />
              {order.contactName} · <span className="font-mono">{maskPhone(order.contactPhone)}</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {order.storeName}
            </span>
            <span className="flex items-center gap-1">
              <CalendarClock size={12} />
              约定 {order.scheduledPickupTime.slice(0, 16)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {order.items.slice(0, 3).map((it, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
              >
                {it.productName} x{it.quantity}
              </span>
            ))}
            {order.items.length > 3 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                +{order.items.length - 3} 件
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-0.5">订单金额</div>
            <div className="text-xl font-bold text-gray-800">{formatMoney(order.totalAmount)}</div>
          </div>
          <Button variant="success" onClick={onVerify} className="gap-1.5">
            <CheckCircle2 size={14} />
            核销
          </Button>
        </div>
      </div>
    </div>
  )
}
