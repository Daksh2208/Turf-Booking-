import apiClient from '../../lib/axios'

export const adminInventoryService = {
  // ==========================================
  // Sports Management
  // ==========================================
  async getSports(params = {}) {
    const response = await apiClient.get('/admin/sports', { params })
    return response.data?.data || { sports: [], pagination: {} }
  },

  async createSport(data) {
    const response = await apiClient.post('/admin/sports', data)
    return response.data?.data?.sport
  },

  async updateSport(id, data) {
    const response = await apiClient.put(`/admin/sports/${id}`, data)
    return response.data?.data?.sport
  },

  async toggleSportStatus(id, isActive) {
    const response = await apiClient.patch(`/admin/sports/${id}/status`, { isActive })
    return response.data?.data?.sport
  },

  async deleteSport(id) {
    const response = await apiClient.delete(`/admin/sports/${id}`)
    return response.data
  },

  // ==========================================
  // Turf Management
  // ==========================================
  async getTurfs(params = {}) {
    const response = await apiClient.get('/admin/turfs', { params })
    return response.data?.data || { turfs: [], pagination: {} }
  },

  async createTurf(data) {
    const response = await apiClient.post('/admin/turfs', data)
    return response.data?.data?.turf
  },

  async updateTurf(id, data) {
    const response = await apiClient.put(`/admin/turfs/${id}`, data)
    return response.data?.data?.turf
  },

  async toggleTurfStatus(id, isActive) {
    const response = await apiClient.patch(`/admin/turfs/${id}/status`, { isActive })
    return response.data?.data?.turf
  },

  async deleteTurf(id) {
    const response = await apiClient.delete(`/admin/turfs/${id}`)
    return response.data
  },

  // ==========================================
  // Add-On Management
  // ==========================================
  async getAddOns(params = {}) {
    const response = await apiClient.get('/admin/addons', { params })
    return response.data?.data || { addOns: [], pagination: {} }
  },

  async createAddOn(data) {
    const response = await apiClient.post('/admin/addons', data)
    return response.data?.data?.addOn
  },

  async updateAddOn(id, data) {
    const response = await apiClient.put(`/admin/addons/${id}`, data)
    return response.data?.data?.addOn
  },

  async toggleAddOnStatus(id, isActive) {
    const response = await apiClient.patch(`/admin/addons/${id}/status`, { isActive })
    return response.data?.data?.addOn
  },

  async deleteAddOn(id) {
    const response = await apiClient.delete(`/admin/addons/${id}`)
    return response.data
  },

  // ==========================================
  // Banner Management
  // ==========================================
  async getBanners() {
    const response = await apiClient.get('/admin/banners')
    return response.data?.data?.banners || []
  },

  async createBanner(data) {
    const response = await apiClient.post('/admin/banners', data)
    return response.data?.data?.banner
  },

  async updateBanner(id, data) {
    const response = await apiClient.put(`/admin/banners/${id}`, data)
    return response.data?.data?.banner
  },

  async toggleBannerStatus(id, isActive) {
    const response = await apiClient.patch(`/admin/banners/${id}/status`, { isActive })
    return response.data?.data?.banner
  },

  async deleteBanner(id) {
    const response = await apiClient.delete(`/admin/banners/${id}`)
    return response.data
  },

  // ==========================================
  // Dashboard Analytics
  // ==========================================
  async getDashboard() {
    const response = await apiClient.get('/admin/dashboard')
    return response.data?.data
  },

  // ==========================================
  // Bookings Management
  // ==========================================
  async getBookings(params = {}) {
    const response = await apiClient.get('/admin/bookings', { params })
    return response.data?.data || { bookings: [], pagination: {} }
  },

  async getBookingDetails(id) {
    const response = await apiClient.get(`/admin/bookings/${id}`)
    return response.data?.data?.booking
  },

  async updateBookingStatus(id, { status, cancellationReason }) {
    const response = await apiClient.patch(`/admin/bookings/${id}/status`, { status, cancellationReason })
    return response.data?.data?.booking
  },

  async recordPayment(id, { paymentMethod = 'Pay at Venue', notes = '', amount } = {}) {
    const response = await apiClient.post(`/admin/bookings/${id}/payment`, { paymentMethod, notes, amount })
    return response.data?.data?.booking
  },

  async cancelBooking(id, { cancellationReason = '' } = {}) {
    const response = await apiClient.post(`/admin/bookings/${id}/cancel`, { cancellationReason })
    return response.data?.data?.booking
  },

  async getCancellationPreview(id) {
    const response = await apiClient.get(`/admin/bookings/${id}/cancellation-preview`)
    return response.data?.data
  },

  async retryRefund(id) {
    const response = await apiClient.post(`/admin/bookings/${id}/refund/retry`)
    return response.data?.data?.booking
  },

  // ==========================================
  // Blocked Slots Management
  // ==========================================
  async getBlockedSlots(params = {}) {
    const response = await apiClient.get('/admin/blocked-slots', { params })
    return response.data?.data || { slots: [], pagination: {} }
  },

  async createBlockedSlot(data) {
    const response = await apiClient.post('/admin/blocked-slots', data)
    return response.data?.data?.blockedSlot
  },

  async updateBlockedSlot(id, data) {
    const response = await apiClient.put(`/admin/blocked-slots/${id}`, data)
    return response.data?.data?.blockedSlot
  },

  async deleteBlockedSlot(id) {
    const response = await apiClient.delete(`/admin/blocked-slots/${id}`)
    return response.data
  },

  // ==========================================
  // Business Settings
  // ==========================================
  async getSettings() {
    const response = await apiClient.get('/admin/settings')
    return response.data?.data?.settings
  },

  async updateSettings(data) {
    const response = await apiClient.put('/admin/settings', data)
    return response.data?.data?.settings
  },
}

export default adminInventoryService
