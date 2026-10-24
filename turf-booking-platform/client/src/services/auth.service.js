import apiClient from '../lib/axios'

export const authService = {
  /**
   * Register a new customer
   * @param {{ name: string, email: string, password: string }} data
   */
  async register(data) {
    const response = await apiClient.post('/auth/register', data)
    return response.data
  },

  /**
   * Login with email and password
   * @param {{ email: string, password: string }} credentials
   */
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials)
    if (response.data?.data?.accessToken && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', response.data.data.accessToken)
    }
    return response.data
  },

  /**
   * Fetch current authenticated user's profile
   */
  async getMe() {
    const response = await apiClient.get('/auth/me')
    return response.data
  },

  /**
   * Log out user and revoke refresh session
   */
  async logout() {
    try {
      const response = await apiClient.post('/auth/logout')
      return response.data
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
      }
    }
  },

  /**
   * Verify admin role privilege with backend
   */
  async checkAdmin() {
    const response = await apiClient.get('/auth/admin-check')
    return response.data
  },

  /**
   * Update current user profile
   */
  async updateProfile(profileData) {
    const response = await apiClient.put('/auth/profile', profileData)
    return response.data
  },

  /**
   * Change current user password
   */
  async changePassword(passwordData) {
    const response = await apiClient.put('/auth/password', passwordData)
    return response.data
  },
}

export default authService
