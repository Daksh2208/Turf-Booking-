import React, { useEffect, useState } from 'react'
import { useSearchParams, Link, Navigate } from 'react-router-dom'
import {
  XCircle,
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import customerPaymentService from '../../services/customer/payment.service'

export const PaymentCancelledPage = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('booking_id')
  const [cancelling, setCancelling] = useState(false)

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  useEffect(() => {
    if (bookingId) {
      setCancelling(true)
      customerPaymentService
        .cancelPendingBooking(bookingId)
        .catch(() => {})
        .finally(() => setCancelling(false))
    }
  }, [bookingId])

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#FDF0EF] border-2 border-[#F8D2CE] flex items-center justify-center text-[#922B27] shadow-xs">
        <XCircle className="w-10 h-10 sm:w-12 sm:h-12" />
      </div>

      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FDF0EF] text-[#922B27] border border-[#F8D2CE] mb-2">
          <span>Payment Cancelled</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
          Checkout Was Cancelled
        </h1>
        <p className="text-xs sm:text-sm text-[#526258] max-w-md mx-auto mt-2">
          Your card was not charged. The temporary slot reservation has been safely released back to the calendar.
        </p>
      </div>

      {cancelling && (
        <div className="flex items-center justify-center gap-2 text-xs text-[#526258]">
          <Loader2 className="w-4 h-4 animate-spin text-[#267A45]" />
          <span>Releasing temporary slot reservation...</span>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] text-xs text-[#526258] max-w-md mx-auto text-left space-y-1">
        <p className="font-bold text-[#17231B]">Need to book with Pay at Venue instead?</p>
        <p>You can return to the arena page and select "Pay at Venue" to confirm your booking instantly without advance online payment.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to="/turfs"
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Browse Available Arenas</span>
        </Link>
        <Link
          to="/my-bookings"
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white border border-[#D7E0D9] hover:bg-[#F6F8F6] text-[#17231B] font-bold text-sm shadow-xs transition-all text-center"
        >
          <span>My Bookings</span>
        </Link>
      </div>
    </div>
  )
}

export default PaymentCancelledPage
