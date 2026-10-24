import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables
dotenv.config()

// Zod Schema with MongoDB URI validation
const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z
    .string({ required_error: 'MONGODB_URI environment variable is required' })
    .min(1, 'MONGODB_URI cannot be empty')
    .refine(
      (uri) => uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'),
      {
        message: 'MONGODB_URI must start with "mongodb://" or "mongodb+srv://"',
      }
    ),
})

// Safe parsing without credential exposure
const parseEnv = () => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Environment validation failed:')
    // Format error safely without leaking process.env secrets
    const formattedErrors = result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }))
    console.error(formattedErrors)
    process.exit(1)
  }

  return result.data
}

export const env = parseEnv()
