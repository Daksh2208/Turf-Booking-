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
  Minus,
  Plus,
  Info,
  PartyPopper,
  Sparkles,
  Check,
  X,
  CreditCard,
  Wallet,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import adminInventoryService from '../../services/admin/inventory.service'
import { Button } from '../../components/common/Button'
import { FormField } from '../../components/common/FormField'
import { Input } from '../../components/common/Input'

export const SettingsPage = () => {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)
  const [showCelebrationModal, setShowCelebrationModal] = useState(false)

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
    cancellationPolicy: {
      enabled: true,
      cutoffHours: 4,
      allowCancellationWithinCutoff: false,
      tiers: [
        { hoursBefore: 24, refundPercentage: 100 },
        { hoursBefore: 12, refundPercentage: 50 },
        { hoursBefore: 4, refundPercentage: 0 },
      ],
      defaultRefundPercentage: 0,
    },
    taxSettings: {
      taxEnabled: true,
      taxName: 'GST',
      taxRatePercentage: 18,
    },
    partialPaymentSettings: {
      enabled: true,
      advancePercentage: 20,
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
        cancellationPolicy: {
          enabled: settings.cancellationPolicy?.enabled ?? true,
          cutoffHours:
            settings.cancellationPolicy?.cutoffHours ?? settings.bookingRules?.cancellationCutoffHours ?? 4,
          allowCancellationWithinCutoff: settings.cancellationPolicy?.allowCancellationWithinCutoff ?? false,
          tiers: settings.cancellationPolicy?.tiers?.length
            ? settings.cancellationPolicy.tiers
            : [
                { hoursBefore: 24, refundPercentage: 100 },
                { hoursBefore: 12, refundPercentage: 50 },
                { hoursBefore: 4, refundPercentage: 0 },
              ],
          defaultRefundPercentage: settings.cancellationPolicy?.defaultRefundPercentage ?? 0,
        },
        taxSettings: {
          taxEnabled: settings.taxSettings?.taxEnabled ?? true,
          taxName: settings.taxSettings?.taxName || 'GST',
          taxRatePercentage: settings.taxSettings?.taxRatePercentage ?? 18,
        },
        partialPaymentSettings: {
          enabled: settings.partialPaymentSettings?.enabled ?? true,
          advancePercentage: settings.partialPaymentSettings?.advancePercentage ?? 20,
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
      setShowCelebrationModal(true)
      setTimeout(() => setSuccessToast(null), 4000)

      try {
        confetti({
          particleCount: 85,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#267A45', '#10B981', '#34D399', '#FBBF24', '#60A5FA', '#F472B6'],
          zIndex: 99999,
        })
        setTimeout(() => {
          confetti({
            particleCount: 45,
            angle: 60,
            spread: 60,
            origin: { x: 0.1, y: 0.65 },
            zIndex: 99999,
          })
          confetti({
            particleCount: 45,
            angle: 120,
            spread: 60,
            origin: { x: 0.9, y: 0.65 },
            zIndex: 99999,
          })
        }, 220)
      } catch {
        // Fallback gracefully
      }
    },
    onError: (err) => {
      setServerError(err.response?.data?.error?.message || 'Failed to update settings.')
    },
  })

  const GOVT_GST_SLABS = [
    { rate: 0, label: '0%', description: 'Nil' },
    { rate: 5, label: '5%', description: 'Low' },
    { rate: 12, label: '12%', description: 'Std' },
    { rate: 18, label: '18%', description: 'Sports & Turf' },
    { rate: 28, label: '28%', description: 'Max Slab' },
  ]

  const handleTaxRateChange = (rawVal) => {
    if (rawVal === '') {
      setFormData((prev) => ({
        ...prev,
        taxSettings: {
          ...prev.taxSettings,
          taxRatePercentage: '',
        },
      }))
      return
    }
    const parsed = parseFloat(rawVal)
    setFormData((prev) => ({
      ...prev,
      taxSettings: {
        ...prev.taxSettings,
        taxRatePercentage: isNaN(parsed) ? rawVal : parsed,
      },
    }))
  }

  const handleTaxRateBlur = () => {
    const current = formData.taxSettings.taxRatePercentage
    if (current === '') {
      setFormData((prev) => ({
        ...prev,
        taxSettings: {
          ...prev.taxSettings,
          taxRatePercentage: 0,
        },
      }))
      return
    }
    const val = typeof current === 'number' ? current : parseFloat(current)
    if (!isNaN(val)) {
      setFormData((prev) => ({
        ...prev,
        taxSettings: {
          ...prev.taxSettings,
          taxRatePercentage: Math.round(val * 100) / 100,
        },
      }))
    }
  }

  const adjustTaxRate = (delta) => {
    const current =
      typeof formData.taxSettings.taxRatePercentage === 'number'
        ? formData.taxSettings.taxRatePercentage
        : parseFloat(formData.taxSettings.taxRatePercentage) || 0
    const nextVal = Math.min(100, Math.max(0, Math.round((current + delta) * 10) / 10))
    setFormData((prev) => ({
      ...prev,
      taxSettings: {
        ...prev.taxSettings,
        taxRatePercentage: nextVal,
      },
    }))
  }

  const currentTaxRateNumber =
    typeof formData.taxSettings.taxRatePercentage === 'number'
      ? formData.taxSettings.taxRatePercentage
      : parseFloat(formData.taxSettings.taxRatePercentage)

  const isTaxRateEmpty = formData.taxSettings.taxRatePercentage === ''
  const isTaxRateOver100 = !isTaxRateEmpty && currentTaxRateNumber > 100
  const isTaxRateNegative = !isTaxRateEmpty && currentTaxRateNumber < 0
  const isTaxRateAboveMaxSlab =
    !isTaxRateEmpty && currentTaxRateNumber > 28 && currentTaxRateNumber <= 100
  const hasTaxRateError = Boolean(formData.taxSettings.taxEnabled && (isTaxRateOver100 || isTaxRateNegative))

  const currentAdvancePercentage =
    typeof formData.partialPaymentSettings?.advancePercentage === 'number'
      ? formData.partialPaymentSettings.advancePercentage
      : parseFloat(formData.partialPaymentSettings?.advancePercentage) || 0

  const isAdvancePercentageInvalid =
    Boolean(formData.partialPaymentSettings?.enabled &&
    (currentAdvancePercentage < 1 || currentAdvancePercentage > 99 || isNaN(currentAdvancePercentage)))

  const handleAdvancePercentageChange = (rawVal) => {
    if (rawVal === '') {
      setFormData((prev) => ({
        ...prev,
        partialPaymentSettings: {
          ...prev.partialPaymentSettings,
          advancePercentage: '',
        },
      }))
      return
    }
    const parsed = parseInt(rawVal, 10)
    setFormData((prev) => ({
      ...prev,
      partialPaymentSettings: {
        ...prev.partialPaymentSettings,
        advancePercentage: isNaN(parsed) ? rawVal : parsed,
      },
    }))
  }

  const adjustAdvancePercentage = (delta) => {
    const current =
      typeof formData.partialPaymentSettings?.advancePercentage === 'number'
        ? formData.partialPaymentSettings.advancePercentage
        : parseInt(formData.partialPaymentSettings?.advancePercentage, 10) || 20
    const nextVal = Math.min(99, Math.max(1, current + delta))
    setFormData((prev) => ({
      ...prev,
      partialPaymentSettings: {
        ...prev.partialPaymentSettings,
        advancePercentage: nextVal,
      },
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setServerError(null)

    if (!formData.businessName.trim()) {
      setServerError('Business name cannot be empty.')
      return
    }

    if (hasTaxRateError) {
      setServerError('GST tax rate percentage cannot exceed 100% or be negative.')
      return
    }

    if (isAdvancePercentageInvalid) {
      setServerError('Advance payment percentage must be a valid number between 1% and 99%.')
      return
    }

    const finalTaxRate = isNaN(currentTaxRateNumber) ? 0 : currentTaxRateNumber
    const finalAdvancePercentage = isNaN(currentAdvancePercentage)
      ? 20
      : Math.min(99, Math.max(1, Math.round(currentAdvancePercentage)))

    const payload = {
      ...formData,
      taxSettings: {
        ...formData.taxSettings,
        taxRatePercentage: finalTaxRate,
      },
      partialPaymentSettings: {
        enabled: Boolean(formData.partialPaymentSettings?.enabled),
        advancePercentage: finalAdvancePercentage,
      },
    }

    updateMutation.mutate(payload)
  }

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#267A45] animate-spin" />
        <p className="text-xs text-[#526258]">Loading business configuration...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-[#FDF0EF] border border-[#F5C2BF] text-[#922B27] text-xs">
        Failed to load settings: {error?.message}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="pb-2 border-b border-[#E2E8E3]">
        <h1 className="text-2xl font-black tracking-tight text-[#17231B] flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-[#267A45]" />
          <span>Business Settings & Rules</span>
        </h1>
        <p className="text-xs text-[#526258] mt-1">
          Configure organization contact info, slot booking intervals, GST taxation, and customer policies.
        </p>
      </div>

      {/* Celebration Modal Pop-up */}
      {showCelebrationModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowCelebrationModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#D7E0D9] text-center space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X button */}
            <button
              type="button"
              onClick={() => setShowCelebrationModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#647168] hover:text-[#17231B] hover:bg-[#F0F6F1] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Celebratory Icon with pulse rings */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#E7F3E9] animate-ping opacity-40" />
              <div className="absolute inset-1.5 rounded-full bg-[#D1EBD6] animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#267A45] to-[#34D399] flex items-center justify-center shadow-lg text-white">
                <PartyPopper className="w-8 h-8 animate-bounce" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-[#F59E0B]" />
              <Sparkles className="absolute -bottom-1 -left-1 w-4 h-4 text-[#10B981]" />
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-[#17231B] tracking-tight">
                Configuration Saved Successfully!
              </h3>
              <p className="text-xs text-[#526258] leading-relaxed">
                Your business settings, GST taxation rules, and booking policies have been updated and are live across the platform.
              </p>
            </div>

            {/* Highlights Summary Badge */}
            <div className="p-3 rounded-2xl bg-[#F7FAF8] border border-[#E2E8E3] grid grid-cols-2 gap-2 text-left">
              <div className="p-2.5 rounded-xl bg-white border border-[#E8EEE9]">
                <span className="text-[10px] font-semibold text-[#647168] uppercase tracking-wider block">
                  Tax Setting
                </span>
                <span className="text-xs font-bold text-[#17231B] truncate block">
                  {formData.taxSettings.taxEnabled
                    ? `${formData.taxSettings.taxName || 'GST'} @ ${formData.taxSettings.taxRatePercentage}%`
                    : 'Tax Disabled'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E8EEE9]">
                <span className="text-[10px] font-semibold text-[#647168] uppercase tracking-wider block">
                  Slot Interval
                </span>
                <span className="text-xs font-bold text-[#17231B] truncate block">
                  {formData.bookingRules.slotDurationMinutes} Minutes
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => setShowCelebrationModal(false)}
              className="w-full justify-center shadow-md cursor-pointer font-bold text-sm py-3"
            >
              <Check className="w-4 h-4 mr-1.5" />
              <span>Awesome, Got It!</span>
            </Button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {successToast && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] text-[#1D6537] flex items-center gap-3 text-xs leading-relaxed animate-in fade-in"
        >
          <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error Alert */}
      {serverError && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-[#FDF0EF] border border-[#F5C2BF] text-[#922B27] flex items-center gap-3 text-xs leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Business Identity & Contact */}
        <div className="rounded-2xl border border-[#D7E0D9] bg-white p-5 sm:p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-[#17231B] flex items-center gap-2 border-b border-[#E2E8E3] pb-3">
            <Building2 className="w-4 h-4 text-[#267A45]" />
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
        <div className="rounded-2xl border border-[#D7E0D9] bg-white p-5 sm:p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-[#17231B] flex items-center gap-2 border-b border-[#E2E8E3] pb-3">
            <Clock className="w-4 h-4 text-[#267A45]" />
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
                onWheel={(e) => e.currentTarget.blur()}
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
                onWheel={(e) => e.currentTarget.blur()}
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
                onWheel={(e) => e.currentTarget.blur()}
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
              hint="Cutoff window before match start time"
            >
              <Input
                id="cancelCutoff"
                type="number"
                min="0"
                value={formData.cancellationPolicy?.cutoffHours ?? formData.bookingRules.cancellationCutoffHours}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value, 10) || 0)
                  setFormData({
                    ...formData,
                    bookingRules: {
                      ...formData.bookingRules,
                      cancellationCutoffHours: val,
                    },
                    cancellationPolicy: {
                      ...formData.cancellationPolicy,
                      cutoffHours: val,
                    },
                  })
                }}
              />
            </FormField>
          </div>

          {/* Cancellation Policy & Refund Tiers Configuration */}
          <div className="pt-4 border-t border-[#E2E8E3] space-y-4">
            <h3 className="text-xs font-bold text-[#17231B] uppercase tracking-wider">
              Cancellation & Stripe Refund Tiers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#D7E0D9] bg-[#F6F8F6] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.cancellationPolicy?.enabled ?? true}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cancellationPolicy: {
                        ...formData.cancellationPolicy,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-[#267A45] focus:ring-[#267A45]"
                />
                <div>
                  <span className="font-semibold text-[#17231B] block">Enable Self-Service Cancellation</span>
                  <span className="text-[11px] text-[#526258]">
                    Allow customers to cancel their own bookings online
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#D7E0D9] bg-[#F6F8F6] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.cancellationPolicy?.allowCancellationWithinCutoff ?? false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cancellationPolicy: {
                        ...formData.cancellationPolicy,
                        allowCancellationWithinCutoff: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-[#267A45] focus:ring-[#267A45]"
                />
                <div>
                  <span className="font-semibold text-[#17231B] block">Allow Cancellation Within Cutoff</span>
                  <span className="text-[11px] text-[#526258]">
                    Permit late slot releases at 0% refund instead of blocking
                  </span>
                </div>
              </label>
            </div>

            {/* Tiers Table */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#17231B] block">
                Refund Tiers (Notice Period vs Refund Percentage)
              </span>
              <p className="text-[11px] text-[#526258]">
                Configure tiered refunds based on hours before the match. Evaluated in descending order of notice hours.
              </p>

              <div className="rounded-xl border border-[#D7E0D9] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F0F4F1] text-[#526258] uppercase text-[10px] tracking-wider border-b border-[#D7E0D9]">
                    <tr>
                      <th className="px-3 py-2">Notice Window</th>
                      <th className="px-3 py-2">Hours Before Match (≥)</th>
                      <th className="px-3 py-2">Refund % (0-100)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8E3] text-[#17231B]">
                    {(formData.cancellationPolicy?.tiers || []).map((tier, idx) => (
                      <tr key={idx} className="hover:bg-[#F6F8F6]">
                        <td className="px-3 py-2 font-medium text-[#526258]">
                          {idx === 0
                            ? 'Early Notice Window'
                            : idx === 1
                            ? 'Standard Notice Window'
                            : 'Late / Near-Slot Window'}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={tier.hoursBefore}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0)
                              const updated = [...formData.cancellationPolicy.tiers]
                              updated[idx] = { ...updated[idx], hoursBefore: val }
                              setFormData({
                                ...formData,
                                cancellationPolicy: {
                                  ...formData.cancellationPolicy,
                                  tiers: updated,
                                },
                              })
                            }}
                            className="w-24 px-2 py-1 rounded-lg border border-[#D7E0D9] text-xs font-mono"
                          />
                          <span className="ml-1.5 text-[#526258] text-[11px]">hours</span>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={tier.refundPercentage}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                              const updated = [...formData.cancellationPolicy.tiers]
                              updated[idx] = { ...updated[idx], refundPercentage: val }
                              setFormData({
                                ...formData,
                                cancellationPolicy: {
                                  ...formData.cancellationPolicy,
                                  tiers: updated,
                                },
                              })
                            }}
                            className="w-20 px-2 py-1 rounded-lg border border-[#D7E0D9] text-xs font-mono font-bold text-[#267A45]"
                          />
                          <span className="ml-1 text-[#526258]">%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Tax Settings */}
        <div className="rounded-2xl border border-[#D7E0D9] bg-white p-5 sm:p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-[#17231B] flex items-center gap-2 border-b border-[#E2E8E3] pb-3">
            <Percent className="w-4 h-4 text-[#267A45]" />
            <span>Taxation Settings</span>
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#17231B]">
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
                className="w-4 h-4 rounded border-[#D7E0D9] accent-[#267A45] cursor-pointer"
              />
              <span className="font-semibold text-[#17231B]">Enable GST / Sales Tax at Checkout</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Tax Identifier / Name"
                htmlFor="taxName"
                hint={formData.taxSettings.taxEnabled ? 'Shown to players on invoices' : 'Disabled'}
              >
                <Input
                  id="taxName"
                  placeholder="GST"
                  disabled={!formData.taxSettings.taxEnabled}
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

              <FormField
                label="Tax Rate Percentage (%)"
                htmlFor="taxRate"
              >
                <div className="space-y-3">
                  {/* Stepper + Input with % adornment */}
                  <div className="relative flex items-stretch">
                    <button
                      type="button"
                      disabled={!formData.taxSettings.taxEnabled || currentTaxRateNumber <= 0}
                      onClick={() => adjustTaxRate(-1)}
                      className="px-3.5 py-2.5 rounded-l-xl border border-r-0 border-[#D7E0D9] bg-[#F7FAF8] hover:bg-[#EBF3EC] active:bg-[#DCEBDD] text-[#17231B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold flex items-center justify-center cursor-pointer select-none"
                      title="Decrease by 1%"
                      aria-label="Decrease tax rate"
                    >
                      <Minus className="w-3.5 h-3.5 text-[#526258]" />
                    </button>

                    <div className="relative flex-1">
                      <input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        disabled={!formData.taxSettings.taxEnabled}
                        value={formData.taxSettings.taxRatePercentage}
                        onChange={(e) => handleTaxRateChange(e.target.value)}
                        onBlur={handleTaxRateBlur}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="18"
                        className={`w-full h-full text-center bg-white border-y py-2.5 text-sm font-semibold transition-colors outline-none placeholder:text-[#647168] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#EDF1EE] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          hasTaxRateError
                            ? 'border-[#922B27] ring-1 ring-[#922B27]/20 bg-[#FDF0EF]/30 text-[#922B27]'
                            : 'border-[#D7E0D9] text-[#17231B] focus:border-[#267A45] focus:ring-1 focus:ring-[#267A45]'
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#647168] pointer-events-none select-none">
                        %
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!formData.taxSettings.taxEnabled || currentTaxRateNumber >= 100}
                      onClick={() => adjustTaxRate(1)}
                      className="px-3.5 py-2.5 rounded-r-xl border border-l-0 border-[#D7E0D9] bg-[#F7FAF8] hover:bg-[#EBF3EC] active:bg-[#DCEBDD] text-[#17231B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold flex items-center justify-center cursor-pointer select-none"
                      title="Increase by 1%"
                      aria-label="Increase tax rate"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#526258]" />
                    </button>
                  </div>

                  {/* Over-100 Error Warning */}
                  {isTaxRateOver100 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#922B27] mt-0.5" />
                      <div>
                        <p className="font-semibold">Value Exceeds 100%</p>
                        <p className="text-[11px] text-[#922B27]/90 mt-0.5">
                          GST tax rate cannot exceed 100%. Saving is disabled until a valid rate between 0% and 100% is entered.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Negative Value Error Warning */}
                  {isTaxRateNegative && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#922B27] mt-0.5" />
                      <div>
                        <p className="font-semibold">Invalid Negative Value</p>
                        <p className="text-[11px] text-[#922B27]/90 mt-0.5">
                          GST tax rate cannot be negative. Please enter a rate from 0% to 100%.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Government 28% Slabs Advisory */}
                  {isTaxRateAboveMaxSlab && (
                    <div className="flex items-start gap-2 p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs">
                      <Info className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />
                      <p className="text-[11px] text-[#92400E]">
                        <strong>Govt Slab Advisory:</strong> Standard maximum Indian GST bracket is <strong>28%</strong>. Rates above 28% are rarely applicable for turf and sports facilities.
                      </p>
                    </div>
                  )}

                  {/* Official Government Slabs */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#17231B]">Official Govt GST Slabs:</span>
                      <span className="text-[#647168]">Max standard: 28%</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {GOVT_GST_SLABS.map((slab) => {
                        const isSelected =
                          Number(formData.taxSettings.taxRatePercentage) === slab.rate &&
                          formData.taxSettings.taxRatePercentage !== ''
                        return (
                          <button
                            key={slab.rate}
                            type="button"
                            disabled={!formData.taxSettings.taxEnabled}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                taxSettings: {
                                  ...prev.taxSettings,
                                  taxRatePercentage: slab.rate,
                                },
                              }))
                            }}
                            className={`py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border ${
                              isSelected
                                ? 'bg-[#267A45] text-white border-[#267A45] shadow-xs'
                                : 'bg-[#F7FAF8] hover:bg-[#EBF3EC] border-[#D7E0D9] text-[#17231B]'
                            }`}
                          >
                            <div className="text-xs font-bold leading-tight">{slab.label}</div>
                            <div
                              className={`text-[9px] truncate leading-tight ${
                                isSelected ? 'text-white/80' : 'text-[#647168]'
                              }`}
                            >
                              {slab.description}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </FormField>
            </div>
          </div>
        </div>

        {/* Section: Partial Advance Payment Configuration */}
        <div className="rounded-2xl border border-[#D7E0D9] bg-white p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="border-b border-[#E2E8E3] pb-3">
            <h2 className="text-sm font-bold text-[#17231B] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#267A45]" />
              <span>Partial Advance Payment (Pay at Venue Policy)</span>
            </h2>
            <p className="text-xs text-[#526258] mt-1">
              Configure required online advance payment percentage for customers choosing Pay at Venue. Prevents no-show slot wastage and guarantees match commitment.
            </p>
          </div>

          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F7FAF8] border border-[#D7E0D9]">
              <input
                type="checkbox"
                id="partialPaymentEnabled"
                checked={Boolean(formData.partialPaymentSettings?.enabled)}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    partialPaymentSettings: {
                      ...prev.partialPaymentSettings,
                      enabled: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 rounded text-[#267A45] focus:ring-[#267A45] border-[#D7E0D9] cursor-pointer"
              />
              <label htmlFor="partialPaymentEnabled" className="text-xs cursor-pointer select-none">
                <span className="font-semibold text-[#17231B] block">Enable Partial Advance Online Payment</span>
                <span className="text-[#526258] text-[11px]">
                  When enabled, customers pay an advance online via Stripe to confirm their booking, and the remaining amount is collected at the venue.
                </span>
              </label>
            </div>

            {/* Advance Percentage Controls */}
            {formData.partialPaymentSettings?.enabled && (
              <div className="space-y-4 p-4 rounded-xl bg-white border border-[#E2E8E3]">
                <FormField
                  label="Advance Payment Percentage (%)"
                  htmlFor="advancePercentage"
                  hint="Must be between 1% and 99% (Default: 20%)"
                >
                  <div className="space-y-2 max-w-sm">
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        disabled={currentAdvancePercentage <= 1}
                        onClick={() => adjustAdvancePercentage(-1)}
                        className="px-3.5 py-2.5 rounded-l-xl border border-r-0 border-[#D7E0D9] bg-[#F7FAF8] hover:bg-[#EBF3EC] active:bg-[#DCEBDD] text-[#17231B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold flex items-center justify-center cursor-pointer select-none"
                        title="Decrease by 1%"
                        aria-label="Decrease advance percentage"
                      >
                        <Minus className="w-3.5 h-3.5 text-[#526258]" />
                      </button>

                      <div className="relative flex-1">
                        <Input
                          id="advancePercentage"
                          type="number"
                          min="1"
                          max="99"
                          step="1"
                          value={formData.partialPaymentSettings?.advancePercentage ?? ''}
                          onChange={(e) => handleAdvancePercentageChange(e.target.value)}
                          className={`text-center font-mono font-bold text-xs pr-8 rounded-none border-x-0 ${
                            isAdvancePercentageInvalid
                              ? 'border-[#F8D2CE] bg-[#FDF0EF] text-[#922B27] focus:ring-[#922B27]'
                              : ''
                          }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#526258] select-none pointer-events-none">
                          %
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={currentAdvancePercentage >= 99}
                        onClick={() => adjustAdvancePercentage(1)}
                        className="px-3.5 py-2.5 rounded-r-xl border border-l-0 border-[#D7E0D9] bg-[#F7FAF8] hover:bg-[#EBF3EC] active:bg-[#DCEBDD] text-[#17231B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold flex items-center justify-center cursor-pointer select-none"
                        title="Increase by 1%"
                        aria-label="Increase advance percentage"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#526258]" />
                      </button>
                    </div>

                    {/* Invalid Range Error */}
                    {isAdvancePercentageInvalid && (
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 text-[#922B27] mt-0.5" />
                        <div>
                          <p className="font-semibold">Invalid Advance Percentage</p>
                          <p className="text-[11px] text-[#922B27]/90 mt-0.5">
                            Advance payment percentage must be a valid number between 1% and 99%.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Quick Preset Buttons */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#17231B]">Quick Presets:</span>
                        <span className="text-[#647168]">Default: 20%</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[10, 20, 30, 50].map((pct) => {
                          const isSelected = Number(currentAdvancePercentage) === pct
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  partialPaymentSettings: {
                                    ...prev.partialPaymentSettings,
                                    advancePercentage: pct,
                                  },
                                }))
                              }}
                              className={`py-1.5 px-2 rounded-xl text-center transition-all cursor-pointer border text-xs font-bold ${
                                isSelected
                                  ? 'bg-[#267A45] text-white border-[#267A45] shadow-xs'
                                  : 'bg-[#F7FAF8] hover:bg-[#EBF3EC] border-[#D7E0D9] text-[#17231B]'
                              }`}
                            >
                              {pct}% {pct === 20 ? '(Default)' : ''}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </FormField>

                {/* Real-Time Calculation Simulation Card */}
                <div className="mt-4 p-4 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#17231B] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#267A45]" />
                      <span>Live Quote Simulation (Example: ₹2,000 Total)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
                      {currentAdvancePercentage}% Advance Rate
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-[#E2E8E3]">
                      <span className="text-[10px] text-[#526258] block">Total Booking Value</span>
                      <span className="font-mono font-black text-sm text-[#17231B]">₹2,000.00</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-[#C9DFCE]">
                      <span className="text-[10px] text-[#1D6537] font-semibold block">
                        Advance Paid Online (Stripe)
                      </span>
                      <span className="font-mono font-black text-sm text-[#267A45]">
                        ₹{(Math.round((2000 * (currentAdvancePercentage || 20)) / 100)).toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-[#F6E1C4]">
                      <span className="text-[10px] text-[#79420D] font-semibold block">
                        Remaining at Venue Counter
                      </span>
                      <span className="font-mono font-black text-sm text-[#79420D]">
                        ₹{(2000 - Math.round((2000 * (currentAdvancePercentage || 20)) / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#526258] pt-1">
                    Customer pays the advance online through Stripe to confirm the reservation. The venue reception collects the remaining balance on match day.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Public Business Info */}
        <div className="rounded-2xl border border-[#D7E0D9] bg-white p-5 sm:p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-[#17231B] flex items-center gap-2 border-b border-[#E2E8E3] pb-3">
            <FileText className="w-4 h-4 text-[#267A45]" />
            <span>Customer-Facing Policies</span>
          </h2>

          <FormField label="About the Arena / Bio" htmlFor="aboutText">
            <textarea
              id="aboutText"
              rows={3}
              value={formData.aboutText}
              onChange={(e) => setFormData({ ...formData, aboutText: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#D7E0D9] text-[#17231B] text-xs focus:ring-1 focus:ring-[#267A45] focus:border-[#267A45] focus:outline-none placeholder-[#647168]"
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
            disabled={hasTaxRateError || isAdvancePercentageInvalid || updateMutation.isPending}
            isLoading={updateMutation.isPending}
            className="cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
