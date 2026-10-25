import mongoose from 'mongoose'

const reservationSchema = new mongoose.Schema(
  {
    reservationId: {
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
    date: {
      type: String,
      required: [true, 'Booking date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true,
    },
    slots: {
      type: [String],
      required: true,
      validate: [(arr) => arr.length > 0, 'At least one slot time is required'],
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm format'],
    },
    status: {
      type: String,
      enum: ['active', 'converted', 'released', 'expired'],
      default: 'active',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

reservationSchema.index({ user: 1, turf: 1, date: 1, status: 1 })
reservationSchema.index({ turf: 1, date: 1, status: 1 })
reservationSchema.index({ expiresAt: 1, status: 1 })

export const Reservation =
  mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema)

export default Reservation
