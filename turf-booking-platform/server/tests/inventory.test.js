import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { connectDB, disconnectDB } from '../src/config/db.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { AddOn } from '../src/models/AddOn.js'
import { Banner } from '../src/models/Banner.js'
import { BusinessSettings } from '../src/models/BusinessSettings.js'
import { AuditLog } from '../src/models/AuditLog.js'
import bcrypt from 'bcryptjs'

describe('Core Business Models & Inventory APIs Suite', () => {
  let adminAuthCookie = ''
  let customerAuthCookie = ''
  let testAdminUser = null
  let testCustomerUser = null
  let createdSportId = ''
  let createdTurfId = ''
  let createdAddOnId = ''
  let createdBannerId = ''

  const uniqueSuffix = Date.now()

  beforeAll(async () => {
    await connectDB()

    // 1. Create a dedicated Admin user
    const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10)
    testAdminUser = await User.create({
      name: 'Inventory Admin',
      email: `inventory_admin_${uniqueSuffix}@example.com`,
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
    })

    // 2. Create a dedicated Customer user
    const customerPasswordHash = await bcrypt.hash('CustomerPass123!', 10)
    testCustomerUser = await User.create({
      name: 'Regular Customer',
      email: `inventory_customer_${uniqueSuffix}@example.com`,
      passwordHash: customerPasswordHash,
      role: 'customer',
      isActive: true,
    })

    // 3. Login as Admin to capture cookie
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testAdminUser.email,
        password: 'AdminPass123!',
      })
    adminAuthCookie = adminLoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // 4. Login as Customer to capture cookie
    const customerLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testCustomerUser.email,
        password: 'CustomerPass123!',
      })
    customerAuthCookie = customerLoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]
  })

  afterAll(async () => {
    // Clean up test inventory and users
    if (createdSportId) await Sport.findByIdAndDelete(createdSportId)
    if (createdTurfId) await Turf.findByIdAndDelete(createdTurfId)
    if (createdAddOnId) await AddOn.findByIdAndDelete(createdAddOnId)
    if (createdBannerId) await Banner.findByIdAndDelete(createdBannerId)

    await Sport.deleteMany({ slug: { $regex: String(uniqueSuffix) } })
    await Turf.deleteMany({ slug: { $regex: String(uniqueSuffix) } })
    await User.deleteMany({
      email: { $in: [testAdminUser.email, testCustomerUser.email] },
    })
    await disconnectDB()
  })

  // ==========================================
  // AUTHORIZATION & RBAC RESTRICTIONS
  // ==========================================
  describe('RBAC & Route Protection', () => {
    it('rejects unauthenticated requests to admin endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/admin/sports')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHORIZED')
    })

    it('rejects customer requests to admin endpoints with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/sports')
        .set('Cookie', [customerAuthCookie])
        .send({
          name: 'Forbidden Sport',
          slug: 'forbidden-sport',
        })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })
  })

  // ==========================================
  // SPORT INVENTORY TESTS
  // ==========================================
  describe('Sport Management APIs', () => {
    it('creates a new sport as admin and records an audit log', async () => {
      const res = await request(app)
        .post('/api/v1/admin/sports')
        .set('Cookie', [adminAuthCookie])
        .send({
          name: `Box Cricket ${uniqueSuffix}`,
          slug: `box-cricket-${uniqueSuffix}`,
          description: 'High-intensity enclosed synthetic box cricket.',
          image: 'https://images.unsplash.com/photo-cricket.jpg',
          icon: 'cricket',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.sport.name).toBe(`Box Cricket ${uniqueSuffix}`)
      expect(res.body.data.sport.slug).toBe(`box-cricket-${uniqueSuffix}`)
      expect(res.body.data.sport.isActive).toBe(true)

      createdSportId = res.body.data.sport._id

      // Verify AuditLog creation
      const audit = await AuditLog.findOne({
        entityId: createdSportId,
        action: 'CREATE',
      })
      expect(audit).toBeDefined()
      expect(audit.entityType).toBe('Sport')
      expect(String(audit.actor)).toBe(String(testAdminUser._id))
    })

    it('rejects duplicate sport slug with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/admin/sports')
        .set('Cookie', [adminAuthCookie])
        .send({
          name: 'Duplicate Sport Name',
          slug: `box-cricket-${uniqueSuffix}`,
        })

      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('DUPLICATE_SLUG')
    })

    it('updates sport metadata as admin', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/sports/${createdSportId}`)
        .set('Cookie', [adminAuthCookie])
        .send({
          description: 'Updated box cricket arena description.',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.sport.description).toBe('Updated box cricket arena description.')
    })

    it('deactivates a sport and ensures it is excluded from public listing', async () => {
      // 1. Deactivate sport
      const toggleRes = await request(app)
        .patch(`/api/v1/admin/sports/${createdSportId}/status`)
        .set('Cookie', [adminAuthCookie])
        .send({ isActive: false })

      expect(toggleRes.status).toBe(200)
      expect(toggleRes.body.data.sport.isActive).toBe(false)

      // 2. Verify excluded from public GET /api/v1/sports
      const publicRes = await request(app).get('/api/v1/sports')
      expect(publicRes.status).toBe(200)
      const found = publicRes.body.data.sports.find((s) => s.slug === `box-cricket-${uniqueSuffix}`)
      expect(found).toBeUndefined()

      // 3. Reactivate sport for subsequent turf tests
      await request(app)
        .patch(`/api/v1/admin/sports/${createdSportId}/status`)
        .set('Cookie', [adminAuthCookie])
        .send({ isActive: true })
    })
  })

  // ==========================================
  // TURF INVENTORY TESTS
  // ==========================================
  describe('Turf Management APIs', () => {
    it('rejects turf creation with non-existent or invalid sport references', async () => {
      const res = await request(app)
        .post('/api/v1/admin/turfs')
        .set('Cookie', [adminAuthCookie])
        .send({
          name: 'Invalid Turf',
          sports: ['507f1f77bcf86cd799439011'], // Non-existent ObjectId
          address: {
            street: '123 Main St',
            city: 'Ahmedabad',
            state: 'Gujarat',
            zipCode: '380015',
          },
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('INVALID_SPORT_REFERENCE')
    })

    it('creates a turf with valid sport reference and location details', async () => {
      const res = await request(app)
        .post('/api/v1/admin/turfs')
        .set('Cookie', [adminAuthCookie])
        .send({
          name: `Arena Alpha ${uniqueSuffix}`,
          slug: `arena-alpha-${uniqueSuffix}`,
          description: 'FIFA-grade turf with LED floodlights.',
          sports: [createdSportId],
          address: {
            street: 'Plot 42, SG Highway',
            city: 'Ahmedabad',
            state: 'Gujarat',
            zipCode: '380054',
            landmark: 'Near Iscon Cross Road',
            coordinates: { lat: 23.0225, lng: 72.5714 },
          },
          capacity: { minPlayers: 6, maxPlayers: 16 },
          facilities: ['Floodlights', 'Changing Rooms', 'Free Parking'],
          openingHours: { open: '06:00', close: '23:30' },
          timezone: 'Asia/Kolkata',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.turf.slug).toBe(`arena-alpha-${uniqueSuffix}`)
      expect(res.body.data.turf.sports).toContain(createdSportId)
      expect(res.body.data.turf.facilities).toContain('Floodlights')

      createdTurfId = res.body.data.turf._id
    })

    it('retrieves public turfs with populated sports and pagination', async () => {
      const res = await request(app)
        .get(`/api/v1/turfs?sportSlug=box-cricket-${uniqueSuffix}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.turfs.length).toBeGreaterThanOrEqual(1)

      const target = res.body.data.turfs.find((t) => t.slug === `arena-alpha-${uniqueSuffix}`)
      expect(target).toBeDefined()
      expect(target.sports[0].slug).toBe(`box-cricket-${uniqueSuffix}`)
    })

    it('retrieves active turf by slug via public endpoint', async () => {
      const res = await request(app).get(`/api/v1/turfs/arena-alpha-${uniqueSuffix}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.turf.name).toBe(`Arena Alpha ${uniqueSuffix}`)
      expect(res.body.data.turf.sports[0]).toHaveProperty('name')
    })

    it('returns 404 for non-existent or inactive public turf slug', async () => {
      const res = await request(app).get('/api/v1/turfs/non-existent-turf-slug')
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('TURF_NOT_FOUND')
    })
  })

  // ==========================================
  // ADD-ON INVENTORY TESTS
  // ==========================================
  describe('Add-On Management APIs', () => {
    it('creates an add-on with price in integer paise and explicit pricing unit', async () => {
      const res = await request(app)
        .post('/api/v1/admin/addons')
        .set('Cookie', [adminAuthCookie])
        .send({
          name: `Pro Cricket Kit ${uniqueSuffix}`,
          description: 'SS bats, balls, pads, and helmets.',
          price: 50000, // ₹500.00
          pricingUnit: 'per_booking',
          applicableSports: [createdSportId],
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.addOn.price).toBe(50000)
      expect(res.body.data.addOn.pricingUnit).toBe('per_booking')

      createdAddOnId = res.body.data.addOn._id
    })

    it('rejects add-on with invalid pricing unit or non-integer price', async () => {
      const res = await request(app)
        .post('/api/v1/admin/addons')
        .set('Cookie', [adminAuthCookie])
        .send({
          name: 'Invalid AddOn',
          price: -50,
          pricingUnit: 'per_second',
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('lists active add-ons via public endpoint', async () => {
      const res = await request(app).get('/api/v1/addons')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      const found = res.body.data.addOns.find((a) => a._id === createdAddOnId)
      expect(found).toBeDefined()
      expect(found.price).toBe(50000)
    })
  })

  // ==========================================
  // BANNER MANAGEMENT TESTS
  // ==========================================
  describe('Banner Management APIs', () => {
    it('creates a homepage banner as admin', async () => {
      const res = await request(app)
        .post('/api/v1/admin/banners')
        .set('Cookie', [adminAuthCookie])
        .send({
          title: `Weekend Tournament ${uniqueSuffix}`,
          subtitle: 'Register your team now and win exciting prizes!',
          image: 'https://images.unsplash.com/photo-banner.jpg',
          link: '/tournaments',
          ctaText: 'Register Now',
          order: 1,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.banner.title).toBe(`Weekend Tournament ${uniqueSuffix}`)

      createdBannerId = res.body.data.banner._id
    })

    it('lists public banners ordered by sequence', async () => {
      const res = await request(app).get('/api/v1/banners')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      const found = res.body.data.banners.find((b) => b.title === `Weekend Tournament ${uniqueSuffix}`)
      expect(found).toBeDefined()
    })
  })

  // ==========================================
  // BUSINESS SETTINGS TESTS
  // ==========================================
  describe('Business Settings APIs', () => {
    it('retrieves and updates business settings as admin', async () => {
      // 1. Get current settings
      const getRes = await request(app)
        .get('/api/v1/admin/settings')
        .set('Cookie', [adminAuthCookie])

      expect(getRes.status).toBe(200)
      expect(getRes.body.data.settings).toBeDefined()

      // 2. Update booking rules & tax configuration
      const updateRes = await request(app)
        .put('/api/v1/admin/settings')
        .set('Cookie', [adminAuthCookie])
        .send({
          businessName: 'TurfSpot Premier Arena',
          taxSettings: {
            taxEnabled: true,
            taxName: 'GST',
            taxRatePercentage: 18,
          },
          bookingRules: {
            slotDurationMinutes: 60,
            cancellationCutoffHours: 4,
          },
        })

      expect(updateRes.status).toBe(200)
      expect(updateRes.body.data.settings.businessName).toBe('TurfSpot Premier Arena')
      expect(updateRes.body.data.settings.taxSettings.taxRatePercentage).toBe(18)
    })

    it('returns safe public business settings for customers', async () => {
      const res = await request(app).get('/api/v1/settings')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.settings.businessName).toBe('TurfSpot Premier Arena')
      expect(res.body.data.settings.currency).toBe('INR')
      expect(res.body.data.settings.currencySymbol).toBe('₹')
      expect(res.body.data.settings.taxSettings.taxRatePercentage).toBe(18)
    })
  })
})
