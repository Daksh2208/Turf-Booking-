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
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [cancelPreview, setCancelPreview] = useState(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)
  const [actionSuccessToast, setActionSuccessToast] = useState(null)

  const handleOpenCancelModal = async (booking) => {
    setCancellingBooking(booking)
    setCancelReason('')
    setCustomReason('')
    setCancelError('')
    setPreviewError('')
    setCancelPreview(null)
    setIsLoadingPreview(true)

    try {
      const data = await customerBookingService.getCancellationPreview(booking._id)
      setCancelPreview(data?.calculation || null)
    } catch (err) {
      setPreviewError(
        err.response?.data?.message ||
        err.message ||
        'Could not calculate live refund estimate. Standard policy applies.'
      )
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleCloseCancelModal = () => {
    if (isSubmittingCancel) return
    setCancellingBooking(null)
    setCancelPreview(null)
    setCancelReason('')
    setCustomReason('')
    setCancelError('')
    setPreviewError('')
  }

  const handleConfirmCancel = async (e) => {
    e?.preventDefault()
    if (!cancellingBooking) return
    setIsSubmittingCancel(true)
    setCancelError('')

    const effectiveReason =
      cancelReason === 'Other reason'
        ? (customReason.trim() || 'Other reason')
        : (cancelReason.trim() || 'Cancelled by customer')

    try {
      const updated = await customerBookingService.cancelBooking(cancellingBooking._id, {
        cancellationReason: effectiveReason,
      })
      setCancellingBooking(null)
      setCancelPreview(null)
      refetch()

      const refundNote =
        updated?.refundStatus === 'succeeded' || updated?.refundStatus === 'partially_refunded'
          ? ` Refund of ₹${((updated.refundAmount || 0) / 100).toFixed(2)} initiated via Stripe.`
          : updated?.refundStatus === 'not_required'
            ? ' No refund was due under the cancellation policy.'
            : ' Slot has been released.'

      setActionSuccessToast(`Booking ${cancellingBooking.bookingId} cancelled successfully.${refundNote}`)
      setTimeout(() => setActionSuccessToast(null), 6000)
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
    queryKey: ['myBookings', { page: currentPage, filter: activeFilter, date: selectedDate }],
    queryFn: () =>
      customerBookingService.getMyBookings({
        page: currentPage,
        limit: 8,
        filter: activeFilter,
        status: activeFilter,
        date: selectedDate,
      }),
    refetchInterval: 5000,
  })

  const bookings = data?.bookings || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  const counts = data?.counts || {}

  const filterTabs = [
    { label: 'All', value: 'all', countKey: 'all' },
    { label: 'Upcoming', value: 'upcoming', countKey: 'upcoming' },
    { label: 'Today', value: 'today', countKey: 'today' },
    { label: 'Past', value: 'past', countKey: 'past' },
    { label: 'Cancelled', value: 'cancelled', countKey: 'cancelled' },
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
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            <Clock3 className="w-3 h-3 text-[#B45309]" />
            <span>Expired</span>
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
            <AlertCircle className="w-3 h-3 text-[#DC2626]" />
            <span>Failed</span>
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

  const getRefundBadge = (booking) => {
    if (booking.status !== 'cancelled') return null
    const { refundStatus, refundAmount, paymentMethod, paymentStatus } = booking

    if (refundStatus === 'succeeded') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
          <CheckCircle2 className="w-2.5 h-2.5 text-[#267A45]" />
          <span>Refunded: ₹{((refundAmount || 0) / 100).toFixed(2)}</span>
        </span>
      )
    }
    if (refundStatus === 'partially_refunded') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]">
          <span>Partially Refunded: ₹{((refundAmount || 0) / 100).toFixed(2)}</span>
        </span>
      )
    }
    if (refundStatus === 'pending' || refundStatus === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#FDF4E7] text-[#79420D] border border-[#F8E3C5]">
          <Loader2 className="w-2.5 h-2.5 animate-spin text-[#79420D]" />
          <span>Refund Processing</span>
        </span>
      )
    }
    if (refundStatus === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#FDF0EF] text-[#922B27] border border-[#F8D2CE]">
          <AlertCircle className="w-2.5 h-2.5 text-[#922B27]" />
          <span>Refund Issue</span>
        </span>
      )
    }
    if (refundStatus === 'not_required') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-[#526258] bg-[#F0F2F0] border border-[#E2E8E3]">
          No Refund Due
        </span>
      )
    }
    if (refundStatus === 'not_applicable') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-[#526258] bg-[#F0F2F0] border border-[#E2E8E3]">
          {paymentMethod === 'stripe' && paymentStatus !== 'paid' ? 'Unpaid Session' : 'No Refund (Pay at Venue)'}
        </span>
      )
    }
    return null
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div className="p-4 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] text-[#1D6537] text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

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

      {/* Filter Tabs & Calendar Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E3] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {filterTabs.map((tab) => {
            const isSelected = activeFilter === tab.value
            const countVal = counts[tab.countKey]
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveFilter(tab.value)
                  if (tab.value === 'today') {
                    setSelectedDate('')
                  }
                  setCurrentPage(1)
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]'
                    : 'text-[#46564A] hover:text-[#17231B] bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1]'
                }`}
              >
                <span>{tab.label}</span>
                {typeof countVal === 'number' && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-[#267A45] text-white'
                        : 'bg-[#E2E8E3] text-[#526258]'
                    }`}
                  >
                    {countVal}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Calendar Date Picker Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-[#267A45] absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter bookings by date"
              className="pl-8.5 pr-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#D7E0D9] text-[#17231B] hover:border-[#267A45]/60 focus:outline-none focus:ring-2 focus:ring-[#267A45]/20 focus:border-[#267A45] transition-all cursor-pointer shadow-2xs"
              title="Filter bookings by date"
            />
          </div>
          {selectedDate && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate('')
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F0F2F0] hover:bg-[#E2E8E3] text-[#526258] transition-colors cursor-pointer"
              title="Clear date filter"
            >
              Clear Date
            </button>
          )}
        </div>
      </div>

      {/* Active Calendar Date Filter Banner */}
      {selectedDate && (
        <div className="px-4 py-2.5 rounded-2xl bg-[#F0F6F1] border border-[#C9DFCE] text-xs font-semibold text-[#1D6537] flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#267A45] shrink-0" />
            <span>
              Showing matches on{' '}
              <strong className="font-bold underline">
                {new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedDate('')
              setCurrentPage(1)
            }}
            className="text-[11px] font-bold text-[#267A45] hover:underline cursor-pointer"
          >
            Show All Dates
          </button>
        </div>
      )}

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
              {activeFilter === 'upcoming'
                ? 'You have no upcoming matches scheduled. Time to book a game!'
                : activeFilter === 'today'
                ? 'No matches scheduled for today. Ready to hit the pitch?'
                : activeFilter === 'past'
                ? 'You have no completed match history yet.'
                : activeFilter === 'cancelled'
                ? 'You have no cancelled bookings.'
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
                          {booking.durationMinutes ? `${booking.durationMinutes}m` : '60m'}
                        </span>
                        <span className="text-[#D7E0D9]">•</span>
                        <span>{booking.playerCount || 10} Players</span>
                      </div>
                    </div>

                    {/* Cancellation details box */}
                    {booking.status === 'cancelled' && (
                      <div className="p-2.5 rounded-2xl bg-[#FDF0EF] border border-[#F8D2CE] text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-[#922B27] font-semibold">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Cancellation Details</span>
                          {booking.cancelledAt && (
                            <span className="text-[10px] font-normal text-[#526258]">
                              • {new Date(booking.cancelledAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        {booking.cancellationReason && (
                          <p className="text-[11px] text-[#526258] italic pl-5">
                            "{booking.cancellationReason}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Expired details box */}
                    {booking.status === 'expired' && (
                      <div className="p-2.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-[#92400E] font-semibold">
                          <Clock3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Reservation Window Expired</span>
                        </div>
                        <p className="text-[11px] text-[#78350F] pl-5">
                          {booking.paymentFailureReason || 'Temporary reservation expired before payment confirmation.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Total & Action */}
                  <div className="pt-3 border-t border-[#E2E8E3] flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#526258] block">
                        Total Amount
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black font-mono text-[#17231B]">
                          ₹{(booking.totalAmount / 100).toFixed(2)}
                        </span>
                        {getPaymentBadge(booking.paymentStatus, booking.paymentMethod)}
                        {getRefundBadge(booking)}
                      </div>
                    </div>

                    {booking.status === 'cancelled' || booking.status === 'expired' || booking.status === 'failed' ? (
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
                    ) : booking.status === 'completed' ? (
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/bookings/success/${booking._id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#1B4E82] text-xs font-semibold border border-[#BFDBFE] transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>View Pass</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#1B4E82]" />
                        </Link>
                        {booking.turf && (
                          <Link
                            to={`/turfs/${booking.turf.slug || booking.turf._id}`}
                            className="px-3 py-1.5 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Book this arena again"
                          >
                            <span>Book Again</span>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {booking.canCancel !== false && (
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
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs">
          {/* Booking Summary Card */}
          <div className="p-3.5 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#17231B] text-sm">
                {cancellingBooking?.turf?.name || 'Turf Arena'}
              </span>
              <span className="text-[11px] font-semibold text-[#267A45] bg-[#E7F3E9] px-2 py-0.5 rounded-md">
                {cancellingBooking?.sport?.name || 'Sport Arena'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[#526258] pt-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#526258] block">Date & Slots</span>
                <p className="font-semibold text-[#17231B]">{cancellingBooking?.date}</p>
                <p className="font-mono text-[11px] text-[#267A45]">
                  {cancellingBooking?.selectedSlots?.length
                    ? cancellingBooking.selectedSlots.join(', ')
                    : `${cancellingBooking?.startTime} - ${cancellingBooking?.endTime}`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#526258] block">Payment Method</span>
                <p className="font-semibold text-[#17231B] capitalize">
                  {cancellingBooking?.paymentMethod === 'stripe' ? 'Stripe Online Payment' : 'Pay at Venue'}
                </p>
                <p className="font-mono font-bold text-sm text-[#17231B]">
                  ₹{((cancellingBooking?.totalAmount || 0) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Refund Calculation & Policy Banner */}
          {isLoadingPreview ? (
            <div className="p-4 rounded-2xl bg-[#F0F6F1] border border-[#C9DFCE] flex items-center justify-center gap-2 text-[#267A45] font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating cancellation policy and refund estimate...</span>
            </div>
          ) : cancelPreview ? (
            <div className="space-y-3">
              {/* Category Banner */}
              {cancelPreview.refundType === 'full' && (
                <div className="p-3 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] text-[#1D6537] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#267A45]" />
                  <div>
                    <p className="font-bold">Full Refund Eligible (100%)</p>
                    <p className="text-[11px] text-[#2A5E35] mt-0.5">
                      You are cancelling well in advance. You are eligible for a complete 100% refund of your payment.
                    </p>
                  </div>
                </div>
              )}

              {cancelPreview.refundType === 'partial' && (
                <div className="p-3 rounded-2xl bg-[#FDF4E7] border border-[#F8E3C5] text-[#79420D] flex items-start gap-2.5">
                  <Clock3 className="w-4 h-4 shrink-0 mt-0.5 text-[#79420D]" />
                  <div>
                    <p className="font-bold">Partial Refund Eligible ({cancelPreview.refundPercentage}%)</p>
                    <p className="text-[11px] text-[#79420D] mt-0.5">
                      Under facility cancellation policy, a {cancelPreview.refundPercentage}% partial refund is eligible.
                    </p>
                  </div>
                </div>
              )}

              {cancelPreview.refundType === 'zero' && (
                <div className="p-3 rounded-2xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#922B27]" />
                  <div>
                    <p className="font-bold">No Refund Due (0%)</p>
                    <p className="text-[11px] text-[#922B27] mt-0.5">
                      You may cancel this booking to release the slot, but no refund will be issued under the venue policy.
                    </p>
                  </div>
                </div>
              )}

              {(cancelPreview.refundType === 'not_applicable' || cancelPreview.refundType === 'not_required') && (
                <div className="p-3 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1B4E82] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#1B4E82]" />
                  <div>
                    <p className="font-bold">Pay at Venue Booking</p>
                    <p className="text-[11px] text-[#1B4E82] mt-0.5">
                      No online payment was charged. Cancelling will simply release the slot back to the public.
                    </p>
                  </div>
                </div>
              )}

              {/* Financial Breakdown Table */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#D7E0D9] space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-[#E2E8E3]">
                  <span className="text-[#526258]">Original Booking Amount:</span>
                  <span className="font-mono font-bold text-[#17231B]">
                    ₹{((cancelPreview.originalAmount || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-[#E2E8E3]">
                  <span className="text-[#526258]">Eligible Refund Amount:</span>
                  <span className="font-mono font-black text-sm text-[#267A45]">
                    ₹{((cancelPreview.eligibleRefundAmount || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#526258]">Non-Refundable Amount:</span>
                  <span className="font-mono font-semibold text-[#922B27]">
                    ₹{((cancelPreview.nonRefundableAmount || 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Explanation & Disclaimer */}
              <div className="p-2.5 rounded-xl bg-[#F6F8F6] text-[11px] text-[#526258] space-y-1">
                <p>
                  <strong className="text-[#17231B]">Policy:</strong> {cancelPreview.policyExplanation}
                </p>
                <p className="text-[10px] text-[#718277]">
                  * The refund shown is an authoritative estimate based on your current cancellation time. Online refunds will be returned via Stripe to your original payment method.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[#526258] leading-relaxed">
              Are you sure you want to cancel this booking? Cancelling will immediately release this slot back to general availability.
            </p>
          )}

          {previewError && (
            <div className="p-3 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0 mt-0.5" />
              <span>{previewError}</span>
            </div>
          )}

          {/* Cancellation Reason */}
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
              <option value="Emergency or personal conflict">Emergency or personal conflict</option>
              <option value="Other reason">Other reason</option>
            </select>

            {cancelReason === 'Other reason' && (
              <input
                type="text"
                placeholder="Please describe reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full mt-2 bg-white text-xs text-[#17231B] px-3 py-2 rounded-xl border border-[#D7E0D9] focus:outline-none focus:border-[#267A45]"
              />
            )}
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
              disabled={isSubmittingCancel || (cancelPreview && !cancelPreview.canCustomerCancel)}
              className="px-4 py-2 rounded-xl bg-[#922B27] hover:bg-[#7A1E1A] text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmittingCancel ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Cancellation...</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default MyBookingsPage
