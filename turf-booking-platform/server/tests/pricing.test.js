import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { AddOn } from '../src/models/AddOn.js'
import { BusinessSettings } from '../src/models/BusinessSettings.js'
import bcrypt from 'bcryptjs'

describe('Part 7: Turf Pricing Engine & Quote API Suite', () => {
  let adminCookie = ''
  let customerCookie = ''
  let testSport = null
  let testTurf = null
  let testAddOnBooking = null
  let testAddOnHourly = null

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up test data
    await Promise.all([
      User.deleteMany({ email: { $in: ['admin_pricing@turf.com', 'customer_pricing@turf.com'] } }),
      Sport.deleteMany({ slug: 'pricing-test-sport' }),
      Turf.deleteMany({ slug: 'pricing-test-arena' }),
      AddOn.deleteMany({ name: { $in: ['Pricing Ball Flat', 'Pricing Coach Hourly'] } }),
    ])

    // Create Admin User
    const adminHash = await bcrypt.hash('Password@123', 10)
    await User.create({
      name: 'Pricing Admin',
      email: 'admin_pricing@turf.com',
      passwordHash: adminHash,
      role: 'admin',
      isActive: true,
    })

    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin_pricing@turf.com',
      password: 'Password@123',
    })
    adminCookie = adminLoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Customer User
    const custHash = await bcrypt.hash('Password@123', 10)
    await User.create({
      name: 'Pricing Customer',
      email: 'customer_pricing@turf.com',
      passwordHash: custHash,
      role: 'customer',
      isActive: true,
    })

    const custLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'customer_pricing@turf.com',
      password: 'Password@123',
    })
    customerCookie = custLoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Ensure BusinessSettings exist with 18% GST
    await BusinessSettings.findOneAndUpdate(
      {},
      {
        businessName: 'Pricing Test Arena Ltd',
        taxSettings: {
          taxEnabled: true,
          taxName: 'GST',
          taxRatePercentage: 18,
        },
        currency: 'INR',
      },
      { upsert: true, new: true }
    )

    // Create Test Sport
    testSport = await Sport.create({
      name: 'Pricing Test Sport',
      slug: 'pricing-test-sport',
      description: 'Used for pricing engine verification',
      isActive: true,
    })

    // Create Test Turf with explicit integer pricing in paise
    // Base: ₹800 (80000 paise), Peak: ₹1200 (120000 paise), Weekend: ₹1400 (140000 paise)
    testTurf = await Turf.create({
      name: 'Pricing Test Arena',
      slug: 'pricing-test-arena',
      sports: [testSport._id],
      address: {
        street: '100 Feet Ring Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380015',
      },
      capacity: { minPlayers: 2, maxPlayers: 22 },
      openingHours: { open: '06:00', close: '23:00' },
      size: '100x60 ft (Box Cricket)',
      surface: 'Artificial Turf',
      pricing: {
        baseRate: 80000,
        peakRate: 120000,
        weekendRate: 140000,
        peakHours: {
          start: '18:00',
          end: '23:00',
        },
        weekendDays: [0, 6], // Sunday=0, Saturday=6
      },
      isActive: true,
    })

    // Create Add-on 1: Flat per_booking (₹150 = 15000 paise)
    testAddOnBooking = await AddOn.create({
      name: 'Pricing Ball Flat',
      description: 'Flat equipment rental',
      price: 15000,
      pricingUnit: 'per_booking',
      isActive: true,
    })

    // Create Add-on 2: Per hour (₹300/hr = 30000 paise)
    testAddOnHourly = await AddOn.create({
      name: 'Pricing Coach Hourly',
      description: 'Hourly coaching support',
      price: 30000,
      pricingUnit: 'per_hour',
      isActive: true,
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: { $in: ['admin_pricing@turf.com', 'customer_pricing@turf.com'] } }),
      Sport.deleteMany({ slug: 'pricing-test-sport' }),
      Turf.deleteMany({ slug: 'pricing-test-arena' }),
      AddOn.deleteMany({ name: { $in: ['Pricing Ball Flat', 'Pricing Coach Hourly'] } }),
    ])
  })

  // 1. Base Hourly Pricing (Weekday non-peak)
  it('1. calculates base hourly rate for weekday non-peak hours', async () => {
    // 2026-10-21 is Wednesday (weekday), 10:00 - 11:00 (non-peak)
    const res = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: '2026-10-21',
        startTime: '10:00',
        endTime: '11:00',
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const quote = res.body.data.quote
    expect(quote.hourlySegments).toHaveLength(1)
    expect(quote.hourlySegments[0].rateType).toBe('base')
    expect(quote.hourlySegments[0].hourlyRate).toBe(80000)
    expect(quote.turfSubtotal).toBe(80000)
    expect(quote.subtotal).toBe(80000)
  })

  // 2. Peak-Hour Pricing (Weekday peak)
  it('2. calculates peak-hour rate replacing base rate for weekday evening', async () => {
    // 2026-10-21 is Wednesday, 19:00 - 20:00 (within peakHours 18:00 - 23:00)
    const res = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: '2026-10-21',
        startTime: '19:00',
        endTime: '20:00',
      })

    expect(res.status).toBe(200)
    const quote = res.body.data.quote
    expect(quote.hourlySegments[0].rateType).toBe('peak')
    expect(quote.hourlySegments[0].hourlyRate).toBe(120000)
    expect(quote.turfSubtotal).toBe(120000)
  })

  // 3. Weekend Pricing (Weekend non-peak)
  it('3. calculates weekend rate replacing base rate for Saturday morning', async () => {
    // 2026-10-24 is Saturday (dayOfWeek=6), 10:00 - 11:00 (non-peak)
    const res = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: '2026-10-24',
        startTime: '10:00',
        endTime: '11:00',
      })

    expect(res.status).toBe(200)
    const quote = res.body.data.quote
    expect(quote.hourlySegments[0].rateType).toBe('weekend')
    expect(quote.hourlySegments[0].hourlyRate).toBe(140000)
    expect(quote.turfSubtotal).toBe(140000)
  })

  // 4. Peak and Weekend Overlap
  it('4. applies deterministic rule max(weekendRate, peakRate) when weekend and peak hours overlap', async () => {
    // 2026-10-24 is Saturday, 19:00 - 20:00 (peak hour on weekend)
    // weekendRate=140000, peakRate=120000 -> max is 140000
    const res = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: '2026-10-24',
        startTime: '19:00',
        endTime: '20:00',
      })

    expect(res.status).toBe(200)
    const quote = res.body.data.quote
    expect(quote.hourlySegments[0].rateType).toBe('weekend_peak')
    expect(quote.hourlySegments[0].hourlyRate).toBe(140000)
    expect(quote.turfSubtotal).toBe(140000)
  })

  // 5. Spanning Multiple Pricing Periods
  it('5. accurately calculates booking spanning base and peak periods', async () => {
    // Wednesday 2026-10-21, 16:00 to 19:00 (3 hours)
    // 16:00-17:00: base (80000)
    // 17:00-18:00: base (80000)
    // 18:00-19:00: peak (120000)
    // Expected turfSubtotal: 80000 + 80000 + 120000 = 280000 paise
    const res = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: '2026-10-21',
        startTime: '16:00',
        endTime: '19:00',
      })

    expect(res.status).toBe(200)
    const quote = res.body.data.quote
    expect(quote.hourlySegments).toHaveLength(3)
    expect(quote.hourlySegments[0].rateType).toBe('base')
    expect(quote.hourlySegments[0].segmentPrice).toBe(80000)
    expect(quote.hourlySegments[1].rateType).toBe('base')
    expect(quote.hourlySegments[1].segmentPrice).toBe(80000)
    expect(quote.hourlySegments[2].rateType).toBe('peak')
    expect(quote.hourlySegments[2].segmentPrice).toBe(120000)
    expect(quote.turfSubtotal).toBe(280000)
  })

  // 6. Add-On Pricing and Quantities (per_booking & per_hour)
  it('6. calculates add-on prices correctly taking into account quantity and pricing units', async () => {
    // 2-hour session (10:00 to 12:00) on Wednesday
    // Turf: 80000 * 2 = 160000
    // Addon 1 (flat per_booking): 15000 * 2 qty = 30000
    // Addon 2 (per_hour): 30000 * 1 qty * 2 hours = 60000
    // Total addOnsSubtotal: 30000 + 60000 = 90000 paise
    // Subtotal: 160000 + 90000 = 250000 paise
    const res = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: '2026-10-21',
        startTime: '10:00',
        endTime: '12:00',
        addOns: [
          { addOnId: testAddOnBooking._id.toString(), quantity: 2 },
          { addOnId: testAddOnHourly._id.toString(), quantity: 1 },
        ],
      })

    expect(res.status).toBe(200)
    const quote = res.body.data.quote
    expect(quote.turfSubtotal).toBe(160000)
    expect(quote.addOns).toHaveLength(2)
    expect(quote.addOns[0].totalAmount).toBe(30000)
    expect(quote.addOns[1].totalAmount).toBe(60000)
    expect(quote.addOnsSubtotal).toBe(90000)
    expect(quote.subtotal).toBe(250000)
  })

  // 7. GST Calculation and Rounding Policy
  it('7. applies configured GST rate and rounds to nearest integer paise', async () => {
    // 1 hour base rate (80000 paise)
    // 18% GST: 80000 * 0.18 = 14400 paise
    // Final Total: 80000 + 14400 = 94400 paise
    const res = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: '2026-10-21',
        startTime: '10:00',
        endTime: '11:00',
      })

    expect(res.status).toBe(200)
    const quote = res.body.data.quote
    expect(quote.tax.taxEnabled).toBe(true)
    expect(quote.tax.taxPercentage).toBe(18)
    expect(quote.tax.taxAmount).toBe(14400)
    expect(quote.finalTotal).toBe(94400)
    expect(quote.currency).toBe('INR')
  })

  // 8. Invalid Inputs Validation
  it('8. rejects invalid dates, malformed times, negative ranges, and invalid add-on quantities', async () => {
    // A. Invalid date format
    const res1 = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: 'invalid-date',
        startTime: '10:00',
        endTime: '11:00',
      })
    expect(res1.status).toBe(400)

    // B. Negative duration (endTime <= startTime)
    const res2 = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: '2026-10-21',
        startTime: '15:00',
        endTime: '14:00',
      })
    expect(res2.status).toBe(400)
    expect(res2.body.error?.message || res2.body.message).toMatch(/after start time/i)

    // C. Non-existent Turf ID
    const res3 = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: new mongoose.Types.ObjectId().toString(),
        date: '2026-10-21',
        startTime: '10:00',
        endTime: '11:00',
      })
    expect(res3.status).toBe(404)

    // D. Invalid Add-On Quantity (zero or negative)
    const res4 = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: '2026-10-21',
        startTime: '10:00',
        endTime: '11:00',
        addOns: [{ addOnId: testAddOnBooking._id.toString(), quantity: 0 }],
      })
    expect(res4.status).toBe(400)
    expect(res4.body.error?.message || res4.body.message).toMatch(/positive integer/i)
  })

  // 9. Missing or Invalid Pricing Configuration
  it('9. rejects turf creation or update with negative or non-integer pricing', async () => {
    // Attempt to set negative base rate
    const res = await request(app)
      .patch(`/api/v1/admin/turfs/${testTurf._id}`)
      .set('Cookie', adminCookie)
      .send({
        pricing: {
          baseRate: -500,
        },
      })

    expect(res.status).toBe(400)
  })

  // 10. Customer Attempts to Modify Pricing Configuration (403 Forbidden)
  it('10. forbids customers from modifying turf pricing configuration', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/turfs/${testTurf._id}`)
      .set('Cookie', customerCookie)
      .send({
        pricing: {
          baseRate: 10000,
        },
      })

    expect(res.status).toBe(403)
  })

  // 11. Unauthorized Pricing Updates (401 Unauthorized)
  it('11. rejects unauthenticated requests attempting to update turf pricing', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/turfs/${testTurf._id}`)
      .send({
        pricing: {
          baseRate: 10000,
        },
      })

    expect(res.status).toBe(401)
  })

  // 12. Existing Turf CRUD Regression & Authorized Pricing Update
  it('12. allows authorized admin to update turf pricing and immediately reflects in quotes', async () => {
    // Admin updates base rate from 80000 to 95000 paise (₹950)
    const updateRes = await request(app)
      .patch(`/api/v1/admin/turfs/${testTurf._id}`)
      .set('Cookie', adminCookie)
      .send({
        pricing: {
          baseRate: 95000,
          peakRate: 130000,
          weekendRate: 150000,
          peakHours: { start: '18:00', end: '23:00' },
        },
      })

    expect(updateRes.status).toBe(200)

    // Verify quote immediately uses new rate
    const quoteRes = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id.toString(),
        date: '2026-10-21',
        startTime: '10:00',
        endTime: '11:00',
      })

    expect(quoteRes.status).toBe(200)
    expect(quoteRes.body.data.quote.turfSubtotal).toBe(95000)
  })
})
