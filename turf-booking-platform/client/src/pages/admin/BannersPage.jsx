import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '../../hooks/useApi'
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import adminInventoryService from '../../services/admin/inventory.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { FormField } from '../../components/common/FormField'
import { Input } from '../../components/common/Input'

export const BannersPage = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image: '',
    link: '',
    ctaText: '',
    order: 0,
  })

  // 1. Fetch Banners
  const { data: banners = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => adminInventoryService.getBanners(),
  })

  const invalidateAllBannerQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
    queryClient.invalidateQueries({ queryKey: ['publicBanners'] })
  }

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newBanner) => adminInventoryService.createBanner(newBanner),
    onSuccess: (created) => {
      invalidateAllBannerQueries()
      setIsModalOpen(false)
      showToast(`Banner "${created.title}" created successfully.`)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || 'Failed to create banner.')
    },
  })

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => adminInventoryService.updateBanner(id, updates),
    onSuccess: (updated) => {
      invalidateAllBannerQueries()
      setIsModalOpen(false)
      showToast(`Banner "${updated.title}" updated successfully.`)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || 'Failed to update banner.')
    },
  })

  // Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminInventoryService.toggleBannerStatus(id, isActive),
    onSuccess: (banner) => {
      invalidateAllBannerQueries()
      showToast(`Banner is now ${banner.isActive ? 'active' : 'inactive'}.`)
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to update banner status.', 'error')
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminInventoryService.deleteBanner(id),
    onSuccess: () => {
      invalidateAllBannerQueries()
      showToast('Banner removed successfully.')
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to delete banner.', 'error')
    },
  })

  const showToast = (message, type = 'success') => {
    setSuccessToast({ message, type })
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const handleOpenCreate = () => {
    setEditingBanner(null)
    setFormData({
      title: '',
      subtitle: '',
      image: '',
      link: '/turfs',
      ctaText: 'Explore Turfs',
      order: banners.length + 1,
    })
    setServerError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (banner) => {
    setEditingBanner(banner)
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image: banner.image || '',
      link: banner.link || '',
      ctaText: banner.ctaText || '',
      order: banner.order ?? 0,
    })
    setServerError(null)
    setIsModalOpen(true)
  }

  const handleDelete = (banner) => {
    if (window.confirm(`Are you sure you want to remove banner "${banner.title}"?`)) {
      deleteMutation.mutate(banner._id)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setServerError(null)

    if (!formData.title.trim() || !formData.image.trim()) {
      setServerError('Banner title and image URL reference are required.')
      return
    }

    const payload = {
      title: formData.title.trim(),
      subtitle: formData.subtitle.trim(),
      image: formData.image.trim(),
      link: formData.link.trim(),
      ctaText: formData.ctaText.trim(),
      order: Number(formData.order) || 0,
    }

    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner._id, updates: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8E3]">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#17231B] flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-[#267A45]" />
            <span>Homepage Banners</span>
          </h1>
          <p className="text-xs text-[#526258] mt-1">
            Manage hero banners, tournaments announcements, call-to-actions, and carousel sequences.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenCreate}
          className="self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add New Banner</span>
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

      {/* Banner Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 text-[#267A45] animate-spin" />
          <p className="text-xs text-[#526258]">Loading banners...</p>
        </div>
      ) : isError ? (
        <div className="py-12 text-center text-[#922B27] text-xs">
          Failed to load banners: {error?.message}
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-[#D7E0D9] bg-white p-12 text-center text-[#526258] text-xs">
          No banners configured. Click &quot;Add New Banner&quot; to highlight tournaments or promotions.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div
              key={banner._id}
              className="rounded-2xl border border-[#D7E0D9] bg-white overflow-hidden flex flex-col justify-between group shadow-xs"
            >
              {/* Image Preview Container with high-contrast gradient overlay */}
              <div className="relative h-44 bg-[#17231B] overflow-hidden">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#17231B] via-[#17231B]/40 to-transparent" />

                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#17231B]/80 text-[#FFFFFF] border border-[#267A45]/40 backdrop-blur-md">
                    Order #{banner.order}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                      banner.isActive
                        ? 'bg-[#1D6537]/80 text-[#FFFFFF] border border-[#C9DFCE]'
                        : 'bg-[#17231B]/80 text-[#D7E0D9] border border-[#69756D]'
                    }`}
                  >
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="font-bold text-[#FFFFFF] text-base truncate">{banner.title}</h3>
                  {banner.subtitle && (
                    <p className="text-xs text-[#E2E8E3] truncate mt-0.5">{banner.subtitle}</p>
                  )}
                </div>
              </div>

              {/* Card Footer / Details */}
              <div className="p-4 flex items-center justify-between border-t border-[#E2E8E3] bg-[#F6F8F6] text-xs">
                <div className="flex items-center gap-1.5 text-[#526258] truncate max-w-[200px]">
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#647168]" />
                  <span className="truncate">{banner.link || 'No link assigned'}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(banner)}
                    className="p-1.5 rounded-lg text-[#526258] hover:text-[#267A45] hover:bg-[#EEF3EF] transition-colors cursor-pointer"
                    title="Edit Banner"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleMutation.mutate({ id: banner._id, isActive: !banner.isActive })
                    }
                    disabled={toggleMutation.isPending}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      banner.isActive
                        ? 'text-[#922B27] hover:bg-[#FDF0EF]'
                        : 'text-[#267A45] hover:bg-[#E7F3E9]'
                    }`}
                    title={banner.isActive ? 'Deactivate Banner' : 'Activate Banner'}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(banner)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-lg text-[#526258] hover:text-[#922B27] hover:bg-[#FDF0EF] transition-colors cursor-pointer"
                    title="Delete Banner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Banner Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBanner ? 'Edit Banner' : 'Create Homepage Banner'}
        subtitle="Configure hero carousel titles, call to actions, and image links."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded-xl bg-[#FDF0EF] border border-[#F5C2BF] text-[#922B27] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <FormField label="Banner Title" htmlFor="bannerTitle" required>
            <Input
              id="bannerTitle"
              placeholder="e.g. Monsoon Box Cricket Championship"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Subtitle" htmlFor="bannerSubtitle">
            <Input
              id="bannerSubtitle"
              placeholder="e.g. Register before Friday and get 15% off peak slots"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            />
          </FormField>

          <FormField
            label="Image URL Reference"
            htmlFor="bannerImage"
            hint="Public high-resolution image URL (16:9 ratio recommended)"
            required
          >
            <Input
              id="bannerImage"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              icon={ImageIcon}
              required
            />
          </FormField>

          {/* Real-time live image preview */}
          {formData.image && (
            <div className="rounded-xl overflow-hidden border border-[#D7E0D9] h-28 bg-[#17231B] relative">
              <img
                src={formData.image}
                alt="Live Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-[#17231B]/90 text-[#FFFFFF] px-2 py-0.5 rounded border border-[#267A45]/40">
                Live Image Preview
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="CTA Button Text" htmlFor="bannerCta">
              <Input
                id="bannerCta"
                placeholder="e.g. Book Slot Now"
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
              />
            </FormField>

            <FormField label="Target Link" htmlFor="bannerLink">
              <Input
                id="bannerLink"
                placeholder="/turfs"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              />
            </FormField>

            <FormField label="Display Order" htmlFor="bannerOrder">
              <Input
                id="bannerOrder"
                type="number"
                min="0"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })
                }
              />
            </FormField>
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
              {editingBanner ? 'Save Changes' : 'Create Banner'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default BannersPage
