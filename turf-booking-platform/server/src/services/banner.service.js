import { Banner } from '../models/Banner.js'
import { logAudit } from '../utils/auditLogger.js'

export const bannerService = {
  /**
   * Create a new homepage Banner (Admin only)
   */
  async createBanner(data, adminUser, ip = '') {
    const banner = await Banner.create({
      title: data.title.trim(),
      subtitle: data.subtitle ? data.subtitle.trim() : '',
      image: data.image.trim(),
      link: data.link ? data.link.trim() : '',
      ctaText: data.ctaText ? data.ctaText.trim() : '',
      order: Number(data.order) || 0,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    })

    await logAudit({
      actorId: adminUser._id,
      action: 'CREATE',
      entityType: 'Banner',
      entityId: banner._id,
      details: { title: banner.title, order: banner.order },
      ip,
    })

    return banner
  },

  /**
   * Update a Banner (Admin only)
   */
  async updateBanner(id, data, adminUser, ip = '') {
    const banner = await Banner.findById(id)
    if (!banner) {
      const error = new Error('Banner not found.')
      error.statusCode = 404
      error.code = 'BANNER_NOT_FOUND'
      throw error
    }

    if (data.title !== undefined) banner.title = data.title.trim()
    if (data.subtitle !== undefined) banner.subtitle = data.subtitle.trim()
    if (data.image !== undefined) banner.image = data.image.trim()
    if (data.link !== undefined) banner.link = data.link.trim()
    if (data.ctaText !== undefined) banner.ctaText = data.ctaText.trim()
    if (data.order !== undefined) banner.order = Number(data.order)
    if (data.isActive !== undefined) banner.isActive = Boolean(data.isActive)

    await banner.save()

    await logAudit({
      actorId: adminUser._id,
      action: 'UPDATE',
      entityType: 'Banner',
      entityId: banner._id,
      details: { title: banner.title, order: banner.order, isActive: banner.isActive },
      ip,
    })

    return banner
  },

  /**
   * Safe status toggle / deactivation (Admin only)
   */
  async toggleBannerStatus(id, isActive, adminUser, ip = '') {
    const banner = await Banner.findById(id)
    if (!banner) {
      const error = new Error('Banner not found.')
      error.statusCode = 404
      error.code = 'BANNER_NOT_FOUND'
      throw error
    }

    banner.isActive = Boolean(isActive)
    await banner.save()

    await logAudit({
      actorId: adminUser._id,
      action: banner.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'Banner',
      entityId: banner._id,
      details: { isActive: banner.isActive },
      ip,
    })

    return banner
  },

  /**
   * Delete banner (Admin only)
   */
  async deleteBanner(id, adminUser, ip = '') {
    const banner = await Banner.findByIdAndDelete(id)
    if (!banner) {
      const error = new Error('Banner not found.')
      error.statusCode = 404
      error.code = 'BANNER_NOT_FOUND'
      throw error
    }

    await logAudit({
      actorId: adminUser._id,
      action: 'DELETE',
      entityType: 'Banner',
      entityId: banner._id,
      details: { title: banner.title },
      ip,
    })

    return { message: 'Banner deleted successfully.' }
  },

  /**
   * Admin list of banners
   */
  async getAdminBanners() {
    return Banner.find().sort({ order: 1, createdAt: -1 })
  },

  /**
   * Public active banners
   */
  async getPublicBanners() {
    return Banner.find({ isActive: true })
      .select('title subtitle image link ctaText order')
      .sort({ order: 1 })
  },
}

export default bannerService
