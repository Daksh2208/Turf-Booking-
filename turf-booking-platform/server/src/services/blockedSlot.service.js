import { BlockedSlot } from '../models/BlockedSlot.js'
import { Turf } from '../models/Turf.js'
import { Booking } from '../models/Booking.js'
import { logAudit } from '../utils/auditLogger.js'

export const blockedSlotService = {
  /**
   * Helper to validate block time range and prevent overlapping blocks / booking conflicts
   */
  async validateBlockConstraints({ turfId, date, startTime, endTime, excludeBlockId = null }) {
    if (!startTime || !endTime) {
      const err = new Error('Start time and end time are required.')
      err.statusCode = 400
      err.code = 'MISSING_TIME'
      throw err
    }

    if (startTime >= endTime) {
      const err = new Error('End time must be strictly after start time.')
      err.statusCode = 400
      err.code = 'INVALID_TIME_RANGE'
      throw err
    }

    // 1. Prevent overlapping active blocks for the same turf and date
    const blockQuery = {
      turf: turfId,
      date,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    }
    if (excludeBlockId) {
      blockQuery._id = { $ne: excludeBlockId }
    }

    const overlappingBlock = await BlockedSlot.findOne(blockQuery)
    if (overlappingBlock) {
      const err = new Error(`Time range conflicts with an existing blocked slot (${overlappingBlock.startTime} - ${overlappingBlock.endTime}).`)
      err.statusCode = 409
      err.code = 'BLOCK_OVERLAP_CONFLICT'
      throw err
    }

    // 2. Reject block if it conflicts with an existing active customer booking
    const conflictingBooking = await Booking.findOne({
      turf: turfId,
      date,
      status: { $in: ['pending', 'confirmed'] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    })
    if (conflictingBooking) {
      const err = new Error(`Cannot block slot: A conflicting active booking (${conflictingBooking.bookingId}) already occupies this time range.`)
      err.statusCode = 409
      err.code = 'BOOKING_CONFLICT'
      throw err
    }
  },

  /**
   * Create blocked slot (Admin only)
   */
  async createBlockedSlot(data, adminUser, ip = '') {
    const turf = await Turf.findById(data.turf)
    if (!turf) {
      const error = new Error('Referenced turf not found.')
      error.statusCode = 404
      error.code = 'TURF_NOT_FOUND'
      throw error
    }

    // Validate time range, overlapping blocks, and existing booking conflicts
    await this.validateBlockConstraints({
      turfId: data.turf,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
    })

    const blocked = await BlockedSlot.create({
      turf: data.turf,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      reason: data.reason || 'maintenance',
      note: data.note || '',
      createdBy: adminUser._id,
    })

    await logAudit({
      actorId: adminUser._id,
      action: 'CREATE',
      entityType: 'BlockedSlot',
      entityId: blocked._id,
      details: { turf: turf.name, date: data.date, time: `${data.startTime}-${data.endTime}`, reason: data.reason },
      ip,
    })

    return blocked.populate('turf', 'name slug')
  },

  /**
   * Update blocked slot (Admin only)
   */
  async updateBlockedSlot(id, data, adminUser, ip = '') {
    const blocked = await BlockedSlot.findById(id)
    if (!blocked) {
      const error = new Error('Blocked slot not found.')
      error.statusCode = 404
      error.code = 'BLOCKED_SLOT_NOT_FOUND'
      throw error
    }

    const targetTurf = data.turf || blocked.turf
    const targetDate = data.date || blocked.date
    const targetStart = data.startTime || blocked.startTime
    const targetEnd = data.endTime || blocked.endTime

    // Validate constraints excluding the current block
    await this.validateBlockConstraints({
      turfId: targetTurf,
      date: targetDate,
      startTime: targetStart,
      endTime: targetEnd,
      excludeBlockId: blocked._id,
    })

    if (data.turf) blocked.turf = data.turf
    if (data.date) blocked.date = data.date
    if (data.startTime) blocked.startTime = data.startTime
    if (data.endTime) blocked.endTime = data.endTime
    if (data.reason) blocked.reason = data.reason
    if (data.note !== undefined) blocked.note = data.note

    await blocked.save()

    await logAudit({
      actorId: adminUser._id,
      action: 'UPDATE',
      entityType: 'BlockedSlot',
      entityId: blocked._id,
      details: { date: blocked.date, time: `${blocked.startTime}-${blocked.endTime}` },
      ip,
    })

    return blocked.populate('turf', 'name slug')
  },

  /**
   * Delete blocked slot (Admin only)
   */
  async deleteBlockedSlot(id, adminUser, ip = '') {
    const blocked = await BlockedSlot.findById(id)
    if (!blocked) {
      const error = new Error('Blocked slot not found.')
      error.statusCode = 404
      error.code = 'BLOCKED_SLOT_NOT_FOUND'
      throw error
    }

    await BlockedSlot.findByIdAndDelete(id)

    await logAudit({
      actorId: adminUser._id,
      action: 'DELETE',
      entityType: 'BlockedSlot',
      entityId: id,
      details: { date: blocked.date, time: `${blocked.startTime}-${blocked.endTime}` },
      ip,
    })

    return { success: true, message: 'Blocked slot removed successfully.' }
  },

  /**
   * Get all blocked slots for admin
   */
  async getAdminBlockedSlots({ turfId, date, page = 1, limit = 50 } = {}) {
    const query = {}
    if (turfId) query.turf = turfId
    if (date) query.date = date

    const skip = (Number(page) - 1) * Number(limit)
    const [slots, total] = await Promise.all([
      BlockedSlot.find(query)
        .populate('turf', 'name slug')
        .sort({ date: -1, startTime: 1 })
        .skip(skip)
        .limit(Number(limit)),
      BlockedSlot.countDocuments(query),
    ])

    return {
      slots,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    }
  },

  /**
   * Public blocked slots query for turf calendar
   */
  async getPublicBlockedSlots(turfId, date) {
    const query = { turf: turfId }
    if (date) query.date = date

    return BlockedSlot.find(query).select('date startTime endTime reason note').sort({ startTime: 1 })
  },
}

export default blockedSlotService
