import mongoose from 'mongoose'
import { Turf } from '../models/Turf.js'
import { Sport } from '../models/Sport.js'
import { slugify } from '../utils/slugify.js'
import { logAudit } from '../utils/auditLogger.js'

export const turfService = {
  /**
   * Helper to validate that all provided sport IDs exist in the database
   */
  async validateSportReferences(sportIds) {
    if (!Array.isArray(sportIds) || sportIds.length === 0) {
      const error = new Error('Turf must support at least one sport.')
      error.statusCode = 400
      error.code = 'INVALID_SPORT_REFERENCE'
      throw error
    }

    // Check ObjectId formats
    for (const id of sportIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error(`Invalid sport ID format: "${id}".`)
        error.statusCode = 400
        error.code = 'INVALID_SPORT_REFERENCE'
        throw error
      }
    }

    // Verify all IDs actually exist in database
    const count = await Sport.countDocuments({ _id: { $in: sportIds } })
    if (count !== sportIds.length) {
      const error = new Error('One or more referenced sports do not exist in the database.')
      error.statusCode = 400
      error.code = 'INVALID_SPORT_REFERENCE'
      throw error
    }
  },

  /**
   * Create a new Turf (Admin only)
   */
  async createTurf(data, adminUser, ip = '') {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name)

    const existing = await Turf.findOne({ slug })
    if (existing) {
      const error = new Error(`A turf with slug "${slug}" already exists.`)
      error.statusCode = 409
      error.code = 'DUPLICATE_SLUG'
      throw error
    }

    // Validate referenced sports
    await this.validateSportReferences(data.sports)

    const turf = await Turf.create({
      name: data.name.trim(),
      slug,
      description: data.description ? data.description.trim() : '',
      sports: data.sports,
      address: {
        street: data.address.street.trim(),
        city: data.address.city.trim(),
        state: data.address.state.trim(),
        zipCode: data.address.zipCode.trim(),
        landmark: data.address.landmark ? data.address.landmark.trim() : '',
        coordinates: {
          lat: data.address.coordinates?.lat || 0,
          lng: data.address.coordinates?.lng || 0,
        },
      },
      images: Array.isArray(data.images) ? data.images : [],
      capacity: {
        minPlayers: data.capacity?.minPlayers || 2,
        maxPlayers: data.capacity?.maxPlayers || 22,
      },
      facilities: Array.isArray(data.facilities) ? data.facilities : [],
      openingHours: {
        open: data.openingHours?.open || '06:00',
        close: data.openingHours?.close || '23:00',
      },
      size: data.size || 'Standard (100x60 ft)',
      surface: data.surface || 'Artificial Turf',
      pricing: {
        baseRate: data.pricing?.baseRate !== undefined ? Number(data.pricing.baseRate) : 80000,
        peakRate: data.pricing?.peakRate !== undefined ? Number(data.pricing.peakRate) : 120000,
        weekendRate: data.pricing?.weekendRate !== undefined ? Number(data.pricing.weekendRate) : 140000,
        peakHours: {
          start: data.pricing?.peakHours?.start || '18:00',
          end: data.pricing?.peakHours?.end || '23:00',
        },
        peakPeriods: Array.isArray(data.pricing?.peakPeriods) ? data.pricing.peakPeriods : [],
        weekendDays: Array.isArray(data.pricing?.weekendDays) ? data.pricing.weekendDays : [0, 6],
      },
      timezone: data.timezone || 'Asia/Kolkata',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    })

    await logAudit({
      actorId: adminUser._id,
      action: 'CREATE',
      entityType: 'Turf',
      entityId: turf._id,
      details: { name: turf.name, slug: turf.slug, sports: turf.sports },
      ip,
    })

    return turf
  },

  /**
   * Update an existing Turf (Admin only)
   */
  async updateTurf(id, data, adminUser, ip = '') {
    const turf = await Turf.findById(id)
    if (!turf) {
      const error = new Error('Turf not found.')
      error.statusCode = 404
      error.code = 'TURF_NOT_FOUND'
      throw error
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== turf.slug) {
      const newSlug = slugify(data.slug)
      const duplicate = await Turf.findOne({ slug: newSlug, _id: { $ne: id } })
      if (duplicate) {
        const error = new Error(`A turf with slug "${newSlug}" already exists.`)
        error.statusCode = 409
        error.code = 'DUPLICATE_SLUG'
        throw error
      }
      turf.slug = newSlug
    }

    // Validate sports if updated
    if (data.sports) {
      await this.validateSportReferences(data.sports)
      turf.sports = data.sports
    }

    if (data.name !== undefined) turf.name = data.name.trim()
    if (data.description !== undefined) turf.description = data.description.trim()
    if (data.size !== undefined) turf.size = data.size.trim()
    if (data.surface !== undefined) turf.surface = data.surface.trim()
    if (data.pricing) {
      turf.pricing = {
        baseRate: data.pricing.baseRate !== undefined ? Number(data.pricing.baseRate) : turf.pricing?.baseRate || 80000,
        peakRate: data.pricing.peakRate !== undefined ? Number(data.pricing.peakRate) : turf.pricing?.peakRate || 120000,
        weekendRate: data.pricing.weekendRate !== undefined ? Number(data.pricing.weekendRate) : turf.pricing?.weekendRate || 140000,
        peakHours: {
          start: data.pricing.peakHours?.start || turf.pricing?.peakHours?.start || '18:00',
          end: data.pricing.peakHours?.end || turf.pricing?.peakHours?.end || '23:00',
        },
        peakPeriods: Array.isArray(data.pricing.peakPeriods) ? data.pricing.peakPeriods : turf.pricing?.peakPeriods || [],
        weekendDays: Array.isArray(data.pricing.weekendDays) ? data.pricing.weekendDays : turf.pricing?.weekendDays || [0, 6],
      }
    }
    if (data.address) {
      if (data.address.street !== undefined) turf.address.street = data.address.street.trim()
      if (data.address.city !== undefined) turf.address.city = data.address.city.trim()
      if (data.address.state !== undefined) turf.address.state = data.address.state.trim()
      if (data.address.zipCode !== undefined) turf.address.zipCode = data.address.zipCode.trim()
      if (data.address.landmark !== undefined) turf.address.landmark = data.address.landmark.trim()
      if (data.address.coordinates) {
        turf.address.coordinates = {
          lat: data.address.coordinates.lat ?? turf.address.coordinates.lat,
          lng: data.address.coordinates.lng ?? turf.address.coordinates.lng,
        }
      }
    }
    if (data.images !== undefined) turf.images = Array.isArray(data.images) ? data.images : []
    if (data.capacity) {
      if (data.capacity.minPlayers !== undefined) turf.capacity.minPlayers = data.capacity.minPlayers
      if (data.capacity.maxPlayers !== undefined) turf.capacity.maxPlayers = data.capacity.maxPlayers
    }
    if (data.facilities !== undefined) {
      turf.facilities = Array.isArray(data.facilities) ? data.facilities : []
    }
    if (data.openingHours) {
      if (data.openingHours.open !== undefined) turf.openingHours.open = data.openingHours.open
      if (data.openingHours.close !== undefined) turf.openingHours.close = data.openingHours.close
    }
    if (data.timezone !== undefined) turf.timezone = data.timezone
    if (data.isActive !== undefined) turf.isActive = Boolean(data.isActive)

    await turf.save()

    await logAudit({
      actorId: adminUser._id,
      action: 'UPDATE',
      entityType: 'Turf',
      entityId: turf._id,
      details: { name: turf.name, slug: turf.slug, isActive: turf.isActive },
      ip,
    })

    return turf
  },

  /**
   * Delete Turf (Admin only)
   */
  async deleteTurf(id, adminUser, ip = '') {
    const turf = await Turf.findById(id)
    if (!turf) {
      const error = new Error('Turf not found.')
      error.statusCode = 404
      error.code = 'TURF_NOT_FOUND'
      throw error
    }

    await Turf.findByIdAndDelete(id)

    await logAudit({
      actorId: adminUser._id,
      action: 'DELETE',
      entityType: 'Turf',
      entityId: id,
      details: { name: turf.name, slug: turf.slug },
      ip,
    })

    return { success: true, message: 'Turf arena deleted successfully.' }
  },

  /**
   * Safe status toggle / deactivation (Admin only)
   */
  async toggleTurfStatus(id, isActive, adminUser, ip = '') {
    const turf = await Turf.findById(id)
    if (!turf) {
      const error = new Error('Turf not found.')
      error.statusCode = 404
      error.code = 'TURF_NOT_FOUND'
      throw error
    }

    turf.isActive = Boolean(isActive)
    await turf.save()

    await logAudit({
      actorId: adminUser._id,
      action: turf.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'Turf',
      entityId: turf._id,
      details: { isActive: turf.isActive },
      ip,
    })

    return turf
  },

  /**
   * Admin listing with pagination and filters
   */
  async getAdminTurfs({ page = 1, limit = 20, search = '', sportId, isActive } = {}) {
    const query = {}

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
      ]
    }

    if (sportId && mongoose.Types.ObjectId.isValid(sportId)) {
      query.sports = sportId
    }

    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true' || isActive === true
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [turfs, total] = await Promise.all([
      Turf.find(query)
        .populate('sports', 'name slug icon')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Turf.countDocuments(query),
    ])

    return {
      turfs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    }
  },

  /**
   * Public listing of active turfs with optional sport filtering and search
   */
  async getPublicTurfs({ page = 1, limit = 12, search = '', sportSlug } = {}) {
    const query = { isActive: true }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.landmark': { $regex: search, $options: 'i' } },
      ]
    }

    // Filter by sport slug if provided
    if (sportSlug) {
      const sport = await Sport.findOne({ slug: sportSlug.toLowerCase(), isActive: true })
      if (sport) {
        query.sports = sport._id
      } else {
        // Requested sport does not exist or is inactive; return empty result set
        return {
          turfs: [],
          pagination: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 },
        }
      }
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [turfs, total] = await Promise.all([
      Turf.find(query)
        .populate('sports', 'name slug icon')
        .select('name slug description sports address images capacity facilities openingHours timezone')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Turf.countDocuments(query),
    ])

    return {
      turfs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    }
  },

  /**
   * Public get active turf by slug
   */
  async getPublicTurfBySlug(slug) {
    const turf = await Turf.findOne({ slug: slug.toLowerCase(), isActive: true })
      .populate('sports', 'name slug icon')
      .select('name slug description sports address images capacity facilities openingHours timezone')

    if (!turf) {
      const error = new Error('Turf not found or is currently inactive.')
      error.statusCode = 404
      error.code = 'TURF_NOT_FOUND'
      throw error
    }

    return turf
  },
}

export default turfService
