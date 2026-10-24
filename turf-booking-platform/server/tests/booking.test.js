import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { AddOn } from '../src/models/AddOn.js'
import { Booking } from '../src/models/Booking.js'
import { BlockedSlot } from '../src/models/BlockedSlot.js'
import { BusinessSettings } from '../src/models/BusinessSettings.js'

import bcrypt from 'bcryptjs'

describe('Booking Engine, Pricing, Blocked Slots, and Dashboard Suite', () => {
  let adminCookie = ''
  let customerCookie = ''
  let adminUser = null
  let customerUser = null
  let testSport = null
  let testTurf = null

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up test collections
    await Promise.all([
      User.deleteMany({ email: { $in: ['admin_booking@turf.com', 'customer_booking@turf.com'] } }),
      Sport.deleteMany({ slug: 'cricket-booking-test' }),
      Turf.deleteMany({ slug: 'arena-booking-test' }),
      Booking.deleteMany({}),
      BlockedSlot.deleteMany({}),
    ])

    // Create Admin
    const adminPassHash = await bcrypt.hash('Password@123', 10)
    adminUser = await User.create({
      name: 'Booking Admin',
      email: 'admin_booking@turf.com',
      passwordHash: adminPassHash,
      role: 'admin',
      isActive: true,
    })

    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin_booking@turf.com',
      password: 'Password@123',
    })
    adminCookie = adminLoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Customer
    const custPassHash = await bcrypt.hash('Password@123', 10)
    customerUser = await User.create({
      name: 'Booking Customer',
      email: 'customer_booking@turf.com',
      passwordHash: custPassHash,
      role: 'customer',
      isActive: true,
    })

    const custLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'customer_booking@turf.com',
      password: 'Password@123',
    })
    customerCookie = custLoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Sport & Turf with base, peak, and weekend rates
    testSport = await Sport.create({
      name: 'Cricket Test',
      slug: 'cricket-booking-test',
      description: 'Test sport for bookings',
      isActive: true,
    })

    testTurf = await Turf.create({
      name: 'Arena Booking Test',
      slug: 'arena-booking-test',
      description: 'Premier test arena',
      sports: [testSport._id],
      address: {
        street: '100 Stadium Way',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380015',
      },
      size: '120x80 ft Box',
      surface: 'Artificial Turf',
      pricing: {
        baseRate: 70000, // ₹700
        peakRate: 110000, // ₹1100
        weekendRate: 130000, // ₹1300
        peakHours: {
          start: '18:00',
          end: '23:00',
        },
      },
      openingHours: {
        open: '06:00',
        close: '23:00',
      },
      isActive: true,
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: { $in: ['admin_booking@turf.com', 'customer_booking@turf.com'] } }),
      Sport.deleteMany({ slug: 'cricket-booking-test' }),
      Turf.deleteMany({ slug: 'arena-booking-test' }),
      Booking.deleteMany({}),
      BlockedSlot.deleteMany({}),
    ])
  })

  it('calculates dynamic slot rates and availability correctly', async () => {
    // Weekday: 2026-10-27 is Tuesday
    const res = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-10-27`)
      .expect(200)

    expect(res.body.success).toBe(true)
    const { slots } = res.body.data
    expect(slots.length).toBeGreaterThan(0)

    // Check afternoon slot (base rate)
    const baseSlot = slots.find((s) => s.startTime === '10:00')
    expect(baseSlot).toBeDefined()
    expect(baseSlot.rateType).toBe('base')
    expect(baseSlot.price).toBe(70000)
    expect(baseSlot.status).toBe('available')

    // Check evening slot (peak rate)
    const peakSlot = slots.find((s) => s.startTime === '19:00')
    expect(peakSlot).toBeDefined()
    expect(peakSlot.rateType).toBe('peak')
    expect(peakSlot.price).toBe(110000)

    // Weekend test: 2026-10-25 is Sunday
    const weekendRes = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-10-25`)
      .expect(200)

    const weekendSlot = weekendRes.body.data.slots.find((s) => s.startTime === '10:00')
    expect(weekendSlot.rateType).toBe('weekend')
    expect(weekendSlot.price).toBe(130000)
  })

  it('blocks a slot for maintenance/tournament and marks it blocked in slot queries instantly', async () => {
    // Admin creates blocked slot
    const blockRes = await request(app)
      .post('/api/v1/admin/blocked-slots')
      .set('Cookie', adminCookie)
      .send({
        turf: testTurf._id,
        date: '2026-10-27',
        startTime: '14:00',
        endTime: '16:00',
        reason: 'maintenance',
        note: 'Turf grass replacement',
      })
      .expect(201)

    expect(blockRes.body.success).toBe(true)
    const blockedSlotId = blockRes.body.data.blockedSlot._id

    // Customer slot query should now show blocked
    const slotRes = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-10-27`)
      .expect(200)

    const slot14 = slotRes.body.data.slots.find((s) => s.startTime === '14:00')
    expect(slot14.status).toBe('blocked')
    expect(slot14.reason).toMatch(/Maintenance/i)

    // Admin can delete blocked slot
    await request(app)
      .delete(`/api/v1/admin/blocked-slots/${blockedSlotId}`)
      .set('Cookie', adminCookie)
      .expect(200)

    // Slot is now free again
    const freedSlotRes = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-10-27`)
      .expect(200)

    const slotFreed = freedSlotRes.body.data.slots.find((s) => s.startTime === '14:00')
    expect(slotFreed.status).toBe('available')
  })

  it('creates booking with automatic pricing and releases slot when cancelled', async () => {
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customerCookie)
      .send({
        turfId: testTurf._id,
        sportId: testSport._id,
        date: '2026-10-27',
        startTime: '16:00',
        endTime: '17:00',
        paymentMethod: 'pay_at_venue',
      })
      .expect(201)

    expect(bookingRes.body.success).toBe(true)
    const booking = bookingRes.body.data.booking
    expect(booking.bookingId).toMatch(/^TB-/)
    expect(booking.status).toBe('confirmed')
    expect(booking.slotPrice).toBe(70000) // base rate
    expect(booking.totalAmount).toBeGreaterThan(70000) // with GST

    // Slot should now show 'booked'
    const bookedCheck = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-10-27`)
      .expect(200)

    const slot16 = bookedCheck.body.data.slots.find((s) => s.startTime === '16:00')
    expect(slot16.status).toBe('booked')

    // Admin changes status to 'cancelled' -> Releases slot!
    const cancelRes = await request(app)
      .patch(`/api/v1/admin/bookings/${booking._id}/status`)
      .set('Cookie', adminCookie)
      .send({
        status: 'cancelled',
        cancellationReason: 'Customer requested reschedule',
      })
      .expect(200)

    expect(cancelRes.body.data.booking.status).toBe('cancelled')

    // Slot is released and becomes available again!
    const releasedCheck = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-10-27`)
      .expect(200)

    const slotReleased = releasedCheck.body.data.slots.find((s) => s.startTime === '16:00')
    expect(slotReleased.status).toBe('available')
  })

  it('provides dashboard metrics for today bookings, revenue, users, and free slots', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(res.body.success).toBe(true)
    const { metrics } = res.body.data
    expect(metrics).toHaveProperty('todayBookings')
    expect(metrics).toHaveProperty('todayRevenue')
    expect(metrics).toHaveProperty('totalUsers')
    expect(metrics).toHaveProperty('freeSlotsToday')
    expect(typeof metrics.freeSlotsToday).toBe('number')
  })
})
