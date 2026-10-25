import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '../../hooks/useApi'
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Percent,
  IndianRupee,
  Users,
  Clock,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react'
import adminCouponService from '../../services/admin/coupon.service'
import adminInventoryService from '../../services/admin/inventory.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { FormField } from '../../components/common/FormField'
import { Input } from '../../components/common/Input'

const STATUS_TABS = [
  { id: 'all', label: 'All Coupons' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'expired', label: 'Expired' },
  { id: 'scheduled', label: 'Scheduled' },
]

export const CouponsPage = () => {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [deletingCoupon, setDeletingCoupon] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)

  // Form State
  const initialFormState = {
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minimumBookingRupees: '',
    maximumDiscountRupees: '',
    startAt: '',
    expiresAt: '',
    usageLimit: '',
    perUserLimit: '1',
    eligibleSports: [],
    eligibleTurfs: [],
    isActive: true,
  }

  const [formData, setFormData] = useState(initialFormState)

  const showToast = (message, type = 'success') => {
    setSuccessToast({ message, type })
    setTimeout(() => setSuccessToast(null), 4000)
  }

  // Fetch Coupons
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-coupons', page, search, selectedStatus],
    queryFn: () =>
      adminCouponService.getCoupons({
        page,
        limit: 20,
        search,
        status: selectedStatus,
      }),
  })

  // Fetch Turfs & Sports for restrictions selector
  const { data: sportsData } = useQuery({
    queryKey: ['admin-sports-selector'],
    queryFn: () => adminInventoryService.getSports({ limit: 100 }),
  })

  const { data: turfsData } = useQuery({
    queryKey: ['admin-turfs-selector'],
    queryFn: () => adminInventoryService.getTurfs({ limit: 100 }),
  })

  const coupons = data?.coupons || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  const sports = sportsData?.sports || []
  const turfs = turfsData?.turfs || []

  const invalidateCouponQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
  }

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (payload) => adminCouponService.createCoupon(payload),
    onSuccess: (created) => {
      invalidateCouponQueries()
      setIsFormModalOpen(false)
      showToast(`Coupon "${created.code}" created successfully!`)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || err.message || 'Failed to create coupon.')
    },
  })

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => adminCouponService.updateCoupon(id, updates),
    onSuccess: (updated) => {
      invalidateCouponQueries()
      setIsFormModalOpen(false)
      showToast(`Coupon "${updated.code}" updated successfully!`)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || err.message || 'Failed to update coupon.')
    },
  })

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminCouponService.toggleCouponStatus(id, isActive),
    onSuccess: (updated) => {
      invalidateCouponQueries()
      showToast(`Coupon "${updated.code}" is now ${updated.isActive ? 'active' : 'inactive'}.`)
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to update status.', 'error')
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminCouponService.deleteCoupon(id),
    onSuccess: (res) => {
      invalidateCouponQueries()
      setIsDeleteModalOpen(false)
      showToast(res.message || 'Coupon processed successfully.')
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete coupon.', 'error')
    },
  })

  const handleOpenCreateModal = () => {
    setEditingCoupon(null)
    setFormData(initialFormState)
    setServerError(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon)
    setServerError(null)

    const formatForDatetimeInput = (dateStr) => {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ''
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue:
        coupon.discountType === 'percentage'
          ? coupon.discountValue
          : (coupon.discountValue / 100).toString(),
      minimumBookingRupees:
        coupon.minimumBookingAmount > 0
          ? (coupon.minimumBookingAmount / 100).toString()
          : '',
      maximumDiscountRupees:
        coupon.maximumDiscountAmount > 0
          ? (coupon.maximumDiscountAmount / 100).toString()
          : '',
      startAt: formatForDatetimeInput(coupon.startAt),
      expiresAt: formatForDatetimeInput(coupon.expiresAt),
      usageLimit: coupon.usageLimit ? coupon.usageLimit.toString() : '',
      perUserLimit: coupon.perUserLimit ? coupon.perUserLimit.toString() : '1',
      eligibleSports: Array.isArray(coupon.eligibleSports)
        ? coupon.eligibleSports.map((s) => (typeof s === 'object' ? s._id : s))
        : [],
      eligibleTurfs: Array.isArray(coupon.eligibleTurfs)
        ? coupon.eligibleTurfs.map((t) => (typeof t === 'object' ? t._id : t))
        : [],
      isActive: coupon.isActive,
    })

    setIsFormModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setServerError(null)

    const code = formData.code.trim().toUpperCase()
    if (!code || code.length < 3) {
      setServerError('Coupon code must be at least 3 characters.')
      return
    }

    const discountVal = parseFloat(formData.discountValue)
    if (isNaN(discountVal) || discountVal <= 0) {
      setServerError('Discount value must be a positive number.')
      return
    }

    if (formData.discountType === 'percentage' && (discountVal < 1 || discountVal > 100)) {
      setServerError('Percentage discount must be between 1% and 100%.')
      return
    }

    // Convert Rupees to paise for monetary fields
    const minBookingPaise = formData.minimumBookingRupees
      ? Math.round(parseFloat(formData.minimumBookingRupees) * 100)
      : 0
    const maxDiscountPaise = formData.maximumDiscountRupees
      ? Math.round(parseFloat(formData.maximumDiscountRupees) * 100)
      : null

    const payload = {
      code,
      description: formData.description.trim(),
      discountType: formData.discountType,
      discountValue:
        formData.discountType === 'percentage'
          ? discountVal
          : Math.round(discountVal * 100), // in paise
      minimumBookingAmount: minBookingPaise,
      maximumDiscountAmount: maxDiscountPaise,
      startAt: formData.startAt ? new Date(formData.startAt).toISOString() : null,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
      perUserLimit: formData.perUserLimit ? parseInt(formData.perUserLimit, 10) : 1,
      eligibleSports: formData.eligibleSports,
      eligibleTurfs: formData.eligibleTurfs,
      isActive: formData.isActive,
    }

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon._id, updates: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const getStatusBadge = (coupon) => {
    const now = new Date()
    const startAt = coupon.startAt ? new Date(coupon.startAt) : null
    const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null

    if (!coupon.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          Inactive
        </span>
      )
    }

    if (expiresAt && now > expiresAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Expired
        </span>
      )
    }

    if (startAt && now < startAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Scheduled
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-200 ${
            successToast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {successToast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span>{successToast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17231B] flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-[#267A45]" />
            Coupon Codes
          </h1>
          <p className="text-sm text-[#526258] mt-1">
            Manage promotional discounts, redemption caps, and eligibility rules for customer checkout.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 self-start sm:self-auto bg-[#267A45] hover:bg-[#1E6137] text-white"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedStatus(tab.id)
                setPage(1)
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === tab.id
                  ? 'bg-[#267A45] text-white'
                  : 'bg-gray-100 text-[#526258] hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search coupon code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#267A45] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-3 border-[#267A45] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500 mt-3 font-medium">Loading coupon rules...</p>
          </div>
        ) : isError ? (
          <div className="py-16 px-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-gray-900">Failed to load coupons</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              {error?.response?.data?.error?.message || error?.message || 'Network error occurred.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => invalidateCouponQueries()}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-900">No coupons found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {search || selectedStatus !== 'all'
                ? 'No coupon codes match your active filters. Try searching for a different keyword or resetting status.'
                : 'You have not created any promotional coupon codes yet. Create your first coupon to offer customer discounts.'}
            </p>
            {!search && selectedStatus === 'all' && (
              <Button
                onClick={handleOpenCreateModal}
                size="sm"
                className="mt-4 bg-[#267A45] text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create First Coupon
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Min. Subtotal</th>
                  <th className="py-3 px-4">Max Cap</th>
                  <th className="py-3 px-4">Redemptions</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Code & Description */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-sm text-[#17231B] tracking-wide">
                          {coupon.code}
                        </span>
                        {coupon.description ? (
                          <span className="text-gray-500 text-[11px] truncate max-w-xs mt-0.5">
                            {coupon.description}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">No description</span>
                        )}
                        {(coupon.eligibleSports?.length > 0 || coupon.eligibleTurfs?.length > 0) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {coupon.eligibleSports?.length > 0 && (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">
                                {coupon.eligibleSports.length} Sport(s)
                              </span>
                            )}
                            {coupon.eligibleTurfs?.length > 0 && (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium">
                                {coupon.eligibleTurfs.length} Turf(s)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Discount */}
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {coupon.discountType === 'percentage' ? (
                        <span className="inline-flex items-center gap-1 text-[#267A45] font-bold">
                          <Percent className="w-3.5 h-3.5" />
                          {coupon.discountValue}% OFF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[#267A45] font-bold">
                          <IndianRupee className="w-3.5 h-3.5" />
                          {(coupon.discountValue / 100).toFixed(0)} FLAT
                        </span>
                      )}
                    </td>

                    {/* Min Subtotal */}
                    <td className="py-3.5 px-4 text-gray-700">
                      {coupon.minimumBookingAmount > 0 ? (
                        <span>₹{(coupon.minimumBookingAmount / 100).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-gray-400 font-normal">None</span>
                      )}
                    </td>

                    {/* Max Cap */}
                    <td className="py-3.5 px-4 text-gray-700">
                      {coupon.discountType === 'percentage' && coupon.maximumDiscountAmount > 0 ? (
                        <span>₹{(coupon.maximumDiscountAmount / 100).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-gray-400 font-normal">—</span>
                      )}
                    </td>

                    {/* Redemptions */}
                    <td className="py-3.5 px-4 text-gray-700">
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          {coupon.usedCount}
                          <span className="text-gray-400 font-normal">
                            {' / '}
                            {coupon.usageLimit ? coupon.usageLimit : '∞'}
                          </span>
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {coupon.perUserLimit ? `${coupon.perUserLimit}x per user` : '1x per user'}
                        </span>
                      </div>
                    </td>

                    {/* Validity */}
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="flex flex-col text-[11px]">
                        {coupon.startAt && (
                          <span>From: {new Date(coupon.startAt).toLocaleDateString()}</span>
                        )}
                        {coupon.expiresAt ? (
                          <span>Until: {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-gray-400">Never expires</span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">{getStatusBadge(coupon)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle Active Button */}
                        <button
                          title={coupon.isActive ? 'Deactivate Coupon' : 'Activate Coupon'}
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: coupon._id,
                              isActive: !coupon.isActive,
                            })
                          }
                          disabled={toggleStatusMutation.isLoading}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            coupon.isActive
                              ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                              : 'text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          title="Edit Coupon"
                          onClick={() => handleOpenEditModal(coupon)}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-[#17231B] transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          title="Delete / Deactivate Coupon"
                          onClick={() => {
                            setDeletingCoupon(coupon)
                            setIsDeleteModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <span>
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCoupon ? `Edit Coupon "${editingCoupon.code}"` : 'Create New Promotional Coupon'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {serverError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Code & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Coupon Code" required hint="Stored uppercase">
              <Input
                type="text"
                placeholder="e.g. WELCOME100"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                required
              />
            </FormField>

            <FormField label="Description" hint="Optional notes">
              <Input
                type="text"
                placeholder="e.g. 10% discount on weekend cricket"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </FormField>
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-[#17231B] mb-1.5">
                Discount Type <span className="text-[#267A45] font-bold">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discountType: 'percentage' })}
                  className={`flex-1 py-1.5 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    formData.discountType === 'percentage'
                      ? 'bg-white border-[#267A45] text-[#267A45] shadow-xs'
                      : 'bg-gray-100 border-gray-200 text-gray-600'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discountType: 'fixed' })}
                  className={`flex-1 py-1.5 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    formData.discountType === 'fixed'
                      ? 'bg-white border-[#267A45] text-[#267A45] shadow-xs'
                      : 'bg-gray-100 border-gray-200 text-gray-600'
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  Fixed Amount (₹)
                </button>
              </div>
            </div>

            <FormField
              label={
                formData.discountType === 'percentage'
                  ? 'Discount Value (1% - 100%)'
                  : 'Discount Value (in Rupees ₹)'
              }
              required
            >
              <Input
                type="number"
                min="1"
                max={formData.discountType === 'percentage' ? '100' : undefined}
                placeholder={formData.discountType === 'percentage' ? '20' : '150'}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                required
              />
            </FormField>
          </div>

          {/* Min Subtotal & Max Cap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Min. Booking Subtotal (₹)" hint="0 for no minimum">
              <Input
                type="number"
                min="0"
                placeholder="e.g. 500"
                value={formData.minimumBookingRupees}
                onChange={(e) =>
                  setFormData({ ...formData, minimumBookingRupees: e.target.value })
                }
              />
            </FormField>

            <FormField
              label="Maximum Discount Cap (₹)"
              hint={formData.discountType === 'percentage' ? 'Cap for % discount' : 'Not applicable'}
            >
              <Input
                type="number"
                min="0"
                disabled={formData.discountType !== 'percentage'}
                placeholder="e.g. 200"
                value={formData.maximumDiscountRupees}
                onChange={(e) =>
                  setFormData({ ...formData, maximumDiscountRupees: e.target.value })
                }
              />
            </FormField>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Valid From (Start Date/Time)" hint="Leave blank to start immediately">
              <Input
                type="datetime-local"
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
              />
            </FormField>

            <FormField label="Valid Until (Expiry Date/Time)" hint="Leave blank to never expire">
              <Input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </FormField>
          </div>

          {/* Usage Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Global Usage Limit" hint="Blank for unlimited redemptions">
              <Input
                type="number"
                min="1"
                placeholder="e.g. 100"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
              />
            </FormField>

            <FormField label="Per-Customer Usage Limit" required hint="Max times 1 user can redeem">
              <Input
                type="number"
                min="1"
                value={formData.perUserLimit}
                onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                required
              />
            </FormField>
          </div>

          {/* Restrictions: Sports */}
          {sports.length > 0 && (
            <div className="border border-gray-200 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-gray-800">
                  Eligible Sports Restriction
                </label>
                <span className="text-[11px] text-gray-500">
                  {formData.eligibleSports.length === 0
                    ? 'All sports eligible'
                    : `${formData.eligibleSports.length} sport(s) selected`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                {sports.map((sport) => {
                  const isChecked = formData.eligibleSports.includes(sport._id)
                  return (
                    <button
                      type="button"
                      key={sport._id}
                      onClick={() => {
                        if (isChecked) {
                          setFormData({
                            ...formData,
                            eligibleSports: formData.eligibleSports.filter((id) => id !== sport._id),
                          })
                        } else {
                          setFormData({
                            ...formData,
                            eligibleSports: [...formData.eligibleSports, sport._id],
                          })
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        isChecked
                          ? 'bg-[#267A45] text-white border-[#267A45]'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {sport.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Restrictions: Turfs */}
          {turfs.length > 0 && (
            <div className="border border-gray-200 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-gray-800">Eligible Turfs Restriction</label>
                <span className="text-[11px] text-gray-500">
                  {formData.eligibleTurfs.length === 0
                    ? 'All turfs eligible'
                    : `${formData.eligibleTurfs.length} turf(s) selected`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                {turfs.map((turf) => {
                  const isChecked = formData.eligibleTurfs.includes(turf._id)
                  return (
                    <button
                      type="button"
                      key={turf._id}
                      onClick={() => {
                        if (isChecked) {
                          setFormData({
                            ...formData,
                            eligibleTurfs: formData.eligibleTurfs.filter((id) => id !== turf._id),
                          })
                        } else {
                          setFormData({
                            ...formData,
                            eligibleTurfs: [...formData.eligibleTurfs, turf._id],
                          })
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        isChecked
                          ? 'bg-[#267A45] text-white border-[#267A45]'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {turf.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active status checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCoupon"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-[#267A45] rounded border-gray-300 focus:ring-[#267A45]"
            />
            <label htmlFor="isActiveCoupon" className="font-semibold text-gray-800">
              Coupon is Active and can be redeemed immediately (if valid date range)
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isLoading || updateMutation.isLoading}
              className="bg-[#267A45] text-white"
            >
              {createMutation.isLoading || updateMutation.isLoading
                ? 'Saving...'
                : editingCoupon
                ? 'Update Coupon'
                : 'Create Coupon'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete Coupon "${deletingCoupon?.code}"`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">
            Are you sure you want to delete coupon{' '}
            <strong className="text-gray-900">{deletingCoupon?.code}</strong>?
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
            <strong>Note on safe redemption integrity:</strong> If this coupon has previously been
            redeemed on existing customer bookings, it will be safely deactivated and soft-deleted.
            Historical booking receipts and pricing breakdowns will retain their applied coupon
            snapshot intact.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isLoading}
              onClick={() => deletingCoupon && deleteMutation.mutate(deletingCoupon._id)}
            >
              {deleteMutation.isLoading ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CouponsPage
