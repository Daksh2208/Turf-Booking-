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
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useApi'
import customerBookingService from '../../services/customer/booking.service'

export const MyBookingsPage = () => {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

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

  const getPaymentBadge = (paymentStatus) => {
    if (paymentStatus === 'paid') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
          Paid
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
            My Bookings
          </h1>
          <p className="text-xs sm:text-sm text-[#526258] mt-1">
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
                        {getPaymentBadge(booking.paymentStatus)}
                      </div>
                    </div>

                    <Link
                      to={`/bookings/success/${booking._id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F0F6F1] text-[#17231B] text-xs font-semibold border border-[#D7E0D9] transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>View Pass</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#267A45]" />
                    </Link>
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
    </div>
  )
}

export default MyBookingsPage
