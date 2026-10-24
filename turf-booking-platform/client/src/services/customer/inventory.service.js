import apiClient from '../../lib/axios'

export const customerInventoryService = {
  async getTurfs(params = {}) {
    const response = await apiClient.get('/turfs', { params })
    return response.data?.data
  },

  async getTurfBySlug(slug) {
    const response = await apiClient.get(`/turfs/${slug}`)
    return response.data?.data?.turf
  },

  async getSports() {
    const response = await apiClient.get('/sports')
    return response.data?.data?.sports || []
  },

  async getBanners() {
    const response = await apiClient.get('/banners')
    return response.data?.data?.banners || []
  },

  async getAddOns() {
    const response = await apiClient.get('/addons')
    return response.data?.data?.addOns || []
  },

  async getSettings() {
    const response = await apiClient.get('/settings')
    return response.data?.data?.settings
  },
}

export default customerInventoryService
