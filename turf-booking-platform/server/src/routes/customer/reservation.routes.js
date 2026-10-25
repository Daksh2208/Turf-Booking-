import { Router } from 'express'
import { requireAuth, requireCustomer } from '../../middleware/auth.middleware.js'
import {
  holdSlots,
  getCurrentReservation,
  releaseReservation,
  renewReservation,
} from '../../controllers/customer/reservation.controller.js'

const router = Router()

// All reservation endpoints require authenticated customer
router.post('/hold', requireAuth, requireCustomer, holdSlots)
router.get('/current', requireAuth, requireCustomer, getCurrentReservation)
router.post('/release', requireAuth, requireCustomer, releaseReservation)
router.post('/renew', requireAuth, requireCustomer, renewReservation)

export default router
