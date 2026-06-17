import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../services/api'
import { Card, Button, Modal, Input, Select, Textarea, EmptyState, Badge, Tag } from '../components/ui'
import {
  Search,
  Filter,
  Eye,
  Phone,
  MessageSquare,
  Clock,
  AlertTriangle,
  XCircle,
  CalendarClock,
  Pencil,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
  Hash,
  Package,
  FileText,
  History,
  X,
  Plus,
  Trash2,
  ShoppingCart,
  Edit3,
  Ban,
} from 'lucide-react'
import type { Order, OrderStatus } from '../types'
import {
  orderStatusMap,
  contactTypeMap,
  formatMoney,
  maskPhone,
  isOverdue,
  isValidPhone,
} from '../utils/constants'

const statusFilters: { value: OrderStatus | '' | 'overdue'; label: string; color: string }[] = [
  { value: '', label: '全部', color: 'text-gray-600 bg-gray-50 border-gray-200' },
  { value: 'pending', label: '待确认', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'confirmed', label: '已确认', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'ready', label: '待取货', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  { value: 'overdue', label: '逾期未取', color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'delayed', label: '已延期', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { value: 'picked_up', label: '已完成', color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'partial', label: '部分完成', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { value: 'failed', label: '自提失败', color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'cancelled', label: '已取消', color: 'text-gray-700 bg-gray-50 border-gray-200' },
]

export default function Orders() {
  const { state, dispatch, updateOrderRemark, addContactRecord, processOrderDelay, processOrderFailed } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [keyword, setKeyword] = useState(searchParams.get('keyword') || searchParams.get('orderNo') || '')
  const [status, setStatus] = useState<OrderStatus | '' | 'overdue'>(
    (searchParams.get('status') as OrderStatus | 'overdue') || ''
  )
  const [storeId, setStoreId] = useState(searchParams.get('storeId') || '')
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRemarkModal, setShowRemarkModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showDelayModal, setShowDelayModal] = useState(false)
  const [showFailedModal, setShowFailedModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const [remarkInput, setRemarkInput] = useState('')
  const [contactType, setContactType] = useState<'phone' | 'sms' | 'wechat' | 'onsite'>('phone')
  const [contactContent, setContactContent] = useState('')
  const [delayDate, setDelayDate] = useState('')
  const [delayTime, setDelayTime] = useState('')
  const [delayRemark, setDelayRemark] = useState('')
  const [failedRemark, setFailedRemark] = useState('')

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [remarkError, setRemarkError] = useState('')
  const [contactError, setContactError] = useState('')
  const [delayError, setDelayError] = useState('')

  const [newStoreId, setNewStoreId] = useState('')
  const [newItems, setNewItems] = useState<{ productId: string; quantity: number }[]>([])
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newScheduledDate, setNewScheduledDate] = useState('')
  const [newScheduledTime, setNewScheduledTime] = useState('')
  const [newRemark, setNewRemark] = useState('')
  const [newErrors, setNewErrors] = useState<Record<string, string>>({})

  const [editContactName, setEditContactName] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editScheduledDate, setEditScheduledDate] = useState('')
  const [editScheduledTime, setEditScheduledTime] = useState('')
  const [editRemark, setEditRemark] = useState('')
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reloadOrders = useCallback(async () => {
    const res = await api.getOrders()
    if (res.success && res.data) {
      dispatch({ type: 'SET_ORDERS', payload: res.data })
    }
  }, [dispatch])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (status) params.set('status', status)
    if (storeId) params.set('storeId', storeId)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    setSearchParams(params, { replace: true })
  }, [keyword, status, storeId, startDate, endDate, setSearchParams])

  const filteredOrders = useMemo(() => {
    let list = state.orders.slice()

    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      list = list.filter(
        (o) =>
          o.orderNo.toLowerCase().includes(kw) ||
          o.contactName.toLowerCase().includes(kw) ||
          o.contactPhone.includes(kw) ||
          o.items.some((it) => it.productName.toLowerCase().includes(kw) || it.sku.toLowerCase().includes(kw))
      )
    }
    if (status) {
      if (status === 'overdue') {
        list = list.filter(
          (o) =>
            ['pending', 'confirmed', 'ready', 'delayed'].includes(o.status) &&
            isOverdue(o.scheduledPickupTime, o.status)
        )
      } else {
        list = list.filter((o) => o.status === status)
      }
    }
    if (storeId) {
      list = list.filter((o) => o.storeId === storeId)
    }
    if (startDate) {
      list = list.filter((o) => o.createdAt.slice(0, 10) >= startDate)
    }
    if (endDate) {
      list = list.filter((o) => o.createdAt.slice(0, 10) <= endDate)
    }

    return list
  }, [state.orders, keyword, status, storeId, startDate, endDate])

  const statsByStatus = useMemo(() => {
    const result: Record<string, number> = {}
    for (const o of state.orders) {
      result[o.status] = (result[o.status] ?? 0) + 1
      if (['pending', 'confirmed', 'ready', 'delayed'].includes(o.status) && isOverdue(o.scheduledPickupTime, o.status)) {
        result['overdue'] = (result['overdue'] ?? 0) + 1
      }
    }
    return result
  }, [state.orders])

  const openDetail = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
  }

  const openRemark = (order: Order) => {
    setSelectedOrder(order)
    setRemarkInput(order.remark || '')
    setRemarkError('')
    setShowRemarkModal(true)
  }

  const saveRemark = () => {
    if (!selectedOrder) return
    if (remarkInput.length > 500) {
      setRemarkError('备注内容不能超过500字')
      return
    }
    updateOrderRemark({ order: selectedOrder, remark: remarkInput.trim() })
    setShowRemarkModal(false)
    setToast({ message: '备注已更新', type: 'success' })
  }

  const openContact = (order: Order) => {
    setSelectedOrder(order)
    setContactType('phone')
    setContactContent('')
    setContactError('')
    setShowContactModal(true)
  }

  const saveContact = () => {
    if (!selectedOrder) return
    if (!contactContent.trim()) {
      setContactError('请填写联系内容')
      return
    }
    if (contactContent.length > 500) {
      setContactError('联系内容不能超过500字')
      return
    }
    addContactRecord({
      order: selectedOrder,
      type: contactType,
      content: contactContent,
      operator: state.currentUser.name,
    })
    setShowContactModal(false)
    setToast({ message: '联系记录已添加', type: 'success' })
  }

  const openDelay = (order: Order) => {
    setSelectedOrder(order)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    setDelayDate(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`)
    setDelayTime('14:00')
    setDelayRemark('')
    setDelayError('')
    setShowDelayModal(true)
  }

  const saveDelay = () => {
    if (!selectedOrder) return
    if (!delayDate || !delayTime) {
      setDelayError('请选择新的取货时间')
      return
    }
    const newTime = `${delayDate} ${delayTime}:00`
    if (new Date(newTime).getTime() < Date.now()) {
      setDelayError('新的取货时间不能早于当前时间')
      return
    }
    const res = processOrderDelay({
      order: selectedOrder,
      newScheduledTime: newTime,
      remark: delayRemark,
    })
    if (res.success) {
      setShowDelayModal(false)
      setToast({ message: res.message, type: 'success' })
    } else {
      setDelayError(res.message)
    }
  }

  const openFailed = (order: Order) => {
    setSelectedOrder(order)
    setFailedRemark('')
    setShowFailedModal(true)
  }

  const saveFailed = () => {
    if (!selectedOrder) return
    const res = processOrderFailed({
      order: selectedOrder,
      remark: failedRemark,
    })
    setShowFailedModal(false)
    setToast({ message: res.message, type: 'success' })
  }

  const clearFilters = () => {
    setKeyword('')
    setStatus('')
    setStoreId('')
    setStartDate('')
    setEndDate('')
  }

  const openCreate = () => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const d = new Date()
    d.setHours(d.getHours() + 2)
    setNewStoreId(state.currentUser.storeId || '')
    setNewItems([])
    setNewContactName('')
    setNewContactPhone('')
    setNewScheduledDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
    setNewScheduledTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
    setNewRemark('')
    setNewErrors({})
    setShowCreateModal(true)
  }

  const addNewItem = () => {
    setNewItems([...newItems, { productId: '', quantity: 1 }])
  }

  const updateNewItem = (idx: number, field: 'productId' | 'quantity', value: string | number) => {
    const arr = newItems.slice()
    if (field === 'productId') {
      arr[idx].productId = value as string
    } else {
      arr[idx].quantity = Math.max(1, value as number)
    }
    setNewItems(arr)
  }

  const removeNewItem = (idx: number) => {
    setNewItems(newItems.filter((_, i) => i !== idx))
  }

  const getNewItemStock = (productId: string, sId: string) => {
    if (!productId || !sId) return 0
    const stock = state.stocks.find((s) => s.productId === productId && s.storeId === sId)
    return stock ? stock.quantity - stock.lockedQuantity : 0
  }

  const validateCreate = () => {
    const e: Record<string, string> = {}
    if (!newStoreId) e.storeId = '请选择门店'
    if (newItems.length === 0) e.items = '请添加至少一个商品'
    newItems.forEach((it, idx) => {
      if (!it.productId) e[`item-${idx}-pid`] = '请选择商品'
      if (!it.quantity || it.quantity <= 0) e[`item-${idx}-qty`] = '数量须大于0'
    })
    if (!newContactName.trim()) e.contactName = '请输入联系人'
    if (newContactName.length > 20) e.contactName = '联系人姓名过长（最多20字）'
    if (!newContactPhone.trim()) e.contactPhone = '请输入联系电话'
    if (!/^1[3-9]\d{9}$/.test(newContactPhone.trim()) && newContactPhone.trim()) e.contactPhone = '请输入正确的手机号'
    if (!newScheduledDate || !newScheduledTime) e.scheduled = '请选择约定自提时间'
    setNewErrors(e)
    return Object.keys(e).length === 0
  }

  const saveCreate = async () => {
    if (!validateCreate() || submitting) return
    setSubmitting(true)
    try {
      const res = await api.createOrder({
        storeId: newStoreId,
        items: newItems,
        contactName: newContactName,
        contactPhone: newContactPhone,
        scheduledPickupTime: `${newScheduledDate} ${newScheduledTime}:00`,
        remark: newRemark,
      })
      if (res.success) {
        setShowCreateModal(false)
        setToast({ message: res.message, type: 'success' })
        await reloadOrders()
      } else {
        setToast({ message: res.message, type: 'error' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (order: Order) => {
    setSelectedOrder(order)
    setEditContactName(order.contactName)
    setEditContactPhone(order.contactPhone)
    const dt = order.scheduledPickupTime
    setEditScheduledDate(dt.slice(0, 10))
    setEditScheduledTime(dt.slice(11, 16))
    setEditRemark(order.remark || '')
    setEditErrors({})
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!selectedOrder || submitting) return
    const e: Record<string, string> = {}
    if (!editContactName.trim()) e.contactName = '联系人姓名不能为空'
    if (editContactName.length > 20) e.contactName = '联系人姓名过长（最多20字）'
    if (!editContactPhone.trim()) e.contactPhone = '联系电话不能为空'
    if (!/^1[3-9]\d{9}$/.test(editContactPhone.trim()) && editContactPhone.trim()) e.contactPhone = '请输入正确的手机号'
    if (!editScheduledDate || !editScheduledTime) e.scheduled = '约定自提时间不能为空'
    setEditErrors(e)
    if (Object.keys(e).length > 0) return
    setSubmitting(true)
    try {
      const res = await api.updateOrderInfo(selectedOrder.id, {
        contactName: editContactName,
        contactPhone: editContactPhone,
        scheduledPickupTime: `${editScheduledDate} ${editScheduledTime}:00`,
        remark: editRemark,
      })
      if (res.success) {
        setShowEditModal(false)
        setToast({ message: res.message, type: 'success' })
        await reloadOrders()
      } else {
        setToast({ message: res.message, type: 'error' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openCancel = (order: Order) => {
    setSelectedOrder(order)
    setCancelReason('')
    setCancelError('')
    setShowCancelModal(true)
  }

  const saveCancel = async () => {
    if (!selectedOrder || submitting) return
    if (!cancelReason.trim()) {
      setCancelError('请填写取消原因')
      return
    }
    if (cancelReason.length > 500) {
      setCancelError('取消原因不能超过500字')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.cancelOrder(selectedOrder.id, cancelReason)
      if (res.success) {
        setShowCancelModal(false)
        setToast({ message: res.message, type: 'success' })
        await reloadOrders()
      } else {
        setToast({ message: res.message, type: 'error' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg shadow-lg text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={keyword}
              onChange={setKeyword}
              placeholder="搜索订单号 / 联系人 / 电话 / 商品名称 / SKU"
              className="pl-9"
            />
          </div>
          <Select
            value={storeId}
            onChange={setStoreId}
            options={state.stores.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="所有门店"
            className="w-44"
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={setStartDate}
              placeholder="开始日期"
              className="w-36"
            />
            <span className="text-gray-400 text-sm">至</span>
            <Input
              type="date"
              value={endDate}
              onChange={setEndDate}
              placeholder="结束日期"
              className="w-36"
            />
          </div>
          <Button variant="secondary" onClick={clearFilters} className="gap-1.5">
            <RotateCcw size={14} />
            重置
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-gray-50">
          {statusFilters.map((f) => {
            const active = status === f.value
            const count = f.value ? statsByStatus[f.value] ?? 0 : state.orders.length
            return (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${active
                    ? `${f.color} shadow-sm`
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
              >
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px]
                  ${active ? 'bg-white/60' : 'bg-gray-100'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card
        title={
          <div className="flex items-center gap-2">
            <span>订单列表</span>
            <span className="text-xs text-gray-400 font-normal">
              共 {filteredOrders.length} 条
            </span>
          </div>
        }
        extra={
          <Button variant="primary" onClick={openCreate} className="gap-1.5">
            <Plus size={14} />
            新增订单
          </Button>
        }
      >
        {filteredOrders.length === 0 ? (
          <EmptyState
            title={keyword || status || storeId || startDate ? '没有找到符合条件的订单' : '暂无订单'}
            description={keyword || status || storeId || startDate ? '试试调整筛选条件或清空搜索关键词' : '新订单会自动出现在这里'}
          />
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const st = orderStatusMap[order.status]
              const overdue = ['pending', 'confirmed', 'ready', 'delayed'].includes(order.status)
                && isOverdue(order.scheduledPickupTime, order.status)
              const expanded = expandedId === order.id

              return (
                <div
                  key={order.id}
                  className={`border rounded-xl overflow-hidden transition-all
                    ${overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm bg-white'}`}
                >
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-gray-800">
                          <Hash size={13} className="inline -mt-0.5 mr-1 text-gray-400" />
                          {order.orderNo}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${st.bgColor} ${st.color}`}>
                          {st.label}
                        </span>
                        {overdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500 text-white">
                            <AlertTriangle size={10} />
                            已逾期
                          </span>
                        )}
                        {order.remark && (
                          <Tag className="truncate max-w-[180px]" title={order.remark}>
                            <FileText size={10} className="inline -mt-0.5 mr-0.5" />
                            {order.remark}
                          </Tag>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          下单 {order.createdAt.replace('T', ' ').slice(0, 16)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarClock size={12} />
                          约定 {order.scheduledPickupTime.slice(0, 16)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {order.storeName}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {order.contactName} · {maskPhone(order.contactPhone)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <div>
                        <div className="text-xs text-gray-400 mb-0.5">
                          {order.items.reduce((s, i) => s + i.quantity, 0)} 件商品
                        </div>
                        <div className="text-lg font-bold text-gray-800">{formatMoney(order.totalAmount)}</div>
                      </div>
                      <div className={`p-1.5 rounded-lg transition-transform ${expanded ? 'rotate-180 bg-gray-100' : 'bg-gray-50'}`}>
                        <ChevronDown size={18} className="text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                          <Package size={12} />
                          商品明细
                        </div>
                        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-500 bg-gray-50">
                                <th className="px-3 py-2 text-left font-medium">商品 / SKU</th>
                                <th className="px-3 py-2 text-right font-medium w-20">单价</th>
                                <th className="px-3 py-2 text-center font-medium w-20">数量</th>
                                {order.status === 'partial' && (
                                  <th className="px-3 py-2 text-center font-medium w-20">实取</th>
                                )}
                                <th className="px-3 py-2 text-right font-medium w-24">小计</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((it, i) => (
                                <tr key={i} className="border-t border-gray-50">
                                  <td className="px-3 py-2.5">
                                    <div className="font-medium text-gray-800">{it.productName}</div>
                                    <div className="text-xs text-gray-400 font-mono">{it.sku}</div>
                                  </td>
                                  <td className="px-3 py-2.5 text-right text-gray-600">{formatMoney(it.unitPrice)}</td>
                                  <td className="px-3 py-2.5 text-center text-gray-700">x{it.quantity}</td>
                                  {order.status === 'partial' && (
                                    <td className="px-3 py-2.5 text-center">
                                      <span className={it.actualQuantity !== undefined && it.actualQuantity < it.quantity ? 'text-orange-600 font-medium' : 'text-gray-700'}>
                                        x{it.actualQuantity ?? it.quantity}
                                      </span>
                                    </td>
                                  )}
                                  <td className="px-3 py-2.5 text-right font-semibold text-gray-800">
                                    {formatMoney(it.unitPrice * (it.actualQuantity ?? it.quantity))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-gray-100 bg-gray-50/50">
                                <td colSpan={order.status === 'partial' ? 4 : 3} className="px-3 py-2.5 text-right text-sm text-gray-500">
                                  订单合计
                                </td>
                                <td className="px-3 py-2.5 text-right font-bold text-blue-600">
                                  {formatMoney(
                                    order.items.reduce(
                                      (s, it) => s + it.unitPrice * (it.actualQuantity ?? it.quantity),
                                      0
                                    )
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {order.statusLogs.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                            <History size={12} />
                            状态流转
                          </div>
                          <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-3">
                            {order.statusLogs.map((log, idx) => {
                              const lst = orderStatusMap[log.status]
                              const isLast = idx === order.statusLogs.length - 1
                              return (
                                <div key={log.id} className="flex gap-3 relative">
                                  {!isLast && (
                                    <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-100" />
                                  )}
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                                    ${isLast ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                    {isLast ? (
                                      <CheckCircle2 size={12} className="text-white" />
                                    ) : (
                                      <div className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                  </div>
                                  <div className="flex-1 pt-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${lst.bgColor} ${lst.color}`}>
                                        {lst.label}
                                      </span>
                                      <span className="text-xs text-gray-400">{log.time}</span>
                                      <span className="text-xs text-gray-500">操作人：{log.operator}</span>
                                    </div>
                                    {log.remark && (
                                      <div className="mt-1 text-xs text-gray-600 bg-gray-50 rounded-md px-2.5 py-1.5 inline-block">
                                        {log.remark}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {order.contactRecords.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-2">
                            联系记录（{order.contactRecords.length}）
                          </div>
                          <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
                            {order.contactRecords.map((cr) => (
                              <div key={cr.id} className="p-3 flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                  <MessageSquare size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 text-xs mb-1">
                                    <span className="font-medium text-gray-700">{cr.operator}</span>
                                    <Badge color="blue">{contactTypeMap[cr.type]}</Badge>
                                    <span className="text-gray-400">{cr.time}</span>
                                  </div>
                                  <div className="text-sm text-gray-600">{cr.content}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button size="sm" variant="primary" onClick={() => openDetail(order)} className="gap-1.5">
                          <Eye size={14} />
                          查看详情
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openRemark(order)} className="gap-1.5">
                          <Pencil size={14} />
                          修改备注
                        </Button>
                        {!['picked_up', 'cancelled', 'failed'].includes(order.status) && (
                          <Button size="sm" variant="secondary" onClick={() => openEdit(order)} className="gap-1.5">
                            <Edit3 size={14} />
                            编辑信息
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => openContact(order)} className="gap-1.5">
                          <Phone size={14} />
                          记录联系
                        </Button>
                        {['pending', 'confirmed', 'ready', 'delayed'].includes(order.status) && (
                          <>
                            <Button size="sm" variant="warning" onClick={() => openDelay(order)} className="gap-1.5">
                              <CalendarClock size={14} />
                              处理延期
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => openFailed(order)} className="gap-1.5">
                              <XCircle size={14} />
                              标记失败
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openCancel(order)}
                              className="gap-1.5 !text-red-600 !border-red-200 hover:!bg-red-50"
                            >
                              <Ban size={14} />
                              取消订单
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => navigate('/verify?orderNo=' + order.orderNo)}
                              className="gap-1.5"
                            >
                              <CheckCircle2 size={14} />
                              立即核销
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={showDetailModal}
        title={selectedOrder ? `订单详情 · ${selectedOrder.orderNo}` : '订单详情'}
        onClose={() => setShowDetailModal(false)}
        width="max-w-4xl"
        footer={
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            关闭
          </Button>
        }
      >
        {selectedOrder && <OrderDetailContent order={selectedOrder} />}
      </Modal>

      <Modal
        open={showRemarkModal}
        title="修改订单备注"
        onClose={() => setShowRemarkModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRemarkModal(false)}>取消</Button>
            <Button variant="primary" onClick={saveRemark}>保存备注</Button>
          </>
        }
      >
        <Textarea
          label="订单备注"
          value={remarkInput}
          onChange={setRemarkInput}
          placeholder="输入备注内容，方便后续跟进..."
          rows={5}
          error={remarkError}
        />
        <div className="mt-2 text-xs text-gray-400 text-right">{remarkInput.length}/500</div>
      </Modal>

      <Modal
        open={showContactModal}
        title="添加联系记录"
        onClose={() => setShowContactModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowContactModal(false)}>取消</Button>
            <Button variant="primary" onClick={saveContact}>保存记录</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            {selectedOrder && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 mb-4 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500">联系人</span>
                  <span className="font-medium text-gray-800">{selectedOrder.contactName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">联系电话</span>
                  <span className="font-medium text-gray-800 font-mono">{selectedOrder.contactPhone}</span>
                </div>
              </div>
            )}
          </div>
          <Select
            label="联系方式"
            value={contactType}
            onChange={(v) => setContactType(v as any)}
            options={[
              { value: 'phone', label: '电话联系' },
              { value: 'sms', label: '短信通知' },
              { value: 'wechat', label: '微信沟通' },
              { value: 'onsite', label: '到店沟通' },
            ]}
          />
          <Textarea
            label="联系内容"
            value={contactContent}
            onChange={setContactContent}
            placeholder="请详细描述沟通内容、处理结果等..."
            rows={5}
            error={contactError}
          />
          <div className="mt-2 text-xs text-gray-400 text-right">{contactContent.length}/500</div>
        </div>
      </Modal>

      <Modal
        open={showDelayModal}
        title="处理延期"
        onClose={() => setShowDelayModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDelayModal(false)}>取消</Button>
            <Button variant="warning" onClick={saveDelay}>确认延期</Button>
          </>
        }
      >
        <div className="space-y-4">
          {delayError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
              <X size={14} />
              {delayError}
            </div>
          )}
          {selectedOrder && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm">
              <div className="font-medium text-amber-800 mb-1">当前订单信息</div>
              <div className="text-amber-700 text-xs space-y-0.5">
                <div>约定取货时间：{selectedOrder.scheduledPickupTime}</div>
                <div>联系人：{selectedOrder.contactName} · {selectedOrder.contactPhone}</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="新取货日期"
              type="date"
              value={delayDate}
              onChange={setDelayDate}
              required
            />
            <Input
              label="新取货时间"
              type="time"
              value={delayTime}
              onChange={setDelayTime}
              required
            />
          </div>
          <Textarea
            label="延期原因（可选）"
            value={delayRemark}
            onChange={setDelayRemark}
            placeholder="如：顾客临时有事、商品需要调整等..."
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        open={showFailedModal}
        title="标记自提失败"
        onClose={() => setShowFailedModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowFailedModal(false)}>取消</Button>
            <Button variant="danger" onClick={saveFailed}>确认标记</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
            <div className="font-medium flex items-center gap-1.5 mb-1">
              <AlertTriangle size={14} />
              注意
            </div>
            <div className="text-xs text-red-600">
              标记为自提失败后，订单将进入完成状态不再可操作，请确认已多次联系顾客且无法完成取货。
            </div>
          </div>
          <Textarea
            label="失败原因"
            value={failedRemark}
            onChange={setFailedRemark}
            placeholder="如：顾客电话无法接通、多次提醒仍未来取货等..."
            rows={4}
          />
        </div>
      </Modal>

      <Modal
        open={showCreateModal}
        title="新增到店自提订单"
        onClose={() => setShowCreateModal(false)}
        width="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>取消</Button>
            <Button variant="primary" onClick={saveCreate}>提交订单</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Select
            label="所属门店"
            value={newStoreId}
            onChange={setNewStoreId}
            options={state.stores.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="请选择门店"
            required
            error={newErrors.storeId}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                商品明细 <span className="text-red-500">*</span>
              </label>
              <Button size="sm" variant="secondary" onClick={addNewItem} className="gap-1 !py-1">
                <Plus size={12} />
                添加商品
              </Button>
            </div>
            {newErrors.items && (
              <div className="mb-2 text-xs text-red-500">{newErrors.items}</div>
            )}
            {newItems.length === 0 ? (
              <div className="p-6 rounded-lg border-2 border-dashed border-gray-200 text-center text-sm text-gray-400">
                暂无商品，点击右上角「添加商品」开始
              </div>
            ) : (
              <div className="space-y-2">
                {newItems.map((it, idx) => {
                  const product = state.products.find((p) => p.id === it.productId)
                  const stock = getNewItemStock(it.productId, newStoreId)
                  return (
                    <div key={idx} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <Select
                            value={it.productId}
                            onChange={(v) => updateNewItem(idx, 'productId', v)}
                            options={state.products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku}) · ¥${p.price}` }))}
                            placeholder="选择商品"
                            error={newErrors[`item-${idx}-pid`]}
                          />
                        </div>
                        <button
                          onClick={() => removeNewItem(idx)}
                          className="mt-1 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="移除商品"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <Input
                          type="number"
                          label="购买数量"
                          value={String(it.quantity)}
                          onChange={(v) => updateNewItem(idx, 'quantity', Number(v) || 0)}
                          min={1}
                          error={newErrors[`item-${idx}-qty`]}
                        />
                        <div>
                          <div className="text-xs text-gray-500 mb-1.5">门店库存</div>
                          <div className={`px-3 py-2 rounded-md text-sm border border-gray-100 bg-white font-medium
                            ${product && stock <= product.warningThreshold ? 'text-red-600' : 'text-gray-700'}`}>
                            {product ? `${stock} ${product.unit}` : '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1.5">小计金额</div>
                          <div className="px-3 py-2 rounded-md text-sm border border-gray-100 bg-white font-semibold text-blue-600">
                            {product ? formatMoney(product.price * it.quantity) : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {newItems.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <ShoppingCart size={14} />
                  <span>共 {newItems.reduce((s, i) => s + i.quantity, 0)} 件商品</span>
                </div>
                <div className="text-lg font-bold text-blue-700">
                  合计 {formatMoney(
                    newItems.reduce((s, i) => {
                      const p = state.products.find((pp) => pp.id === i.productId)
                      return s + (p ? p.price * i.quantity : 0)
                    }, 0)
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="联系人姓名"
              value={newContactName}
              onChange={setNewContactName}
              placeholder="请输入联系人姓名"
              required
              error={newErrors.contactName}
            />
            <Input
              label="联系电话"
              value={newContactPhone}
              onChange={setNewContactPhone}
              placeholder="请输入11位手机号"
              required
              error={newErrors.contactPhone}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="约定取货日期"
              type="date"
              value={newScheduledDate}
              onChange={setNewScheduledDate}
              required
              error={newErrors.scheduled}
            />
            <Input
              label="约定取货时间"
              type="time"
              value={newScheduledTime}
              onChange={setNewScheduledTime}
              required
            />
          </div>

          <Textarea
            label="订单备注（可选）"
            value={newRemark}
            onChange={setNewRemark}
            placeholder="如：包装要求、留言等..."
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        open={showEditModal}
        title={selectedOrder ? `编辑订单信息 · ${selectedOrder.orderNo}` : '编辑订单信息'}
        onClose={() => setShowEditModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>取消</Button>
            <Button variant="primary" onClick={saveEdit}>保存修改</Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedOrder && ['picked_up', 'cancelled', 'failed'].includes(selectedOrder.status) && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700">
              当前订单已处于终态，不可修改
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="联系人姓名"
              value={editContactName}
              onChange={setEditContactName}
              placeholder="请输入联系人姓名"
              required
              error={editErrors.contactName}
            />
            <Input
              label="联系电话"
              value={editContactPhone}
              onChange={setEditContactPhone}
              placeholder="请输入11位手机号"
              required
              error={editErrors.contactPhone}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="约定取货日期"
              type="date"
              value={editScheduledDate}
              onChange={setEditScheduledDate}
              required
              error={editErrors.scheduled}
            />
            <Input
              label="约定取货时间"
              type="time"
              value={editScheduledTime}
              onChange={setEditScheduledTime}
              required
            />
          </div>
          <Textarea
            label="订单备注（可选）"
            value={editRemark}
            onChange={setEditRemark}
            placeholder="如：包装要求、留言等..."
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        open={showCancelModal}
        title={selectedOrder ? `取消订单 · ${selectedOrder.orderNo}` : '取消订单'}
        onClose={() => setShowCancelModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>取消操作</Button>
            <Button variant="danger" onClick={saveCancel}>确认取消</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
            <div className="font-medium flex items-center gap-1.5 mb-1">
              <AlertTriangle size={14} />
              重要提示
            </div>
            <div className="text-xs text-red-600">
              取消订单后将无法恢复，订单状态会变为「已取消」。请确认已与顾客沟通并达成一致。
            </div>
          </div>
          {selectedOrder && (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">联系人</span>
                <span className="font-medium text-gray-800">{selectedOrder.contactName} · {selectedOrder.contactPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">约定自提</span>
                <span className="font-medium text-gray-800">{selectedOrder.scheduledPickupTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">商品数量</span>
                <span className="font-medium text-gray-800">{selectedOrder.items.reduce((s, i) => s + i.quantity, 0)} 件 · {formatMoney(selectedOrder.totalAmount)}</span>
              </div>
            </div>
          )}
          <Textarea
            label="取消原因"
            value={cancelReason}
            onChange={setCancelReason}
            placeholder="请详细填写取消原因，例如：顾客主动取消、门店缺货无法履约等..."
            rows={4}
            required
            error={cancelError}
          />
          <div className="text-xs text-gray-400 text-right">{cancelReason.length}/500</div>
        </div>
      </Modal>
    </div>
  )
}

function OrderDetailContent({ order }: { order: Order }) {
  const st = orderStatusMap[order.status]
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">订单编号</div>
          <div className="font-mono font-semibold text-gray-800">{order.orderNo}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">订单状态</div>
          <div className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${st.bgColor} ${st.color}`}>
            {st.label}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">下单时间</div>
          <div className="text-sm font-medium text-gray-800">{order.createdAt}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">约定取货</div>
          <div className="text-sm font-medium text-gray-800">{order.scheduledPickupTime}</div>
        </div>
        {order.actualPickupTime && (
          <div className="p-3 rounded-lg bg-green-50">
            <div className="text-xs text-green-600 mb-1">实际取货</div>
            <div className="text-sm font-medium text-green-700">{order.actualPickupTime}</div>
          </div>
        )}
        <div className="p-3 rounded-lg bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">所属门店</div>
          <div className="text-sm font-medium text-gray-800">{order.storeName}</div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
        <div className="text-xs text-blue-600 mb-2 font-medium flex items-center gap-1">
          <User size={12} />
          取货人信息
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">联系人</div>
            <div className="font-medium text-gray-800">{order.contactName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">联系电话</div>
            <div className="font-medium text-gray-800 font-mono">{order.contactPhone}</div>
          </div>
          {order.pickupPerson && (
            <>
              <div>
                <div className="text-xs text-gray-500">实际取货人</div>
                <div className="font-medium text-gray-800">{order.pickupPerson}</div>
              </div>
              {order.pickupPersonIdCard && (
                <div>
                  <div className="text-xs text-gray-500">取货人证件</div>
                  <div className="font-medium text-gray-800 font-mono text-xs">{order.pickupPersonIdCard}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-700 mb-2">商品清单</div>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b">
                <th className="px-4 py-2.5 text-left font-medium">商品名称</th>
                <th className="px-4 py-2.5 text-left font-medium w-28">SKU</th>
                <th className="px-4 py-2.5 text-right font-medium w-24">单价</th>
                <th className="px-4 py-2.5 text-center font-medium w-20">购买</th>
                <th className="px-4 py-2.5 text-center font-medium w-20">实取</th>
                <th className="px-4 py-2.5 text-right font-medium w-28">小计</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{it.productName}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{it.sku}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatMoney(it.unitPrice)}</td>
                  <td className="px-4 py-3 text-center text-gray-700">x{it.quantity}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={it.actualQuantity !== undefined && it.actualQuantity < it.quantity ? 'text-orange-600 font-medium' : 'text-gray-700'}>
                      x{it.actualQuantity ?? it.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {formatMoney(it.unitPrice * (it.actualQuantity ?? it.quantity))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {order.remark && (
        <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100 text-sm">
          <div className="text-xs text-amber-600 mb-1 font-medium">订单备注</div>
          <div className="text-amber-800">{order.remark}</div>
        </div>
      )}
    </div>
  )
}
