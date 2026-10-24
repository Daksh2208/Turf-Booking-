import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import healthRoutes from './routes/health.routes.js'
import { notFoundMiddleware } from './middleware/not-found.middleware.js'
import { errorMiddleware } from './middleware/error.middleware.js'

const app = express()

// 1. Security Headers
app.use(helmet())

// 2. Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: env.CLIENT_URL,
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

// 4. Request Body Parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 5. Application API Routes
app.use('/api/v1/health', healthRoutes)

// 6. 404 Route Not Found Middleware
app.use(notFoundMiddleware)

// 7. Centralized Error Handling Middleware
app.use(errorMiddleware)

export default app
