import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('confirmed')
  const [cancellationReason, setCancellationReason] = useState('')
  const [successToast, setSuccessToast] = useState(null)
  const [serverError, setServerError] = useState(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminBookings', { status: selectedStatus, search, date: dateFilter, page }],
    queryFn: () =>
      adminInventoryService.getBookings({
        status: selectedStatus,
        search,
        date: dateFilter,
        page,
        limit: 15,
      }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, cancellationReason }) =>
      adminInventoryService.updateBookingStatus(id, { status, cancellationReason }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setIsStatusModalOpen(false)
      setSuccessToast(`Booking ${updated.bookingId} status updated to ${updated.status}. Slot state refreshed.`)
      setTimeout(() => setSuccessToast(null), 4000)
    },
    onError: (err) => {
      setServerError(err.response?.data?.message || 'Failed to update booking status.')
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

  const handleSaveStatus = (e) => {
    e.preventDefault()
    if (!selectedBooking) return
    updateStatusMutation.mutate({
      id: selectedBooking._id,
      status: newStatus,
      cancellationReason,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Bookings & Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor player reservations, view payment breakdowns, and release or complete slots.
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

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Booking ID (e.g. TB-261027)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value)
              setPage(1)
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  <th className="px-4 py-3.5">Booking ID</th>
                  <th className="px-4 py-3.5">Player</th>
                  <th className="px-4 py-3.5">Arena & Sport</th>
                  <th className="px-4 py-3.5">Date & Slot</th>
                  <th className="px-4 py-3.5">Rate Type</th>
                  <th className="px-4 py-3.5">Total (₹)</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                      {b.bookingId}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-white">{b.user?.name || 'Customer'}</p>
                      <p className="text-[11px] text-slate-400">{b.user?.phone || b.user?.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-200">{b.turf?.name || 'Arena'}</p>
                      <p className="text-[11px] text-slate-400">{b.sport?.name || 'Sport'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      <p className="font-medium">{b.date}</p>
                      <p className="text-[11px] text-slate-400">{b.startTime} - {b.endTime}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                        {b.rateType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-white">
                      ₹{((b.totalAmount || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBooking(b)
                          setIsDetailsOpen(true)
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1" />
                        Details
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenStatusModal(b)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-600/30 border border-emerald-500/30 transition-colors cursor-pointer"
                        title="Change status"
                      >
                        Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} bookings)
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

      {/* View Details Modal */}
      {isDetailsOpen && selectedBooking && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Booking Details • ${selectedBooking.bookingId}`}
        >
          <div className="space-y-4 text-xs">
            {/* Status & ID */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Method</span>
                <span className="font-semibold text-slate-200 capitalize mt-1 inline-block">
                  {selectedBooking.paymentMethod.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Information</span>
              <p className="font-bold text-white text-sm">{selectedBooking.user?.name || 'Customer'}</p>
              <p className="text-slate-400">{selectedBooking.user?.email}</p>
              {selectedBooking.user?.phone && <p className="text-slate-400">{selectedBooking.user.phone}</p>}
            </div>

            {/* Arena & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Arena</span>
                <p className="font-bold text-white mt-0.5">{selectedBooking.turf?.name}</p>
                <p className="text-[11px] text-slate-400">{selectedBooking.sport?.name}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date & Timing</span>
                <p className="font-bold text-white mt-0.5">{selectedBooking.date}</p>
                <p className="text-[11px] text-emerald-400 font-semibold">{selectedBooking.startTime} - {selectedBooking.endTime}</p>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Price Breakdown</span>
              <div className="flex justify-between text-slate-300">
                <span>Slot Rate ({selectedBooking.rateType}):</span>
                <span>₹{(selectedBooking.slotPrice / 100).toFixed(2)}</span>
              </div>
              {selectedBooking.addOns?.length > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Add-Ons ({selectedBooking.addOns.length} items):</span>
                  <span>₹{((selectedBooking.addOnsTotal || 0) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-300">
                <span>GST Tax ({selectedBooking.taxRatePercentage}%):</span>
                <span>₹{((selectedBooking.taxAmount || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-white text-sm pt-2 border-t border-slate-800">
                <span>Total Amount:</span>
                <span className="text-emerald-400">₹{((selectedBooking.totalAmount || 0) / 100).toFixed(2)}</span>
              </div>
            </div>

            {selectedBooking.cancellationReason && (
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs">
                <strong>Cancellation Note:</strong> {selectedBooking.cancellationReason}
              </div>
            )}
          </div>
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
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cancellation Reason (Slot will be immediately available for re-booking)
                </label>
                <textarea
                  rows="3"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="State the reason for slot cancellation..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
                Close
              </Button>
              <Button type="submit" isLoading={updateStatusMutation.isPending}>
                Save Status
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default BookingsPage
