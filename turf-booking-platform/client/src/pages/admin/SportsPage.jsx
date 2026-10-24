import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '../../hooks/useApi'
import {
  Plus,
  Search,
  Edit2,
  Power,
  Activity,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from 'lucide-react'
import adminInventoryService from '../../services/admin/inventory.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { FormField } from '../../components/common/FormField'
import { Input } from '../../components/common/Input'

export const SportsPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingSport, setEditingSport] = useState(null)
  const [deletingSport, setDeletingSport] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    icon: '',
  })
  const [serverError, setServerError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)

  // 1. Fetch Sports Query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-sports', { search, page }],
    queryFn: () => adminInventoryService.getSports({ search, page, limit: 10 }),
  })

  const sports = data?.sports || []
  const pagination = data?.pagination || { page: 1, totalPages: 1 }

  const invalidateAllSportsQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-sports'] })
    queryClient.invalidateQueries({ queryKey: ['publicSports'] })
    queryClient.invalidateQueries({ queryKey: ['publicTurfs'] })
    queryClient.invalidateQueries({ queryKey: ['publicTurfsList'] })
    queryClient.invalidateQueries({ queryKey: ['homeFeaturedTurfs'] })
  }

  // 2. Create Sport Mutation
  const createMutation = useMutation({
    mutationFn: (newSport) => adminInventoryService.createSport(newSport),
    onSuccess: (created) => {
      invalidateAllSportsQueries()
      setIsModalOpen(false)
      showToast(`Sport "${created.name}" created successfully.`)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || 'Failed to create sport.')
    },
  })

  // 3. Update Sport Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => adminInventoryService.updateSport(id, updates),
    onSuccess: (updated) => {
      invalidateAllSportsQueries()
      setIsModalOpen(false)
      showToast(`Sport "${updated.name}" updated successfully.`)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || 'Failed to update sport.')
    },
  })

  // 4. Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminInventoryService.toggleSportStatus(id, isActive),
    onSuccess: (sport) => {
      invalidateAllSportsQueries()
      showToast(`Sport "${sport.name}" is now ${sport.isActive ? 'active' : 'inactive'}.`)
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to change status.', 'error')
    },
  })

  // 5. Delete Sport Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminInventoryService.deleteSport(id),
    onSuccess: () => {
      invalidateAllSportsQueries()
      setIsDeleteModalOpen(false)
      showToast('Sport deleted successfully.')
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to delete sport.', 'error')
    },
  })

  const showToast = (message, type = 'success') => {
    setSuccessToast({ message, type })
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const handleOpenCreate = () => {
    setEditingSport(null)
    setFormData({ name: '', slug: '', description: '', image: '', icon: '' })
    setServerError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (sport) => {
    setEditingSport(sport)
    setFormData({
      name: sport.name || '',
      slug: sport.slug || '',
      description: sport.description || '',
      image: sport.image || '',
      icon: sport.icon || '',
    })
    setServerError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setServerError(null)

    if (!formData.name.trim()) {
      setServerError('Sport name is required.')
      return
    }

    if (editingSport) {
      updateMutation.mutate({ id: editingSport._id, updates: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-400" />
            <span>Sports Inventory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage sports categories, supported disciplines, and display metadata for arena turfs.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenCreate}
          className="self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add New Sport</span>
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
          placeholder="Search sports by name or slug..."
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

      {/* Sports Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading sports inventory...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-rose-400 text-xs">
            Failed to load sports: {error?.message}
          </div>
        ) : sports.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No sports found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Sport</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Description</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sports.map((sport) => (
                  <tr key={sport._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {sport.image ? (
                          <img
                            src={sport.image}
                            alt={sport.name}
                            className="w-8 h-8 rounded-xl object-cover border border-slate-700 shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                            <Activity className="w-4 h-4" />
                          </div>
                        )}
                        <span className="font-semibold text-white text-xs sm:text-sm">
                          {sport.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{sport.slug}</td>
                    <td className="py-3 px-4 hidden sm:table-cell text-slate-400 max-w-xs truncate">
                      {sport.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sport.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {sport.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sport)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Sport"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleMutation.mutate({ id: sport._id, isActive: !sport.isActive })
                          }
                          disabled={toggleMutation.isPending}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            sport.isActive
                              ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                              : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                          }`}
                          title={sport.isActive ? 'Deactivate Sport' : 'Activate Sport'}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingSport(sport)
                            setIsDeleteModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Delete Sport"
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

      {/* Create / Edit Sport Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSport ? 'Edit Sport' : 'Create New Sport'}
        subtitle="Configure sport name, unique slug, and public catalog visual references."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <FormField label="Sport Name" htmlFor="sportName" required>
            <Input
              id="sportName"
              placeholder="e.g. Box Cricket, Football, Pickleball"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormField>

          <FormField
            label="Unique Slug"
            htmlFor="sportSlug"
            hint="Leave blank to auto-generate from sport name"
          >
            <Input
              id="sportSlug"
              placeholder="e.g. box-cricket"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
          </FormField>

          <FormField label="Description" htmlFor="sportDescription">
            <textarea
              id="sportDescription"
              rows={3}
              placeholder="Provide a brief summary of playing format and equipment..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
            />
          </FormField>

          <FormField
            label="Image URL Reference"
            htmlFor="sportImage"
            hint="Cloud-hosted public image URL for card banners"
          >
            <Input
              id="sportImage"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              icon={ImageIcon}
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingSport ? 'Save Changes' : 'Create Sport'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingSport && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Sport?"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
              Are you sure you want to delete <span className="font-bold text-white">"{deletingSport.name}"</span>? This will remove the sport from all filters and listings.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingSport._id)}
              >
                Delete Sport
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default SportsPage
