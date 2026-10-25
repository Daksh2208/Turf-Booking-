import { Router } from 'express'
import { requireAuth, requireCustomer } from '../../middleware/auth.middleware.js'
import {
  validateCoupon,
  getAvailableCoupons,
} from '../../controllers/customer/coupon.controller.js'

const router = Router()

// Customer Coupon Discovery & Validation (Authentication required, Admins blocked from customer checkout)
router.get('/available', requireAuth, requireCustomer, getAvailableCoupons)
router.post('/validate', requireAuth, requireCustomer, validateCoupon)

export default router
