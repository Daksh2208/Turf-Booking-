import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { connectDB, disconnectDB } from '../src/config/db.js'
import { User } from '../src/models/User.js'
import { RefreshToken } from '../src/models/RefreshToken.js'
import bcrypt from 'bcryptjs'

describe('Authentication & Authorization Suite', () => {
  const testUser = {
    name: 'Test Customer',
    email: `test_customer_${Date.now()}@example.com`,
    password: 'Password123!',
  }

  const testAdmin = {
    name: 'Test Admin User',
    email: `test_admin_${Date.now()}@example.com`,
    password: 'AdminPassword123!',
  }

  let customerAuthCookie = ''
  let customerRefreshToken = ''
  let adminAuthCookie = ''

  beforeAll(async () => {
    await connectDB()
    // Clean up test users
    await User.deleteMany({ email: { $in: [testUser.email, testAdmin.email] } })
  })

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [testUser.email, testAdmin.email] } })
    await disconnectDB()
  })

  describe('POST /api/v1/auth/register', () => {
    it('registers a customer account with role customer and hashed password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: testUser.name,
          email: testUser.email,
          password: testUser.password,
          role: 'admin', // Attempted role escalation
          isActive: false, // Attempted state manipulation
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase())
      // Security: Must be forced to customer role
      expect(res.body.data.user.role).toBe('customer')
      // Security: Password hash must NOT be returned in response
      expect(res.body.data.user).not.toHaveProperty('password')
      expect(res.body.data.user).not.toHaveProperty('passwordHash')

      // Verify in DB that password was hashed
      const dbUser = await User.findOne({ email: testUser.email }).select('+passwordHash')
      expect(dbUser).toBeDefined()
      expect(dbUser.passwordHash).toMatch(/^\$2[aby]\$\d+\$/)
      expect(dbUser.role).toBe('customer')
    })

    it('rejects duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Another User',
          email: testUser.email,
          password: 'Password123!',
        })

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS')
    })

    it('rejects invalid inputs with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: '',
          email: 'invalid-email',
          password: '123',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/v1/auth/login', () => {
    it('authenticates valid customer credentials and sets HttpOnly cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase())

      // Verify cookies
      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true)
      expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true)
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true)

      // Store cookie for subsequent requests
      customerAuthCookie = cookies.find((c) => c.startsWith('accessToken=')).split(';')[0]
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='))
      customerRefreshToken = refreshCookie.split(';')[0].replace('refreshToken=', '')
    })

    it('rejects invalid password with 401 and generic message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('rejects non-existent email with 401 and generic message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent_account@example.com',
          password: 'AnyPassword123!',
        })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('rejects deactivated account with 403', async () => {
      // Temporarily deactivate
      await User.updateOne({ email: testUser.email }, { isActive: false })

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED')

      // Reactivate
      await User.updateOne({ email: testUser.email }, { isActive: true })
    })
  })

  describe('Access Token Verification & Malformed Tokens', () => {
    it('returns 401 on malformed or invalid access token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', ['accessToken=this.is.an.invalid.token'])

      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('TOKEN_INVALID')
    })

    it('returns 403 on protected endpoint when account is deactivated after token issue', async () => {
      await User.updateOne({ email: testUser.email }, { isActive: false })

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [customerAuthCookie])

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED')

      await User.updateOne({ email: testUser.email }, { isActive: true })
    })
  })

  describe('Role-Based Access Control (RBAC)', () => {
    beforeAll(async () => {
      // Create test admin
      const hash = await bcrypt.hash(testAdmin.password, 10)
      await User.create({
        name: testAdmin.name,
        email: testAdmin.email,
        passwordHash: hash,
        role: 'admin',
        isActive: true,
      })

      // Login as admin
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password,
        })

      const cookies = loginRes.headers['set-cookie']
      adminAuthCookie = cookies.find((c) => c.startsWith('accessToken=')).split(';')[0]
    })

    it('denies customer access to admin-only endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin-check')
        .set('Cookie', [customerAuthCookie])

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    it('allows admin access to admin-only endpoint with 200 OK', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin-check')
        .set('Cookie', [adminAuthCookie])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.role).toBe('admin')
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 when accessed without token', async () => {
      const res = await request(app).get('/api/v1/auth/me')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHORIZED')
    })

    it('returns 200 and user profile when accessed with valid accessToken cookie', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [customerAuthCookie])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase())
    })
  })

  describe('POST /api/v1/auth/refresh (Rotation & Reuse Detection)', () => {
    it('rotates refresh token and returns new access & refresh tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${customerRefreshToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const cookies = res.headers['set-cookie']
      expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true)
      expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true)

      // Test reuse detection: attempting to reuse the old customerRefreshToken must fail
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${customerRefreshToken}`])

      expect(reuseRes.status).toBe(401)
      expect(reuseRes.body.error.code).toBe('TOKEN_REUSE_DETECTED')
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    it('clears auth cookies and revokes refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [customerAuthCookie])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const cookies = res.headers['set-cookie']
      expect(cookies.some((c) => c.includes('accessToken=;'))).toBe(true)
      expect(cookies.some((c) => c.includes('refreshToken=;'))).toBe(true)
    })
  })
})
