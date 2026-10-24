import React from 'react'
import { useQuery } from '@tanstack/react-query'
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
    totalUsers: 0,
    freeSlotsToday: 0,
    activeTurfsCount: 0,
  }

  const recentBookings = data?.recentBookings || []

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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Arena Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time occupancy, revenue streams, and daily booking volume overview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/bookings"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <span>View All Bookings</span>
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
            <p className="text-[11px] text-slate-400 mt-0.5">Confirmed & active slots today</p>
          </div>
        </div>

        {/* Metric 2: Today's Revenue */}
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
            <p className="text-[11px] text-slate-400 mt-0.5">Realized slot & add-on sales</p>
          </div>
        </div>

        {/* Metric 3: Total Users */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-3 relative overflow-hidden group hover:border-blue-500/40 transition-colors shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Users
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
            <p className="text-[11px] text-slate-400 mt-0.5">Available for instant booking</p>
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
            <span>See all</span>
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
