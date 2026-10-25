import React, { useState, useRef } from 'react'
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom'
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

  // Admins cannot create customer bookings
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  // Retrieve checkout state passed from TurfDetailPage
  const checkoutState = location.state || {}
  const {
    turfId,
    turf: passedTurf,
    date,
    startTime,
    endTime,
    selectedSlots = [],
    slots = [],
    playerCount = 10,
    selectedAddOns = [],
  } = checkoutState

  const idempotencyKeyRef = useRef(
    `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  )

  const [contactDetails, setContactDetails] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: turfData } = useQuery({
    queryKey: ['checkoutTurf', turfId],
    queryFn: () => customerInventoryService.getTurfById(turfId),
    enabled: !!turfId && !passedTurf?.address,
  })

  const turf = passedTurf || turfData

  const {
    data: quote,
    isLoading: quoteLoading,
    isError: quoteError,
    error: quoteErrObj,
  } = useQuery({
    queryKey: ['checkoutQuote', { turfId, date, startTime, endTime, selectedSlots, playerCount, selectedAddOns }],
    queryFn: () =>
      customerBookingService.getPricingQuote({
        turfId,
        date,
        startTime,
        endTime,
        selectedSlots: selectedSlots.length > 0 ? selectedSlots : (startTime ? [startTime] : []),
        slots: slots.length > 0 ? slots : undefined,
        playerCount,
        addOns: selectedAddOns.map((item) => ({
          addOnId: item.addOnId,
          quantity: item.quantity,
        })),
      }),
    enabled: !!turfId && !!date && (!!startTime || selectedSlots.length > 0),
  })

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
        selectedSlots: selectedSlots.length > 0 ? selectedSlots : (startTime ? [startTime] : []),
        slots: slots.length > 0 ? slots : undefined,
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

  if (!turfId || !date || !startTime || !endTime) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FDF4E7] border border-[#F6E1C4] flex items-center justify-center text-[#79420D] mb-6">
          <Calendar className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#17231B] tracking-tight mb-2">
          No Match Slot Selected
        </h2>
        <p className="text-sm text-[#526258] max-w-md mx-auto mb-8">
          To checkout, please select a sports turf arena, desired calendar date, and an available time slot first.
        </p>
        <Link
          to="/turfs"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-sm shadow-xs transition-all"
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
          className="inline-flex items-center gap-1.5 text-xs text-[#526258] hover:text-[#17231B] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Turf Details</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-[#1D6537] font-semibold bg-[#E7F3E9] border border-[#C9DFCE] px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4 text-[#267A45]" />
          <span>Secure Checkout</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
          Review & Confirm Booking
        </h1>
        <p className="text-xs sm:text-sm text-[#526258] mt-1">
          Complete your contact details and reserve your slot. No upfront card payment required.
        </p>
      </div>

      {submitError && (
        <div className="p-4 rounded-2xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Booking could not be confirmed</p>
            <p className="mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Booking Info & Contact Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Turf & Slot Summary Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#D7E0D9] shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#17231B] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#267A45]" />
              <span>Arena & Time Slot</span>
            </h2>

            <div className="space-y-3 pt-1">
              <div>
                <h3 className="text-lg font-black text-[#17231B]">{turf?.name || 'Selected Arena'}</h3>
                {turf?.address && (
                  <p className="text-xs text-[#46564A] flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#267A45] shrink-0" />
                    <span>
                      {turf.address.street}, {turf.address.city}, {turf.address.state}
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#526258] block">Date</span>
                    <span className="text-xs font-semibold text-[#17231B]">{formattedDate}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#526258] block">
                      {selectedSlots.length > 1 ? `Time Slots (${selectedSlots.length})` : 'Time Slot'}
                    </span>
                    <span className="text-xs font-semibold text-[#17231B]">
                      {selectedSlots.length > 1 ? selectedSlots.join(', ') : `${startTime} - ${endTime}`}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#526258] block">Squad Size</span>
                    <span className="text-xs font-semibold text-[#17231B]">
                      {playerCount} Players (Max {turf?.capacity?.maxPlayers || 22})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Player Contact Details Form */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#D7E0D9] shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#17231B] flex items-center gap-2">
              <User className="w-4 h-4 text-[#267A45]" />
              <span>Player / Contact Information</span>
            </h2>
            <p className="text-xs text-[#526258]">
              The booking reference and venue access pass will be issued under these contact details.
            </p>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#17231B] mb-1.5">
                  Full Name <span className="text-[#922B27]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#647168] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={contactDetails.name}
                    onChange={(e) =>
                      setContactDetails({ ...contactDetails, name: e.target.value })
                    }
                    placeholder="Enter player/booker full name"
                    className={`w-full bg-white text-xs text-[#17231B] placeholder-[#647168] pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                      fieldErrors.name
                        ? 'border-[#922B27] ring-1 ring-[#922B27]'
                        : 'border-[#D7E0D9] focus:border-[#267A45]'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-[11px] text-[#922B27] mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17231B] mb-1.5">
                  Email Address <span className="text-[#922B27]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#647168] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={contactDetails.email}
                    onChange={(e) =>
                      setContactDetails({ ...contactDetails, email: e.target.value })
                    }
                    placeholder="name@example.com"
                    className={`w-full bg-white text-xs text-[#17231B] placeholder-[#647168] pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                      fieldErrors.email
                        ? 'border-[#922B27] ring-1 ring-[#922B27]'
                        : 'border-[#D7E0D9] focus:border-[#267A45]'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] text-[#922B27] mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17231B] mb-1.5">
                  Contact Mobile Number <span className="text-[#922B27]">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#647168] absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={contactDetails.phone}
                    onChange={(e) =>
                      setContactDetails({ ...contactDetails, phone: e.target.value })
                    }
                    placeholder="e.g. 9876543210"
                    className={`w-full bg-white text-xs text-[#17231B] placeholder-[#647168] pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                      fieldErrors.phone
                        ? 'border-[#922B27] ring-1 ring-[#922B27]'
                        : 'border-[#D7E0D9] focus:border-[#267A45]'
                    }`}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-[11px] text-[#922B27] mt-1">{fieldErrors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method Selection: Pay at Venue */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#D7E0D9] shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#17231B] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#267A45]" />
              <span>Payment Option</span>
            </h2>

            <div className="p-4 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#267A45]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#17231B]">Pay at Venue</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-white text-[#1D6537] border border-[#C9DFCE]">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-[#46564A]">
                  Pay securely at the arena counter via Cash, UPI, or Card on arrival. Your booking is confirmed immediately without advance deduction.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authoritative Price Breakdown & Submit */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#D7E0D9] shadow-xs sticky top-24 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8E3] pb-3">
              <h2 className="text-sm font-bold text-[#17231B] flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#267A45]" />
                <span>Price Breakdown</span>
              </h2>
              {quoteLoading && (
                <div className="flex items-center gap-1.5 text-xs text-[#526258]">
                  <Loader2 className="w-3.5 h-3.5 text-[#267A45] animate-spin" />
                  <span>Computing...</span>
                </div>
              )}
            </div>

            {quoteLoading ? (
              <div className="py-8 text-center text-[#526258] text-xs">
                <Loader2 className="w-6 h-6 text-[#267A45] animate-spin mx-auto mb-2" />
                <span>Fetching authoritative rates and taxes...</span>
              </div>
            ) : quote ? (
              <div className="space-y-4 text-xs">
                {/* Hourly Segments */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-[#526258] tracking-wider">
                    Turf Slot Charges
                  </span>
                  {quote.hourlySegments?.map((seg, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[#46564A]">
                      <div>
                        <span>
                          {seg.startTime} - {seg.endTime}
                        </span>
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#E7F3E9] text-[#1D6537] uppercase font-mono border border-[#C9DFCE]">
                          {seg.rateType}
                        </span>
                      </div>
                      <span className="font-mono text-[#17231B] font-bold">
                        ₹{(seg.segmentPrice / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Selected Add-Ons */}
                {quote.addOns && quote.addOns.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E2E8E3]">
                    <span className="text-[11px] font-bold uppercase text-[#526258] tracking-wider">
                      Add-Ons & Gear
                    </span>
                    {quote.addOns.map((addon, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[#46564A]">
                        <span>
                          {addon.name} × {addon.quantity}
                        </span>
                        <span className="font-mono text-[#17231B] font-bold">
                          ₹{(addon.totalAmount / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotal & Taxes */}
                <div className="space-y-2 pt-3 border-t border-[#E2E8E3] text-[#526258]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono text-[#17231B] font-bold">
                      ₹{(quote.subtotal / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      {quote.tax?.taxName || 'GST'} ({quote.tax?.taxPercentage || 0}%)
                    </span>
                    <span className="font-mono text-[#17231B] font-bold">
                      ₹{((quote.tax?.taxAmount || 0) / 100).toFixed(2)}
                    </span>
                  </div>

                  {/* Final Total Amount */}
                  <div className="pt-3 border-t border-[#E2E8E3] flex justify-between items-center">
                    <div>
                      <span className="text-sm font-bold text-[#17231B] block">Total Payable</span>
                      <span className="text-[10px] text-[#526258]">Pay at venue reception</span>
                    </div>
                    <span className="font-mono text-xl sm:text-2xl font-black text-[#267A45]">
                      ₹{(quote.finalTotal / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F0F4F1] border border-[#D7E0D9] text-[11px] text-[#526258] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#267A45] shrink-0 mt-0.5" />
                  <span>
                    Your slot will be reserved immediately upon clicking Confirm. Pricing snapshots are locked to protect against future price revisions.
                  </span>
                </div>

                {/* Confirm Booking Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || quoteLoading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] disabled:bg-[#EDF1EE] disabled:text-[#69756D] text-white font-black text-sm tracking-wide shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Confirming Slot Reservation...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Confirm & Book (Pay at Venue)</span>
                    </>
                  )}
                </button>
              </div>
            ) : quoteError ? (
              <div className="p-4 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs">
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
