import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Button, Modal, EmptyState, Badge, Table, Select, Input, Textarea, Toast } from '../components/ui'
import {
  FileText,
  Search,
  Filter,
  Store as StoreIcon,
  Truck,
  Calendar,
  User,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  CreditCard,
  Receipt,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Banknote,
  Wallet,
} from 'lucide-react'
import { formatMoney, reconciliationStatusMap, paymentStatusMap, paymentMethodMap, getDateString } from '../utils/constants'
import type { Purchase, PaymentMethod } from '../types'

export default function PaymentReconciliation() {
  const { state, reconcilePurchase, createPaymentRecord, refreshPurchases } = useApp()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterReconciliationStatus, setFilterReconciliationStatus] = useState<string>('all')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterStore, setFilterStore] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [showReconcileModal, setShowReconcileModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  const reconciledPurchases = useMemo(() => {
    return state.purchases.filter((p) => p.status === 'completed')
  }, [state.purchases])

  const filteredPurchases = useMemo(() => {
    let list = reconciledPurchases.slice()
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
    if (filterReconciliationStatus !== 'all') {
      list = list.filter((p) => p.reconciliationStatus === filterReconciliationStatus)
    }
    if (filterPaymentStatus !== 'all') {
      list = list.filter((p) => p.paymentStatus === filterPaymentStatus)
    }
    if (filterSupplier) list = list.filter((p) => p.supplierId === filterSupplier)
    if (filterStore) list = list.filter((p) => p.storeId === filterStore)
    if (startDate) list = list.filter((p) => p.createdAt.slice(0, 10) >= startDate)
    if (endDate) list = list.filter((p) => p.createdAt.slice(0, 10) <= endDate)
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [reconciledPurchases, searchKeyword, filterReconciliationStatus, filterPaymentStatus, filterSupplier, filterStore, startDate, endDate])

  const stats = useMemo(() => {
    const list = reconciledPurchases
    const totalAmount = list.reduce((sum, p) => sum + p.totalAmount, 0)
    const paidAmount = list.reduce((sum, p) => sum + p.paidAmount, 0)
    const pendingAmount = totalAmount - paidAmount
    return {
      total: list.length,
      pendingReconciliation: list.filter((p) => p.reconciliationStatus === 'pending_reconciliation').length,
      reconciled: list.filter((p) => p.reconciliationStatus === 'reconciled').length,
      pendingPayment: list.filter((p) => p.paymentStatus === 'pending_payment').length,
      partialPayment: list.filter((p) => p.paymentStatus === 'partial_payment').length,
      paid: list.filter((p) => p.paymentStatus === 'paid').length,
      totalAmount,
      paidAmount,
      pendingAmount,
    }
  }, [reconciledPurchases])

  const openDetail = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setShowDetailModal(true)
  }

  const handleReconcile = async (remark?: string) => {
    if (!selectedPurchase) return
    const res = await reconcilePurchase({ purchase: selectedPurchase, remark })
    if (res.success) {
      showToast(res.message, 'success')
      setShowReconcileModal(false)
      if (res.data) {
        setSelectedPurchase(res.data)
      } else {
        await refreshPurchases()
      }
    } else {
      showToast(res.message, 'error')
    }
  }

  const handlePayment = async (data: {
    amount: number
    paymentTime: string
    paymentMethod: PaymentMethod
    remark?: string
  }) => {
    if (!selectedPurchase) return
    const res = await createPaymentRecord({
      purchase: selectedPurchase,
      ...data,
    })
    if (res.success) {
      showToast(res.message, 'success')
      setShowPaymentModal(false)
      if (res.data?.purchase) {
        setSelectedPurchase(res.data.purchase)
      }
    } else {
      showToast(res.message, 'error')
    }
  }

  const reconciliationStatusOptions = [
    { value: 'all', label: '全部对账状态' },
    { value: 'pending_reconciliation', label: '待对账' },
    { value: 'reconciled', label: '已对账' },
  ]

  const paymentStatusOptions = [
    { value: 'all', label: '全部付款状态' },
    { value: 'pending_payment', label: '待付款' },
    { value: 'partial_payment', label: '部分付款' },
    { value: 'paid', label: '已付款' },
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
              <div className="text-xs text-amber-500 mb-1 font-medium">待对账</div>
              <div className="text-2xl font-bold text-amber-600">{stats.pendingReconciliation}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-500">
              <Receipt size={24} />
            </div>
          </div>
        </Card>
        <Card className="!border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-cyan-500 mb-1 font-medium">待付款</div>
              <div className="text-2xl font-bold text-cyan-600">{stats.pendingPayment}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-500">
              <CreditCard size={24} />
            </div>
          </div>
        </Card>
        <Card className="!border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-orange-500 mb-1 font-medium">部分付款</div>
              <div className="text-2xl font-bold text-orange-600">{stats.partialPayment}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
              <Wallet size={24} />
            </div>
          </div>
        </Card>
        <Card className="!border-green-200 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-green-500 mb-1 font-medium">已付款</div>
              <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-500">
              <CheckCircle size={24} />
            </div>
          </div>
        </Card>
        <Card className="!border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-indigo-500 mb-1 font-medium">待付款金额</div>
              <div className="text-2xl font-bold text-indigo-600">{formatMoney(stats.pendingAmount)}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-500">
              <DollarSign size={24} />
            </div>
          </div>
        </Card>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-blue-500" />
            <span>供应商对账与付款</span>
            {filteredPurchases.length > 0 && (
              <Badge className="bg-blue-50 text-blue-600 border-blue-100">
                共 {filteredPurchases.length} 条
              </Badge>
            )}
          </div>
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
            value={filterReconciliationStatus}
            onChange={(v) => setFilterReconciliationStatus(v)}
            options={reconciliationStatusOptions}
            className="w-36"
          />
          <Select
            value={filterPaymentStatus}
            onChange={(v) => setFilterPaymentStatus(v)}
            options={paymentStatusOptions}
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
              setFilterReconciliationStatus('all')
              setFilterPaymentStatus('all')
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
            title="暂无数据"
            description="没有找到符合条件的采购单"
            icon={
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                <FileText size={32} className="text-gray-400" />
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
                <th className="text-left py-3 px-4 font-medium text-gray-600">采购金额</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">已付金额</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">待付金额</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">对账状态</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">付款状态</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">创建时间</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((purchase) => {
                const reconSt = reconciliationStatusMap[purchase.reconciliationStatus]
                const paySt = paymentStatusMap[purchase.paymentStatus]
                const pendingAmount = Math.max(0, purchase.totalAmount - purchase.paidAmount)
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
                    <td className="py-3 px-4 font-semibold text-gray-800">{formatMoney(purchase.totalAmount)}</td>
                    <td className="py-3 px-4 font-medium text-green-600">{formatMoney(purchase.paidAmount)}</td>
                    <td className="py-3 px-4 font-medium text-orange-600">{formatMoney(pendingAmount)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${reconSt.bgColor} ${reconSt.color}`}>
                        {reconSt.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${paySt.bgColor} ${paySt.color}`}>
                        {paySt.label}
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
                        {purchase.reconciliationStatus === 'pending_reconciliation' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="!px-2 !py-1 !text-xs"
                            onClick={(e) => {
                              e?.stopPropagation()
                              setSelectedPurchase(purchase)
                              setShowReconcileModal(true)
                            }}
                          >
                            对账
                          </Button>
                        )}
                        {purchase.reconciliationStatus === 'reconciled' && purchase.paymentStatus !== 'paid' && (
                          <Button
                            variant="success"
                            size="sm"
                            className="!px-2 !py-1 !text-xs"
                            onClick={(e) => {
                              e?.stopPropagation()
                              setSelectedPurchase(purchase)
                              setShowPaymentModal(true)
                            }}
                          >
                            付款
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {showDetailModal && selectedPurchase && (
        <PurchaseDetailModal
          purchase={selectedPurchase}
          onClose={() => setShowDetailModal(false)}
          onReconcile={() => setShowReconcileModal(true)}
          onPayment={() => setShowPaymentModal(true)}
        />
      )}

      {showReconcileModal && selectedPurchase && (
        <Modal
          open={showReconcileModal}
          title={
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-blue-500" />
              <span>确认对账</span>
            </div>
          }
          onClose={() => setShowReconcileModal(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowReconcileModal(false)}>取消</Button>
              <ReconcileForm onSubmit={handleReconcile} />
            </>
          }
        >
          <p className="text-sm text-gray-600 mb-4">
            确定要对采购单「{selectedPurchase.purchaseNo}」进行对账吗？对账后可以登记付款。
          </p>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-xs text-blue-600 mb-1">采购金额</div>
            <div className="text-xl font-bold text-blue-700">{formatMoney(selectedPurchase.totalAmount)}</div>
          </div>
        </Modal>
      )}

      {showPaymentModal && selectedPurchase && (
        <PaymentModal
          purchase={selectedPurchase}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handlePayment}
        />
      )}
    </div>
  )
}

function ReconcileForm({ onSubmit }: { onSubmit: (remark?: string) => Promise<void> }) {
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
        placeholder="可选：填写对账备注"
        value={remark}
        onChange={setRemark}
        rows={3}
        className="mb-4"
      />
      <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
        {submitting ? '提交中...' : '确认对账'}
      </Button>
    </>
  )
}

