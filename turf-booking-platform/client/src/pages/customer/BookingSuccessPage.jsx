import React, { useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
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
  CreditCard,
  User,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  Trophy,
} from 'lucide-react'
import { useQuery } from '../../hooks/useApi'
import customerBookingService from '../../services/customer/booking.service'

export const BookingSuccessPage = () => {
  const { id } = useParams()
  const location = useLocation()
  const [copied, setCopied] = useState(false)

  // Fetch verified booking from backend (never rely solely on client state)
  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['bookingDetail', id],
    queryFn: () => customerBookingService.getBookingById(id),
    enabled: !!id,
    initialData: location.state?.booking,
  })

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <span>Loading verified booking details...</span>
      </div>
    )
  }

  if (isError || !booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
          Booking Not Found
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {error?.response?.data?.error?.message ||
            'We could not locate this booking. It may belong to another account or does not exist.'}
        </p>
        <Link
          to="/my-bookings"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold border border-slate-800 transition-all"
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 print:py-0 print:px-0">
      {/* Top Banner: Success Header */}
      <div className="text-center space-y-3 print:hidden">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce-short">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Booking Confirmed!
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Your match slot has been successfully reserved. We have registered your Pay at Venue booking.
        </p>
      </div>

      {/* Main Booking Pass / Receipt Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl space-y-0">
        {/* Pass Header */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Booking Reference
            </span>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-wider">{booking.bookingId}</span>
              <button
                type="button"
                onClick={copyBookingId}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors print:hidden cursor-pointer"
                title="Copy Reference"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {booking.status}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {booking.paymentStatus === 'unpaid' ? 'Pay at Venue (Unpaid)' : booking.paymentStatus}
            </span>
          </div>
        </div>

        {/* Arena & Time Details */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Sports Arena
              </span>
              <h2 className="text-lg font-black text-white mt-0.5">
                {booking.turf?.name || 'Sports Turf Arena'}
              </h2>
              {booking.turf?.address && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    {booking.turf.address.street}, {booking.turf.address.city}
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Date
                </span>
                <span className="text-xs font-semibold text-white mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formattedDate}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Time Slot
                </span>
                <span className="text-xs font-semibold text-white mt-1 flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {booking.startTime} - {booking.endTime}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details Snapshot */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Booked For
              </span>
              <span className="font-semibold text-slate-200 mt-0.5 block">
                {booking.contactDetails?.name || booking.user?.name}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Email
              </span>
              <span className="font-semibold text-slate-300 mt-0.5 block truncate">
                {booking.contactDetails?.email || booking.user?.email}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Phone
              </span>
              <span className="font-semibold text-slate-300 mt-0.5 block font-mono">
                {booking.contactDetails?.phone || booking.user?.phone || 'N/A'}
              </span>
            </div>
          </div>

          {/* Itemized Price Snapshot */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Snapshot Price Breakdown</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>
                  Turf Slot ({booking.startTime} - {booking.endTime})
                </span>
                <span className="font-mono text-white">
                  ₹{(booking.slotPrice / 100).toFixed(2)}
                </span>
              </div>

              {booking.addOns && booking.addOns.length > 0 && (
                <div className="space-y-1.5 pl-2 border-l border-slate-800">
                  {booking.addOns.map((addon, idx) => (
                    <div key={idx} className="flex justify-between text-slate-400">
                      <span>
                        {addon.name} × {addon.quantity}
                      </span>
                      <span className="font-mono text-white">
                        ₹{(addon.totalPrice / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800/80">
                <span>Subtotal</span>
                <span className="font-mono text-white">
                  ₹{(booking.subtotal / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>GST ({booking.taxRatePercentage}%)</span>
                <span className="font-mono text-white">
                  ₹{(booking.taxAmount / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <div>
                  <span className="text-sm font-bold text-white block">Final Total</span>
                  <span className="text-[10px] text-amber-400">Payable at arena desk</span>
                </div>
                <span className="text-xl sm:text-2xl font-mono font-black text-emerald-400">
                  ₹{(booking.totalAmount / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <p className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>What's Next?</span>
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              1. Arrive at least 15 minutes before your match time at {booking.turf?.name || 'the arena'}.<br />
              2. Show your Booking Reference <strong className="text-emerald-400 font-mono">{booking.bookingId}</strong> at the reception desk.<br />
              3. Settle ₹{(booking.totalAmount / 100).toFixed(2)} via Cash or UPI and start playing!
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          to="/my-bookings"
          className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all inline-flex items-center gap-2"
        >
          <span>View in My Bookings</span>
          <ChevronRight className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Print Receipt</span>
          </button>

          <Link
            to="/turfs"
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 transition-all inline-flex items-center gap-1.5"
          >
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Book Another Turf</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default BookingSuccessPage
