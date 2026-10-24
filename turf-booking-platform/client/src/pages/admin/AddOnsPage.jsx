import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Edit2,
  Power,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  Loader2,
  Trash2,
} from 'lucide-react'
import adminInventoryService from '../../services/admin/inventory.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { FormField } from '../../components/common/FormField'
import { Input } from '../../components/common/Input'

const PRICING_UNITS = [
  { value: 'per_booking', label: 'Per Booking (Flat)' },
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_player', label: 'Per Player' },
]

export const AddOnsPage = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingAddOn, setEditingAddOn] = useState(null)
  const [deletingAddOn, setDeletingAddOn] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priceRupees: '',
    pricingUnit: 'per_booking',
  })

  // 1. Fetch Add-Ons
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-addons'],
    queryFn: () => adminInventoryService.getAddOns({ limit: 50 }),
  })

  const addOns = data?.addOns || []

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newAddOn) => adminInventoryService.createAddOn(newAddOn),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] })
      setIsModalOpen(false)
      showToast(`Add-on "${created.name}" created successfully.`)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || 'Failed to create add-on.')
    },
  })

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => adminInventoryService.updateAddOn(id, updates),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] })
      setIsModalOpen(false)
      showToast(`Add-on "${updated.name}" updated successfully.`)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || 'Failed to update add-on.')
    },
  })

  // Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminInventoryService.toggleAddOnStatus(id, isActive),
    onSuccess: (addOn) => {
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] })
      showToast(`Add-on "${addOn.name}" is now ${addOn.isActive ? 'active' : 'inactive'}.`)
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to update status.', 'error')
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminInventoryService.deleteAddOn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] })
      setIsDeleteModalOpen(false)
      showToast('Add-on item deleted successfully.')
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to delete add-on.', 'error')
    },
  })

  const showToast = (message, type = 'success') => {
    setSuccessToast({ message, type })
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const handleOpenCreate = () => {
    setEditingAddOn(null)
    setFormData({
      name: '',
      description: '',
      priceRupees: '',
      pricingUnit: 'per_booking',
    })
    setServerError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (addOn) => {
    setEditingAddOn(addOn)
    setFormData({
      name: addOn.name || '',
      description: addOn.description || '',
      priceRupees: (addOn.price / 100).toString(),
      pricingUnit: addOn.pricingUnit || 'per_booking',
    })
    setServerError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setServerError(null)

    if (!formData.name.trim()) {
      setServerError('Add-on name is required.')
      return
    }

    const priceNum = parseFloat(formData.priceRupees)
    if (isNaN(priceNum) || priceNum < 0) {
      setServerError('Please enter a valid non-negative price in INR.')
      return
    }

    // Convert INR to integer paise for backend
    const pricePaise = Math.round(priceNum * 100)

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: pricePaise,
      pricingUnit: formData.pricingUnit,
    }

    if (editingAddOn) {
      updateMutation.mutate({ id: editingAddOn._id, updates: payload })
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
            <Sparkles className="w-6 h-6 text-emerald-400" />
            <span>Equipment & Service Add-Ons</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure rental gear, balls, protective pads, and optional player amenities.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenCreate}
          className="self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add New Add-On</span>
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

      {/* Add-Ons Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading add-ons...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-rose-400 text-xs">
            Failed to load add-ons: {error?.message}
          </div>
        ) : addOns.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No add-ons registered yet. Click &quot;Add New Add-On&quot; to configure equipment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Add-On Item</th>
                  <th className="py-3.5 px-4">Rate (INR)</th>
                  <th className="py-3.5 px-4">Billing Unit</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Description</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {addOns.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{item.name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      ₹{(item.price / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="capitalize">{item.pricingUnit.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-slate-400 max-w-xs truncate">
                      {item.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Add-On"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleMutation.mutate({ id: item._id, isActive: !item.isActive })
                          }
                          disabled={toggleMutation.isPending}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            item.isActive
                              ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                              : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                          }`}
                          title={item.isActive ? 'Deactivate Add-On' : 'Activate Add-On'}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingAddOn(item)
                            setIsDeleteModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Delete Add-On"
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

      {/* Create / Edit Add-On Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddOn ? 'Edit Add-On' : 'Register New Add-On'}
        subtitle="Manage equipment rental rates and pricing units for player checkout."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <FormField label="Add-On Name" htmlFor="addonName" required>
            <Input
              id="addonName"
              placeholder="e.g. Cricket Bats & Balls, Football Bibs"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Price in INR (₹)" htmlFor="addonPrice" required>
              <Input
                id="addonPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 250.00"
                value={formData.priceRupees}
                onChange={(e) => setFormData({ ...formData, priceRupees: e.target.value })}
                icon={IndianRupee}
                required
              />
            </FormField>

            <FormField label="Pricing Unit" htmlFor="pricingUnit" required>
              <select
                id="pricingUnit"
                value={formData.pricingUnit}
                onChange={(e) => setFormData({ ...formData, pricingUnit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
              >
                {PRICING_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Description" htmlFor="addonDesc">
            <textarea
              id="addonDesc"
              rows={3}
              placeholder="Provide details about condition, quantity, or deposit requirements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
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
              {editingAddOn ? 'Save Changes' : 'Create Add-On'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingAddOn && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Add-On?"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
              Are you sure you want to delete <span className="font-bold text-white">"{deletingAddOn.name}"</span>? This will remove the add-on item from equipment options.
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
                onClick={() => deleteMutation.mutate(deletingAddOn._id)}
              >
                Delete Add-On
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AddOnsPage
