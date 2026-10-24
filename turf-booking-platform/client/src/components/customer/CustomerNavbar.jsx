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
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand Logo & Name */}
          <Link
            to="/"
            className="flex items-center gap-3 group shrink-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/20 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block leading-none">
                TURF<span className="text-emerald-400">SPOT</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-500">
                Arena Platform
              </span>
            </div>
          </Link>

          {/* Center Quick Search (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center flex-1 max-w-md mx-4 relative"
          >
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by arena name, city, or area..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full bg-slate-900/90 text-xs text-white placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-full border border-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold">
            <Link
              to={isAuthenticated ? '/turfs' : '/register'}
              state={{ from: '/turfs' }}
              className={`flex items-center gap-1.5 transition-colors ${
                isCurrent('/turfs')
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Explore Turfs</span>
            </Link>
            {isAuthenticated && (
              <Link
                to="/my-bookings"
                className={`flex items-center gap-1.5 transition-colors ${
                  isCurrent('/my-bookings')
                    ? 'text-emerald-400 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>My Bookings</span>
              </Link>
            )}
            <a
              href="/#sports"
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <Layers className="w-4 h-4 text-slate-400" />
              <span>Sports</span>
            </a>
            <a
              href="/#how-it-works"
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>How It Works</span>
            </a>
          </nav>

          {/* Desktop Auth State / Actions */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-200 font-medium max-w-[120px] truncate">
                    {user?.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {user?.role}
                  </span>
                </div>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-500/20 transition-all inline-flex items-center gap-1.5"
                    title="Open Admin Console"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </Link>
                )}

                <Link
                  to="/settings"
                  className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
                  title="Account Settings"
                >
                  <Settings className="w-4 h-4 text-emerald-400" />
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all inline-flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  aria-label="Create Account"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-400/20 transition-all inline-flex items-center gap-1.5 font-bold"
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
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search turfs or areas..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full bg-slate-900 text-xs text-white placeholder-slate-500 pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </form>

          <nav className="flex flex-col gap-2 pt-2 text-sm font-semibold">
            <Link
              to={isAuthenticated ? '/turfs' : '/register'}
              state={{ from: '/turfs' }}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-900 text-slate-200 hover:text-white flex items-center gap-2.5"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Explore Turfs</span>
            </Link>
            {isAuthenticated && (
              <Link
                to="/my-bookings"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-900 text-slate-200 hover:text-white flex items-center gap-2.5"
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>My Bookings</span>
              </Link>
            )}
            <a
              href="/#sports"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-900 text-slate-200 hover:text-white flex items-center gap-2.5"
            >
              <Layers className="w-4 h-4 text-slate-400" />
              <span>Sports Categories</span>
            </a>
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-900 text-slate-200 hover:text-white flex items-center gap-2.5"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>How It Works</span>
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium text-white">{user?.name}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {user?.role}
                  </span>
                </div>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Console</span>
                  </Link>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-center text-slate-200 bg-slate-900 border border-slate-800 flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-center text-rose-300 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center gap-1.5"
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
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-center text-white bg-slate-900 border border-slate-800"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  aria-label="Create Account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-center text-slate-950 bg-emerald-400"
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
