import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from './logger.js'

let isConnecting = false

/**
 * Maps Mongoose readyState numbers to human-readable status strings.
 */
const CONNECTION_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
}

/**
 * Returns the current database connection state and metadata without exposing credentials.
 */
export const getDBStatus = () => {
  const readyState = mongoose.connection.readyState
  const stateString = CONNECTION_STATES[readyState] || 'unknown'

  return {
    isConnected: readyState === 1,
    state: stateString,
    name: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
  }
}

/**
 * Establishes a singleton Mongoose connection to MongoDB.
 */
export const connectDB = async () => {
  // Prevent duplicate connections if already connected
  if (mongoose.connection.readyState === 1) {
    logger.info('Using existing MongoDB connection.')
    return mongoose.connection
  }

  // Prevent concurrent connection attempts
  if (isConnecting) {
    logger.warn('MongoDB connection attempt already in progress...')
    return
  }

  try {
    isConnecting = true

    // Configure connection events
    mongoose.connection.on('connected', () => {
      logger.info(
        { host: mongoose.connection.host, database: mongoose.connection.name },
        '✅ MongoDB connection established successfully'
      )
    })

    mongoose.connection.on('error', (err) => {
      logger.error({ message: err.message }, '❌ MongoDB connection error')
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB connection lost. Disconnected.')
    })

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected successfully.')
    })

    // Connect using validated MONGODB_URI
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: env.NODE_ENV !== 'production',
    })

    isConnecting = false
    return conn
  } catch (error) {
    isConnecting = false
    // Log safe error message without exposing connection credentials
    logger.fatal(
      { message: error.message },
      '❌ Initial MongoDB connection failed'
    )
    throw error
  }
}

/**
 * Gracefully disconnects from MongoDB.
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect()
      logger.info('MongoDB disconnected cleanly.')
    } catch (error) {
      logger.error({ message: error.message }, 'Error disconnecting MongoDB')
    }
  }
}
