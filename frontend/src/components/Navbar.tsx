import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  Euro,
  Download,
  HardDrive,
  Settings,
  LogOut,
  Music2,
} from 'lucide-react'
import { authApi } from '../api'
import { clsx } from 'clsx'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patienten', icon: Users },
  { to: '/sessions', label: 'Sitzungen', icon: Calendar },
  { to: '/supervision', label: 'Supervision', icon: BookOpen },
  { to: '/finance', label: 'Finanzen', icon: Euro },
  { to: '/export', label: 'Export', icon: Download },
  { to: '/backup', label: 'Backup', icon: HardDrive },
  { to: '/settings', label: 'Einstellungen', icon: Settings },
]

interface NavbarProps {
  variant: 'sidebar' | 'bottom'
}

export default function Navbar({ variant }: NavbarProps) {
  const navigate = useNavigate()

  const handleLogout = () => {
    authApi.clearToken()
    navigate('/login')
  }

  if (variant === 'sidebar') {
    return (
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-slate-900 text-white fixed left-0 top-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <Music2 size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-lg leading-none">Piano</div>
            <div className="text-slate-400 text-xs mt-0.5">Ausbildungstracker</div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 w-full transition-all"
          >
            <LogOut size={18} />
            Abmelden
          </button>
        </div>
      </aside>
    )
  }

  // Bottom nav for mobile - show only key items
  const bottomItems = navItems.slice(0, 5)
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 safe-area-bottom">
      <div className="flex">
        {bottomItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center gap-1 py-2 px-1 text-xs font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-slate-500',
              )
            }
          >
            <Icon size={20} />
            <span className="leading-none">{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
