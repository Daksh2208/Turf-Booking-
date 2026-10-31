import mongoose from 'mongoose'

export const ALLOWED_PAYMENT_STATUS_TRANSITIONS = {
  unpaid: ['pending', 'partially_paid', 'paid', 'failed'],
  pending: ['partially_paid', 'paid', 'failed', 'unpaid'],
  partially_paid: ['paid', 'refund_pending', 'partially_refunded', 'refunded', 'failed'],
  paid: ['refund_pending', 'partially_refunded', 'refunded'],
  refund_pending: ['partially_refunded', 'refunded', 'paid', 'partially_paid', 'failed'],
  partially_refunded: ['refund_pending', 'refunded'],
  refunded: [], // Terminal state
  failed: ['pending', 'partially_paid', 'paid', 'unpaid'],
}

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      index: true,
    },
    bookingReference: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    turf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turf',
      required: [true, 'Turf arena reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount in paise is required'],
      min: [0, 'Payment amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Pay at Venue', 'pay_at_venue', 'stripe', 'online', 'card', 'upi', 'Cash', 'cash', 'counter'],
      default: 'Pay at Venue',
    },
    status: {
      type: String,
      enum: ['unpaid', 'pending', 'partially_paid', 'paid', 'failed', 'refund_pending', 'partially_refunded', 'refunded'],
      default: 'unpaid',
      index: true,
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
    stripeRefundId: {
      type: String,
      trim: true,
      sparse: true,
    },
    failureReason: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
export default Payment

