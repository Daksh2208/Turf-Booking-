import apiClient from '../../lib/axios'

export const adminCalendarService = {
  /**
   * Fetch month / date-range summary for calendar cells and top KPI metric cards
   */
  async getCalendarSummary(params = {}) {
    const response = await apiClient.get('/admin/calendar/summary', { params })
    return response.data?.data || { summary: {}, days: [], timezone: 'Asia/Kolkata' }
  },

  /**
   * Fetch detailed operational schedule for a specific day and turf
   */
  async getDaySchedule(params = {}) {
    const response = await apiClient.get('/admin/calendar/day', { params })
    return response.data?.data || { slots: [], bookings: [], blockedSlots: [], summary: {} }
  },

  /**
   * Fetch week-grid data with time slots and events
   */
  async getWeekSchedule(params = {}) {
    const response = await apiClient.get('/admin/calendar/week', { params })
    return response.data?.data || { days: [], slotDurationMinutes: 60 }
  },

  /**
   * Create admin blocked slot
   */
  async createBlockedSlot(data) {
    const response = await apiClient.post('/admin/blocked-slots', data)
    return response.data?.data?.blockedSlot
  },

  /**
   * Delete / Unblock an admin blocked slot
   */
  async deleteBlockedSlot(id) {
    const response = await apiClient.delete(`/admin/blocked-slots/${id}`)
    return response.data
  },

  /**
   * Fetch individual booking details for calendar drawer/modal
   */
  async getBookingDetails(id) {
    const response = await apiClient.get(`/admin/bookings/${id}`)
    return response.data?.data?.booking
  },
}

export default adminCalendarService
