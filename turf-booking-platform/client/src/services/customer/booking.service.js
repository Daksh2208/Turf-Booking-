import apiClient from '../../lib/axios'

export const customerBookingService = {
  async getSlots(turfId, date) {
    const response = await apiClient.get('/bookings/slots', {
      params: { turfId, date },
    })
    return response.data?.data
  },

  async getPricingQuote(quoteData) {
    const response = await apiClient.post('/pricing/quote', quoteData)
    return response.data?.data?.quote
  },

  async createBooking(data) {
    const response = await apiClient.post('/bookings', data)
    return response.data?.data?.booking
  },

  async getMyBookings() {
    const response = await apiClient.get('/bookings/my')
    return response.data?.data?.bookings || []
  },
}

export default customerBookingService
