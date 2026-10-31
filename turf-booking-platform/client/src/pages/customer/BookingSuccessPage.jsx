import React, { useState } from 'react'
import { useParams, Link, useLocation, Navigate } from 'react-router-dom'
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Copy,
  Check,
  Printer,
  ChevronRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Trophy,
  XCircle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useApi'
import customerBookingService from '../../services/customer/booking.service'
import { Modal } from '../../components/common/Modal'

export const BookingSuccessPage = () => {
  const { user } = useAuth()
  const { id } = useParams()
  const location = useLocation()
  const [copied, setCopied] = useState(false)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  const {
    data: booking,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bookingDetail', id],
    queryFn: () => customerBookingService.getBookingById(id),
    enabled: !!id,
    initialData: location.state?.booking,
  })

  const handleConfirmCancel = async (e) => {
    e?.preventDefault()
    setIsSubmittingCancel(true)
    setCancelError('')
    try {
      await customerBookingService.cancelBooking(id, {
        cancellationReason: cancelReason.trim() || 'Cancelled by customer',
      })
      setShowCancelModal(false)
      refetch()
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to cancel booking. It may be within the non-cancellable cutoff window.'
      setCancelError(msg)
    } finally {
      setIsSubmittingCancel(false)
    }
  }

  const copyBookingId = () => {
    if (booking?.bookingId) {
      navigator.clipboard.writeText(booking.bookingId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#526258] text-xs">
        <Loader2 className="w-8 h-8 text-[#267A45] animate-spin" />
        <span>Loading verified booking details...</span>
      </div>
    )
  }

  if (isError || !booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FDF0EF] border border-[#F8D2CE] flex items-center justify-center text-[#922B27] mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#17231B] tracking-tight mb-2">
          Booking Not Found
        </h2>
        <p className="text-xs text-[#526258] mb-6">
          {error?.response?.data?.error?.message ||
            'We could not locate this booking. It may belong to another account or does not exist.'}
        </p>
        <Link
          to="/my-bookings"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#F0F6F1] text-[#17231B] text-xs font-semibold border border-[#D7E0D9] transition-all"
        >
          <span>Go to My Bookings</span>
        </Link>
      </div>
    )
  }

  const formattedDate = booking.date
    ? new Date(booking.date + 'T00:00:00Z').toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : booking.date

  const isCancelled = booking.status === 'cancelled'
  const isFailed = booking.paymentStatus === 'failed'
  const isCompleted = booking.status === 'completed'

  const advancePaid =
    booking.amountPaid !== undefined && booking.amountPaid !== null && booking.amountPaid > 0
      ? booking.amountPaid
      : booking.advanceAmount !== undefined && booking.advanceAmount !== null
      ? booking.advanceAmount
      : 0

  const calculatedRemaining = Math.max(0, (booking.totalAmount || 0) - advancePaid)

  // Remaining due is strictly 0 only if booking is 100% paid
  const remainingDue =
    booking.paymentStatus === 'paid' && (booking.amountPaid >= (booking.totalAmount || 0) || !booking.paymentPlan || booking.paymentPlan === 'full_online')
      ? 0
      : (booking.amountDue !== undefined && booking.amountDue !== null && booking.amountDue > 0)
      ? booking.amountDue
      : (booking.remainingAmount !== undefined && booking.remainingAmount !== null && booking.remainingAmount > 0)
      ? booking.remainingAmount
      : calculatedRemaining

  const isPartiallyPaid =
    booking.paymentStatus === 'partially_paid' ||
    (booking.paymentPlan === 'partial_advance' && advancePaid > 0 && remainingDue > 0) ||
    (advancePaid > 0 && advancePaid < booking.totalAmount)

  const isPaid = (booking.paymentStatus === 'paid' || remainingDue === 0) && !isPartiallyPaid

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 print:py-0 print:px-0">
      {/* Top Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0F6F1] text-xs font-semibold text-[#526258] hover:text-[#267A45] border border-[#D7E0D9] shadow-2xs transition-all w-fit group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#267A45] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>
        <Link
          to="/my-bookings"
          className="text-xs font-semibold text-[#526258] hover:text-[#267A45] transition-colors"
        >
          My Bookings
        </Link>
      </div>

      {/* Top Banner: Status Header */}
      <div className="text-center space-y-3 print:hidden">
        {isCancelled || isFailed ? (
          <>
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FDF0EF] border border-[#F8D2CE] flex items-center justify-center text-[#922B27] shadow-xs">
              <XCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#922B27] tracking-tight">
              {isCancelled ? 'Booking Cancelled' : 'Payment Failed'}
            </h1>
            <p className="text-xs sm:text-sm text-[#526258] max-w-md mx-auto">
              {booking.cancellationReason
                ? `This reservation was cancelled (${booking.cancellationReason}). The slot has been released back to availability.`
                : 'This reservation is cancelled and no longer active. The match slot has been released back to public availability.'}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
              Booking Confirmed!
            </h1>
            <p className="text-xs sm:text-sm text-[#526258] max-w-md mx-auto">
              {isPaid
                ? 'Your match slot has been successfully reserved and paid online.'
                : 'Your match slot has been successfully reserved. We have registered your Pay at Venue booking.'}
            </p>
          </>
        )}
      </div>

      {/* Main Booking Pass / Receipt Card */}
      <div className="rounded-3xl bg-white border border-[#D7E0D9] overflow-hidden shadow-xs space-y-0">
        {/* Pass Header */}
        <div className="p-6 bg-[#F6F8F6] border-b border-[#D7E0D9] flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#526258] tracking-wider block">
              Booking Reference
            </span>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-wider ${
                isCancelled || isFailed ? 'text-[#922B27]' : 'text-[#267A45]'
              }`}>
                {booking.bookingId}
              </span>
              <button
                type="button"
                onClick={copyBookingId}
                className="p-1.5 rounded-lg bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1] text-[#46564A] hover:text-[#17231B] transition-colors print:hidden cursor-pointer"
                title="Copy Reference"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[#267A45]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCancelled ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FDF0EF] text-[#922B27] border border-[#F8D2CE] inline-flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-[#922B27]" />
                <span>Cancelled</span>
              </span>
            ) : isCompleted ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#1B4E82] border border-[#BFDBFE] inline-flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#1B4E82]" />
                <span>Completed</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE] inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#267A45]" />
                <span>Confirmed</span>
              </span>
            )}

            {isFailed ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FDF0EF] text-[#922B27] border border-[#F8D2CE]">
                Payment Failed
              </span>
            ) : isPaid ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
                {booking.paymentMethod === 'stripe' ? 'Paid (Stripe)' : 'Paid'}
              </span>
            ) : isPartiallyPaid ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                Partially Paid (₹{((remainingDue / 100).toFixed(2))} Due)
              </span>
            ) : booking.paymentStatus === 'refunded' ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#1B4E82] border border-[#BFDBFE]">
                Refunded
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FDF4E7] text-[#79420D] border border-[#F6E1C4]">
                {booking.paymentStatus === 'unpaid' ? 'Pay at Venue (Unpaid)' : booking.paymentStatus || 'Pending'}
              </span>
            )}
          </div>
        </div>

        {/* Arena & Time Details */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Partially Paid Venue Banner */}
          {isPartiallyPaid && !isCancelled && !isFailed && (
            <div className="p-4 rounded-2xl bg-[#FDF4E7] border border-[#F6E1C4] text-[#79420D] space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-[#B26213] shrink-0" />
                <span>Remaining Balance Payable at Venue Counter</span>
              </div>
              <p className="text-xs text-[#79420D]/90">
                You have paid <strong className="font-mono text-sm font-black text-[#17231B]">₹{((advancePaid / 100).toFixed(2))}</strong> online ({booking.advancePercentage || 20}% advance). Please pay the remaining balance of <strong className="font-mono text-sm font-black text-[#79420D]">₹{((remainingDue / 100).toFixed(2))}</strong> at the turf reception counter upon arrival via Cash, UPI, or Card.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#526258] tracking-wider block">
                Sports Arena
              </span>
              <h2 className="text-lg font-black text-[#17231B] mt-0.5">
                {booking.turf?.name || 'Sports Turf Arena'}
              </h2>
              {booking.turf?.address && (
                <p className="text-xs text-[#46564A] flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#267A45] shrink-0" />
                  <span>
                    {booking.turf.address.street}, {booking.turf.address.city}
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9]">
                <span className="text-[10px] uppercase font-bold text-[#526258] tracking-wider block">
                  Date
                </span>
                <span className="text-xs font-semibold text-[#17231B] mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#267A45]" />
                  <span>{formattedDate}</span>
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9]">
                <span className="text-[10px] uppercase font-bold text-[#526258] tracking-wider block">
                  Time Slot
                </span>
                <span className="text-xs font-semibold text-[#17231B] mt-1 flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#267A45]" />
                  <span>
                    {booking.startTime} - {booking.endTime}
                  </span>
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9]">
                <span className="text-[10px] uppercase font-bold text-[#526258] tracking-wider block">
                  Payment Status
                </span>
                <span className="text-xs font-semibold text-[#17231B] mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#267A45]" />
                  <span>
                    {isPartiallyPaid
                      ? `₹${((remainingDue / 100).toFixed(2))} Due at Venue`
                      : isPaid
                      ? '100% Pre-Paid'
                      : 'Pay at Venue'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details Snapshot */}
          <div className="pt-4 border-t border-[#E2E8E3] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#526258] tracking-wider block">
                Booked For
              </span>
              <span className="font-semibold text-[#17231B] mt-0.5 block">
                {booking.contactDetails?.name || booking.user?.name}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#526258] tracking-wider block">
                Email
              </span>
              <span className="font-semibold text-[#46564A] mt-0.5 block truncate">
                {booking.contactDetails?.email || booking.user?.email}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#526258] tracking-wider block">
                Phone
              </span>
              <span className="font-semibold text-[#46564A] mt-0.5 block font-mono">
                {booking.contactDetails?.phone || booking.user?.phone || 'N/A'}
              </span>
            </div>
          </div>

          {/* Itemized Price Snapshot */}
          <div className="pt-4 border-t border-[#E2E8E3] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17231B] flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-[#267A45]" />
              <span>Snapshot Price Breakdown</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#46564A]">
                <span>
                  Turf Slot ({booking.startTime} - {booking.endTime})
                </span>
                <span className="font-mono text-[#17231B] font-bold">
                  ₹{(booking.slotPrice / 100).toFixed(2)}
                </span>
              </div>

              {booking.addOns && booking.addOns.length > 0 && (
                <div className="space-y-1.5 pl-2 border-l border-[#D7E0D9]">
                  {booking.addOns.map((addon, idx) => (
                    <div key={idx} className="flex justify-between text-[#526258]">
                      <span>
                        {addon.name} × {addon.quantity}
                      </span>
                      <span className="font-mono text-[#17231B] font-semibold">
                        ₹{(addon.totalPrice / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-[#526258] pt-2 border-t border-[#E2E8E3]">
                <span>Subtotal</span>
                <span className="font-mono text-[#17231B] font-bold">
                  ₹{(booking.subtotal / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-[#526258]">
                <span>GST ({booking.taxRatePercentage}%)</span>
                <span className="font-mono text-[#17231B] font-bold">
                  ₹{(booking.taxAmount / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#E2E8E3]">
                <div>
                  <span className="text-sm font-bold text-[#17231B] block">Total Booking Amount</span>
                  <span className="text-[10px] font-medium">
                    {isCancelled || isFailed ? (
                      <span className="text-[#922B27]">Cancelled / Void</span>
                    ) : isPartiallyPaid ? (
                      <span className="text-[#79420D]">Partial advance paid online • Balance due at venue</span>
                    ) : isPaid ? (
                      <span className="text-[#267A45]">Paid via Online Payment</span>
                    ) : (
                      <span className="text-[#79420D]">Payable at arena desk</span>
                    )}
                  </span>
                </div>
                <span
                  className={`text-xl sm:text-2xl font-mono font-black ${
                    isCancelled || isFailed ? 'text-[#922B27] line-through opacity-75' : 'text-[#267A45]'
                  }`}
                >
                  ₹{(booking.totalAmount / 100).toFixed(2)}
                </span>
              </div>

              {isPartiallyPaid && (
                <div className="pt-2 border-t border-[#E2E8E3] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#1D6537] font-semibold">
                    <span>Advance Paid via Stripe:</span>
                    <span className="font-mono">₹{((advancePaid / 100).toFixed(2))}</span>
                  </div>
                  <div className="flex justify-between text-[#79420D] font-bold text-sm pt-1 border-t border-[#E2E8E3]/60">
                    <span>Remaining Balance Due at Venue:</span>
                    <span className="font-mono text-base font-black text-[#79420D]">
                      ₹{((remainingDue / 100).toFixed(2))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions Box / Cancellation Notice */}
          {isCancelled || isFailed ? (
            <div className="p-4 rounded-2xl bg-[#FDF0EF] border border-[#F8D2CE] text-xs text-[#922B27] space-y-1.5">
              <p className="font-bold text-[#922B27] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#922B27]" />
                <span>Pass Status: Cancelled & Void</span>
              </p>
              <p className="text-[#7A1E1A] text-[11px] leading-relaxed">
                This booking pass is void and cannot be used for entry at {booking.turf?.name || 'the arena'}. The match slot has been released back to availability. If you wish to play, please choose an available slot and rebook.
                {booking.cancellationReason && (
                  <span className="block mt-1 font-semibold">Cancellation Note: {booking.cancellationReason}</span>
                )}
                {booking.refundStatus && booking.refundStatus !== 'not_applicable' && (
                  <span className="block mt-1 font-semibold text-[#1D6537]">
                    Refund Status: <span className="capitalize">{booking.refundStatus.replace(/_/g, ' ')}</span>
                    {booking.refundAmount > 0 ? ` (₹${(booking.refundAmount / 100).toFixed(2)})` : ''}
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#EDF5EF] border border-[#C9DFCE] text-xs text-[#17231B] space-y-1.5">
              <p className="font-bold text-[#17231B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#267A45]" />
                <span>What's Next?</span>
              </p>
              <p className="text-[#526258] text-[11px] leading-relaxed">
                1. Arrive at least 15 minutes before your match time at {booking.turf?.name || 'the arena'}.<br />
                2. Show your Booking Reference <strong className="text-[#267A45] font-mono">{booking.bookingId}</strong> at the reception desk.<br />
                {isPartiallyPaid ? (
                  <>3. Your advance of ₹{((advancePaid / 100).toFixed(2))} is verified. Settle the remaining <strong className="font-mono text-[#79420D]">₹{((remainingDue / 100).toFixed(2))}</strong> via Cash, UPI, or Card at the reception counter and start playing!</>
                ) : isPaid ? (
                  <>3. Your payment is verified. Hit the pitch and enjoy your match!</>
                ) : (
                  <>3. Settle ₹{((remainingDue / 100).toFixed(2))} via Cash or UPI at the reception counter and start playing!</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        {isCancelled || isFailed ? (
          <>
            <Link
              to={booking.turf?.slug ? `/turfs/${booking.turf.slug}` : '/turfs'}
              className="px-5 py-2.5 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-xs shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Rebook Arena Slot</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/my-bookings"
                className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F0F6F1] text-[#17231B] text-xs font-semibold border border-[#D7E0D9] transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>My Bookings</span>
              </Link>
              <Link
                to="/turfs"
                className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F0F6F1] text-[#17231B] text-xs font-semibold border border-[#D7E0D9] transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-[#267A45]" />
                <span>Browse Turfs</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            <Link
              to="/my-bookings"
              className="px-5 py-2.5 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-xs shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>View in My Bookings</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#FDF0EF] text-[#922B27] text-xs font-semibold border border-[#F8D2CE] transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-[#922B27]" />
                <span>Cancel Booking</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F0F6F1] text-[#17231B] text-xs font-semibold border border-[#D7E0D9] transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#267A45]" />
                <span>Print Receipt</span>
              </button>

              <Link
                to="/turfs"
                className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F0F6F1] text-[#17231B] text-xs font-semibold border border-[#D7E0D9] transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-[#267A45]" />
                <span>Book Another Turf</span>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Cancellation Modal Dialog */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          if (!isSubmittingCancel) {
            setShowCancelModal(false)
            setCancelError('')
          }
        }}
        title="Cancel Match Booking"
        subtitle={`Booking Reference: ${booking?.bookingId || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] text-xs space-y-1.5">
            <p className="font-bold text-[#17231B]">
              {booking?.turf?.name || 'Turf Arena'}
            </p>
            <p className="text-[#526258]">
              Date: <strong className="text-[#17231B]">{booking?.date}</strong> • Slot:{' '}
              <strong className="text-[#17231B]">
                {booking?.startTime} - {booking?.endTime}
              </strong>
            </p>
            <p className="text-[#526258]">
              Total Amount:{' '}
              <strong className="text-[#267A45] font-mono">
                ₹{((booking?.totalAmount || 0) / 100).toFixed(2)}
              </strong>
            </p>
          </div>

          <p className="text-xs text-[#526258] leading-relaxed">
            Are you sure you want to cancel this booking pass? Cancelling will release the match slot immediately back to general availability.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#17231B] block">
              Reason for Cancellation (Optional)
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-white text-xs text-[#17231B] px-3 py-2 rounded-xl border border-[#D7E0D9] focus:outline-none focus:border-[#267A45]"
            >
              <option value="">Select a reason...</option>
              <option value="Change in match schedule">Change in match schedule</option>
              <option value="Players / squad unavailable">Players / squad unavailable</option>
              <option value="Weather or rain forecast">Weather or rain forecast</option>
              <option value="Booked by mistake">Booked by mistake</option>
              <option value="Other reason">Other reason</option>
            </select>
          </div>

          {cancelError && (
            <div className="p-3 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0 mt-0.5" />
              <span>{cancelError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8E3]">
            <button
              type="button"
              disabled={isSubmittingCancel}
              onClick={() => {
                setShowCancelModal(false)
                setCancelError('')
              }}
              className="px-4 py-2 rounded-xl bg-white border border-[#D7E0D9] text-xs font-semibold text-[#17231B] hover:bg-[#F0F6F1] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Keep Booking
            </button>
            <button
              type="submit"
              disabled={isSubmittingCancel}
              className="px-4 py-2 rounded-xl bg-[#922B27] hover:bg-[#7A1E1A] text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmittingCancel ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Yes, Cancel Booking</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default BookingSuccessPage
