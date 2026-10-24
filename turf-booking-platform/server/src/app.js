import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env.js'
import healthRoutes from './routes/health.routes.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

// Security headers
app.use(helmet())

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
)

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Primary Health Check Route
app.use('/api/v1/health', healthRoutes)

// Placeholders for future Customer and Admin route groups
// app.use('/api/v1/customer', customerRoutes)
// app.use('/api/v1/admin', adminRoutes)

// Fallback 404 handler
app.use(notFound)

// Centralized error handler
app.use(errorHandler)

export default app
