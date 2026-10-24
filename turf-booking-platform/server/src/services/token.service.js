import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env.js'

/**
 * Parses time strings like "15m", "7d", "1h" into milliseconds
 */
export const parseDurationToMs = (durationStr) => {
  const match = durationStr.match(/^(\d+)([smhd])$/)
  if (!match) return 15 * 60 * 1000 // default 15 minutes

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's':
      return value * 1000
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'd':
      return value * 24 * 60 * 60 * 1000
    default:
      return 15 * 60 * 1000
  }
}

/**
 * Generates short-lived Access JWT token
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    }
  )
}

/**
 * Generates an opaque, cryptographically secure Refresh Token
 */
export const generateRefreshTokenString = () => {
  return crypto.randomBytes(40).toString('hex')
}

/**
 * Verifies and decodes an Access JWT token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  })
}

/**
 * Helper to compute cookie configurations
 */
export const getCookieOptions = (isRefreshToken = false) => {
  const isProduction = env.NODE_ENV === 'production'
  const durationStr = isRefreshToken
    ? env.JWT_REFRESH_EXPIRES_IN
    : env.JWT_ACCESS_EXPIRES_IN

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: parseDurationToMs(durationStr),
  }
}

/**
 * Sets access and refresh cookies on the response object
 */
export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, getCookieOptions(false))
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, getCookieOptions(true))
  }
}

/**
 * Clears authentication cookies upon logout or session revocation
 */
export const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', { path: '/' })
  res.clearCookie('refreshToken', { path: '/' })
}
