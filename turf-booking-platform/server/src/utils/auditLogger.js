import { AuditLog } from '../models/AuditLog.js'
import { logger } from '../config/logger.js'

/**
 * Records an administrative inventory change in the AuditLog collection
 */
export const logAudit = async ({ actorId, action, entityType, entityId, details = {}, ip = '' }) => {
  try {
    // Sanitize any sensitive keys
    const sanitizedDetails = { ...details }
    delete sanitizedDetails.password
    delete sanitizedDetails.passwordHash
    delete sanitizedDetails.secret
    delete sanitizedDetails.token

    await AuditLog.create({
      actor: actorId,
      action,
      entityType,
      entityId,
      details: sanitizedDetails,
      ip,
    })
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to record administrative audit log')
  }
}

export default logAudit
