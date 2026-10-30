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
  Upload,
  FileImage,
  X,
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

  const [selectedFileName, setSelectedFileName] = useState('')

  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setServerError('Selected file must be an image (PNG, JPG, WEBP, etc.).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setServerError('Image file size must be less than 5MB.')
      return
    }

    setServerError(null)
    setSelectedFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFormData((prev) => ({ ...prev, image: ev.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleOpenCreate = () => {
    setEditingSport(null)
    setSelectedFileName('')
    setFormData({ name: '', slug: '', description: '', image: '', icon: '' })
    setServerError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (sport) => {
    setEditingSport(sport)
    setSelectedFileName('')
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8E3]">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#17231B] flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-[#267A45]" />
            <span>Sports Inventory</span>
          </h1>
          <p className="text-xs text-[#526258] mt-1">
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

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-[#D7E0D9] shadow-xs">
        <Search className="w-4 h-4 text-[#647168] ml-2" />
        <input
          type="text"
          placeholder="Search sports by name or slug..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="bg-transparent border-none text-xs sm:text-sm text-[#17231B] placeholder-[#647168] focus:outline-none flex-1"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-[#526258] hover:text-[#17231B] px-2 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sports Table */}
      <div className="rounded-2xl border border-[#D7E0D9] bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#267A45] animate-spin" />
            <p className="text-xs text-[#526258]">Loading sports inventory...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-[#922B27] text-xs">
            Failed to load sports: {error?.message}
          </div>
        ) : sports.length === 0 ? (
          <div className="py-16 text-center text-[#526258] text-xs">
            No sports found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D7E0D9] bg-[#F0F4F1] text-[#526258] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Sport</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Description</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E3] text-[#17231B]">
                {sports.map((sport) => (
                  <tr key={sport._id} className="hover:bg-[#F0F6F1] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {sport.image ? (
                          <img
                            src={sport.image}
                            alt={sport.name}
                            className="w-8 h-8 rounded-xl object-cover border border-[#D7E0D9] shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-[#EEF3EF] border border-[#D7E0D9] flex items-center justify-center text-[#526258] shrink-0">
                            <Activity className="w-4 h-4" />
                          </div>
                        )}
                        <span className="font-semibold text-[#17231B] text-xs sm:text-sm">
                          {sport.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#526258]">{sport.slug}</td>
                    <td className="py-3 px-4 hidden sm:table-cell text-[#526258] max-w-xs truncate">
                      {sport.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sport.isActive
                            ? 'bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]'
                            : 'bg-[#EDF1EE] text-[#69756D] border border-[#D7E0D9]'
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
                          className="p-1.5 rounded-lg text-[#526258] hover:text-[#267A45] hover:bg-[#EEF3EF] transition-colors cursor-pointer"
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
                              ? 'text-[#922B27] hover:bg-[#FDF0EF]'
                              : 'text-[#267A45] hover:bg-[#E7F3E9]'
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
                          className="p-1.5 rounded-lg text-[#922B27] hover:text-[#922B27] hover:bg-[#FDF0EF] transition-colors cursor-pointer"
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
        <div className="flex items-center justify-between text-xs text-[#526258] px-2">
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
            <div className="p-3 rounded-xl bg-[#FDF0EF] border border-[#F5C2BF] text-[#922B27] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0" />
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
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#D7E0D9] text-[#17231B] text-xs focus:ring-1 focus:ring-[#267A45] focus:border-[#267A45] focus:outline-none placeholder-[#647168]"
            />
          </FormField>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#17231B] block">
              Sport Image
            </label>
            <p className="text-[11px] text-[#526258]">
              Choose an image file from your device or paste a public image URL.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <label className="sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F0F6F1] border border-[#D7E0D9] hover:border-[#267A45] text-[#17231B] text-xs font-semibold cursor-pointer transition-all shadow-2xs">
                <Upload className="w-4 h-4 text-[#267A45]" />
                <span>Choose File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
              </label>

              <span className="text-[#647168] text-xs text-center sm:text-left font-medium">or paste URL:</span>

              <div className="flex-1">
                <Input
                  id="sportImage"
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image.startsWith('data:') ? '' : formData.image}
                  onChange={(e) => {
                    setSelectedFileName('')
                    setFormData({ ...formData, image: e.target.value })
                  }}
                  icon={ImageIcon}
                />
              </div>
            </div>

            {selectedFileName && (
              <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
                <span className="truncate flex items-center gap-1.5">
                  <FileImage className="w-3.5 h-3.5 shrink-0 text-[#267A45]" />
                  <span>Selected file: <strong>{selectedFileName}</strong></span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFileName('')
                    setFormData({ ...formData, image: '' })
                  }}
                  className="text-[11px] text-[#922B27] hover:underline ml-2 cursor-pointer font-medium"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Real-time live image preview */}
            {formData.image && (
              <div className="rounded-xl overflow-hidden border border-[#D7E0D9] h-28 bg-[#17231B] relative mt-2 group">
                <img
                  src={formData.image}
                  alt="Live Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-[#17231B]/90 text-[#FFFFFF] px-2 py-0.5 rounded border border-[#267A45]/40 backdrop-blur-xs">
                  Live Image Preview {selectedFileName ? `(${selectedFileName})` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFileName('')
                    setFormData({ ...formData, image: '' })
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#17231B]/80 hover:bg-[#922B27] text-white transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8E3]">
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
            <div className="p-3 bg-[#FDF0EF] border border-[#F5C2BF] rounded-xl text-[#922B27] text-xs">
              Are you sure you want to delete <span className="font-bold text-[#17231B]">"{deletingSport.name}"</span>? This will remove the sport from all filters and listings.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E2E8E3]">
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
