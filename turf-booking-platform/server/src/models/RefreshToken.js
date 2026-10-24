import mongoose from 'mongoose'
import crypto from 'crypto'

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    family: {
      type: String,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: MongoDB automatically cleans up expired tokens
    },
    createdByIp: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

/**
 * Static utility to generate a SHA-256 hash of a raw token string
 */
refreshTokenSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

export const RefreshToken =
  mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema)
export default RefreshToken
