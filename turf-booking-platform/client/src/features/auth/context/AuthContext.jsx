import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import authService from '../../../services/auth.service'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verify and load current session on initial render
  const loadUser = useCallback(async () => {
    try {
      const data = await authService.getMe()
      if (data?.data?.user) {
        setUser(data.data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()

    // Listen for session expiration events dispatched by axios interceptor
    const handleSessionExpired = () => {
      setUser(null)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:session-expired', handleSessionExpired)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:session-expired', handleSessionExpired)
      }
    }
  }, [loadUser])

  // Login handler
  const login = async (email, password) => {
    const data = await authService.login({ email, password })
    const loggedInUser = data?.data?.user || null
    setUser(loggedInUser)
    return loggedInUser
  }

  // Register handler (creates customer account)
  const register = async ({ name, email, password }) => {
    const data = await authService.register({ name, email, password })
    return data?.data?.user || null
  }

  // Logout handler
  const logout = async () => {
    try {
      await authService.logout()
    } catch {
      // Even if network/server fails, clear local user state
    } finally {
      setUser(null)
    }
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    refreshUser: loadUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
