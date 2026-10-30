import { BusinessSettings } from '../models/BusinessSettings.js'
import { logAudit } from '../utils/auditLogger.js'

export const settingsService = {
  /**
   * Get full business settings (Admin only)
   */
  async getSettings() {
    return BusinessSettings.getSettings()
  },

  /**
   * Get safe public business settings for customers
   */
  async getPublicSettings() {
    const settings = await BusinessSettings.getSettings()
    return {
      businessName: settings.businessName,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      address: settings.address,
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      timezone: settings.timezone,
      bookingRules: {
        slotDurationMinutes: settings.bookingRules.slotDurationMinutes,
        minAdvanceBookingHours: settings.bookingRules.minAdvanceBookingHours,
        maxAdvanceBookingDays: settings.bookingRules.maxAdvanceBookingDays,
        cancellationCutoffHours: settings.bookingRules.cancellationCutoffHours,
      },
      cancellationPolicy: {
        enabled: settings.cancellationPolicy?.enabled ?? true,
        cutoffHours: settings.cancellationPolicy?.cutoffHours ?? settings.bookingRules?.cancellationCutoffHours ?? 4,
        allowCancellationWithinCutoff: settings.cancellationPolicy?.allowCancellationWithinCutoff ?? false,
        tiers: settings.cancellationPolicy?.tiers ?? [
          { hoursBefore: 24, refundPercentage: 100 },
          { hoursBefore: 12, refundPercentage: 50 },
          { hoursBefore: 4, refundPercentage: 0 },
        ],
        defaultRefundPercentage: settings.cancellationPolicy?.defaultRefundPercentage ?? 0,
      },
      taxSettings: {
        taxEnabled: settings.taxSettings.taxEnabled,
        taxName: settings.taxSettings.taxName,
        taxRatePercentage: settings.taxSettings.taxRatePercentage,
      },
      aboutText: settings.aboutText,
      termsUrl: settings.termsUrl,
      privacyUrl: settings.privacyUrl,
    }
  },

  /**
   * Update business settings (Admin only)
   */
  async updateSettings(data, adminUser, ip = '') {
    const settings = await BusinessSettings.getSettings()

    if (data.businessName !== undefined) settings.businessName = data.businessName.trim()
    if (data.supportEmail !== undefined) settings.supportEmail = data.supportEmail.trim().toLowerCase()
    if (data.supportPhone !== undefined) settings.supportPhone = data.supportPhone.trim()

    if (data.address) {
      if (data.address.street !== undefined) settings.address.street = data.address.street.trim()
      if (data.address.city !== undefined) settings.address.city = data.address.city.trim()
      if (data.address.state !== undefined) settings.address.state = data.address.state.trim()
      if (data.address.zipCode !== undefined) settings.address.zipCode = data.address.zipCode.trim()
    }

    if (data.currency !== undefined) settings.currency = data.currency.trim().toUpperCase()
    if (data.currencySymbol !== undefined) settings.currencySymbol = data.currencySymbol.trim()
    if (data.timezone !== undefined) settings.timezone = data.timezone.trim()

    if (data.bookingRules) {
      if (data.bookingRules.slotDurationMinutes !== undefined) {
        settings.bookingRules.slotDurationMinutes = Number(data.bookingRules.slotDurationMinutes)
      }
      if (data.bookingRules.minAdvanceBookingHours !== undefined) {
        settings.bookingRules.minAdvanceBookingHours = Number(data.bookingRules.minAdvanceBookingHours)
      }
      if (data.bookingRules.maxAdvanceBookingDays !== undefined) {
        settings.bookingRules.maxAdvanceBookingDays = Number(data.bookingRules.maxAdvanceBookingDays)
      }
      if (data.bookingRules.cancellationCutoffHours !== undefined) {
        const cutoff = Number(data.bookingRules.cancellationCutoffHours)
        settings.bookingRules.cancellationCutoffHours = cutoff
        if (settings.cancellationPolicy) {
          settings.cancellationPolicy.cutoffHours = cutoff
        }
      }
    }

    if (data.cancellationPolicy) {
      if (!settings.cancellationPolicy) {
        settings.cancellationPolicy = {}
      }
      if (data.cancellationPolicy.enabled !== undefined) {
        settings.cancellationPolicy.enabled = Boolean(data.cancellationPolicy.enabled)
      }
      if (data.cancellationPolicy.cutoffHours !== undefined) {
        const cutoff = Math.max(0, Number(data.cancellationPolicy.cutoffHours))
        settings.cancellationPolicy.cutoffHours = cutoff
        settings.bookingRules.cancellationCutoffHours = cutoff
      }
      if (data.cancellationPolicy.allowCancellationWithinCutoff !== undefined) {
        settings.cancellationPolicy.allowCancellationWithinCutoff = Boolean(
          data.cancellationPolicy.allowCancellationWithinCutoff
        )
      }
      if (Array.isArray(data.cancellationPolicy.tiers)) {
        // Validate each tier
        const validatedTiers = data.cancellationPolicy.tiers
          .filter((t) => t && typeof t.hoursBefore === 'number' && typeof t.refundPercentage === 'number')
          .map((t) => ({
            hoursBefore: Math.max(0, Number(t.hoursBefore)),
            refundPercentage: Math.min(100, Math.max(0, Number(t.refundPercentage))),
          }))
          .sort((a, b) => b.hoursBefore - a.hoursBefore)
        settings.cancellationPolicy.tiers = validatedTiers
      }
      if (data.cancellationPolicy.defaultRefundPercentage !== undefined) {
        settings.cancellationPolicy.defaultRefundPercentage = Math.min(
          100,
          Math.max(0, Number(data.cancellationPolicy.defaultRefundPercentage))
        )
      }
    }

    if (data.taxSettings) {
      if (data.taxSettings.taxEnabled !== undefined) {
        settings.taxSettings.taxEnabled = Boolean(data.taxSettings.taxEnabled)
      }
      if (data.taxSettings.taxName !== undefined) {
        settings.taxSettings.taxName = data.taxSettings.taxName.trim()
      }
      if (data.taxSettings.taxRatePercentage !== undefined) {
        settings.taxSettings.taxRatePercentage = Number(data.taxSettings.taxRatePercentage)
      }
    }

    if (data.aboutText !== undefined) settings.aboutText = data.aboutText.trim()
    if (data.termsUrl !== undefined) settings.termsUrl = data.termsUrl.trim()
    if (data.privacyUrl !== undefined) settings.privacyUrl = data.privacyUrl.trim()

    await settings.save()

    await logAudit({
      actorId: adminUser._id,
      action: 'UPDATE',
      entityType: 'BusinessSettings',
      entityId: settings._id,
      details: {
        businessName: settings.businessName,
        currency: settings.currency,
        taxRatePercentage: settings.taxSettings.taxRatePercentage,
      },
      ip,
    })

    return settings
  },
}

export default settingsService
