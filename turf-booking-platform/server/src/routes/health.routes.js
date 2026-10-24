import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Turf Booking Platform API is operational',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    },
  })
})

export default router
