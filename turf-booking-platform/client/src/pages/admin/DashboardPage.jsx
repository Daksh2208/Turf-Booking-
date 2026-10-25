import React, { useState } from 'react'
import { useQuery } from '../../hooks/useApi'
import { Link } from 'react-router-dom'
import {
  Calendar,
  IndianRupee,
  Users,
  Clock,
  ArrowRight,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  Check,
  Globe,
  Receipt,
  RefreshCw,
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
  const [viewMode, setViewMode] = useState('today')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => adminInventoryService.getDashboard(),
    refetchInterval: 15000,
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

  const isDaily = viewMode === 'today'
  const statusBreakdown = isDaily
    ? data?.statusBreakdown || { confirmed: 0, pending: 0, completed: 0, cancelled: 0 }
    : data?.allTimeStatusBreakdown || { confirmed: 0, pending: 0, completed: 0, cancelled: 0 }

  const paymentBreakdown = isDaily
    ? data?.paymentBreakdown || { paid: { count: 0, amount: 0 }, unpaid: { count: 0, amount: 0 } }
    : data?.allTimePaymentBreakdown || { paid: { count: 0, amount: 0 }, unpaid: { count: 0, amount: 0 } }

  const activeTableBookings = isDaily ? todaySchedule : recentBookings

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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
            <CheckCircle2 className="w-3 h-3 text-[#267A45]" />
            Confirmed
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#1B4E82] border border-[#BFDBFE]">
            <CheckCircle2 className="w-3 h-3 text-[#1B4E82]" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FDF0EF] text-[#922B27] border border-[#F8D2CE]">
            <XCircle className="w-3 h-3 text-[#922B27]" />
            Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FDF4E7] text-[#79420D] border border-[#F6E1C4]">
            <Timer className="w-3 h-3 text-[#79420D]" />
            Pending
          </span>
        )
    }
  }

  const getPaymentBadge = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
            <Check className="w-2.5 h-2.5 text-[#267A45]" />
            Paid
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FDF4E7] text-[#79420D] border border-[#F6E1C4]">
            <AlertCircle className="w-2.5 h-2.5 text-[#79420D]" />
            Unpaid
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Top Header with Live Indicator & Date */}
      <div
        data-tour="admin-dashboard-header"
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8E3]"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
              Live Operations Tracker
            </h1>

            {/* Pulsing Live Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#267A45] animate-pulse" />
              LIVE TODAY
            </span>

            {/* Timezone and Current Date */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-[#46564A] border border-[#D7E0D9]">
              <Globe className="w-3.5 h-3.5 text-[#267A45]" />
              <span>{formattedDateHeader}</span>
              <span className="text-[#647168]">• {timezone}</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#526258] mt-1.5">
            Real-time daily operations feed tracking today's arena schedule, revenue collections, and slot occupancy.
          </p>
        </div>

        {/* View Switcher Tabs & Live Refresh Button */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Day / All View Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'today'
                  ? 'bg-white text-[#267A45] shadow-xs font-bold'
                  : 'text-[#46564A] hover:text-[#17231B]'
              }`}
            >
              Today's Live Data
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white text-[#267A45] shadow-xs font-bold'
                  : 'text-[#46564A] hover:text-[#17231B]'
              }`}
            >
              All-Time Summary
            </button>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white border border-[#D7E0D9] text-[#46564A] hover:text-[#17231B] hover:bg-[#F0F6F1] transition-colors cursor-pointer"
            title="Refresh Live Operations Data"
          >
            <RefreshCw className={`w-4 h-4 text-[#267A45] ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Core Daily KPI Metric Cards */}
      <div
        data-tour="dashboard-metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        {/* Metric 1: Today's Bookings */}
        <div className="p-5 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs relative overflow-hidden group hover:border-[#267A45]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526258]">
              Today's Bookings
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
              {isLoading ? '...' : metrics.todayBookings}
            </span>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#526258]">
              <span>Active today across all turfs</span>
              <Link to="/admin/bookings" className="text-[#267A45] hover:underline font-semibold">
                See all
              </Link>
            </div>
          </div>
        </div>

        {/* Metric 2: Today's Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs relative overflow-hidden group hover:border-[#267A45]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526258]">
              Today's Collected Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
              {isLoading ? '...' : `₹${formatPrice(metrics.todayRevenue)}`}
            </span>
            <p className="text-[11px] text-[#267A45] mt-1 font-semibold">
              Confirmed paid receipts today
            </p>
          </div>
        </div>

        {/* Metric 3: Today's Players / Customers */}
        <div className="p-5 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs relative overflow-hidden group hover:border-[#267A45]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526258]">
              Players Scheduled Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
              {isLoading ? '...' : (metrics.todayCustomersCount || metrics.todayBookings)}
            </span>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#526258]">
              <span>{metrics.totalUsers} total registered</span>
              <Link to="/admin/customers" className="text-[#267A45] hover:underline font-semibold">
                See all
              </Link>
            </div>
          </div>
        </div>

        {/* Metric 4: Free Slots Today */}
        <div className="p-5 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs relative overflow-hidden group hover:border-[#267A45]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526258]">
              Available Slots Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
              {isLoading ? '...' : metrics.freeSlotsToday}
            </span>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#526258]">
              <span>{metrics.totalOccupiedSlotsToday} slots booked today</span>
              <Link to="/admin/turfs" className="text-[#267A45] hover:underline font-semibold">
                View turfs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Financial Health Summary */}
      <div
        data-tour="financial-health"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="p-4 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-[#526258] block">
              Today's Gross Booking Value
            </span>
            <span className="text-xl font-black text-[#17231B] mt-1 block">
              ₹{formatPrice(metrics.todayTotalBookingValue)}
            </span>
            <p className="text-[11px] text-[#526258] mt-0.5">
              Total value of all {metrics.todayBookings} active reservations scheduled for today
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] flex items-center justify-center text-[#267A45] shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-[#79420D] block">
              Unpaid Pay at Venue (Today)
            </span>
            <span className="text-xl font-black text-[#79420D] mt-1 block">
              ₹{formatPrice(metrics.todayUnpaidValue)}
            </span>
            <p className="text-[11px] text-[#526258] mt-0.5">
              Pending desk payment at counter check-in today
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FDF4E7] border border-[#F6E1C4] flex items-center justify-center text-[#79420D] shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Today's Booking Status & Payment Realization Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="p-5 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8E3] pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#267A45]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17231B]">
                {isDaily ? "Today's Booking Status Breakdown" : 'All-Time Booking Status Breakdown'}
              </h3>
            </div>
            <Link to="/admin/bookings" className="text-[11px] text-[#267A45] hover:underline font-semibold">
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-3 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] text-center">
              <span className="text-[11px] text-[#1D6537] font-semibold block">Confirmed</span>
              <span className="text-xl font-black text-[#17231B] mt-0.5 block">
                {statusBreakdown.confirmed || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#FDF4E7] border border-[#F6E1C4] text-center">
              <span className="text-[11px] text-[#79420D] font-semibold block">Pending</span>
              <span className="text-xl font-black text-[#17231B] mt-0.5 block">
                {statusBreakdown.pending || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-center">
              <span className="text-[11px] text-[#1B4E82] font-semibold block">Completed</span>
              <span className="text-xl font-black text-[#17231B] mt-0.5 block">
                {statusBreakdown.completed || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] text-center">
              <span className="text-[11px] text-[#922B27] font-semibold block">Cancelled</span>
              <span className="text-xl font-black text-[#17231B] mt-0.5 block">
                {statusBreakdown.cancelled || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="p-5 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8E3] pb-2">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-3.5 h-3.5 text-[#267A45]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17231B]">
                {isDaily ? "Today's Payment Realization" : 'All-Time Payment Realization'}
              </h3>
            </div>
            <Link to="/admin/bookings" className="text-[11px] text-[#267A45] hover:underline font-semibold">
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE]">
              <span className="text-[11px] text-[#1D6537] font-bold block uppercase">
                Paid In Full
              </span>
              <span className="text-lg sm:text-xl font-black text-[#17231B] mt-0.5 block">
                ₹{formatPrice(paymentBreakdown.paid?.amount || 0)}
              </span>
              <span className="text-[11px] text-[#526258] mt-1 block">
                {paymentBreakdown.paid?.count || 0} Paid Bookings
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#FDF4E7] border border-[#F6E1C4]">
              <span className="text-[11px] text-[#79420D] font-bold block uppercase">
                Pay at Venue (Unpaid)
              </span>
              <span className="text-lg sm:text-xl font-black text-[#17231B] mt-0.5 block">
                ₹{formatPrice(paymentBreakdown.unpaid?.amount || 0)}
              </span>
              <span className="text-[11px] text-[#526258] mt-1 block">
                {paymentBreakdown.unpaid?.count || 0} Desk Collections
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Live Schedule / Reservations Table */}
      <div
        data-tour="schedule-table"
        className="p-5 sm:p-6 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17231B] flex items-center gap-2">
                <span>{isDaily ? "Today's Live Arena Schedule" : 'Recent Booking Feed'}</span>
                {isDaily && (
                  <span className="text-[10px] font-bold text-[#1D6537] bg-[#E7F3E9] px-2 py-0.5 rounded-full border border-[#C9DFCE]">
                    {todaySchedule.length} slots scheduled today
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#526258]">
                {isDaily
                  ? "Live chronological timeline of today's customer sessions across all arenas."
                  : 'Latest bookings recorded in the system.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/bookings"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#267A45] hover:bg-[#1E6338] shadow-xs transition-all flex items-center gap-1.5 group cursor-pointer"
            >
              <span>See All Bookings</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {activeTableBookings.length === 0 ? (
          <div className="p-10 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] text-center space-y-2">
            <Calendar className="w-8 h-8 text-[#647168] mx-auto" />
            <p className="text-sm font-semibold text-[#17231B]">
              {isDaily
                ? 'No arena reservations scheduled for today.'
                : 'No bookings recorded in the database.'}
            </p>
            <p className="text-xs text-[#526258] max-w-sm mx-auto">
              {isDaily
                ? 'All arena slots are currently free for booking. When players reserve slots for today, they will track live here.'
                : 'Player bookings will appear here once placed.'}
            </p>
            <div className="pt-2">
              <Link
                to="/admin/bookings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#17231B] bg-white hover:bg-[#F0F6F1] border border-[#D7E0D9] transition-colors"
              >
                <span>Browse All Dates & Historical Bookings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#D7E0D9]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F0F4F1] text-[#526258] uppercase text-[10px] tracking-wider border-b border-[#D7E0D9]">
                <tr>
                  <th className="px-4 py-3 font-bold">Booking ID</th>
                  <th className="px-4 py-3 font-bold">Player</th>
                  <th className="px-4 py-3 font-bold">Arena</th>
                  <th className="px-4 py-3 font-bold">Time Slot</th>
                  <th className="px-4 py-3 font-bold">Amount</th>
                  <th className="px-4 py-3 font-bold">Payment</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E3] bg-white text-[#17231B]">
                {activeTableBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-[#F0F6F1] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#267A45]">
                      {b.bookingId}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#17231B]">
                      <div>
                        <span>{b.user?.name || b.customerDetails?.name || 'Customer'}</span>
                        {b.customerDetails?.phone && (
                          <span className="text-[10px] text-[#526258] block font-normal">
                            {b.customerDetails.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#46564A] font-medium">
                      {b.turf?.name || 'Arena'}
                    </td>
                    <td className="px-4 py-3 text-[#17231B] font-medium">
                      <span className="text-[#267A45] font-semibold">{b.startTime} - {b.endTime}</span>
                      {!isDaily && <span className="text-[#526258] text-[10px] block">{b.date}</span>}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#17231B]">
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
                        className="inline-flex items-center gap-1 text-[#46564A] hover:text-[#267A45] transition-colors"
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
