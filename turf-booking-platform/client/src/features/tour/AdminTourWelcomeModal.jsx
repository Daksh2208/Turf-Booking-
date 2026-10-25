import React, { useEffect } from 'react'
import { Sparkles, Compass, CheckCircle2, X } from 'lucide-react'

/**
 * AdminTourWelcomeModal
 * 
 * Displayed automatically on first admin login when `localStorage.getItem("webTourPrompted") !== "true"`.
 * Allows the admin to start the interactive tour or skip it.
 */
export const AdminTourWelcomeModal = ({ isOpen, onStart, onSkip }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onSkip()
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onSkip])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-welcome-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-[#17231B]/50 backdrop-blur-xs transition-opacity"
        onClick={onSkip}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#D7E0D9] shadow-2xl text-[#17231B] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Top Decorative Banner */}
        <div className="bg-gradient-to-r from-[#E7F3E9] via-[#F0F6F1] to-[#E7F3E9] border-b border-[#C9DFCE] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shadow-xs">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] tracking-wider uppercase font-bold text-[#1D6537] bg-[#E7F3E9] px-2 py-0.5 rounded-md border border-[#C9DFCE] inline-block mb-0.5">
                Onboarding Guide
              </span>
              <h2 id="tour-welcome-title" className="text-lg font-black tracking-tight text-[#17231B]">
                Welcome to Your Admin Panel! 👋
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="p-1.5 rounded-xl text-[#526258] hover:text-[#17231B] hover:bg-white/80 transition-colors cursor-pointer"
            aria-label="Close welcome modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#46564A] leading-relaxed">
            Let's take a quick tour to help you discover the important features of your Turf Booking Platform and learn how to manage everything easily.
          </p>

          {/* Quick Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9]">
              <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#17231B] block">Real-Time Tracker</span>
                <span className="text-[11px] text-[#526258] leading-tight">Live bookings, revenue & occupancy</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9]">
              <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#17231B] block">Arenas & Pricing</span>
                <span className="text-[11px] text-[#526258] leading-tight">Base, peak & weekend hourly rates</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9]">
              <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#17231B] block">Desk & Card Payments</span>
                <span className="text-[11px] text-[#526258] leading-tight">Record on-site Pay at Venue receipts</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9]">
              <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#17231B] block">Slots & Policies</span>
                <span className="text-[11px] text-[#526258] leading-tight">Block maintenance slots & set GST</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] text-[11px] text-[#1D6537] flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-[#267A45]" />
            <span>Interactive 1-minute walkthrough. You can replay it anytime from the header.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#F6F8F6] border-t border-[#E2E8E3]">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#526258] hover:text-[#17231B] hover:bg-white border border-transparent hover:border-[#D7E0D9] transition-all cursor-pointer"
          >
            Skip Tour
          </button>

          <button
            type="button"
            onClick={onStart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#267A45] hover:bg-[#1E6338] shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Start Tour</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminTourWelcomeModal
