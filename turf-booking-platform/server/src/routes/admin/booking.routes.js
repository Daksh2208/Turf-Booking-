import { Router } from 'express'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import {
  getDashboardMetrics,
  getAdminBookings,
  getBookingDetails,
  updateBookingStatus,
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
router.get('/bookings/:id', getBookingDetails)
router.patch('/bookings/:id/status', updateBookingStatus)

// Blocked Slots (maintenance & tournament)
router.get('/blocked-slots', getAdminBlockedSlots)
router.post('/blocked-slots', createBlockedSlot)
router.put('/blocked-slots/:id', updateBlockedSlot)
router.delete('/blocked-slots/:id', deleteBlockedSlot)

export default router
