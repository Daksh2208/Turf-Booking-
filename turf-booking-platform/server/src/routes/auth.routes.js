import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  changePassword,
  toggleFavorite,
  getFavorites,
} from '../controllers/auth.controller.js'
import { loginValidator, registerValidator } from '../validators/auth.validator.js'
import { validate } from '../middleware/validate.middleware.js'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js'
import { env } from '../config/env.js'

const router = Router()

// Rate limiter for authentication endpoints (disabled in test mode)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please wait 15 minutes before trying again.',
    },
  },
})

// Public Authentication Routes
router.post('/register', authLimiter, registerValidator, validate, register)
router.post('/login', authLimiter, loginValidator, validate, login)
router.post('/refresh', refresh)
router.post('/logout', logout)

// Protected User Routes
router.get('/me', requireAuth, getMe)
router.put('/profile', requireAuth, updateProfile)
router.put('/password', requireAuth, changePassword)
router.post('/favorites/toggle/:turfId', requireAuth, toggleFavorite)
router.get('/favorites', requireAuth, getFavorites)
router.get('/admin-check', requireAuth, requireAdmin, (req, res) => {
  res.status(200).json({ success: true, message: 'Admin access authorized', data: { role: req.user.role } })
})

export default router
