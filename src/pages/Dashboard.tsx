import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Card, Button } from '../components/ui'
import {
  TrendingUp,
  Clock,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Package,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
} from 'recharts'
import { getDateString, getDateStringShort, isOverdue } from '../utils/constants'

interface KpiCardProps {
  title: string
  value: number | string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  subTitle?: string
  action?: { label: string; onClick: () => void }
}

function KpiCard({ title, value, icon: Icon, iconBg, iconColor, subTitle, action }: KpiCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm text-gray-500 mb-2">{title}</div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
          {subTitle && <div className="text-xs text-gray-400">{subTitle}</div>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
          <Icon size={22} />
        </div>
      </div>
      {action && (
        <div className="mt-4 pt-3 border-t border-gray-50">
          <button
            onClick={action.onClick}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
          >
            {action.label}
            <ArrowRight size={12} />
          </button>
        </div>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const { state, getWarningProducts } = useApp()
  const navigate = useNavigate()

  const todayStr = getDateString()

  const {
    todayNewCount,
    todayPickedUpCount,
    pendingPickupCount,
    overdueCount,
    warningProducts,
  } = useMemo(() => {
    let todayNew = 0
    let todayPicked = 0
    let pending = 0
    let overdue = 0

    for (const order of state.orders) {
      const createdDay = order.createdAt.slice(0, 10)
      if (createdDay === todayStr) {
        todayNew++
      }

      if (order.status === 'picked_up' && order.actualPickupTime?.slice(0, 10) === todayStr) {
        todayPicked++
      }

      if (['pending', 'confirmed', 'ready', 'delayed'].includes(order.status)) {
        pending++
        if (isOverdue(order.scheduledPickupTime, order.status)) {
          overdue++
        }
      }
    }

    const warnings = getWarningProducts()
    return {
      todayNewCount: todayNew,
      todayPickedUpCount: todayPicked,
      pendingPickupCount: pending,
      overdueCount: overdue,
      warningProducts: warnings,
    }
  }, [state.orders, todayStr, getWarningProducts])

  const weekData = useMemo(() => {
    const data: {
      date: string
      dateStr: string
      newOrders: number
      pickedUp: number
    }[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const label = getDateStringShort(d)

      let newOrders = 0
      let pickedUp = 0

      for (const order of state.orders) {
        if (order.createdAt.slice(0, 10) === dateStr) {
          newOrders++
        }
        if (
          (order.status === 'picked_up' || order.status === 'partial') &&
          order.actualPickupTime?.slice(0, 10) === dateStr
        ) {
          pickedUp++
        }
      }

      data.push({ date: label, dateStr, newOrders, pickedUp })
    }
    return data
  }, [state.orders])

  const storePerformance = useMemo(() => {
    return state.stores.map((store) => {
      const storeOrders = state.orders.filter((o) => o.storeId === store.id)
      const total = storeOrders.length
      const pickedUp = storeOrders.filter(
        (o) => o.status === 'picked_up' || o.status === 'partial',
      ).length
      const pending = storeOrders.filter(
        (o) => ['pending', 'confirmed', 'ready', 'delayed'].includes(o.status),
      ).length
      const failed = storeOrders.filter((o) => o.status === 'failed').length
      const rate = total > 0 ? Math.round((pickedUp / total) * 100) : 0
      return {
        storeId: store.id,
        storeName: store.name,
        total,
        pickedUp,
        pending,
        failed,
        rate,
      }
    })
  }, [state.orders, state.stores])

  const recentOrders = useMemo(() => {
    return state.orders
      .filter((o) => ['pending', 'confirmed', 'ready'].includes(o.status))
      .slice(0, 5)
  }, [state.orders])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="今日新增订单"
          value={todayNewCount}
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          subTitle="顾客下单，含各门店"
          action={{ label: '查看订单列表', onClick: () => navigate('/orders') }}
        />
        <KpiCard
          title="待自提订单"
          value={pendingPickupCount}
          icon={Clock}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          subTitle="已确认/待取货/延期"
          action={{ label: '前往核销', onClick: () => navigate('/verify') }}
        />
        <KpiCard
          title="逾期未取订单"
          value={overdueCount}
          icon={AlertOctagon}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          subTitle="超过约定取货时间"
          action={{ label: '联系顾客', onClick: () => navigate('/orders?status=overdue') }}
        />
        <KpiCard
          title="今日完成自提"
          value={todayPickedUpCount}
          icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          subTitle="顾客已取货完成"
        />
        <KpiCard
          title="库存预警商品"
          value={warningProducts.length}
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          subTitle={`涉及 ${warningProducts.reduce((s, p) => s + p.storeWarnings.length, 0)} 个门店库存点`}
          action={{ label: '查看详情', onClick: () => navigate('/warnings') }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-2"
          title="最近七天订单变化"
          extra={
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                新增订单
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                完成自提
              </div>
            </div>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="newOrders"
                  name="新增订单"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="pickedUp"
                  name="完成自提"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="待处理订单"
          extra={
            <button
              onClick={() => navigate('/orders')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              全部 →
            </button>
          }
        >
          <div className="space-y-3 max-h-72 overflow-auto scrollbar-thin">
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">暂无待处理订单，干得漂亮！</div>
            ) : (
              recentOrders.map((order) => {
                const overdue = isOverdue(order.scheduledPickupTime, order.status)
                return (
                  <div
                    key={order.id}
                    className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 cursor-pointer transition-colors"
                    onClick={() => navigate(`/orders?orderNo=${order.orderNo}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono font-semibold text-gray-700">{order.orderNo}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${overdue ? 'bg-red-50 text-red-600' : 'bg-cyan-50 text-cyan-600'}`}>
                        {overdue ? '已逾期' : '待取货'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>{order.storeName}</span>
                      <span>约定 {order.scheduledPickupTime.slice(11, 16)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        {order.contactName} · {order.contactPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                      </span>
                      <span className="text-gray-700 font-medium">
                        {order.items.reduce((s, i) => s + i.quantity, 0)}件 · ¥{order.totalAmount.toFixed(0)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>

      <Card
        title="各门店自提完成情况"
        extra={
          <div className="text-xs text-gray-500">
            共 {state.orders.length} 笔订单，完成率 {
              state.orders.length > 0
                ? Math.round(
                    (state.orders.filter((o) => o.status === 'picked_up' || o.status === 'partial').length /
                      state.orders.length) * 100
                  )
                : 0
            }%
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={storePerformance}
                margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="storeName"
                  type="category"
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    const map: Record<string, string> = {
                      total: '总订单',
                      pickedUp: '已完成',
                      pending: '待处理',
                      failed: '失败',
                    }
                    return [value, map[name] ?? name]
                  }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="pickedUp" name="已完成" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pending" name="待处理" stackId="a" fill="#3b82f6" />
                <Bar dataKey="failed" name="失败" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            {storePerformance.map((sp, idx) => {
              const barColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
              return (
                <div key={sp.storeId} className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: barColors[idx % barColors.length] }}
                      >
                        {sp.storeName.charAt(2)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{sp.storeName}</div>
                        <div className="text-xs text-gray-400">共 {sp.total} 笔订单</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: barColors[idx % barColors.length] }}>
                        {sp.rate}%
                      </div>
                      <div className="text-xs text-gray-400">完成率</div>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${sp.rate}%`,
                        backgroundColor: barColors[idx % barColors.length],
                      }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="py-2 rounded-md bg-green-50">
                      <div className="text-base font-bold text-green-600">{sp.pickedUp}</div>
                      <div className="text-[10px] text-green-600/70">已完成</div>
                    </div>
                    <div className="py-2 rounded-md bg-blue-50">
                      <div className="text-base font-bold text-blue-600">{sp.pending}</div>
                      <div className="text-[10px] text-blue-600/70">待处理</div>
                    </div>
                    <div className="py-2 rounded-md bg-red-50">
                      <div className="text-base font-bold text-red-600">{sp.failed}</div>
                      <div className="text-[10px] text-red-600/70">失败</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
