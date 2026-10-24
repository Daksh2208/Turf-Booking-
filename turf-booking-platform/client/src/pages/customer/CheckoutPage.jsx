import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  User,
  Mail,
  Phone,
  Sparkles,
  Info,
  Tag,
  Building2,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useApi'
import customerBookingService from '../../services/customer/booking.service'
import customerInventoryService from '../../services/customer/inventory.service'

export const CheckoutPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Retrieve checkout state passed from TurfDetailPage
  const checkoutState = location.state || {}
  const {
    turfId,
    turf: passedTurf,
    date,
    startTime,
    endTime,
    durationHours = 1,
    playerCount = 10,
    selectedAddOns = [],
  } = checkoutState

  // Persistent idempotency key for this checkout session to protect against duplicate submissions
  const idempotencyKeyRef = useRef(
    `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  )

  // Player Contact Details
  const [contactDetails, setContactDetails] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch full turf details if not completely passed
  const { data: turfData, isLoading: turfLoading } = useQuery({
    queryKey: ['checkoutTurf', turfId],
    queryFn: () => customerInventoryService.getTurfById(turfId),
    enabled: !!turfId && !passedTurf?.address,
  })

  const turf = passedTurf || turfData

  // 1. Authoritative Server-Side Pricing Quote
  const {
    data: quote,
    isLoading: quoteLoading,
    isError: quoteError,
    error: quoteErrObj,
  } = useQuery({
    queryKey: ['checkoutQuote', { turfId, date, startTime, endTime, playerCount, selectedAddOns }],
    queryFn: () =>
      customerBookingService.getPricingQuote({
        turfId,
        date,
        startTime,
        endTime,
        playerCount,
        addOns: selectedAddOns.map((item) => ({
          addOnId: item.addOnId,
          quantity: item.quantity,
        })),
      }),
    enabled: !!turfId && !!date && !!startTime && !!endTime,
  })

  // Format date helper
  const formattedDate = date
    ? new Date(date + 'T00:00:00Z').toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : ''

  const validateForm = () => {
    const errors = {}
    if (!contactDetails.name.trim()) {
      errors.name = 'Full name is required for booking'
    }
    if (!contactDetails.email.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactDetails.email)) {
      errors.email = 'Please enter a valid email address'
    }
    if (!contactDetails.phone.trim()) {
      errors.phone = 'Mobile contact number is required'
    } else if (!/^\+?[0-9]{10,14}$/.test(contactDetails.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'Please enter a valid 10-digit mobile number'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const bookingPayload = {
        turfId,
        sportId: turf?.sports?.[0]?._id || turf?.sports?.[0],
        date,
        startTime,
        endTime,
        playerCount,
        addOns: selectedAddOns.map((item) => ({
          addOnId: item.addOnId,
          quantity: item.quantity,
        })),
        contactDetails: {
          name: contactDetails.name.trim(),
          email: contactDetails.email.trim().toLowerCase(),
          phone: contactDetails.phone.trim(),
        },
        paymentMethod: 'Pay at Venue',
        idempotencyKey: idempotencyKeyRef.current,
      }

      const booking = await customerBookingService.createBooking(
        bookingPayload,
        idempotencyKeyRef.current
      )

      // Navigate to Booking Success Page
      navigate(`/bookings/success/${booking._id}`, {
        state: { booking },
        replace: true,
      })
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Unable to complete booking. Please choose another slot.'
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // If user entered without selecting a slot or turf
  if (!turfId || !date || !startTime || !endTime) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
          <Calendar className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
          No Match Slot Selected
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-8">
          To checkout, please select a sports turf arena, desired calendar date, and an available time slot first.
        </p>
        <Link
          to="/turfs"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Browse Available Turfs</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button and Page Title */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Turf Details</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure Checkout</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Review & Confirm Booking
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Complete your contact details and reserve your slot. No upfront card payment required.
        </p>
      </div>

      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Booking could not be confirmed</p>
            <p className="mt-0.5 text-rose-300">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Booking Info & Contact Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Turf & Slot Summary Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Arena & Time Slot</span>
            </h2>

            <div className="space-y-3 pt-1">
              <div>
                <h3 className="text-lg font-black text-white">{turf?.name || 'Selected Arena'}</h3>
                {turf?.address && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {turf.address.street}, {turf.address.city}, {turf.address.state}
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Date</span>
                    <span className="text-xs font-semibold text-white">{formattedDate}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Time Slot</span>
                    <span className="text-xs font-semibold text-white">
                      {startTime} - {endTime}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Squad Size</span>
                    <span className="text-xs font-semibold text-white">
                      {playerCount} Players (Max {turf?.capacity?.maxPlayers || 22})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Player Contact Details Form */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Player / Contact Information</span>
            </h2>
            <p className="text-xs text-slate-400">
              The booking reference and venue access pass will be issued under these contact details.
            </p>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={contactDetails.name}
                    onChange={(e) =>
                      setContactDetails({ ...contactDetails, name: e.target.value })
                    }
                    placeholder="Enter player/booker full name"
                    className={`w-full bg-slate-950 text-xs text-white placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                      fieldErrors.name
                        ? 'border-rose-500 ring-1 ring-rose-500'
                        : 'border-slate-800 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={contactDetails.email}
                    onChange={(e) =>
                      setContactDetails({ ...contactDetails, email: e.target.value })
                    }
                    placeholder="name@example.com"
                    className={`w-full bg-slate-950 text-xs text-white placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                      fieldErrors.email
                        ? 'border-rose-500 ring-1 ring-rose-500'
                        : 'border-slate-800 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contact Mobile Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={contactDetails.phone}
                    onChange={(e) =>
                      setContactDetails({ ...contactDetails, phone: e.target.value })
                    }
                    placeholder="e.g. 9876543210"
                    className={`w-full bg-slate-950 text-xs text-white placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                      fieldErrors.phone
                        ? 'border-rose-500 ring-1 ring-rose-500'
                        : 'border-slate-800 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method Selection: Pay at Venue */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Payment Option</span>
            </h2>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Pay at Venue</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Pay securely at the arena counter via Cash, UPI, or Card on arrival. Your booking is confirmed immediately without advance deduction.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authoritative Price Breakdown & Submit */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 sticky top-24 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>Price Breakdown</span>
              </h2>
              {quoteLoading && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span>Computing...</span>
                </div>
              )}
            </div>

            {quoteLoading ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-2" />
                <span>Fetching authoritative rates and taxes...</span>
              </div>
            ) : quote ? (
              <div className="space-y-4 text-xs">
                {/* Hourly Segments */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Turf Slot Charges
                  </span>
                  {quote.hourlySegments?.map((seg, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-300">
                      <div>
                        <span>
                          {seg.startTime} - {seg.endTime}
                        </span>
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 uppercase font-mono">
                          {seg.rateType}
                        </span>
                      </div>
                      <span className="font-mono text-white">
                        ₹{(seg.segmentPrice / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Selected Add-Ons */}
                {quote.addOns && quote.addOns.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      Add-Ons & Gear
                    </span>
                    {quote.addOns.map((addon, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-300">
                        <span>
                          {addon.name} × {addon.quantity}
                        </span>
                        <span className="font-mono text-white">
                          ₹{(addon.totalAmount / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotal & Taxes */}
                <div className="space-y-2 pt-3 border-t border-slate-800 text-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono text-white">
                      ₹{(quote.subtotal / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      {quote.tax?.taxName || 'GST'} ({quote.tax?.taxPercentage || 0}%)
                    </span>
                    <span className="font-mono text-white">
                      ₹{((quote.tax?.taxAmount || 0) / 100).toFixed(2)}
                    </span>
                  </div>

                  {/* Final Total Amount */}
                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-sm font-bold text-white block">Total Payable</span>
                      <span className="text-[10px] text-slate-500">Pay at venue reception</span>
                    </div>
                    <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                      ₹{(quote.finalTotal / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 text-[11px] text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Your slot will be reserved immediately upon clicking Confirm. Pricing snapshots are locked to protect against future price revisions.
                  </span>
                </div>

                {/* Confirm Booking Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || quoteLoading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Confirming Slot Reservation...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>Confirm & Book (Pay at Venue)</span>
                    </>
                  )}
                </button>
              </div>
            ) : quoteError ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                <span>
                  {quoteErrObj?.response?.data?.error?.message ||
                    'Unable to retrieve price quote. Slot may be unavailable.'}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  )
}

export default CheckoutPage
