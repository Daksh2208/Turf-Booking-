import pino from 'pino'

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  base: {
    env: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})
