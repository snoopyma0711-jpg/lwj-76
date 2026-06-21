import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  LayoutDashboard,
  ClipboardList,
  QrCode,
  Package,
  AlertTriangle,
  Store,
  ArrowRightLeft,
  ShoppingCart,
} from 'lucide-react'

const navItems = [
  { path: '/', label: '首页概览', icon: LayoutDashboard },
  { path: '/orders', label: '订单管理', icon: ClipboardList },
  { path: '/verify', label: '到店核销', icon: QrCode },
  { path: '/inventory', label: '库存管理', icon: Package },
  { path: '/transfers', label: '调拨补货', icon: ArrowRightLeft },
  { path: '/purchases', label: '采购管理', icon: ShoppingCart },
  { path: '/warnings', label: '库存预警', icon: AlertTriangle },
  { path: '/stores', label: '门店信息', icon: Store },
]

export function Layout() {
  const { state } = useApp()
  const location = useLocation()

  const currentStore = state.stores.find((s) => s.id === state.currentUser.storeId)

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
            <Store size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800 leading-tight">到店自提</div>
            <div className="text-xs text-gray-400 leading-tight">订单库存协同台</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}
              >
                <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-400'} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {state.currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">
                {state.currentUser.name}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {state.currentUser.role === 'manager' ? '门店店长' : '店员'} · {currentStore?.name ?? '-'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              {navItems.find((n) => n.path === location.pathname)?.label ?? '工作台'}
            </h1>
            <div className="text-xs text-gray-400 mt-0.5">
              {currentStore?.name} · {currentStore?.address}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-xs text-gray-400">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
