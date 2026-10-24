import React from 'react'
import { useQuery } from '../../hooks/useApi'
import { Link } from 'react-router-dom'
import {
  Calendar,
  IndianRupee,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  Shield,
  Activity,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  Check,
  Globe,
  Receipt,
  CreditCard,
} from 'lucide-react'
import adminInventoryService from '../../services/admin/inventory.service'

export const DashboardPage = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => adminInventoryService.getDashboard(),
  })

  const metrics = data?.metrics || {
    todayBookings: 0,
    todayRevenue: 0,
    todayRevenueFormatted: '₹0.00',
    todayTotalBookingValue: 0,
    todayTotalBookingValueFormatted: '₹0.00',
    todayUnpaidValue: 0,
    todayUnpaidValueFormatted: '₹0.00',
    totalUsers: 0,
    freeSlotsToday: 0,
    totalPossibleSlotsToday: 0,
    totalOccupiedSlotsToday: 0,
    activeTurfsCount: 0,
  }

  const timezone = data?.timezone || 'Asia/Kolkata'
  const todayDate = data?.today || new Date().toISOString().slice(0, 10)
  const recentBookings = data?.recentBookings || []
  const statusBreakdown = data?.statusBreakdown || {
    confirmed: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  }
  const paymentBreakdown = data?.paymentBreakdown || {
    paid: { count: 0, amount: 0 },
    unpaid: { count: 0, amount: 0 },
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Arena Operations Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <Globe className="w-3 h-3 text-emerald-400" />
              {timezone} • {todayDate}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time occupancy, collected revenue, customer volume, and live slot availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/bookings"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <span>Manage All Bookings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 4 Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Today's Bookings */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition-colors shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today's Bookings
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-white tracking-tight">
              {isLoading ? '...' : metrics.todayBookings}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Active non-cancelled slots today</p>
          </div>
        </div>

        {/* Metric 2: Today's Collected Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-3 relative overflow-hidden group hover:border-teal-500/40 transition-colors shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today's Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-white tracking-tight">
              {isLoading ? '...' : metrics.todayRevenueFormatted}
            </span>
            <p className="text-[11px] text-teal-400/90 mt-0.5">
              Collected & confirmed payments
            </p>
          </div>
        </div>

        {/* Metric 3: Total Customers */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-3 relative overflow-hidden group hover:border-blue-500/40 transition-colors shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Customers
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-white tracking-tight">
              {isLoading ? '...' : metrics.totalUsers}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Registered player accounts</p>
          </div>
        </div>

        {/* Metric 4: Free Slots Today */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-3 relative overflow-hidden group hover:border-amber-500/40 transition-colors shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Free Slots Today
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-white tracking-tight">
              {isLoading ? '...' : metrics.freeSlotsToday}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Available across {metrics.activeTurfsCount} arenas
            </p>
          </div>
        </div>
      </div>

      {/* Financial Health Summary (Collected vs Unpaid Pay at Venue) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">
              Today's Gross Booking Value
            </span>
            <span className="text-xl font-bold text-white mt-1 block">
              {metrics.todayTotalBookingValueFormatted}
            </span>
            <p className="text-[11px] text-slate-500">
              All active reservations scheduled for today ({metrics.todayBookings} bookings)
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-amber-400 block">
              Unpaid Pay at Venue (Today)
            </span>
            <span className="text-xl font-bold text-amber-300 mt-1 block">
              {metrics.todayUnpaidValueFormatted}
            </span>
            <p className="text-[11px] text-slate-500">
              Pending desk payment at counter check-in
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Booking Status & Payment Status Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Booking Status Breakdown
            </h3>
            <span className="text-[11px] text-slate-500">All-time volume</span>
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Payment Realization Overview
            </h3>
            <span className="text-[11px] text-slate-500">Active bookings</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[11px] text-emerald-400 font-bold block uppercase">
                Paid In Full
              </span>
              <span className="text-xl font-black text-white mt-0.5 block">
                ₹{((paymentBreakdown.paid?.amount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {paymentBreakdown.paid?.count || 0} Paid Bookings
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[11px] text-amber-400 font-bold block uppercase">
                Pay at Venue (Unpaid)
              </span>
              <span className="text-xl font-black text-white mt-0.5 block">
                ₹{((paymentBreakdown.unpaid?.amount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {paymentBreakdown.unpaid?.count || 0} Unpaid Bookings
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Ops Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/admin/blocked-slots"
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/20 to-slate-900/80 border border-amber-500/30 hover:border-amber-500/60 transition-all flex items-center justify-between group"
        >
          <div>
            <h4 className="text-xs font-bold text-amber-200">Blocked Slots & Maintenance</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Schedule repairs or tournaments</p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/admin/turfs"
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/20 to-slate-900/80 border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex items-center justify-between group"
        >
          <div>
            <h4 className="text-xs font-bold text-emerald-200">Turf Arenas & Rates</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Base, peak & weekend pricing</p>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/admin/bookings"
          className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/20 to-slate-900/80 border border-teal-500/30 hover:border-teal-500/60 transition-all flex items-center justify-between group"
        >
          <div>
            <h4 className="text-xs font-bold text-teal-200">Booking Management</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Confirm, complete, or release slots</p>
          </div>
          <ArrowRight className="w-4 h-4 text-teal-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Recent Bookings Table */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Recent Arena Reservations</h3>
          </div>
          <Link
            to="/admin/bookings"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>See all bookings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No bookings recorded yet. New player bookings will appear here instantly.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Arena</th>
                  <th className="px-4 py-3">Date & Slot</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {recentBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      {b.bookingId}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {b.user?.name || 'Customer'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {b.turf?.name || 'Arena'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {b.date} • {b.startTime}-{b.endTime}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      ₹{((b.totalAmount || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {getPaymentBadge(b.paymentStatus)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(b.status)}
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
