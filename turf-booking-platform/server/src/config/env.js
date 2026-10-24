import dotenv from 'dotenv'
import { z } from 'zod'

// Load .env variables
dotenv.config()

// Environment Schema definition
const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
})

// Safe environment parsing
const parseEnv = () => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Environment validation failed:')
    console.error(result.error.format())
    process.exit(1)
  }

  return result.data
}

export const env = parseEnv()
