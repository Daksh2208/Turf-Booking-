import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE', 'DELETE'],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ['Sport', 'Turf', 'AddOn', 'Banner', 'BusinessSettings'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema)
export default AuditLog
