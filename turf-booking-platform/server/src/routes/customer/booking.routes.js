import { Router } from 'express'
import { requireAuth, requireCustomer } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import { bookingLimiter } from '../../middleware/rate-limit.middleware.js'
import {
  createBookingValidator,
  getSlotsValidator,
  cancelBookingValidator,
} from '../../validators/booking.validator.js'
import {
  getTurfSlots,
  getPricingQuote,
  createBooking,
  getMyBookings,
  getBookingDetail,
  cancelMyBooking,
  getCancellationPreview,
} from '../../controllers/customer/booking.controller.js'

const router = Router()

// Public: View real-time slots and live dynamic pricing for a turf
router.get('/slots', getSlotsValidator, validate, getTurfSlots)

// Public: Generate detailed price quote and segment breakdown
router.post('/quote', getPricingQuote)

// Authenticated Customer Endpoints (Admin creation & listing blocked)
router.post(
  '/',
  bookingLimiter,
  requireAuth,
  requireCustomer,
  createBookingValidator,
  validate,
  createBooking
)
router.get('/my', requireAuth, requireCustomer, getMyBookings)
router.get('/:id/cancellation-preview', requireAuth, getCancellationPreview)
router.get('/:id', requireAuth, getBookingDetail)
router.post(
  '/:id/cancel',
  requireAuth,
  requireCustomer,
  cancelBookingValidator,
  validate,
  cancelMyBooking
)

export default router
