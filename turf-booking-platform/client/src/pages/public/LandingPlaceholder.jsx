import React from 'react'
import { Link } from 'react-router-dom'
import { Trophy, ArrowRight, ShieldCheck, Zap, Users, LogIn, LogOut, UserCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export const LandingPlaceholder = () => {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-850 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block">
                TURF<span className="text-emerald-400">SPOT</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-500">
                Sports Arena
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-200 font-medium">{user?.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {user?.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors inline-flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-500/20 transition-all inline-flex items-center gap-1.5"
                >
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16 flex flex-col items-center justify-center text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Zap className="w-3.5 h-3.5" />
          <span>Part 4 — Secure JWT Authentication & UI Connected</span>
        </div>

        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Next-Generation <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Sports Turf Booking
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Reserve premium turf slots for Box Cricket, Football, Pickleball, and Badminton with live pricing, equipment add-ons, and instant booking status.
          </p>
        </div>

        {/* Authenticated banner or Action Buttons */}
        {isAuthenticated ? (
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 max-w-md w-full text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Welcome, {user?.name}!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Active Role: <strong className="text-emerald-400 capitalize">{user?.role}</strong> • Email: <span className="text-slate-300">{user?.email}</span>
              </p>
            </div>
            <p className="text-xs text-emerald-300/80 bg-emerald-500/10 py-2 px-3 rounded-xl border border-emerald-500/20">
              Authenticated via secure HttpOnly JWT cookies with automatic refresh-token rotation.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/login"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-transform active:scale-95 flex items-center gap-2"
            >
              <span>Sign In to Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              className="px-6 py-3 rounded-2xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 font-semibold transition-colors flex items-center gap-2"
            >
              <span>Create Account</span>
            </Link>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-8 text-left">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Live Availability</h3>
            <p className="text-xs text-slate-400">Available, Booked, and Blocked slot indicators synced with database.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-white text-sm">Admin Control</h3>
            <p className="text-xs text-slate-400">Manage turfs, dynamic peak rates, weekend charges, and facilities.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Player Checkout</h3>
            <p className="text-xs text-slate-400">Transparent breakdown with add-ons, GST, and Pay at Venue.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-850 py-6 text-center text-xs text-slate-500">
        <p>Turf Booking Platform • Modern MERN Architecture</p>
      </footer>
    </div>
  )
}

export default LandingPlaceholder
