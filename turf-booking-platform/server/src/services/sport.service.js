import { Sport } from '../models/Sport.js'
import { Turf } from '../models/Turf.js'
import { Booking } from '../models/Booking.js'
import { slugify } from '../utils/slugify.js'
import { logAudit } from '../utils/auditLogger.js'

export const sportService = {
  /**
   * Create a new sport (Admin only)
   */
  async createSport(data, adminUser, ip = '') {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name)

    const existing = await Sport.findOne({ slug })
    if (existing) {
      const error = new Error(`A sport with slug "${slug}" already exists.`)
      error.statusCode = 409
      error.code = 'DUPLICATE_SLUG'
      throw error
    }

    const sport = await Sport.create({
      name: data.name.trim(),
      slug,
      description: data.description ? data.description.trim() : '',
      image: data.image ? data.image.trim() : '',
      icon: data.icon ? data.icon.trim() : '',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    })

    await logAudit({
      actorId: adminUser._id,
      action: 'CREATE',
      entityType: 'Sport',
      entityId: sport._id,
      details: { name: sport.name, slug: sport.slug },
      ip,
    })

    return sport
  },

  /**
   * Update an existing sport (Admin only)
   */
  async updateSport(id, data, adminUser, ip = '') {
    const sport = await Sport.findById(id)
    if (!sport) {
      const error = new Error('Sport not found.')
      error.statusCode = 404
      error.code = 'SPORT_NOT_FOUND'
      throw error
    }

    // Handle slug change if requested
    if (data.slug && data.slug !== sport.slug) {
      const newSlug = slugify(data.slug)
      const duplicate = await Sport.findOne({ slug: newSlug, _id: { $ne: id } })
      if (duplicate) {
        const error = new Error(`A sport with slug "${newSlug}" already exists.`)
        error.statusCode = 409
        error.code = 'DUPLICATE_SLUG'
        throw error
      }
      sport.slug = newSlug
    }

    if (data.name !== undefined) sport.name = data.name.trim()
    if (data.description !== undefined) sport.description = data.description.trim()
    if (data.image !== undefined) sport.image = data.image.trim()
    if (data.icon !== undefined) sport.icon = data.icon.trim()
    if (data.isActive !== undefined) sport.isActive = Boolean(data.isActive)

    await sport.save()

    await logAudit({
      actorId: adminUser._id,
      action: 'UPDATE',
      entityType: 'Sport',
      entityId: sport._id,
      details: { name: sport.name, slug: sport.slug, isActive: sport.isActive },
      ip,
    })

    return sport
  },

  /**
   * Safe status toggle / deactivation (Admin only)
   */
  async toggleSportStatus(id, isActive, adminUser, ip = '') {
    const sport = await Sport.findById(id)
    if (!sport) {
      const error = new Error('Sport not found.')
      error.statusCode = 404
      error.code = 'SPORT_NOT_FOUND'
      throw error
    }

    sport.isActive = Boolean(isActive)
    await sport.save()

    await logAudit({
      actorId: adminUser._id,
      action: sport.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'Sport',
      entityId: sport._id,
      details: { isActive: sport.isActive },
      ip,
    })

    return sport
  },

  /**
   * Get sports with pagination and filtering for admin
   */
  async getAdminSports({ page = 1, limit = 20, search = '', isActive } = {}) {
    const query = {}

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ]
    }

    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true' || isActive === true
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [sports, total] = await Promise.all([
      Sport.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Sport.countDocuments(query),
    ])

    return {
      sports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    }
  },

  /**
   * Get public active sports, deduplicated by normalized category name
   */
  async getPublicSports() {
    const rawSports = await Sport.find({ isActive: true })
      .select('name slug description image icon')
      .sort({ name: 1 })

    // Deduplicate by normalized base category name (e.g. 'Box Cricket 179...' collapses into 'Box Cricket')
    const seen = new Map()
    for (const sport of rawSports) {
      if (!sport.name) continue
      const normalizedCategory = sport.name.replace(/\s*\d+$/, '').trim().toLowerCase()
      if (!seen.has(normalizedCategory)) {
        seen.set(normalizedCategory, sport)
      }
    }

    return Array.from(seen.values())
  },

  /**
   * Get public active sport by slug
   */
  async getPublicSportBySlug(slug) {
    const sport = await Sport.findOne({ slug: slug.toLowerCase(), isActive: true }).select(
      'name slug description image icon'
    )
    if (!sport) {
      const error = new Error('Sport not found or inactive.')
      error.statusCode = 404
      error.code = 'SPORT_NOT_FOUND'
      throw error
    }
    return sport
  },

  /**
   * Delete Sport safely (Admin only)
   * Verifies no active turfs or historical bookings depend on this sport before deletion.
   */
  async deleteSport(id, adminUser, ip = '') {
    const sport = await Sport.findById(id)
    if (!sport) {
      const error = new Error('Sport not found.')
      error.statusCode = 404
      error.code = 'SPORT_NOT_FOUND'
      throw error
    }

    // Safety check 1: Check if any turfs are assigned this sport
    const assignedTurfsCount = await Turf.countDocuments({ sports: id })
    if (assignedTurfsCount > 0) {
      const error = new Error(
        `Cannot delete sport "${sport.name}": It is currently assigned to ${assignedTurfsCount} turf arena(s). Please remove this sport from those turfs or deactivate it instead.`
      )
      error.statusCode = 400
      error.code = 'SPORT_IN_USE_BY_TURF'
      throw error
    }

    // Safety check 2: Check if any bookings reference this sport
    const bookingCount = await Booking.countDocuments({ sport: id })
    if (bookingCount > 0) {
      const error = new Error(
        `Cannot delete sport "${sport.name}": It is referenced in ${bookingCount} historical booking record(s). Please deactivate the sport instead to preserve historical records.`
      )
      error.statusCode = 400
      error.code = 'SPORT_IN_USE_BY_BOOKING'
      throw error
    }

    await Sport.findByIdAndDelete(id)

    await logAudit({
      actorId: adminUser._id,
      action: 'DELETE',
      entityType: 'Sport',
      entityId: id,
      details: { name: sport.name, slug: sport.slug },
      ip,
    })

    return { success: true, message: 'Sport deleted successfully.' }
  },
}

export default sportService

