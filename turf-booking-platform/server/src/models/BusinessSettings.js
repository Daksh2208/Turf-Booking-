import mongoose from 'mongoose'

const businessSettingsSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      default: 'TurfSpot Sports Arena',
      trim: true,
    },
    supportEmail: {
      type: String,
      required: true,
      default: 'support@turfbooking.com',
      trim: true,
      lowercase: true,
    },
    supportPhone: {
      type: String,
      default: '+91 98765 43210',
      trim: true,
    },
    address: {
      street: { type: String, default: 'Sports Complex Road' },
      city: { type: String, default: 'Ahmedabad' },
      state: { type: String, default: 'Gujarat' },
      zipCode: { type: String, default: '380015' },
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    currencySymbol: {
      type: String,
      default: '₹',
      trim: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true,
    },
    bookingRules: {
      slotDurationMinutes: {
        type: Number,
        default: 60,
        min: [15, 'Slot duration must be at least 15 minutes'],
      },
      minAdvanceBookingHours: {
        type: Number,
        default: 1,
        min: [0, 'Minimum advance booking hours cannot be negative'],
      },
      maxAdvanceBookingDays: {
        type: Number,
        default: 14,
        min: [1, 'Maximum advance booking days must be at least 1'],
      },
      cancellationCutoffHours: {
        type: Number,
        default: 4,
        min: [0, 'Cancellation cutoff hours cannot be negative'],
      },
    },
    cancellationPolicy: {
      enabled: {
        type: Boolean,
        default: true,
      },
      cutoffHours: {
        type: Number,
        default: 4,
        min: [0, 'Cancellation cutoff hours cannot be negative'],
      },
      allowCancellationWithinCutoff: {
        type: Boolean,
        default: false,
      },
      tiers: {
        type: [
          {
            hoursBefore: {
              type: Number,
              required: true,
              min: [0, 'Tier cutoff hours cannot be negative'],
            },
            refundPercentage: {
              type: Number,
              required: true,
              min: [0, 'Refund percentage cannot be negative'],
              max: [100, 'Refund percentage cannot exceed 100%'],
            },
          },
        ],
        default: [
          { hoursBefore: 24, refundPercentage: 100 },
          { hoursBefore: 12, refundPercentage: 50 },
          { hoursBefore: 4, refundPercentage: 0 },
        ],
      },
      defaultRefundPercentage: {
        type: Number,
        default: 0,
        min: [0, 'Default refund percentage cannot be negative'],
        max: [100, 'Default refund percentage cannot exceed 100%'],
      },
    },
    taxSettings: {
      taxEnabled: {
        type: Boolean,
        default: true,
      },
      taxName: {
        type: String,
        default: 'GST',
        trim: true,
      },
      taxRatePercentage: {
        type: Number,
        default: 18,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%'],
      },
    },
    partialPaymentSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },
      advancePercentage: {
        type: Number,
        default: 20,
        min: [1, 'Advance percentage must be at least 1%'],
        max: [99, 'Advance percentage cannot exceed 99%'],
      },
    },
    aboutText: {
      type: String,
      default: 'Premier multi-sport arena hosting box cricket, football, pickleball, and badminton turfs.',
    },
    termsUrl: {
      type: String,
      default: '/terms',
    },
    privacyUrl: {
      type: String,
      default: '/privacy',
    },
  },
  {
    timestamps: true,
  }
)

/**
 * Singleton accessor: retrieves the singleton settings document, or initializes default
 */
businessSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne()
  if (!settings) {
    settings = await this.create({})
  }
  let needsSave = false
  if (!settings.cancellationPolicy || !settings.cancellationPolicy.tiers?.length) {
    settings.cancellationPolicy = {
      enabled: true,
      cutoffHours: settings.bookingRules?.cancellationCutoffHours ?? 4,
      allowCancellationWithinCutoff: false,
      tiers: [
        { hoursBefore: 24, refundPercentage: 100 },
        { hoursBefore: 12, refundPercentage: 50 },
        { hoursBefore: 4, refundPercentage: 0 },
      ],
      defaultRefundPercentage: 0,
    }
    needsSave = true
  }
  if (!settings.partialPaymentSettings) {
    settings.partialPaymentSettings = {
      enabled: true,
      advancePercentage: 20,
    }
    needsSave = true
  }
  if (needsSave) {
    await settings.save()
  }
  return settings
}

export const BusinessSettings =
  mongoose.models.BusinessSettings || mongoose.model('BusinessSettings', businessSettingsSchema)
export default BusinessSettings
