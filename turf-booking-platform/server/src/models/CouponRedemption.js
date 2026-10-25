import mongoose from 'mongoose'

const couponRedemptionSchema = new mongoose.Schema(
  {
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    couponCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    }, // in integer paise
    status: {
      type: String,
      enum: ['active', 'released'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Prevent the same booking from redeeming the same coupon twice
couponRedemptionSchema.index({ coupon: 1, booking: 1 }, { unique: true })
// Efficient query for per-user usage tracking
couponRedemptionSchema.index({ coupon: 1, user: 1, status: 1 })

export const CouponRedemption = mongoose.model('CouponRedemption', couponRedemptionSchema)
export default CouponRedemption
