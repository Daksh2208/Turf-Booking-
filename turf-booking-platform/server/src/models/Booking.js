import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer user reference is required'],
      index: true,
    },
    turf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turf',
      required: [true, 'Turf arena reference is required'],
      index: true,
    },
    sport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sport',
      required: false, // Optional if turf has default or inferred sport
    },
    date: {
      type: String,
      required: [true, 'Booking date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm 24-hour format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm 24-hour format'],
    },
    selectedSlots: {
      type: [String],
      default: [],
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
    },
    playerCount: {
      type: Number,
      default: 10,
      min: 1,
    },
    // Player / Customer Contact Details Snapshot
    contactDetails: {
      name: {
        type: String,
        default: '',
        trim: true,
      },
      email: {
        type: String,
        default: '',
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        default: '',
        trim: true,
      },
    },
    rateType: {
      type: String,
      enum: ['base', 'peak', 'weekend', 'weekend_peak'],
      default: 'base',
    },
    slotPrice: {
      type: Number,
      required: true,
      min: [0, 'Slot price cannot be negative'],
    }, // in integer paise
    addOns: [
      {
        addOn: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AddOn',
        },
        name: { type: String, required: true },
        price: { type: Number, required: true }, // unit price snapshot in paise
        quantity: { type: Number, default: 1, min: 1 },
        pricingUnit: { type: String, default: 'per_booking' },
        totalPrice: { type: Number, required: true }, // total item price in paise
      },
    ],
    addOnsTotal: {
      type: Number,
      default: 0,
      min: 0,
    }, // in integer paise
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    }, // in integer paise
    taxRatePercentage: {
      type: Number,
      default: 18,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    }, // in integer paise
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    }, // in integer paise
    // Coupon and discount snapshot
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    }, // in integer paise
    coupon: {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null,
      },
      code: {
        type: String,
        uppercase: true,
        trim: true,
        default: null,
      },
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: null,
      },
      discountValue: {
        type: Number,
        default: null,
      },
      discountAmount: {
        type: Number,
        default: 0,
      }, // in integer paise
      preDiscountSubtotal: {
        type: Number,
        default: null,
      }, // in integer paise
      postDiscountSubtotal: {
        type: Number,
        default: null,
      }, // in integer paise
    },
    // Authoritative pricing breakdown snapshot from pricingService
    pricingBreakdown: {
      hourlySegments: [
        {
          startTime: String,
          endTime: String,
          durationHours: Number,
          rateType: String,
          hourlyRate: Number,
          segmentPrice: Number,
        },
      ],
      turfSubtotal: Number,
      addOnsSubtotal: Number,
      subtotal: Number,
      preDiscountSubtotal: Number,
      discountAmount: Number,
      couponCode: String,
      taxableAmount: Number,
      taxPercentage: Number,
      taxAmount: Number,
      finalTotal: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'expired', 'failed'],
      default: 'confirmed',
      index: true,
    },
    paymentPlan: {
      type: String,
      enum: ['full_online', 'partial_advance'],
      default: 'full_online',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'partially_paid', 'paid', 'refunded', 'failed', 'refund_pending', 'partially_refunded'],
      default: 'unpaid',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Pay at Venue', 'pay_at_venue', 'stripe', 'online', 'card', 'upi', 'Cash', 'cash', 'counter'],
      default: 'Pay at Venue',
    },
    advancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    }, // in integer paise
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0,
    }, // in integer paise
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    }, // in integer paise
    amountDue: {
      type: Number,
      default: 0,
      min: 0,
    }, // in integer paise
    venuePayment: {
      collectedAt: { type: Date, default: null },
      collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      paymentMethod: { type: String, default: '' },
      amount: { type: Number, default: 0 },
      notes: { type: String, default: '' },
    },
    stripeCheckoutSessionId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    stripePaymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    paymentFailureReason: {
      type: String,
      trim: true,
      default: '',
    },
    paymentExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    // Safe retry and duplicate submission prevention
    idempotencyKey: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    // Cancellation & Refund Lifecycle Tracking
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      role: {
        type: String,
        enum: ['admin', 'customer', 'system'],
      },
    },
    refundStatus: {
      type: String,
      enum: [
        'not_applicable',
        'not_required',
        'pending',
        'processing',
        'succeeded',
        'failed',
        'partially_refunded',
      ],
      default: 'not_applicable',
      index: true,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative'],
    }, // in integer paise
    refundPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    stripeRefundId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    refundFailureReason: {
      type: String,
      trim: true,
      default: '',
    },
    refundRetriedAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
    cancellationHistory: [
      {
        action: {
          type: String,
          enum: [
            'cancelled',
            'refund_initiated',
            'refund_succeeded',
            'refund_failed',
            'refund_retried',
          ],
        },
        performedBy: {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          role: {
            type: String,
            enum: ['admin', 'customer', 'system'],
          },
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        previousStatus: String,
        newStatus: String,
        previousRefundStatus: String,
        newRefundStatus: String,
        amount: Number,
        stripeRefundId: String,
        reason: String,
        failureReason: String,
      },
    ],
    paidAt: {
      type: Date,
    },
    paymentRecordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    paymentNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

/**
 * Pre-save defensive consistency hook for partial advance payments:
 * Enforces that bookings with partial_advance payment plan where amountPaid < totalAmount
 * are strictly marked partially_paid with accurate amountDue and remainingAmount.
 */
bookingSchema.pre('save', function (next) {
  if (this.paymentPlan === 'partial_advance') {
    // If money has been paid but remaining balance is still due
    if (this.amountPaid > 0 && this.amountPaid < this.totalAmount) {
      if (this.status !== 'cancelled' && this.status !== 'expired' && this.status !== 'failed') {
        this.paymentStatus = 'partially_paid'
      }
      this.amountDue = Math.max(0, this.totalAmount - this.amountPaid)
      this.remainingAmount = this.amountDue
    } else if (this.amountPaid >= this.totalAmount && this.totalAmount > 0) {
      this.paymentStatus = 'paid'
      this.amountDue = 0
      this.remainingAmount = 0
    }
  } else if (this.paymentPlan === 'full_online' || !this.paymentPlan) {
    if (this.paymentStatus === 'paid') {
      this.amountDue = 0
      if (!this.amountPaid && this.totalAmount > 0) {
        this.amountPaid = this.totalAmount
      }
    }
  }
  next()
})

// Efficient compound indexes for customer lookups, admin reporting and conflict detection
bookingSchema.index({ user: 1, createdAt: -1 })
bookingSchema.index({ user: 1, status: 1, date: 1 })
bookingSchema.index({ user: 1, date: 1 })
bookingSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
)
bookingSchema.index({ turf: 1, date: 1, startTime: 1, endTime: 1, status: 1 })
bookingSchema.index({ turf: 1, date: 1, status: 1 })
bookingSchema.index({ date: 1, status: 1, paymentStatus: 1 })
bookingSchema.index({ status: 1, paymentStatus: 1 })
bookingSchema.index({ status: 1, refundStatus: 1 })
bookingSchema.index({ createdAt: -1 })

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema)
export default Booking
