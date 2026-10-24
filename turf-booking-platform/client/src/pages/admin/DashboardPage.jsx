import React, { useState } from 'react'
import { useQuery } from '../../hooks/useApi'
import { Link } from 'react-router-dom'
import {
  Calendar,
  IndianRupee,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  Check,
  Globe,
  Receipt,
  RefreshCw,
  ExternalLink,
  Radio,
  Eye,
} from 'lucide-react'
import adminInventoryService from '../../services/admin/inventory.service'

/**
 * Format raw paise into Indian Rupees with .00 decimals
 */
const formatPrice = (amountInPaise = 0) => {
  const rupees = (Number(amountInPaise) || 0) / 100
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const DashboardPage = () => {
  // View mode: 'today' (live daily tracker) vs 'all' (historical overview)
  const [viewMode, setViewMode] = useState('today')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => adminInventoryService.getDashboard(),
    refetchInterval: 15000, // Auto-refresh live every 15 seconds
  })

  const metrics = data?.metrics || {
    todayBookings: 0,
    todayRevenue: 0,
    todayTotalBookingValue: 0,
    todayUnpaidValue: 0,
    todayCustomersCount: 0,
    newCustomersToday: 0,
    totalUsers: 0,
    freeSlotsToday: 0,
    totalPossibleSlotsToday: 0,
    totalOccupiedSlotsToday: 0,
    activeTurfsCount: 0,
  }

  const timezone = data?.timezone || 'Asia/Kolkata'
  const todayDate = data?.today || new Date().toISOString().slice(0, 10)
  const todaySchedule = data?.todaySchedule || []
  const recentBookings = data?.recentBookings || []

  // Active status & payment breakdowns depending on view mode
  const isDaily = viewMode === 'today'
  const statusBreakdown = isDaily
    ? data?.statusBreakdown || { confirmed: 0, pending: 0, completed: 0, cancelled: 0 }
    : data?.allTimeStatusBreakdown || { confirmed: 0, pending: 0, completed: 0, cancelled: 0 }

  const paymentBreakdown = isDaily
    ? data?.paymentBreakdown || { paid: { count: 0, amount: 0 }, unpaid: { count: 0, amount: 0 } }
    : data?.allTimePaymentBreakdown || { paid: { count: 0, amount: 0 }, unpaid: { count: 0, amount: 0 } }

  // Choose which table data to show
  const activeTableBookings = isDaily ? todaySchedule : recentBookings

  // Pretty format for today's date
  let formattedDateHeader = todayDate
  try {
    const d = new Date(todayDate + 'T00:00:00')
    formattedDateHeader = d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    formattedDateHeader = todayDate
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Timer className="w-3 h-3" />
            Pending
          </span>
        )
    }
  }

  const getPaymentBadge = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Check className="w-2.5 h-2.5" />
            Paid
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-2.5 h-2.5" />
            Unpaid
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Top Header with Live Indicator & Date */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Live Operations Tracker
            </h1>

            {/* Pulsing Live Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TODAY
            </span>

            {/* Timezone and Current Date */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formattedDateHeader}</span>
              <span className="text-slate-400">• {timezone}</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Real-time daily operations feed tracking today's arena schedule, revenue collections, and slot occupancy.
          </p>
        </div>

        {/* View Switcher Tabs & Live Refresh Button */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Day / All View Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'today'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Today's Live Data
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All-Time Summary
            </button>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh Live Operations Data"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Core Daily KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Today's Bookings */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today's Bookings
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isLoading ? '...' : metrics.todayBookings}
            </span>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Active today across all turfs</span>
              <Link to="/admin/bookings" className="text-emerald-400 hover:underline font-semibold">
                See all
              </Link>
            </div>
          </div>
        </div>

        {/* Metric 2: Today's Revenue */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today's Collected Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isLoading ? '...' : `₹${formatPrice(metrics.todayRevenue)}`}
            </span>
            <p className="text-[11px] text-teal-400/90 mt-1 font-medium">
              Confirmed paid receipts today
            </p>
          </div>
        </div>

        {/* Metric 3: Today's Players / Customers */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Players Scheduled Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isLoading ? '...' : (metrics.todayCustomersCount || metrics.todayBookings)}
            </span>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>{metrics.totalUsers} total registered</span>
              <Link to="/admin/customers" className="text-blue-400 hover:underline font-semibold">
                See all
              </Link>
            </div>
          </div>
        </div>

        {/* Metric 4: Free Slots Today */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Available Slots Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isLoading ? '...' : metrics.freeSlotsToday}
            </span>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>{metrics.totalOccupiedSlotsToday} slots booked today</span>
              <Link to="/admin/turfs" className="text-amber-400 hover:underline font-semibold">
                View turfs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Financial Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">
              Today's Gross Booking Value
            </span>
            <span className="text-xl font-black text-white mt-1 block">
              ₹{formatPrice(metrics.todayTotalBookingValue)}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Total value of all {metrics.todayBookings} active reservations scheduled for today
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-amber-400 block">
              Unpaid Pay at Venue (Today)
            </span>
            <span className="text-xl font-black text-amber-300 mt-1 block">
              ₹{formatPrice(metrics.todayUnpaidValue)}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pending desk payment at counter check-in today
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Today's Booking Status & Payment Realization Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {isDaily ? "Today's Booking Status Breakdown" : 'All-Time Booking Status Breakdown'}
              </h3>
            </div>
            <Link to="/admin/bookings" className="text-[11px] text-emerald-400 hover:underline font-semibold">
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <span className="text-[11px] text-emerald-400 font-semibold block">Confirmed</span>
              <span className="text-xl font-black text-white mt-0.5 block">
                {statusBreakdown.confirmed || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
              <span className="text-[11px] text-amber-400 font-semibold block">Pending</span>
              <span className="text-xl font-black text-white mt-0.5 block">
                {statusBreakdown.pending || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
              <span className="text-[11px] text-blue-400 font-semibold block">Completed</span>
              <span className="text-xl font-black text-white mt-0.5 block">
                {statusBreakdown.completed || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-center">
              <span className="text-[11px] text-rose-400 font-semibold block">Cancelled</span>
              <span className="text-xl font-black text-white mt-0.5 block">
                {statusBreakdown.cancelled || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-3.5 h-3.5 text-teal-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {isDaily ? "Today's Payment Realization" : 'All-Time Payment Realization'}
              </h3>
            </div>
            <Link to="/admin/bookings" className="text-[11px] text-teal-400 hover:underline font-semibold">
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[11px] text-emerald-400 font-bold block uppercase">
                Paid In Full
              </span>
              <span className="text-lg sm:text-xl font-black text-white mt-0.5 block">
                ₹{formatPrice(paymentBreakdown.paid?.amount || 0)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {paymentBreakdown.paid?.count || 0} Paid Bookings
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[11px] text-amber-400 font-bold block uppercase">
                Pay at Venue (Unpaid)
              </span>
              <span className="text-lg sm:text-xl font-black text-white mt-0.5 block">
                ₹{formatPrice(paymentBreakdown.unpaid?.amount || 0)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {paymentBreakdown.unpaid?.count || 0} Desk Collections
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Live Schedule / Reservations Table */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isDaily ? "Today's Live Arena Schedule" : 'Recent Booking Feed'}</span>
                {isDaily && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {todaySchedule.length} slots scheduled today
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {isDaily
                  ? "Live chronological timeline of today's customer sessions across all arenas."
                  : 'Latest bookings recorded in the system.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/bookings"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all flex items-center gap-1.5 group cursor-pointer"
            >
              <span>See All Bookings</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {activeTableBookings.length === 0 ? (
          <div className="p-10 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              {isDaily
                ? 'No arena reservations scheduled for today.'
                : 'No bookings recorded in the database.'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isDaily
                ? 'All arena slots are currently free for booking. When players reserve slots for today, they will track live here.'
                : 'Player bookings will appear here once placed.'}
            </p>
            <div className="pt-2">
              <Link
                to="/admin/bookings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                <span>Browse All Dates & Historical Bookings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Arena</th>
                  <th className="px-4 py-3">Time Slot</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
                {activeTableBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      {b.bookingId}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      <div>
                        <span>{b.user?.name || b.customerDetails?.name || 'Customer'}</span>
                        {b.customerDetails?.phone && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {b.customerDetails.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium">
                      {b.turf?.name || 'Arena'}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-medium">
                      <span className="text-emerald-400 font-semibold">{b.startTime} - {b.endTime}</span>
                      {!isDaily && <span className="text-slate-400 text-[10px] block">{b.date}</span>}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-400">
                      ₹{formatPrice(b.totalAmount || 0)}
                    </td>
                    <td className="px-4 py-3">
                      {getPaymentBadge(b.paymentStatus)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/admin/bookings"
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Manage booking"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Manage</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
