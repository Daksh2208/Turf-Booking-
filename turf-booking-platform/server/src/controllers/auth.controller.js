import {
  registerCustomer,
  loginUser,
  refreshSession,
  logoutUser,
} from '../services/auth.service.js'
import { setAuthCookies, clearAuthCookies } from '../services/token.service.js'

/**
 * Handle customer account registration
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    const user = await registerCustomer({ name, email, password })

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. You can now sign in.',
      data: {
        user,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Handle user login (sets HttpOnly cookies)
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const ip = req.ip || req.socket?.remoteAddress || ''
    const userAgent = req.headers['user-agent'] || ''

    const { user, accessToken, refreshToken } = await loginUser({
      email,
      password,
      ip,
      userAgent,
    })

    // Set secure HttpOnly cookies
    setAuthCookies(res, accessToken, refreshToken)

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      data: {
        user,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Handle refresh token rotation
 */
export const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken
    const ip = req.ip || req.socket?.remoteAddress || ''
    const userAgent = req.headers['user-agent'] || ''

    const { user, accessToken, refreshToken } = await refreshSession({
      rawRefreshToken,
      ip,
      userAgent,
    })

    // Set updated HttpOnly cookies
    setAuthCookies(res, accessToken, refreshToken)

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        user,
      },
    })
  } catch (error) {
    // If refresh token fails or reuse is detected, clear cookies
    clearAuthCookies(res)
    next(error)
  }
}

/**
 * Handle user logout
 */
export const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken

    await logoutUser(rawRefreshToken)
    clearAuthCookies(res)

    return res.status(200).json({
      success: true,
      message: 'Signed out successfully.',
    })
  } catch (error) {
    clearAuthCookies(res)
    next(error)
  }
}

/**
 * Get current authenticated user profile
 */
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    })
  } catch (error) {
    next(error)
  }
}
