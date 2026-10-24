import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Trophy,
  ArrowLeft,
  User,
  Mail,
  Shield,
  ShieldCheck,
  LogOut,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Home,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export const UserSettingsPage = () => {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Logout error:', err)
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm group-hover:scale-105 transition-transform">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-white block">
                TURF<span className="text-emerald-400">SPOT</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                Account Settings
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin/sports"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Console</span>
              </Link>
            )}
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all shadow-sm"
              title="Return to Home"
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 space-y-6">
        {/* Header Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Manage your personal profile, credentials, and active session.
          </p>
        </div>

        {/* Profile Card */}
        <div className="p-6 sm:p-7 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl font-black shadow-inner shadow-emerald-500/10">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{user?.name || 'User Profile'}</h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {user?.role || 'Customer'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl self-start sm:self-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-semibold">Active Account</span>
            </div>
          </div>

          {/* User Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Full Name
              </span>
              <p className="text-sm font-semibold text-slate-100">{user?.name || 'Not configured'}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                Email Address
              </span>
              <p className="text-sm font-semibold text-slate-100">{user?.email || 'Not configured'}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Account Role
              </span>
              <p className="text-sm font-semibold text-emerald-400 capitalize">
                {user?.role || 'Customer'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Session Security
              </span>
              <p className="text-sm font-semibold text-slate-200">HttpOnly Token Protected</p>
            </div>
          </div>
        </div>

        {/* Admin Quick Action Card (shown only if admin) */}
        {isAdmin && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Administrator Management</h3>
              </div>
              <p className="text-xs text-slate-400">
                You have elevated privileges to configure sports, turfs, add-ons, banners, and business settings.
              </p>
            </div>
            <Link
              to="/admin/sports"
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <span>Open Admin Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Session Management & Sign Out Section */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-400" />
              Session & Logout
            </h3>
            <p className="text-xs text-slate-400">
              Sign out of this session. You will need your email and password to log back in.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-rose-200">Current Active Session</p>
              <p className="text-[11px] text-rose-300/70">
                Connected from current browser. Revokes the active refresh token.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-950/40 shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default UserSettingsPage
