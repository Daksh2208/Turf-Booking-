import { Router } from 'express'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import {
  getCalendarSummary,
  getDaySchedule,
  getWeekSchedule,
} from '../../controllers/admin/calendar.controller.js'

const router = Router()

// All routes require authenticated administrator
router.use(requireAuth, requireAdmin)

// Calendar Endpoints
router.get('/summary', getCalendarSummary)
router.get('/day', getDaySchedule)
router.get('/week', getWeekSchedule)

export default router
