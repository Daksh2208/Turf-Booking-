import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '../../hooks/useApi'
import {
  Plus,
  Search,
  Edit2,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  FileEdit,
} from 'lucide-react'
import adminInventoryService from '../../services/admin/inventory.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { TurfStepperForm } from '../../components/admin/TurfStepperForm'

export const TurfsPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)

  // Modal State
  const [isModalOpen,       setIsModalOpen]       = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingTurf,       setEditingTurf]       = useState(null)
  const [deletingTurf,      setDeletingTurf]      = useState(null)
  const [successToast,      setSuccessToast]      = useState(null)

  // ── Data Fetching ────────────────────────────────────────────────────────────
  const { data: turfsData, isLoading, isError, error } = useQuery({
    queryKey: ['admin-turfs', { search, page }],
    queryFn: () => adminInventoryService.getTurfs({ search, page, limit: 10 }),
  })

  const { data: sportsData } = useQuery({
    queryKey: ['admin-sports-options'],
    queryFn: () => adminInventoryService.getSports({ limit: 50, isActive: true }),
  })

  const turfs      = turfsData?.turfs      || []
  const pagination = turfsData?.pagination || { page: 1, totalPages: 1 }
  const sportsList = sportsData?.sports    || []

  // ── Cache Invalidation ───────────────────────────────────────────────────────
  const invalidateAllTurfQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-turfs'] })
    queryClient.invalidateQueries({ queryKey: ['publicTurfs'] })
    queryClient.invalidateQueries({ queryKey: ['publicTurfsList'] })
    queryClient.invalidateQueries({ queryKey: ['homeFeaturedTurfs'] })
    queryClient.invalidateQueries({ queryKey: ['publicTurfDetail'] })
    queryClient.invalidateQueries({ queryKey: ['turfAvailability'] })
    queryClient.invalidateQueries({ queryKey: ['pricingQuote'] })
  }

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (newTurf) => adminInventoryService.createTurf(newTurf),
    onSuccess: () => invalidateAllTurfQueries(),
    onError: () => {},   // errors handled inside TurfStepperForm
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => adminInventoryService.updateTurf(id, updates),
    onSuccess: () => invalidateAllTurfQueries(),
    onError: () => {},
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminInventoryService.toggleTurfStatus(id, isActive),
    onSuccess: (turf) => {
      invalidateAllTurfQueries()
      showToast(`Turf "${turf.name}" is now ${turf.isActive ? 'active' : 'inactive'}.`)
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to change turf status.', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => adminInventoryService.deleteTurf(id),
    onSuccess: () => {
      invalidateAllTurfQueries()
      setIsDeleteModalOpen(false)
      showToast('Turf arena deleted successfully.')
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to delete turf arena.', 'error')
    },
  })

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = (message, type = 'success') => {
    setSuccessToast({ message, type })
    setTimeout(() => setSuccessToast(null), 4000)
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingTurf(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (turf) => {
    setEditingTurf(turf)
    setIsModalOpen(true)
  }

  const handleStepperSuccess = (message) => {
    setIsModalOpen(false)
    showToast(message)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTurf(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8E3]">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#17231B] flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-[#267A45]" />
            <span>Turf Arenas</span>
          </h1>
          <p className="text-xs text-[#526258] mt-1">
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

      {/* Toast */}
      {successToast && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs leading-relaxed animate-in fade-in ${
            successToast.type === 'error'
              ? 'bg-[#FDF0EF] border border-[#F5C2BF] text-[#922B27]'
              : 'bg-[#E7F3E9] border border-[#C9DFCE] text-[#1D6537]'
          }`}
        >
          {successToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0" />
          )}
          <span>{successToast.message}</span>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-[#D7E0D9] shadow-xs">
        <Search className="w-4 h-4 text-[#647168] ml-2" />
        <input
          type="text"
          placeholder="Search turfs by name, city, or landmark..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="bg-transparent border-none text-xs sm:text-sm text-[#17231B] placeholder-[#647168] focus:outline-none flex-1"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-[#526258] hover:text-[#17231B] px-2 cursor-pointer">
            Clear
          </button>
        )}
      </div>

      {/* Turfs Table */}
      <div className="rounded-2xl border border-[#D7E0D9] bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#267A45] animate-spin" />
            <p className="text-xs text-[#526258]">Loading turf arenas...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-[#922B27] text-xs">
            Failed to load turfs: {error?.message}
          </div>
        ) : turfs.length === 0 ? (
          <div className="py-16 text-center text-[#526258] text-xs">
            No turf arenas registered yet. Click &quot;Add New Turf Arena&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D7E0D9] bg-[#F0F4F1] text-[#526258] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Turf Name</th>
                  <th className="py-3.5 px-4">Supported Sports</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Hours</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E3] text-[#17231B]">
                {turfs.map((turf) => (
                  <tr key={turf._id} className="hover:bg-[#F0F6F1] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {turf.images && turf.images[0] ? (
                          <img
                            src={turf.images[0]}
                            alt={turf.name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#D7E0D9] shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#EEF3EF] border border-[#D7E0D9] flex items-center justify-center text-[#526258] shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#17231B] text-xs sm:text-sm">{turf.name}</p>
                          {turf.description && (
                            <p className="text-[11px] text-[#526258] line-clamp-1 max-w-[200px]" title={turf.description}>
                              {turf.description}
                            </p>
                          )}
                          <p className="font-mono text-[10px] text-[#647168]">{turf.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {turf.sports && turf.sports.length > 0 ? (
                          turf.sports.map((sp) => (
                            <span
                              key={sp._id || sp}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]"
                            >
                              {sp.name || 'Sport'}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#647168] text-[11px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#17231B]">
                      <p className="truncate max-w-[180px]">
                        {turf.address?.city || ''}, {turf.address?.state || ''}
                      </p>
                      <p className="text-[10px] text-[#526258] truncate max-w-[180px]">
                        {turf.address?.street}
                      </p>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-[#526258] text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#647168]" />
                        <span>{turf.openingHours?.open} - {turf.openingHours?.close}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {turf.isDraft ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          <FileEdit className="w-2.5 h-2.5" />
                          Draft
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            turf.isActive
                              ? 'bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]'
                              : 'bg-[#EDF1EE] text-[#69756D] border border-[#D7E0D9]'
                          }`}
                        >
                          {turf.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(turf)}
                          className="p-1.5 rounded-lg text-[#526258] hover:text-[#267A45] hover:bg-[#EEF3EF] transition-colors cursor-pointer"
                          title={turf.isDraft ? 'Resume Registration' : 'Edit Turf Arena'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => { setDeletingTurf(turf); setIsDeleteModalOpen(true) }}
                          className="p-1.5 rounded-lg text-[#922B27] hover:text-[#922B27] hover:bg-[#FDF0EF] transition-colors cursor-pointer"
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

      {/* Delete Modal */}
      {isDeleteModalOpen && deletingTurf && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Turf Arena?"
        >
          <div className="space-y-4 text-xs">
            <p className="text-[#46564A]">
              Are you sure you want to permanently delete arena{' '}
              <strong className="text-[#17231B]">{deletingTurf.name}</strong>?
            </p>
            <p className="text-[#922B27]">
              This will remove this arena from booking operations and inventory.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8E3]">
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#526258] px-2">
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Stepper Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTurf
          ? (editingTurf.isDraft ? 'Resume Turf Registration' : 'Edit Turf Arena')
          : 'Register New Turf Arena'
        }
        subtitle={
          editingTurf?.isDraft
            ? 'Pick up where you left off — complete all steps to publish this arena.'
            : 'Complete all 3 steps to register or update your arena.'
        }
        maxWidth="max-w-2xl"
      >
        <TurfStepperForm
          editingTurf={editingTurf}
          sportsList={sportsList}
          onSuccess={handleStepperSuccess}
          onClose={handleCloseModal}
          createMutation={createMutation}
          updateMutation={updateMutation}
        />
      </Modal>
    </div>
  )
}

export default TurfsPage
