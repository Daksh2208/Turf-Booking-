import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import {
  getTurfSlots,
  getPricingQuote,
  createBooking,
  getMyBookings,
  getBookingDetail,
  cancelMyBooking,
} from '../../controllers/customer/booking.controller.js'

const router = Router()

// Public: View real-time slots and live dynamic pricing for a turf
router.get('/slots', getTurfSlots)

// Public: Generate detailed price quote and segment breakdown
router.post('/quote', getPricingQuote)

// Authenticated Customer Endpoints
router.post('/', requireAuth, createBooking)
router.get('/my', requireAuth, getMyBookings)
router.get('/:id', requireAuth, getBookingDetail)
router.post('/:id/cancel', requireAuth, cancelMyBooking)

export default router
