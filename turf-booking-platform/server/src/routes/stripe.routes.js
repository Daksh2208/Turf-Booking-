import { Router } from 'express'
import { requireAuth, requireCustomer } from '../middleware/auth.middleware.js'
import {
  getPublicConfig,
  createCheckoutSession,
  getPaymentStatus,
  cancelPendingBooking,
  handleWebhook,
} from '../controllers/stripe.controller.js'

const router = Router()

// Safe public Stripe configuration (enabled, publishableKey, currency)
router.get('/config', getPublicConfig)

// Customer authenticated: Create Checkout Session
router.post('/checkout-session', requireAuth, requireCustomer, createCheckoutSession)

// Authenticated (customer or admin): Verify and retrieve authoritative payment status
router.get('/status/:bookingId', requireAuth, getPaymentStatus)

// Customer authenticated: Cancel pending booking from checkout return
router.post('/cancel/:bookingId', requireAuth, requireCustomer, cancelPendingBooking)

// Webhook endpoint (can also be invoked directly when mounted with raw body)
router.post('/webhook', handleWebhook)

export default router
