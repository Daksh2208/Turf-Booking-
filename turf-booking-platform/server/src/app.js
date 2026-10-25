import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import adminInventoryRoutes from './routes/admin/inventory.routes.js'
import adminBookingRoutes from './routes/admin/booking.routes.js'
import adminCustomerRoutes from './routes/admin/customer.routes.js'
import adminCalendarRoutes from './routes/admin/calendar.routes.js'
import customerInventoryRoutes from './routes/customer/inventory.routes.js'
import customerBookingRoutes from './routes/customer/booking.routes.js'
import customerPricingRoutes from './routes/customer/pricing.routes.js'
import customerAvailabilityRoutes from './routes/customer/availability.routes.js'
import adminCouponRoutes from './routes/admin/coupon.routes.js'
import customerCouponRoutes from './routes/customer/coupon.routes.js'
import customerReservationRoutes from './routes/customer/reservation.routes.js'
import stripeRoutes from './routes/stripe.routes.js'
import { handleWebhook } from './controllers/stripe.controller.js'
import { notFoundMiddleware } from './middleware/not-found.middleware.js'
import { errorMiddleware } from './middleware/error.middleware.js'

const app = express()

// Trust reverse proxy (Render / Cloudflare / Heroku load balancers)
app.set('trust proxy', 1)

// 1. Security Headers
app.use(helmet())

// 2. Cross-Origin Resource Sharing (CORS) with credentials enabled
const rawClientUrls = (env.CLIENT_URL || '')
  .split(',')
  .map((u) => u.trim().replace(/\/$/, ''))
  .filter(Boolean)

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://turf-booking-fronend.onrender.com',
  'https://turf-booking-frontend.onrender.com',
  ...rawClientUrls,
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl, server-to-server)
      if (!origin) return callback(null, true)
      const cleanOrigin = origin.trim().replace(/\/$/, '')
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith('.onrender.com') ||
        cleanOrigin.endsWith('.vercel.app') ||
        cleanOrigin.endsWith('.netlify.app') ||
        cleanOrigin.endsWith('.pages.dev') ||
        cleanOrigin.includes('localhost') ||
        cleanOrigin.includes('127.0.0.1')
      ) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    credentials: true,
  })
)

// 3. HTTP Request Logging
app.use(
  pinoHttp({
    logger,
    autoLogging: env.NODE_ENV !== 'test',
  })
)

// Stripe Webhook Endpoint (Raw Body parser BEFORE express.json for cryptographic signature verification)
app.post(
  ['/api/v1/payments/stripe/webhook', '/api/payments/stripe/webhook'],
  express.raw({ type: 'application/json' }),
  handleWebhook
)

// 4. Request Body and Cookie Parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser(env.COOKIE_SECRET))

// 5. Application API Routes
app.use('/api/v1/health', healthRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/admin', adminInventoryRoutes)
app.use('/api/v1/admin', adminBookingRoutes)
app.use('/api/v1/admin', adminCustomerRoutes)
app.use('/api/v1/admin/calendar', adminCalendarRoutes)
app.use('/api/admin/calendar', adminCalendarRoutes)
app.use('/api/v1/admin/coupons', adminCouponRoutes)
app.use('/api/v1/coupons', customerCouponRoutes)
app.use('/api/v1/bookings', customerBookingRoutes)
app.use('/api/v1/pricing', customerPricingRoutes)
app.use('/api/v1/availability', customerAvailabilityRoutes)
app.use('/api/v1/reservations', customerReservationRoutes)
app.use('/api/reservations', customerReservationRoutes)
app.use('/api/v1/payments/stripe', stripeRoutes)
app.use('/api/payments/stripe', stripeRoutes)
app.use('/api/v1', customerInventoryRoutes)

// 6. 404 Route Not Found Middleware
app.use(notFoundMiddleware)

// 7. Centralized Error Handling Middleware
app.use(errorMiddleware)

export default app
