import mongoose from 'mongoose'

const sportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sport name is required'],
      trim: true,
      minlength: [2, 'Sport name must be at least 2 characters'],
      maxlength: [50, 'Sport name cannot exceed 50 characters'],
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
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String,
      trim: true,
      default: '',
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

export const Sport = mongoose.models.Sport || mongoose.model('Sport', sportSchema)
export default Sport
