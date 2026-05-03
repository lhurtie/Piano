import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar (desktop) */}
      <Navbar variant="sidebar" />

      {/* Main content */}
      <main className="md:ml-64 pb-20 md:pb-0 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <Navbar variant="bottom" />
    </div>
  )
}
