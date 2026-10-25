import http from 'http'
import app from './app.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { connectDB, disconnectDB } from './config/db.js'
import { initSocket } from './socket.js'

let server
let httpServer

// Initialize Database connection and start HTTP Server
const startServer = async () => {
  try {
    // 1. Connect to MongoDB first
    logger.info('Connecting to MongoDB...')
    await connectDB()

    // 2. Wrap express app in Node HTTP server and initialize Socket.IO
    httpServer = http.createServer(app)
    initSocket(httpServer)

    server = httpServer.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} in [${env.NODE_ENV}] mode`)
      logger.info(`🩺 Health check URL: http://localhost:${env.PORT}/api/v1/health`)
    })
  } catch (error) {
    logger.fatal(
      { message: error.message },
      '❌ Fatal: Server startup aborted due to database connection failure'
    )
    process.exit(1)
  }
}

// Graceful Shutdown Handler
const handleShutdown = async (signal) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`)

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.')
      // Disconnect Mongoose cleanly
      await disconnectDB()
      logger.info('Shutdown complete. Exiting process.')
      process.exit(0)
    })

    // Force close if graceful shutdown hangs beyond 10 seconds
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing process exit.')
      process.exit(1)
    }, 10000).unref()
  } else {
    await disconnectDB()
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
  logger.fatal({ error: error.message }, 'Uncaught Exception detected')
  process.exit(1)
})

// Boot application
startServer()

export default server
