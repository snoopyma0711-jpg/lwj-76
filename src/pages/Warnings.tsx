import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Card, Button, Modal, EmptyState, Badge, Tag } from '../components/ui'
import {
  AlertTriangle,
  Store as StoreIcon,
  Package,
  ArrowDownToLine,
  Eye,
  Phone,
  Clock,
  User,
  MapPin,
  Hash,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  AlertOctagon,
} from 'lucide-react'
import { formatMoney, maskPhone, orderStatusMap, isOverdue } from '../utils/constants'
import type { Order } from '../types'

export default function Warnings() {
  const { state, getWarningProducts, getOrdersAffectedByStock } = useApp()
  const navigate = useNavigate()

  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [showAffectedModal, setShowAffectedModal] = useState(false)
  const [affectedProductId, setAffectedProductId] = useState('')
  const [affectedStoreId, setAffectedStoreId] = useState('')

  const warningProducts = useMemo(() => getWarningProducts(), [getWarningProducts])

  const openAffected = (productId: string, storeId: string) => {
    setAffectedProductId(productId)
    setAffectedStoreId(storeId)
    setShowAffectedModal(true)
  }

  const affectedOrders = useMemo(() => {
    if (!affectedProductId) return []
    return getOrdersAffectedByStock(affectedProductId, affectedStoreId || undefined)
  }, [affectedProductId, affectedStoreId, getOrdersAffectedByStock])

  const affectedProduct = state.products.find((p) => p.id === affectedProductId)
  const affectedStore = state.stores.find((s) => s.id === affectedStoreId)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="!border-red-200 bg-gradient-to-br from-red-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-red-500 mb-1 font-medium">预警商品总数</div>
              <div className="text-3xl font-bold text-red-600">{warningProducts.length}</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-500">
              <AlertTriangle size={28} />
            </div>
          </div>
        </Card>
        <Card className="!border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-500 mb-1 font-medium">预警门店点位</div>
              <div className="text-3xl font-bold text-amber-600">
                {warningProducts.reduce((s, p) => s + p.storeWarnings.length, 0)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-500">
              <StoreIcon size={28} />
            </div>
          </div>
        </Card>
        <Card className="!border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-orange-500 mb-1 font-medium">可能受影响订单</div>
              <div className="text-3xl font-bold text-orange-600">
                {warningProducts.reduce(
                  (sum, p) => sum + getOrdersAffectedByStock(p.id).length,
                  0
                )}
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500">
              <ShoppingCart size={28} />
            </div>
          </div>
        </Card>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <AlertOctagon size={18} className="text-red-500" />
            <span>库存预警商品清单</span>
            {warningProducts.length > 0 && (
              <Tag className="bg-red-50 text-red-600 border-red-100">
                共 {warningProducts.length} 种商品
              </Tag>
            )}
          </div>
        }
        extra={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/inventory')}
            className="gap-1.5"
          >
            <ArrowDownToLine size={14} />
            前往补货
          </Button>
        }
      >
        {warningProducts.length === 0 ? (
          <EmptyState
            title="🎉 太棒了，当前没有库存预警！"
            description="所有商品库存充足，继续保持。如果有商品库存不足，会自动出现在这里。"
            icon={
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <Package size={32} className="text-green-400" />
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            {warningProducts.map((p) => {
              const expanded = expandedProduct === p.id
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-red-100 bg-white overflow-hidden shadow-sm"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-red-50/30 transition-colors"
                    onClick={() => setExpandedProduct(expanded ? null : p.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 flex-shrink-0">
                        <AlertTriangle size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-semibold text-gray-800">{p.name}</span>
                          <span className="font-mono text-xs text-gray-400">SKU: {p.sku}</span>
                          <Tag>{p.category}</Tag>
                          <Badge color="red">{p.storeWarnings.length} 家门店预警</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>全门店总库存: <span className="font-semibold text-gray-700">{p.totalQuantity}</span> {p.unit}</span>
                          <span>预警阈值: ≤ {p.warningThreshold} {p.unit}</span>
                          <span>单价: {formatMoney(p.price)}</span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div className="hidden md:block">
                          <div className="text-xs text-gray-400 mb-0.5">缺口紧急度</div>
                          <div className="w-28 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    10,
                                    (1 - p.totalQuantity / (p.warningThreshold * p.storeWarnings.length * 2)) * 100
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg transition-all ${expanded ? 'rotate-180 bg-red-100' : 'bg-gray-50'}`}>
                          {expanded ? (
                            <ChevronUp size={18} className="text-red-500" />
                          ) : (
                            <ChevronDown size={18} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-red-50 bg-red-50/30 p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {p.storeWarnings.map((sw: { storeId: string; storeName: string; quantity: number; threshold: number }) => {
                          const affectedCount = getOrdersAffectedByStock(p.id, sw.storeId).length
                          return (
                            <div
                              key={sw.storeId}
                              className="p-3.5 rounded-lg bg-white border border-gray-100 hover:border-gray-200 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <StoreIcon size={14} className="text-gray-400" />
                                  <div className="font-medium text-gray-800 text-sm">{sw.storeName}</div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-xl font-bold ${
                                    sw.quantity === 0 ? 'text-red-600' :
                                    sw.quantity <= sw.threshold / 2 ? 'text-red-500' : 'text-amber-600'
                                  }`}>
                                    {sw.quantity}
                                    <span className="text-xs font-normal text-gray-400 ml-1">{p.unit}</span>
                                  </div>
                                  <div className="text-[10px] text-gray-400">阈值 ≤ {sw.threshold}</div>
                                </div>
                              </div>

                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                                <div
                                  className={`h-full rounded-full ${
                                    sw.quantity === 0 ? 'bg-red-600' :
                                    sw.quantity <= sw.threshold / 2 ? 'bg-red-500' : 'bg-amber-500'
                                  }`}
                                  style={{
                                    width: `${sw.threshold > 0 ? Math.min(100, (sw.quantity / sw.threshold) * 100) : 0}%`,
                                  }}
                                />
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                {affectedCount > 0 ? (
                                  <button
                                    onClick={(e) => {
                                      e?.stopPropagation()
                                      openAffected(p.id, sw.storeId)
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-xs font-medium hover:bg-orange-100 transition-colors border border-orange-100"
                                  >
                                    <ShoppingCart size={12} />
                                    影响 {affectedCount} 笔订单
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-gray-400 px-2 py-1">暂无待处理订单受影响</span>
                                )}
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="gap-1 !px-2.5 !py-1.5 !text-xs"
                                  onClick={(e) => {
                                    e?.stopPropagation()
                                    navigate('/inventory')
                                  }}
                                >
                                  <ArrowDownToLine size={12} />
                                  立即补货
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {p.description && (
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-500">
                          <span className="font-medium text-gray-600">商品描述：</span>
                          {p.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={showAffectedModal}
        title={
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-orange-500" />
            <span>
              「{affectedProduct?.name}」
              {affectedStore && <span className="text-sm text-gray-500 font-normal">（{affectedStore.name}）</span>}
              可能受影响的订单
            </span>
          </div>
        }
        onClose={() => setShowAffectedModal(false)}
        width="max-w-4xl"
        footer={
          <Button variant="secondary" onClick={() => setShowAffectedModal(false)}>关闭</Button>
        }
      >
        <div className="space-y-3">
          {affectedProduct && (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 text-sm">
              <div className="font-medium text-orange-800 mb-1 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                建议提前处理
              </div>
              <div className="text-xs text-orange-700 leading-relaxed">
                以下订单状态为待处理，且包含商品「{affectedProduct.name}」。
                如库存无法及时补充，建议提前联系顾客协商更换商品、延期取货或部分退款等处理方案，避免到店核销时产生纠纷。
              </div>
            </div>
          )}

          {affectedOrders.length === 0 ? (
            <EmptyState
              title="暂无受影响的待处理订单"
              description="该商品的待处理订单暂时没有，库存压力较小。"
            />
          ) : (
            affectedOrders.map((order) => (
              <AffectedOrderCard
                key={order.id}
                order={order}
                productId={affectedProductId}
                onJump={() => {
                  setShowAffectedModal(false)
                  navigate(`/orders?orderNo=${order.orderNo}`)
                }}
              />
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}

function AffectedOrderCard({
  order,
  productId,
  onJump,
}: {
  order: Order
  productId: string
  onJump: () => void
}) {
  const st = orderStatusMap[order.status]
  const overdue = isOverdue(order.scheduledPickupTime, order.status)
  const affectedItem = order.items.find((i) => i.productId === productId)
  return (
    <div
      className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
        overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
      onClick={onJump}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-gray-800">
              <Hash size={12} className="inline -mt-0.5 mr-1 text-gray-400" />
              {order.orderNo}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${st.bgColor} ${st.color}`}>
              {st.label}
            </span>
            {overdue && (
              <Badge color="red">
                <AlertTriangle size={10} className="inline mr-0.5" />
                已逾期
              </Badge>
            )}
            {affectedItem && (
              <Tag className="bg-orange-50 text-orange-600 border-orange-100 font-medium">
                缺口商品: {affectedItem.productName} x{affectedItem.quantity}
              </Tag>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <User size={11} />
              {order.contactName} · <span className="font-mono">{maskPhone(order.contactPhone)}</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {order.storeName}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              约定 {order.scheduledPickupTime.slice(5, 16)}
            </span>
            <span className="flex items-center gap-1">
              <Phone size={11} />
              联系记录 {order.contactRecords.length} 条
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-0.5">订单金额</div>
            <div className="text-lg font-bold text-gray-800">{formatMoney(order.totalAmount)}</div>
          </div>
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
            处理订单
            <Eye size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
