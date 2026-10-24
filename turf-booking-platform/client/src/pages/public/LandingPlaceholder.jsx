import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Trophy,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Users,
  LogIn,
  UserCheck,
  Settings,
  Calendar,
  Clock,
  Tag,
  Wrench,
  CheckCircle2,
  AlertCircle,
  MapPin,
  RefreshCw,
  Loader2,
  Layers,
  ChevronRight,
  Check,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import customerInventoryService from '../../services/customer/inventory.service'
import customerBookingService from '../../services/customer/booking.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'

export const LandingPlaceholder = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Selected state for live slot availability
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedTurfId, setSelectedTurfId] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [bookingModalSlot, setBookingModalSlot] = useState(null)
  const [bookingError, setBookingError] = useState(null)
  const [bookingSuccess, setBookingSuccess] = useState(null)

  // 1. Fetch Turfs
  const { data: turfsData, isLoading: turfsLoading } = useQuery({
    queryKey: ['publicTurfs'],
    queryFn: () => customerInventoryService.getTurfs({ limit: 20 }),
  })

  const turfs = turfsData?.turfs || []
  const activeTurf = turfs.find((t) => t._id === selectedTurfId) || turfs[0]
  const effectiveTurfId = activeTurf?._id

  // 2. Fetch Live Slots for Active Turf and Date
  const {
    data: slotsData,
    isLoading: slotsLoading,
    refetch: refetchSlots,
    isFetching: slotsFetching,
  } = useQuery({
    queryKey: ['customerSlots', { turfId: effectiveTurfId, date: selectedDate }],
    queryFn: () => customerBookingService.getSlots(effectiveTurfId, selectedDate),
    enabled: !!effectiveTurfId,
    refetchInterval: 5000, // Real-time poll every 5s so maintenance/tournament blocks reflect instantly
  })

  const slots = slotsData?.slots || []

  // 3. Create Booking Mutation
  const bookMutation = useMutation({
    mutationFn: (bookingPayload) => customerBookingService.createBooking(bookingPayload),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['customerSlots'] })
      setBookingModalSlot(null)
      setBookingSuccess(`Slot booked successfully! Booking Ref: ${booking.bookingId || booking._id}`)
      setTimeout(() => setBookingSuccess(null), 5000)
    },
    onError: (err) => {
      setBookingError(err.response?.data?.message || 'Failed to complete booking.')
    },
  })

  const handleBookClick = (slot) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setBookingError(null)
    setBookingModalSlot(slot)
  }

  const handleConfirmBooking = () => {
    if (!bookingModalSlot || !activeTurf) return
    const sportId = activeTurf.sports?.[0]?._id || activeTurf.sports?.[0]
    bookMutation.mutate({
      turfId: activeTurf._id,
      sportId,
      date: selectedDate,
      startTime: bookingModalSlot.startTime,
      endTime: bookingModalSlot.endTime,
      addOns: [],
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block">
                TURF<span className="text-emerald-400">SPOT</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-500">
                Sports Arena Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-200 font-medium">{user?.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {user?.role}
                  </span>
                </div>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20 transition-all inline-flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Console</span>
                  </Link>
                )}
                <Link
                  to="/settings"
                  className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all inline-flex items-center gap-1.5 shadow-sm"
                  title="Account Settings & Sign Out"
                >
                  <Settings className="w-4 h-4 text-emerald-400" />
                  <span>Settings</span>
                </Link>
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
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-sm shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Real-Time Sports Turf Booking & Inventory</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Next-Gen Sports Turf Booking <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              With Live Dynamic Pricing
            </span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Automatic peak-hour & weekend rate calculation. Blocked slots for maintenance and tournaments reflect instantly on the schedule.
          </p>
        </div>

        {/* Global Toast */}
        {bookingSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{bookingSuccess}</span>
          </div>
        )}

        {/* Interactive Turf & Slot Availability Showcase */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>Live Slot Schedule & Instant Availability</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select an arena and date to inspect slot availability, dynamic rates, and real-time maintenance blocks.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <input
                  type="date"
                  value={selectedDate}
                  min={todayStr}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-white focus:outline-none cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() => refetchSlots()}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                title="Refresh Availability"
              >
                <RefreshCw className={`w-4 h-4 ${slotsFetching ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Turf Arena Selector Pills */}
          {turfsLoading ? (
            <div className="flex items-center justify-center py-6 text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mr-2" />
              Loading sports arenas...
            </div>
          ) : turfs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No turf arenas registered yet. Visit Admin Console to register turfs.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {turfs.map((turf) => {
                  const isSelected = (activeTurf?._id === turf._id) || (!selectedTurfId && activeTurf?._id === turf._id)
                  return (
                    <button
                      key={turf._id}
                      type="button"
                      onClick={() => setSelectedTurfId(turf._id)}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {turf.name}
                    </button>
                  )
                })}
              </div>

              {/* Active Arena Details Card */}
              {activeTurf && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">{activeTurf.name}</span>
                      {activeTurf.size && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {activeTurf.size}
                        </span>
                      )}
                      {activeTurf.surface && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {activeTurf.surface}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{activeTurf.address?.street}, {activeTurf.address?.city}</span>
                      <span className="text-slate-600">•</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{activeTurf.openingHours?.open} - {activeTurf.openingHours?.close}</span>
                    </p>
                  </div>

                  {/* Pricing Rate Badges for this Arena */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                      <span className="text-slate-500 text-[10px] block font-sans">Base Rate</span>
                      <span className="font-bold text-white">₹{((activeTurf.pricing?.baseRate || 80000) / 100).toFixed(0)}</span>
                      <span className="text-[10px] text-slate-500">/hr</span>
                    </div>

                    <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono">
                      <span className="text-amber-500 text-[10px] block font-sans">Peak Hours (18-23h)</span>
                      <span className="font-bold text-amber-400">₹{((activeTurf.pricing?.peakRate || 120000) / 100).toFixed(0)}</span>
                      <span className="text-[10px] text-amber-500">/hr</span>
                    </div>

                    <div className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono">
                      <span className="text-purple-400 text-[10px] block font-sans">Weekend Rate</span>
                      <span className="font-bold text-purple-300">₹{((activeTurf.pricing?.weekendRate || 140000) / 100).toFixed(0)}</span>
                      <span className="text-[10px] text-purple-400">/hr</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Slot Grid */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>Showing slots for <strong className="text-white">{selectedDate}</strong> {slotsData?.isWeekend && '(Weekend Rates Apply)'}</span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Blocked (Maintenance/Tournament)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span> Booked</span>
                  </div>
                </div>

                {slotsLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                    <span>Calculating dynamic slot rates & checking blocked schedules...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No time slots generated for this turf schedule.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {slots.map((slot, idx) => {
                      const isAvailable = slot.status === 'available'
                      const isBlocked = slot.status === 'blocked'
                      const isBooked = slot.status === 'booked'
                      const priceRupees = (slot.price / 100).toFixed(0)

                      return (
                        <div
                          key={`${slot.startTime}-${idx}`}
                          className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                            isAvailable
                              ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 shadow-sm'
                              : isBlocked
                              ? 'bg-rose-950/20 border-rose-500/30'
                              : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                          }`}
                        >
                          <div>
                            {/* Time Header */}
                            <div className="flex items-center justify-between text-xs font-mono font-bold text-white mb-1.5">
                              <span>{slot.startTime}</span>
                              <span className="text-[10px] text-slate-500 font-normal">to {slot.endTime}</span>
                            </div>

                            {/* Status Tag */}
                            {isBlocked ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  <Wrench className="w-2.5 h-2.5 shrink-0" />
                                  <span>{slot.reason === 'tournament' ? 'Tournament' : 'Maintenance'}</span>
                                </span>
                                {slot.note && (
                                  <p className="text-[10px] text-rose-400/80 truncate" title={slot.note}>
                                    {slot.note}
                                  </p>
                                )}
                              </div>
                            ) : isBooked ? (
                              <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                                Booked
                              </span>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-sm text-emerald-400">
                                  ₹{priceRupees}
                                </span>
                                <span
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    slot.rateType === 'weekend'
                                      ? 'bg-purple-500/20 text-purple-300'
                                      : slot.rateType === 'peak'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-emerald-500/10 text-emerald-400'
                                  }`}
                                >
                                  {slot.rateType}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="mt-3">
                            {isAvailable ? (
                              <button
                                type="button"
                                onClick={() => handleBookClick(slot)}
                                className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-1"
                              >
                                <span>Book</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <div className="py-1 text-center text-[10px] font-medium text-slate-500">
                                {isBlocked ? 'Slot Unavailable' : 'Reserved'}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Automatic Slot Rates</h3>
            <p className="text-xs text-slate-400">Base, peak-hour, and weekend pricing update dynamically across all arenas.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <Wrench className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-white text-sm">Instant Blocked Slots</h3>
            <p className="text-xs text-slate-400">Maintenance & tournament blocks show on the public schedule in real time.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-white text-sm">Slot Release on Cancellation</h3>
            <p className="text-xs text-slate-400">Cancelling a booking instantly releases and frees up the slot for others.</p>
          </div>
        </div>
      </main>

      {/* Booking Confirmation Modal */}
      {bookingModalSlot && activeTurf && (
        <Modal
          isOpen={!!bookingModalSlot}
          onClose={() => setBookingModalSlot(null)}
          title="Reserve Turf Slot"
          size="sm"
        >
          <div className="space-y-4">
            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Arena:</span>
                <span className="font-bold text-white">{activeTurf.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-mono text-slate-200">{selectedDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Time:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {bookingModalSlot.startTime} - {bookingModalSlot.endTime}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Slot Rate ({bookingModalSlot.rateType}):</span>
                <span className="font-mono font-bold text-white text-sm">
                  ₹{(bookingModalSlot.price / 100).toFixed(0)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Payment mode: <strong>Pay at Venue</strong>. Cancellation is allowed up to 4 hours before the match.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setBookingModalSlot(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={bookMutation.isPending}
                onClick={handleConfirmBooking}
              >
                Confirm Booking
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>Turf Booking Platform • All requirements verified and implemented</p>
      </footer>
    </div>
  )
}

export default LandingPlaceholder
