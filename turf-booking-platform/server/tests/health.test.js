import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { connectDB, disconnectDB } from '../src/config/db.js'

describe('Server & Health API Suite with MongoDB', () => {
  it('confirms app can be imported without starting a listening server', () => {
    expect(app).toBeDefined()
    expect(typeof app.listen).toBe('function')
  })

  it('GET /api/v1/health returns 503 when database is disconnected', async () => {
    // Ensure disconnected state
    await disconnectDB()

    const response = await request(app).get('/api/v1/health')

    expect(response.status).toBe(503)
    expect(response.body).toHaveProperty('success', false)
    expect(response.body.data.status).toBe('degraded')
    expect(response.body.data.database.status).toBe('disconnected')
  })

  it('GET /api/v1/health returns 200 when database is connected', async () => {
    // Connect to MongoDB
    await connectDB()

    const response = await request(app).get('/api/v1/health')

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('success', true)
    expect(response.body.data.status).toBe('healthy')
    expect(response.body.data.database.status).toBe('connected')
    expect(response.body.data.database).toHaveProperty('databaseName')
  })

  it('GET /api/v1/nonexistent-route returns 404 with standard NOT_FOUND code', async () => {
    const response = await request(app).get('/api/v1/nonexistent-route')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      success: false,
      error: {
        message: 'Resource not found: GET /api/v1/nonexistent-route',
        code: 'NOT_FOUND',
      },
    })
  })

  it('POST with malformed JSON body returns controlled 400 with INVALID_JSON code', async () => {
    const response = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{ invalid_json: "missing_quotes }')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      success: false,
      error: {
        message: 'Malformed JSON payload in request body',
        code: 'INVALID_JSON',
      },
    })
  })

  afterAll(async () => {
    await disconnectDB()
  })
})
