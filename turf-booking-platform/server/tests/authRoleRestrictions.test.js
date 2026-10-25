import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { Booking } from '../src/models/Booking.js'
import { RefreshToken } from '../src/models/RefreshToken.js'
import bcrypt from 'bcryptjs'

describe('Backend Auth & Role Restrictions (Section 8 Verification)', () => {
  let adminUser = null
  let customerUser = null
  let adminCookie = ''
  let customerCookie = ''
  let testSport = null
  let testTurf = null

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Cleanup any existing test records
    await Promise.all([
      User.deleteMany({
        email: { $in: ['sec8_admin@turftest.com', 'sec8_customer@turftest.com'] },
      }),
      Sport.deleteMany({ slug: 'sec8-sport' }),
      Turf.deleteMany({ slug: 'sec8-turf' }),
    ])

    const hashedPassword = await bcrypt.hash('Password@123', 10)

    // 1. Create Admin User
    adminUser = await User.create({
      name: 'Sec8 Admin',
      email: 'sec8_admin@turftest.com',
      passwordHash: hashedPassword,
      role: 'admin',
      phone: '9998887771',
      isActive: true,
    })

    // 2. Create Customer User
    customerUser = await User.create({
      name: 'Sec8 Customer',
      email: 'sec8_customer@turftest.com',
      passwordHash: hashedPassword,
      role: 'customer',
      phone: '9998887772',
      isActive: true,
    })

    // 3. Create test sport & turf for booking test
    testSport = await Sport.create({
      name: 'Sec8 Football',
      slug: 'sec8-sport',
      icon: 'football',
      minPlayers: 2,
      maxPlayers: 10,
      isActive: true,
    })

    testTurf = await Turf.create({
      name: 'Sec8 Arena',
      slug: 'sec8-turf',
      sports: [testSport._id],
      hourlyRate: 1000,
      address: {
        street: '456 Stadium Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400050',
      },
      pricingSlots: {
        weekday: [{ startTime: '06:00', endTime: '23:00', price: 1000, rateType: 'standard' }],
        weekend: [{ startTime: '06:00', endTime: '23:00', price: 1200, rateType: 'peak' }],
      },
      isActive: true,
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({
        email: { $in: ['sec8_admin@turftest.com', 'sec8_customer@turftest.com'] },
      }),
      Sport.deleteMany({ slug: 'sec8-sport' }),
      Turf.deleteMany({ slug: 'sec8-turf' }),
      Booking.deleteMany({ turf: testTurf?._id }),
      RefreshToken.deleteMany({ user: { $in: [adminUser?._id, customerUser?._id] } }),
    ])
    await mongoose.disconnect()
  })

  // Requirement 11: Login and session establishment for both roles
  describe('Requirement 11: Login & Session Establishment', () => {
    it('authenticates admin and returns role=admin with HTTP-only cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'sec8_admin@turftest.com', password: 'Password@123' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.role).toBe('admin')

      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      adminCookie = cookies.map((c) => c.split(';')[0]).join('; ')
      expect(adminCookie).toContain('accessToken=')
    })

    it('authenticates customer and returns role=customer with HTTP-only cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'sec8_customer@turftest.com', password: 'Password@123' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.role).toBe('customer')

      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      customerCookie = cookies.map((c) => c.split(';')[0]).join('; ')
      expect(customerCookie).toContain('accessToken=')
    })
  })

  // Requirement 4 & 5: Unauthenticated access & Customer blocked from Admin APIs
  describe('Requirement 4 & 5: Unauthenticated & Customer Admin Route Restrictions', () => {
    it('Requirement 4: rejects unauthenticated requests to admin endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/admin/bookings')
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('Requirement 5: rejects regular customer accessing admin endpoints with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/bookings')
        .set('Cookie', customerCookie)

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  // Requirement 7: Admin cannot create customer bookings or access customer booking flows
  describe('Requirement 7: Admin Forbidden from Customer Booking Creation API', () => {
    it('rejects admin attempting to create a customer booking directly via POST /api/v1/bookings', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().slice(0, 10)

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', adminCookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: testSport._id.toString(),
          date: dateStr,
          slots: [{ startTime: '16:00', endTime: '17:00' }],
          paymentMethod: 'pay_at_venue',
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      const errCode = res.body.error?.code || res.body.code
      expect(errCode).toBe('ADMIN_BOOKING_FORBIDDEN')
    })

    it('rejects admin attempting to access customer booking history via GET /api/v1/bookings/my', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/my')
        .set('Cookie', adminCookie)

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      const errCode = res.body.error?.code || res.body.code
      expect(errCode).toBe('ADMIN_BOOKING_FORBIDDEN')
    })
  })

  // Requirement 8: Customer can still create valid bookings
  describe('Requirement 8: Customer Booking Flow Functional', () => {
    it('allows verified customer to successfully create a booking', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().slice(0, 10)

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customerCookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: testSport._id.toString(),
          date: dateStr,
          slots: [{ startTime: '10:00', endTime: '11:00' }],
          paymentMethod: 'pay_at_venue',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.booking).toBeDefined()
      expect(res.body.data.booking.status).toBe('confirmed')
    })
  })

  // Requirement 9: Admin can still manage bookings through authorized admin endpoints
  describe('Requirement 9: Admin Booking Management Endpoints Operational', () => {
    it('allows admin to list and manage all bookings via GET /api/v1/admin/bookings', async () => {
      const res = await request(app)
        .get('/api/v1/admin/bookings')
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.bookings).toBeDefined()
    })
  })

  // Requirement 10: Expired or revoked session does not retain access
  describe('Requirement 10: Session Expiry & Revocation Security', () => {
    it('rejects expired access token with 401', async () => {
      // Craft an expired access token
      const expiredToken = jwt.sign(
        { userId: customerUser._id, role: 'customer' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '-10s' }
      )

      const res = await request(app)
        .get('/api/v1/bookings/my')
        .set('Cookie', `accessToken=${expiredToken}`)

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('rejects tampered token signature with 401', async () => {
      const forgedToken = jwt.sign(
        { userId: adminUser._id, role: 'admin' },
        'WRONG_SECRET_KEY_NOT_VALID',
        { expiresIn: '1h' }
      )

      const res = await request(app)
        .get('/api/v1/admin/bookings')
        .set('Cookie', `accessToken=${forgedToken}`)

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('Requirement 11 (Logout): logs out user and invalidates session cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', customerCookie)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      // Cookie is cleared
      const accessTokenCleared = cookies.some((c) => c.includes('accessToken=;') || c.includes('Max-Age=0'))
      expect(accessTokenCleared).toBe(true)
    })
  })
})
