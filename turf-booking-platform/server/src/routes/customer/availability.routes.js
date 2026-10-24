import { Router } from 'express'
import { getAvailability } from '../../controllers/customer/availability.controller.js'

const router = Router()

// Public Availability API: GET /api/v1/availability?turfId=...&date=YYYY-MM-DD
router.get('/', getAvailability)

export default router
