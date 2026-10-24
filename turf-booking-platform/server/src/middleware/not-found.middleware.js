/**
 * 404 Route Not Found Middleware
 * Intercepts requests to undefined paths and returns consistent JSON.
 */
export const notFoundMiddleware = async (req, res, next) => {
  return res.status(404).json({
    success: false,
    error: {
      message: `Resource not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  })
}
