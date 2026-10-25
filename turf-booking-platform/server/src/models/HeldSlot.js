import mongoose from 'mongoose'

const heldSlotSchema = new mongoose.Schema(
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
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Slot time must be in HH:mm format'],
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'released', 'expired', 'converted'],
      default: 'active',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

/**
 * Concurrency Protection Index:
 * Guarantees at the database level that no two active holds can exist
 * for the same turf, date, and discrete slotTime.
 */
heldSlotSchema.index(
  { turf: 1, date: 1, slotTime: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
)

export const HeldSlot =
  mongoose.models.HeldSlot || mongoose.model('HeldSlot', heldSlotSchema)

export default HeldSlot
