import { Router } from 'express'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import {
  getCustomerAnalytics,
  getCustomersList,
  getCustomerDetails,
  toggleCustomerStatus,
} from '../../controllers/admin/customer.controller.js'

const router = Router()

// All customer administration routes require authenticated admin
router.use(requireAuth, requireAdmin)

// Customer Analytics & Overview
router.get('/customers/analytics', getCustomerAnalytics)

// Customer Directory & Listing
router.get('/customers', getCustomersList)

// Individual Customer Detail & Bookings
router.get('/customers/:id', getCustomerDetails)

// Account Suspension / Activation
router.patch('/customers/:id/status', toggleCustomerStatus)

export default router
