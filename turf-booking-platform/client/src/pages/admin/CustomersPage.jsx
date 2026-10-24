import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '../../hooks/useApi'
import {
  Users,
  UserCheck,
  TrendingUp,
  IndianRupee,
  RefreshCw,
  Eye,
  Mail,
  Phone,
  ShieldAlert,
  CheckCircle2,
  Clock,
  BarChart3,
  Award,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle,
  Search,
  Filter,
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

/**
 * Convert raw paise integer to formatted Indian Rupees with .00 decimals
 */
const formatPrice = (amountInPaise = 0) => {
  const rupees = (Number(amountInPaise) || 0) / 100
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

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
              ? 'bg-[#E7F3E9] border-[#C9DFCE] text-[#1D6537]'
              : 'bg-[#FDF0EF] border-[#F5C2BF] text-[#922B27]'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#267A45] shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#922B27] shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#17231B]">
                Customer Analytics & Directory
              </h1>
              <p className="text-xs sm:text-sm text-[#526258]">
                Track platform customer acquisition, booking frequency, lifetime spending, and manage user accounts.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshAll}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#D7E0D9] text-[#17231B] hover:bg-[#F0F6F1] hover:border-[#267A45] transition-all cursor-pointer self-start sm:self-auto shadow-xs"
          title="Refresh analytics and customer directory"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#526258] ${isListFetching ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Analytical KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered */}
        <div className="p-5 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs relative overflow-hidden group hover:border-[#C9DFCE] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526258]">
              Total Customers
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-[#17231B]">
              {isAnalyticsLoading ? '...' : (overview.totalRegistered || 0).toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#526258]">
              <span className="inline-flex items-center gap-1 font-semibold text-[#1D6537] bg-[#E7F3E9] px-1.5 py-0.5 rounded border border-[#C9DFCE]">
                +{overview.newThisMonth || 0} this month
              </span>
              <span>• {overview.newThisWeek || 0} this week</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Bookers */}
        <div className="p-5 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs relative overflow-hidden group hover:border-[#C9DFCE] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526258]">
              Active Bookers
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-[#17231B]">
              {isAnalyticsLoading ? '...' : (overview.activeCustomers || 0).toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#526258]">
              <span className="font-semibold text-[#267A45]">
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
        <div className="p-5 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs relative overflow-hidden group hover:border-[#C9DFCE] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526258]">
              Repeat Customers
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-[#17231B]">
              {isAnalyticsLoading ? '...' : (overview.repeatCustomers || 0).toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#526258]">
              <span className="font-semibold text-[#1D6537] bg-[#E7F3E9] px-1.5 py-0.5 rounded border border-[#C9DFCE]">
                {overview.retentionRate || 0}%
              </span>
              <span>retention (≥ 2 bookings)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Customer Revenue & Avg Spend */}
        <div className="p-5 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs relative overflow-hidden group hover:border-[#C9DFCE] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526258]">
              Customer Spend
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FDF4E7] border border-[#F8E3C5] flex items-center justify-center text-[#79420D]">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-[#17231B] flex items-center">
              <span className="text-lg font-bold text-[#79420D] mr-0.5">₹</span>
              {isAnalyticsLoading ? '...' : formatPrice(financials.totalRevenue || 0)}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#526258]">
              <span>Avg:</span>
              <span className="font-semibold text-[#17231B]">
                ₹{formatPrice(financials.avgSpendPerActiveCustomer || 0)}
              </span>
              <span>/ active user</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: Signups Trend & Engagement Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signups Histogram (2 cols) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8E3]">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4 text-[#267A45]" />
              <h2 className="text-sm font-bold text-[#17231B] uppercase tracking-wider">
                Registration Trend (Last 6 Months)
              </h2>
            </div>
            <span className="text-xs text-[#526258] font-medium">New accounts</span>
          </div>

          <div className="mt-6 flex items-end justify-between gap-3 h-36 pt-4">
            {signupTrend.length > 0 ? (
              signupTrend.map((item, idx) => {
                const heightPercent = Math.max(12, Math.round((item.count / maxSignup) * 100))
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[11px] font-bold text-[#267A45] opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.count}
                    </span>
                    <div
                      className="w-full max-w-[42px] bg-gradient-to-t from-[#267A45]/30 to-[#267A45] rounded-t-lg transition-all duration-300 group-hover:from-[#267A45]/50 group-hover:to-[#1E6338] shadow-xs"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[11px] font-semibold text-[#526258] group-hover:text-[#17231B] transition-colors">
                      {item.label}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="w-full flex items-center justify-center text-xs text-[#526258]">
                Loading registration metrics...
              </div>
            )}
          </div>
        </div>

        {/* Booking Frequency Distribution (1 col) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#E2E8E3]">
              <Activity className="w-4 h-4 text-[#267A45]" />
              <h2 className="text-sm font-bold text-[#17231B] uppercase tracking-wider">
                Platform Activity Buckets
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              {/* 0 bookings */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#526258]">No Bookings Yet</span>
                  <span className="font-semibold text-[#17231B]">{distribution.zeroBookings || 0} users</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EEF3EF] overflow-hidden">
                  <div
                    className="h-full bg-[#69756D] rounded-full"
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
                  <span className="text-[#526258]">1 Booking</span>
                  <span className="font-semibold text-[#17231B]">{distribution.oneBooking || 0} users</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EEF3EF] overflow-hidden">
                  <div
                    className="h-full bg-[#267A45]/60 rounded-full"
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
                  <span className="text-[#526258]">2 – 5 Bookings</span>
                  <span className="font-semibold text-[#17231B]">{distribution.twoToFive || 0} users</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EEF3EF] overflow-hidden">
                  <div
                    className="h-full bg-[#267A45] rounded-full"
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
                  <span className="text-[#526258]">6+ Power Bookers</span>
                  <span className="font-semibold text-[#17231B]">{distribution.sixPlus || 0} users</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EEF3EF] overflow-hidden">
                  <div
                    className="h-full bg-[#174D2D] rounded-full"
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

          <div className="pt-4 border-t border-[#E2E8E3] text-[11px] text-[#526258] flex items-center justify-between mt-4">
            <span>Customer Health:</span>
            <span className="font-bold text-[#1D6537]">
              {overview.retentionRate > 40 ? 'High Retention 🚀' : 'Standard Growth 🌱'}
            </span>
          </div>
        </div>
      </div>

      {/* Top 5 Spenders Highlight Banner */}
      {topSpenders.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#EDF5EF] border border-[#C9DFCE] shadow-xs">
          <div className="flex items-center gap-2 mb-3.5">
            <Award className="w-4 h-4 text-[#79420D]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#174D2D]">
              Top Customer Leaderboard (By Lifetime Spend)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {topSpenders.map((top, idx) => (
              <div
                key={top._id}
                onClick={() => handleOpenDetail(top._id)}
                className="p-3 rounded-xl bg-white border border-[#D7E0D9] hover:border-[#267A45] hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FDF4E7] text-[#79420D] border border-[#F8E3C5]">
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] text-[#526258]">{top.bookingCount} bookings</span>
                </div>
                <p className="text-xs font-bold text-[#17231B] group-hover:text-[#267A45] transition-colors truncate">
                  {top.name}
                </p>
                <p className="text-[11px] font-black text-[#267A45] mt-1">
                  ₹{formatPrice(top.totalSpent || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Directory Table Section */}
      <div className="rounded-2xl bg-white border border-[#D7E0D9] shadow-xs overflow-hidden">
        {/* Controls: Search, Filter Tabs, Sort */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8E3] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#647168] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, email, or phone number..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-white border border-[#D7E0D9] text-[#17231B] placeholder-[#647168] focus:outline-none focus:border-[#267A45] focus:ring-1 focus:ring-[#267A45] transition-colors"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#526258] shrink-0" />
            <span className="text-xs text-[#526258] font-semibold">Sort:</span>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-white border border-[#D7E0D9] text-[#17231B] focus:outline-none focus:border-[#267A45] cursor-pointer"
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
        <div className="px-4 sm:px-5 py-3 border-b border-[#E2E8E3] bg-[#F6F8F6] flex items-center gap-2 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-[#526258] shrink-0 mr-1" />
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
                  ? 'bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE] shadow-xs'
                  : 'text-[#526258] hover:text-[#17231B] hover:bg-[#EEF3EF] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F0F4F1] text-[#526258] font-bold uppercase tracking-wider text-[10px] border-b border-[#D7E0D9]">
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
            <tbody className="divide-y divide-[#E2E8E3]">
              {isListLoading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-[#526258]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#267A45]" />
                      <span>Loading customers directory...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-[#526258]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-[#69756D]" />
                      <p className="text-sm font-semibold text-[#17231B]">No customers found</p>
                      <p className="text-xs text-[#526258] max-w-sm">
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
                      className="hover:bg-[#F0F6F1] transition-colors group"
                    >
                      {/* Name, Email, Phone */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] font-bold shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#17231B] truncate group-hover:text-[#267A45] transition-colors">
                              {c.name}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-[#526258]">
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
                                ? 'bg-[#E7F3E9] text-[#1D6537] border-[#C9DFCE]'
                                : 'bg-[#FDF0EF] text-[#922B27] border-[#F5C2BF]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.isActive ? 'bg-[#267A45]' : 'bg-[#922B27]'
                              }`}
                            />
                            {c.isActive ? 'Active' : 'Suspended'}
                          </span>

                          {c.totalBookings > 0 ? (
                            <span className="text-[10px] text-[#267A45] font-semibold">
                              {c.totalBookings >= 2 ? 'Repeat Booker' : '1 Booking'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#69756D]">No bookings</span>
                          )}
                        </div>
                      </td>

                      {/* Total Bookings */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#17231B]">{c.totalBookings || 0}</span>
                          <span className="text-[10px] text-[#526258]">
                            ({c.confirmedBookings || 0} confirmed
                            {c.cancelledBookings > 0 && `, ${c.cancelledBookings} cancelled`})
                          </span>
                        </div>
                      </td>

                      {/* Total Spent */}
                      <td className="px-4 py-4">
                        <span className="font-bold text-[#267A45]">
                          ₹{formatPrice(c.totalSpent || 0)}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-4 text-[#526258] text-[11px]">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-4 text-[#526258] text-[11px]">
                        {c.lastBookingDate ? c.lastBookingDate : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(c._id)}
                            className="p-1.5 rounded-lg text-[#526258] hover:text-[#267A45] hover:bg-[#E7F3E9] transition-colors cursor-pointer"
                            title="View Customer Analytics & History"
                          >
                            <Eye className="w-4 h-4 text-[#267A45]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenToggleConfirm(c)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              c.isActive
                                ? 'text-[#526258] hover:text-[#922B27] hover:bg-[#FDF0EF]'
                                : 'text-[#526258] hover:text-[#267A45] hover:bg-[#E7F3E9]'
                            }`}
                            title={c.isActive ? 'Suspend Customer Account' : 'Reactivate Customer Account'}
                          >
                            {c.isActive ? (
                              <ShieldAlert className="w-4 h-4 text-[#922B27]" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-[#267A45]" />
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
          <div className="p-4 border-t border-[#E2E8E3] bg-[#F6F8F6] flex items-center justify-between">
            <span className="text-xs text-[#526258]">
              Showing Page <span className="font-bold text-[#17231B]">{pagination.page}</span> of{' '}
              <span className="font-bold text-[#17231B]">{pagination.totalPages}</span> ({pagination.total} customers)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#D7E0D9] text-[#17231B] hover:bg-[#F0F6F1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <button
                type="button"
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#D7E0D9] text-[#17231B] hover:bg-[#F0F6F1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
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
          <div className="p-8 flex flex-col items-center justify-center gap-3 text-[#526258]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#267A45]" />
            <span>Loading customer details...</span>
          </div>
        ) : customerDetailData?.customer ? (
          <div className="space-y-6">
            {/* Header Profile Badge */}
            <div className="p-4 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] font-black text-lg">
                  {customerDetailData.customer.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17231B]">{customerDetailData.customer.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#526258] mt-0.5">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#647168]" />
                      {customerDetailData.customer.email}
                    </span>
                    {customerDetailData.customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#647168]" />
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
                      ? 'bg-[#E7F3E9] text-[#1D6537] border-[#C9DFCE]'
                      : 'bg-[#FDF0EF] text-[#922B27] border-[#F5C2BF]'
                  }`}
                >
                  {customerDetailData.customer.isActive ? 'Active Account' : 'Suspended'}
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-[#D7E0D9] shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#526258] block">
                  Total Bookings
                </span>
                <span className="text-lg font-black text-[#17231B] mt-1 block">
                  {customerDetailData.stats?.totalBookings || 0}
                </span>
                <span className="text-[10px] text-[#526258]">
                  {customerDetailData.stats?.confirmedCount || 0} confirmed
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#D7E0D9] shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#526258] block">
                  Total Spend
                </span>
                <span className="text-lg font-black text-[#267A45] mt-1 block">
                  ₹{formatPrice(customerDetailData.stats?.totalSpent || 0)}
                </span>
                <span className="text-[10px] text-[#526258]">Lifetime revenue</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#D7E0D9] shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#526258] block">
                  Favorite Turf
                </span>
                <span className="text-xs font-bold text-[#17231B] mt-1 block truncate" title={customerDetailData.stats?.favoriteTurf}>
                  {customerDetailData.stats?.favoriteTurf || 'N/A'}
                </span>
                <span className="text-[10px] text-[#526258]">Most visited</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#D7E0D9] shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#526258] block">
                  Joined Date
                </span>
                <span className="text-xs font-bold text-[#17231B] mt-1 block">
                  {customerDetailData.customer.createdAt
                    ? new Date(customerDetailData.customer.createdAt).toLocaleDateString()
                    : 'N/A'}
                </span>
                <span className="text-[10px] text-[#526258]">Registration</span>
              </div>
            </div>

            {/* Booking History Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#526258] mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#267A45]" />
                Recent Booking Activity
              </h4>

              {customerDetailData.recentBookings?.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] text-center text-xs text-[#526258]">
                  This customer has not placed any bookings on the platform yet.
                </div>
              ) : (
                <div className="rounded-xl border border-[#D7E0D9] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F0F4F1] text-[#526258] font-bold uppercase text-[10px] border-b border-[#D7E0D9]">
                      <tr>
                        <th className="px-4 py-2.5">Booking ID</th>
                        <th className="px-4 py-2.5">Turf / Arena</th>
                        <th className="px-4 py-2.5">Date & Time</th>
                        <th className="px-4 py-2.5">Amount</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8E3] bg-white">
                      {customerDetailData.recentBookings.map((b) => (
                        <tr key={b._id} className="hover:bg-[#F0F6F1]">
                          <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-[#267A45]">
                            {b.bookingId}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-[#17231B]">
                            {b.turf?.name || 'Turf Arena'}
                          </td>
                          <td className="px-4 py-2.5 text-[#526258]">
                            {b.date} ({b.startTime} - {b.endTime})
                          </td>
                          <td className="px-4 py-2.5 font-bold text-[#267A45]">
                            ₹{formatPrice(b.totalAmount || 0)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                b.status === 'confirmed'
                                  ? 'bg-[#E7F3E9] text-[#1D6537]'
                                  : b.status === 'completed'
                                  ? 'bg-[#EFF6FF] text-[#1B4E82]'
                                  : b.status === 'cancelled'
                                  ? 'bg-[#FDF0EF] text-[#922B27]'
                                  : 'bg-[#FDF4E7] text-[#79420D]'
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

            <div className="flex justify-end pt-2 border-t border-[#E2E8E3]">
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
            <p className="text-sm text-[#46564A]">
              Are you sure you want to{' '}
              <strong className={customerToToggle.isActive ? 'text-[#922B27]' : 'text-[#267A45]'}>
                {customerToToggle.isActive ? 'suspend' : 'activate'}
              </strong>{' '}
              the customer account for{' '}
              <strong className="text-[#17231B]">{customerToToggle.name}</strong> ({customerToToggle.email})?
            </p>

            {customerToToggle.isActive && (
              <p className="text-xs text-[#922B27] bg-[#FDF0EF] p-2.5 rounded-xl border border-[#F5C2BF]">
                Suspending this account will revoke login and prevent new bookings from being created until reactivated.
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E2E8E3]">
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
