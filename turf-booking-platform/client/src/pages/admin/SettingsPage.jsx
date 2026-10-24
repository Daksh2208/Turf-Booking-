import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '../../hooks/useApi'
import {
  Sliders,
  Save,
  AlertCircle,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  Clock,
  Percent,
  FileText,
  Loader2,
} from 'lucide-react'
import adminInventoryService from '../../services/admin/inventory.service'
import { Button } from '../../components/common/Button'
import { FormField } from '../../components/common/FormField'
import { Input } from '../../components/common/Input'

export const SettingsPage = () => {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)

  const [formData, setFormData] = useState({
    businessName: '',
    supportEmail: '',
    supportPhone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    bookingRules: {
      slotDurationMinutes: 60,
      minAdvanceBookingHours: 1,
      maxAdvanceBookingDays: 14,
      cancellationCutoffHours: 4,
    },
    taxSettings: {
      taxEnabled: true,
      taxName: 'GST',
      taxRatePercentage: 18,
    },
    aboutText: '',
    termsUrl: '/terms',
    privacyUrl: '/privacy',
  })

  // 1. Fetch current settings
  const { data: settings, isLoading, isError, error } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminInventoryService.getSettings(),
  })

  // Prefill form when data arrives
  useEffect(() => {
    if (settings) {
      setFormData({
        businessName: settings.businessName || '',
        supportEmail: settings.supportEmail || '',
        supportPhone: settings.supportPhone || '',
        address: {
          street: settings.address?.street || '',
          city: settings.address?.city || '',
          state: settings.address?.state || '',
          zipCode: settings.address?.zipCode || '',
        },
        currency: settings.currency || 'INR',
        currencySymbol: settings.currencySymbol || '₹',
        timezone: settings.timezone || 'Asia/Kolkata',
        bookingRules: {
          slotDurationMinutes: settings.bookingRules?.slotDurationMinutes ?? 60,
          minAdvanceBookingHours: settings.bookingRules?.minAdvanceBookingHours ?? 1,
          maxAdvanceBookingDays: settings.bookingRules?.maxAdvanceBookingDays ?? 14,
          cancellationCutoffHours: settings.bookingRules?.cancellationCutoffHours ?? 4,
        },
        taxSettings: {
          taxEnabled: settings.taxSettings?.taxEnabled ?? true,
          taxName: settings.taxSettings?.taxName || 'GST',
          taxRatePercentage: settings.taxSettings?.taxRatePercentage ?? 18,
        },
        aboutText: settings.aboutText || '',
        termsUrl: settings.termsUrl || '/terms',
        privacyUrl: settings.privacyUrl || '/privacy',
      })
    }
  }, [settings])

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (updates) => adminInventoryService.updateSettings(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      queryClient.invalidateQueries({ queryKey: ['publicBusinessSettings'] })
      queryClient.invalidateQueries({ queryKey: ['pricingQuote'] })
      setSuccessToast('Business configuration saved successfully.')
      setTimeout(() => setSuccessToast(null), 4000)
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || 'Failed to update settings.')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setServerError(null)

    if (!formData.businessName.trim()) {
      setServerError('Business name cannot be empty.')
      return
    }

    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading business configuration...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
        Failed to load settings: {error?.message}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-emerald-400" />
          <span>Business Settings & Rules</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure organization contact info, slot booking intervals, GST taxation, and customer policies.
        </p>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 text-xs leading-relaxed animate-in fade-in"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error Alert */}
      {serverError && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3 text-xs leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Business Identity & Contact */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Organization Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Business Name" htmlFor="businessName" required>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Support Email" htmlFor="supportEmail" required>
              <Input
                id="supportEmail"
                type="email"
                value={formData.supportEmail}
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                icon={Mail}
                required
              />
            </FormField>

            <FormField label="Support Phone" htmlFor="supportPhone">
              <Input
                id="supportPhone"
                type="tel"
                value={formData.supportPhone}
                onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                icon={Phone}
              />
            </FormField>

            <FormField label="City" htmlFor="bizCity">
              <Input
                id="bizCity"
                value={formData.address.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value },
                  })
                }
              />
            </FormField>
          </div>
        </div>

        {/* Section 2: Booking Rules */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Slot Booking & Cancellation Rules</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Standard Slot Duration (Minutes)"
              htmlFor="slotDuration"
              hint="Fixed interval for hourly bookings (e.g. 60 mins)"
            >
              <Input
                id="slotDuration"
                type="number"
                min="15"
                step="15"
                value={formData.bookingRules.slotDurationMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bookingRules: {
                      ...formData.bookingRules,
                      slotDurationMinutes: parseInt(e.target.value, 10) || 60,
                    },
                  })
                }
              />
            </FormField>

            <FormField
              label="Min Advance Notice (Hours)"
              htmlFor="minAdvance"
              hint="Player cannot reserve a slot starting earlier than this"
            >
              <Input
                id="minAdvance"
                type="number"
                min="0"
                value={formData.bookingRules.minAdvanceBookingHours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bookingRules: {
                      ...formData.bookingRules,
                      minAdvanceBookingHours: parseInt(e.target.value, 10) || 1,
                    },
                  })
                }
              />
            </FormField>

            <FormField
              label="Max Advance Booking (Days)"
              htmlFor="maxAdvance"
              hint="How far in advance slots can be booked"
            >
              <Input
                id="maxAdvance"
                type="number"
                min="1"
                value={formData.bookingRules.maxAdvanceBookingDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bookingRules: {
                      ...formData.bookingRules,
                      maxAdvanceBookingDays: parseInt(e.target.value, 10) || 14,
                    },
                  })
                }
              />
            </FormField>

            <FormField
              label="Cancellation Cutoff Window (Hours)"
              htmlFor="cancelCutoff"
              hint="Refund window before slot start time"
            >
              <Input
                id="cancelCutoff"
                type="number"
                min="0"
                value={formData.bookingRules.cancellationCutoffHours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bookingRules: {
                      ...formData.bookingRules,
                      cancellationCutoffHours: parseInt(e.target.value, 10) || 4,
                    },
                  })
                }
              />
            </FormField>
          </div>
        </div>

        {/* Section 3: Tax Settings */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Percent className="w-4 h-4 text-emerald-400" />
            <span>Taxation Settings</span>
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                id="taxEnabled"
                checked={formData.taxSettings.taxEnabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    taxSettings: {
                      ...formData.taxSettings,
                      taxEnabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
              />
              <span className="font-semibold text-white">Enable GST / Sales Tax at Checkout</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Tax Identifier / Name" htmlFor="taxName">
                <Input
                  id="taxName"
                  placeholder="GST"
                  value={formData.taxSettings.taxName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      taxSettings: {
                        ...formData.taxSettings,
                        taxName: e.target.value,
                      },
                    })
                  }
                />
              </FormField>

              <FormField label="Tax Rate Percentage (%)" htmlFor="taxRate">
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.taxSettings.taxRatePercentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      taxSettings: {
                        ...formData.taxSettings,
                        taxRatePercentage: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 4: Public Business Info */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Customer-Facing Policies</span>
          </h2>

          <FormField label="About the Arena / Bio" htmlFor="aboutText">
            <textarea
              id="aboutText"
              rows={3}
              value={formData.aboutText}
              onChange={(e) => setFormData({ ...formData, aboutText: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Terms of Service URL" htmlFor="termsUrl">
              <Input
                id="termsUrl"
                value={formData.termsUrl}
                onChange={(e) => setFormData({ ...formData, termsUrl: e.target.value })}
              />
            </FormField>

            <FormField label="Privacy Policy URL" htmlFor="privacyUrl">
              <Input
                id="privacyUrl"
                value={formData.privacyUrl}
                onChange={(e) => setFormData({ ...formData, privacyUrl: e.target.value })}
              />
            </FormField>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={updateMutation.isPending}
            className="cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>Save Configuration</span>
          </Button>
        </div>
      </form>
    </div>
  )
}

export default SettingsPage
