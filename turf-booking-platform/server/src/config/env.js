import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Validates environment variables without external schema dependencies
 */
const validateEnv = () => {
  const errors = []

  // 1. Port validation
  const PORT = parseInt(process.env.PORT || '5000', 10)
  if (isNaN(PORT) || PORT <= 0) {
    errors.push('PORT must be a valid positive integer')
  }

  // 2. Node Environment validation
  const NODE_ENV = process.env.NODE_ENV || 'development'
  if (!['development', 'production', 'test'].includes(NODE_ENV)) {
    errors.push('NODE_ENV must be "development", "production", or "test"')
  }

  // 3. Client URL
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

  // 4. MongoDB URI validation
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI || typeof MONGODB_URI !== 'string' || MONGODB_URI.trim() === '') {
    errors.push('MONGODB_URI is required')
  } else if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
    errors.push('MONGODB_URI must start with "mongodb://" or "mongodb+srv://"')
  }

  if (errors.length > 0) {
    console.error('❌ Environment configuration error:')
    errors.forEach((err) => console.error(`  - ${err}`))
    process.exit(1)
  }

  return {
    PORT,
    NODE_ENV,
    CLIENT_URL,
    MONGODB_URI,
  }
}

export const env = validateEnv()
