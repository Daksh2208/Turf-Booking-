import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { Booking } from '../src/models/Booking.js'
import { SlotReservation } from '../src/models/SlotReservation.js'
import { Coupon } from '../src/models/Coupon.js'
import { CouponRedemption } from '../src/models/CouponRedemption.js'
import { BusinessSettings } from '../src/models/BusinessSettings.js'
import couponService from '../src/services/coupon.service.js'
import bcrypt from 'bcryptjs'

describe('Part 12: Production Coupon Code System Tests', () => {
  let adminCookie = ''
  let customer1Cookie = ''
  let customer2Cookie = ''
  let adminUser = null
  let customer1 = null
  let customer2 = null
  let testSport1 = null
  let testSport2 = null
  let testTurf1 = null
  let testTurf2 = null

  const TEST_DATE = '2026-11-20'

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up test data
    await Promise.all([
      User.deleteMany({
        email: {
          $in: [
            'coupon_admin@turf.com',
            'coupon_cust1@turf.com',
            'coupon_cust2@turf.com',
            'coupon_cust3@turf.com',
          ],
        },
      }),
      Sport.deleteMany({ slug: { $in: ['coupon-sport-1', 'coupon-sport-2'] } }),
      Turf.deleteMany({ slug: { $in: ['coupon-turf-1', 'coupon-turf-2'] } }),
      Coupon.deleteMany({ code: { $regex: /^TEST/ } }),
      CouponRedemption.deleteMany({}),
      Booking.deleteMany({ date: TEST_DATE }),
      SlotReservation.deleteMany({ date: TEST_DATE }),
    ])

    // 1. Create Admin
    const adminHash = await bcrypt.hash('Password@123', 10)
    adminUser = await User.create({
      name: 'Coupon Admin',
      email: 'coupon_admin@turf.com',
      passwordHash: adminHash,
      role: 'admin',
      isActive: true,
    })

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'coupon_admin@turf.com',
      password: 'Password@123',
    })
    adminCookie = adminLogin.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // 2. Create Customer 1
    const cust1Hash = await bcrypt.hash('Password@123', 10)
    customer1 = await User.create({
      name: 'Coupon Customer 1',
      email: 'coupon_cust1@turf.com',
      phone: '9876543210',
      passwordHash: cust1Hash,
      role: 'customer',
      isActive: true,
    })

    const cust1Login = await request(app).post('/api/v1/auth/login').send({
      email: 'coupon_cust1@turf.com',
      password: 'Password@123',
    })
    customer1Cookie = cust1Login.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // 3. Create Customer 2
    const cust2Hash = await bcrypt.hash('Password@123', 10)
    customer2 = await User.create({
      name: 'Coupon Customer 2',
      email: 'coupon_cust2@turf.com',
      phone: '9876543211',
      passwordHash: cust2Hash,
      role: 'customer',
      isActive: true,
    })

    const cust2Login = await request(app).post('/api/v1/auth/login').send({
      email: 'coupon_cust2@turf.com',
      password: 'Password@123',
    })
    customer2Cookie = cust2Login.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // 4. Set GST to 18%
    await BusinessSettings.findOneAndUpdate(
      {},
      {
        businessName: 'Coupon Test Arena',
        taxSettings: {
          taxEnabled: true,
          taxName: 'GST',
          taxRatePercentage: 18,
        },
        currency: 'INR',
      },
      { upsert: true, new: true }
    )

    // 5. Create Test Sports
    testSport1 = await Sport.create({
      name: 'Coupon Cricket',
      slug: 'coupon-sport-1',
      isActive: true,
    })

    testSport2 = await Sport.create({
      name: 'Coupon Football',
      slug: 'coupon-sport-2',
      isActive: true,
    })

    // 6. Create Test Turfs (₹1000 base rate = 100000 paise)
    testTurf1 = await Turf.create({
      name: 'Coupon Arena Alpha',
      slug: 'coupon-turf-1',
      sports: [testSport1._id],
      address: {
        street: '123 Ring Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380015',
      },
      capacity: { minPlayers: 2, maxPlayers: 22 },
      openingHours: { open: '06:00', close: '23:00' },
      size: '100x60 ft',
      surface: 'Turf',
      pricing: {
        baseRate: 100000,
        peakRate: 100000,
        weekendRate: 100000,
        slotPricingOverrides: [],
      },
      isActive: true,
    })

    testTurf2 = await Turf.create({
      name: 'Coupon Arena Beta',
      slug: 'coupon-turf-2',
      sports: [testSport2._id],
      address: {
        street: '456 SG Highway',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380054',
      },
      capacity: { minPlayers: 2, maxPlayers: 22 },
      openingHours: { open: '06:00', close: '23:00' },
      size: '80x40 ft',
      surface: 'Turf',
      pricing: {
        baseRate: 100000,
        peakRate: 100000,
        weekendRate: 100000,
        slotPricingOverrides: [],
      },
      isActive: true,
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({
        email: {
          $in: [
            'coupon_admin@turf.com',
            'coupon_cust1@turf.com',
            'coupon_cust2@turf.com',
            'coupon_cust3@turf.com',
          ],
        },
      }),
      Sport.deleteMany({ slug: { $in: ['coupon-sport-1', 'coupon-sport-2'] } }),
      Turf.deleteMany({ slug: { $in: ['coupon-turf-1', 'coupon-turf-2'] } }),
      Coupon.deleteMany({ code: { $regex: /^TEST/ } }),
      CouponRedemption.deleteMany({}),
      Booking.deleteMany({ date: TEST_DATE }),
      SlotReservation.deleteMany({ date: TEST_DATE }),
    ])
  })

  // ==========================================
  // Section A: Admin CRUD & Security
  // ==========================================
  describe('Admin Coupon CRUD & Authorization', () => {
    it('blocks unauthenticated access to admin coupon endpoints', async () => {
      const res = await request(app).get('/api/v1/admin/coupons')
      expect(res.status).toBe(401)
    })

    it('blocks customer from accessing admin coupon endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/coupons')
        .set('Cookie', customer1Cookie)
      expect(res.status).toBe(403)
    })

    it('allows admin to create a valid percentage coupon and normalizes code to uppercase', async () => {
      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Cookie', adminCookie)
        .send({
          code: 'test_percent20',
          description: '20% off promotion',
          discountType: 'percentage',
          discountValue: 20,
          minimumBookingAmount: 50000, // ₹500
          maximumDiscountAmount: 30000, // ₹300 cap
          usageLimit: 50,
          perUserLimit: 2,
          isActive: true,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.coupon.code).toBe('TEST_PERCENT20')
      expect(res.body.data.coupon.discountValue).toBe(20)
    })

    it('rejects duplicate coupon code with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Cookie', adminCookie)
        .send({
          code: 'TEST_PERCENT20',
          discountType: 'percentage',
          discountValue: 15,
        })

      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('DUPLICATE_COUPON_CODE')
    })

    it('allows admin to list coupons with search and pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/coupons?search=PERCENT20')
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)
      expect(res.body.data.coupons.length).toBeGreaterThanOrEqual(1)
      expect(res.body.data.coupons[0].code).toBe('TEST_PERCENT20')
    })

    it('allows admin to update coupon fields', async () => {
      const coupon = await Coupon.findOne({ code: 'TEST_PERCENT20' })
      const res = await request(app)
        .put(`/api/v1/admin/coupons/${coupon._id}`)
        .set('Cookie', adminCookie)
        .send({
          description: 'Updated 20% off promotion description',
          maximumDiscountAmount: 40000,
        })

      expect(res.status).toBe(200)
      expect(res.body.data.coupon.description).toBe('Updated 20% off promotion description')
      expect(res.body.data.coupon.maximumDiscountAmount).toBe(40000)
    })

    it('allows admin to toggle active/inactive status', async () => {
      const coupon = await Coupon.findOne({ code: 'TEST_PERCENT20' })
      const res = await request(app)
        .patch(`/api/v1/admin/coupons/${coupon._id}/status`)
        .set('Cookie', adminCookie)
        .send({ isActive: false })

      expect(res.status).toBe(200)
      expect(res.body.data.coupon.isActive).toBe(false)

      // Re-activate for further tests
      await Coupon.findByIdAndUpdate(coupon._id, { isActive: true })
    })

    it('safely handles deletion of unredeemed coupons by removing them', async () => {
      const tempCoupon = await Coupon.create({
        code: 'TEST_TEMP_DEL',
        discountType: 'fixed',
        discountValue: 10000,
        isActive: true,
      })

      const res = await request(app)
        .delete(`/api/v1/admin/coupons/${tempCoupon._id}`)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)
      const found = await Coupon.findById(tempCoupon._id)
      expect(found).toBeNull()
    })
  })

  // ==========================================
  // Section B: Validation Rules & Edge Cases
  // ==========================================
  describe('Coupon Validation Service Rules & Calculations', () => {
    beforeAll(async () => {
      // Create test coupons for rules
      await Promise.all([
        Coupon.create({
          code: 'TEST_FIXED150',
          discountType: 'fixed',
          discountValue: 15000, // ₹150 in paise
          minimumBookingAmount: 50000, // ₹500
          isActive: true,
        }),
        Coupon.create({
          code: 'TEST_MAXCAP',
          discountType: 'percentage',
          discountValue: 50, // 50%
          maximumDiscountAmount: 20000, // max ₹200
          minimumBookingAmount: 0,
          isActive: true,
        }),
        Coupon.create({
          code: 'TEST_EXPIRED',
          discountType: 'fixed',
          discountValue: 10000,
          expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
          isActive: true,
        }),
        Coupon.create({
          code: 'TEST_SCHEDULED',
          discountType: 'fixed',
          discountValue: 10000,
          startAt: new Date(Date.now() + 86400000), // tomorrow
          isActive: true,
        }),
        Coupon.create({
          code: 'TEST_INACTIVE',
          discountType: 'fixed',
          discountValue: 10000,
          isActive: false,
        }),
        Coupon.create({
          code: 'TEST_SPORT_RESTRICTED',
          discountType: 'fixed',
          discountValue: 10000,
          eligibleSports: [testSport1._id],
          isActive: true,
        }),
        Coupon.create({
          code: 'TEST_TURF_RESTRICTED',
          discountType: 'fixed',
          discountValue: 10000,
          eligibleTurfs: [testTurf1._id],
          isActive: true,
        }),
      ])
    })

    it('calculates percentage discount accurately without cap exceeding', async () => {
      // Subtotal = ₹1000 (100000 paise), 20% = ₹200 (20000 paise)
      const calc = await couponService.validateAndCalculateDiscount({
        couponCode: 'TEST_PERCENT20',
        preDiscountSubtotal: 100000,
        user: customer1,
      })

      expect(calc.discountAmount).toBe(20000)
      expect(calc.discountType).toBe('percentage')
    })

    it('enforces maximum discount cap for percentage coupon', async () => {
      // Subtotal = ₹1000 (100000 paise), 50% = ₹500 (50000 paise), but cap is ₹200 (20000 paise)
      const calc = await couponService.validateAndCalculateDiscount({
        couponCode: 'TEST_MAXCAP',
        preDiscountSubtotal: 100000,
        user: customer1,
      })

      expect(calc.discountAmount).toBe(20000) // Capped at ₹200
    })

    it('calculates fixed discount accurately and caps at subtotal to prevent negative totals', async () => {
      // Subtotal = ₹1000 (100000 paise), fixed ₹150 (15000 paise)
      const calc = await couponService.validateAndCalculateDiscount({
        couponCode: 'TEST_FIXED150',
        preDiscountSubtotal: 100000,
        user: customer1,
      })

      expect(calc.discountAmount).toBe(15000)

      // Extreme case: fixed discount larger than subtotal
      const smallSubtotalCalc = await couponService.validateAndCalculateDiscount({
        couponCode: 'TEST_FIXED150',
        preDiscountSubtotal: 10000, // ₹100
        user: customer1,
      }).catch((e) => e)

      // Should fail minimum booking amount (min ₹500)
      expect(smallSubtotalCalc.code).toBe('COUPON_MINIMUM_NOT_MET')
    })

    it('rejects coupon when booking subtotal is below minimum amount', async () => {
      await expect(
        couponService.validateAndCalculateDiscount({
          couponCode: 'TEST_FIXED150',
          preDiscountSubtotal: 30000, // ₹300 < ₹500 min
          user: customer1,
        })
      ).rejects.toMatchObject({
        code: 'COUPON_MINIMUM_NOT_MET',
      })
    })

    it('rejects expired coupon', async () => {
      await expect(
        couponService.validateAndCalculateDiscount({
          couponCode: 'TEST_EXPIRED',
          preDiscountSubtotal: 100000,
          user: customer1,
        })
      ).rejects.toMatchObject({
        code: 'COUPON_EXPIRED',
      })
    })

    it('rejects scheduled (not-yet-started) coupon', async () => {
      await expect(
        couponService.validateAndCalculateDiscount({
          couponCode: 'TEST_SCHEDULED',
          preDiscountSubtotal: 100000,
          user: customer1,
        })
      ).rejects.toMatchObject({
        code: 'COUPON_NOT_STARTED',
      })
    })

    it('rejects inactive coupon', async () => {
      await expect(
        couponService.validateAndCalculateDiscount({
          couponCode: 'TEST_INACTIVE',
          preDiscountSubtotal: 100000,
          user: customer1,
        })
      ).rejects.toMatchObject({
        code: 'COUPON_INACTIVE',
      })
    })

    it('rejects nonexistent coupon code', async () => {
      await expect(
        couponService.validateAndCalculateDiscount({
          couponCode: 'NONEXISTENT999',
          preDiscountSubtotal: 100000,
          user: customer1,
        })
      ).rejects.toMatchObject({
        code: 'COUPON_NOT_FOUND',
      })
    })

    it('enforces sport eligibility restriction', async () => {
      // Ineligible sport (testSport2)
      await expect(
        couponService.validateAndCalculateDiscount({
          couponCode: 'TEST_SPORT_RESTRICTED',
          preDiscountSubtotal: 100000,
          sportId: testSport2._id,
          user: customer1,
        })
      ).rejects.toMatchObject({
        code: 'COUPON_SPORT_NOT_ELIGIBLE',
      })

      // Eligible sport (testSport1)
      const valid = await couponService.validateAndCalculateDiscount({
        couponCode: 'TEST_SPORT_RESTRICTED',
        preDiscountSubtotal: 100000,
        sportId: testSport1._id,
        user: customer1,
      })
      expect(valid.discountAmount).toBe(10000)
    })

    it('enforces turf eligibility restriction', async () => {
      // Ineligible turf (testTurf2)
      await expect(
        couponService.validateAndCalculateDiscount({
          couponCode: 'TEST_TURF_RESTRICTED',
          preDiscountSubtotal: 100000,
          turfId: testTurf2._id,
          user: customer1,
        })
      ).rejects.toMatchObject({
        code: 'COUPON_TURF_NOT_ELIGIBLE',
      })

      // Eligible turf (testTurf1)
      const valid = await couponService.validateAndCalculateDiscount({
        couponCode: 'TEST_TURF_RESTRICTED',
        preDiscountSubtotal: 100000,
        turfId: testTurf1._id,
        user: customer1,
      })
      expect(valid.discountAmount).toBe(10000)
    })
  })

  // ==========================================
  // Section C: Customer API & Pricing Integration
  // ==========================================
  describe('Customer Coupon Validation API & GST Pricing Engine', () => {
    it('customer endpoint POST /api/v1/coupons/validate calculates breakdown without consuming quota', async () => {
      const couponBefore = await Coupon.findOne({ code: 'TEST_FIXED150' })
      const initialUsedCount = couponBefore.usedCount

      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Cookie', customer1Cookie)
        .send({
          couponCode: 'test_fixed150', // tests case insensitivity
          turfId: testTurf1._id,
          sportId: testSport1._id,
          date: TEST_DATE,
          startTime: '10:00',
          endTime: '11:00',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.coupon.code).toBe('TEST_FIXED150')
      expect(res.body.data.discountAmount).toBe(15000) // ₹150 discount
      expect(res.body.data.preDiscountSubtotal).toBe(100000) // ₹1000
      expect(res.body.data.taxableAmount).toBe(85000) // ₹850
      expect(res.body.data.tax.taxAmount).toBe(15300) // 18% of 85000 = 15300
      expect(res.body.data.finalTotal).toBe(100300) // 85000 + 15300

      // Verify validation did NOT increment usedCount
      const couponAfter = await Coupon.findOne({ code: 'TEST_FIXED150' })
      expect(couponAfter.usedCount).toBe(initialUsedCount)
    })

    it('rejects coupon validation from non-customer or unauthenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .send({
          couponCode: 'TEST_FIXED150',
          turfId: testTurf1._id,
          date: TEST_DATE,
          startTime: '10:00',
          endTime: '11:00',
        })

      expect(res.status).toBe(401)
    })

    it('GET /api/v1/coupons/available returns applicable coupons with smart spend unlock nudges', async () => {
      // Test with subtotal = ₹1000 (100000 paise).
      // TEST_FIXED150 has min ₹500 -> isEligible: true
      // SUPER3000 has min ₹3000 -> isEligible: false, amountNeeded: ₹2000
      const res = await request(app)
        .get(`/api/v1/coupons/available?turfId=${testTurf1._id}&sportId=${testSport1._id}&subtotal=100000`)
        .set('Cookie', customer1Cookie)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      const coupons = res.body.data.coupons
      expect(Array.isArray(coupons)).toBe(true)

      const fixed150 = coupons.find((c) => c.code === 'TEST_FIXED150')
      if (fixed150) {
        expect(fixed150.isEligible).toBe(true)
        expect(fixed150.amountNeeded).toBe(0)
      }

      const super3000 = coupons.find((c) => c.code === 'SUPER3000')
      if (super3000) {
        expect(super3000.isEligible).toBe(false)
        expect(super3000.amountNeeded).toBe(200000) // ₹2000 in paise
        expect(super3000.highlightNudge).toContain('Add ₹')
      }
    })
  })

  // ==========================================
  // Section D: Redemption Concurrency & Booking Lifecycle
  // ==========================================
  describe('Booking Lifecycle, Concurrency & Usage Limits', () => {
    let limitedCoupon = null

    beforeAll(async () => {
      // Create coupon with global limit 2 and perUser limit 1
      limitedCoupon = await Coupon.create({
        code: 'TEST_CONCURRENT_LIMIT',
        discountType: 'fixed',
        discountValue: 10000, // ₹100
        usageLimit: 2,
        perUserLimit: 1,
        isActive: true,
      })
    })

    it('successful booking records coupon snapshot and increments usedCount atomically', async () => {
      const bookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf1._id,
          sportId: testSport1._id,
          date: TEST_DATE,
          startTime: '07:00',
          endTime: '08:00',
          contactDetails: {
            name: 'Customer 1',
            email: 'coupon_cust1@turf.com',
            phone: '9876543210',
          },
          paymentMethod: 'Pay at Venue',
          couponCode: 'TEST_CONCURRENT_LIMIT',
        })

      expect(bookingRes.status).toBe(201)
      const booking = bookingRes.body.data.booking

      // Verify snapshot on booking
      expect(booking.coupon).toBeDefined()
      expect(booking.coupon.code).toBe('TEST_CONCURRENT_LIMIT')
      expect(booking.coupon.discountAmount).toBe(10000)
      expect(booking.pricingBreakdown.discountAmount).toBe(10000)

      // Verify usedCount incremented
      const updatedCoupon = await Coupon.findById(limitedCoupon._id)
      expect(updatedCoupon.usedCount).toBe(1)

      // Verify redemption record exists
      const redemption = await CouponRedemption.findOne({
        coupon: limitedCoupon._id,
        user: customer1._id,
        booking: booking._id,
      })
      expect(redemption).not.toBeNull()
      expect(redemption.status).toBe('active')
    })

    it('enforces per-user limit when customer 1 attempts to redeem same coupon again', async () => {
      const repeatRes = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf1._id,
          sportId: testSport1._id,
          date: TEST_DATE,
          startTime: '08:00',
          endTime: '09:00',
          contactDetails: {
            name: 'Customer 1',
            email: 'coupon_cust1@turf.com',
            phone: '9876543210',
          },
          paymentMethod: 'Pay at Venue',
          couponCode: 'TEST_CONCURRENT_LIMIT',
        })

      expect(repeatRes.status).toBe(400)
      expect(repeatRes.body.error.code).toBe('COUPON_USER_LIMIT_EXCEEDED')

      // Coupon usedCount should remain 1
      const couponCheck = await Coupon.findById(limitedCoupon._id)
      expect(couponCheck.usedCount).toBe(1)
    })

    it('allows customer 2 to redeem the second remaining quota', async () => {
      const cust2Booking = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer2Cookie)
        .send({
          turfId: testTurf1._id,
          sportId: testSport1._id,
          date: TEST_DATE,
          startTime: '09:00',
          endTime: '10:00',
          contactDetails: {
            name: 'Customer 2',
            email: 'coupon_cust2@turf.com',
            phone: '9876543211',
          },
          paymentMethod: 'Pay at Venue',
          couponCode: 'TEST_CONCURRENT_LIMIT',
        })

      expect(cust2Booking.status).toBe(201)

      // Global count should now be 2 (limit reached)
      const couponCheck = await Coupon.findById(limitedCoupon._id)
      expect(couponCheck.usedCount).toBe(2)
    })

    it('rejects redemption once global usage limit is exhausted', async () => {
      // Create third customer
      const cust3Hash = await bcrypt.hash('Password@123', 10)
      const customer3 = await User.create({
        name: 'Coupon Customer 3',
        email: 'coupon_cust3@turf.com',
        phone: '9876543212',
        passwordHash: cust3Hash,
        role: 'customer',
        isActive: true,
      })
      const cust3Login = await request(app).post('/api/v1/auth/login').send({
        email: 'coupon_cust3@turf.com',
        password: 'Password@123',
      })
      const customer3Cookie = cust3Login.headers['set-cookie']
        .find((c) => c.startsWith('accessToken='))
        .split(';')[0]

      const exhaustRes = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer3Cookie)
        .send({
          turfId: testTurf1._id,
          sportId: testSport1._id,
          date: TEST_DATE,
          startTime: '11:00',
          endTime: '12:00',
          contactDetails: {
            name: 'Customer 3',
            email: 'coupon_cust3@turf.com',
            phone: '9876543212',
          },
          paymentMethod: 'Pay at Venue',
          couponCode: 'TEST_CONCURRENT_LIMIT',
        })

      expect([400, 409]).toContain(exhaustRes.status)
      expect(['COUPON_LIMIT_REACHED', 'COUPON_USAGE_LIMIT_EXCEEDED']).toContain(
        exhaustRes.body.error.code
      )

      // Clean up customer 3
      await User.deleteOne({ _id: customer3._id })
    })

    it('cancelling a booking releases the coupon redemption and decrements usedCount', async () => {
      // Find customer 2's booking created above
      const booking = await Booking.findOne({
        user: customer2._id,
        date: TEST_DATE,
        startTime: '09:00',
        status: { $in: ['confirmed', 'pending'] },
      })

      expect(booking).not.toBeNull()

      // Cancel the booking via customer cancel endpoint
      const cancelRes = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer2Cookie)
        .send({ reason: 'Plans changed' })

      expect(cancelRes.status).toBe(200)

      // Verify coupon usedCount decremented back to 1
      const couponCheck = await Coupon.findById(limitedCoupon._id)
      expect(couponCheck.usedCount).toBe(1)

      // Verify redemption marked released
      const redemption = await CouponRedemption.findOne({ booking: booking._id })
      expect(redemption.status).toBe('released')

      // Now customer 2 should be able to redeem again since their redemption was released!
      const rebookRes = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer2Cookie)
        .send({
          turfId: testTurf1._id,
          sportId: testSport1._id,
          date: TEST_DATE,
          startTime: '12:00',
          endTime: '13:00',
          contactDetails: {
            name: 'Customer 2',
            email: 'coupon_cust2@turf.com',
            phone: '9876543211',
          },
          paymentMethod: 'Pay at Venue',
          couponCode: 'TEST_CONCURRENT_LIMIT',
        })

      expect(rebookRes.status).toBe(201)
      const afterRebookCoupon = await Coupon.findById(limitedCoupon._id)
      expect(afterRebookCoupon.usedCount).toBe(2)
    })

    it('standard booking creation without a coupon still works perfectly', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf1._id,
          sportId: testSport1._id,
          date: TEST_DATE,
          startTime: '13:00',
          endTime: '14:00',
          contactDetails: {
            name: 'Customer 1',
            email: 'coupon_cust1@turf.com',
            phone: '9876543210',
          },
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.booking.discountAmount).toBe(0)
      expect(res.body.data.booking.coupon.code).toBeNull()
    })

    it('slot double-booking protection remains fully intact', async () => {
      // Attempt to book the same slot (13:00-14:00) already booked by customer 1
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer2Cookie)
        .send({
          turfId: testTurf1._id,
          sportId: testSport1._id,
          date: TEST_DATE,
          startTime: '13:00',
          endTime: '14:00',
          contactDetails: {
            name: 'Customer 2',
            email: 'coupon_cust2@turf.com',
            phone: '9876543211',
          },
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(409)
    })
  })
})
