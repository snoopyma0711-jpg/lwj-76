import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Card, Button, Modal, Input, Select, Textarea, EmptyState, Badge, Tag } from '../components/ui'
import {
  Package,
  Search,
  Plus,
  Minus,
  ArrowDownToLine,
  SlidersHorizontal,
  AlertTriangle,
  FileText,
  Store as StoreIcon,
  Eye,
  Clock,
  BarChart3,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  X,
} from 'lucide-react'
import { stockChangeTypeMap, formatMoney } from '../utils/constants'
import type { Product } from '../types'

type Tab = 'inventory' | 'records'

export default function Inventory() {
  const {
    state,
    processStockIn,
    processStockAdjust,
    dispatch,
    getWarningProducts,
  } = useApp()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('inventory')
  const [keyword, setKeyword] = useState('')
  const [filterStoreId, setFilterStoreId] = useState(state.currentUser.storeId)
  const [filterCategory, setFilterCategory] = useState('')
  const [warningOnly, setWarningOnly] = useState(false)

  const [showInModal, setShowInModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showDistributionModal, setShowDistributionModal] = useState(false)

  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedStoreId, setSelectedStoreId] = useState(state.currentUser.storeId)

  const [inQuantity, setInQuantity] = useState('')
  const [inRemark, setInRemark] = useState('')
  const [inError, setInError] = useState('')

  const [adjustQuantity, setAdjustQuantity] = useState('')
  const [adjustRemark, setAdjustRemark] = useState('')
  const [adjustError, setAdjustError] = useState('')

  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    sku: '',
    category: '',
    unit: '',
    price: '',
    warningThreshold: '',
    description: '',
  })
  const [editError, setEditError] = useState('')

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const categories = useMemo(() => {
    return Array.from(new Set(state.products.map((p) => p.category)))
  }, [state.products])

  const inventoryList = useMemo(() => {
    let list = state.products.map((product) => {
      const storeStocks = filterStoreId
        ? state.stocks.filter((s) => s.productId === product.id && s.storeId === filterStoreId)
        : state.stocks.filter((s) => s.productId === product.id)
      const totalQty = storeStocks.reduce((s, st) => s + st.quantity, 0)
      const totalLocked = storeStocks.reduce((s, st) => s + st.lockedQuantity, 0)
      const isWarning = storeStocks.some((s) => s.quantity <= product.warningThreshold)
      const storeName = filterStoreId
        ? state.stores.find((st) => st.id === filterStoreId)?.name
        : '全部门店'
      const currentStock = filterStoreId && storeStocks[0] ? storeStocks[0] : null
      return {
        product,
        totalQty,
        totalLocked,
        available: totalQty - totalLocked,
        isWarning: warningOnly ? isWarning : false,
        anyWarning: isWarning,
        storeName,
        currentQty: currentStock?.quantity ?? totalQty,
        currentAvailable: currentStock ? currentStock.quantity - currentStock.lockedQuantity : totalQty - totalLocked,
        warningStoreCount: state.stocks.filter(
          (s) => s.productId === product.id && s.quantity <= product.warningThreshold
        ).length,
      }
    })

    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      list = list.filter(
        (x) =>
          x.product.name.toLowerCase().includes(kw) ||
          x.product.sku.toLowerCase().includes(kw) ||
          x.product.category.toLowerCase().includes(kw)
      )
    }
    if (filterCategory) {
      list = list.filter((x) => x.product.category === filterCategory)
    }
    if (warningOnly) {
      list = list.filter((x) => x.anyWarning)
    }
    return list.sort((a, b) => b.warningStoreCount - a.warningStoreCount)
  }, [state.products, state.stocks, state.stores, keyword, filterStoreId, filterCategory, warningOnly])

  const openInbound = (productId: string, storeId: string) => {
    setSelectedProductId(productId)
    setSelectedStoreId(storeId)
    setInQuantity('')
    setInRemark('')
    setInError('')
    setShowInModal(true)
  }

  const submitInbound = () => {
    const qty = parseInt(inQuantity)
    if (!qty || qty <= 0) {
      setInError('请输入有效的入库数量（大于0的整数）')
      return
    }
    if (qty > 99999) {
      setInError('入库数量过大，请检查')
      return
    }
    const res = processStockIn({
      productId: selectedProductId,
      storeId: selectedStoreId,
      quantity: qty,
      operator: state.currentUser.name,
      remark: inRemark,
    })
    if (res.success) {
      setShowInModal(false)
      setToast({ message: `入库成功，+${qty} 件`, type: 'success' })
    } else {
      setInError(res.message)
    }
  }

  const openAdjust = (productId: string, storeId: string, currentQty: number) => {
    setSelectedProductId(productId)
    setSelectedStoreId(storeId)
    setAdjustQuantity(String(currentQty))
    setAdjustRemark('')
    setAdjustError('')
    setShowAdjustModal(true)
  }

  const submitAdjust = () => {
    const qty = parseInt(adjustQuantity)
    if (isNaN(qty) || qty < 0) {
      setAdjustError('请输入有效的库存数量（非负整数）')
      return
    }
    if (qty > 99999) {
      setAdjustError('库存数量过大，请检查')
      return
    }
    const res = processStockAdjust({
      productId: selectedProductId,
      storeId: selectedStoreId,
      quantity: qty,
      operator: state.currentUser.name,
      remark: adjustRemark,
    })
    if (res.success) {
      setShowAdjustModal(false)
      setToast({ message: '库存调整成功', type: 'success' })
    } else {
      setAdjustError(res.message)
    }
  }

  const openEditProduct = (product: Product) => {
    setEditProduct(product)
    setEditForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      price: String(product.price),
      warningThreshold: String(product.warningThreshold),
      description: product.description || '',
    })
    setEditError('')
    setShowProductModal(true)
  }

  const submitEditProduct = () => {
    if (!editProduct) return
    if (!editForm.name.trim()) {
      setEditError('商品名称不能为空')
      return
    }
    if (!editForm.sku.trim()) {
      setEditError('SKU 编码不能为空')
      return
    }
    const price = parseFloat(editForm.price)
    if (isNaN(price) || price < 0) {
      setEditError('请输入有效的商品价格')
      return
    }
    const threshold = parseInt(editForm.warningThreshold)
    if (isNaN(threshold) || threshold < 0) {
      setEditError('请输入有效的预警阈值')
      return
    }

    dispatch({
      type: 'UPDATE_PRODUCT',
      payload: {
        ...editProduct,
        name: editForm.name.trim(),
        sku: editForm.sku.trim(),
        category: editForm.category || '未分类',
        unit: editForm.unit || '件',
        price,
        warningThreshold: threshold,
        description: editForm.description,
      },
    })
    setShowProductModal(false)
    setToast({ message: '商品信息已更新', type: 'success' })
  }

  const openDistribution = (productId: string) => {
    setSelectedProductId(productId)
    setShowDistributionModal(true)
  }

  const selectedProduct = state.products.find((p) => p.id === selectedProductId)
  const distributionStock = selectedProduct
    ? state.stocks
        .filter((s) => s.productId === selectedProductId)
        .map((s) => ({
          ...s,
          storeName: state.stores.find((st) => st.id === s.storeId)?.name ?? '-',
        }))
    : []

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg shadow-lg text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">商品总数</div>
            <Package size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{state.products.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">库存总件数</div>
            <BarChart3 size={18} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {state.stocks.reduce((s, x) => s + x.quantity, 0)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">预警商品数</div>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{getWarningProducts().length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/warnings')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">预警门店点位</div>
            <StoreIcon size={18} className="text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {getWarningProducts().reduce((s, p) => s + p.storeWarnings.length, 0)}
          </div>
          <div className="text-[10px] text-blue-500 mt-1">点击查看详情 →</div>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setTab('inventory')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                ${tab === 'inventory' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Package size={14} className="inline -mt-0.5 mr-1.5" />
              门店库存
            </button>
            <button
              onClick={() => setTab('records')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                ${tab === 'records' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FileText size={14} className="inline -mt-0.5 mr-1.5" />
              出入库记录
            </button>
          </div>
        </div>

        {tab === 'inventory' && (
          <>
            <div className="flex flex-wrap gap-3 items-end mb-5">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={keyword}
                  onChange={setKeyword}
                  placeholder="搜索商品名称 / SKU / 分类"
                  className="pl-9"
                />
              </div>
              <Select
                value={filterStoreId}
                onChange={setFilterStoreId}
                options={[
                  { value: '', label: '全部门店（汇总）' },
                  ...state.stores.map((s) => ({ value: s.id, label: s.name })),
                ]}
                className="w-48"
              />
              <Select
                value={filterCategory}
                onChange={setFilterCategory}
                options={categories.map((c) => ({ value: c, label: c }))}
                placeholder="所有分类"
                className="w-40"
              />
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={warningOnly}
                  onChange={(e) => setWarningOnly(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <span className="text-gray-600">只看预警商品</span>
              </label>
            </div>

            {inventoryList.length === 0 ? (
              <EmptyState
                title={keyword || filterCategory || warningOnly ? '没有找到符合条件的商品' : '暂无商品数据'}
                description={keyword || filterCategory || warningOnly ? '试试调整筛选条件' : '商品数据会自动展示在这里'}
              />
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50/50">
                      <th className="px-3 py-3 text-left font-medium">商品信息</th>
                      <th className="px-3 py-3 text-left font-medium w-28">分类</th>
                      {!filterStoreId && <th className="px-3 py-3 text-center font-medium w-20">预警门店</th>}
                      <th className="px-3 py-3 text-center font-medium w-24">单价</th>
                      <th className="px-3 py-3 text-center font-medium w-24">预警阈值</th>
                      <th className="px-3 py-3 text-center font-medium w-24">当前库存</th>
                      <th className="px-3 py-3 text-center font-medium w-24">可用</th>
                      <th className="px-3 py-3 text-right font-medium w-52">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryList.map((item) => {
                      const p = item.product
                      const ratio = p.warningThreshold > 0 ? item.currentQty / p.warningThreshold : 10
                      const stockColor =
                        item.currentQty <= p.warningThreshold
                          ? 'text-red-600'
                          : item.currentQty <= p.warningThreshold * 1.5
                          ? 'text-amber-600'
                          : 'text-gray-800'
                      return (
                        <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors
                          ${item.currentQty <= p.warningThreshold ? 'bg-red-50/20' : ''}`}>
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                                ${p.category.includes('水果') ? 'bg-pink-50 text-pink-500' :
                                  p.category.includes('咖啡') ? 'bg-amber-50 text-amber-600' :
                                  p.category.includes('海鲜') ? 'bg-cyan-50 text-cyan-600' :
                                  p.category.includes('肉') ? 'bg-red-50 text-red-500' :
                                  'bg-blue-50 text-blue-500'}`}>
                                <Package size={18} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-800 flex items-center gap-1.5">
                                  {p.name}
                                  {item.warningStoreCount > 0 && filterStoreId === '' && (
                                    <Badge color="red">{item.warningStoreCount}店预警</Badge>
                                  )}
                                  {item.currentQty <= p.warningThreshold && filterStoreId !== '' && (
                                    <Badge color="red">库存预警</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 font-mono mt-0.5">SKU: {p.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            <Tag>{p.category}</Tag>
                          </td>
                          {!filterStoreId && (
                            <td className="px-3 py-3.5 text-center">
                              {item.warningStoreCount > 0 ? (
                                <span className="text-red-600 font-semibold">{item.warningStoreCount}</span>
                              ) : (
                                <span className="text-gray-300">0</span>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-3.5 text-center text-gray-600">{formatMoney(p.price)}</td>
                          <td className="px-3 py-3.5 text-center text-gray-500">≤ {p.warningThreshold}</td>
                          <td className="px-3 py-3.5 text-center">
                            <span className={`text-lg font-bold ${stockColor}`}>{item.currentQty}</span>
                            <span className="text-xs text-gray-400 ml-1">{p.unit}</span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden mx-auto mt-1.5">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  ratio < 1 ? 'bg-red-500' : ratio < 1.5 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, ratio * 50)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-center text-gray-600">{item.currentAvailable}</td>
                          <td className="px-3 py-3.5">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openDistribution(p.id)}
                                className="!px-2 !py-1"
                              >
                                <Eye size={13} />
                                分布
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openEditProduct(p)}
                                className="!px-2 !py-1"
                              >
                                <SlidersHorizontal size={13} />
                                编辑
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => openInbound(p.id, filterStoreId || state.currentUser.storeId)}
                                className="!px-2 !py-1 gap-1"
                              >
                                <ArrowDownToLine size={13} />
                                入库
                              </Button>
                              <Button
                                size="sm"
                                variant="warning"
                                onClick={() =>
                                  openAdjust(
                                    p.id,
                                    filterStoreId || state.currentUser.storeId,
                                    item.currentQty
                                  )
                                }
                                className="!px-2 !py-1 gap-1"
                              >
                                <MinusCircle size={13} />
                                调整
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'records' && (
          <>
            <div className="flex flex-wrap gap-3 items-end mb-5">
              <Select
                value={filterStoreId}
                onChange={setFilterStoreId}
                options={[
                  { value: '', label: '全部门店' },
                  ...state.stores.map((s) => ({ value: s.id, label: s.name })),
                ]}
                className="w-48"
              />
              <div className="text-xs text-gray-500">
                共 {
                  filterStoreId
                    ? state.stockRecords.filter((r) => r.storeId === filterStoreId).length
                    : state.stockRecords.length
                } 条出入库记录
              </div>
            </div>

            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50/50">
                    <th className="px-3 py-3 text-left font-medium w-44">时间</th>
                    <th className="px-3 py-3 text-left font-medium">商品</th>
                    <th className="px-3 py-3 text-left font-medium w-36">门店</th>
                    <th className="px-3 py-3 text-center font-medium w-24">类型</th>
                    <th className="px-3 py-3 text-center font-medium w-24">数量</th>
                    <th className="px-3 py-3 text-center font-medium w-24">变更前</th>
                    <th className="px-3 py-3 text-center font-medium w-24">变更后</th>
                    <th className="px-3 py-3 text-left font-medium">备注 / 关联订单</th>
                  </tr>
                </thead>
                <tbody>
                  {(filterStoreId
                    ? state.stockRecords.filter((r) => r.storeId === filterStoreId)
                    : state.stockRecords
                  ).map((rec) => {
                    const tc = stockChangeTypeMap[rec.type]
                    return (
                      <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={12} />
                            {rec.time.slice(5, 16)}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">操作人：{rec.operator}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-800">{rec.productName}</div>
                        </td>
                        <td className="px-3 py-3 text-gray-600 text-xs">{rec.storeName}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`font-semibold ${tc.color} flex items-center justify-center gap-1 text-xs`}>
                            {rec.type === 'in' ? <TrendingUp size={13} /> :
                              rec.type === 'out' ? <TrendingDown size={13} /> :
                              <SlidersHorizontal size={13} />}
                            {tc.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-lg font-bold ${tc.color}`}>
                            {rec.quantity > 0 ? '+' : ''}{rec.quantity}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-500">{rec.beforeQuantity}</td>
                        <td className="px-3 py-3 text-center font-medium text-gray-800">{rec.afterQuantity}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[220px]">
                          {rec.relatedOrderNo && (
                            <Tag className="mb-1 font-mono text-blue-600 bg-blue-50">{rec.relatedOrderNo}</Tag>
                          )}
                          <div className="truncate">{rec.remark}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={showInModal}
        title={
          selectedProduct
            ? `入库 · ${selectedProduct.name}`
            : '商品入库'
        }
        onClose={() => setShowInModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInModal(false)}>取消</Button>
            <Button variant="primary" onClick={submitInbound}>确认入库</Button>
          </>
        }
      >
        <div className="space-y-4">
          {inError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
              <X size={14} />
              {inError}
            </div>
          )}
          <div className="p-3 rounded-lg bg-gray-50 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500">商品</span>
              <span className="font-medium text-gray-800">{selectedProduct?.name}</span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500">SKU</span>
              <span className="font-mono text-gray-600">{selectedProduct?.sku}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">门店</span>
              <span className="text-gray-600">
                {state.stores.find((s) => s.id === selectedStoreId)?.name}
              </span>
            </div>
          </div>
          <Select
            label="入库门店"
            value={selectedStoreId}
            onChange={setSelectedStoreId}
            options={state.stores.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Input
            label="入库数量 *"
            type="number"
            value={inQuantity}
            onChange={setInQuantity}
            placeholder="请输入入库件数"
            required
          />
          <Textarea
            label="入库备注"
            value={inRemark}
            onChange={setInRemark}
            placeholder="如：采购批次#20240115、供应商XXX等"
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        open={showAdjustModal}
        title={
          selectedProduct
            ? `库存调整 · ${selectedProduct.name}`
            : '库存调整'
        }
        onClose={() => setShowAdjustModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdjustModal(false)}>取消</Button>
            <Button variant="warning" onClick={submitAdjust}>确认调整</Button>
          </>
        }
      >
        <div className="space-y-4">
          {adjustError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
              <X size={14} />
              {adjustError}
            </div>
          )}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700 flex items-start gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium mb-0.5">注意</div>
              <div className="text-xs text-amber-600">
                盘点调整将直接变更库存数量，建议在实际盘点后使用，并在备注中说明调整原因
              </div>
            </div>
          </div>
          <Input
            label="调整后实际库存数量 *"
            type="number"
            value={adjustQuantity}
            onChange={setAdjustQuantity}
            placeholder="请输入盘点后的实际数量"
            required
          />
          <Textarea
            label="调整原因 *"
            value={adjustRemark}
            onChange={setAdjustRemark}
            placeholder="请说明调整原因，如：月度盘点、破损丢失、赠品出库等"
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        open={showProductModal}
        title={editProduct ? `编辑商品 · ${editProduct.name}` : '编辑商品'}
        onClose={() => setShowProductModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowProductModal(false)}>取消</Button>
            <Button variant="primary" onClick={submitEditProduct}>保存</Button>
          </>
        }
      >
        <div className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
              <X size={14} />
              {editError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="商品名称 *"
              value={editForm.name}
              onChange={(v) => setEditForm((f) => ({ ...f, name: v }))}
              required
            />
            <Input
              label="SKU 编码 *"
              value={editForm.sku}
              onChange={(v) => setEditForm((f) => ({ ...f, sku: v }))}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="分类"
              value={editForm.category}
              onChange={(v) => setEditForm((f) => ({ ...f, category: v }))}
              placeholder="如：生鲜水果"
            />
            <Input
              label="计量单位"
              value={editForm.unit}
              onChange={(v) => setEditForm((f) => ({ ...f, unit: v }))}
              placeholder="如：件、盒、箱"
            />
            <Input
              label="销售单价 *"
              type="number"
              value={editForm.price}
              onChange={(v) => setEditForm((f) => ({ ...f, price: v }))}
              required
            />
          </div>
          <Input
            label="库存预警阈值 *"
            type="number"
            value={editForm.warningThreshold}
            onChange={(v) => setEditForm((f) => ({ ...f, warningThreshold: v }))}
            placeholder="低于该数量时触发预警"
            required
          />
          <Textarea
            label="商品描述"
            value={editForm.description}
            onChange={(v) => setEditForm((f) => ({ ...f, description: v }))}
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        open={showDistributionModal}
        title={selectedProduct ? `${selectedProduct.name} - 全门店库存分布` : '库存分布'}
        onClose={() => setShowDistributionModal(false)}
        width="max-w-4xl"
        footer={
          <Button variant="secondary" onClick={() => setShowDistributionModal(false)}>关闭</Button>
        }
      >
        {selectedProduct && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-blue-50 text-center">
                <div className="text-xs text-blue-600 mb-1">预警阈值</div>
                <div className="text-2xl font-bold text-blue-700">{selectedProduct.warningThreshold}</div>
              </div>
              <div className="p-4 rounded-xl bg-green-50 text-center">
                <div className="text-xs text-green-600 mb-1">总库存</div>
                <div className="text-2xl font-bold text-green-700">
                  {distributionStock.reduce((s, x) => s + x.quantity, 0)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 text-center">
                <div className="text-xs text-amber-600 mb-1">预警门店</div>
                <div className="text-2xl font-bold text-amber-700">
                  {distributionStock.filter((x) => x.quantity <= selectedProduct.warningThreshold).length}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 text-center">
                <div className="text-xs text-gray-500 mb-1">涉及门店</div>
                <div className="text-2xl font-bold text-gray-700">{distributionStock.length}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3">各门店详情</div>
              <div className="space-y-2.5">
                {distributionStock.map((s) => {
                  const ratio = selectedProduct.warningThreshold > 0 ? s.quantity / selectedProduct.warningThreshold : 10
                  const isWarn = s.quantity <= selectedProduct.warningThreshold
                  return (
                    <div
                      key={s.storeId}
                      className={`p-4 rounded-xl border transition-all
                        ${isWarn ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <StoreIcon size={16} className={isWarn ? 'text-red-500' : 'text-gray-400'} />
                          <div className="font-medium text-gray-800">{s.storeName}</div>
                          {isWarn && <Badge color="red">库存预警</Badge>}
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${isWarn ? 'text-red-600' : 'text-gray-800'}`}>
                            {s.quantity}
                            <span className="text-sm font-normal text-gray-400 ml-1">{selectedProduct.unit}</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            可用 {s.quantity - s.lockedQuantity} / 锁定 {s.lockedQuantity}
                          </div>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            ratio < 1 ? 'bg-red-500' : ratio < 1.5 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, ratio * 30)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-gray-400">0</span>
                        <span className="text-gray-400">
                          预警线 <span className={isWarn ? 'text-red-500 font-medium' : 'text-gray-500'}>{selectedProduct.warningThreshold}</span>
                        </span>
                        <span className="text-gray-400">
                          {Math.max(s.quantity, selectedProduct.warningThreshold * 2)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
