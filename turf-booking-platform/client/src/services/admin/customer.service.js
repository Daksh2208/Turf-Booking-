import apiClient from '../../lib/axios'

export const adminCustomerService = {
  /**
   * Get analytical overview metrics for platform customers
   */
  async getCustomerAnalytics() {
    const response = await apiClient.get('/admin/customers/analytics')
    return response.data?.data || {}
  },

  /**
   * Get paginated customer list with search & filters
   */
  async getCustomers(params = {}) {
    const response = await apiClient.get('/admin/customers', { params })
    return response.data?.data || { customers: [], pagination: {} }
  },

  /**
   * Get full details and booking history for a specific customer
   */
  async getCustomerDetails(id) {
    const response = await apiClient.get(`/admin/customers/${id}`)
    return response.data?.data || {}
  },

  /**
   * Toggle customer account status (active/suspended)
   */
  async toggleCustomerStatus(id, isActive) {
    const response = await apiClient.patch(`/admin/customers/${id}/status`, { isActive })
    return response.data?.data?.customer
  },
}

export default adminCustomerService
