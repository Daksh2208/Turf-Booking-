import React, { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Trophy,
  Activity,
  MapPin,
  Sparkles,
  Image,
  Sliders,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
  Settings,
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Customers', path: '/admin/customers', icon: Users },
  { name: 'Bookings', path: '/admin/bookings', icon: Calendar },
  { name: 'Blocked Slots', path: '/admin/blocked-slots', icon: Clock },
  { name: 'Turf Arenas', path: '/admin/turfs', icon: MapPin },
  { name: 'Sports', path: '/admin/sports', icon: Activity },
  { name: 'Add-Ons', path: '/admin/addons', icon: Sparkles },
  { name: 'Homepage Banners', path: '/admin/banners', icon: Image },
  { name: 'Business Settings', path: '/admin/settings', icon: Sliders },
]

export const AdminLayout = () => {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Extract current section from path for breadcrumb
  const currentNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path)) || {
    name: 'Dashboard',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-white block">
              TURF<span className="text-emerald-400">SPOT</span>
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400">
              Admin Portal
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none cursor-pointer"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Desktop */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900/95 border-r border-slate-800/80 flex flex-col justify-between z-50 transition-transform duration-200 backdrop-blur-md ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 flex-1 flex flex-col">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block">
                TURF<span className="text-emerald-400">SPOT</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block">
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1.5 flex-1" aria-label="Admin Sections">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
              Inventory & Operations
            </p>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Admin User Profile, Settings & Sign Out Bottom Bar */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 backdrop-blur-sm">
          {/* Admin Profile Row */}
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 font-black text-xs shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Action Row: Settings & Sign Out */}
          <div className="grid grid-cols-2 gap-2">
            <NavLink
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800/90'
                }`
              }
              title="Account Settings & Session"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span>Settings</span>
            </NavLink>

            <button
              type="button"
              onClick={logout}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer"
              title="Sign Out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Desktop Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-slate-900/60 border-b border-slate-800/80 sticky top-0 z-30 backdrop-blur-md">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-emerald-400">{currentNav.name}</span>
          </div>

          {/* Single Home Action Button */}
          <Link
            to="/"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all cursor-pointer shadow-sm group"
            title="Return to customer landing page"
          >
            <Home className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Home</span>
          </Link>
        </header>

        {/* Page Container */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
