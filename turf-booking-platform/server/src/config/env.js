import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/turf_booking_db'),
  SESSION_SECRET: z.string().default('default_session_secret_for_dev_mode_only'),
})

const parseEnv = () => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables configuration:')
    console.error(result.error.format())
    process.exit(1)
  }

  return result.data
}

export const env = parseEnv()
