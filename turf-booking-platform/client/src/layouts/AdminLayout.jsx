import React, { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  Settings,
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
  Tag,
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
  { name: 'Coupons', path: '/admin/coupons', icon: Tag },
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
    <div className="min-h-screen bg-[#F6F8F6] text-[#17231B] flex flex-col md:flex-row font-sans selection:bg-[#267A45] selection:text-white">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#D7E0D9] sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-[#17231B] block">
              TURF<span className="text-[#267A45]">SPOT</span>
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#267A45]">
              Admin Portal
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-[#46564A] hover:text-[#17231B] hover:bg-[#F0F6F1] focus:outline-none cursor-pointer"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Desktop */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen max-h-screen w-64 bg-white border-r border-[#D7E0D9] flex flex-col justify-between z-50 transition-transform duration-200 overflow-hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Scrollable Upper Area (Logo + Navigation Items) */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 pb-5 border-b border-[#E2E8E3] shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shadow-xs shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-[#17231B] block">
                TURF<span className="text-[#267A45]">SPOT</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase font-bold text-[#1D6537] bg-[#E7F3E9] px-2 py-0.5 rounded-md border border-[#C9DFCE] inline-block">
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-4 space-y-1" aria-label="Admin Sections">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#526258] px-3 pb-1.5">
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
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE] shadow-xs'
                        : 'text-[#46564A] hover:text-[#17231B] hover:bg-[#F0F6F1] border border-transparent'
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
        <div className="p-3 border-t border-[#E2E8E3] bg-[#F6F8F6] shrink-0">
          {/* Admin Profile Row */}
          <div className="flex items-center gap-2.5 mb-2.5 p-2 rounded-xl bg-white border border-[#D7E0D9]">
            <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shrink-0 font-black text-xs shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#17231B] truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-[#526258] truncate">{user?.email}</p>
            </div>
          </div>

          {/* Action Row: Settings & Sign Out */}
          <div className="grid grid-cols-2 gap-2">
            <NavLink
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E7F3E9] text-[#1D6537] border-[#C9DFCE]'
                    : 'text-[#46564A] hover:text-[#17231B] hover:bg-[#F0F6F1] bg-white border-[#D7E0D9]'
                }`
              }
              title="Account Settings & Session"
            >
              <Settings className="w-3.5 h-3.5 text-[#267A45]" />
              <span>Settings</span>
            </NavLink>

            <button
              type="button"
              onClick={logout}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#922B27] hover:bg-[#FDF0EF] bg-white border border-[#F8D2CE] transition-colors cursor-pointer"
              title="Sign Out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5 text-[#922B27]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Desktop Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white border-b border-[#E2E8E3] sticky top-0 z-30 shadow-2xs">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#526258]">
            <span className="font-medium">Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#647168]" />
            <span className="font-semibold text-[#267A45]">{currentNav.name}</span>
          </div>
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
