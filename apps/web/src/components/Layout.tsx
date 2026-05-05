import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Truck, Package, MapPin, LayoutDashboard, LogOut, Settings, User, Activity, Navigation, FileText, Users, Map } from 'lucide-react'
import { useAuthStore } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { NotificationsBell } from './ui/NotificationsBell'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Главная' },
  { to: '/dispatch', icon: Activity, label: 'Dispatch' },
  { to: '/vehicles', icon: Truck, label: 'Автопарк' },
  { to: '/tracking', icon: MapPin, label: 'Трекинг' },
  { to: '/invoices', icon: FileText, label: 'Счета' },
  { to: '/counterparties', icon: Users, label: 'Контрагенты' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
]

export function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-surface border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-accent-lavender" />
              <span className="font-semibold text-text-primary">Logistics</span>
            </div>
            <NotificationsBell />
          </div>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors',
                    isActive
                      ? 'bg-surface-hover text-accent-lavender'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  )
                }
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent-lavender/20 flex items-center justify-center">
              <User className="w-4 h-4 text-accent-lavender" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{user?.email || 'User'}</p>
              <p className="text-xs text-text-muted">{user?.type || 'user'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-status-error hover:bg-status-error/10 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-background">
        <Outlet />
      </main>
    </div>
  )
}