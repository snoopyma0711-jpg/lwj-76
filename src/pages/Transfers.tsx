import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Card, Button, Modal, Input, Select, Textarea, EmptyState, Badge, Tag } from '../components/ui'
import {
  ArrowRightLeft,
  Plus,
  Search,
  Store as StoreIcon,
  Package,
  CalendarClock,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Hash,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Eye,
  ChevronRight,
  FileText,
  X,
  Minus,
  Plus as PlusIcon,
  Filter,
  Check,
  AlertCircle,
  History,
} from 'lucide-react'
import { transferStatusMap, transferTypeMap, formatMoney } from '../utils/constants'
import type { Transfer, TransferStatus, TransferType } from '../types'

const statusTabs: { value: TransferStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'approved', label: '待出库' },
  { value: 'outbound', label: '已出库' },
  { value: 'in_transit', label: '运输中' },
  { value: 'inbound', label: '待入库' },
  { value: 'completed', label: '已完成' },
  { value: 'rejected', label: '已拒绝' },
]

export default function Transfers() {
  const { state, createTransfer, approveTransfer, rejectTransfer, processTransferOutbound, processTransferInTransit, processTransferInbound, getStoreAvailableStock } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<TransferStatus | 'all'>(
    (searchParams.get('status') as TransferStatus) || 'all'
  )
  const [searchKeyword, setSearchKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransferType | 'all'>('all')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')

  const [createType, setCreateType] = useState<TransferType>('replenish')
  const [fromStoreId, setFromStoreId] = useState('')
  const [toStoreId, setToStoreId] = useState(state.currentUser.storeId)
  const [createItems, setCreateItems] = useState<{ productId: string; quantity: number }[]>([])
  const [createReason, setCreateReason] = useState('')
  const [expectedArrivalTime, setExpectedArrivalTime] = useState('')
  const [createError, setCreateError] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)

  const filteredTransfers = useMemo(() => {
    let list = [...state.transfers]
    if (activeTab !== 'all') {
      list = list.filter((t) => t.status === activeTab)
    }
    if (typeFilter !== 'all') {
      list = list.filter((t) => t.type === typeFilter)
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      list = list.filter(
        (t) =>
          t.transferNo.toLowerCase().includes(kw) ||
          t.fromStoreName.toLowerCase().includes(kw) ||
          t.toStoreName.toLowerCase().includes(kw) ||
          t.items.some((item) => item.productName.toLowerCase().includes(kw))
      )
    }
    return list
  }, [state.transfers, activeTab, typeFilter, searchKeyword])

  const stats = useMemo(() => {
    return {
      total: state.transfers.length,
      pending: state.transfers.filter((t) => t.status === 'pending').length,
      inProgress: state.transfers.filter((t) =>
        ['approved', 'outbound', 'in_transit', 'inbound'].includes(t.status)
      ).length,
      completed: state.transfers.filter((t) => t.status === 'completed').length,
    }
  }, [state.transfers])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const openDetail = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setShowDetailModal(true)
  }

  const openCreate = (type?: TransferType) => {
    setCreateType(type || 'replenish')
    setFromStoreId('')
    setToStoreId(state.currentUser.storeId)
    setCreateItems([])
    setCreateReason('')
    setExpectedArrivalTime('')
    setCreateError('')
    setProductSearch('')
    setShowProductPicker(false)
    setShowCreateModal(true)
  }

  const addProduct = (productId: string) => {
    if (createItems.some((i) => i.productId === productId)) return
    setCreateItems([...createItems, { productId, quantity: 1 }])
    setShowProductPicker(false)
    setProductSearch('')
  }

  const removeProduct = (productId: string) => {
    setCreateItems(createItems.filter((i) => i.productId !== productId))
  }

  const updateItemQuantity = (productId: string, quantity: number) => {
    setCreateItems(
      createItems.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i))
    )
  }

  const submitCreate = async () => {
    setCreateError('')
    const res = await createTransfer({
      type: createType,
      fromStoreId,
      toStoreId,
      items: createItems,
      reason: createReason,
      expectedArrivalTime: expectedArrivalTime || undefined,
    })
    if (res.success) {
      setShowCreateModal(false)
      showToast('🎉 申请提交成功！', 'success')
    } else {
      setCreateError(res.message)
    }
  }

  const handleApprove = async () => {
    if (!selectedTransfer) return
    const res = await approveTransfer({ transfer: selectedTransfer })
    if (res.success) {
      const updated = state.transfers.find((t) => t.id === selectedTransfer.id)
      if (updated) setSelectedTransfer(updated)
      showToast('✅ 审批通过', 'success')
    } else {
      showToast(res.message, 'error')
    }
  }

  const handleReject = () => {
    setShowRejectModal(true)
    setRejectReason('')
    setRejectError('')
  }

  const submitReject = async () => {
    setRejectError('')
    if (!selectedTransfer) return
    const res = await rejectTransfer({ transfer: selectedTransfer, reason: rejectReason })
    if (res.success) {
      setShowRejectModal(false)
      const updated = state.transfers.find((t) => t.id === selectedTransfer.id)
      if (updated) setSelectedTransfer(updated)
      showToast('已拒绝申请', 'success')
    } else {
      setRejectError(res.message)
    }
  }

  const handleOutbound = async () => {
    if (!selectedTransfer) return
    const res = await processTransferOutbound({ transfer: selectedTransfer })
    if (res.success) {
      const updated = state.transfers.find((t) => t.id === selectedTransfer.id)
      if (updated) setSelectedTransfer(updated)
      showToast('📦 出库成功', 'success')
    } else {
      showToast(res.message, 'error')
    }
  }

  const handleInTransit = async () => {
    if (!selectedTransfer) return
    const res = await processTransferInTransit({ transfer: selectedTransfer })
    if (res.success) {
      const updated = state.transfers.find((t) => t.id === selectedTransfer.id)
      if (updated) setSelectedTransfer(updated)
      showToast('🚚 已标记为运输中', 'success')
    } else {
      showToast(res.message, 'error')
    }
  }

  const handleInbound = async () => {
    if (!selectedTransfer) return
    const res = await processTransferInbound({ transfer: selectedTransfer })
    if (res.success) {
      const updated = state.transfers.find((t) => t.id === selectedTransfer.id)
      if (updated) setSelectedTransfer(updated)
      showToast('✅ 入库成功，调拨已完成', 'success')
    } else {
      showToast(res.message, 'error')
    }
  }

  const availableProducts = useMemo(() => {
    if (!productSearch.trim()) return state.products.slice(0, 8)
    const kw = productSearch.trim().toLowerCase()
    return state.products
      .filter((p) => p.name.toLowerCase().includes(kw) || p.sku.toLowerCase().includes(kw))
      .slice(0, 10)
  }, [state.products, productSearch])

  const canApprove = selectedTransfer?.status === 'pending'
  const canReject = selectedTransfer?.status === 'pending'
  const canOutbound = selectedTransfer?.status === 'approved'
  const canInTransit = selectedTransfer?.status === 'outbound'
  const canInbound = ['in_transit', 'inbound'].includes(selectedTransfer?.status || '')

  return (
    <div className="space-y-5">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="!border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-500 mb-1 font-medium">全部申请</div>
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500">
              <FileText size={28} />
            </div>
          </div>
        </Card>
        <Card className="!border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-500 mb-1 font-medium">待处理</div>
              <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-500">
              <AlertTriangle size={28} />
            </div>
          </div>
        </Card>
        <Card className="!border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-purple-500 mb-1 font-medium">进行中</div>
              <div className="text-3xl font-bold text-purple-600">{stats.inProgress}</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-500">
              <Truck size={28} />
            </div>
          </div>
        </Card>
        <Card className="!border-green-200 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-green-500 mb-1 font-medium">已完成</div>
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-500">
              <CheckCircle2 size={28} />
            </div>
          </div>
        </Card>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-blue-500" />
            <span>调拨补货管理</span>
          </div>
        }
        extra={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => openCreate('replenish')}
              className="gap-1.5"
            >
              <ArrowDownToLine size={16} />
              发起补货
            </Button>
            <Button
              variant="secondary"
              onClick={() => openCreate('transfer')}
              className="gap-1.5"
            >
              <ArrowRightLeft size={16} />
              发起调拨
            </Button>
          </div>
        }
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === tab.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as TransferType | 'all')}
              options={[
                { value: 'all', label: '全部类型' },
                { value: 'replenish', label: '补货申请' },
                { value: 'transfer', label: '门店调拨' },
              ]}
              className="w-32"
            />
            <div className="relative flex-1 md:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchKeyword}
                onChange={setSearchKeyword}
                placeholder="搜索单号/门店/商品"
                className="!pl-9"
              />
            </div>
          </div>
        </div>

        {filteredTransfers.length === 0 ? (
          <EmptyState
            title="暂无申请记录"
            description="点击右上角按钮发起新的补货或调拨申请"
            icon={
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                <FileText size={32} className="text-gray-300" />
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredTransfers.map((transfer) => (
              <TransferCard
                key={transfer.id}
                transfer={transfer}
                onClick={() => openDetail(transfer)}
              />
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={showCreateModal}
        title={
          <div className="flex items-center gap-2">
            {createType === 'replenish' ? (
              <ArrowDownToLine size={18} className="text-blue-500" />
            ) : (
              <ArrowRightLeft size={18} className="text-purple-500" />
            )}
            <span>发起{createType === 'replenish' ? '补货' : '调拨'}申请</span>
          </div>
        }
        onClose={() => setShowCreateModal(false)}
        width="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>取消</Button>
            <Button variant="primary" onClick={submitCreate} className="gap-1.5">
              <Plus size={14} />
              提交申请
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{createError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1.5">申请类型</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCreateType('replenish')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    createType === 'replenish'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ArrowDownToLine size={14} className="inline mr-1" />
                  补货申请
                </button>
                <button
                  onClick={() => setCreateType('transfer')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    createType === 'transfer'
                      ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ArrowRightLeft size={14} className="inline mr-1" />
                  门店调拨
                </button>
              </div>
            </div>
          </div>

          {createType === 'transfer' && (
            <Select
              label="调出门店 *"
              value={fromStoreId}
              onChange={setFromStoreId}
              options={state.stores.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="请选择调出门店"
              required
            />
          )}

          <Select
            label="调入门店 *"
            value={toStoreId}
            onChange={setToStoreId}
            options={state.stores.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="请选择调入门店"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              商品明细 *
            </label>
            <div className="space-y-2">
              {createItems.map((item) => {
                const product = state.products.find((p) => p.id === item.productId)
                const stock = createType === 'transfer' && fromStoreId
                  ? getStoreAvailableStock(fromStoreId, item.productId)
                  : null
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-800">{product?.name}</div>
                      <div className="text-xs text-gray-400">
                        SKU: {product?.sku} · 单价: {formatMoney(product?.price || 0)}
                        {stock !== null && (
                          <span className={stock < item.quantity ? 'text-red-500 ml-2' : 'ml-2'}>
                            · 调出店库存: {stock} {product?.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                      >
                        <Minus size={12} />
                      </button>
                      <div className="w-12 text-center font-semibold">{item.quantity}</div>
                      <button
                        onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                      >
                        <PlusIcon size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeProduct(item.productId)}
                      className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}

              <div className="relative">
                <button
                  onClick={() => setShowProductPicker(!showProductPicker)}
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-colors"
                >
                  <Plus size={16} className="inline mr-1" />
                  添加商品
                </button>

                {showProductPicker && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <Input
                        value={productSearch}
                        onChange={setProductSearch}
                        placeholder="搜索商品名称或 SKU"
                        className="!text-sm"
                      />
                    </div>
                    <div className="max-h-60 overflow-auto">
                      {availableProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">没有找到商品</div>
                      ) : (
                        availableProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => addProduct(product.id)}
                            disabled={createItems.some((i) => i.productId === product.id)}
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-b-0 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <div className="text-sm font-medium text-gray-800">{product.name}</div>
                            <div className="text-xs text-gray-400">
                              SKU: {product.sku} · {formatMoney(product.price)}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Input
            label="期望到货时间"
            type="datetime-local"
            value={expectedArrivalTime}
            onChange={setExpectedArrivalTime}
          />

          <Textarea
            label="申请原因 *"
            value={createReason}
            onChange={setCreateReason}
            placeholder="请详细说明申请原因，如库存预警、促销活动备货等"
            rows={3}
            required
          />
        </div>
      </Modal>

      <Modal
        open={showDetailModal}
        title={
          <div className="flex items-center gap-2">
            {selectedTransfer?.type === 'replenish' ? (
              <ArrowDownToLine size={18} className="text-blue-500" />
            ) : (
              <ArrowRightLeft size={18} className="text-purple-500" />
            )}
            <span>申请详情</span>
            {selectedTransfer && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${transferStatusMap[selectedTransfer.status].bgColor} ${transferStatusMap[selectedTransfer.status].color}`}>
                {transferStatusMap[selectedTransfer.status].label}
              </span>
            )}
          </div>
        }
        onClose={() => setShowDetailModal(false)}
        width="max-w-3xl"
        footer={
          selectedTransfer ? (
            <div className="flex items-center justify-between w-full">
              <div>
                {canApprove && (
                  <Button variant="success" onClick={handleApprove} className="gap-1.5 mr-2">
                    <CheckCircle2 size={14} />
                    审批通过
                  </Button>
                )}
                {canReject && (
                  <Button variant="danger" onClick={handleReject} className="gap-1.5">
                    <XCircle size={14} />
                    拒绝申请
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canOutbound && (
                  <Button variant="primary" onClick={handleOutbound} className="gap-1.5">
                    <ArrowUpFromLine size={14} />
                    确认出库
                  </Button>
                )}
                {canInTransit && (
                  <Button variant="primary" onClick={handleInTransit} className="gap-1.5">
                    <Truck size={14} />
                    标记运输中
                  </Button>
                )}
                {canInbound && (
                  <Button variant="success" onClick={handleInbound} className="gap-1.5">
                    <ArrowDownToLine size={14} />
                    确认入库
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setShowDetailModal(false)}>关闭</Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {selectedTransfer && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Hash size={12} />
                    申请单号
                  </div>
                  <div className="font-mono font-semibold text-gray-800">{selectedTransfer.transferNo}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <FileText size={12} />
                    申请类型
                  </div>
                  <div>
                    <Badge color={selectedTransfer.type === 'replenish' ? 'blue' : 'purple'}>
                      {transferTypeMap[selectedTransfer.type].label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <User size={12} />
                    申请人
                  </div>
                  <div className="text-sm font-medium text-gray-800">{selectedTransfer.createdBy}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Clock size={12} />
                    申请时间
                  </div>
                  <div className="text-sm text-gray-800">{selectedTransfer.createdAt.slice(0, 16)}</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <StoreIcon size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-0.5">调出 / 发出</div>
                  <div className="font-medium text-gray-800">{selectedTransfer.fromStoreName}</div>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
                <div className="flex-1 text-right">
                  <div className="text-xs text-gray-500 mb-0.5">调入 / 接收</div>
                  <div className="font-medium text-gray-800">{selectedTransfer.toStoreName}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
                  <StoreIcon size={18} />
                </div>
              </div>
              {selectedTransfer.expectedArrivalTime && (
                <div className="pt-3 border-t border-gray-50 flex items-center gap-2 text-sm">
                  <CalendarClock size={14} className="text-gray-400" />
                  <span className="text-gray-500">期望到货时间：</span>
                  <span className="font-medium text-gray-700">{selectedTransfer.expectedArrivalTime.slice(0, 16)}</span>
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Package size={16} />
                商品明细
              </div>
              <div className="space-y-2">
                {selectedTransfer.items.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800">{item.productName}</div>
                        <div className="text-xs text-gray-400">SKU: {item.sku} · 单价: {formatMoney(item.unitPrice)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-800">x{item.quantity}</div>
                        <div className="text-xs text-gray-400">{formatMoney(item.unitPrice * item.quantity)}</div>
                      </div>
                    </div>
                    {(item.actualOutboundQuantity !== undefined || item.actualInboundQuantity !== undefined) && (
                      <div className="pt-2 border-t border-gray-50 flex items-center gap-4 text-xs">
                        {item.actualOutboundQuantity !== undefined && (
                          <span className="text-cyan-600">
                            实际出库: {item.actualOutboundQuantity}
                          </span>
                        )}
                        {item.actualInboundQuantity !== undefined && (
                          <span className="text-green-600">
                            实际入库: {item.actualInboundQuantity}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-lg bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-500">商品合计</span>
                <span className="text-xl font-bold text-blue-600">{formatMoney(selectedTransfer.totalAmount)}</span>
              </div>
            </div>

            {selectedTransfer.reason && (
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="text-sm font-semibold text-blue-800 mb-1">申请原因</div>
                <div className="text-sm text-blue-700">{selectedTransfer.reason}</div>
              </div>
            )}

            {selectedTransfer.rejectReason && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                <div className="text-sm font-semibold text-red-800 mb-1">拒绝原因</div>
                <div className="text-sm text-red-700">{selectedTransfer.rejectReason}</div>
              </div>
            )}

            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <History size={16} />
                处理记录
              </div>
              <div className="relative pl-6 space-y-4">
                {selectedTransfer.statusLogs.map((log, index) => {
                  const isLast = index === selectedTransfer.statusLogs.length - 1
                  const st = transferStatusMap[log.status]
                  return (
                    <div key={log.id} className="relative">
                      <div
                        className={`absolute -left-6 top-0.5 w-3 h-3 rounded-full border-2 ${
                          isLast
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-gray-300'
                        }`}
                      />
                      {!isLast && (
                        <div className="absolute -left-[22px] top-4 bottom-0 w-px bg-gray-200" />
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${st.bgColor} ${st.color}`}>
                          {st.label}
                        </span>
                        <span className="text-xs text-gray-400">{log.time}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">操作人：</span>
                        {log.operator}
                      </div>
                      {log.remark && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          备注：{log.remark}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showRejectModal}
        title={
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-500" />
            <span>拒绝申请</span>
          </div>
        }
        onClose={() => setShowRejectModal(false)}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>取消</Button>
            <Button variant="danger" onClick={submitReject}>确认拒绝</Button>
          </>
        }
      >
        <div className="space-y-3">
          {rejectError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{rejectError}</span>
            </div>
          )}
          <Textarea
            label="拒绝原因 *"
            value={rejectReason}
            onChange={setRejectReason}
            placeholder="请填写拒绝原因"
            rows={4}
            required
          />
        </div>
      </Modal>
    </div>
  )
}

function TransferCard({ transfer, onClick }: { transfer: Transfer; onClick: () => void }) {
  const typeSt = transferTypeMap[transfer.type]
  const statusSt = transferStatusMap[transfer.status]

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-gray-800">
              <Hash size={12} className="inline -mt-0.5 mr-1 text-gray-400" />
              {transfer.transferNo}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeSt.bgColor} ${typeSt.color}`}>
              {typeSt.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusSt.bgColor} ${statusSt.color}`}>
              {statusSt.label}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm mb-2">
            <span className="text-gray-600">{transfer.fromStoreName}</span>
            <ArrowRightLeft size={14} className="text-gray-300" />
            <span className="text-gray-600">{transfer.toStoreName}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {transfer.items.slice(0, 3).map((item, i) => (
              <Tag key={i}>
                {item.productName} x{item.quantity}
              </Tag>
            ))}
            {transfer.items.length > 3 && (
              <Tag>+{transfer.items.length - 3} 件</Tag>
            )}
          </div>

          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {transfer.createdAt.slice(0, 16)}
            </span>
            {transfer.expectedArrivalTime && (
              <span className="flex items-center gap-1">
                <CalendarClock size={12} />
                预计 {transfer.expectedArrivalTime.slice(5, 10)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User size={12} />
              {transfer.createdBy}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-0.5">申请金额</div>
            <div className="text-lg font-bold text-gray-800">{formatMoney(transfer.totalAmount)}</div>
          </div>
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
            查看详情
            <Eye size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
