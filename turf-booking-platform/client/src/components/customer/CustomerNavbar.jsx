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
  Heart,
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
      navigate(`/turfs?search=${encodeURIComponent(navSearch.trim())}`)
      setNavSearch('')
      setMobileMenuOpen(false)
    }
  }

  const handleSectionNav = (sectionId, e) => {
    e?.preventDefault()
    setMobileMenuOpen(false)
    if (location.pathname === '/') {
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        window.history.replaceState(null, '', `#${sectionId}`)
      }
    } else {
      navigate(`/#${sectionId}`)
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
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3 lg:gap-4">
          {/* Brand Logo & Name */}
          <Link
            to={user?.role === 'admin' ? '/admin/dashboard' : '/'}
            className="flex items-center gap-2.5 sm:gap-3 group shrink-0"
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

          {/* Center Quick Search (Desktop) - Always active in Navbar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-sm xl:max-w-md mx-2 lg:mx-4 relative"
          >
            <Search className="w-4 h-4 text-[#267A45] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search turfs, areas, or sports..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full bg-[#F6F8F6] hover:bg-[#EEF2EF] text-xs text-[#17231B] placeholder-[#647168] pl-10 pr-24 py-2.5 rounded-full border border-[#D7E0D9] focus:outline-none focus:border-[#267A45] focus:bg-white focus:ring-2 focus:ring-[#267A45]/20 transition-all shadow-2xs"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              {navSearch && (
                <button
                  type="button"
                  onClick={() => setNavSearch('')}
                  className="p-1 text-[#647168] hover:text-[#17231B] rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                type="submit"
                aria-label="Find Turfs"
                className="px-2.5 py-1 rounded-full bg-[#267A45] hover:bg-[#1E6338] text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <span>Find Turfs</span>
              </button>
            </div>
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-semibold">
            <button
              type="button"
              onClick={(e) => handleSectionNav('arenas', e)}
              className="flex items-center gap-1.5 text-[#46564A] hover:text-[#267A45] transition-colors cursor-pointer bg-transparent border-none p-0 font-semibold"
            >
              <Compass className="w-4 h-4 text-[#267A45]" />
              <span>Arena Turfs</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSectionNav('sports', e)}
              className="flex items-center gap-1.5 text-[#46564A] hover:text-[#267A45] transition-colors cursor-pointer bg-transparent border-none p-0 font-semibold"
            >
              <Layers className="w-4 h-4 text-[#526258]" />
              <span>Sports</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSectionNav('how-it-works', e)}
              className="flex items-center gap-1.5 text-[#46564A] hover:text-[#267A45] transition-colors cursor-pointer bg-transparent border-none p-0 font-semibold"
            >
              <HelpCircle className="w-4 h-4 text-[#526258]" />
              <span>How It Works</span>
            </button>
          </nav>

          {/* Desktop Auth State / Actions */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* My Bookings Dedicated Action Button for Customers */}
                {user?.role === 'customer' && (
                  <>
                    <Link
                      to="/my-bookings"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs ${
                        isCurrent('/my-bookings')
                          ? 'bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE] font-bold'
                          : 'bg-white hover:bg-[#F0F6F1] text-[#17231B] border border-[#D7E0D9] hover:border-[#267A45]'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#267A45]" />
                      <span>My Bookings</span>
                    </Link>
                    <Link
                      to="/favorites"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs ${
                        isCurrent('/favorites')
                          ? 'bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE] font-bold'
                          : 'bg-white hover:bg-[#F0F6F1] text-[#17231B] border border-[#D7E0D9] hover:border-[#267A45]'
                      }`}
                      title="Saved Favourite Turfs"
                    >
                      <Heart className="w-3.5 h-3.5 text-[#267A45]" />
                      <span>Favourites</span>
                    </Link>
                  </>
                )}

                {/* Admin Console Shortcut */}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#267A45] hover:bg-[#1E6338] shadow-xs transition-all inline-flex items-center gap-1.5"
                    title="Open Admin Console"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </Link>
                )}

                {/* User Profile Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] text-xs">
                  <div className="w-5 h-5 rounded-full bg-[#E7F3E9] text-[#1D6537] font-bold text-[10px] flex items-center justify-center shrink-0 border border-[#C9DFCE]">
                    {user?.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-[#17231B] font-semibold max-w-[100px] truncate">
                    {user?.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
                    {user?.role}
                  </span>
                </div>

                {/* Settings */}
                <Link
                  to="/settings"
                  className="p-2 rounded-xl text-[#46564A] hover:text-[#17231B] bg-white hover:bg-[#F0F6F1] border border-[#D7E0D9] transition-colors"
                  title="Account Settings"
                >
                  <Settings className="w-4 h-4 text-[#267A45]" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  aria-label="Sign In"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#17231B] hover:text-[#267A45] hover:bg-[#F0F6F1] bg-white border border-[#D7E0D9] transition-all inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#267A45]" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  aria-label="Create Account"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#267A45] hover:bg-[#1E6338] shadow-xs hover:shadow-sm transition-all inline-flex items-center gap-1.5"
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
              className="p-2 rounded-xl bg-white border border-[#D7E0D9] text-[#17231B] hover:bg-[#F0F6F1] transition-colors cursor-pointer"
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
          {/* Mobile Search - Prominent in Drawer */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-[#267A45] absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search turfs, areas, or sports..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full bg-[#F6F8F6] text-xs text-[#17231B] placeholder-[#647168] pl-9 pr-24 py-2.5 rounded-xl border border-[#D7E0D9] focus:outline-none focus:border-[#267A45]"
            />
            <button
              type="submit"
              aria-label="Find Turfs"
              className="absolute right-1.5 px-3 py-1 rounded-lg bg-[#267A45] hover:bg-[#1E6338] text-white text-xs font-bold transition-all cursor-pointer"
            >
              Find Turfs
            </button>
          </form>

          <nav className="flex flex-col gap-1.5 pt-1 text-sm font-semibold">
            <button
              type="button"
              onClick={(e) => handleSectionNav('arenas', e)}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F6F1] text-[#17231B] flex items-center gap-2.5 bg-transparent border-none cursor-pointer font-semibold"
            >
              <Compass className="w-4 h-4 text-[#267A45]" />
              <span>Arena Turfs</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSectionNav('sports', e)}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F6F1] text-[#17231B] flex items-center gap-2.5 bg-transparent border-none cursor-pointer font-semibold"
            >
              <Layers className="w-4 h-4 text-[#526258]" />
              <span>Sports Categories</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSectionNav('how-it-works', e)}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F6F1] text-[#17231B] flex items-center gap-2.5 bg-transparent border-none cursor-pointer font-semibold"
            >
              <HelpCircle className="w-4 h-4 text-[#526258]" />
              <span>How It Works</span>
            </button>

            {isAuthenticated && user?.role === 'customer' && (
              <>
                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-[#F0F6F1] text-[#17231B] flex items-center gap-2.5"
                >
                  <Calendar className="w-4 h-4 text-[#267A45]" />
                  <span>My Bookings</span>
                </Link>
                <Link
                  to="/favorites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-[#F0F6F1] text-[#17231B] flex items-center gap-2.5"
                >
                  <Heart className="w-4 h-4 text-[#267A45]" />
                  <span>Saved Favourites</span>
                </Link>
              </>
            )}
          </nav>

          <div className="pt-3 border-t border-[#E2E8E3] space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#E7F3E9] text-[#1D6537] font-bold text-xs flex items-center justify-center shrink-0 border border-[#C9DFCE]">
                      {user?.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
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

                <div className="pt-1">
                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-center text-[#17231B] bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1] flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#267A45]" />
                    <span>Account Settings</span>
                  </Link>
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
