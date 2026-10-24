import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Edit2,
  Power,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Image as ImageIcon,
  Loader2,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react'
import adminInventoryService from '../../services/admin/inventory.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { FormField } from '../../components/common/FormField'
import { Input } from '../../components/common/Input'

const COMMON_FACILITIES = [
  'LED Floodlights',
  'Changing Rooms',
  'Drinking Water',
  'Free Parking',
  'Equipment Rental',
  'Showers',
  'Spectator Seating',
  'First Aid Kit',
  'Cafeteria',
]

const SURFACES = [
  'Artificial Turf',
  'Natural Grass',
  'Hard Court',
  'Wooden',
  'Clay',
  'Synthetic Mat',
  'Other',
]

export const TurfsPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingTurf, setEditingTurf] = useState(null)
  const [deletingTurf, setDeletingTurf] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    sports: [],
    size: '100x60 ft (Box Cricket)',
    surface: 'Artificial Turf',
    pricing: {
      baseRate: 800,
      peakRate: 1200,
      weekendRate: 1400,
      peakHours: {
        start: '18:00',
        end: '23:00',
      },
    },
    address: {
      street: '',
      city: '',
      state: 'Gujarat',
      zipCode: '',
      landmark: '',
    },
    capacity: {
      minPlayers: 2,
      maxPlayers: 22,
    },
    facilities: ['LED Floodlights', 'Drinking Water'],
    openingHours: {
      open: '06:00',
      close: '23:00',
    },
    imageUrl: '',
  })

  // 1. Fetch Turfs
  const { data: turfsData, isLoading, isError, error } = useQuery({
    queryKey: ['admin-turfs', { search, page }],
    queryFn: () => adminInventoryService.getTurfs({ search, page, limit: 10 }),
  })

  // 2. Fetch Sports for selection
  const { data: sportsData } = useQuery({
    queryKey: ['admin-sports-options'],
    queryFn: () => adminInventoryService.getSports({ limit: 50, isActive: true }),
  })

  const turfs = turfsData?.turfs || []
  const pagination = turfsData?.pagination || { page: 1, totalPages: 1 }
  const sportsList = sportsData?.sports || []

  // Create Turf Mutation
  const createMutation = useMutation({
    mutationFn: (newTurf) => adminInventoryService.createTurf(newTurf),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['admin-turfs'] })
      setIsModalOpen(false)
      showToast(`Turf "${created.name}" created successfully.`)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create turf arena.')
    },
  })

  // Update Turf Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => adminInventoryService.updateTurf(id, updates),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-turfs'] })
      setIsModalOpen(false)
      showToast(`Turf "${updated.name}" updated successfully.`)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update turf arena.')
    },
  })

  // Toggle Turf Status
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminInventoryService.toggleTurfStatus(id, isActive),
    onSuccess: (turf) => {
      queryClient.invalidateQueries({ queryKey: ['admin-turfs'] })
      showToast(`Turf "${turf.name}" is now ${turf.isActive ? 'active' : 'inactive'}.`)
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to change turf status.', 'error')
    },
  })

  // Delete Turf Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminInventoryService.deleteTurf(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-turfs'] })
      setIsDeleteModalOpen(false)
      showToast('Turf arena deleted successfully.')
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to delete turf arena.', 'error')
    },
  })

  const showToast = (message, type = 'success') => {
    setSuccessToast({ message, type })
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setFormData((prev) => ({ ...prev, imageUrl: event.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleOpenCreate = () => {
    setEditingTurf(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      sports: sportsList.length > 0 ? [sportsList[0]._id] : [],
      size: '100x60 ft (Box Cricket)',
      surface: 'Artificial Turf',
      pricing: {
        baseRate: 800,
        peakRate: 1200,
        weekendRate: 1400,
        peakHours: {
          start: '18:00',
          end: '23:00',
        },
      },
      address: { street: '', city: 'Ahmedabad', state: 'Gujarat', zipCode: '380015', landmark: '' },
      capacity: { minPlayers: 2, maxPlayers: 22 },
      facilities: ['LED Floodlights', 'Drinking Water'],
      openingHours: { open: '06:00', close: '23:00' },
      imageUrl: '',
    })
    setServerError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (turf) => {
    setEditingTurf(turf)
    setFormData({
      name: turf.name || '',
      slug: turf.slug || '',
      description: turf.description || '',
      sports: turf.sports ? turf.sports.map((s) => (s._id ? s._id : s)) : [],
      size: turf.size || '100x60 ft (Box Cricket)',
      surface: turf.surface || 'Artificial Turf',
      pricing: {
        baseRate: turf.pricing?.baseRate ? turf.pricing.baseRate / 100 : 800,
        peakRate: turf.pricing?.peakRate ? turf.pricing.peakRate / 100 : 1200,
        weekendRate: turf.pricing?.weekendRate ? turf.pricing.weekendRate / 100 : 1400,
        peakHours: {
          start: turf.pricing?.peakHours?.start || '18:00',
          end: turf.pricing?.peakHours?.end || '23:00',
        },
      },
      address: {
        street: turf.address?.street || '',
        city: turf.address?.city || '',
        state: turf.address?.state || 'Gujarat',
        zipCode: turf.address?.zipCode || '',
        landmark: turf.address?.landmark || '',
      },
      capacity: {
        minPlayers: turf.capacity?.minPlayers || 2,
        maxPlayers: turf.capacity?.maxPlayers || 22,
      },
      facilities: turf.facilities || [],
      openingHours: {
        open: turf.openingHours?.open || '06:00',
        close: turf.openingHours?.close || '23:00',
      },
      imageUrl: turf.images && turf.images.length > 0 ? turf.images[0] : '',
    })
    setServerError(null)
    setIsModalOpen(true)
  }

  const toggleFacility = (facility) => {
    setFormData((prev) => {
      const exists = prev.facilities.includes(facility)
      return {
        ...prev,
        facilities: exists
          ? prev.facilities.filter((f) => f !== facility)
          : [...prev.facilities, facility],
      }
    })
  }

  const toggleSportSelection = (sportId) => {
    setFormData((prev) => {
      const exists = prev.sports.includes(sportId)
      return {
        ...prev,
        sports: exists ? prev.sports.filter((s) => s !== sportId) : [...prev.sports, sportId],
      }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setServerError(null)

    if (!formData.name.trim()) {
      setServerError('Turf name is required.')
      return
    }

    if (formData.sports.length === 0) {
      setServerError('Please select at least one supported sport.')
      return
    }

    if (!formData.address.street.trim() || !formData.address.city.trim()) {
      setServerError('Street address and city are required.')
      return
    }

    if (isNaN(formData.pricing.baseRate) || Number(formData.pricing.baseRate) < 0) {
      setServerError('Base rate must be a non-negative number.')
      return
    }

    if (isNaN(formData.pricing.peakRate) || Number(formData.pricing.peakRate) < 0) {
      setServerError('Peak-hour rate must be a non-negative number.')
      return
    }

    if (isNaN(formData.pricing.weekendRate) || Number(formData.pricing.weekendRate) < 0) {
      setServerError('Weekend rate must be a non-negative number.')
      return
    }

    if (formData.pricing.peakHours.start >= formData.pricing.peakHours.end) {
      setServerError('Peak hours start time must be before peak hours end time.')
      return
    }

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      description: formData.description.trim(),
      sports: formData.sports,
      size: formData.size.trim(),
      surface: formData.surface,
      pricing: {
        baseRate: Math.round(Number(formData.pricing.baseRate) * 100),
        peakRate: Math.round(Number(formData.pricing.peakRate) * 100),
        weekendRate: Math.round(Number(formData.pricing.weekendRate) * 100),
        peakHours: formData.pricing.peakHours,
      },
      address: {
        street: formData.address.street.trim(),
        city: formData.address.city.trim(),
        state: formData.address.state.trim(),
        zipCode: formData.address.zipCode.trim(),
        landmark: formData.address.landmark.trim(),
      },
      capacity: formData.capacity,
      facilities: formData.facilities,
      openingHours: formData.openingHours,
      images: formData.imageUrl ? [formData.imageUrl.trim()] : [],
    }

    if (editingTurf) {
      updateMutation.mutate({ id: editingTurf._id, updates: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-emerald-400" />
            <span>Turf Arenas</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure turf arenas, multi-sport mappings, locations, amenities, and operational hours.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenCreate}
          className="self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add New Turf Arena</span>
        </Button>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs leading-relaxed animate-in fade-in ${
            successToast.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
          }`}
        >
          {successToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{successToast.message}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search turfs by name, city, or landmark..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="bg-transparent border-none text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none flex-1"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-slate-400 hover:text-white px-2 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Turfs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading turf arenas...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-rose-400 text-xs">
            Failed to load turfs: {error?.message}
          </div>
        ) : turfs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No turf arenas registered yet. Click &quot;Add New Turf Arena&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Turf Name</th>
                  <th className="py-3.5 px-4">Supported Sports</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Hours</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {turfs.map((turf) => (
                  <tr key={turf._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {turf.images && turf.images[0] ? (
                          <img
                            src={turf.images[0]}
                            alt={turf.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white text-xs sm:text-sm">{turf.name}</p>
                          <p className="font-mono text-[10px] text-slate-400">{turf.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {turf.sports && turf.sports.length > 0 ? (
                          turf.sports.map((sp) => (
                            <span
                              key={sp._id || sp}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-emerald-300 border border-slate-700"
                            >
                              {sp.name || 'Sport'}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <p className="truncate max-w-[180px]">
                        {turf.address?.city || ''}, {turf.address?.state || ''}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                        {turf.address?.street}
                      </p>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-400 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>
                          {turf.openingHours?.open} - {turf.openingHours?.close}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          turf.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {turf.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(turf)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Turf Arena"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingTurf(turf)
                            setIsDeleteModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Delete Turf Arena"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingTurf && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Turf Arena?"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Are you sure you want to permanently delete arena{' '}
              <strong className="text-white">{deletingTurf.name}</strong>?
            </p>
            <p className="text-rose-400">
              This will remove this arena from booking operations and inventory.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingTurf._id)}
              >
                Delete Arena
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-2">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Turf Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTurf ? 'Edit Turf Arena' : 'Register New Turf Arena'}
        subtitle="Manage arena facilities, operating hours, and multi-sport game assignments."
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Arena Name" htmlFor="turfName" required>
              <Input
                id="turfName"
                placeholder="e.g. Alpha Box Cricket Arena"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Unique Slug" htmlFor="turfSlug" hint="Leave blank to auto-generate">
              <Input
                id="turfSlug"
                placeholder="e.g. alpha-box-cricket"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </FormField>
          </div>

          {/* Supported Sports Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 block">
              Supported Sports <span className="text-rose-400">*</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Select one or more active sport disciplines for this arena:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {sportsList.map((sport) => {
                const isSelected = formData.sports.includes(sport._id)
                return (
                  <button
                    key={sport._id}
                    type="button"
                    onClick={() => toggleSportSelection(sport._id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {isSelected && '✓ '}
                    {sport.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Location Fields */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Location Details</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Street Address" htmlFor="turfStreet" required>
                <Input
                  id="turfStreet"
                  placeholder="e.g. Plot 42, SG Highway"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                  required
                />
              </FormField>

              <FormField label="City" htmlFor="turfCity" required>
                <Input
                  id="turfCity"
                  placeholder="e.g. Ahmedabad"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  required
                />
              </FormField>

              <FormField label="State" htmlFor="turfState" required>
                <Input
                  id="turfState"
                  placeholder="Gujarat"
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                  required
                />
              </FormField>

              <FormField label="Postal / ZIP Code" htmlFor="turfZip" required>
                <Input
                  id="turfZip"
                  placeholder="380054"
                  value={formData.address.zipCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, zipCode: e.target.value },
                    })
                  }
                  required
                />
              </FormField>
            </div>
          </div>

          {/* Arena Specifications: Size & Surface */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <FormField label="Field / Court Size" htmlFor="turfSize">
              <Input
                id="turfSize"
                placeholder="e.g. 100x60 ft (Box Cricket) or 7-a-side"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              />
            </FormField>

            <FormField label="Surface Material" htmlFor="turfSurface">
              <select
                id="turfSurface"
                value={formData.surface}
                onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {SURFACES.map((surf) => (
                  <option key={surf} value={surf}>
                    {surf}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Slot Rates & Peak Hours */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <p className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Slot Rates & Dynamic Pricing (₹ per hour)</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                Auto-adjusts for peak & weekend bookings
              </span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Base Rate (₹/hr)" htmlFor="baseRate" required>
                <Input
                  id="baseRate"
                  type="number"
                  min="0"
                  step="50"
                  value={formData.pricing.baseRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing: {
                        ...formData.pricing,
                        baseRate: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  required
                />
              </FormField>

              <FormField label="Peak-Hour Rate (₹/hr)" htmlFor="peakRate" required>
                <Input
                  id="peakRate"
                  type="number"
                  min="0"
                  step="50"
                  value={formData.pricing.peakRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing: {
                        ...formData.pricing,
                        peakRate: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  required
                />
              </FormField>

              <FormField label="Weekend Rate (₹/hr)" htmlFor="weekendRate" required>
                <Input
                  id="weekendRate"
                  type="number"
                  min="0"
                  step="50"
                  value={formData.pricing.weekendRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing: {
                        ...formData.pricing,
                        weekendRate: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <FormField label="Peak Hours Start" htmlFor="peakStart">
                <Input
                  id="peakStart"
                  type="text"
                  placeholder="18:00"
                  value={formData.pricing.peakHours.start}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing: {
                        ...formData.pricing,
                        peakHours: { ...formData.pricing.peakHours, start: e.target.value },
                      },
                    })
                  }
                />
              </FormField>

              <FormField label="Peak Hours End" htmlFor="peakEnd">
                <Input
                  id="peakEnd"
                  type="text"
                  placeholder="23:00"
                  value={formData.pricing.peakHours.end}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing: {
                        ...formData.pricing,
                        peakHours: { ...formData.pricing.peakHours, end: e.target.value },
                      },
                    })
                  }
                />
              </FormField>
            </div>
          </div>

          {/* Operational Hours & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
            <FormField label="Opening Time (24hr)" htmlFor="openTime">
              <Input
                id="openTime"
                type="text"
                placeholder="06:00"
                value={formData.openingHours.open}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    openingHours: { ...formData.openingHours, open: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="Closing Time (24hr)" htmlFor="closeTime">
              <Input
                id="closeTime"
                type="text"
                placeholder="23:00"
                value={formData.openingHours.close}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    openingHours: { ...formData.openingHours, close: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="Max Players" htmlFor="maxPlayers">
              <Input
                id="maxPlayers"
                type="number"
                min="1"
                value={formData.capacity.maxPlayers}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: {
                      ...formData.capacity,
                      maxPlayers: parseInt(e.target.value, 10) || 22,
                    },
                  })
                }
              />
            </FormField>
          </div>

          {/* Facilities Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-200 block">
              Amenities & Facilities
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_FACILITIES.map((facility) => {
                const isSelected = formData.facilities.includes(facility)
                return (
                  <button
                    key={facility}
                    type="button"
                    onClick={() => toggleFacility(facility)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {isSelected && '✓ '}
                    {facility}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Image Upload & Reference */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-200 block">
              Arena Photo / Image
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-200 text-xs font-semibold cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-slate-500 text-xs">or paste URL:</span>
              <div className="flex-1 w-full">
                <Input
                  id="turfImage"
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  icon={ImageIcon}
                />
              </div>
            </div>
            {formData.imageUrl && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 mt-2">
                <img
                  src={formData.imageUrl}
                  alt="Turf preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingTurf ? 'Save Arena' : 'Register Arena'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TurfsPage
