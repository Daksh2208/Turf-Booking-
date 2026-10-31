import { describe, it, expect, vi, beforeEach } from 'vitest'
import { errorMiddleware } from '../src/middleware/error.middleware.js'
import { requireAuth, requireRole, requireAdmin, requireCustomer } from '../src/middleware/auth.middleware.js'
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshTokenString,
  parseDurationToMs,
} from '../src/services/token.service.js'
import {
  authLimiter,
  bookingLimiter,
  paymentLimiter,
  couponLimiter,
} from '../src/middleware/rate-limit.middleware.js'
import { User } from '../src/models/User.js'

describe('PHASE 5: Security, Error Handling & RBAC Audit Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // 1. Error Handling Middleware Suite
  describe('Centralized Error Handling Middleware', () => {
    it('catches SyntaxError for malformed JSON and returns 400 with INVALID_JSON code', () => {
      const err = new SyntaxError('Unexpected token in JSON')
      err.status = 400
      err.body = '{ bad: json '

      const req = { method: 'POST', originalUrl: '/api/v1/bookings' }
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      }
      const next = vi.fn()

      errorMiddleware(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Malformed JSON payload in request body',
          code: 'INVALID_JSON',
        },
      })
    })

    it('catches Mongoose CastError and returns 400 with INVALID_ID_FORMAT code', () => {
      const err = new Error('Cast to ObjectId failed')
      err.name = 'CastError'
      err.path = '_id'
      err.value = 'invalid-mongo-id'

      const req = { method: 'GET', originalUrl: '/api/v1/admin/turfs/invalid-mongo-id' }
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      }
      const next = vi.fn()

      errorMiddleware(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: "Invalid format for field '_id': received 'invalid-mongo-id'",
          code: 'INVALID_ID_FORMAT',
        },
      })
    })

    it('catches Mongoose ValidationError and returns 400 with VALIDATION_ERROR code', () => {
      const err = new Error('Validation failed')
      err.name = 'ValidationError'
      err.errors = {
        email: { message: 'Please provide a valid email' },
        name: { message: 'Name is required' },
      }

      const req = { method: 'POST', originalUrl: '/api/v1/auth/register' }
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      }
      const next = vi.fn()

      errorMiddleware(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: expect.arrayContaining([
              'Please provide a valid email',
              'Name is required',
            ]),
          }),
        })
      )
    })

    it('catches MongoServerError 11000 duplicate key and returns 409 DUPLICATE_KEY_ERROR', () => {
      const err = new Error('E11000 duplicate key error')
      err.code = 11000
      err.keyValue = { email: 'player@example.com' }

      const req = { method: 'POST', originalUrl: '/api/v1/auth/register' }
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      }
      const next = vi.fn()

      errorMiddleware(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'A record with this email already exists.',
          code: 'DUPLICATE_KEY_ERROR',
        },
      })
    })
  })

  // 2. Role-Based Access Control (RBAC) Verification Suite
  describe('Authentication & RBAC Middleware', () => {
    it('requireAuth rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const req = { cookies: {}, headers: {} }
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      }
      const next = vi.fn()

      await requireAuth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
        })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('requireAdmin blocks non-admin authenticated users with 403 FORBIDDEN', () => {
      const req = { user: { role: 'customer' } }
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      }
      const next = vi.fn()

      requireAdmin(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'FORBIDDEN' }),
        })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('requireCustomer strictly blocks administrators from customer booking endpoints', () => {
      const req = { user: { role: 'admin' } }
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      }
      const next = vi.fn()

      requireCustomer(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'ADMIN_BOOKING_FORBIDDEN' }),
        })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('requireCustomer permits verified customer users', () => {
      const req = { user: { role: 'customer', _id: 'cust-123' } }
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      }
      const next = vi.fn()

      requireCustomer(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  // 3. Token Architecture Verification
  describe('Cryptographic Tokens & Security Services', () => {
    it('generates, signs, and verifies a valid JWT Access Token', () => {
      const testUser = {
        _id: '507f1f77bcf86cd799439011',
        role: 'customer',
        email: 'captain@turf.com',
      }

      const token = generateAccessToken(testUser)
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // Valid header.payload.signature

      const decoded = verifyAccessToken(token)
      expect(decoded.userId).toBe(testUser._id)
      expect(decoded.role).toBe('customer')
      expect(decoded.email).toBe('captain@turf.com')
    })

    it('generates an opaque, cryptographically random refresh token string', () => {
      const token1 = generateRefreshTokenString()
      const token2 = generateRefreshTokenString()

      expect(typeof token1).toBe('string')
      expect(token1.length).toBe(80) // 40 bytes hex encoded
      expect(token1).not.toBe(token2)
    })

    it('parses duration strings accurately into milliseconds', () => {
      expect(parseDurationToMs('15m')).toBe(15 * 60 * 1000)
      expect(parseDurationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000)
      expect(parseDurationToMs('1h')).toBe(60 * 60 * 1000)
      expect(parseDurationToMs('30s')).toBe(30 * 1000)
    })
  })

  // 4. Rate Limiter Security Suite
  describe('Rate Limiter Configurations', () => {
    it('exports all designated rate limiters for sensitive actions', () => {
      expect(authLimiter).toBeDefined()
      expect(bookingLimiter).toBeDefined()
      expect(paymentLimiter).toBeDefined()
      expect(couponLimiter).toBeDefined()
    })
  })
})

