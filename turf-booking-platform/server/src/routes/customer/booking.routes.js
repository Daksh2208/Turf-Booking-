import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import {
  getTurfSlots,
  getPricingQuote,
  createBooking,
  getMyBookings,
} from '../../controllers/customer/booking.controller.js'

const router = Router()

// Public: View real-time slots and live dynamic pricing for a turf
router.get('/slots', getTurfSlots)

// Public: Generate detailed price quote and segment breakdown
router.post('/quote', getPricingQuote)

// Authenticated: Create booking & view user's bookings
router.post('/', requireAuth, createBooking)
router.get('/my', requireAuth, getMyBookings)

export default router
