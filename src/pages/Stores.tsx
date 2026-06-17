import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { Card } from '../components/ui'
import {
  Store as StoreIcon,
  User,
  Phone,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
} from 'lucide-react'
import { orderStatusMap } from '../utils/constants'

export default function Stores() {
  const { state } = useApp()

  const storeStats = useMemo(() => {
    return state.stores.map((store) => {
      const storeOrders = state.orders.filter((o) => o.storeId === store.id)
      const totalOrders = storeOrders.length
      const pickedUp = storeOrders.filter(
        (o) => o.status === 'picked_up' || o.status === 'partial'
      ).length
      const pending = storeOrders.filter((o) =>
        ['pending', 'confirmed', 'ready', 'delayed'].includes(o.status)
      ).length
      const failed = storeOrders.filter((o) => o.status === 'failed').length
      const rate = totalOrders > 0 ? Math.round((pickedUp / totalOrders) * 100) : 0

      const stockWarnings = state.stocks.filter((s) => {
        if (s.storeId !== store.id) return false
        const product = state.products.find((p) => p.id === s.productId)
        return product && s.quantity <= product.warningThreshold
      }).length

      const totalStock = state.stocks
        .filter((s) => s.storeId === store.id)
        .reduce((sum, s) => sum + s.quantity, 0)

      const todayOrders = storeOrders.filter(
        (o) => o.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)
      ).length

      const todayPicked = storeOrders.filter((o) =>
        (o.status === 'picked_up' || o.status === 'partial') &&
        o.actualPickupTime?.slice(0, 10) === new Date().toISOString().slice(0, 10)
      ).length

      return {
        store,
        totalOrders,
        pickedUp,
        pending,
        failed,
        rate,
        stockWarnings,
        totalStock,
        todayOrders,
        todayPicked,
      }
    })
  }, [state.orders, state.stocks, state.stores, state.products])

  const storeColors = [
    { from: 'from-blue-500', to: 'to-indigo-500', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { from: 'from-emerald-500', to: 'to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { from: 'from-purple-500', to: 'to-pink-500', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    { from: 'from-amber-500', to: 'to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {storeStats.map((ss, idx) => {
          const color = storeColors[idx % storeColors.length]
          return (
            <Card
              key={ss.store.id}
              className="overflow-hidden !p-0"
            >
              <div className={`h-2 bg-gradient-to-r ${color.from} ${color.to}`} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color.from} ${color.to} flex items-center justify-center text-white shadow-lg shadow-blue-500/20`}>
                      <StoreIcon size={26} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-800">{ss.store.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <MapPin size={12} />
                        {ss.store.address}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          店长：{ss.store.manager}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone size={11} />
                          {ss.store.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-20 h-20 rounded-2xl ${color.bg} flex flex-col items-center justify-center`}>
                    <div className={`text-2xl font-bold ${color.text}`}>{ss.rate}%</div>
                    <div className="text-[10px] text-gray-400">完成率</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-5">
                  <div className={`p-3 rounded-xl ${color.bg}`}>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                      <TrendingUp size={11} className={color.text} />
                      今日新单
                    </div>
                    <div className={`text-xl font-bold ${color.text}`}>{ss.todayOrders}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                      <CheckCircle2 size={11} className="text-green-600" />
                      今日完成
                    </div>
                    <div className="text-xl font-bold text-green-600">{ss.todayPicked}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-50">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                      <Clock size={11} className="text-cyan-600" />
                      待处理
                    </div>
                    <div className="text-xl font-bold text-cyan-600">{ss.pending}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                      <AlertTriangle size={11} className="text-amber-600" />
                      库存预警
                    </div>
                    <div className={`text-xl font-bold ${ss.stockWarnings > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                      {ss.stockWarnings}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Users size={11} />
                        自提完成进度
                      </span>
                      <span className="font-medium text-gray-700">
                        {ss.pickedUp} / {ss.totalOrders} 单
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${color.from} ${color.to} rounded-full transition-all`}
                        style={{ width: `${ss.rate}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="p-2.5 rounded-lg border border-gray-100 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">总订单</div>
                      <div className="text-base font-bold text-gray-700">{ss.totalOrders}</div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-green-100 text-center bg-green-50/30">
                      <div className="text-xs text-green-600/70 mb-0.5">总完成</div>
                      <div className="text-base font-bold text-green-700">{ss.pickedUp}</div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-gray-100 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">
                        <Package size={10} className="inline -mt-0.5 mr-0.5" />
                        总库存
                      </div>
                      <div className="text-base font-bold text-gray-700">{ss.totalStock}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <StoreIcon size={18} className="text-blue-500" />
            <span>门店联系方式一览表</span>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-medium">门店</th>
                <th className="px-4 py-3 text-left font-medium">详细地址</th>
                <th className="px-4 py-3 text-left font-medium w-32">店长</th>
                <th className="px-4 py-3 text-left font-medium w-40">联系电话</th>
                <th className="px-4 py-3 text-center font-medium w-24">自提完成率</th>
                <th className="px-4 py-3 text-center font-medium w-24">当前状态</th>
              </tr>
            </thead>
            <tbody>
              {storeStats.map((ss, idx) => {
                const color = storeColors[idx % storeColors.length]
                return (
                  <tr key={ss.store.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color.from} ${color.to} flex items-center justify-center text-white`}>
                          <StoreIcon size={14} />
                        </div>
                        <span className="font-medium text-gray-800">{ss.store.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{ss.store.address}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          <User size={11} />
                        </div>
                        <span className="text-gray-700">{ss.store.manager}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-gray-700">{ss.store.phone}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${color.from} ${color.to} rounded-full`}
                            style={{ width: `${ss.rate}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold ${color.text}`}>{ss.rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {ss.stockWarnings > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                          <AlertTriangle size={11} />
                          {ss.stockWarnings} 个预警
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                          <CheckCircle2 size={11} />
                          正常运营
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
