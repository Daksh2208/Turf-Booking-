import { Router } from 'express'
import { requireAuth, requireCustomer } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import { bookingLimiter } from '../../middleware/rate-limit.middleware.js'
import { holdSlotsValidator } from '../../validators/booking.validator.js'
import {
  holdSlots,
  getCurrentReservation,
  releaseReservation,
  renewReservation,
} from '../../controllers/customer/reservation.controller.js'

const router = Router()

// All reservation endpoints require authenticated customer
router.post('/hold', bookingLimiter, requireAuth, requireCustomer, holdSlotsValidator, validate, holdSlots)
router.get('/current', requireAuth, requireCustomer, getCurrentReservation)
router.post('/release', requireAuth, requireCustomer, releaseReservation)
router.post('/renew', bookingLimiter, requireAuth, requireCustomer, renewReservation)

export default router
