import { Router } from 'express'
import { requireAuth, requireCustomer, optionalAuth } from '../../middleware/auth.middleware.js'
import { couponLimiter } from '../../middleware/rate-limit.middleware.js'
import {
  validateCoupon,
  getAvailableCoupons,
} from '../../controllers/customer/coupon.controller.js'

const router = Router()

// Customer Coupon Discovery & Validation
router.get('/available', optionalAuth, getAvailableCoupons)
router.post('/validate', couponLimiter, requireAuth, requireCustomer, validateCoupon)

export default router
