import { Router } from 'express'
import { requireAuth, requireCustomer, optionalAuth } from '../middleware/auth.middleware.js'
import { paymentLimiter } from '../middleware/rate-limit.middleware.js'
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
router.post('/checkout-session', paymentLimiter, requireAuth, requireCustomer, createCheckoutSession)
router.post('/create-checkout-session', paymentLimiter, requireAuth, requireCustomer, createCheckoutSession)

// Authenticated (customer or admin) or checkout session-id verified: Retrieve authoritative status
router.get('/status/:bookingId', optionalAuth, getPaymentStatus)

// Cancel pending booking from checkout return (handles both authenticated user and session validation)
router.post('/cancel/:bookingId', optionalAuth, cancelPendingBooking)

// Webhook endpoint (can also be invoked directly when mounted with raw body)
router.post('/webhook', handleWebhook)

export default router
