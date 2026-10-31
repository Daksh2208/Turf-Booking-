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
  const [selectedRefundStatus, setSelectedRefundStatus] = useState('')
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
  const [paymentMethod, setPaymentMethod] = useState('Cash at Counter')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')

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
        refundStatus: selectedRefundStatus,
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
        refundStatus: selectedRefundStatus,
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
    mutationFn: ({ id, paymentMethod, notes, amount }) =>
      adminInventoryService.recordPayment(id, { paymentMethod, notes, amount }),
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

  // Retry Stripe refund mutation
  const retryRefundMutation = useMutation({
    mutationFn: (id) => adminInventoryService.retryRefund(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      if (selectedBooking && selectedBooking._id === updated._id) {
        setSelectedBooking(updated)
      }
      setSuccessToast(
        `Stripe refund retry submitted for booking ${updated.bookingId}. Status: ${updated.refundStatus}.`
      )
      setTimeout(() => setSuccessToast(null), 5000)
    },
    onError: (err) => {
      setServerError(err.response?.data?.message || 'Failed to retry Stripe refund.')
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
    if (booking.paymentMethod === 'stripe' && booking.paymentPlan !== 'partial_advance') {
      setServerError('Full Stripe online payments cannot be manually recorded by an administrator. They must be verified via Stripe.')
      return
    }
    const due =
      booking.amountDue && booking.amountDue > 0
        ? booking.amountDue
        : Math.max(0, (booking.totalAmount || 0) - (booking.amountPaid || 0))
    setSelectedBooking(booking)
    setPaymentAmount(((due || 0) / 100).toFixed(2))
    setPaymentMethod('Cash at Counter')
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
    const parsedAmount = paymentAmount !== '' && !isNaN(Number(paymentAmount))
      ? Math.round(Number(paymentAmount) * 100)
      : undefined
    recordPaymentMutation.mutate({
      id: selectedBooking._id,
      paymentMethod,
      notes: paymentNotes,
      amount: parsedAmount,
    })
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#1B4E82] border border-[#BFDBFE]">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FDF0EF] text-[#922B27] border border-[#F5C2BF]">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FDF4E7] text-[#79420D] border border-[#F8E3C5]">
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
            <Check className="w-2.5 h-2.5" />
            Paid
          </span>
        )
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            <Timer className="w-2.5 h-2.5" />
            Partially Paid
          </span>
        )
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]">
            Refunded
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FDF4E7] text-[#79420D] border border-[#F8E3C5]">
            <AlertCircle className="w-2.5 h-2.5" />
            Unpaid
          </span>
        )
    }
  }

  const getRefundStatusBadge = (refundStatus, refundAmount) => {
    switch (refundStatus) {
      case 'succeeded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
            <Check className="w-2.5 h-2.5" />
            Refunded {refundAmount ? `₹${(refundAmount / 100).toFixed(2)}` : ''}
          </span>
        )
      case 'partially_refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]">
            Partial {refundAmount ? `₹${(refundAmount / 100).toFixed(2)}` : ''}
          </span>
        )
      case 'pending':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FDF4E7] text-[#79420D] border border-[#F8E3C5]">
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#79420D]" />
            Processing
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FDF0EF] text-[#922B27] border border-[#F5C2BF]">
            <AlertCircle className="w-2.5 h-2.5 text-[#922B27]" />
            Refund Failed
          </span>
        )
      case 'not_required':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-[#526258] bg-[#F0F2F0] border border-[#E2E8E3]">
            No Refund Due
          </span>
        )
      case 'not_applicable':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-[#526258] bg-[#F0F2F0] border border-[#E2E8E3]">
            N/A
          </span>
        )
      default:
        return null
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8E3]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
            Bookings & Reservations
          </h1>
          <p className="text-xs sm:text-sm text-[#526258] mt-1">
            Search customer reservations, audit pricing snapshots, record venue payments, and release slots.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-white border border-[#D7E0D9] text-xs font-semibold text-[#17231B] hover:bg-[#F0F6F1] hover:border-[#267A45] flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#526258]" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] text-[#1D6537] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#267A45]" />
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
                ? 'bg-[#267A45] text-white shadow-xs'
                : 'bg-white text-[#526258] hover:text-[#17231B] hover:bg-[#F0F6F1] border border-[#D7E0D9]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comprehensive Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9]">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#647168]" />
          <input
            type="text"
            placeholder="Search Reference, Player, Email, Phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#D7E0D9] text-xs text-[#17231B] placeholder-[#647168] focus:outline-none focus:border-[#267A45] focus:ring-1 focus:ring-[#267A45] transition-colors"
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
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#D7E0D9] text-xs text-[#17231B] focus:outline-none focus:border-[#267A45] cursor-pointer"
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
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#D7E0D9] text-xs text-[#17231B] focus:outline-none focus:border-[#267A45] cursor-pointer"
          >
            <option value="">All Payment States</option>
            <option value="unpaid">Unpaid (Pay at Venue)</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Refund Status Filter */}
        <div>
          <select
            value={selectedRefundStatus}
            onChange={(e) => {
              setSelectedRefundStatus(e.target.value)
              setPage(1)
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#D7E0D9] text-xs text-[#17231B] focus:outline-none focus:border-[#267A45] cursor-pointer"
          >
            <option value="">All Refund States</option>
            <option value="succeeded">Refund Succeeded</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="pending">Refund Pending / Processing</option>
            <option value="failed">Refund Failed (Needs Retry)</option>
            <option value="not_required">No Refund Due</option>
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
            className="w-1/2 px-2.5 py-2.5 rounded-xl bg-white border border-[#D7E0D9] text-[11px] text-[#17231B] focus:outline-none focus:border-[#267A45]"
          />
          <span className="text-[#647168] text-xs">-</span>
          <input
            type="date"
            title="End Date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setPage(1)
            }}
            className="w-1/2 px-2.5 py-2.5 rounded-xl bg-white border border-[#D7E0D9] text-[11px] text-[#17231B] focus:outline-none focus:border-[#267A45]"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-2xl bg-white border border-[#D7E0D9] overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#526258]">Loading bookings catalog...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#526258]">
            No reservations found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F0F4F1] text-[#526258] uppercase text-[10px] tracking-wider border-b border-[#D7E0D9]">
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
              <tbody className="divide-y divide-[#E2E8E3] text-[#17231B]">
                {bookings.map((b) => {
                  const customerName = b.contactDetails?.name || b.user?.name || 'Customer'
                  const customerPhone = b.contactDetails?.phone || b.user?.phone || ''
                  const customerEmail = b.contactDetails?.email || b.user?.email || ''
                  const isUnpaid = b.paymentStatus === 'unpaid' && b.status !== 'cancelled'

                  return (
                    <tr key={b._id} className="hover:bg-[#F0F6F1] transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-[#267A45]">
                        {b.bookingId}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#17231B]">{customerName}</p>
                        <p className="text-[11px] text-[#526258]">
                          {customerPhone ? `${customerPhone}` : customerEmail}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[#17231B]">{b.turf?.name || 'Arena'}</p>
                        <p className="text-[11px] text-[#526258]">{b.sport?.name || 'Multi-sport'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-[#17231B]">
                        <p className="font-medium">{b.date}</p>
                        <p className="text-[11px] text-[#526258]">
                          {b.startTime} - {b.endTime}
                          {b.durationMinutes && (
                            <span className="ml-1 text-[10px] text-[#267A45] font-semibold">
                              ({Math.round(b.durationMinutes / 60)}h)
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-[#17231B] whitespace-nowrap">
                        ₹{((b.totalAmount || 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getPaymentBadge(b.paymentStatus)}
                            {b.status === 'cancelled' && getRefundStatusBadge(b.refundStatus, b.refundAmount)}
                          </div>
                          <span className="text-[10px] text-[#526258] block capitalize">
                            {b.paymentMethod === 'stripe' ? 'Stripe Online' : (b.paymentMethod?.replace(/_/g, ' ') || 'Pay at Venue')}
                          </span>
                          {b.amountPaid > 0 && (
                            <span className="text-[10px] text-[#1D6537] font-semibold block">
                              Paid: ₹{((b.amountPaid || 0) / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(b.status)}
                      </td>
                      <td className="px-4 py-3.5 text-[#526258] text-[11px] whitespace-nowrap">
                        {formatDate(b.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBooking(b)
                            setIsDetailsOpen(true)
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#17231B] hover:text-[#267A45] bg-[#EEF3EF] hover:bg-[#E7F3E9] transition-colors cursor-pointer"
                          title="View details & price snapshot"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1 text-[#267A45]" />
                          Details
                        </button>

                        {(b.paymentStatus === 'partially_paid' || (isUnpaid && b.paymentMethod !== 'stripe')) && b.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(b)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#79420D] hover:text-[#79420D] bg-[#FDF4E7] hover:bg-[#F8E3C5] border border-[#F8E3C5] transition-colors cursor-pointer"
                            title="Record venue remaining payment"
                          >
                            <Banknote className="w-3.5 h-3.5 inline mr-1" />
                            Record Pay
                          </button>
                        )}

                        {b.refundStatus === 'failed' && (
                          <button
                            type="button"
                            onClick={() => retryRefundMutation.mutate(b._id)}
                            disabled={retryRefundMutation.isPending}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#922B27] hover:text-[#7A1E1A] bg-[#FDF0EF] hover:bg-[#F8D2CE] border border-[#F8D2CE] transition-colors cursor-pointer"
                            title="Retry failed Stripe refund"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 inline mr-1 ${
                                retryRefundMutation.isPending ? 'animate-spin' : ''
                              }`}
                            />
                            Retry Refund
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(b)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#1D6537] hover:text-[#1D6537] bg-[#E7F3E9] hover:bg-[#C9DFCE] border border-[#C9DFCE] transition-colors cursor-pointer"
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
          <p className="text-xs text-[#526258]">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total bookings)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-xl text-xs bg-white border border-[#D7E0D9] text-[#17231B] hover:bg-[#F0F6F1] disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-xl text-xs bg-white border border-[#D7E0D9] text-[#17231B] hover:bg-[#F0F6F1] disabled:opacity-40 cursor-pointer"
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
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#526258] block">Booking Status</span>
                <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
                {selectedBooking.cancelledAt && (
                  <p className="text-[10px] text-[#922B27] mt-1">
                    Cancelled: {formatDate(selectedBooking.cancelledAt)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#526258] block">Payment State</span>
                <div className="mt-1 flex justify-end">{getPaymentBadge(selectedBooking.paymentStatus)}</div>
                <span className="text-[11px] text-[#526258] capitalize mt-1 inline-block">
                  {selectedBooking.paymentMethod?.replace(/_/g, ' ')}
                </span>
                {selectedBooking.paidAt && (
                  <p className="text-[10px] text-[#1D6537] mt-0.5">
                    Paid On: {formatDate(selectedBooking.paidAt)}
                  </p>
                )}
              </div>
            </div>

            {/* Unpaid / Partial Payment Warning Banner with quick Pay action */}
            {(selectedBooking.paymentStatus === 'unpaid' || selectedBooking.paymentStatus === 'partially_paid') && selectedBooking.status !== 'cancelled' && (
              <div className="p-3 rounded-xl bg-[#FDF4E7] border border-[#F8E3C5] flex items-center justify-between text-[#79420D]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {selectedBooking.paymentStatus === 'partially_paid'
                      ? `Advance paid. Remaining balance ₹${(((selectedBooking.amountDue ?? (selectedBooking.totalAmount - (selectedBooking.amountPaid || 0)))) / 100).toFixed(2)} due at counter.`
                      : 'Pay at Venue payment pending receipt at the counter.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsOpen(false)
                    handleOpenPaymentModal(selectedBooking)
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0 ml-2"
                >
                  Record Payment
                </button>
              </div>
            )}

            {/* Customer Details */}
            <div className="p-3.5 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#526258] block">Customer Information</span>
              <p className="font-bold text-[#17231B] text-sm">
                {selectedBooking.contactDetails?.name || selectedBooking.user?.name || 'Customer'}
              </p>
              <p className="text-[#526258]">
                {selectedBooking.contactDetails?.email || selectedBooking.user?.email}
              </p>
              <p className="text-[#526258]">
                Phone: {selectedBooking.contactDetails?.phone || selectedBooking.user?.phone || 'Not provided'}
              </p>
            </div>

            {/* Arena & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9]">
                <span className="text-[10px] uppercase font-bold text-[#526258] block">Arena</span>
                <p className="font-bold text-[#17231B] mt-0.5">{selectedBooking.turf?.name}</p>
                <p className="text-[11px] text-[#526258]">{selectedBooking.sport?.name || 'Box Cricket'}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9]">
                <span className="text-[10px] uppercase font-bold text-[#526258] block">Date & Timing</span>
                <p className="font-bold text-[#17231B] mt-0.5">{selectedBooking.date}</p>
                <p className="text-[11px] text-[#267A45] font-semibold">
                  {selectedBooking.startTime} - {selectedBooking.endTime}
                  {selectedBooking.durationMinutes && (
                    <span className="ml-1 text-[#526258]">
                      ({Math.round(selectedBooking.durationMinutes / 60)} hrs)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Player Count & Add-ons */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9]">
                <span className="text-[10px] uppercase font-bold text-[#526258] block">Players / Squad</span>
                <p className="font-bold text-[#17231B] mt-0.5">
                  {selectedBooking.playerCount || 10} Players
                </p>
                <p className="text-[10px] text-[#526258]">Max venue capacity: 22</p>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9]">
                <span className="text-[10px] uppercase font-bold text-[#526258] block">Creation Timestamp</span>
                <p className="font-bold text-[#17231B] mt-0.5">{formatDate(selectedBooking.createdAt)}</p>
                <p className="text-[10px] text-[#526258]">Reference: {selectedBooking.bookingId}</p>
              </div>
            </div>

            {/* Historical Booking Price Snapshot */}
            <div className="p-4 rounded-xl bg-white border border-[#D7E0D9] space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#E2E8E3]">
                <span className="text-[10px] uppercase font-bold text-[#526258] block">
                  Authoritative Price Snapshot
                </span>
                <span className="text-[10px] text-[#647168] font-mono">Immutable Snapshot</span>
              </div>

              {/* Hourly segment breakdown if available */}
              {selectedBooking.pricingBreakdown?.hourlySegments?.length > 0 && (
                <div className="py-1 space-y-1">
                  <span className="text-[10px] font-semibold text-[#526258]">Hourly Rate Schedule:</span>
                  {selectedBooking.pricingBreakdown.hourlySegments.map((seg, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-[#17231B] pl-2 border-l border-[#267A45]">
                      <span>
                        {seg.startTime} - {seg.endTime} ({seg.rateType} rate)
                      </span>
                      <span>₹{(seg.segmentPrice / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-[#17231B] pt-1">
                <span className="text-[#526258]">Turf Slots Subtotal:</span>
                <span>₹{(selectedBooking.slotPrice / 100).toFixed(2)}</span>
              </div>

              {selectedBooking.addOns?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-semibold text-[#526258]">Selected Add-Ons:</span>
                  {selectedBooking.addOns.map((addon, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-[#17231B] pl-2">
                      <span>
                        {addon.name} × {addon.quantity}
                        {addon.pricingUnit === 'per_player' && ' (per player)'}
                      </span>
                      <span>₹{(addon.totalPrice / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[#17231B] font-medium pt-0.5 border-t border-[#E2E8E3]">
                    <span className="text-[#526258]">Add-ons Subtotal:</span>
                    <span>₹{((selectedBooking.addOnsTotal || 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-[#17231B] pt-1">
                <span className="text-[#526258]">GST Tax ({selectedBooking.taxRatePercentage}%):</span>
                <span>₹{((selectedBooking.taxAmount || 0) / 100).toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-[#17231B] text-sm pt-2 border-t border-[#E2E8E3]">
                <span>Final Total Amount:</span>
                <span className="text-[#267A45]">₹{((selectedBooking.totalAmount || 0) / 100).toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-[#E2E8E3] space-y-1 text-xs">
                <div className="flex justify-between text-[#526258]">
                  <span>Payment Plan:</span>
                  <span className="font-semibold text-[#17231B] capitalize">
                    {selectedBooking.paymentPlan === 'partial_advance'
                      ? `Partial Advance (${selectedBooking.advancePercentage || 20}%)`
                      : 'Full Online Pre-Paid'}
                  </span>
                </div>
                <div className="flex justify-between text-[#1D6537]">
                  <span>Amount Paid:</span>
                  <span className="font-mono font-bold">
                    ₹{((selectedBooking.amountPaid || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[#79420D]">
                  <span>Remaining Due:</span>
                  <span className="font-mono font-bold">
                    ₹{(((selectedBooking.amountDue ?? (selectedBooking.totalAmount - (selectedBooking.amountPaid || 0)))) / 100).toFixed(2)}
                  </span>
                </div>
                {selectedBooking.venuePayment?.collectedAt && (
                  <div className="mt-2 p-2 rounded-lg bg-[#F6F8F6] border border-[#D7E0D9] text-[11px] text-[#526258]">
                    <span className="font-bold text-[#17231B] block">Counter Settlement:</span>
                    <span>Collected ₹{((selectedBooking.venuePayment.amount || 0) / 100).toFixed(2)} via {selectedBooking.venuePayment.paymentMethod}</span>
                    {selectedBooking.venuePayment.notes && <span className="block italic">Notes: "{selectedBooking.venuePayment.notes}"</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Cancellation & Refund Management Section */}
            {(selectedBooking.status === 'cancelled' || selectedBooking.refundStatus !== 'not_applicable') && (
              <div className="p-3.5 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#F5C2BF] pb-1.5">
                  <span className="font-bold text-[#922B27] flex items-center gap-1.5 text-xs">
                    <XCircle className="w-3.5 h-3.5" />
                    Cancellation & Refund Summary
                  </span>
                  <div>{getRefundStatusBadge(selectedBooking.refundStatus, selectedBooking.refundAmount)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#17231B]">
                  <div>
                    <span className="text-[#647168] block">Cancelled By:</span>
                    <span className="font-semibold capitalize">
                      {selectedBooking.cancelledBy?.role || 'System'}
                      {selectedBooking.cancelledBy?.user?.name ? ` (${selectedBooking.cancelledBy.user.name})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#647168] block">Cancelled At:</span>
                    <span className="font-semibold">{formatDate(selectedBooking.cancelledAt)}</span>
                  </div>
                  <div>
                    <span className="text-[#647168] block">Policy Refund Rate:</span>
                    <span className="font-semibold">{selectedBooking.refundPercentage ?? 0}%</span>
                  </div>
                  <div>
                    <span className="text-[#647168] block">Actual Refunded:</span>
                    <span className="font-mono font-bold text-[#1D6537]">
                      ₹{((selectedBooking.refundAmount || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {selectedBooking.cancellationReason && (
                  <div className="text-[11px] pt-1">
                    <strong className="text-[#922B27]">Reason:</strong>{' '}
                    <span className="text-[#17231B]">{selectedBooking.cancellationReason}</span>
                  </div>
                )}

                {selectedBooking.stripeRefundId && (
                  <div className="text-[11px] pt-1 border-t border-[#F8D2CE]">
                    <span className="text-[#647168]">Stripe Refund Reference:</span>{' '}
                    <span className="font-mono font-semibold text-[#17231B]">{selectedBooking.stripeRefundId}</span>
                  </div>
                )}

                {selectedBooking.refundFailureReason && (
                  <div className="p-2 rounded-lg bg-white border border-[#F5C2BF] text-[11px] text-[#922B27] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#922B27]" />
                    <div>
                      <strong>Failure Details:</strong> {selectedBooking.refundFailureReason}
                    </div>
                  </div>
                )}

                {selectedBooking.refundStatus === 'failed' && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => retryRefundMutation.mutate(selectedBooking._id)}
                      disabled={retryRefundMutation.isPending}
                      className="px-3 py-1.5 rounded-xl bg-[#922B27] hover:bg-[#7A1E1A] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${retryRefundMutation.isPending ? 'animate-spin' : ''}`}
                      />
                      <span>Retry Stripe Refund</span>
                    </button>
                  </div>
                )}
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
              <div className="p-3 rounded-xl bg-[#FDF0EF] border border-[#F5C2BF] text-[#922B27] text-xs">
                {serverError}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] text-xs space-y-1.5">
              <div className="flex justify-between text-[#526258]">
                <span>Customer:</span>
                <span className="font-semibold text-[#17231B]">
                  {selectedBooking.contactDetails?.name || selectedBooking.user?.name}
                </span>
              </div>
              <div className="flex justify-between text-[#526258]">
                <span>Total Booking Amount:</span>
                <span className="font-mono font-semibold text-[#17231B]">
                  ₹{((selectedBooking.totalAmount || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#1D6537]">
                <span>Advance Paid Online:</span>
                <span className="font-mono font-semibold">
                  ₹{((selectedBooking.amountPaid || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#79420D] pt-1 border-t border-[#D7E0D9]">
                <span className="font-bold">Remaining Due at Venue:</span>
                <span className="font-bold font-mono text-sm">
                  ₹{(((selectedBooking.amountDue ?? (selectedBooking.totalAmount - (selectedBooking.amountPaid || 0)))) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17231B] mb-1">
                Amount to Collect (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={(((selectedBooking.amountDue ?? (selectedBooking.totalAmount - (selectedBooking.amountPaid || 0)))) / 100).toFixed(2)}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#D7E0D9] text-xs font-mono font-bold text-[#17231B] focus:outline-none focus:border-[#267A45]"
              />
              <span className="text-[10px] text-[#526258] mt-1 block">
                Pre-filled with total remaining balance. Partial collection is allowed; overpayment is blocked.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17231B] mb-1">
                Payment Collection Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#D7E0D9] text-xs text-[#17231B] focus:outline-none focus:border-[#267A45]"
              >
                <option value="Cash at Counter">Cash at Counter</option>
                <option value="upi">UPI / QR Code Scan</option>
                <option value="card">Card POS Terminal</option>
                <option value="Pay at Venue">Pay at Venue (General)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17231B] mb-1">
                Collection Notes / Receipt Ref (Optional)
              </label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. Counter receipt #9823 or UPI txn id"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#D7E0D9] text-xs text-[#17231B] placeholder-[#647168] focus:outline-none focus:border-[#267A45]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8E3]">
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
              <div className="p-3 rounded-xl bg-[#FDF0EF] border border-[#F5C2BF] text-[#922B27] text-xs">
                {serverError}
              </div>
            )}

            {selectedBooking.status === 'cancelled' ? (
              <div className="p-4 rounded-xl bg-[#FDF0EF] border border-[#F5C2BF] text-[#922B27] text-xs space-y-1">
                <p className="font-bold">Booking is Cancelled</p>
                <p className="text-[11px] text-[#526258]">
                  Cancelled bookings are in a terminal state to maintain audit integrity and historical reports. Ordinary status updates cannot revert a cancelled booking.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#17231B] mb-1">
                    Booking Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D7E0D9] text-xs text-[#17231B] focus:outline-none focus:border-[#267A45]"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled (Releases Slot)</option>
                  </select>
                </div>

                {newStatus === 'cancelled' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#17231B] mb-1">
                      Cancellation Reason <span className="text-[#922B27]">*</span>
                    </label>
                    <textarea
                      rows="3"
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Specify reason for cancelling this booking..."
                      className="w-full p-3 rounded-xl bg-white border border-[#D7E0D9] text-xs text-[#17231B] placeholder-[#647168] focus:outline-none focus:border-[#267A45]"
                      required
                    />
                    <p className="text-[11px] text-[#79420D]">
                      Warning: Cancelling will immediately release the slot reservations, allowing other customers to book it.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8E3]">
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
