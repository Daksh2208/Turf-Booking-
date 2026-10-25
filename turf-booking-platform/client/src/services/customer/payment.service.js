import apiClient from '../../lib/axios'

export const customerPaymentService = {
  /**
   * Fetch safe public Stripe configuration (enabled, publishableKey, currency)
   */
  async getStripeConfig() {
    try {
      const response = await apiClient.get('/payments/stripe/config')
      return response.data?.data || { enabled: false, publishableKey: '', currency: 'inr' }
    } catch {
      return { enabled: false, publishableKey: '', currency: 'inr' }
    }
  },

  /**
   * Request Stripe Checkout Session from authenticated backend
   */
  async createCheckoutSession(data, idempotencyKey) {
    const headers = {}
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey
    }

    const response = await apiClient.post('/payments/stripe/checkout-session', data, { headers })
    return response.data?.data
  },

  /**
   * Fetch authoritative payment verification status from backend
   */
  async getPaymentStatus(bookingId) {
    const response = await apiClient.get(`/payments/stripe/status/${bookingId}`)
    return response.data?.data
  },

  /**
   * Cancel pending booking if user returns from Stripe checkout without completing payment
   */
  async cancelPendingBooking(bookingId) {
    const response = await apiClient.post(`/payments/stripe/cancel/${bookingId}`)
    return response.data?.data
  },
}

export default customerPaymentService
