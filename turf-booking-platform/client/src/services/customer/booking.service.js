import apiClient from '../../lib/axios'

export const customerBookingService = {
  /**
   * Fetch turf slot availability and pricing for a specific date
   */
  async getAvailability(turfId, date) {
    const response = await apiClient.get('/availability', {
      params: { turfId, date },
    })
    return response.data?.data
  },

  /**
   * Fetch slots from customer booking slots endpoint
   */
  async getSlots(turfId, date) {
    const response = await apiClient.get('/bookings/slots', {
      params: { turfId, date },
    })
    return response.data?.data
  },

  /**
   * Generate authoritative server-side quote and tax breakdown
   */
  async getPricingQuote(quoteData) {
    const response = await apiClient.post('/pricing/quote', quoteData)
    return response.data?.data?.quote
  },

  /**
   * Create an authenticated customer booking (Pay at Venue)
   */
  async createBooking(data, idempotencyKey) {
    const headers = {}
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey
    }

    const response = await apiClient.post('/bookings', data, { headers })
    return response.data?.data?.booking
  },

  /**
   * Fetch current authenticated customer's bookings with pagination
   */
  async getMyBookings({ page = 1, limit = 10, status = '' } = {}) {
    const response = await apiClient.get('/bookings/my', {
      params: { page, limit, status },
    })
    return response.data?.data
  },

  /**
   * Fetch single booking details with ownership authorization check
   */
  async getBookingById(id) {
    const response = await apiClient.get(`/bookings/${id}`)
    return response.data?.data?.booking
  },
}

export default customerBookingService
