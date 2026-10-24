import React from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Zap, Shield, Sparkles } from 'lucide-react'

/**
 * Modern sports-tech AuthLayout featuring turf highlight showcase alongside auth forms
 */
export const AuthLayout = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid lg:grid-cols-12 bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden">
          {/* Left Column: Sports Experience Showcase (Desktop only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-r border-slate-800/80 relative">
            {/* Top brand header */}
            <div className="space-y-6">
              <Link to="/" className="inline-flex items-center gap-3 group">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <span className="text-xl font-black tracking-tight text-white block">
                    TURF<span className="text-emerald-400">SPOT</span>
                  </span>
                  <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-400">
                    Sports Booking Hub
                  </span>
                </div>
              </Link>

              <div className="space-y-3 pt-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant Slot Reservations</span>
                </div>

                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Your Game. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                    Your Ground.
                  </span>
                </h2>

                <p className="text-slate-400 text-sm leading-relaxed">
                  Book verified premium turfs across Box Cricket, Football, Pickleball, and Badminton with live pricing and slot transparency.
                </p>
              </div>
            </div>

            {/* Feature Badges */}
            <div className="space-y-3.5 my-8">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200">100% Live Availability</p>
                  <p className="text-slate-400 text-[11px]">Real-time slot engine backed by MongoDB</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Zero Double-Booking</p>
                  <p className="text-slate-400 text-[11px]">Atomic inventory reservations</p>
                </div>
              </div>
            </div>

            {/* Supported Sports Strip */}
            <div className="pt-4 border-t border-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Supported Sports
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Box Cricket', 'Football', 'Pickleball', 'Badminton'].map((sport) => (
                  <span
                    key={sport}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/50"
                  >
                    {sport}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Form Container */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
            {/* Mobile Brand Header */}
            <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="text-lg font-black tracking-tight text-white">
                  TURF<span className="text-emerald-400">SPOT</span>
                </span>
              </Link>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
                Book Turf
              </span>
            </div>

            {/* Form Title & Subtitle */}
            <div className="space-y-1.5 mb-8">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-400 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Form Content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
