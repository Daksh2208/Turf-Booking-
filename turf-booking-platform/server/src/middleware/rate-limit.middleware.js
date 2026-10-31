import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

const isTest = env.NODE_ENV === 'test'

/**
 * Sensitive Auth Rate Limiter (login, register)
 * 25 attempts per 15 minutes window
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
    },
  },
})

/**
 * Booking Creation & Slot Reservation Limiter
 * 60 requests per 10 minutes window
 */
export const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isTest ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many booking attempts in a short period. Please try again shortly.',
    },
  },
})

/**
 * Payment & Stripe Checkout Session Creation Limiter
 * 30 requests per 10 minutes window
 */
export const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isTest ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Payment initiation rate limit exceeded. Please wait a few minutes before trying again.',
    },
  },
})

/**
 * Coupon Validation Limiter
 * Protects against coupon brute-force / dictionary attacks
 * 30 attempts per 10 minutes window
 */
export const couponLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isTest ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Coupon validation rate limit exceeded. Please wait before trying another code.',
    },
  },
})

/**
 * General Public API Rate Limiter
 * 600 requests per 15 minutes window
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down and try again later.',
    },
  },
})

