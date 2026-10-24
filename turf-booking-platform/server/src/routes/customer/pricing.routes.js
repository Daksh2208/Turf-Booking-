import { Router } from 'express'
import { getPricingQuote } from '../../controllers/customer/booking.controller.js'

const router = Router()

// Public pricing quote calculation endpoint
router.post('/quote', getPricingQuote)

export default router
