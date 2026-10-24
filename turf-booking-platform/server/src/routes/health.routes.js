import { Router } from 'express'

const router = Router()

/**
 * GET /api/v1/health
 * Checks if the API process is alive and responsive.
 */
router.get('/', async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Turf Booking Platform API is operational',
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  })
})

export default router
