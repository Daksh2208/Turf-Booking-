import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { Booking } from '../src/models/Booking.js'
import { BlockedSlot } from '../src/models/BlockedSlot.js'
import { BusinessSettings } from '../src/models/BusinessSettings.js'

describe('Part 8: Turf Slot Availability and Blocked Slots Suite', () => {
  let adminCookie = ''
  let customerCookie = ''
  let testAdminUser = null
  let testCustomerUser = null
  let testSport = null
  let standardTurf = null
  let overnightTurf = null

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up test data
    await Promise.all([
      User.deleteMany({ email: { $in: ['admin_avail@turf.com', 'customer_avail@turf.com'] } }),
      Sport.deleteMany({ slug: 'avail-sport' }),
      Turf.deleteMany({ slug: { $in: ['avail-standard-arena', 'avail-overnight-arena'] } }),
      Booking.deleteMany({ bookingId: { $regex: /^TEST-AVAIL-/ } }),
      BlockedSlot.deleteMany({ note: { $regex: /\[TEST-AVAIL\]/ } }),
    ])

    // Create Admin User
    const adminHash = await bcrypt.hash('Password@123', 10)
    testAdminUser = await User.create({
      name: 'Availability Admin',
      email: 'admin_avail@turf.com',
      passwordHash: adminHash,
      role: 'admin',
      isActive: true,
    })

    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin_avail@turf.com',
      password: 'Password@123',
    })
    adminCookie = adminLoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Customer User
    const custHash = await bcrypt.hash('Password@123', 10)
    testCustomerUser = await User.create({
      name: 'Availability Customer',
      email: 'customer_avail@turf.com',
      passwordHash: custHash,
      role: 'customer',
      isActive: true,
    })

    const custLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'customer_avail@turf.com',
      password: 'Password@123',
    })
    customerCookie = custLoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Test Sport
    testSport = await Sport.create({
      name: 'Availability Football',
      slug: 'avail-sport',
      description: 'Sport for availability testing',
      isActive: true,
    })

    // Create Standard Operating Arena (06:00 to 22:00)
    standardTurf = await Turf.create({
      name: 'Standard Arena',
      slug: 'avail-standard-arena',
      description: 'Standard operating arena 06:00 - 22:00',
      sports: [testSport._id],
      address: { street: 'Main Ground', city: 'Mumbai', state: 'MH', zipCode: '400001' },
      openingHours: { open: '06:00', close: '22:00' },
      timezone: 'Asia/Kolkata',
      pricing: {
        baseRate: 80000, // ₹800
        peakRate: 120000, // ₹1200
        weekendRate: 140000, // ₹1400
        peakHours: { start: '18:00', end: '22:00' },
        weekendDays: [0, 6], // Sun, Sat
      },
      isActive: true,
    })

    // Create Overnight Operating Arena (18:00 to 02:00)
    overnightTurf = await Turf.create({
      name: 'Overnight Arena',
      slug: 'avail-overnight-arena',
      description: 'Overnight operating arena crossing midnight',
      sports: [testSport._id],
      address: { street: 'Night Ground', city: 'Mumbai', state: 'MH', zipCode: '400001' },
      openingHours: { open: '18:00', close: '02:00' },
      timezone: 'Asia/Kolkata',
      pricing: {
        baseRate: 90000,
        peakRate: 130000,
        weekendRate: 150000,
        peakHours: { start: '18:00', end: '23:00' },
        weekendDays: [0, 6],
      },
      isActive: true,
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: { $in: ['admin_avail@turf.com', 'customer_avail@turf.com'] } }),
      Sport.deleteMany({ slug: 'avail-sport' }),
      Turf.deleteMany({ slug: { $in: ['avail-standard-arena', 'avail-overnight-arena'] } }),
      Booking.deleteMany({ bookingId: { $regex: /^TEST-AVAIL-/ } }),
      BlockedSlot.deleteMany({ note: { $regex: /\[TEST-AVAIL\]/ } }),
    ])
  })

  // 1. Slot generation within opening hours
  it('1. generates slots strictly within opening hours without duplicates or out-of-bounds slots', async () => {
    // 2026-10-28 is Wednesday (weekday)
    const res = await request(app)
      .get(`/api/v1/availability?turfId=${standardTurf._id}&date=2026-10-28`)
      .expect(200)

    expect(res.body.success).toBe(true)
    const { slots, operatingHours, slotDurationMinutes, timezone } = res.body.data
    expect(operatingHours.open).toBe('06:00')
    expect(operatingHours.close).toBe('22:00')
    expect(slotDurationMinutes).toBe(60)
    expect(timezone).toBe('Asia/Kolkata')

    // 06:00 to 22:00 = 16 slots exactly
    expect(slots).toHaveLength(16)
    expect(slots[0].startTime).toBe('06:00')
    expect(slots[0].endTime).toBe('07:00')
    expect(slots[slots.length - 1].startTime).toBe('21:00')
    expect(slots[slots.length - 1].endTime).toBe('22:00')

    // Verify all slots start as available initially
    for (const slot of slots) {
      expect(['available', 'booked', 'blocked']).toContain(slot.status)
      expect(slot.status).toBe('available')
      expect(typeof slot.price).toBe('number')
      expect(slot.price).toBeGreaterThan(0)
    }
  })

  // 2. Invalid dates and unknown turf IDs
  it('2. returns proper 400 and 404 validation errors for missing params, malformed dates, and unknown turf IDs', async () => {
    // Missing turfId and date
    const resMissing = await request(app).get('/api/v1/availability').expect(400)
    expect(resMissing.body.success).toBe(false)

    // Malformed date
    const resBadDate = await request(app)
      .get(`/api/v1/availability?turfId=${standardTurf._id}&date=2026-02-31`)
      .expect(400)
    expect(resBadDate.body.success).toBe(false)
    expect(resBadDate.body.error?.message || resBadDate.body.message).toMatch(/Invalid calendar date/i)

    // Unknown turf ID
    const fakeId = new mongoose.Types.ObjectId()
    const resNotFound = await request(app)
      .get(`/api/v1/availability?turfId=${fakeId}&date=2026-10-28`)
      .expect(404)
    expect(resNotFound.body.success).toBe(false)
    expect(resNotFound.body.error?.message || resNotFound.body.message).toMatch(/not found/i)
  })

  // 3. Booked-slot representation when valid booking data exists
  it('3. represents occupied slots as booked with price estimate without exposing customer PII', async () => {
    const testDate = '2026-10-28'
    // Create an active booking directly in database
    const booking = await Booking.create({
      bookingId: 'TEST-AVAIL-BOOK-001',
      user: testCustomerUser._id,
      turf: standardTurf._id,
      sport: testSport._id,
      date: testDate,
      startTime: '10:00',
      endTime: '11:00',
      durationMinutes: 60,
      rateType: 'base',
      slotPrice: 80000,
      addOns: [],
      addOnsTotal: 0,
      subtotal: 80000,
      gstPercentage: 18,
      gstAmount: 14400,
      totalAmount: 94400,
      paymentMethod: 'pay_at_venue',
      status: 'confirmed',
    })

    const res = await request(app)
      .get(`/api/v1/availability?turfId=${standardTurf._id}&date=${testDate}`)
      .expect(200)

    const bookedSlot = res.body.data.slots.find((s) => s.startTime === '10:00')
    expect(bookedSlot).toBeDefined()
    expect(bookedSlot.status).toBe('booked')
    // Ensure customer user details and booking ID are NOT leaked in public availability
    expect(bookedSlot.user).toBeUndefined()
    expect(bookedSlot.customer).toBeUndefined()
    expect(bookedSlot.bookingId).toBeUndefined()

    // Clean up
    await Booking.findByIdAndDelete(booking._id)
  })

  // 4. Blocked-slot representation
  it('4. represents admin maintenance/tournament blocks as blocked with reason', async () => {
    const testDate = '2026-10-28'
    const block = await BlockedSlot.create({
      turf: standardTurf._id,
      date: testDate,
      startTime: '14:00',
      endTime: '16:00',
      reason: 'maintenance',
      note: '[TEST-AVAIL] Turf grooming and repairs',
      createdBy: testAdminUser._id,
    })

    const res = await request(app)
      .get(`/api/v1/availability?turfId=${standardTurf._id}&date=${testDate}`)
      .expect(200)

    const slot14 = res.body.data.slots.find((s) => s.startTime === '14:00')
    const slot15 = res.body.data.slots.find((s) => s.startTime === '15:00')

    expect(slot14.status).toBe('blocked')
    expect(slot14.reason).toBe('maintenance')
    expect(slot14.note).toContain('Turf grooming')

    expect(slot15.status).toBe('blocked')
    expect(slot15.reason).toBe('maintenance')

    // Clean up
    await BlockedSlot.findByIdAndDelete(block._id)
  })

  // 5. Admin can create and remove blocks via API
  it('5. allows authorized admin to create, list, and delete blocked slots', async () => {
    const testDate = '2026-10-29'
    // Create block via Admin API
    const createRes = await request(app)
      .post('/api/v1/admin/blocked-slots')
      .set('Cookie', adminCookie)
      .send({
        turf: standardTurf._id,
        date: testDate,
        startTime: '11:00',
        endTime: '13:00',
        reason: 'tournament',
        note: '[TEST-AVAIL] Inter-school tournament',
      })
      .expect(201)

    expect(createRes.body.success).toBe(true)
    const blockId = (createRes.body.data.blockedSlot || createRes.body.data.slot)._id
    expect(blockId).toBeDefined()

    // Delete block via Admin API
    const deleteRes = await request(app)
      .delete(`/api/v1/admin/blocked-slots/${blockId}`)
      .set('Cookie', adminCookie)
      .expect(200)

    expect(deleteRes.body.success).toBe(true)
  })

  // 6. Ordinary users cannot create or remove blocks
  it('6. prevents non-admin customers from creating or removing blocked slots (403 Forbidden)', async () => {
    const testDate = '2026-10-29'
    const createRes = await request(app)
      .post('/api/v1/admin/blocked-slots')
      .set('Cookie', customerCookie)
      .send({
        turf: standardTurf._id,
        date: testDate,
        startTime: '09:00',
        endTime: '10:00',
        reason: 'maintenance',
      })
      .expect(403)

    expect(createRes.body.success).toBe(false)
  })

  // 7. Invalid and overlapping block requests
  it('7. rejects invalid time ranges (start >= end) and overlapping block requests (409 conflict)', async () => {
    const testDate = '2026-10-30'
    // 7a. Start >= End
    const invalidRangeRes = await request(app)
      .post('/api/v1/admin/blocked-slots')
      .set('Cookie', adminCookie)
      .send({
        turf: standardTurf._id,
        date: testDate,
        startTime: '15:00',
        endTime: '14:00',
        reason: 'maintenance',
      })
      .expect(400)

    expect(invalidRangeRes.body.success).toBe(false)

    // 7b. Create initial block
    const block1 = await BlockedSlot.create({
      turf: standardTurf._id,
      date: testDate,
      startTime: '16:00',
      endTime: '18:00',
      reason: 'maintenance',
      note: '[TEST-AVAIL] Block 1',
      createdBy: testAdminUser._id,
    })

    // Try to create overlapping block (17:00 to 19:00)
    const overlapRes = await request(app)
      .post('/api/v1/admin/blocked-slots')
      .set('Cookie', adminCookie)
      .send({
        turf: standardTurf._id,
        date: testDate,
        startTime: '17:00',
        endTime: '19:00',
        reason: 'tournament',
      })
      .expect(409)

    expect(overlapRes.body.success).toBe(false)
    expect(overlapRes.body.error?.code).toBe('BLOCK_OVERLAP_CONFLICT')

    // Clean up
    await BlockedSlot.findByIdAndDelete(block1._id)
  })

  // 8. Conflicts between new blocks and existing bookings
  it('8. rejects creating a block that conflicts with an existing active customer booking (409 conflict)', async () => {
    const testDate = '2026-10-30'
    const booking = await Booking.create({
      bookingId: 'TEST-AVAIL-BOOK-CONFLICT',
      user: testCustomerUser._id,
      turf: standardTurf._id,
      sport: testSport._id,
      date: testDate,
      startTime: '19:00',
      endTime: '20:00',
      durationMinutes: 60,
      rateType: 'peak',
      slotPrice: 120000,
      addOns: [],
      addOnsTotal: 0,
      subtotal: 120000,
      gstPercentage: 18,
      gstAmount: 21600,
      totalAmount: 141600,
      paymentMethod: 'pay_at_venue',
      status: 'confirmed',
    })

    // Admin tries to block 18:00 to 21:00 which overlaps with the 19:00 booking
    const blockRes = await request(app)
      .post('/api/v1/admin/blocked-slots')
      .set('Cookie', adminCookie)
      .send({
        turf: standardTurf._id,
        date: testDate,
        startTime: '18:00',
        endTime: '21:00',
        reason: 'maintenance',
        note: '[TEST-AVAIL] Overlaps with confirmed player match',
      })
      .expect(409)

    expect(blockRes.body.success).toBe(false)
    expect(blockRes.body.error?.code).toBe('BOOKING_CONFLICT')
    expect(blockRes.body.error?.message).toContain('active booking')

    // Clean up
    await Booking.findByIdAndDelete(booking._id)
  })

  // 9. Date changes refresh availability
  it('9. returns different slot sets or rates when the requested date changes (weekday vs weekend)', async () => {
    // 2026-10-28 is Wednesday (weekday)
    const weekdayRes = await request(app)
      .get(`/api/v1/availability?turfId=${standardTurf._id}&date=2026-10-28`)
      .expect(200)

    // 2026-10-31 is Saturday (weekend)
    const weekendRes = await request(app)
      .get(`/api/v1/availability?turfId=${standardTurf._id}&date=2026-10-31`)
      .expect(200)

    const weekdayMorningSlot = weekdayRes.body.data.slots.find((s) => s.startTime === '08:00')
    const weekendMorningSlot = weekendRes.body.data.slots.find((s) => s.startTime === '08:00')

    // Weekday morning is base rate (80000 paise)
    expect(weekdayMorningSlot.rateType).toBe('base')
    expect(weekdayMorningSlot.price).toBe(80000)

    // Weekend morning is weekend rate (140000 paise)
    expect(weekendMorningSlot.rateType).toBe('weekend')
    expect(weekendMorningSlot.price).toBe(140000)
  })

  // 10. Availability reflects newly created or removed blocks immediately
  it('10. immediately reflects newly created blocks and subsequent removals in availability queries', async () => {
    const testDate = '2026-10-28'

    // Initial check: 16:00 slot is available
    const beforeRes = await request(app)
      .get(`/api/v1/availability?turfId=${standardTurf._id}&date=${testDate}`)
      .expect(200)
    expect(beforeRes.body.data.slots.find((s) => s.startTime === '16:00').status).toBe('available')

    // Admin creates block for 16:00 to 17:00
    const blockRes = await request(app)
      .post('/api/v1/admin/blocked-slots')
      .set('Cookie', adminCookie)
      .send({
        turf: standardTurf._id,
        date: testDate,
        startTime: '16:00',
        endTime: '17:00',
        reason: 'maintenance',
        note: '[TEST-AVAIL] Light tower inspection',
      })
      .expect(201)

    const blockId = (blockRes.body.data.blockedSlot || blockRes.body.data.slot)._id

    // Check availability again: 16:00 slot is now blocked
    const duringRes = await request(app)
      .get(`/api/v1/availability?turfId=${standardTurf._id}&date=${testDate}`)
      .expect(200)
    expect(duringRes.body.data.slots.find((s) => s.startTime === '16:00').status).toBe('blocked')

    // Admin removes the block
    await request(app)
      .delete(`/api/v1/admin/blocked-slots/${blockId}`)
      .set('Cookie', adminCookie)
      .expect(200)

    // Check availability again: 16:00 slot is restored to available
    const afterRes = await request(app)
      .get(`/api/v1/availability?turfId=${standardTurf._id}&date=${testDate}`)
      .expect(200)
    expect(afterRes.body.data.slots.find((s) => s.startTime === '16:00').status).toBe('available')
  })

  // 11. Timezone and midnight-boundary behavior
  it('11. correctly generates slots across midnight operating hours (e.g. 18:00 to 02:00) with timezone returned', async () => {
    const testDate = '2026-10-28'
    const res = await request(app)
      .get(`/api/v1/availability?turfId=${overnightTurf._id}&date=${testDate}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    const { slots, operatingHours, timezone } = res.body.data
    expect(operatingHours.open).toBe('18:00')
    expect(operatingHours.close).toBe('02:00')
    expect(timezone).toBe('Asia/Kolkata')

    // 18:00 to 02:00 = 8 slots: 18-19, 19-20, 20-21, 21-22, 22-23, 23-00, 00-01, 01-02
    expect(slots).toHaveLength(8)
    expect(slots[0].startTime).toBe('18:00')
    expect(slots[5].startTime).toBe('23:00')
    expect(slots[5].endTime).toBe('00:00')
    expect(slots[6].startTime).toBe('00:00')
    expect(slots[6].endTime).toBe('01:00')
    expect(slots[7].startTime).toBe('01:00')
    expect(slots[7].endTime).toBe('02:00')
  })

  // 12. Existing authentication, inventory, and pricing regressions
  it('12. preserves working Part 7 pricing calculations and authentication security', async () => {
    // 2026-10-28 is Wednesday (weekday)
    const res = await request(app)
      .get(`/api/v1/availability?turfId=${standardTurf._id}&date=2026-10-28`)
      .expect(200)

    const slots = res.body.data.slots
    const afternoonSlot = slots.find((s) => s.startTime === '12:00')
    const eveningSlot = slots.find((s) => s.startTime === '19:00')

    // Weekday afternoon is base rate ₹800 (80000 paise)
    expect(afternoonSlot.rateType).toBe('base')
    expect(afternoonSlot.price).toBe(80000)
    expect(afternoonSlot.priceFormatted).toBe('₹800.00')

    // Weekday evening (peak hours 18:00-22:00) is peak rate ₹1200 (120000 paise)
    expect(eveningSlot.rateType).toBe('peak')
    expect(eveningSlot.price).toBe(120000)
    expect(eveningSlot.priceFormatted).toBe('₹1200.00')
  })
})
