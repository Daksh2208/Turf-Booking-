import { Router } from 'express'
import { getAvailability } from '../../controllers/customer/availability.controller.js'
import { optionalAuth } from '../../middleware/auth.middleware.js'

const router = Router()

// Public Availability API: GET /api/v1/availability?turfId=...&date=YYYY-MM-DD
router.get('/', optionalAuth, getAvailability)

export default router
