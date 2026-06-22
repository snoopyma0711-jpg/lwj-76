import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Button, Modal, Input, Select, EmptyState, Badge, Textarea } from '../components/ui'
import {
  ClipboardCheck,
  Search,
  Plus,
  MapPin,
  CalendarClock,
  Clock,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Save,
  FileCheck,
  ChevronRight,
  Hash,
  Eye,
  X,
} from 'lucide-react'
import type { InventoryCheck, InventoryCheckItem, InventoryCheckScope, InventoryCheckStatus } from '../types'
import { checkStatusMap, checkScopeMap } from '../utils/constants'

type ViewMode = 'list' | 'detail' | 'check' | 'discrepancy'

export default function InventoryCheckPage() {
  const { state, createInventoryCheck, startInventoryCheck, saveInventoryCheckProgress, confirmInventoryCheck, handleInventoryCheckDiscrepancy, cancelInventoryCheck } = useApp()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedCheck, setSelectedCheck] = useState<InventoryCheck | null>(null)

  const [filterStatus, setFilterStatus] = useState<InventoryCheckStatus | 'all'>('all')
  const [filterStoreId, setFilterStoreId] = useState('')
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const [actualQuantities, setActualQuantities] = useState<Record<string, number | null>>({})
  const [saveError, setSaveError] = useState('')

  const [discrepancyProductId, setDiscrepancyProductId] = useState('')
  const [handleReason, setHandleReason] = useState('')
  const [handleError, setHandleError] = useState('')

  const filteredChecks = useMemo(() => {
    let list = state.inventoryChecks.slice()
    if (filterKeyword.trim()) {
      const kw = filterKeyword.trim().toLowerCase()
      list = list.filter(
        (c) =>
          c.checkNo.toLowerCase().includes(kw) ||
          c.storeName.toLowerCase().includes(kw) ||
          c.items.some((it) => it.productName.toLowerCase().includes(kw) || it.sku.toLowerCase().includes(kw)),
      )
    }
    if (filterStatus !== 'all') list = list.filter((c) => c.status === filterStatus)
    if (filterStoreId) list = list.filter((c) => c.storeId === filterStoreId)
    if (filterStartDate) list = list.filter((c) => c.createdAt.slice(0, 10) >= filterStartDate)
    if (filterEndDate) list = list.filter((c) => c.createdAt.slice(0, 10) <= filterEndDate)
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [state.inventoryChecks, filterKeyword, filterStatus, filterStoreId, filterStartDate, filterEndDate])

  const openDetail = (check: InventoryCheck) => {
    setSelectedCheck(check)
    setViewMode('detail')
  }

  const openCheckMode = (check: InventoryCheck) => {
    setSelectedCheck(check)
    const qtyMap: Record<string, number | null> = {}
    check.items.forEach((it) => {
      qtyMap[it.productId] = it.actualQuantity
    })
    setActualQuantities(qtyMap)
    setSaveError('')
    setViewMode('check')
  }

  const openDiscrepancyMode = (check: InventoryCheck) => {
    setSelectedCheck(check)
    setDiscrepancyProductId('')
    setHandleReason('')
    setHandleError('')
    setViewMode('discrepancy')
  }

  const goBackToList = () => {
    setViewMode('list')
    setSelectedCheck(null)
  }

  const handleStartCheck = async (check: InventoryCheck) => {
    const res = await startInventoryCheck(check)
    if (res.success && res.data) {
      setSelectedCheck(res.data)
      openCheckMode(res.data)
      setToast({ message: '盘点已开始，请录入实际数量', type: 'success' })
    } else {
      setToast({ message: res.message, type: 'error' })
    }
  }

  const handleSaveProgress = async () => {
    if (!selectedCheck) return
    setSaveError('')

    for (const item of selectedCheck.items) {
      const qty = actualQuantities[item.productId]
      if (qty !== null && qty !== undefined && qty < 0) {
        setSaveError(`商品「${item.productName}」实际数量不能为负数`)
        return
      }
    }

    const items = selectedCheck.items.map((it) => ({
      productId: it.productId,
      actualQuantity: actualQuantities[it.productId] ?? null,
    }))

    const res = await saveInventoryCheckProgress({ check: selectedCheck, items })
    if (res.success && res.data) {
      setSelectedCheck(res.data)
      setToast({ message: '盘点进度已保存', type: 'success' })
    } else {
      setSaveError(res.message)
    }
  }

  const handleConfirmCheck = async () => {
    if (!selectedCheck) return
    setSaveError('')

    const unfinished = selectedCheck.items.filter((it) => actualQuantities[it.productId] === null || actualQuantities[it.productId] === undefined)
    if (unfinished.length > 0) {
      setSaveError(`还有 ${unfinished.length} 件商品未录入实际数量，请先录入所有商品数量`)
      return
    }

    const items = selectedCheck.items.map((it) => ({
      productId: it.productId,
      actualQuantity: actualQuantities[it.productId] ?? null,
    }))

    const saveRes = await saveInventoryCheckProgress({ check: selectedCheck, items })
    if (!saveRes.success) {
      setSaveError(saveRes.message)
      return
    }

    const updatedCheck = saveRes.data!
    const res = await confirmInventoryCheck(updatedCheck)
    if (res.success && res.data) {
      setSelectedCheck(res.data)
      if (res.data.discrepancies.length > 0) {
        openDiscrepancyMode(res.data)
        setToast({ message: `发现 ${res.data.discrepancies.length} 项差异，请处理`, type: 'success' })
      } else {
        setViewMode('detail')
        setToast({ message: '盘点完成，无差异', type: 'success' })
      }
    } else {
      setSaveError(res.message)
    }
  }

  const handleDiscrepancy = async () => {
    if (!selectedCheck) return
    setHandleError('')

    if (!discrepancyProductId) {
      setHandleError('请选择要处理的差异商品')
      return
    }
    if (!handleReason.trim()) {
      setHandleError('请填写差异处理原因')
      return
    }
    if (handleReason.length > 500) {
      setHandleError('处理原因不能超过500字')
      return
    }

    const res = await handleInventoryCheckDiscrepancy({
      check: selectedCheck,
      productId: discrepancyProductId,
      handleReason: handleReason.trim(),
    })
    if (res.success && res.data) {
      setSelectedCheck(res.data)
      if (res.data.status === 'completed') {
        setToast({ message: '差异已全部处理，库存已更新，盘点完成！', type: 'success' })
        setViewMode('detail')
      } else {
        setDiscrepancyProductId('')
        setHandleReason('')
        setToast({ message: '差异已处理', type: 'success' })
      }
    } else {
      setHandleError(res.message)
    }
  }

  const handleCancelCheck = async () => {
    if (!selectedCheck) return
    setCancelError('')
    if (!cancelReason.trim()) {
      setCancelError('请填写取消原因')
      return
    }
    const res = await cancelInventoryCheck({ check: selectedCheck, reason: cancelReason.trim() })
    if (res.success && res.data) {
      setSelectedCheck(res.data)
      setShowCancelModal(false)
      setCancelReason('')
      setViewMode('detail')
      setToast({ message: '盘点任务已取消', type: 'success' })
    } else {
      setCancelError(res.message)
    }
  }

  const categories = useMemo(() => {
    const cats = new Set(state.products.map((p) => p.category))
    return Array.from(cats)
  }, [state.products])

  const stats = useMemo(() => {
    const checks = state.inventoryChecks
    return {
      total: checks.length,
      pending: checks.filter((c) => c.status === 'pending').length,
      checking: checks.filter((c) => c.status === 'checking').length,
      pendingConfirm: checks.filter((c) => c.status === 'pending_confirm').length,
      completed: checks.filter((c) => c.status === 'completed').length,
    }
  }, [state.inventoryChecks])

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={
            'fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl text-white text-sm font-medium ' +
            (toast.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-red-500')
          }
        >
          {toast.message}
        </div>
      )}

      {viewMode === 'list' && (
        <>
          <Card className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 !border-0 text-white overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-white/90 text-sm mb-1">
                  <ClipboardCheck size={18} />
                  <span>门店盘点</span>
                </div>
                <div className="text-2xl font-bold mb-3">库存盘点与差异处理</div>
                <div className="text-sm text-white/70">新建盘点任务 → 录入实际数量 → 确认盘点 → 处理差异 → 库存自动更新</div>
              </div>
              <div className="lg:w-80 p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
                <div className="text-xs text-white/70 mb-3">盘点概览</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/10">
                    <div className="text-2xl font-bold">{stats.pending}</div>
                    <div className="text-xs text-white/70">待开始</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10">
                    <div className="text-2xl font-bold">{stats.checking}</div>
                    <div className="text-xs text-white/70">盘点中</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-400/20">
                    <div className="text-2xl font-bold">{stats.pendingConfirm}</div>
                    <div className="text-xs text-amber-100">待确认</div>
                  </div>
                  <div className="p-3 rounded-xl bg-green-400/20">
                    <div className="text-2xl font-bold">{stats.completed}</div>
                    <div className="text-xs text-green-100">已完成</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title={
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} className="text-indigo-500" />
                <span>盘点任务</span>
                <span className="text-xs text-gray-400 font-normal">共 {filteredChecks.length} 条</span>
              </div>
            }
            extra={
              <Button onClick={() => setShowCreateModal(true)} className="gap-1.5">
                <Plus size={14} />
                新建盘点
              </Button>
            }
          >
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="relative w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input value={filterKeyword} onChange={setFilterKeyword} placeholder="搜索编号/门店/商品" className="!pl-9" />
              </div>
              <Select
                value={filterStatus}
                onChange={(v) => setFilterStatus(v as InventoryCheckStatus | 'all')}
                options={[
                  { value: 'all', label: '全部状态' },
                  ...Object.entries(checkStatusMap).map(([k, v]) => ({ value: k, label: v.label })),
                ]}
              />
              <Select
                value={filterStoreId}
                onChange={setFilterStoreId}
                options={[
                  { value: '', label: '全部门店' },
                  ...state.stores.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <Input type="date" value={filterStartDate} onChange={setFilterStartDate} placeholder="开始日期" className="w-40" />
              <Input type="date" value={filterEndDate} onChange={setFilterEndDate} placeholder="结束日期" className="w-40" />
            </div>

            {filteredChecks.length === 0 ? (
              <EmptyState title="暂无盘点任务" description="点击「新建盘点」创建第一个盘点任务" />
            ) : (
              <div className="space-y-3">
                {filteredChecks.map((check) => (
                  <CheckListItem key={check.id} check={check} onDetail={() => openDetail(check)} onStart={() => handleStartCheck(check)} onContinue={() => openCheckMode(check)} onDiscrepancy={() => openDiscrepancyMode(check)} />
                ))}
              </div>
            )}
          </Card>

          <CreateCheckModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            stores={state.stores}
            categories={categories}
            products={state.products}
            onCreate={async (params) => {
              const res = await createInventoryCheck(params)
              if (res.success) {
                setShowCreateModal(false)
                setToast({ message: '盘点任务创建成功', type: 'success' })
                if (res.data) {
                  openDetail(res.data)
                }
                return true
              }
              setToast({ message: res.message, type: 'error' })
              return false
            }}
          />
        </>
      )}

      {viewMode === 'detail' && selectedCheck && (
        <CheckDetailView check={selectedCheck} onBack={goBackToList} onStart={() => handleStartCheck(selectedCheck)} onContinue={() => openCheckMode(selectedCheck)} onDiscrepancy={() => openDiscrepancyMode(selectedCheck)} onCancel={() => { setShowCancelModal(true); setCancelReason(''); setCancelError('') }} />
      )}

      {viewMode === 'check' && selectedCheck && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Package size={18} className="text-blue-500" />
              <span>录入盘点数量 · {selectedCheck.checkNo}</span>
            </div>
          }
          extra={
            <Button variant="ghost" onClick={goBackToList}>
              <X size={16} />
              返回列表
            </Button>
          }
        >
          {saveError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
              <XCircle size={16} className="flex-shrink-0" />
              {saveError}
            </div>
          )}
          <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
            请逐一录入每个商品的实际盘点数量。可随时点击「保存进度」暂存，录入完成后点击「确认盘点」提交。
          </div>
          <div className="space-y-3 mb-6">
            {selectedCheck.items.map((item) => {
              const qty = actualQuantities[item.productId]
              const hasDiff = qty !== null && qty !== undefined && qty !== item.systemQuantity
              return (
                <div key={item.productId} className={`p-4 rounded-xl border transition-colors ${hasDiff ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 mb-1">{item.productName}</div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span className="font-mono">SKU: {item.sku}</span>
                        <span>系统数量: <span className="font-semibold text-gray-700">{item.systemQuantity}</span> {item.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">实际:</span>
                      <input
                        type="number"
                        min={0}
                        value={qty === null ? '' : qty}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') {
                            setActualQuantities((prev) => ({ ...prev, [item.productId]: null }))
                          } else {
                            const num = parseInt(val, 10)
                            if (!isNaN(num) && num >= 0) {
                              setActualQuantities((prev) => ({ ...prev, [item.productId]: num }))
                            }
                          }
                        }}
                        placeholder="未录入"
                        className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                      />
                      <span className="text-xs text-gray-400">{item.unit}</span>
                    </div>
                  </div>
                  {hasDiff && (
                    <div className="mt-2 pt-2 border-t border-amber-200/50 text-xs text-amber-700">
                      差异: {qty! > item.systemQuantity ? '+' : ''}{qty! - item.systemQuantity} {item.unit}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-sm text-gray-600">
              已录入 {selectedCheck.items.filter((it) => actualQuantities[it.productId] !== null && actualQuantities[it.productId] !== undefined).length} / {selectedCheck.items.length} 件商品
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleSaveProgress} className="gap-1.5">
                <Save size={14} />
                保存进度
              </Button>
              <Button onClick={handleConfirmCheck} className="gap-1.5">
                <FileCheck size={14} />
                确认盘点
              </Button>
            </div>
          </div>
        </Card>
      )}

      {viewMode === 'discrepancy' && selectedCheck && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <span>差异处理 · {selectedCheck.checkNo}</span>
            </div>
          }
          extra={
            <Button variant="ghost" onClick={goBackToList}>
              <X size={16} />
              返回列表
            </Button>
          }
        >
          {handleError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
              <XCircle size={16} className="flex-shrink-0" />
              {handleError}
            </div>
          )}
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
            以下商品存在盘点差异，请逐一处理并填写原因。所有差异处理完成后，系统将自动更新库存数量。
          </div>
          <div className="space-y-3 mb-6">
            {selectedCheck.discrepancies.map((disc) => {
              const isHandled = disc.handleStatus === 'handled'
              const isSelected = discrepancyProductId === disc.productId
              return (
                <div key={disc.productId} className={`p-4 rounded-xl border transition-colors ${isHandled ? 'border-green-200 bg-green-50/30' : isSelected ? 'border-amber-300 bg-amber-50/50' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800">{disc.productName} <span className="text-xs text-gray-400 font-mono ml-1">{disc.sku}</span></div>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        <span>系统: <span className="font-semibold">{disc.systemQuantity}</span> {disc.unit}</span>
                        <span>实际: <span className="font-semibold">{disc.actualQuantity}</span> {disc.unit}</span>
                        <span className={disc.difference > 0 ? 'text-red-600' : 'text-blue-600'}>
                          差异: {disc.difference > 0 ? '+' : ''}{disc.difference} {disc.unit}
                        </span>
                      </div>
                    </div>
                    {isHandled ? (
                      <Badge color="green">已处理</Badge>
                    ) : (
                      <Button size="sm" variant={isSelected ? 'primary' : 'secondary'} onClick={() => { setDiscrepancyProductId(disc.productId); setHandleReason(''); setHandleError('') }}>
                        {isSelected ? '处理中' : '处理'}
                      </Button>
                    )}
                  </div>
                  {isHandled && (
                    <div className="mt-2 pt-2 border-t border-green-200/50 text-xs text-gray-500">
                      <span>原因: {disc.handleReason}</span>
                      <span className="mx-2">|</span>
                      <span>处理人: {disc.handleOperator}</span>
                      <span className="mx-2">|</span>
                      <span>时间: {disc.handleTime}</span>
                    </div>
                  )}
                  {isSelected && !isHandled && (
                    <div className="mt-3 pt-3 border-t border-amber-200/50 space-y-3">
                      <Textarea
                        label="处理原因 *"
                        value={handleReason}
                        onChange={setHandleReason}
                        placeholder="请填写差异原因，如：盘点误差、商品损耗、数据录入错误等"
                        required
                      />
                      <div className="flex justify-end">
                        <Button onClick={handleDiscrepancy} className="gap-1.5">
                          <CheckCircle2 size={14} />
                          确认处理
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                已处理 {selectedCheck.discrepancies.filter((d) => d.handleStatus === 'handled').length} / {selectedCheck.discrepancies.length} 项差异
              </span>
              {selectedCheck.discrepancies.every((d) => d.handleStatus === 'handled') && (
                <Badge color="green">所有差异已处理，库存已更新</Badge>
              )}
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={showCancelModal}
        title="取消盘点任务"
        onClose={() => setShowCancelModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>返回</Button>
            <Button variant="danger" onClick={handleCancelCheck} className="gap-1.5">
              <XCircle size={14} />
              确认取消
            </Button>
          </>
        }
      >
        {cancelError && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{cancelError}</div>
        )}
        <Textarea label="取消原因 *" value={cancelReason} onChange={setCancelReason} placeholder="请填写取消原因" required />
      </Modal>
    </div>
  )
}

function CheckListItem({
  check,
  onDetail,
  onStart,
  onContinue,
  onDiscrepancy,
}: {
  check: InventoryCheck
  onDetail: () => void
  onStart: () => void
  onContinue: () => void
  onDiscrepancy: () => void
}) {
  const st = checkStatusMap[check.status]
  const scope = checkScopeMap[check.scope]
  const discCount = check.discrepancies.length
  const pendingDiscCount = check.discrepancies.filter((d) => d.handleStatus === 'pending').length

  return (
    <div className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-all hover:shadow-md bg-white">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-gray-800">
              <Hash size={13} className="inline -mt-0.5 mr-1 text-gray-400" />
              {check.checkNo}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${st.bgColor} ${st.color}`}>
              {st.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${scope.bgColor} ${scope.color}`}>
              {scope.label}
            </span>
            {discCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle size={10} />
                {pendingDiscCount > 0 ? `${pendingDiscCount} 项差异待处理` : `${discCount} 项差异`}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1"><MapPin size={12} />{check.storeName}</span>
            <span className="flex items-center gap-1"><CalendarClock size={12} />计划 {check.scheduledTime.slice(0, 16)}</span>
            <span className="flex items-center gap-1"><Clock size={12} />创建 {check.createdAt.slice(0, 16)}</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {check.items.length} 件商品
            {check.status === 'checking' && ` · 已录入 ${check.items.filter((it) => it.actualQuantity !== null).length} 件`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {check.status === 'pending' && (
            <Button size="sm" onClick={onStart} className="gap-1">
              <Play size={12} />
              开始盘点
            </Button>
          )}
          {check.status === 'checking' && (
            <Button size="sm" onClick={onContinue} className="gap-1">
              <Save size={12} />
              继续录入
            </Button>
          )}
          {check.status === 'pending_confirm' && pendingDiscCount > 0 && (
            <Button size="sm" variant="warning" onClick={onDiscrepancy} className="gap-1">
              <AlertTriangle size={12} />
              处理差异
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDetail} className="gap-1">
            <Eye size={12} />
            详情
          </Button>
        </div>
      </div>
    </div>
  )
}

function CheckDetailView({
  check,
  onBack,
  onStart,
  onContinue,
  onDiscrepancy,
  onCancel,
}: {
  check: InventoryCheck
  onBack: () => void
  onStart: () => void
  onContinue: () => void
  onDiscrepancy: () => void
  onCancel: () => void
}) {
  const st = checkStatusMap[check.status]
  const scope = checkScopeMap[check.scope]

  return (
    <div className="space-y-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-indigo-500" />
            <span>盘点详情 · {check.checkNo}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${st.bgColor} ${st.color}`}>
              {st.label}
            </span>
          </div>
        }
        extra={
          <Button variant="ghost" onClick={onBack}>
            <ChevronRight size={16} className="rotate-180" />
            返回列表
          </Button>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-xs text-gray-500 mb-1">盘点编号</div>
            <div className="font-mono font-semibold text-gray-800">{check.checkNo}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">门店</div>
            <div className="text-sm font-medium text-gray-800">{check.storeName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">盘点范围</div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${scope.bgColor} ${scope.color}`}>
              {scope.label}
            </span>
            {check.scopeCategory && <span className="ml-2 text-xs text-gray-500">({check.scopeCategory})</span>}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">计划时间</div>
            <div className="text-sm text-gray-800">{check.scheduledTime.slice(0, 16)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">开始时间</div>
            <div className="text-sm text-gray-800">{check.startedTime?.slice(0, 16) || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">完成时间</div>
            <div className="text-sm text-gray-800">{check.completedTime?.slice(0, 16) || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">创建人</div>
            <div className="text-sm text-gray-800">{check.createdBy}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">商品数量</div>
            <div className="text-sm text-gray-800">{check.items.length} 件</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">差异数量</div>
            <div className="text-sm text-gray-800">{check.discrepancies.length} 项</div>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          {check.status === 'pending' && (
            <Button onClick={onStart} className="gap-1.5"><Play size={14} />开始盘点</Button>
          )}
          {check.status === 'checking' && (
            <Button onClick={onContinue} className="gap-1.5"><Save size={14} />继续录入</Button>
          )}
          {check.status === 'pending_confirm' && check.discrepancies.filter((d) => d.handleStatus === 'pending').length > 0 && (
            <Button variant="warning" onClick={onDiscrepancy} className="gap-1.5"><AlertTriangle size={14} />处理差异</Button>
          )}
          {!['completed', 'cancelled'].includes(check.status) && (
            <Button variant="danger" size="sm" onClick={onCancel} className="gap-1"><XCircle size={12} />取消</Button>
          )}
        </div>
      </Card>

      {check.discrepancies.length > 0 && (
        <Card title={<div className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /><span>差异明细</span></div>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">商品</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">系统数量</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">实际数量</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">差异</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">状态</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">处理信息</th>
                </tr>
              </thead>
              <tbody>
                {check.discrepancies.map((disc) => (
                  <tr key={disc.productId} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2 px-3">
                      <div className="font-medium text-gray-800">{disc.productName}</div>
                      <div className="text-xs text-gray-400 font-mono">{disc.sku}</div>
                    </td>
                    <td className="text-right py-2 px-3">{disc.systemQuantity} {disc.unit}</td>
                    <td className="text-right py-2 px-3">{disc.actualQuantity} {disc.unit}</td>
                    <td className={`text-right py-2 px-3 font-medium ${disc.difference > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {disc.difference > 0 ? '+' : ''}{disc.difference}
                    </td>
                    <td className="text-center py-2 px-3">
                      {disc.handleStatus === 'handled' ? (
                        <Badge color="green">已处理</Badge>
                      ) : (
                        <Badge color="amber">待处理</Badge>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-500">
                      {disc.handleStatus === 'handled' ? (
                        <div>
                          <div>原因: {disc.handleReason}</div>
                          <div>{disc.handleOperator} · {disc.handleTime?.slice(0, 16)}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title={<div className="flex items-center gap-2"><Clock size={16} className="text-gray-400" /><span>操作日志</span></div>}>
        <div className="space-y-3">
          {check.statusLogs.map((log, i) => (
            <div key={log.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full border-2 ${i === check.statusLogs.length - 1 ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`} />
                {i < check.statusLogs.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
              </div>
              <div className="pb-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-medium ${checkStatusMap[log.status]?.color || 'text-gray-600'}`}>
                    {checkStatusMap[log.status]?.label || log.status}
                  </span>
                  <span className="text-xs text-gray-400">{log.time.slice(0, 16)}</span>
                </div>
                <div className="text-sm text-gray-700">{log.remark}</div>
                <div className="text-xs text-gray-400">{log.operator}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function CreateCheckModal({
  open,
  onClose,
  stores,
  categories,
  products,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  stores: { id: string; name: string }[]
  categories: string[]
  products: { id: string; name: string; sku: string; category: string }[]
  onCreate: (params: {
    storeId: string
    scope: InventoryCheckScope
    scopeCategory?: string
    productIds?: string[]
    scheduledTime: string
    remark?: string
  }) => Promise<boolean>
}) {
  const [storeId, setStoreId] = useState('')
  const [scope, setScope] = useState<InventoryCheckScope>('full')
  const [scopeCategory, setScopeCategory] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [scheduledTime, setScheduledTime] = useState('')
  const [remark, setRemark] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const filteredProducts = useMemo(() => {
    if (scope === 'category' && scopeCategory) {
      return products.filter((p) => p.category === scopeCategory)
    }
    return products
  }, [scope, scopeCategory, products])

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  const handleSubmit = async () => {
    setError('')
    if (!storeId) { setError('请选择门店'); return }
    if (!scheduledTime) { setError('请选择盘点时间'); return }
    if (scope === 'category' && !scopeCategory) { setError('请选择盘点分类'); return }
    if (scope === 'partial' && selectedProductIds.length === 0) { setError('请选择盘点商品'); return }

    setLoading(true)
    const success = await onCreate({
      storeId,
      scope,
      scopeCategory: scope === 'category' ? scopeCategory : undefined,
      productIds: scope === 'partial' ? selectedProductIds : undefined,
      scheduledTime,
      remark: remark.trim() || undefined,
    })
    setLoading(false)
    if (success) {
      setStoreId('')
      setScope('full')
      setScopeCategory('')
      setSelectedProductIds([])
      setScheduledTime('')
      setRemark('')
    }
  }

  return (
    <Modal
      open={open}
      title="新建盘点任务"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-1.5">
            <CheckCircle2 size={14} />
            {loading ? '创建中...' : '创建任务'}
          </Button>
        </>
      }
      width="max-w-3xl"
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
          <XCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="门店 *"
            value={storeId}
            onChange={setStoreId}
            options={stores.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="请选择门店"
            required
          />
          <Select
            label="盘点范围 *"
            value={scope}
            onChange={(v) => { setScope(v as InventoryCheckScope); setScopeCategory(''); setSelectedProductIds([]) }}
            options={Object.entries(checkScopeMap).map(([k, v]) => ({ value: k, label: v.label }))}
            required
          />
        </div>
        {scope === 'category' && (
          <Select
            label="商品分类 *"
            value={scopeCategory}
            onChange={setScopeCategory}
            options={categories.map((c) => ({ value: c, label: c }))}
            placeholder="请选择分类"
            required
          />
        )}
        <Input type="datetime-local" label="盘点时间 *" value={scheduledTime} onChange={setScheduledTime} required />
        <Textarea label="备注" value={remark} onChange={setRemark} placeholder="可选，填写盘点备注" />
        {scope === 'partial' && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">选择盘点商品 * <span className="text-xs text-gray-400">（已选 {selectedProductIds.length} 件）</span></div>
            <div className="max-h-60 overflow-y-auto space-y-1 p-3 border border-gray-200 rounded-lg">
              {filteredProducts.map((p) => (
                <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800">{p.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{p.sku}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {scope === 'category' && scopeCategory && (
          <div className="text-sm text-gray-500">
            该分类下共 <span className="font-semibold text-gray-700">{filteredProducts.length}</span> 件商品
          </div>
        )}
        {scope === 'full' && (
          <div className="text-sm text-gray-500">
            全店盘点将包含该门店所有 <span className="font-semibold text-gray-700">{products.length}</span> 件商品
          </div>
        )}
      </div>
    </Modal>
  )
}
