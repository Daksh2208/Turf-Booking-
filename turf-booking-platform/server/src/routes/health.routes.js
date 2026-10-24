import { Router } from 'express'
import { getDBStatus } from '../config/db.js'

const router = Router()

/**
 * GET /api/v1/health
 * Returns API process status and actual live MongoDB connection state.
 */
router.get('/', async (req, res) => {
  const dbStatus = getDBStatus()
  const isHealthy = dbStatus.isConnected

  const responsePayload = {
    success: isHealthy,
    message: isHealthy
      ? 'Turf Booking Platform API and Database are operational'
      : 'Turf Booking Platform API is degraded — Database is disconnected',
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: {
        status: dbStatus.state,
        ...(dbStatus.isConnected && dbStatus.name && { databaseName: dbStatus.name }),
      },
    },
  }

  const statusCode = isHealthy ? 200 : 503
  return res.status(statusCode).json(responsePayload)
})

export default router
