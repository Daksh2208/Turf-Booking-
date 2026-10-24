import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  ChevronRight,
  Loader2,
  AlertCircle,
  Trophy,
  Filter,
  CheckCircle2,
  Clock3,
  XCircle,
  ExternalLink,
} from 'lucide-react'
import { useQuery } from '../../hooks/useApi'
import customerBookingService from '../../services/customer/booking.service'

export const MyBookingsPage = () => {
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

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
    refetchInterval: 5000, // Sync status live (e.g. if admin marks completed or cancelled)
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Confirmed</span>
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Trophy className="w-3 h-3" />
            <span>Completed</span>
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock3 className="w-3 h-3" />
            <span>{status || 'Pending'}</span>
          </span>
        )
    }
  }

  const getPaymentBadge = (paymentStatus, paymentMethod) => {
    if (paymentStatus === 'paid') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Paid
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">
        Pay at Venue ({paymentStatus || 'Unpaid'})
      </span>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Bookings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track your reserved match slots, review passes, and view payment details.
          </p>
        </div>

        <Link
          to="/turfs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Trophy className="w-4 h-4" />
          <span>Book a New Turf</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
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
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List Content */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span>Loading your match bookings...</span>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Failed to load bookings</h2>
          <p className="text-xs text-rose-300">
            {error?.response?.data?.error?.message || 'Unable to retrieve your booking records.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-slate-900 text-xs font-semibold text-white border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/50 border border-slate-800/80 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">No Bookings Found</h2>
            <p className="text-xs text-slate-400 mt-1">
              {statusFilter
                ? `You have no ${statusFilter} bookings.`
                : "You haven't reserved any turf match slots yet. Ready to hit the pitch?"}
            </p>
          </div>
          <Link
            to="/turfs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
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
                  className="p-5 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Ref & Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">
                        {booking.bookingId}
                      </span>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>

                    {/* Turf Name & Address */}
                    <div>
                      <h2 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {booking.turf?.name || 'Turf Arena'}
                      </h2>
                      {booking.turf?.address && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">
                            {booking.turf.address.street}, {booking.turf.address.city}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Date & Time Slot & Squad */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-slate-200">{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-slate-200">
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-emerald-400 font-bold">
                          {booking.durationMinutes ? `${Math.round(booking.durationMinutes / 60)}h` : '1h'}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>{booking.playerCount || 10} Players</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Total & Action */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Total Amount
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black font-mono text-white">
                          ₹{(booking.totalAmount / 100).toFixed(2)}
                        </span>
                        {getPaymentBadge(booking.paymentStatus, booking.paymentMethod)}
                      </div>
                    </div>

                    <Link
                      to={`/bookings/success/${booking._id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/60 transition-all inline-flex items-center gap-1.5"
                    >
                      <span>View Pass</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
              <span>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total bookings)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
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
