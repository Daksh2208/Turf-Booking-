import { Router } from 'express'
import { requireAuth, requireCustomer } from '../../middleware/auth.middleware.js'
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

// Authenticated Customer Endpoints (Admin creation & listing blocked)
router.post('/', requireAuth, requireCustomer, createBooking)
router.get('/my', requireAuth, requireCustomer, getMyBookings)
router.get('/:id', requireAuth, getBookingDetail)
router.post('/:id/cancel', requireAuth, requireCustomer, cancelMyBooking)

export default router
