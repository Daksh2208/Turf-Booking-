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
  Sparkles,
  Gift,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useApi'
import customerBookingService from '../../services/customer/booking.service'
import customerInventoryService from '../../services/customer/inventory.service'
import customerPaymentService from '../../services/customer/payment.service'
import { useBookingReservation } from '../../context/BookingReservationContext'

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

  const { currentReservation, countdownSeconds, clearReservation } = useBookingReservation()
  const reservationId = checkoutState.reservationId || currentReservation?.reservationId
  const isExpired = Boolean(reservationId && countdownSeconds === 0)

  const formatCountdown = (secs) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
  }

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('pay_at_venue') // 'pay_at_venue' | 'stripe'

  // Fetch safe public Stripe configuration (enabled, publishableKey, currency)
  const { data: stripeConfig } = useQuery({
    queryKey: ['stripeConfig'],
    queryFn: () => customerPaymentService.getStripeConfig(),
  })
  const isStripeEnabled = stripeConfig?.enabled === true

  // Coupon Code State
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)
  const [showOffers, setShowOffers] = useState(true)

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
    queryKey: [
      'checkoutQuote',
      {
        turfId,
        date,
        startTime,
        endTime,
        selectedSlots,
        playerCount,
        selectedAddOns,
        couponCode: appliedCoupon?.code || undefined,
      },
    ],
    queryFn: () =>
      customerBookingService.getPricingQuote({
        turfId,
        date,
        startTime,
        endTime,
        selectedSlots: selectedSlots.length > 0 ? selectedSlots : (startTime ? [startTime] : []),
        slots: slots.length > 0 ? slots : undefined,
        playerCount,
        couponCode: appliedCoupon?.code || undefined,
        sportId: turf?.sports?.[0]?._id || turf?.sports?.[0],
        addOns: selectedAddOns.map((item) => ({
          addOnId: item.addOnId,
          quantity: item.quantity,
        })),
      }),
    enabled: !!turfId && !!date && (!!startTime || selectedSlots.length > 0),
  })

  // Dynamic Available Coupons & Smart Spend Nudges Query
  const effectiveTurfId = turfId || turf?._id || turf?.id
  const sportId = turf?.sports?.[0]?._id || turf?.sports?.[0]
  const preDiscountSubtotal = quote?.preDiscountSubtotal || quote?.subtotal || 0

  const { data: rawCouponsData } = useQuery({
    queryKey: ['availableCoupons', effectiveTurfId, sportId, preDiscountSubtotal],
    queryFn: () =>
      customerBookingService.getAvailableCoupons({
        turfId: effectiveTurfId,
        sportId,
        subtotal: preDiscountSubtotal,
      }),
    enabled: !!effectiveTurfId,
  })

  const availableCoupons = Array.isArray(rawCouponsData)
    ? rawCouponsData
    : (rawCouponsData?.coupons || [])

  const handleApplyCoupon = async (e, codeOverride = null) => {
    e?.preventDefault()
    setCouponError('')
    setCouponSuccess('')
    const cleanCode = (codeOverride || couponInput).trim().toUpperCase()
    if (!cleanCode) {
      setCouponError('Please enter a coupon code.')
      return
    }
    setCouponInput(cleanCode)

    setIsValidatingCoupon(true)
    try {
      const result = await customerBookingService.validateCoupon({
        couponCode: cleanCode,
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
      })

      setAppliedCoupon(result.coupon)
      setCouponSuccess(`Coupon "${result.coupon.code}" applied! You saved ₹${(result.discountAmount / 100).toFixed(2)}.`)
      setCouponInput(cleanCode)
    } catch (err) {
      setAppliedCoupon(null)
      setCouponError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Invalid coupon code.'
      )
    } finally {
      setIsValidatingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponSuccess('')
    setCouponError('')
  }

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

    if (isExpired) {
      setSubmitError('Your temporary reservation has expired. Please return to the slot selection page and choose an available slot.')
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
        paymentMethod: selectedPaymentMethod === 'stripe' ? 'stripe' : 'Pay at Venue',
        couponCode: appliedCoupon?.code || undefined,
        reservationId: reservationId || undefined,
        idempotencyKey: idempotencyKeyRef.current,
      }

      if (selectedPaymentMethod === 'stripe') {
        if (!isStripeEnabled) {
          setSubmitError('Online payment is not configured yet. Please choose Pay at Venue.')
          setIsSubmitting(false)
          return
        }

        const sessionData = await customerPaymentService.createCheckoutSession(
          {
            bookingData: bookingPayload,
            clientUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          idempotencyKeyRef.current
        )

        if (sessionData?.url) {
          clearReservation()
          // Redirect directly to the real Stripe-hosted checkout page
          window.location.href = sessionData.url
          return
        } else {
          throw new Error('Unable to generate Stripe checkout session. Please try again or select Pay at Venue.')
        }
      } else {
        const booking = await customerBookingService.createBooking(
          bookingPayload,
          idempotencyKeyRef.current
        )

        clearReservation()

        navigate(`/bookings/success/${booking._id}`, {
          state: { booking },
          replace: true,
        })
      }
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

      {/* Real-time Hold Countdown Banner */}
      {reservationId && !isExpired && countdownSeconds > 0 && (
        <div className="p-4 rounded-2xl bg-[#E7F3E9] border border-[#267A45]/40 flex items-center justify-between gap-3 text-xs text-[#1D6537] animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#267A45] animate-pulse shrink-0" />
            <div>
              <p className="font-bold text-sm">Slots reserved exclusively for you</p>
              <p className="text-[#526258] mt-0.5">
                Time remaining to confirm booking:{' '}
                <strong className="font-mono text-[#1D6537] text-sm font-black">
                  {formatCountdown(countdownSeconds)}
                </strong>
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-white border border-[#C9DFCE] text-xs font-mono font-bold text-[#1D6537] shrink-0">
            {reservationId}
          </span>
        </div>
      )}

      {/* Reservation Expired Warning Banner */}
      {isExpired && (
        <div className="p-4 rounded-2xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#922B27] shrink-0" />
            <div>
              <p className="font-bold text-sm">Reservation Expired</p>
              <p className="text-[#922B27]/80 mt-0.5">
                Your temporary reservation has expired. Please return to the turf page to re-select available slots.
              </p>
            </div>
          </div>
          <Link
            to={turf?.slug ? `/turfs/${turf.slug}` : '/turfs'}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#F8D2CE] text-xs font-bold text-[#922B27] hover:bg-[#FDF0EF] shrink-0 transition-colors"
          >
            Back to Slots
          </Link>
        </div>
      )}

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

          {/* Payment Method Selection */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#D7E0D9] shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#17231B] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#267A45]" />
              <span>Select Payment Option</span>
            </h2>

            <div className="space-y-3">
              {/* Option 1: Pay Online with Stripe */}
              <div
                onClick={() => {
                  if (isStripeEnabled) {
                    setSelectedPaymentMethod('stripe')
                  }
                }}
                className={`p-4 rounded-2xl border transition-all ${
                  !isStripeEnabled
                    ? 'bg-[#F9FAF9] border-[#E2E8E3] cursor-not-allowed opacity-90'
                    : selectedPaymentMethod === 'stripe'
                    ? 'bg-[#E7F3E9] border-[#267A45] ring-2 ring-[#267A45]/20 cursor-pointer shadow-xs'
                    : 'bg-white border-[#D7E0D9] hover:border-[#267A45]/50 cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      !isStripeEnabled
                        ? 'bg-[#F0F2F0] border-[#D7E0D9] text-[#717171]'
                        : selectedPaymentMethod === 'stripe'
                        ? 'bg-white border-[#C9DFCE] text-[#267A45]'
                        : 'bg-[#F6F8F6] border-[#D7E0D9] text-[#526258]'
                    }`}
                  >
                    {!isStripeEnabled ? (
                      <Lock className="w-4 h-4 text-[#717171]" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-[#267A45]" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#17231B]">Pay Online with Stripe</span>
                        {isStripeEnabled ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-white text-[#1D6537] border border-[#C9DFCE]">
                            Cards & NetBanking
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#FDF0EF] text-[#922B27] border border-[#F8D2CE]">
                            Unavailable
                          </span>
                        )}
                      </div>

                      <input
                        type="radio"
                        name="paymentMethodRadio"
                        value="stripe"
                        checked={selectedPaymentMethod === 'stripe'}
                        disabled={!isStripeEnabled}
                        onChange={() => {
                          if (isStripeEnabled) setSelectedPaymentMethod('stripe')
                        }}
                        className="text-[#267A45] focus:ring-[#267A45] h-4 w-4 cursor-pointer disabled:opacity-40"
                      />
                    </div>

                    {isStripeEnabled ? (
                      <p className="text-xs text-[#46564A]">
                        Pay now using credit/debit card, net banking, or international cards through Stripe's certified PCI-DSS Level 1 gateway.
                      </p>
                    ) : (
                      <div className="mt-1 p-2.5 rounded-xl bg-[#FDF4E7] border border-[#F6E1C4] text-[11px] text-[#79420D] flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 shrink-0 text-[#B26213]" />
                        <span className="font-medium">Online payment is not configured yet. Please choose Pay at Venue.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: Pay at Venue */}
              <div
                onClick={() => setSelectedPaymentMethod('pay_at_venue')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedPaymentMethod === 'pay_at_venue'
                    ? 'bg-[#E7F3E9] border-[#267A45] ring-2 ring-[#267A45]/20 shadow-xs'
                    : 'bg-white border-[#D7E0D9] hover:border-[#267A45]/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      selectedPaymentMethod === 'pay_at_venue'
                        ? 'bg-white border-[#C9DFCE] text-[#267A45]'
                        : 'bg-[#F6F8F6] border-[#D7E0D9] text-[#526258]'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#267A45]" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#17231B]">Pay at Venue</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-white text-[#1D6537] border border-[#C9DFCE]">
                          Recommended
                        </span>
                      </div>

                      <input
                        type="radio"
                        name="paymentMethodRadio"
                        value="pay_at_venue"
                        checked={selectedPaymentMethod === 'pay_at_venue'}
                        onChange={() => setSelectedPaymentMethod('pay_at_venue')}
                        className="text-[#267A45] focus:ring-[#267A45] h-4 w-4 cursor-pointer"
                      />
                    </div>

                    <p className="text-xs text-[#46564A]">
                      Pay securely at the arena counter via Cash, UPI, or Card on arrival. Your booking is confirmed immediately without advance deduction.
                    </p>
                  </div>
                </div>
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

                {/* Coupon Code Section */}
                <div className="pt-3 border-t border-[#E2E8E3] space-y-2.5">
                  <span className="text-[11px] font-bold uppercase text-[#526258] tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#267A45]" />
                    <span>Have a Coupon Code?</span>
                  </span>

                  {appliedCoupon ? (
                    <div className="p-3 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-[#1D6537] uppercase">
                              {appliedCoupon.code}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-white text-[#1D6537] border border-[#C9DFCE]">
                              {appliedCoupon.discountType === 'percentage'
                                ? `${appliedCoupon.discountValue}% OFF`
                                : `₹${(appliedCoupon.discountValue / 100).toFixed(0)} OFF`}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#526258]">Coupon discount applied to total</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-xs font-bold text-[#922B27] hover:underline cursor-pointer px-2 py-1 rounded-lg hover:bg-white/60 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="e.g. TURF20"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleApplyCoupon(e)
                            }
                          }}
                          className="flex-1 bg-white text-xs uppercase font-mono tracking-wider text-[#17231B] placeholder-[#647168] px-3.5 py-2.5 rounded-xl border border-[#D7E0D9] focus:outline-none focus:border-[#267A45]"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={isValidatingCoupon || !couponInput.trim()}
                          className="px-4 py-2.5 rounded-xl bg-[#267A45] hover:bg-[#1E6338] disabled:bg-[#D7E0D9] disabled:text-[#647168] text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                        >
                          {isValidatingCoupon ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Validating</span>
                            </>
                          ) : (
                            <span>Apply</span>
                          )}
                        </button>
                      </div>

                      {couponError && (
                        <p className="text-[11px] text-[#922B27] flex items-center gap-1 pt-0.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{couponError}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {couponSuccess && !appliedCoupon && (
                    <p className="text-[11px] text-[#1D6537] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{couponSuccess}</span>
                    </p>
                  )}

                  {/* Smart Coupon Discovery & Unlock Nudges */}
                  {availableCoupons && availableCoupons.length > 0 && (
                    <div className="pt-2 border-t border-dashed border-[#E2E8E3] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#17231B] flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-[#267A45]" />
                          <span>Available Offers ({availableCoupons.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowOffers((prev) => !prev)}
                          className="text-[11px] font-semibold text-[#267A45] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          {showOffers ? (
                            <>
                              <span>Hide</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>View All</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>

                      {showOffers && (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                          {(() => {
                            const currentSubtotal = quote?.preDiscountSubtotal || quote?.subtotal || 0
                            const sorted = [...availableCoupons].sort((a, b) => {
                              const aEligible = currentSubtotal >= (a.minimumBookingAmount || 0)
                              const bEligible = currentSubtotal >= (b.minimumBookingAmount || 0)
                              if (aEligible && !bEligible) return -1
                              if (!aEligible && bEligible) return 1
                              return (a.minimumBookingAmount || 0) - (b.minimumBookingAmount || 0)
                            })

                            return sorted.map((c) => {
                              const isCurrentApplied = appliedCoupon?.code === c.code
                              const minRequired = c.minimumBookingAmount || 0
                              const isEligible = currentSubtotal >= minRequired
                              const amountNeeded = isEligible ? 0 : Math.max(0, minRequired - currentSubtotal)

                              let potentialDiscount = 0
                              if (c.discountType === 'percentage') {
                                const base = isEligible ? currentSubtotal : minRequired
                                potentialDiscount = Math.round((base * c.discountValue) / 100)
                                if (c.maximumDiscountAmount) {
                                  potentialDiscount = Math.min(potentialDiscount, c.maximumDiscountAmount)
                                }
                              } else {
                                potentialDiscount = isEligible
                                  ? Math.min(c.discountValue, currentSubtotal)
                                  : c.discountValue
                              }

                              const dynamicNudge = !isEligible && minRequired > 0
                                ? `Add ₹${Math.ceil(amountNeeded / 100).toLocaleString('en-IN')} more to unlock ${
                                    c.discountType === 'percentage'
                                      ? `${c.discountValue}% OFF`
                                      : `₹${Math.round(c.discountValue / 100).toLocaleString('en-IN')} FLAT OFF`
                                  }!`
                                : null

                              if (isEligible) {
                                return (
                                  <div
                                    key={c._id}
                                    className={`p-2.5 rounded-xl border transition-all ${
                                      isCurrentApplied
                                        ? 'bg-[#E7F3E9] border-[#267A45]'
                                        : 'bg-white border-[#D7E0D9] hover:border-[#267A45]/60 hover:shadow-2xs'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono font-bold text-xs bg-[#F4F7F4] text-[#1D6537] px-2 py-0.5 rounded border border-[#C9DFCE]">
                                            {c.code}
                                          </span>
                                          <span className="text-[10px] font-bold text-[#267A45]">
                                            {c.discountType === 'percentage'
                                              ? `${c.discountValue}% OFF`
                                              : `₹${(c.discountValue / 100).toFixed(0)} FLAT OFF`}
                                          </span>
                                          <span className="text-[9px] font-semibold text-[#1D6537] bg-[#E7F3E9] px-1.5 py-0.2 rounded border border-[#C9DFCE]">
                                            Unlocked
                                          </span>
                                        </div>
                                        {c.description && (
                                          <p className="text-[10px] text-[#526258] line-clamp-1">
                                            {c.description}
                                          </p>
                                        )}
                                        <p className="text-[10px] font-medium text-[#267A45]">
                                          Save ₹{(potentialDiscount / 100).toFixed(2)} on this booking!
                                        </p>
                                      </div>

                                      {isCurrentApplied ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1D6537] bg-white px-2 py-1 rounded-lg border border-[#C9DFCE]">
                                          <CheckCircle2 className="w-3 h-3" />
                                          Applied
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleApplyCoupon(null, c.code)}
                                          disabled={isValidatingCoupon}
                                          className="text-xs font-bold text-white bg-[#267A45] hover:bg-[#1E6338] px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-2xs shrink-0"
                                        >
                                          Apply
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              }

                              // Coupon not yet eligible: Show smart spend nudge
                              return (
                                <div
                                  key={c._id}
                                  className="p-2.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/70"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-xs bg-white text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                                          {c.code}
                                        </span>
                                        <span className="text-[10px] font-bold text-amber-800">
                                          {c.discountType === 'percentage'
                                            ? `${c.discountValue}% OFF`
                                            : `₹${(c.discountValue / 100).toFixed(0)} FLAT OFF`}
                                        </span>
                                      </div>
                                      <p className="text-[10px] font-semibold text-amber-900 flex items-center gap-1">
                                        <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                                        <span>{dynamicNudge || c.highlightNudge}</span>
                                      </p>
                                      <p className="text-[9px] text-amber-700">
                                        Valid on bookings of ₹{((c.minimumBookingAmount || 0) / 100).toLocaleString('en-IN')} or more
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setCouponInput(c.code)}
                                      className="text-[10px] font-bold text-amber-800 bg-white hover:bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg cursor-pointer transition-colors shrink-0"
                                      title="Click to copy code to input"
                                    >
                                      Use Code
                                    </button>
                                  </div>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtotal & Taxes */}
                <div className="space-y-2 pt-3 border-t border-[#E2E8E3] text-[#526258]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono text-[#17231B] font-bold">
                      ₹{((quote.preDiscountSubtotal || quote.subtotal) / 100).toFixed(2)}
                    </span>
                  </div>

                  {/* Coupon Discount Row if applied */}
                  {quote.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-[#267A45]">
                      <span className="flex items-center gap-1 font-semibold">
                        <Tag className="w-3 h-3" />
                        <span>Coupon Discount ({quote.coupon?.code || appliedCoupon?.code})</span>
                      </span>
                      <span className="font-mono font-bold">
                        -₹{(quote.discountAmount / 100).toFixed(2)}
                      </span>
                    </div>
                  )}

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
                      <span className="text-[10px] text-[#526258]">
                        {selectedPaymentMethod === 'stripe'
                          ? 'Online payment via Stripe'
                          : 'Pay at venue reception'}
                      </span>
                    </div>
                    <span className="font-mono text-xl sm:text-2xl font-black text-[#267A45]">
                      ₹{(quote.finalTotal / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F0F4F1] border border-[#D7E0D9] text-[11px] text-[#526258] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#267A45] shrink-0 mt-0.5" />
                  <span>
                    {selectedPaymentMethod === 'stripe'
                      ? 'You will be redirected to the official Stripe hosted checkout page to complete your payment securely.'
                      : 'Your slot will be reserved immediately upon clicking Confirm. Pricing snapshots are locked to protect against future price revisions.'}
                  </span>
                </div>

                {/* Confirm Booking Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || quoteLoading || isExpired}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] disabled:bg-[#EDF1EE] disabled:text-[#69756D] disabled:cursor-not-allowed text-white font-black text-sm tracking-wide shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>
                        {selectedPaymentMethod === 'stripe'
                          ? 'Connecting to Stripe Checkout...'
                          : 'Confirming Slot Reservation...'}
                      </span>
                    </>
                  ) : isExpired ? (
                    <span>Reservation Expired (Return to Slots)</span>
                  ) : (
                    <>
                      {selectedPaymentMethod === 'stripe' ? (
                        <>
                          <CreditCard className="w-4 h-4 text-white" />
                          <span>Pay ₹{(quote.finalTotal / 100).toFixed(2)} with Stripe</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Confirm & Book (Pay at Venue)</span>
                        </>
                      )}
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
