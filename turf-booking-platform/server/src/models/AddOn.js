import mongoose from 'mongoose'

const addOnSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Add-on name is required'],
      trim: true,
      minlength: [2, 'Add-on name must be at least 2 characters'],
      maxlength: [80, 'Add-on name cannot exceed 80 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price in paise is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Price must be an integer represented in paise',
      },
    },
    pricingUnit: {
      type: String,
      enum: {
        values: ['per_booking', 'per_hour', 'per_player'],
        message: 'Pricing unit must be per_booking, per_hour, or per_player',
      },
      default: 'per_booking',
      required: true,
    },
    applicableSports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sport',
      },
    ],
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

export const AddOn = mongoose.models.AddOn || mongoose.model('AddOn', addOnSchema)
export default AddOn
