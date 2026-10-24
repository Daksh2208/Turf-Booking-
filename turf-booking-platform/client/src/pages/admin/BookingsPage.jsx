import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '../../hooks/useApi'
import {
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Timer,
  Eye,
  AlertCircle,
  Clock,
  User,
  Phone,
  Mail,
  Shield,
  IndianRupee,
  RefreshCw,
  Check,
  CreditCard,
  Banknote,
  Users,
} from 'lucide-react'
import adminInventoryService from '../../services/admin/inventory.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'

const STATUS_TABS = [
  { id: '', label: 'All Bookings' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

export const BookingsPage = () => {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('')
  const [selectedTurf, setSelectedTurf] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  // Status modal fields
  const [newStatus, setNewStatus] = useState('confirmed')
  const [cancellationReason, setCancellationReason] = useState('')

  // Payment modal fields
  const [paymentMethod, setPaymentMethod] = useState('Pay at Venue')
  const [paymentNotes, setPaymentNotes] = useState('')

  const [successToast, setSuccessToast] = useState(null)
  const [serverError, setServerError] = useState(null)

  // Fetch turfs for arena filter dropdown
  const { data: turfsData } = useQuery({
    queryKey: ['adminTurfsList'],
    queryFn: () => adminInventoryService.getTurfs({ limit: 100 }),
  })
  const turfsList = turfsData?.turfs || []

  // Main bookings query
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'adminBookings',
      {
        status: selectedStatus,
        paymentStatus: selectedPaymentStatus,
        turf: selectedTurf,
        search,
        startDate,
        endDate,
        page,
      },
    ],
    queryFn: () =>
      adminInventoryService.getBookings({
        status: selectedStatus,
        paymentStatus: selectedPaymentStatus,
        turf: selectedTurf,
        search,
        startDate,
        endDate,
        page,
        limit: 15,
      }),
  })

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, cancellationReason }) =>
      adminInventoryService.updateBookingStatus(id, { status, cancellationReason }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['turfAvailability'] })
      setIsStatusModalOpen(false)
      setSuccessToast(`Booking ${updated.bookingId} status updated to ${updated.status}. Slot state refreshed.`)
      setTimeout(() => setSuccessToast(null), 4000)
    },
    onError: (err) => {
      setServerError(err.response?.data?.message || 'Failed to update booking status.')
    },
  })

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, paymentMethod, notes }) =>
      adminInventoryService.recordPayment(id, { paymentMethod, notes }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setIsPaymentModalOpen(false)
      if (selectedBooking && selectedBooking._id === updated._id) {
        setSelectedBooking(updated)
      }
      setSuccessToast(`Payment recorded for booking ${updated.bookingId}. Status marked as Paid.`)
      setTimeout(() => setSuccessToast(null), 4000)
    },
    onError: (err) => {
      setServerError(err.response?.data?.message || 'Failed to record payment.')
    },
  })

  const bookings = data?.bookings || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  const handleOpenStatusModal = (booking) => {
    setSelectedBooking(booking)
    setNewStatus(booking.status)
    setCancellationReason(booking.cancellationReason || '')
    setServerError(null)
    setIsStatusModalOpen(true)
  }

  const handleOpenPaymentModal = (booking) => {
    setSelectedBooking(booking)
    setPaymentMethod(booking.paymentMethod || 'Pay at Venue')
    setPaymentNotes('')
    setServerError(null)
    setIsPaymentModalOpen(true)
  }

  const handleSaveStatus = (e) => {
    e.preventDefault()
    if (!selectedBooking) return
    updateStatusMutation.mutate({
      id: selectedBooking._id,
      status: newStatus,
      cancellationReason,
    })
  }

  const handleSavePayment = (e) => {
    e.preventDefault()
    if (!selectedBooking) return
    recordPaymentMutation.mutate({
      id: selectedBooking._id,
      paymentMethod,
      notes: paymentNotes,
    })
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
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
            Refunded
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Bookings & Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search customer reservations, audit pricing snapshots, record venue payments, and release slots.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="self-start sm:self-center px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setSelectedStatus(tab.id)
              setPage(1)
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedStatus === tab.id
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comprehensive Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Reference, Player, Email, Phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Turf Filter */}
        <div>
          <select
            value={selectedTurf}
            onChange={(e) => {
              setSelectedTurf(e.target.value)
              setPage(1)
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">All Turf Arenas</option>
            {turfsList.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Status Filter */}
        <div>
          <select
            value={selectedPaymentStatus}
            onChange={(e) => {
              setSelectedPaymentStatus(e.target.value)
              setPage(1)
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">All Payment States</option>
            <option value="unpaid">Unpaid (Pay at Venue)</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Date Filter Range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            title="Start Date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setPage(1)
            }}
            className="w-1/2 px-2.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <span className="text-slate-600 text-xs">-</span>
          <input
            type="date"
            title="End Date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setPage(1)
            }}
            className="w-1/2 px-2.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading bookings catalog...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No reservations found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Booking Ref</th>
                  <th className="px-4 py-3.5">Player & Contact</th>
                  <th className="px-4 py-3.5">Arena & Sport</th>
                  <th className="px-4 py-3.5">Date & Slots</th>
                  <th className="px-4 py-3.5">Total Amount</th>
                  <th className="px-4 py-3.5">Payment</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Booked On</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {bookings.map((b) => {
                  const customerName = b.contactDetails?.name || b.user?.name || 'Customer'
                  const customerPhone = b.contactDetails?.phone || b.user?.phone || ''
                  const customerEmail = b.contactDetails?.email || b.user?.email || ''
                  const isUnpaid = b.paymentStatus === 'unpaid' && b.status !== 'cancelled'

                  return (
                    <tr key={b._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                        {b.bookingId}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-white">{customerName}</p>
                        <p className="text-[11px] text-slate-400">
                          {customerPhone ? `${customerPhone}` : customerEmail}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-200">{b.turf?.name || 'Arena'}</p>
                        <p className="text-[11px] text-slate-400">{b.sport?.name || 'Multi-sport'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <p className="font-medium">{b.date}</p>
                        <p className="text-[11px] text-slate-400">
                          {b.startTime} - {b.endTime}
                          {b.durationMinutes && (
                            <span className="ml-1 text-[10px] text-emerald-400">
                              ({Math.round(b.durationMinutes / 60)}h)
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                        ₹{((b.totalAmount || 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <div>{getPaymentBadge(b.paymentStatus)}</div>
                          <span className="text-[10px] text-slate-400 block capitalize">
                            {b.paymentMethod?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(b.status)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {formatDate(b.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBooking(b)
                            setIsDetailsOpen(true)
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                          title="View details & price snapshot"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          Details
                        </button>

                        {isUnpaid && (
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(b)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-600/30 border border-amber-500/30 transition-colors cursor-pointer"
                            title="Record venue payment"
                          >
                            <Banknote className="w-3.5 h-3.5 inline mr-1" />
                            Record Pay
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(b)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-600/30 border border-emerald-500/30 transition-colors cursor-pointer"
                          title="Change booking status"
                        >
                          Status
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total bookings)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Reusable Booking Detail View Modal */}
      {isDetailsOpen && selectedBooking && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Booking Details • ${selectedBooking.bookingId}`}
        >
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Status & Payment Headers */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Booking Status</span>
                <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
                {selectedBooking.cancelledAt && (
                  <p className="text-[10px] text-rose-400 mt-1">
                    Cancelled: {formatDate(selectedBooking.cancelledAt)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment State</span>
                <div className="mt-1 flex justify-end">{getPaymentBadge(selectedBooking.paymentStatus)}</div>
                <span className="text-[11px] text-slate-400 capitalize mt-1 inline-block">
                  {selectedBooking.paymentMethod?.replace(/_/g, ' ')}
                </span>
                {selectedBooking.paidAt && (
                  <p className="text-[10px] text-emerald-400 mt-0.5">
                    Paid On: {formatDate(selectedBooking.paidAt)}
                  </p>
                )}
              </div>
            </div>

            {/* Unpaid Warning Banner with quick Pay action */}
            {selectedBooking.paymentStatus === 'unpaid' && selectedBooking.status !== 'cancelled' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Pay at Venue payment pending receipt at the counter.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsOpen(false)
                    handleOpenPaymentModal(selectedBooking)
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            )}

            {/* Customer Details */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Information</span>
              <p className="font-bold text-white text-sm">
                {selectedBooking.contactDetails?.name || selectedBooking.user?.name || 'Customer'}
              </p>
              <p className="text-slate-400">
                {selectedBooking.contactDetails?.email || selectedBooking.user?.email}
              </p>
              <p className="text-slate-400">
                Phone: {selectedBooking.contactDetails?.phone || selectedBooking.user?.phone || 'Not provided'}
              </p>
            </div>

            {/* Arena & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Arena</span>
                <p className="font-bold text-white mt-0.5">{selectedBooking.turf?.name}</p>
                <p className="text-[11px] text-slate-400">{selectedBooking.sport?.name || 'Box Cricket'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date & Timing</span>
                <p className="font-bold text-white mt-0.5">{selectedBooking.date}</p>
                <p className="text-[11px] text-emerald-400 font-semibold">
                  {selectedBooking.startTime} - {selectedBooking.endTime}
                  {selectedBooking.durationMinutes && (
                    <span className="ml-1 text-slate-400">
                      ({Math.round(selectedBooking.durationMinutes / 60)} hrs)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Player Count & Add-ons */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Players / Squad</span>
                <p className="font-bold text-white mt-0.5">
                  {selectedBooking.playerCount || 10} Players
                </p>
                <p className="text-[10px] text-slate-400">Max venue capacity: 22</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Creation Timestamp</span>
                <p className="font-bold text-white mt-0.5">{formatDate(selectedBooking.createdAt)}</p>
                <p className="text-[10px] text-slate-400">Reference: {selectedBooking.bookingId}</p>
              </div>
            </div>

            {/* Historical Booking Price Snapshot */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Authoritative Price Snapshot
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Immutable Snapshot</span>
              </div>

              {/* Hourly segment breakdown if available */}
              {selectedBooking.pricingBreakdown?.hourlySegments?.length > 0 && (
                <div className="py-1 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400">Hourly Rate Schedule:</span>
                  {selectedBooking.pricingBreakdown.hourlySegments.map((seg, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-slate-300 pl-2 border-l border-emerald-500/40">
                      <span>
                        {seg.startTime} - {seg.endTime} ({seg.rateType} rate)
                      </span>
                      <span>₹{(seg.segmentPrice / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-slate-300 pt-1">
                <span>Turf Slots Subtotal:</span>
                <span>₹{(selectedBooking.slotPrice / 100).toFixed(2)}</span>
              </div>

              {selectedBooking.addOns?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400">Selected Add-Ons:</span>
                  {selectedBooking.addOns.map((addon, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-slate-300 pl-2">
                      <span>
                        {addon.name} × {addon.quantity}
                        {addon.pricingUnit === 'per_player' && ' (per player)'}
                      </span>
                      <span>₹{(addon.totalPrice / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-slate-300 font-medium pt-0.5 border-t border-slate-800/60">
                    <span>Add-ons Subtotal:</span>
                    <span>₹{((selectedBooking.addOnsTotal || 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-slate-300 pt-1">
                <span>GST Tax ({selectedBooking.taxRatePercentage}%):</span>
                <span>₹{((selectedBooking.taxAmount || 0) / 100).toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-white text-sm pt-2 border-t border-slate-800">
                <span>Final Total Amount:</span>
                <span className="text-emerald-400">₹{((selectedBooking.totalAmount || 0) / 100).toFixed(2)}</span>
              </div>
            </div>

            {selectedBooking.cancellationReason && (
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs">
                <strong>Cancellation Reason:</strong> {selectedBooking.cancellationReason}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Record Pay at Venue Payment Modal */}
      {isPaymentModalOpen && selectedBooking && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Record Payment • ${selectedBooking.bookingId}`}
        >
          <form onSubmit={handleSavePayment} className="space-y-4">
            {serverError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {serverError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Player:</span>
                <span className="font-semibold text-white">
                  {selectedBooking.contactDetails?.name || selectedBooking.user?.name}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 mt-1">
                <span>Total Due:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ₹{((selectedBooking.totalAmount || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Collection Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Pay at Venue">Pay at Venue (Cash at Desk)</option>
                <option value="upi">UPI / QR Code Scan</option>
                <option value="card">Card POS Terminal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Collection Notes / Receipt Ref (Optional)
              </label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. Counter receipt #9823 or UPI txn id"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={recordPaymentMutation.isPending}>
                Confirm Payment Collected
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Status Modal */}
      {isStatusModalOpen && selectedBooking && (
        <Modal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          title={`Update Status • ${selectedBooking.bookingId}`}
        >
          <form onSubmit={handleSaveStatus} className="space-y-4">
            {serverError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {serverError}
              </div>
            )}

            {selectedBooking.status === 'cancelled' ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                <p className="font-bold">Booking is Cancelled</p>
                <p className="text-[11px] text-slate-400">
                  Cancelled bookings are in a terminal state to maintain audit integrity and historical reports. Ordinary status updates cannot revert a cancelled booking.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Booking Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled (Releases Slot)</option>
                  </select>
                </div>

                {newStatus === 'cancelled' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cancellation Reason <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows="3"
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Specify reason for cancelling this booking..."
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                    <p className="text-[11px] text-amber-400">
                      Warning: Cancelling will immediately release the slot reservations, allowing other customers to book it.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
                Close
              </Button>
              {selectedBooking.status !== 'cancelled' && (
                <Button type="submit" isLoading={updateStatusMutation.isPending}>
                  Save Status
                </Button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default BookingsPage
