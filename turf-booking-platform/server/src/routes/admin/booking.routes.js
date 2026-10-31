import { Router } from 'express'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import { recordPaymentValidator, cancelBookingValidator } from '../../validators/booking.validator.js'
import {
  getDashboardMetrics,
  getAdminBookings,
  getBookingDetails,
  updateBookingStatus,
  recordPayment,
  cancelBooking,
  retryRefund,
  getAdminCancellationPreview,
  createBlockedSlot,
  getAdminBlockedSlots,
  updateBlockedSlot,
  deleteBlockedSlot,
} from '../../controllers/admin/booking.controller.js'

const router = Router()

// All routes here strictly require an authenticated administrator
router.use(requireAuth, requireAdmin)

// Dashboard Metrics
router.get('/dashboard', getDashboardMetrics)

// Bookings
router.get('/bookings', getAdminBookings)
router.get('/bookings/:id/cancellation-preview', getAdminCancellationPreview)
router.get('/bookings/:id', getBookingDetails)
router.patch('/bookings/:id/status', updateBookingStatus)
router.post('/bookings/:id/payment', recordPaymentValidator, validate, recordPayment)
router.patch('/bookings/:id/payment', recordPaymentValidator, validate, recordPayment)
router.post('/bookings/:id/cancel', cancelBookingValidator, validate, cancelBooking)
router.post('/bookings/:id/refund/retry', retryRefund)

// Blocked Slots (maintenance & tournament)
router.get('/blocked-slots', getAdminBlockedSlots)
router.post('/blocked-slots', createBlockedSlot)
router.put('/blocked-slots/:id', updateBlockedSlot)
router.delete('/blocked-slots/:id', deleteBlockedSlot)

export default router
