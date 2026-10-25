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
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'refunded', 'failed'],
      default: 'unpaid',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Pay at Venue', 'pay_at_venue', 'stripe', 'online', 'card', 'upi', 'Cash', 'cash'],
      default: 'Pay at Venue',
    },
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

// Efficient compound indexes for customer lookups, admin reporting and conflict detection
bookingSchema.index({ user: 1, createdAt: -1 })
bookingSchema.index({ turf: 1, date: 1, startTime: 1, endTime: 1, status: 1 })
bookingSchema.index({ turf: 1, date: 1, status: 1 })
bookingSchema.index({ date: 1, status: 1, paymentStatus: 1 })
bookingSchema.index({ status: 1, paymentStatus: 1 })
bookingSchema.index({ createdAt: -1 })

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema)
export default Booking