function PaymentModal({
  purchase,
  onClose,
  onSubmit,
}: {
  purchase: Purchase
  onClose: () => void
  onSubmit: (data: {
    amount: number
    paymentTime: string
    paymentMethod: PaymentMethod
    remark?: string
  }) => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [paymentTime, setPaymentTime] = useState(() => {
    const now = new Date()
    return now.toISOString().slice(0, 16)
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const remainingAmount = Math.round((purchase.totalAmount - purchase.paidAmount) * 100) / 100

  const paymentMethodOptions = [
    { value: 'bank_transfer', label: '银行转账' },
    { value: 'alipay', label: '支付宝' },
    { value: 'wechat', label: '微信支付' },
    { value: 'cash', label: '现金' },
    { value: 'other', label: '其他' },
  ]

  const handleSubmit = async () => {
    setError('')
    const amt = parseFloat(amount)
    if (!amount.trim() || isNaN(amt)) {
      setError('请输入付款金额')
      return
    }
    if (amt <= 0) {
      setError('付款金额必须大于0')
      return
    }
    if (amt > remainingAmount + 0.01) {
      setError(`付款金额不能超过待付款金额 ${remainingAmount.toFixed(2)} 元`)
      return
    }
    if (amt > purchase.totalAmount * 1.1) {
      setError('付款金额明显不合理，已超过采购总额的110%')
      return
    }
    if (!paymentTime) {
      setError('请选择付款时间')
      return
    }
    if (!paymentMethod) {
      setError('请选择付款方式')
      return
    }

    setSubmitting(true)
    await onSubmit({
      amount: amt,
      paymentTime,
      paymentMethod,
      remark: remark || undefined,
    })
    setSubmitting(false)
  }

  return (
    <Modal
      open={true}
      title={
        <div className="flex items-center gap-2">
          <Banknote size={18} className="text-green-500" />
          <span>登记付款</span>
        </div>
      }
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="success" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '确认付款'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
            <XCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
          <div>
            <div className="text-xs text-gray-500 mb-1">采购单号</div>
            <div className="font-mono font-semibold text-gray-800">{purchase.purchaseNo}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">供应商</div>
            <div className="font-medium text-gray-800 truncate">{purchase.supplierName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">采购总额</div>
            <div className="text-lg font-bold text-gray-800">{formatMoney(purchase.totalAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">待付款金额</div>
            <div className="text-lg font-bold text-orange-600">{formatMoney(remainingAmount)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="付款金额 *"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(v) => setAmount(v)}
              placeholder={`最多 ${remainingAmount.toFixed(2)} 元`}
            />
            <div className="text-xs text-gray-400 mt-1">
              建议支付：{formatMoney(remainingAmount)}
            </div>
          </div>
          <div>
            <Input
              label="付款时间 *"
              type="datetime-local"
              value={paymentTime}
              onChange={setPaymentTime}
            />
          </div>
        </div>

        <Select
          label="付款方式 *"
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as PaymentMethod)}
          options={paymentMethodOptions}
        />

        <Textarea
          label="备注"
          placeholder="可选：填写付款备注信息"
          value={remark}
          onChange={setRemark}
          rows={3}
        />

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
          <div className="text-xs text-amber-600 mb-1 flex items-center gap-1">
            <AlertTriangle size={12} />
            温馨提示
          </div>
          <div className="text-sm text-amber-700">
            请仔细核对付款金额，付款后将自动更新采购单付款状态。明显不合理的付款将被拦截。
          </div>
        </div>
      </div>
    </Modal>
  )
}

function PurchaseDetailModal({
  purchase,
  onClose,
  onReconcile,
  onPayment,
}: {
  purchase: Purchase
  onClose: () => void
  onReconcile: () => void
  onPayment: () => void
}) {
  const reconSt = reconciliationStatusMap[purchase.reconciliationStatus]
  const paySt = paymentStatusMap[purchase.paymentStatus]
  const [expandedLog, setExpandedLog] = useState(false)

  const canReconcile = purchase.reconciliationStatus === 'pending_reconciliation'
  const canPay = purchase.reconciliationStatus === 'reconciled' && purchase.paymentStatus !== 'paid'

  const pendingAmount = Math.max(0, purchase.totalAmount - purchase.paidAmount)

  return (
    <Modal
      open={true}
      title={
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-500" />
          <span>采购单详情</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${reconSt.bgColor} ${reconSt.color}`}>
            {reconSt.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${paySt.bgColor} ${paySt.color}`}>
            {paySt.label}
          </span>
        </div>
      }
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div></div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>关闭</Button>
            {canReconcile && (
              <Button variant="primary" size="sm" onClick={onReconcile}>确认对账</Button>
            )}
            {canPay && (
              <Button variant="success" size="sm" onClick={onPayment}>登记付款</Button>
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

        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="text-xs text-green-600 mb-1 font-medium">已付金额</div>
            <div className="text-lg font-bold text-green-700">{formatMoney(purchase.paidAmount)}</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
            <div className="text-xs text-orange-600 mb-1 font-medium">待付金额</div>
            <div className="text-lg font-bold text-orange-700">{formatMoney(pendingAmount)}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-xs text-blue-600 mb-1 font-medium">对账时间</div>
            <div className="text-sm font-medium text-blue-700">{purchase.reconciliationTime || '-'}</div>
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
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => {
                const totalQty = purchase.items.reduce((s, it) => s + it.quantity, 0)
                const progress = totalQty > 0 ? Math.round((item.receivedQuantity / item.quantity) * 100) : 0
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
                  </tr>
                )
              })}
            </tbody>
          </Table>
          <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共 {purchase.items.length} 种商品
            </div>
            <div className="font-bold text-lg text-blue-600">
              合计：{formatMoney(purchase.totalAmount)}
            </div>
          </div>
        </div>

        {purchase.paymentRecords.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <div className="font-medium text-gray-700 flex items-center gap-2">
                <Receipt size={16} className="text-green-500" />
                付款记录
              </div>
            </div>
            <Table className="border-0">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">付款时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">付款金额</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">付款方式</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">操作人</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">备注</th>
                </tr>
              </thead>
              <tbody>
                {purchase.paymentRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-600">{record.paymentTime}</td>
                    <td className="py-3 px-4 font-semibold text-green-600">{formatMoney(record.amount)}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{paymentMethodMap[record.paymentMethod]}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{record.operator}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{record.remark || '-'}</td>
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
                const logSt = reconciliationStatusMap[log.status as keyof typeof reconciliationStatusMap] 
                  || paymentStatusMap[log.status as keyof typeof paymentStatusMap]
                  || { label: log.status, color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' }
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
