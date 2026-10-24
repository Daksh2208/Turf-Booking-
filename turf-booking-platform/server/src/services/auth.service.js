import crypto from 'crypto'
import { User } from '../models/User.js'
import { RefreshToken } from '../models/RefreshToken.js'
import {
  generateAccessToken,
  generateRefreshTokenString,
  parseDurationToMs,
} from './token.service.js'
import { env } from '../config/env.js'

/**
 * Registers a new customer account
 */
export const registerCustomer = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim()

  // 1. Check for existing account
  const existingUser = await User.findOne({ email: normalizedEmail })
  if (existingUser) {
    const error = new Error('An account with this email address already exists.')
    error.statusCode = 409
    error.code = 'EMAIL_ALREADY_EXISTS'
    throw error
  }

  // 2. Hash password
  const passwordHash = await User.hashPassword(password)

  // 3. Create customer account (role strictly customer)
  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'customer',
    isActive: true,
  })

  return newUser
}

/**
 * Authenticates user credentials and provisions access and refresh tokens
 */
export const loginUser = async ({ email, password, ip = '', userAgent = '' }) => {
  const normalizedEmail = email.toLowerCase().trim()

  // 1. Fetch user including passwordHash
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash')

  // 2. Generic error for non-existent user or invalid password (prevents email enumeration)
  if (!user) {
    const error = new Error('Invalid email or password.')
    error.statusCode = 401
    error.code = 'INVALID_CREDENTIALS'
    throw error
  }

  const isPasswordMatch = await user.comparePassword(password)
  if (!isPasswordMatch) {
    const error = new Error('Invalid email or password.')
    error.statusCode = 401
    error.code = 'INVALID_CREDENTIALS'
    throw error
  }

  // 3. Check active status
  if (!user.isActive) {
    const error = new Error('Your account has been deactivated. Please contact support.')
    error.statusCode = 403
    error.code = 'ACCOUNT_DEACTIVATED'
    throw error
  }

  // 4. Generate Tokens
  const accessToken = generateAccessToken(user)
  const rawRefreshToken = generateRefreshTokenString()
  const tokenHash = RefreshToken.hashToken(rawRefreshToken)
  const family = crypto.randomUUID()

  const refreshLifetimeMs = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN)
  const expiresAt = new Date(Date.now() + refreshLifetimeMs)

  // 5. Store hashed refresh token session
  await RefreshToken.create({
    user: user._id,
    tokenHash,
    family,
    expiresAt,
    createdByIp: ip,
    userAgent,
  })

  return {
    user,
    accessToken,
    refreshToken: rawRefreshToken,
  }
}

/**
 * Handles refresh token rotation and token reuse detection
 */
export const refreshSession = async ({ rawRefreshToken, ip = '', userAgent = '' }) => {
  if (!rawRefreshToken) {
    const error = new Error('Refresh token is required.')
    error.statusCode = 401
    error.code = 'REFRESH_TOKEN_REQUIRED'
    throw error
  }

  const tokenHash = RefreshToken.hashToken(rawRefreshToken)

  // 1. Find the refresh token record
  const tokenRecord = await RefreshToken.findOne({ tokenHash })

  if (!tokenRecord) {
    const error = new Error('Invalid or expired refresh token session.')
    error.statusCode = 401
    error.code = 'INVALID_REFRESH_TOKEN'
    throw error
  }

  // 2. REUSE DETECTION: If an already revoked token is submitted, invalidate the entire family!
  if (tokenRecord.isRevoked) {
    await RefreshToken.updateMany(
      { family: tokenRecord.family },
      { isRevoked: true }
    )

    const error = new Error(
      'Security alert: Revoked refresh token reuse detected. All sessions invalidated.'
    )
    error.statusCode = 401
    error.code = 'TOKEN_REUSE_DETECTED'
    throw error
  }

  // 3. Check expiration
  if (tokenRecord.expiresAt < new Date()) {
    const error = new Error('Refresh token has expired. Please sign in again.')
    error.statusCode = 401
    error.code = 'REFRESH_TOKEN_EXPIRED'
    throw error
  }

  // 4. Verify user is still active
  const user = await User.findById(tokenRecord.user)
  if (!user || !user.isActive) {
    const error = new Error('User account is inactive or not found.')
    error.statusCode = 401
    error.code = 'USER_INACTIVE'
    throw error
  }

  // 5. ROTATE TOKEN: Invalidate old token and create a new one in the same family
  const newRawRefreshToken = generateRefreshTokenString()
  const newTokenHash = RefreshToken.hashToken(newRawRefreshToken)

  tokenRecord.isRevoked = true
  tokenRecord.replacedByTokenHash = newTokenHash
  await tokenRecord.save()

  const refreshLifetimeMs = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN)
  const expiresAt = new Date(Date.now() + refreshLifetimeMs)

  await RefreshToken.create({
    user: user._id,
    tokenHash: newTokenHash,
    family: tokenRecord.family,
    expiresAt,
    createdByIp: ip,
    userAgent,
  })

  // 6. Generate new access token
  const newAccessToken = generateAccessToken(user)

  return {
    user,
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
  }
}

/**
 * Revokes refresh token session upon logout
 */
export const logoutUser = async (rawRefreshToken) => {
  if (rawRefreshToken) {
    const tokenHash = RefreshToken.hashToken(rawRefreshToken)
    await RefreshToken.updateOne({ tokenHash }, { isRevoked: true })
  }
}
