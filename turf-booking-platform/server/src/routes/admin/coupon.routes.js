import { Router } from 'express'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import {
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
} from '../../controllers/admin/coupon.controller.js'

const router = Router()

// All admin coupon endpoints require authenticated admin role
router.use(requireAuth, requireAdmin)

router.get('/', listCoupons)
router.post('/', createCoupon)
router.get('/:id', getCouponById)
router.put('/:id', updateCoupon)
router.patch('/:id/status', toggleCouponStatus)
router.delete('/:id', deleteCoupon)

export default router
