import { User } from '../models/User.js'
import mongoose from 'mongoose'
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
        accessToken,
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
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken
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
        accessToken,
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

/**
 * Update authenticated user profile (name, phone)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body
    const user = req.user

    if (name !== undefined) {
      const trimmed = name.trim()
      if (trimmed.length < 2 || trimmed.length > 60) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name must be between 2 and 60 characters.',
          },
        })
      }
      user.name = trimmed
    }

    if (phone !== undefined) {
      user.phone = phone.trim()
    }

    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Change authenticated user password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Both current password and new password are required.',
        },
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New password must be at least 6 characters.',
        },
      })
    }

    const userWithHash = await User.findById(req.user._id).select('+passwordHash')
    if (!userWithHash) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      })
    }

    const isMatch = await userWithHash.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Current password does not match.',
        },
      })
    }

    userWithHash.passwordHash = await User.hashPassword(newPassword)
    await userWithHash.save()

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Toggle favorite turf for authenticated user
 */
export const toggleFavorite = async (req, res, next) => {
  try {
    const { turfId } = req.params
    if (!turfId || !mongoose.Types.ObjectId.isValid(turfId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Valid turf ID is required.' },
      })
    }

    const user = req.user
    if (!Array.isArray(user.favorites)) {
      user.favorites = []
    }

    const stringFavorites = user.favorites.map((f) => f.toString())
    const index = stringFavorites.indexOf(turfId)
    let isFavorited = false

    if (index > -1) {
      user.favorites.splice(index, 1)
      isFavorited = false
    } else {
      user.favorites.push(turfId)
      isFavorited = true
    }

    await user.save()

    return res.status(200).json({
      success: true,
      message: isFavorited ? 'Turf added to favourites.' : 'Turf removed from favourites.',
      data: {
        isFavorited,
        favorites: user.favorites,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get populated list of favorite turfs for authenticated user
 */
export const getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favorites',
      match: { isActive: true },
      populate: { path: 'sports', select: 'name slug icon' },
    })

    return res.status(200).json({
      success: true,
      data: {
        favorites: user?.favorites || [],
      },
    })
  } catch (error) {
    next(error)
  }
}
