import app from './app.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Turf Booking Platform Server running on port ${env.PORT} in ${env.NODE_ENV} mode`)
  logger.info(`🩺 Health check accessible at http://localhost:${env.PORT}/api/v1/health`)
})

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled Rejection detected')
})

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception detected! Exiting process...')
  process.exit(1)
})

export default server
