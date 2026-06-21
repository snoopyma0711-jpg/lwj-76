import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Card, Button, Modal, EmptyState, Badge, Tag, Table, Select, Input, Textarea, Toast } from '../components/ui'
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Store as StoreIcon,
  Truck,
  Package,
  Calendar,
  User,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatMoney, purchaseStatusMap, getDateString } from '../utils/constants'
import type { Purchase, PurchaseStatus, Supplier, Product, Store } from '../types'

export default function Purchases() {
  const { state, refreshPurchases, createPurchase, approvePurchase, rejectPurchase, placePurchaseOrder, receivePurchaseItem, cancelPurchase } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterStatus, setFilterStatus] = useState<PurchaseStatus | 'all'>('all')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterStore, setFilterStore] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })

  const prefillProductId = searchParams.get('productId')
  const prefillStoreId = searchParams.get('storeId')
  const prefillQuantity = searchParams.get('quantity')

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  useEffect(() => {
    if (prefillProductId || prefillStoreId) {
      setShowCreateModal(true)
    }
  }, [prefillProductId, prefillStoreId])

  const filteredPurchases = useMemo(() => {
    let list = state.purchases.slice()
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.purchaseNo.toLowerCase().includes(kw) ||
          p.supplierName.toLowerCase().includes(kw) ||
          p.storeName.toLowerCase().includes(kw) ||
          p.items.some((it) => it.productName.toLowerCase().includes(kw) || it.sku.toLowerCase().includes(kw)),
      )
    }
    if (filterStatus !== 'all') list = list.filter((p) => p.status === filterStatus)
    if (filterSupplier) list = list.filter((p) => p.supplierId === filterSupplier)
    if (filterStore) list = list.filter((p) => p.storeId === filterStore)
    if (startDate) list = list.filter((p) => p.createdAt.slice(0, 10) >= startDate)
    if (endDate) list = list.filter((p) => p.createdAt.slice(0, 10) <= endDate)
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [state.purchases, searchKeyword, filterStatus, filterSupplier, filterStore, startDate, endDate])

  const stats = useMemo(() => {
    const all = state.purchases
    return {
      total: all.length,
      pendingApproval: all.filter((p) => p.status === 'pending_approval').length,
      pendingOrder: all.filter((p) => p.status === 'approved' || p.status === 'pending_order').length,
      pendingArrival: all.filter((p) => p.status === 'ordered' || p.status === 'pending_arrival').length,
      partialArrival: all.filter((p) => p.status === 'partial_arrival').length,
      completed: all.filter((p) => p.status === 'completed').length,
      totalAmount: all.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.totalAmount, 0),
    }
  }, [state.purchases])

  const openDetail = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setShowDetailModal(true)
  }

  const handleCreate = async (data: {
    supplierId: string
    storeId: string
    items: { productId: string; quantity: number; unitPrice: number }[]
    expectedArrivalTime: string
    reason: string
  }) => {
    const res = await createPurchase(data)
    if (res.success) {
      showToast(res.message, 'success')
      setShowCreateModal(false)
    } else {
      showToast(res.message, 'error')
    }
  }

  const handleApprove = async (remark?: string) => {
    if (!selectedPurchase) return
    const res = await approvePurchase({ purchase: selectedPurchase, remark })
    if (res.success) {
      showToast(res.message, 'success')
      setShowApproveModal(false)
      await refreshPurchases()
      const updated = state.purchases.find((p) => p.id === selectedPurchase.id)
      if (updated) setSelectedPurchase(updated)
    } else {
      showToast(res.message, 'error')
    }
  }

  const handleReject = async (reason: string) => {
    if (!selectedPurchase) return
    const res = await rejectPurchase({ purchase: selectedPurchase, reason })
    if (res.success) {
      showToast(res.message, 'success')
      setShowRejectModal(false)
      await refreshPurchases()
      const updated = state.purchases.find((p) => p.id === selectedPurchase.id)
      if (updated) setSelectedPurchase(updated)
    } else {
      showToast(res.message, 'error')
    }
  }

  const handlePlaceOrder = async (remark?: string) => {
    if (!selectedPurchase) return
    const res = await placePurchaseOrder({ purchase: selectedPurchase, remark })
    if (res.success) {
      showToast(res.message, 'success')
      await refreshPurchases()
      const updated = state.purchases.find((p) => p.id === selectedPurchase.id)
      if (updated) setSelectedPurchase(updated)
    } else {
      showToast(res.message, 'error')
    }
  }

  const handleReceive = async (items: { purchaseItemId: string; quantity: number; differenceReason?: string }[], remark?: string) => {
    if (!selectedPurchase) return
    const res = await receivePurchaseItem({ purchase: selectedPurchase, items, remark })
    if (res.success) {
      showToast(res.message, 'success')
      setShowReceiveModal(false)
      await refreshPurchases()
      const updated = state.purchases.find((p) => p.id === selectedPurchase.id)
      if (updated) setSelectedPurchase(updated)
    } else {
      showToast(res.message, 'error')
    }
  }

  const handleCancel = async (reason: string) => {
    if (!selectedPurchase) return
    const res = await cancelPurchase({ purchase: selectedPurchase, reason })
    if (res.success) {
      showToast(res.message, 'success')
      setShowCancelModal(false)
      await refreshPurchases()
      const updated = state.purchases.find((p) => p.id === selectedPurchase.id)
      if (updated) setSelectedPurchase(updated)
    } else {
      showToast(res.message, 'error')
    }
  }

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'pending_approval', label: '待审批' },
    { value: 'approved', label: '待下单' },
    { value: 'ordered', label: '待到货' },
    { value: 'partial_arrival', label: '部分到货' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ]

  const supplierOptions = state.suppliers.map((s) => ({ value: s.id, label: s.name }))
  const storeOptions = state.stores.map((s) => ({ value: s.id, label: s.name }))

  return (
    <div className="space-y-5">
      {toast.show && <Toast message={toast.message} type={toast.type} />}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="!border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-500 mb-1 font-medium">采购单总数</div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500">
              <FileText size={24} />
            </div>
          </div>
        </Card>
        <Card className="!border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-500 mb-1 font-medium">待审批</div>
              <div className="text-2xl font-bold text-amber-600">{stats.pendingApproval}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-500">
              <Clock size={24} />
            </div>
          </div>
        </Card>
        <Card className="!border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-cyan-500 mb-1 font-medium">待下单</div>
              <div className="text-2xl font-bold text-cyan-600">{stats.pendingOrder}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-500">
              <ShoppingCart size={24} />
            </div>
          </div>
        </Card>
        <Card className="!border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-indigo-500 mb-1 font-medium">待到货</div>
              <div className="text-2xl font-bold text-indigo-600">{stats.pendingArrival}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-500">
              <Truck size={24} />
            </div>
          </div>
        </Card>
        <Card className="!border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-orange-500 mb-1 font-medium">部分到货</div>
              <div className="text-2xl font-bold text-orange-600">{stats.partialArrival}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
              <Package size={24} />
            </div>
          </div>
        </Card>
        <Card className="!border-green-200 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-green-500 mb-1 font-medium">已完成金额</div>
              <div className="text-2xl font-bold text-green-600">{formatMoney(stats.totalAmount)}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-500">
              <DollarSign size={24} />
            </div>
          </div>
        </Card>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-500" />
            <span>采购单列表</span>
            {filteredPurchases.length > 0 && (
              <Tag className="bg-blue-50 text-blue-600 border-blue-100">
                共 {filteredPurchases.length} 条
              </Tag>
            )}
          </div>
        }
        extra={
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} className="gap-1.5">
            <Plus size={14} />
            新建采购
          </Button>
        }
      >
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索采购单号、供应商、门店、商品..."
                value={searchKeyword}
                onChange={setSearchKeyword}
                className="pl-9"
              />
            </div>
          </div>
          <Select
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as PurchaseStatus | 'all')}
            options={statusOptions}
            className="w-36"
          />
          <Select
            value={filterSupplier}
            onChange={setFilterSupplier}
            options={[{ value: '', label: '全部供应商' }, ...supplierOptions]}
            className="w-48"
          />
          <Select
            value={filterStore}
            onChange={setFilterStore}
            options={[{ value: '', label: '全部门店' }, ...storeOptions]}
            className="w-40"
          />
          <Input
            type="date"
            value={startDate}
            onChange={setStartDate}
            className="w-36"
          />
          <Input
            type="date"
            value={endDate}
            onChange={setEndDate}
            className="w-36"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchKeyword('')
              setFilterStatus('all')
              setFilterSupplier('')
              setFilterStore('')
              setStartDate('')
              setEndDate('')
            }}
            className="gap-1"
          >
            <X size={14} />
            重置
          </Button>
        </div>

        {filteredPurchases.length === 0 ? (
          <EmptyState
            title="暂无采购单"
            description="点击右上角「新建采购」按钮创建第一笔采购单"
            icon={
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                <ShoppingCart size={32} className="text-gray-400" />
              </div>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">采购单号</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">供应商</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">入库门店</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">商品明细</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">采购金额</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">期望到货</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">创建时间</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((purchase) => {
                const st = purchaseStatusMap[purchase.status]
                return (
                  <tr key={purchase.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(purchase)}>
                    <td className="py-3 px-4 font-mono text-sm font-medium text-gray-800">{purchase.purchaseNo}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Truck size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-800">{purchase.supplierName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <StoreIcon size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700">{purchase.storeName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs">
                        <div className="text-gray-700">{purchase.items.length} 种商品</div>
                        <div className="text-gray-400 mt-0.5">
                          共 {purchase.items.reduce((s, it) => s + it.quantity, 0)} {purchase.items[0]?.unit || '件'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{formatMoney(purchase.totalAmount)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{purchase.expectedArrivalTime.slice(0, 16)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${st.bgColor} ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{purchase.createdAt.slice(0, 16)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="!px-2 !py-1 !text-xs"
                          onClick={(e) => {
                            e?.stopPropagation()
                            openDetail(purchase)
                          }}
                        >
                          查看
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {showCreateModal && (
        <CreatePurchaseModal
          suppliers={state.suppliers}
          stores={state.stores}
          products={state.products}
          prefillProductId={prefillProductId || undefined}
          prefillStoreId={prefillStoreId || undefined}
          prefillQuantity={prefillQuantity ? parseInt(prefillQuantity) : undefined}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {showDetailModal && selectedPurchase && (
        <PurchaseDetailModal
          purchase={selectedPurchase}
          onClose={() => setShowDetailModal(false)}
          onApprove={() => setShowApproveModal(true)}
          onReject={() => setShowRejectModal(true)}
          onPlaceOrder={() => handlePlaceOrder()}
          onReceive={() => setShowReceiveModal(true)}
          onCancel={() => setShowCancelModal(true)}
        />
      )}

      {showApproveModal && (
        <Modal
          open={showApproveModal}
          title={
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-500" />
              <span>审批通过</span>
            </div>
          }
          onClose={() => setShowApproveModal(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowApproveModal(false)}>取消</Button>
              <ApproveForm onSubmit={handleApprove} />
            </>
          }
        >
          <p className="text-sm text-gray-600 mb-4">确定要审批通过这笔采购单吗？审批通过后可以向供应商下单。</p>
        </Modal>
      )}

      {showRejectModal && (
        <Modal
          open={showRejectModal}
          title={
            <div className="flex items-center gap-2">
              <XCircle size={18} className="text-red-500" />
              <span>拒绝采购</span>
            </div>
          }
          onClose={() => setShowRejectModal(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowRejectModal(false)}>取消</Button>
              <RejectForm onSubmit={handleReject} />
            </>
          }
        >
          <p className="text-sm text-gray-600 mb-4">请填写拒绝原因，以便申请人了解情况。</p>
        </Modal>
      )}

      {showReceiveModal && selectedPurchase && (
        <ReceiveModal
          purchase={selectedPurchase}
          onClose={() => setShowReceiveModal(false)}
          onSubmit={handleReceive}
        />
      )}

      {showCancelModal && (
        <Modal
          open={showCancelModal}
          title={
            <div className="flex items-center gap-2">
              <XCircle size={18} className="text-red-500" />
              <span>取消采购单</span>
            </div>
          }
          onClose={() => setShowCancelModal(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowCancelModal(false)}>取消</Button>
              <CancelForm onSubmit={handleCancel} />
            </>
          }
        >
          <p className="text-sm text-gray-600 mb-4">请填写取消原因，取消后该采购单将无法继续执行。</p>
        </Modal>
      )}
    </div>
  )
}

function ApproveForm({ onSubmit }: { onSubmit: (remark?: string) => Promise<void> }) {
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    await onSubmit(remark || undefined)
    setSubmitting(false)
  }

  return (
    <>
      <Textarea
        placeholder="可选：填写审批意见"
        value={remark}
        onChange={setRemark}
        rows={3}
        className="mb-4"
      />
      <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
        {submitting ? '提交中...' : '确认审批'}
      </Button>
    </>
  )
}

function RejectForm({ onSubmit }: { onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('请填写拒绝原因')
      return
    }
    setSubmitting(true)
    await onSubmit(reason)
    setSubmitting(false)
  }

  return (
    <>
      <Textarea
        placeholder="请填写拒绝原因"
        value={reason}
        onChange={setReason}
        rows={3}
        className="mb-4"
      />
      <Button variant="danger" onClick={handleSubmit} disabled={submitting}>
        {submitting ? '提交中...' : '确认拒绝'}
      </Button>
    </>
  )
}

function CancelForm({ onSubmit }: { onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('请填写取消原因')
      return
    }
    setSubmitting(true)
    await onSubmit(reason)
    setSubmitting(false)
  }

  return (
    <>
      <Textarea
        placeholder="请填写取消原因"
        value={reason}
        onChange={setReason}
        rows={3}
        className="mb-4"
      />
      <Button variant="danger" onClick={handleSubmit} disabled={submitting}>
        {submitting ? '提交中...' : '确认取消'}
      </Button>
    </>
  )
}

function CreatePurchaseModal({
  suppliers,
  stores,
  products,
  prefillProductId,
  prefillStoreId,
  prefillQuantity,
  onClose,
  onSubmit,
}: {
  suppliers: Supplier[]
  stores: Store[]
  products: Product[]
  prefillProductId?: string
  prefillStoreId?: string
  prefillQuantity?: number
  onClose: () => void
  onSubmit: (data: {
    supplierId: string
    storeId: string
    items: { productId: string; quantity: number; unitPrice: number }[]
    expectedArrivalTime: string
    reason: string
  }) => Promise<void>
}) {
  const [supplierId, setSupplierId] = useState('')
  const [storeId, setStoreId] = useState(prefillStoreId || '')
  const [expectedArrivalTime, setExpectedArrivalTime] = useState('')
  const [reason, setReason] = useState('库存预警，急需补货')
  const [items, setItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>(
    prefillProductId
      ? [{ productId: prefillProductId, quantity: prefillQuantity || 10, unitPrice: 0 }]
      : []
  )
  const [submitting, setSubmitting] = useState(false)

  const selectedSupplier = suppliers.find((s) => s.id === supplierId)
  const availableProducts = useMemo(() => {
    if (!selectedSupplier) return products
    return products.filter((p) => {
      if (selectedSupplier.category === '生鲜水果') return p.category === '生鲜水果'
      if (selectedSupplier.category === '肉禽蛋品') return p.category === '肉禽蛋品'
      if (selectedSupplier.category === '海鲜水产') return p.category === '海鲜水产'
      if (selectedSupplier.category === '咖啡茶饮') return p.category === '咖啡茶饮'
      if (selectedSupplier.category === '烘焙甜点') return p.category === '烘焙甜点'
      if (selectedSupplier.category === '饮料冲调') return p.category === '饮料冲调'
      return true
    })
  }, [selectedSupplier, products])

  useEffect(() => {
    if (prefillProductId && items.length > 0) {
      const product = products.find((p) => p.id === prefillProductId)
      if (product) {
        const matchingSupplier = suppliers.find((s) => s.category === product.category)
        if (matchingSupplier) {
          setSupplierId(matchingSupplier.id)
        }
        setItems([{ productId: prefillProductId, quantity: prefillQuantity || 10, unitPrice: Math.round(product.price * 0.85 * 100) / 100 }])
      }
    }
  }, [prefillProductId, prefillQuantity, products, suppliers])

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: `${s.name}（${s.category}）` }))
  const storeOptions = stores.map((s) => ({ value: s.id, label: s.name }))

  const addItem = () => {
    if (availableProducts.length === 0) return
    const firstProduct = availableProducts[0]
    setItems([...items, { productId: firstProduct.id, quantity: 10, unitPrice: Math.round(firstProduct.price * 0.85 * 100) / 100 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const totalAmount = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)

  const handleSubmit = async () => {
    if (!supplierId) {
      alert('请选择供应商')
      return
    }
    if (!storeId) {
      alert('请选择入库门店')
      return
    }
    if (items.length === 0) {
      alert('请添加至少一个商品')
      return
    }
    if (!expectedArrivalTime) {
      alert('请选择期望到货时间')
      return
    }
    if (new Date(expectedArrivalTime).getTime() < Date.now()) {
      alert('期望到货时间不能早于当前时间')
      return
    }
    if (!reason.trim()) {
      alert('请填写采购原因')
      return
    }
    for (const it of items) {
      if (it.quantity <= 0) {
        alert('商品数量必须大于0')
        return
      }
      if (it.unitPrice < 0) {
        alert('采购单价不能为负数')
        return
      }
    }

    setSubmitting(true)
    await onSubmit({ supplierId, storeId, items, expectedArrivalTime, reason })
    setSubmitting(false)
  }

  return (
    <Modal
      open={true}
      title={
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-blue-500" />
          <span>新建采购单</span>
        </div>
      }
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '提交申请'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="供应商 *"
            value={supplierId}
            onChange={setSupplierId}
            options={supplierOptions}
            placeholder="请选择供应商"
          />
          <Select
            label="入库门店 *"
            value={storeId}
            onChange={setStoreId}
            options={storeOptions}
            placeholder="请选择入库门店"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">采购商品 *</label>
          <div className="space-y-2">
            {items.map((item, index) => {
              const product = products.find((p) => p.id === item.productId)
              const productOptions = availableProducts.map((p) => ({ value: p.id, label: `${p.name}（${p.sku}）` }))
              return (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <Select
                      value={item.productId}
                      onChange={(v) => updateItem(index, 'productId', v)}
                      options={productOptions}
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-gray-500 mb-0.5">数量</label>
                    <Input
                      type="number"
                      min={1}
                      value={String(item.quantity)}
                      onChange={(v) => updateItem(index, 'quantity', parseInt(v) || 0)}
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-gray-500 mb-0.5">单价</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={String(item.unitPrice)}
                      onChange={(v) => updateItem(index, 'unitPrice', parseFloat(v) || 0)}
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-gray-500 mb-0.5">小计</label>
                    <div className="text-sm font-semibold text-gray-700 pt-1.5">
                      {formatMoney(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    onClick={() => removeItem(index)}
                  >
                    <X size={16} />
                  </button>
                </div>
              )
            })}
          </div>
          <Button variant="secondary" size="sm" className="mt-2 gap-1" onClick={addItem}>
            <Plus size={14} />
            添加商品
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="期望到货时间 *"
            type="datetime-local"
            value={expectedArrivalTime}
            onChange={setExpectedArrivalTime}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预计采购金额</label>
            <div className="text-xl font-bold text-blue-600 pt-1">{formatMoney(totalAmount)}</div>
          </div>
        </div>

        <Textarea
          label="采购原因 *"
          placeholder="请填写采购原因，如库存预警、促销备货等"
          value={reason}
          onChange={setReason}
          rows={2}
        />
      </div>
    </Modal>
  )
}

function PurchaseDetailModal({
  purchase,
  onClose,
  onApprove,
  onReject,
  onPlaceOrder,
  onReceive,
  onCancel,
}: {
  purchase: Purchase
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onPlaceOrder: () => void
  onReceive: () => void
  onCancel: () => void
}) {
  const st = purchaseStatusMap[purchase.status]
  const [expandedLog, setExpandedLog] = useState(false)

  const canApprove = purchase.status === 'pending_approval'
  const canPlaceOrder = purchase.status === 'approved' || purchase.status === 'pending_order'
  const canReceive = ['ordered', 'pending_arrival', 'partial_arrival'].includes(purchase.status)
  const canCancel = !['completed', 'cancelled'].includes(purchase.status) && purchase.receiveItems.length === 0

  const totalReceived = purchase.items.reduce((s, it) => s + it.receivedQuantity, 0)
  const totalQuantity = purchase.items.reduce((s, it) => s + it.quantity, 0)

  return (
    <Modal
      open={true}
      title={
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-500" />
          <span>采购单详情</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${st.bgColor} ${st.color}`}>
            {st.label}
          </span>
        </div>
      }
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {canCancel && (
              <Button variant="danger" size="sm" onClick={onCancel} className="mr-2">
                取消采购
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>关闭</Button>
            {canApprove && (
              <>
                <Button variant="danger" size="sm" onClick={onReject}>拒绝</Button>
                <Button variant="primary" size="sm" onClick={onApprove}>审批通过</Button>
              </>
            )}
            {canPlaceOrder && (
              <Button variant="primary" size="sm" onClick={onPlaceOrder}>确认下单</Button>
            )}
            {canReceive && (
              <Button variant="primary" size="sm" onClick={onReceive}>收货入库</Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">采购单号</div>
            <div className="font-mono font-semibold text-gray-800">{purchase.purchaseNo}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">供应商</div>
            <div className="font-medium text-gray-800 truncate">{purchase.supplierName}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">入库门店</div>
            <div className="font-medium text-gray-800 truncate">{purchase.storeName}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">采购金额</div>
            <div className="font-bold text-blue-600">{formatMoney(purchase.totalAmount)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">创建时间</div>
            <div className="text-sm text-gray-800">{purchase.createdAt}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">期望到货</div>
            <div className="text-sm text-gray-800">{purchase.expectedArrivalTime}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">实际到货</div>
            <div className="text-sm text-gray-800">{purchase.actualArrivalTime || '-'}</div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-xs text-blue-600 mb-1 font-medium">采购原因</div>
          <div className="text-sm text-blue-800">{purchase.reason}</div>
        </div>

        {purchase.cancelReason && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <div className="text-xs text-red-600 mb-1 font-medium">取消原因</div>
            <div className="text-sm text-red-800">{purchase.cancelReason}</div>
          </div>
        )}

        {purchase.rejectReason && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <div className="text-xs text-red-600 mb-1 font-medium">拒绝原因</div>
            <div className="text-sm text-red-800">{purchase.rejectReason}</div>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <div className="font-medium text-gray-700">商品明细</div>
          </div>
          <Table className="border-0">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">商品名称</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">SKU</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">采购数量</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">已收数量</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">单价</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">小计</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => {
                const progress = totalQuantity > 0 ? Math.round((item.receivedQuantity / item.quantity) * 100) : 0
                const isComplete = item.receivedQuantity >= item.quantity
                return (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-800">{item.productName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-500">{item.sku}</td>
                    <td className="py-3 px-4">{item.quantity} {item.unit}</td>
                    <td className={`py-3 px-4 ${item.receivedQuantity > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      {item.receivedQuantity} {item.unit}
                    </td>
                    <td className="py-3 px-4">{formatMoney(item.unitPrice)}</td>
                    <td className="py-3 px-4 font-medium">{formatMoney(item.unitPrice * item.quantity)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{progress}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共 {purchase.items.length} 种商品，{totalQuantity} 件，已收货 {totalReceived} 件
            </div>
            <div className="font-bold text-lg text-blue-600">
              合计：{formatMoney(purchase.totalAmount)}
            </div>
          </div>
        </div>

        {purchase.receiveItems.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <div className="font-medium text-gray-700">收货记录</div>
            </div>
            <Table className="border-0">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">商品名称</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">收货数量</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">收货时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">差异原因</th>
                </tr>
              </thead>
              <tbody>
                {purchase.receiveItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-800">{item.productName}</td>
                    <td className="py-3 px-4 text-green-600 font-medium">+{item.quantity} {item.unit}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{item.receivedTime}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{item.differenceReason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <div
            className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-gray-100"
            onClick={() => setExpandedLog(!expandedLog)}
          >
            <div className="font-medium text-gray-700">处理日志</div>
            {expandedLog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {expandedLog && (
            <div className="p-4 space-y-3 max-h-60 overflow-auto">
              {purchase.statusLogs.map((log) => {
                const logSt = purchaseStatusMap[log.status]
                return (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${logSt.bgColor} ${logSt.color}`}>
                          {logSt.label}
                        </span>
                        <span className="text-xs text-gray-500">{log.time}</span>
                        <span className="text-xs text-gray-400">操作人：{log.operator}</span>
                      </div>
                      {log.remark && <div className="text-sm text-gray-600 mt-1">{log.remark}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ReceiveModal({
  purchase,
  onClose,
  onSubmit,
}: {
  purchase: Purchase
  onClose: () => void
  onSubmit: (items: { purchaseItemId: string; quantity: number; differenceReason?: string }[], remark?: string) => Promise<void>
}) {
  const [receiveItems, setReceiveItems] = useState(
    purchase.items
      .filter((it) => it.receivedQuantity < it.quantity)
      .map((it) => ({
        purchaseItemId: it.id,
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity - it.receivedQuantity,
        maxQuantity: it.quantity - it.receivedQuantity,
        unit: it.unit,
        differenceReason: '',
      }))
  )
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...receiveItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setReceiveItems(newItems)
  }

  const handleSubmit = async () => {
    const validItems = receiveItems.filter((it) => it.quantity > 0)
    if (validItems.length === 0) {
      alert('请填写收货数量')
      return
    }
    for (const it of validItems) {
      if (it.quantity > it.maxQuantity) {
        alert(`商品「${it.productName}」收货数量不能超过剩余未收数量${it.maxQuantity}${it.unit}`)
        return
      }
    }

    const submitItems = validItems.map((it) => ({
      purchaseItemId: it.purchaseItemId,
      quantity: it.quantity,
      differenceReason: it.differenceReason || undefined,
    }))

    setSubmitting(true)
    await onSubmit(submitItems, remark || undefined)
    setSubmitting(false)
  }

  return (
    <Modal
      open={true}
      title={
        <div className="flex items-center gap-2">
          <Package size={18} className="text-green-500" />
          <span>收货入库</span>
        </div>
      }
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '确认入库'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-xs text-blue-600 mb-1">采购单号</div>
          <div className="font-mono font-semibold text-blue-800">{purchase.purchaseNo}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">收货明细</label>
          <div className="space-y-2">
            {receiveItems.map((item, index) => (
              <div key={item.purchaseItemId} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-800">{item.productName}</div>
                  <div className="text-xs text-gray-500">剩余未收：{item.maxQuantity} {item.unit}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">本次收货数量</label>
                    <Input
                      type="number"
                      min={0}
                      max={item.maxQuantity}
                      value={String(item.quantity)}
                      onChange={(v) => updateItem(index, 'quantity', parseInt(v) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">差异原因（可选）</label>
                    <Input
                      placeholder="如：供应商少发"
                      value={item.differenceReason}
                      onChange={(v) => updateItem(index, 'differenceReason', v)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Textarea
          label="备注"
          placeholder="可选：填写备注信息"
          value={remark}
          onChange={setRemark}
          rows={2}
        />

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
          <div className="text-xs text-amber-600 mb-1 flex items-center gap-1">
            <AlertTriangle size={12} />
            温馨提示
          </div>
          <div className="text-sm text-amber-700">
            确认入库后，库存将自动增加，并生成库存变更记录。请仔细核对收货数量。
          </div>
        </div>
      </div>
    </Modal>
  )
}
