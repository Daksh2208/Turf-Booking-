import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      trim: true,
      uppercase: true,
      index: true,
      minlength: [3, 'Coupon code must be at least 3 characters'],
      maxlength: [30, 'Coupon code cannot exceed 30 characters'],
      match: [/^[A-Z0-9_-]+$/, 'Coupon code can only contain alphanumeric characters, hyphens, and underscores'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [250, 'Description cannot exceed 250 characters'],
      default: '',
    },
    discountType: {
      type: String,
      required: [true, 'Discount type is required'],
      enum: {
        values: ['percentage', 'fixed'],
        message: 'Discount type must be either "percentage" or "fixed"',
      },
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [1, 'Discount value must be at least 1'],
    }, // percentage (1-100) or fixed amount in integer paise (e.g. 50000 = ₹500)
    minimumBookingAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum booking amount cannot be negative'],
    }, // in integer paise
    maximumDiscountAmount: {
      type: Number,
      default: null,
      min: [0, 'Maximum discount amount cannot be negative'],
    }, // optional cap for percentage discounts, in integer paise
    startAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    usageLimit: {
      type: Number,
      default: null,
      min: [1, 'Usage limit must be at least 1 if set'],
    }, // global redemption limit across all users
    perUserLimit: {
      type: Number,
      default: 1,
      min: [1, 'Per-user limit must be at least 1'],
    }, // max successful redemptions per customer
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative'],
    }, // total successful redemptions
    eligibleSports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sport',
      },
    ], // empty array means applicable to all sports
    eligibleTurfs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Turf',
      },
    ], // empty array means applicable to all turfs
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for active coupon lookup
couponSchema.index({ code: 1, isDeleted: 1 })

// Automatically deactivate coupon if validity (expiresAt) is expired
couponSchema.pre('save', function (next) {
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isActive = false
  }
  next()
})

export const Coupon = mongoose.model('Coupon', couponSchema)
export default Coupon
