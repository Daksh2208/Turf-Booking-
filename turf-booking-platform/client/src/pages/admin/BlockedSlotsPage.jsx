import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '../../hooks/useApi'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Trophy,
  Wrench,
  HelpCircle,
  MapPin,
} from 'lucide-react'
import adminInventoryService from '../../services/admin/inventory.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { FormField } from '../../components/common/FormField'
import { Input } from '../../components/common/Input'

const REASONS = [
  { id: 'maintenance', label: 'Arena Maintenance / Turf Repair', icon: Wrench },
  { id: 'tournament', label: 'Tournament / League Match', icon: Trophy },
  { id: 'private_event', label: 'Private Event / Corporate Booking', icon: ShieldAlert },
  { id: 'other', label: 'Other Operational Closure', icon: HelpCircle },
]

export const BlockedSlotsPage = () => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [selectedTurf, setSelectedTurf] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [deletingSlot, setDeletingSlot] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    turf: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    endTime: '12:00',
    reason: 'maintenance',
    note: '',
  })

  // Queries
  const { data: turfsData } = useQuery({
    queryKey: ['adminTurfsList'],
    queryFn: () => adminInventoryService.getTurfs({ limit: 100 }),
  })

  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['adminBlockedSlots', { turfId: selectedTurf, date: selectedDate, page }],
    queryFn: () =>
      adminInventoryService.getBlockedSlots({
        turfId: selectedTurf,
        date: selectedDate,
        page,
        limit: 20,
      }),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => adminInventoryService.createBlockedSlot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBlockedSlots'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['turfAvailability'] })
      setIsModalOpen(false)
      setSuccessToast('Slot blocked successfully. Synced to live website.')
      setTimeout(() => setSuccessToast(null), 4000)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to block slot.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminInventoryService.updateBlockedSlot(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBlockedSlots'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['turfAvailability'] })
      setIsModalOpen(false)
      setSuccessToast('Blocked slot updated successfully.')
      setTimeout(() => setSuccessToast(null), 4000)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update slot.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => adminInventoryService.deleteBlockedSlot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBlockedSlots'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['turfAvailability'] })
      setIsDeleteModalOpen(false)
      setSuccessToast('Blocked slot removed. Slot is immediately released on the website.')
      setTimeout(() => setSuccessToast(null), 4000)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to release slot.')
    },
  })

  const turfs = turfsData?.turfs || []
  const blockedSlots = slotsData?.slots || []
  const pagination = slotsData?.pagination || { page: 1, totalPages: 1, total: 0 }

  // Auto-select first turf if none is selected
  React.useEffect(() => {
    if (!formData.turf && turfs.length > 0) {
      setFormData((prev) => ({ ...prev, turf: turfs[0]._id }))
    }
  }, [turfs, formData.turf])

  const handleOpenCreate = () => {
    setEditingSlot(null)
    setFormData({
      turf: turfs[0]?._id || '',
      date: new Date().toISOString().slice(0, 10),
      startTime: '10:00',
      endTime: '12:00',
      reason: 'maintenance',
      note: '',
    })
    setServerError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (slot) => {
    setEditingSlot(slot)
    setFormData({
      turf: slot.turf?._id || slot.turf,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      reason: slot.reason,
      note: slot.note || '',
    })
    setServerError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.turf) {
      setServerError('Please select a turf arena.')
      return
    }
    if (!formData.startTime || !formData.endTime) {
      setServerError('Start time and end time are required.')
      return
    }
    if (formData.startTime >= formData.endTime) {
      setServerError('End time must be strictly after start time.')
      return
    }
    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const getReasonBadge = (reason) => {
    switch (reason) {
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wrench className="w-3 h-3" />
            Maintenance
          </span>
        )
      case 'tournament':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Trophy className="w-3 h-3" />
            Tournament
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            <ShieldAlert className="w-3 h-3" />
            {reason}
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
            Blocked Slots & Closures
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Block arena time for scheduled maintenance, turf refurbishment, or tournament play. Instantly reflected on the booking platform.
          </p>
        </div>

        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Block a Slot</span>
        </Button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <select
            value={selectedTurf}
            onChange={(e) => {
              setSelectedTurf(e.target.value)
              setPage(1)
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">All Arenas</option>
            {turfs.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setPage(1)
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Blocked Slots Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading blocked slots...</div>
        ) : blockedSlots.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No blocked slots found. All arena slots are currently open for customer reservations.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Arena</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Time Window</th>
                  <th className="px-4 py-3.5">Reason</th>
                  <th className="px-4 py-3.5">Operational Note</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {blockedSlots.map((slot) => (
                  <tr key={slot._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-white">
                      {slot.turf?.name || 'Turf'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 font-medium">
                      {slot.date}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-emerald-400">
                      {slot.startTime} - {slot.endTime}
                    </td>
                    <td className="px-4 py-3.5">
                      {getReasonBadge(slot.reason)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 max-w-xs truncate">
                      {slot.note || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(slot)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit slot"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeletingSlot(slot)
                          setIsDeleteModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Delete and release slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingSlot ? 'Edit Blocked Slot' : 'Block Arena Slot for Maintenance / Tournament'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {serverError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {serverError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Turf Arena
              </label>
              {turfs.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between">
                  <span>No turf arenas found in inventory.</span>
                  <a
                    href="/admin/turfs"
                    className="font-bold underline text-amber-300 hover:text-white transition-colors"
                  >
                    Create Turf Arena
                  </a>
                </div>
              ) : (
                <select
                  value={formData.turf}
                  onChange={(e) => setFormData({ ...formData, turf: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Select arena...</option>
                  {turfs.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Closure
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Internal Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Grass replacement, Corporate League Day 1..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                {editingSlot ? 'Update Blocked Slot' : 'Block Slot Now'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingSlot && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Release Blocked Slot?"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Are you sure you want to release the closure on{' '}
              <strong className="text-white">{deletingSlot.turf?.name}</strong> for{' '}
              <span className="text-emerald-400 font-semibold">{deletingSlot.date} ({deletingSlot.startTime} - {deletingSlot.endTime})</span>?
            </p>
            <p className="text-slate-400">
              This slot will immediately be made available for online customer booking.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingSlot._id)}
              >
                Release Slot
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default BlockedSlotsPage
