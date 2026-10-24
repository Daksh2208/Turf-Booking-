import mongoose from 'mongoose'

const turfSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Turf name is required'],
      trim: true,
      minlength: [2, 'Turf name must be at least 2 characters'],
      maxlength: [100, 'Turf name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be valid lowercase alphanumeric hyphenated format'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    sports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sport',
        required: true,
      },
    ],
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      zipCode: {
        type: String,
        required: [true, 'Postal code is required'],
        trim: true,
      },
      landmark: {
        type: String,
        trim: true,
        default: '',
      },
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
      },
    },
    images: {
      type: [String],
      default: [],
    },
    capacity: {
      minPlayers: {
        type: Number,
        default: 2,
        min: [1, 'Minimum players must be at least 1'],
      },
      maxPlayers: {
        type: Number,
        default: 22,
        min: [1, 'Maximum players must be at least 1'],
      },
    },
    facilities: {
      type: [String],
      default: [],
    },
    openingHours: {
      open: {
        type: String,
        default: '06:00',
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Opening time must be in HH:mm 24-hour format'],
      },
      close: {
        type: String,
        default: '23:00',
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Closing time must be in HH:mm 24-hour format'],
      },
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

export const Turf = mongoose.models.Turf || mongoose.model('Turf', turfSchema)
export default Turf
