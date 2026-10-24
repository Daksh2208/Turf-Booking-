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
import customerInventoryRoutes from './routes/customer/inventory.routes.js'
import customerBookingRoutes from './routes/customer/booking.routes.js'
import customerPricingRoutes from './routes/customer/pricing.routes.js'
import customerAvailabilityRoutes from './routes/customer/availability.routes.js'
import { notFoundMiddleware } from './middleware/not-found.middleware.js'
import { errorMiddleware } from './middleware/error.middleware.js'

const app = express()

// 1. Security Headers
app.use(helmet())

// 2. Cross-Origin Resource Sharing (CORS) with credentials enabled
const allowedOrigins = [
  "http://localhost:5173",
  "https://turf-booking-fronend.onrender.com",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// 3. HTTP Request Logging
app.use(
  pinoHttp({
    logger,
    autoLogging: env.NODE_ENV !== 'test',
  })
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
app.use('/api/v1/bookings', customerBookingRoutes)
app.use('/api/v1/pricing', customerPricingRoutes)
app.use('/api/v1/availability', customerAvailabilityRoutes)
app.use('/api/v1', customerInventoryRoutes)

// 6. 404 Route Not Found Middleware
app.use(notFoundMiddleware)

// 7. Centralized Error Handling Middleware
app.use(errorMiddleware)

export default app
