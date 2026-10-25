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

  // 5. JWT Secrets validation
  const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default_dev_jwt_access_secret_key_12345'
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_dev_jwt_refresh_secret_key_12345'
  if (NODE_ENV === 'production') {
    if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
      errors.push('In production, JWT_ACCESS_SECRET must be set and at least 32 characters long')
    }
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
      errors.push('In production, JWT_REFRESH_SECRET must be set and at least 32 characters long')
    }
  }

  const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m'
  const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  const COOKIE_SECRET = process.env.COOKIE_SECRET || 'dev_cookie_secret_key_999'

  // 6. Stripe Payment Configuration (Disabled by default, safe defaults)
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
  const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || ''
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''
  const STRIPE_CURRENCY = (process.env.STRIPE_CURRENCY || 'inr').toLowerCase()
  const STRIPE_PAYMENT_ENABLED = process.env.STRIPE_PAYMENT_ENABLED === 'true'

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
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN,
    COOKIE_SECRET,
    STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET,
    STRIPE_CURRENCY,
    STRIPE_PAYMENT_ENABLED,
  }
}

export const env = validateEnv()
