import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { Booking } from '../src/models/Booking.js'
import bcrypt from 'bcryptjs'

describe('Admin Customer Management & Analytics API Suite', () => {
  let adminCookie = ''
  let customerCookie = ''
  let adminUser = null
  let customerUser1 = null
  let customerUser2 = null
  let testSport = null
  let testTurf = null
  let testBooking = null

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up past test users
    await Promise.all([
      User.deleteMany({
        email: {
          $in: [
            'admin_cust_suite@turf.com',
            'customer_cust_suite1@turf.com',
            'customer_cust_suite2@turf.com',
          ],
        },
      }),
      Sport.deleteMany({ slug: 'cust-test-sport' }),
      Turf.deleteMany({ slug: 'cust-test-arena' }),
    ])

    const hashedPassword = await bcrypt.hash('Password@123', 10)

    // 1. Create Admin
    adminUser = await User.create({
      name: 'Super Admin Cust',
      email: 'admin_cust_suite@turf.com',
      passwordHash: hashedPassword,
      role: 'admin',
      phone: '9999911111',
    })

    // 2. Create Customers
    customerUser1 = await User.create({
      name: 'Alex Johnson',
      email: 'customer_cust_suite1@turf.com',
      passwordHash: hashedPassword,
      role: 'customer',
      phone: '9888822221',
      isActive: true,
    })

    customerUser2 = await User.create({
      name: 'Sam Wilson',
      email: 'customer_cust_suite2@turf.com',
      passwordHash: hashedPassword,
      role: 'customer',
      phone: '9888822222',
      isActive: true,
    })

    // Log in admin to get cookie
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin_cust_suite@turf.com', password: 'Password@123' })
    adminCookie = adminLoginRes.headers['set-cookie']

    // Log in customer to test unauthorized access
    const customerLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'customer_cust_suite1@turf.com', password: 'Password@123' })
    customerCookie = customerLoginRes.headers['set-cookie']

    // 3. Create test sport & turf
    testSport = await Sport.create({
      name: 'Cust Test Sport',
      slug: 'cust-test-sport',
      icon: 'activity',
      pricing: { defaultBasePricePerHour: 1000 },
    })

    testTurf = await Turf.create({
      name: 'Cust Test Arena',
      slug: 'cust-test-arena',
      sports: [testSport._id],
      hourlyRate: 1000,
      address: {
        street: '123 Arena Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
      },
      pricingSlots: {
        weekday: [{ startTime: '06:00', endTime: '23:00', price: 1000, rateType: 'standard' }],
        weekend: [{ startTime: '06:00', endTime: '23:00', price: 1200, rateType: 'peak' }],
      },
    })

    // 4. Create sample booking for customerUser1
    testBooking = await Booking.create({
      bookingId: 'BK-CUST-TEST-1',
      user: customerUser1._id,
      turf: testTurf._id,
      sport: testSport._id,
      date: '2026-10-25',
      startTime: '10:00',
      endTime: '11:00',
      selectedSlots: ['10:00-11:00'],
      slotPrice: 120000,
      subtotal: 120000,
      totalAmount: 120000,
      status: 'confirmed',
      paymentStatus: 'paid',
      contactDetails: {
        name: customerUser1.name,
        email: customerUser1.email,
        phone: customerUser1.phone,
      },
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({
        email: {
          $in: [
            'admin_cust_suite@turf.com',
            'customer_cust_suite1@turf.com',
            'customer_cust_suite2@turf.com',
          ],
        },
      }),
      Booking.deleteMany({ bookingId: 'BK-CUST-TEST-1' }),
      Sport.deleteMany({ slug: 'cust-test-sport' }),
      Turf.deleteMany({ slug: 'cust-test-arena' }),
    ])
  })

  it('rejects unauthenticated requests to customer analytics', async () => {
    const res = await request(app).get('/api/v1/admin/customers/analytics')
    expect(res.status).toBe(401)
  })

  it('rejects regular customer requests to customer analytics with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/customers/analytics')
      .set('Cookie', customerCookie)
    expect(res.status).toBe(403)
  })

  it('returns comprehensive customer analytics to admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/customers/analytics')
      .set('Cookie', adminCookie)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('overview')
    expect(res.body.data.overview.totalRegistered).toBeGreaterThanOrEqual(2)
    expect(res.body.data.overview.activeCustomers).toBeGreaterThanOrEqual(1)
    expect(res.body.data).toHaveProperty('financials')
    expect(res.body.data).toHaveProperty('distribution')
    expect(res.body.data).toHaveProperty('signupTrend')
    expect(Array.isArray(res.body.data.topSpenders)).toBe(true)
  })

  it('retrieves paginated customer list with aggregated booking stats', async () => {
    const res = await request(app)
      .get('/api/v1/admin/customers?search=Alex&page=1&limit=10')
      .set('Cookie', adminCookie)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.customers).toBeInstanceOf(Array)
    expect(res.body.data.customers.length).toBeGreaterThanOrEqual(1)

    const alex = res.body.data.customers.find((c) => c.email === 'customer_cust_suite1@turf.com')
    expect(alex).toBeDefined()
    expect(alex.totalBookings).toBeGreaterThanOrEqual(1)
    expect(alex.totalSpent).toBeGreaterThanOrEqual(1200)
    expect(alex).not.toHaveProperty('passwordHash')
  })

  it('retrieves a single customer detail with booking history', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/customers/${customerUser1._id}`)
      .set('Cookie', adminCookie)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('customer')
    expect(res.body.data.customer.email).toBe('customer_cust_suite1@turf.com')
    expect(res.body.data).toHaveProperty('stats')
    expect(res.body.data.stats.totalBookings).toBeGreaterThanOrEqual(1)
    expect(res.body.data.recentBookings).toBeInstanceOf(Array)
    expect(res.body.data.recentBookings.length).toBeGreaterThanOrEqual(1)
  })

  it('toggles customer account status (suspend/activate)', async () => {
    // Suspend
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/customers/${customerUser2._id}/status`)
      .set('Cookie', adminCookie)
      .send({ isActive: false })

    expect(suspendRes.status).toBe(200)
    expect(suspendRes.body.success).toBe(true)
    expect(suspendRes.body.data.customer.isActive).toBe(false)

    // Re-activate
    const activateRes = await request(app)
      .patch(`/api/v1/admin/customers/${customerUser2._id}/status`)
      .set('Cookie', adminCookie)
      .send({ isActive: true })

    expect(activateRes.status).toBe(200)
    expect(activateRes.body.success).toBe(true)
    expect(activateRes.body.data.customer.isActive).toBe(true)
  })
})
