import { verifyAccessToken } from '../services/token.service.js'
import { User } from '../models/User.js'

/**
 * Middleware that extracts and verifies the Access JWT from cookies or Authorization header.
 * Attaches the authenticated user to `req.user`.
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken

    // Allow Authorization: Bearer <token> fallback for API tools / headers
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. No access token provided.',
        },
      })
    }

    // Verify JWT signature, expiration, and algorithm
    let decoded
    try {
      decoded = verifyAccessToken(token)
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message:
            jwtErr.name === 'TokenExpiredError'
              ? 'Access token has expired. Please refresh your session.'
              : 'Invalid authentication token.',
        },
      })
    }

    // Verify user exists and is active in database
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The user belonging to this token no longer exists.',
        },
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'This account has been deactivated. Please contact support.',
        },
      })
    }

    // Attach authenticated user to request
    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Middleware factory for Role-Based Access Control (RBAC).
 * Example: `requireRole('admin')`
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before checking permissions.',
        },
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: Access requires ${roles.join(' or ')} privileges.`,
        },
      })
    }

    next()
  }
}

/**
 * Convenience middleware for admin-only routes
 */
export const requireAdmin = requireRole('admin')
