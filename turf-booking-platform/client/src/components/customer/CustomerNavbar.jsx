import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Trophy,
  Search,
  Menu,
  X,
  UserCheck,
  ShieldCheck,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Compass,
  Layers,
  HelpCircle,
  Calendar,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export const CustomerNavbar = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navSearch, setNavSearch] = useState('')

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (navSearch.trim()) {
      if (!isAuthenticated) {
        navigate('/register', { state: { from: `/turfs?search=${encodeURIComponent(navSearch.trim())}` } })
      } else {
        navigate(`/turfs?search=${encodeURIComponent(navSearch.trim())}`)
      }
      setNavSearch('')
      setMobileMenuOpen(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setMobileMenuOpen(false)
  }

  const isCurrent = (path) => location.pathname === path

  return (
    <header className="border-b border-[#E2E8E3] bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand Logo & Name */}
          <Link
            to="/"
            className="flex items-center gap-3 group shrink-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shadow-xs group-hover:scale-105 transition-all">
              <Trophy className="w-5 h-5 text-[#267A45]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-[#17231B] block leading-none">
                TURF<span className="text-[#267A45]">SPOT</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-[#526258]">
                Sports Hub
              </span>
            </div>
          </Link>

          {/* Center Quick Search (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center flex-1 max-w-md mx-4 relative"
          >
            <Search className="w-4 h-4 text-[#647168] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by arena name, city, or area..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full bg-[#F6F8F6] text-xs text-[#17231B] placeholder-[#647168] pl-10 pr-4 py-2.5 rounded-full border border-[#D7E0D9] focus:outline-none focus:border-[#267A45] focus:bg-white focus:ring-1 focus:ring-[#267A45] transition-all"
            />
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold">
            <Link
              to={isAuthenticated ? '/turfs' : '/register'}
              state={{ from: '/turfs' }}
              className={`flex items-center gap-1.5 transition-colors ${
                isCurrent('/turfs')
                  ? 'text-[#267A45] font-bold'
                  : 'text-[#46564A] hover:text-[#17231B]'
              }`}
            >
              <Compass className="w-4 h-4 text-[#267A45]" />
              <span>Explore Turfs</span>
            </Link>
            {isAuthenticated && (
              <Link
                to="/my-bookings"
                className={`flex items-center gap-1.5 transition-colors ${
                  isCurrent('/my-bookings')
                    ? 'text-[#267A45] font-bold'
                    : 'text-[#46564A] hover:text-[#17231B]'
                }`}
              >
                <Calendar className="w-4 h-4 text-[#267A45]" />
                <span>My Bookings</span>
              </Link>
            )}
            <a
              href="/#sports"
              className="flex items-center gap-1.5 text-[#46564A] hover:text-[#17231B] transition-colors"
            >
              <Layers className="w-4 h-4 text-[#526258]" />
              <span>Sports</span>
            </a>
            <a
              href="/#how-it-works"
              className="flex items-center gap-1.5 text-[#46564A] hover:text-[#17231B] transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-[#526258]" />
              <span>How It Works</span>
            </a>
          </nav>

          {/* Desktop Auth State / Actions */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] text-xs">
                  <UserCheck className="w-4 h-4 text-[#267A45]" />
                  <span className="text-[#17231B] font-semibold max-w-[120px] truncate">
                    {user?.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
                    {user?.role}
                  </span>
                </div>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#267A45] hover:bg-[#1E6338] shadow-xs transition-all inline-flex items-center gap-1.5"
                    title="Open Admin Console"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </Link>
                )}

                <Link
                  to="/settings"
                  className="p-2 rounded-xl text-[#46564A] hover:text-[#17231B] bg-white hover:bg-[#F0F6F1] border border-[#D7E0D9] transition-colors"
                  title="Account Settings"
                >
                  <Settings className="w-4 h-4 text-[#267A45]" />
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-[#922B27] hover:bg-[#FDF0EF] bg-white border border-[#F8D2CE] transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  aria-label="Sign In"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#17231B] hover:bg-[#F0F6F1] bg-white border border-[#D7E0D9] transition-all inline-flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#267A45]" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  aria-label="Create Account"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#267A45] hover:bg-[#1E6338] shadow-xs transition-all inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white border border-[#D7E0D9] text-[#17231B] hover:bg-[#F0F6F1] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[#E2E8E3] bg-white px-4 pt-3 pb-6 space-y-4 shadow-lg">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-[#647168] absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search turfs or areas..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full bg-[#F6F8F6] text-xs text-[#17231B] placeholder-[#647168] pl-9 pr-3 py-2.5 rounded-xl border border-[#D7E0D9] focus:outline-none focus:border-[#267A45]"
            />
          </form>

          <nav className="flex flex-col gap-1.5 pt-1 text-sm font-semibold">
            <Link
              to={isAuthenticated ? '/turfs' : '/register'}
              state={{ from: '/turfs' }}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#F0F6F1] text-[#17231B] flex items-center gap-2.5"
            >
              <Compass className="w-4 h-4 text-[#267A45]" />
              <span>Explore Turfs</span>
            </Link>
            {isAuthenticated && (
              <Link
                to="/my-bookings"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-[#F0F6F1] text-[#17231B] flex items-center gap-2.5"
              >
                <Calendar className="w-4 h-4 text-[#267A45]" />
                <span>My Bookings</span>
              </Link>
            )}
            <a
              href="/#sports"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#F0F6F1] text-[#17231B] flex items-center gap-2.5"
            >
              <Layers className="w-4 h-4 text-[#526258]" />
              <span>Sports Categories</span>
            </a>
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#F0F6F1] text-[#17231B] flex items-center gap-2.5"
            >
              <HelpCircle className="w-4 h-4 text-[#526258]" />
              <span>How It Works</span>
            </a>
          </nav>

          <div className="pt-3 border-t border-[#E2E8E3] space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#267A45]" />
                    <span className="font-semibold text-[#17231B]">{user?.name}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
                    {user?.role}
                  </span>
                </div>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#267A45] hover:bg-[#1E6338] flex items-center justify-center gap-2 shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Console</span>
                  </Link>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-center text-[#17231B] bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1] flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#267A45]" />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-center text-[#922B27] bg-[#FDF0EF] border border-[#F8D2CE] hover:bg-[#FBE4E2] flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  aria-label="Sign In"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-center text-[#17231B] bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  aria-label="Create Account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-center text-white bg-[#267A45] hover:bg-[#1E6338]"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default CustomerNavbar
