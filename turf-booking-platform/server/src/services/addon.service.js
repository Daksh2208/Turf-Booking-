import { AddOn } from '../models/AddOn.js'
import { logAudit } from '../utils/auditLogger.js'

export const addOnService = {
  /**
   * Create a new AddOn (Admin only)
   */
  async createAddOn(data, adminUser, ip = '') {
    const addOn = await AddOn.create({
      name: data.name.trim(),
      description: data.description ? data.description.trim() : '',
      price: Math.round(Number(data.price)),
      pricingUnit: data.pricingUnit || 'per_booking',
      applicableSports: Array.isArray(data.applicableSports) ? data.applicableSports : [],
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    })

    await logAudit({
      actorId: adminUser._id,
      action: 'CREATE',
      entityType: 'AddOn',
      entityId: addOn._id,
      details: { name: addOn.name, price: addOn.price, pricingUnit: addOn.pricingUnit },
      ip,
    })

    return addOn
  },

  /**
   * Update an AddOn (Admin only)
   */
  async updateAddOn(id, data, adminUser, ip = '') {
    const addOn = await AddOn.findById(id)
    if (!addOn) {
      const error = new Error('Add-on not found.')
      error.statusCode = 404
      error.code = 'ADDON_NOT_FOUND'
      throw error
    }

    if (data.name !== undefined) addOn.name = data.name.trim()
    if (data.description !== undefined) addOn.description = data.description.trim()
    if (data.price !== undefined) addOn.price = Math.round(Number(data.price))
    if (data.pricingUnit !== undefined) addOn.pricingUnit = data.pricingUnit
    if (data.applicableSports !== undefined) {
      addOn.applicableSports = Array.isArray(data.applicableSports) ? data.applicableSports : []
    }
    if (data.isActive !== undefined) addOn.isActive = Boolean(data.isActive)

    await addOn.save()

    await logAudit({
      actorId: adminUser._id,
      action: 'UPDATE',
      entityType: 'AddOn',
      entityId: addOn._id,
      details: { name: addOn.name, price: addOn.price, isActive: addOn.isActive },
      ip,
    })

    return addOn
  },

  /**
   * Safe status toggle / deactivation (Admin only)
   */
  async toggleAddOnStatus(id, isActive, adminUser, ip = '') {
    const addOn = await AddOn.findById(id)
    if (!addOn) {
      const error = new Error('Add-on not found.')
      error.statusCode = 404
      error.code = 'ADDON_NOT_FOUND'
      throw error
    }

    addOn.isActive = Boolean(isActive)
    await addOn.save()

    await logAudit({
      actorId: adminUser._id,
      action: addOn.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'AddOn',
      entityId: addOn._id,
      details: { isActive: addOn.isActive },
      ip,
    })

    return addOn
  },

  /**
   * Admin listing of all add-ons with optional status filter
   */
  async getAdminAddOns({ page = 1, limit = 50, isActive } = {}) {
    const query = {}
    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true' || isActive === true
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [addOns, total] = await Promise.all([
      AddOn.find(query).populate('applicableSports', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      AddOn.countDocuments(query),
    ])

    return {
      addOns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    }
  },

  /**
   * Public listing of active add-ons
   */
  async getPublicAddOns() {
    return AddOn.find({ isActive: true })
      .populate('applicableSports', 'name slug')
      .select('name description price pricingUnit applicableSports')
      .sort({ price: 1 })
  },

  /**
   * Delete Add-On (Admin only)
   */
  async deleteAddOn(id, adminUser, ip = '') {
    const addon = await AddOn.findById(id)
    if (!addon) {
      const error = new Error('Add-on not found.')
      error.statusCode = 404
      error.code = 'ADDON_NOT_FOUND'
      throw error
    }

    await AddOn.findByIdAndDelete(id)

    await logAudit({
      actorId: adminUser._id,
      action: 'DELETE',
      entityType: 'AddOn',
      entityId: id,
      details: { name: addon.name },
      ip,
    })

    return { success: true, message: 'Add-on deleted successfully.' }
  },
}

export default addOnService
