import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Request interceptor: attach Bearer token from localStorage as fallback for cross-origin setups
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token && config.headers) {
      if (typeof config.headers.get === 'function' && typeof config.headers.set === 'function') {
        if (!config.headers.get('Authorization')) {
          config.headers.set('Authorization', `Bearer ${token}`)
        }
      } else if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  }
  return config
})

// Response interceptor for automatic refresh-token rotation handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If there is no response (network error) or it's not a 401, reject immediately
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error)
    }

    // Do not attempt refresh on auth endpoints (login, register, refresh itself)
    const requestUrl = originalRequest.url || ''
    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    // Prevent infinite loop if already retried
    if (originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue requests that come in while refreshing
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then(() => apiClient(originalRequest))
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      // Attempt silent refresh using HttpOnly refresh cookie
      const refreshRes = await apiClient.post('/auth/refresh')
      const newToken = refreshRes.data?.data?.accessToken
      if (newToken && typeof window !== 'undefined') {
        localStorage.setItem('auth_token', newToken)
        if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
          originalRequest.headers.set('Authorization', `Bearer ${newToken}`)
        } else if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
      }
      processQueue(null, newToken)
      return apiClient(originalRequest)
    } catch (refreshError) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
      }
      processQueue(refreshError, null)
      // Notify AuthContext of session expiration
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'))
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default apiClient
