import React from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Zap, Shield, Sparkles, ArrowLeft } from 'lucide-react'

/**
 * Modern sports-tech AuthLayout featuring turf highlight showcase alongside auth forms
 */
export const AuthLayout = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-screen bg-[#F6F8F6] text-[#17231B] flex items-center justify-center relative selection:bg-[#267A45] selection:text-white p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid lg:grid-cols-12 bg-white border border-[#D7E0D9] rounded-3xl shadow-sm overflow-hidden">
          {/* Left Column: Sports Experience Showcase (Desktop only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-7 bg-[#EDF5EF] border-r border-[#D7E0D9] relative">
            {/* Top brand header */}
            <div className="space-y-4">
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shadow-xs group-hover:scale-105 transition-transform">
                  <Trophy className="w-4 h-4 text-[#267A45]" />
                </div>
                <div>
                  <span className="text-lg font-black tracking-tight text-[#17231B] block leading-none">
                    TURF<span className="text-[#267A45]">SPOT</span>
                  </span>
                  <span className="text-[9px] tracking-widest uppercase font-semibold text-[#526258]">
                    Sports Booking Hub
                  </span>
                </div>
              </Link>

              <div className="space-y-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
                  <Sparkles className="w-3 h-3 text-[#267A45]" />
                  <span>Instant Slot Reservations</span>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight text-[#17231B] leading-tight">
                  Your Game. <br />
                  <span className="text-[#267A45]">
                    Your Ground.
                  </span>
                </h2>

                <p className="text-[#526258] text-xs leading-relaxed">
                  Book verified premium turfs across Box Cricket, Football, Pickleball, and Badminton with live pricing and slot transparency.
                </p>
              </div>
            </div>

            {/* Feature Badges */}
            <div className="space-y-2.5 my-4">
              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white border border-[#D7E0D9] text-xs shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] flex items-center justify-center text-[#267A45] shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-[#17231B] text-xs">100% Live Availability</p>
                  <p className="text-[#526258] text-[10px]">Real-time slot engine backed by MongoDB</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white border border-[#D7E0D9] text-xs shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] flex items-center justify-center text-[#267A45] shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-[#17231B] text-xs">Zero Double-Booking</p>
                  <p className="text-[#526258] text-[10px]">Atomic inventory reservations</p>
                </div>
              </div>
            </div>

            {/* Supported Sports Strip */}
            <div className="pt-3 border-t border-[#D7E0D9]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#526258] mb-1.5">
                Supported Sports
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Box Cricket', 'Football', 'Pickleball', 'Badminton'].map((sport) => (
                  <span
                    key={sport}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-white text-[#46564A] border border-[#D7E0D9] font-medium"
                  >
                    {sport}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Form Container */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center bg-white">
            {/* Mobile Brand Header */}
            <div className="lg:hidden flex items-center justify-between mb-5 pb-3 border-b border-[#E2E8E3]">
              <Link to="/" className="inline-flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <span className="text-base font-black tracking-tight text-[#17231B]">
                  TURF<span className="text-[#267A45]">SPOT</span>
                </span>
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1D6537] bg-[#E7F3E9] px-2.5 py-1 rounded-full border border-[#C9DFCE]"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Home</span>
              </Link>
            </div>

            {/* Form Title & Subtitle */}
            <div className="space-y-1 mb-5">
              <h1 className="text-2xl font-black tracking-tight text-[#17231B]">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-[#526258] leading-relaxed">
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
