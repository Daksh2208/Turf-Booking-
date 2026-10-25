import React, { useState } from 'react'
import { useSearchParams, Link, Navigate } from 'react-router-dom'
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
  CreditCard,
  Building2,
  ArrowLeft,
  Home,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useApi'
import customerPaymentService from '../../services/customer/payment.service'

export const PaymentSuccessPage = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('booking_id')
  const sessionId = searchParams.get('session_id')
  const [copied, setCopied] = useState(false)

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  const {
    data: statusData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['paymentStatus', bookingId, sessionId],
    queryFn: () => customerPaymentService.getPaymentStatus(bookingId, sessionId),
    enabled: !!bookingId || !!sessionId,
    refetchInterval: (data) => (data?.paymentStatus === 'pending' ? 3000 : false),
  })

  const booking = statusData?.booking
  const paymentStatus = statusData?.paymentStatus || booking?.paymentStatus
  const isPaid = paymentStatus === 'paid'
  const isSlotConflict = statusData?.slotConflict === true

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

  if (!bookingId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FDF0EF] border border-[#F8D2CE] flex items-center justify-center text-[#922B27] mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#17231B] tracking-tight mb-2">
          Missing Booking Reference
        </h2>
        <p className="text-sm text-[#526258] max-w-md mx-auto mb-8">
          No booking ID was provided in the return URL. Please check your bookings history.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-[#D7E0D9] hover:bg-[#F6F8F6] text-[#17231B] font-bold text-sm shadow-xs transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#267A45]" />
            <span>Back to Home</span>
          </Link>
          <Link
            to="/my-bookings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-sm shadow-xs transition-all"
          >
            <span>View My Bookings</span>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#526258] text-xs">
        <Loader2 className="w-8 h-8 text-[#267A45] animate-spin" />
        <span className="font-semibold text-sm text-[#17231B]">Verifying payment with Stripe...</span>
        <span>Please do not close this window while we securely confirm your transaction.</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FDF0EF] border border-[#F8D2CE] flex items-center justify-center text-[#922B27] mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#17231B] tracking-tight mb-2">
          Unable to Verify Payment
        </h2>
        <p className="text-sm text-[#526258] max-w-md mx-auto mb-8">
          {error?.response?.data?.message || 'We could not verify the status of this booking at this time.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-[#D7E0D9] hover:bg-[#F6F8F6] text-[#17231B] font-bold text-sm shadow-xs transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#267A45]" />
            <span>Back to Home</span>
          </Link>
          <Link
            to="/my-bookings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-sm shadow-xs transition-all"
          >
            <span>Check My Bookings</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 print:py-0 print:px-0">
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

      {/* Verification Status Header */}
      <div className="text-center space-y-3">
        {isPaid ? (
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#E7F3E9] border-2 border-[#C9DFCE] flex items-center justify-center text-[#267A45] shadow-xs">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE] mb-2">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Online Payment Verified</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
                Payment Successful & Slot Confirmed!
              </h1>
              <p className="text-xs sm:text-sm text-[#526258] max-w-lg mx-auto mt-1">
                Your transaction has been securely processed by Stripe. Your arena slot is guaranteed.
              </p>
            </div>
          </>
        ) : isSlotConflict ? (
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#FEF3EB] border-2 border-[#FCD9BD] flex items-center justify-center text-[#D96B27] shadow-xs">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FEF3EB] text-[#D96B27] border border-[#FCD9BD] mb-2">
                <span>Payment Logged — Slot Reassigned</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
                Payment Received (Manual Review Required)
              </h1>
              <p className="text-xs sm:text-sm text-[#526258] max-w-lg mx-auto mt-1">
                Your payment cleared, but the temporary slot hold expired and another player booked it. Our team will contact you or process an automatic full refund.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#FDF4E7] border-2 border-[#F6E1C4] flex items-center justify-center text-[#79420D] shadow-xs">
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FDF4E7] text-[#79420D] border border-[#F6E1C4] mb-2">
                <span>Payment Processing</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
                Awaiting Final Payment Confirmation
              </h1>
              <p className="text-xs sm:text-sm text-[#526258] max-w-lg mx-auto mt-1">
                Stripe is finalizing clearance of your payment. This page updates automatically.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Booking Voucher & Payment Details Card */}
      <div className="bg-white rounded-3xl border border-[#D7E0D9] shadow-xs overflow-hidden">
        {/* Header bar */}
        <div className="p-5 sm:p-6 bg-[#F6F8F6] border-b border-[#E2E8E3] flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526258] block">
              Booking ID
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-[#17231B]">
                {booking?.bookingId}
              </span>
              <button
                type="button"
                onClick={copyBookingId}
                className="p-1.5 rounded-lg text-[#526258] hover:text-[#17231B] hover:bg-[#E2E8E3] transition-colors cursor-pointer"
                title="Copy Booking ID"
              >
                {copied ? <Check className="w-4 h-4 text-[#267A45]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isPaid
                  ? 'bg-[#E7F3E9] text-[#1D6537] border-[#C9DFCE]'
                  : 'bg-[#FDF4E7] text-[#79420D] border-[#F6E1C4]'
              }`}
            >
              {paymentStatus}
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white border border-[#D7E0D9] hover:bg-[#F6F8F6] text-[#526258] hover:text-[#17231B] transition-colors cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Turf details */}
          <div>
            <h3 className="text-lg font-bold text-[#17231B]">{booking?.turf?.name}</h3>
            {booking?.turf?.address && (
              <p className="text-xs text-[#526258] flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#267A45] shrink-0" />
                <span>
                  {booking.turf.address.street}, {booking.turf.address.city}, {booking.turf.address.state}
                </span>
              </p>
            )}
          </div>

          {/* Time & Slot Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#526258] block">
                Match Date
              </span>
              <p className="text-sm font-bold text-[#17231B] mt-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#267A45]" />
                <span>{booking?.date}</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#526258] block">
                Slot Time
              </span>
              <p className="text-sm font-bold text-[#17231B] mt-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#267A45]" />
                <span>
                  {booking?.startTime} - {booking?.endTime}
                </span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#526258] block">
                Payment Channel
              </span>
              <p className="text-sm font-bold text-[#17231B] mt-1 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#267A45]" />
                <span>Stripe Online</span>
              </p>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="space-y-2 pt-3 border-t border-[#E2E8E3] text-xs text-[#526258]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono text-[#17231B] font-bold">
                ₹{((booking?.subtotal || 0) / 100).toFixed(2)}
              </span>
            </div>

            {booking?.discountAmount > 0 && (
              <div className="flex justify-between text-[#267A45] font-semibold">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>Coupon Discount ({booking?.coupon?.code})</span>
                </span>
                <span className="font-mono font-bold">
                  -₹{((booking?.discountAmount || 0) / 100).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span>GST / Tax ({booking?.taxRatePercentage || 18}%)</span>
              <span className="font-mono text-[#17231B] font-bold">
                ₹{((booking?.taxAmount || 0) / 100).toFixed(2)}
              </span>
            </div>

            <div className="pt-2 border-t border-[#E2E8E3] flex justify-between items-center text-sm font-black text-[#17231B]">
              <span>Amount Paid via Stripe</span>
              <span className="font-mono text-xl text-[#267A45]">
                ₹{((booking?.amountPaid || booking?.totalAmount || 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 print:hidden">
        <Link
          to="/"
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white border border-[#D7E0D9] hover:bg-[#F6F8F6] text-[#17231B] font-bold text-sm shadow-xs transition-all text-center inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4 text-[#267A45]" />
          <span>Back to Home</span>
        </Link>
        <Link
          to="/my-bookings"
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-sm shadow-xs transition-all text-center"
        >
          <span>View in My Bookings</span>
        </Link>
        <Link
          to="/turfs"
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white border border-[#D7E0D9] hover:bg-[#F6F8F6] text-[#17231B] font-bold text-sm shadow-xs transition-all text-center"
        >
          <span>Explore More Arenas</span>
        </Link>
      </div>
    </div>
  )
}

export default PaymentSuccessPage
