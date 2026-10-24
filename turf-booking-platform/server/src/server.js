import app from './app.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'

let server

// Start Express HTTP Server
const startServer = async () => {
  try {
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} in [${env.NODE_ENV}] mode`)
      logger.info(`🩺 Health check URL: http://localhost:${env.PORT}/api/v1/health`)
    })
  } catch (error) {
    logger.fatal({ error }, '❌ Server failed to start')
    process.exit(1)
  }
}

// Graceful Shutdown Handler
const handleShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down server...`)

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed cleanly.')
      process.exit(0)
    })
  } else {
    process.exit(0)
  }
}

// Process signal listeners for clean shutdown (e.g., Ctrl+C)
process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))

// Global exception safeguards
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Rejection detected')
})

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception detected')
  process.exit(1)
})

// Boot server
startServer()

export default server
