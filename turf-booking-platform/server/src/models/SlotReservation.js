import mongoose from 'mongoose'

const slotReservationSchema = new mongoose.Schema(
  {
    turf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turf',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true,
    },
    slotTime: {
      type: String, // Start time of the discrete slot (e.g., '10:00')
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Slot time must be in HH:mm format'],
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
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

/**
 * Partial Unique Compound Index
 * Guarantees at the database level that no two active reservations can exist
 * for the exact same turf, date, and discrete slot time.
 * If concurrent requests arrive simultaneously, MongoDB will atomically accept
 * the first insert and reject the second with an E11000 duplicate key error.
 */
slotReservationSchema.index(
  { turf: 1, date: 1, slotTime: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
)

export const SlotReservation =
  mongoose.models.SlotReservation || mongoose.model('SlotReservation', slotReservationSchema)

export default SlotReservation
