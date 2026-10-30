import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
  AlertCircle,
  Trophy,
  CheckCircle2,
  Clock3,
  XCircle,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useApi'
import customerBookingService from '../../services/customer/booking.service'
import { Modal } from '../../components/common/Modal'

export const MyBookingsPage = () => {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

  const handleOpenCancelModal = (booking) => {
    setCancellingBooking(booking)
    setCancelReason('')
    setCancelError('')
  }

  const handleCloseCancelModal = () => {
    if (isSubmittingCancel) return
    setCancellingBooking(null)
    setCancelReason('')
    setCancelError('')
  }

  const handleConfirmCancel = async (e) => {
    e?.preventDefault()
    if (!cancellingBooking) return
    setIsSubmittingCancel(true)
    setCancelError('')
    try {
      await customerBookingService.cancelBooking(cancellingBooking._id, {
        cancellationReason: cancelReason.trim() || 'Cancelled by customer',
      })
      setCancellingBooking(null)
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

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['myBookings', { page: currentPage, status: statusFilter }],
    queryFn: () =>
      customerBookingService.getMyBookings({
        page: currentPage,
        limit: 8,
        status: statusFilter,
      }),
    refetchInterval: 5000,
  })

  const bookings = data?.bookings || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  const statusTabs = [
    { label: 'All Bookings', value: '' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
            <CheckCircle2 className="w-3 h-3 text-[#267A45]" />
            <span>Confirmed</span>
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#1B4E82] border border-[#BFDBFE]">
            <Trophy className="w-3 h-3 text-[#1B4E82]" />
            <span>Completed</span>
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FDF0EF] text-[#922B27] border border-[#F8D2CE]">
            <XCircle className="w-3 h-3 text-[#922B27]" />
            <span>Cancelled</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FDF4E7] text-[#79420D] border border-[#F6E1C4]">
            <Clock3 className="w-3 h-3 text-[#79420D]" />
            <span>{status || 'Pending'}</span>
          </span>
        )
    }
  }

  const getPaymentBadge = (paymentStatus, paymentMethod) => {
    const isStripe = paymentMethod === 'stripe'
    if (paymentStatus === 'paid') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
          {isStripe ? 'Paid (Stripe)' : 'Paid'}
        </span>
      )
    }
    if (paymentStatus === 'refunded') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#EFF6FF] text-[#1B4E82] border border-[#BFDBFE]">
          Refunded
        </span>
      )
    }
    if (paymentStatus === 'failed') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#FDF0EF] text-[#922B27] border border-[#F8D2CE]">
          Payment Failed
        </span>
      )
    }
    if (paymentStatus === 'pending') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#FDF4E7] text-[#79420D] border border-[#F6E1C4]">
          {isStripe ? 'Stripe (Pending)' : 'Pending'}
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#FDF4E7] text-[#79420D] border border-[#F6E1C4]">
        Pay at Venue ({paymentStatus || 'Unpaid'})
      </span>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0F6F1] text-xs font-semibold text-[#526258] hover:text-[#267A45] border border-[#D7E0D9] shadow-2xs transition-all w-fit group cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#267A45] group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
            My Bookings
          </h1>
          <p className="text-xs sm:text-sm text-[#526258]">
            Track your reserved match slots, review passes, and view payment details.
          </p>
        </div>

        <Link
          to="/turfs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-xs shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Trophy className="w-4 h-4" />
          <span>Book a New Turf</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8E3] pb-3">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatusFilter(tab.value)
              setCurrentPage(1)
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === tab.value
                ? 'bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]'
                : 'text-[#46564A] hover:text-[#17231B] bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List Content */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-[#526258] text-xs">
          <Loader2 className="w-8 h-8 text-[#267A45] animate-spin" />
          <span>Loading your match bookings...</span>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-3xl bg-[#FDF0EF] border border-[#F8D2CE] text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-[#922B27] mx-auto" />
          <h2 className="text-base font-bold text-[#17231B]">Failed to load bookings</h2>
          <p className="text-xs text-[#922B27]">
            {error?.response?.data?.error?.message || 'Unable to retrieve your booking records.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-white text-xs font-semibold text-[#17231B] border border-[#D7E0D9] hover:bg-[#F0F6F1] transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-[#D7E0D9] text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#17231B]">No Bookings Found</h2>
            <p className="text-xs text-[#526258] mt-1">
              {statusFilter
                ? `You have no ${statusFilter} bookings.`
                : "You haven't reserved any turf match slots yet. Ready to hit the pitch?"}
            </p>
          </div>
          <Link
            to="/turfs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-xs shadow-xs transition-all"
          >
            <span>Explore Turfs</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map((booking) => {
              const formattedDate = booking.date
                ? new Date(booking.date + 'T00:00:00Z').toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })
                : booking.date

              return (
                <div
                  key={booking._id}
                  className="p-5 rounded-3xl bg-white hover:border-[#267A45]/60 border border-[#D7E0D9] transition-all shadow-xs flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Ref & Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#267A45] tracking-wider">
                        {booking.bookingId}
                      </span>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>

                    {/* Turf Name & Address */}
                    <div>
                      <h2 className="text-base font-bold text-[#17231B] group-hover:text-[#267A45] transition-colors">
                        {booking.turf?.name || 'Turf Arena'}
                      </h2>
                      {booking.turf?.address && (
                        <p className="text-xs text-[#46564A] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#267A45] shrink-0" />
                          <span className="truncate">
                            {booking.turf.address.street}, {booking.turf.address.city}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Date & Time Slot & Squad */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#267A45] shrink-0" />
                        <span className="text-[#17231B] font-medium">{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <Clock className="w-3.5 h-3.5 text-[#267A45] shrink-0" />
                        <span className="text-[#17231B] font-medium">
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#46564A]">
                        <span className="text-[#267A45] font-bold">
                          {booking.durationMinutes ? `${Math.round(booking.durationMinutes / 60)}h` : '1h'}
                        </span>
                        <span className="text-[#D7E0D9]">•</span>
                        <span>{booking.playerCount || 10} Players</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Total & Action */}
                  <div className="pt-3 border-t border-[#E2E8E3] flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#526258] block">
                        Total Amount
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black font-mono text-[#17231B]">
                          ₹{(booking.totalAmount / 100).toFixed(2)}
                        </span>
                        {getPaymentBadge(booking.paymentStatus, booking.paymentMethod)}
                      </div>
                    </div>

                    {booking.status === 'cancelled' || booking.paymentStatus === 'failed' ? (
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/bookings/success/${booking._id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FDF0EF] text-[#526258] hover:text-[#922B27] text-xs font-semibold border border-[#D7E0D9] hover:border-[#F8D2CE] transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#526258]" />
                        </Link>
                        {booking.turf && (
                          <Link
                            to={`/turfs/${booking.turf.slug || booking.turf._id}`}
                            className="px-3 py-1.5 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Rebook this arena"
                          >
                            <span>Rebook</span>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {(booking.status === 'confirmed' || booking.status === 'pending') && (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(booking)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FDF0EF] text-[#922B27] text-xs font-semibold border border-[#F8D2CE] transition-all cursor-pointer"
                            title="Cancel this booking"
                          >
                            <span>Cancel</span>
                          </button>
                        )}
                        <Link
                          to={`/bookings/success/${booking._id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F0F6F1] text-[#17231B] text-xs font-semibold border border-[#D7E0D9] transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>View Pass</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#267A45]" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#E2E8E3] text-xs text-[#526258]">
              <span>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total bookings)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1] disabled:opacity-40 disabled:cursor-not-allowed text-[#17231B] transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1] disabled:opacity-40 disabled:cursor-not-allowed text-[#17231B] transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancellation Modal Dialog */}
      <Modal
        isOpen={Boolean(cancellingBooking)}
        onClose={handleCloseCancelModal}
        title="Cancel Match Booking"
        subtitle={`Booking Reference: ${cancellingBooking?.bookingId || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] text-xs space-y-1.5">
            <p className="font-bold text-[#17231B]">
              {cancellingBooking?.turf?.name || 'Turf Arena'}
            </p>
            <p className="text-[#526258]">
              Date: <strong className="text-[#17231B]">{cancellingBooking?.date}</strong> • Slot:{' '}
              <strong className="text-[#17231B]">
                {cancellingBooking?.startTime} - {cancellingBooking?.endTime}
              </strong>
            </p>
            <p className="text-[#526258]">
              Total Amount:{' '}
              <strong className="text-[#267A45] font-mono">
                ₹{((cancellingBooking?.totalAmount || 0) / 100).toFixed(2)}
              </strong>
            </p>
          </div>

          <p className="text-xs text-[#526258] leading-relaxed">
            Are you sure you want to cancel this booking? Cancelling will release this match slot back to general availability.
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
              onClick={handleCloseCancelModal}
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

export default MyBookingsPage
