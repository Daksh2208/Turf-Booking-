import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '../../hooks/useApi'
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  IndianRupee,
  RefreshCw,
  Eye,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  BarChart3,
  Award,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Activity,
  AlertCircle,
} from 'lucide-react'
import adminCustomerService from '../../services/admin/customer.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'

const FILTER_TABS = [
  { id: '', label: 'All Accounts' },
  { id: 'active', label: 'Active Bookers' },
  { id: 'inactive', label: 'Never Booked' },
  { id: 'enabled', label: 'Enabled' },
  { id: 'disabled', label: 'Suspended' },
]

export const CustomersPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedSort, setSelectedSort] = useState('recent')
  const [page, setPage] = useState(1)

  // Selected customer for detail modal
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Account status confirmation modal
  const [customerToToggle, setCustomerToToggle] = useState(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null)

  // 1. Fetch Analytics Overview
  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['admin', 'customers', 'analytics'],
    queryFn: () => adminCustomerService.getCustomerAnalytics(),
  })

  // 2. Fetch Paginated Customer List
  const {
    data: customerListData,
    isLoading: isListLoading,
    isFetching: isListFetching,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['admin', 'customers', 'list', { page, search, status: selectedStatus, sort: selectedSort }],
    queryFn: () =>
      adminCustomerService.getCustomers({
        page,
        limit: 10,
        search,
        status: selectedStatus,
        sort: selectedSort,
      }),
  })

  // 3. Fetch Single Customer Details when modal opens
  const {
    data: customerDetailData,
    isLoading: isDetailLoading,
  } = useQuery({
    queryKey: ['admin', 'customers', 'detail', selectedCustomerId],
    queryFn: () => adminCustomerService.getCustomerDetails(selectedCustomerId),
    enabled: Boolean(selectedCustomerId && isDetailModalOpen),
  })

  // 4. Mutation for Status Toggle
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminCustomerService.toggleCustomerStatus(id, isActive),
    onSuccess: (updated) => {
      queryClient.invalidateQueries(['admin', 'customers'])
      setIsConfirmModalOpen(false)
      setCustomerToToggle(null)
      setToastMessage({
        type: 'success',
        text: `Customer ${updated.name} has been ${updated.isActive ? 'activated' : 'suspended'}.`,
      })
      setTimeout(() => setToastMessage(null), 4000)
    },
    onError: (err) => {
      setToastMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to update customer status.',
      })
      setTimeout(() => setToastMessage(null), 4000)
    },
  })

  const handleOpenDetail = (id) => {
    setSelectedCustomerId(id)
    setIsDetailModalOpen(true)
  }

  const handleOpenToggleConfirm = (customer) => {
    setCustomerToToggle(customer)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmToggle = () => {
    if (!customerToToggle) return
    toggleStatusMutation.mutate({
      id: customerToToggle._id,
      isActive: !customerToToggle.isActive,
    })
  }

  const handleRefreshAll = () => {
    refetchAnalytics()
    refetchList()
  }

  const customers = customerListData?.customers || []
  const pagination = customerListData?.pagination || { total: 0, page: 1, totalPages: 1 }

  // Extract analytics metrics safely
  const overview = analytics?.overview || {}
  const financials = analytics?.financials || {}
  const distribution = analytics?.distribution || {}
  const signupTrend = analytics?.signupTrend || []
  const topSpenders = analytics?.topSpenders || []

  // Max value in signup trend for relative chart scaling
  const maxSignup = Math.max(1, ...signupTrend.map((t) => t.count))

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Customer Analytics & Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Track platform customer acquisition, booking frequency, lifetime spending, and manage user accounts.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshAll}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer self-start sm:self-auto"
          title="Refresh analytics and customer directory"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isListFetching ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Analytical KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Customers
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {isAnalyticsLoading ? '...' : (overview.totalRegistered || 0).toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                +{overview.newThisMonth || 0} this month
              </span>
              <span>• {overview.newThisWeek || 0} this week</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Bookers */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Bookers
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {isAnalyticsLoading ? '...' : (overview.activeCustomers || 0).toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-teal-400">
                {overview.totalRegistered
                  ? Math.round(((overview.activeCustomers || 0) / overview.totalRegistered) * 100)
                  : 0}
                %
              </span>
              <span>conversion rate ({overview.inactiveCustomers || 0} yet to book)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Repeat Customers & Retention */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Repeat Customers
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {isAnalyticsLoading ? '...' : (overview.repeatCustomers || 0).toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                {overview.retentionRate || 0}%
              </span>
              <span>retention (≥ 2 bookings)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Customer Revenue & Avg Spend */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Customer Spend
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center">
              <span className="text-lg font-bold text-amber-400 mr-0.5">₹</span>
              {isAnalyticsLoading ? '...' : (financials.totalRevenue || 0).toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Avg:</span>
              <span className="font-semibold text-white">
                ₹{(financials.avgSpendPerActiveCustomer || 0).toLocaleString()}
              </span>
              <span>/ active user</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: Signups Trend & Engagement Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signups Histogram (2 cols) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Registration Trend (Last 6 Months)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">New accounts</span>
          </div>

          <div className="mt-6 flex items-end justify-between gap-3 h-36 pt-4">
            {signupTrend.length > 0 ? (
              signupTrend.map((item, idx) => {
                const heightPercent = Math.max(12, Math.round((item.count / maxSignup) * 100))
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[11px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.count}
                    </span>
                    <div
                      className="w-full max-w-[42px] bg-gradient-to-t from-emerald-600/40 to-emerald-400 rounded-t-lg transition-all duration-300 group-hover:from-emerald-500/60 group-hover:to-emerald-300 shadow-sm shadow-emerald-500/20"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                      {item.label}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="w-full flex items-center justify-center text-xs text-slate-400">
                Loading registration metrics...
              </div>
            )}
          </div>
        </div>

        {/* Booking Frequency Distribution (1 col) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <Activity className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Platform Activity Buckets
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              {/* 0 bookings */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">No Bookings Yet</span>
                  <span className="font-semibold text-white">{distribution.zeroBookings || 0} users</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-slate-500 rounded-full"
                    style={{
                      width: `${
                        overview.totalRegistered
                          ? Math.round(((distribution.zeroBookings || 0) / overview.totalRegistered) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* 1 booking */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">1 Booking</span>
                  <span className="font-semibold text-teal-300">{distribution.oneBooking || 0} users</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full"
                    style={{
                      width: `${
                        overview.totalRegistered
                          ? Math.round(((distribution.oneBooking || 0) / overview.totalRegistered) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* 2-5 bookings */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">2 – 5 Bookings</span>
                  <span className="font-semibold text-emerald-300">{distribution.twoToFive || 0} users</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${
                        overview.totalRegistered
                          ? Math.round(((distribution.twoToFive || 0) / overview.totalRegistered) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* 6+ bookings */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">6+ Power Bookers</span>
                  <span className="font-semibold text-indigo-300">{distribution.sixPlus || 0} users</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{
                      width: `${
                        overview.totalRegistered
                          ? Math.round(((distribution.sixPlus || 0) / overview.totalRegistered) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Customer Health:</span>
            <span className="font-bold text-emerald-400">
              {overview.retentionRate > 40 ? 'High Retention 🚀' : 'Standard Growth 🌱'}
            </span>
          </div>
        </div>
      </div>

      {/* Top 5 Spenders Highlight Banner */}
      {topSpenders.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-emerald-950/20 border border-slate-800/90 shadow-sm">
          <div className="flex items-center gap-2 mb-3.5">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Top Customer Leaderboard (By Lifetime Spend)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {topSpenders.map((top, idx) => (
              <div
                key={top._id}
                onClick={() => handleOpenDetail(top._id)}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] text-slate-400">{top.bookingCount} bookings</span>
                </div>
                <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                  {top.name}
                </p>
                <p className="text-[11px] font-black text-emerald-300 mt-1">
                  ₹{top.totalSpent?.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Directory Table Section */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm overflow-hidden backdrop-blur-sm">
        {/* Controls: Search, Filter Tabs, Sort */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, email, or phone number..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-950 border border-slate-800 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 font-semibold">Sort:</span>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              <option value="recent">Newest Registered</option>
              <option value="oldest">Oldest Accounts</option>
              <option value="spend_desc">Highest Spend</option>
              <option value="spend_asc">Lowest Spend</option>
              <option value="bookings_desc">Most Bookings</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-2 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedStatus(tab.id)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Customer Info</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Bookings</th>
                <th className="px-4 py-3.5">Total Spent</th>
                <th className="px-4 py-3.5">Joined Date</th>
                <th className="px-4 py-3.5">Last Active</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isListLoading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span>Loading customers directory...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">No customers found</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {search
                          ? `No customer matched query "${search}". Try checking your spelling or clearing filters.`
                          : 'No customers have registered yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const initial = (c.name || 'U').charAt(0).toUpperCase()
                  return (
                    <tr
                      key={c._id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Name, Email, Phone */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0 shadow-sm">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                              {c.name}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="truncate">{c.email}</span>
                              {c.phone && <span>• {c.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.isActive
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.isActive ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            {c.isActive ? 'Active' : 'Suspended'}
                          </span>

                          {c.totalBookings > 0 ? (
                            <span className="text-[10px] text-teal-400 font-semibold">
                              {c.totalBookings >= 2 ? 'Repeat Booker' : '1 Booking'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">No bookings</span>
                          )}
                        </div>
                      </td>

                      {/* Total Bookings */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{c.totalBookings || 0}</span>
                          <span className="text-[10px] text-slate-400">
                            ({c.confirmedBookings || 0} confirmed
                            {c.cancelledBookings > 0 && `, ${c.cancelledBookings} cancelled`})
                          </span>
                        </div>
                      </td>

                      {/* Total Spent */}
                      <td className="px-4 py-4">
                        <span className="font-bold text-emerald-400">
                          ₹{(c.totalSpent || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-4 text-slate-400 text-[11px]">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-4 text-slate-400 text-[11px]">
                        {c.lastBookingDate ? c.lastBookingDate : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(c._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View Customer Analytics & History"
                          >
                            <Eye className="w-4 h-4 text-emerald-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenToggleConfirm(c)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              c.isActive
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                            title={c.isActive ? 'Suspend Customer Account' : 'Reactivate Customer Account'}
                          >
                            {c.isActive ? (
                              <ShieldAlert className="w-4 h-4 text-rose-400" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing Page <span className="font-bold text-white">{pagination.page}</span> of{' '}
              <span className="font-bold text-white">{pagination.totalPages}</span> ({pagination.total} customers)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <button
                type="button"
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Customer Details & Booking History */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedCustomerId(null)
        }}
        title="Customer Profile & Platform Analytics"
        size="lg"
      >
        {isDetailLoading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span>Loading customer details...</span>
          </div>
        ) : customerDetailData?.customer ? (
          <div className="space-y-6">
            {/* Header Profile Badge */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-lg">
                  {customerDetailData.customer.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{customerDetailData.customer.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      {customerDetailData.customer.email}
                    </span>
                    {customerDetailData.customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {customerDetailData.customer.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    customerDetailData.customer.isActive
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                  }`}
                >
                  {customerDetailData.customer.isActive ? 'Active Account' : 'Suspended'}
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Bookings
                </span>
                <span className="text-lg font-black text-white mt-1 block">
                  {customerDetailData.stats?.totalBookings || 0}
                </span>
                <span className="text-[10px] text-slate-400">
                  {customerDetailData.stats?.confirmedCount || 0} confirmed
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Spend
                </span>
                <span className="text-lg font-black text-emerald-400 mt-1 block">
                  ₹{(customerDetailData.stats?.totalSpent || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">Lifetime revenue</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Favorite Turf
                </span>
                <span className="text-xs font-bold text-white mt-1 block truncate" title={customerDetailData.stats?.favoriteTurf}>
                  {customerDetailData.stats?.favoriteTurf || 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400">Most visited</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Joined Date
                </span>
                <span className="text-xs font-bold text-slate-300 mt-1 block">
                  {customerDetailData.customer.createdAt
                    ? new Date(customerDetailData.customer.createdAt).toLocaleDateString()
                    : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400">Registration</span>
              </div>
            </div>

            {/* Booking History Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Recent Booking Activity
              </h4>

              {customerDetailData.recentBookings?.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center text-xs text-slate-400">
                  This customer has not placed any bookings on the platform yet.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">Booking ID</th>
                        <th className="px-4 py-2.5">Turf / Arena</th>
                        <th className="px-4 py-2.5">Date & Time</th>
                        <th className="px-4 py-2.5">Amount</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                      {customerDetailData.recentBookings.map((b) => (
                        <tr key={b._id} className="hover:bg-slate-800/20">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-emerald-400">
                            {b.bookingId}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-white">
                            {b.turf?.name || 'Turf Arena'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300">
                            {b.date} ({b.startTime} - {b.endTime})
                          </td>
                          <td className="px-4 py-2.5 font-bold text-emerald-400">
                            ₹{b.totalAmount}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                b.status === 'confirmed'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : b.status === 'completed'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : b.status === 'cancelled'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsDetailModalOpen(false)
                  setSelectedCustomerId(null)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal 2: Status Toggle Confirmation */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false)
          setCustomerToToggle(null)
        }}
        title={customerToToggle?.isActive ? 'Suspend Customer Account' : 'Reactivate Customer Account'}
        size="sm"
      >
        {customerToToggle && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to{' '}
              <strong className={customerToToggle.isActive ? 'text-rose-400' : 'text-emerald-400'}>
                {customerToToggle.isActive ? 'suspend' : 'activate'}
              </strong>{' '}
              the customer account for{' '}
              <strong className="text-white">{customerToToggle.name}</strong> ({customerToToggle.email})?
            </p>

            {customerToToggle.isActive && (
              <p className="text-xs text-rose-400/90 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                Suspending this account will revoke login and prevent new bookings from being created until reactivated.
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsConfirmModalOpen(false)
                  setCustomerToToggle(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant={customerToToggle.isActive ? 'danger' : 'primary'}
                size="sm"
                isLoading={toggleStatusMutation.isLoading}
                onClick={handleConfirmToggle}
              >
                {customerToToggle.isActive ? 'Suspend Account' : 'Activate Account'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CustomersPage
