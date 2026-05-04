import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import pianoLogo from '../assets/piano-logo.png'
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
  MoreHorizontal,
  X,
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

const bottomMainItems = navItems.slice(0, 5)
const bottomMoreItems = navItems.slice(5)

interface NavbarProps {
  variant: 'sidebar' | 'bottom'
}

export default function Navbar({ variant }: NavbarProps) {
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)

  const handleLogout = () => {
    authApi.clearToken()
    navigate('/login')
  }

  if (variant === 'sidebar') {
    return (
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-slate-900 text-white fixed left-0 top-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
          <img src={pianoLogo} alt="Piano" className="w-10 h-10 rounded-xl object-cover" />
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

  // Bottom nav for mobile
  return (
    <>
      {/* "Mehr"-Panel overlay */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-white border-t border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Logo im Panel */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
              <img src={pianoLogo} alt="Piano" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-bold text-slate-900">Piano</span>
              <button
                onClick={() => setShowMore(false)}
                className="ml-auto p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="px-3 py-2 space-y-1">
              {bottomMoreItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50',
                    )
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
              <button
                onClick={() => { setShowMore(false); handleLogout() }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 w-full transition-colors"
              >
                <LogOut size={18} />
                Abmelden
              </button>
            </nav>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 safe-area-bottom">
        <div className="flex">
          {bottomMainItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setShowMore(false)}
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
          <button
            onClick={() => setShowMore((v) => !v)}
            className={clsx(
              'flex-1 flex flex-col items-center gap-1 py-2 px-1 text-xs font-medium transition-colors',
              showMore ? 'text-blue-600' : 'text-slate-500',
            )}
          >
            <MoreHorizontal size={20} />
            <span className="leading-none">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  )
}
