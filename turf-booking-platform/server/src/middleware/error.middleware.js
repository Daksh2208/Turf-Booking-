import { logger } from '../config/logger.js'
import { env } from '../config/env.js'

/**
 * Centralized Application Error Handling Middleware
 * Handles malformed JSON, system exceptions, and protects production stacks.
 */
export const errorMiddleware = (err, req, res, next) => {
  // 1. Intercept malformed JSON body errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Malformed JSON payload in request body',
        code: 'INVALID_JSON',
      },
    })
  }

  // 2. Determine appropriate status code & environment mode
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500
  const isProduction = env.NODE_ENV === 'production'
  const isServerError = statusCode >= 500

  // 3. Log error internally
  if (isServerError || !isProduction) {
    logger.error({
      err: {
        message: err.message,
        stack: err.stack,
        code: err.code,
      },
      method: req.method,
      url: req.originalUrl,
      statusCode,
    })
  }

  // 4. Send sanitized error response
  const message = isServerError && isProduction
    ? 'An unexpected internal server error occurred'
    : err.message || 'Internal Server Error'

  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: err.code || (isServerError ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
      ...(!isProduction && err.stack ? { stack: err.stack } : {}),
    },
  })
}
