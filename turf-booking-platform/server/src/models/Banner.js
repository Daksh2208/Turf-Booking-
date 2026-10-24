import mongoose from 'mongoose'

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    subtitle: {
      type: String,
      trim: true,
      default: '',
      maxlength: [250, 'Subtitle cannot exceed 250 characters'],
    },
    image: {
      type: String,
      required: [true, 'Banner image URL is required'],
      trim: true,
    },
    link: {
      type: String,
      trim: true,
      default: '',
    },
    ctaText: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'CTA text cannot exceed 50 characters'],
    },
    order: {
      type: Number,
      default: 0,
      index: true,
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

export const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema)
export default Banner
