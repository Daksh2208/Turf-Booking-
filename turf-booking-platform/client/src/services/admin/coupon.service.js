import apiClient from '../../lib/axios'

export const adminCouponService = {
  /**
   * Fetch paginated coupons with optional search & status filter
   */
  async getCoupons({ page = 1, limit = 20, search = '', status = 'all' } = {}) {
    const response = await apiClient.get('/admin/coupons', {
      params: { page, limit, search, status },
    })
    return response.data?.data
  },

  /**
   * Fetch single coupon details
   */
  async getCouponById(id) {
    const response = await apiClient.get(`/admin/coupons/${id}`)
    return response.data?.data?.coupon
  },

  /**
   * Create new coupon
   */
  async createCoupon(data) {
    const response = await apiClient.post('/admin/coupons', data)
    return response.data?.data?.coupon
  },

  /**
   * Update existing coupon
   */
  async updateCoupon(id, data) {
    const response = await apiClient.put(`/admin/coupons/${id}`, data)
    return response.data?.data?.coupon
  },

  /**
   * Toggle active/inactive status
   */
  async toggleCouponStatus(id, isActive) {
    const response = await apiClient.patch(`/admin/coupons/${id}/status`, { isActive })
    return response.data?.data?.coupon
  },

  /**
   * Delete coupon
   */
  async deleteCoupon(id) {
    const response = await apiClient.delete(`/admin/coupons/${id}`)
    return response.data?.data
  },
}

export default adminCouponService
