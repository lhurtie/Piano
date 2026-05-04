import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import pianoLogo from '../assets/piano-logo.png'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar (desktop) */}
      <Navbar variant="sidebar" />

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 bg-slate-900 flex items-center gap-3 px-4 py-3">
        <img src={pianoLogo} alt="Piano" className="w-8 h-8 rounded-lg object-cover" />
        <span className="font-bold text-white text-base leading-none">Piano</span>
        <span className="text-slate-400 text-xs">Ausbildungstracker</span>
      </header>

      {/* Main content — top padding on mobile for header */}
      <main className="md:ml-64 pb-20 md:pb-0 pt-14 md:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <Navbar variant="bottom" />
    </div>
  )
}
