import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Server & Health API Suite', () => {
  it('confirms app can be imported without starting a listening server', () => {
    expect(app).toBeDefined()
    expect(typeof app.listen).toBe('function')
  })

  it('GET /api/v1/health returns 200 with operational status and process info', async () => {
    const response = await request(app).get('/api/v1/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      message: 'Turf Booking Platform API is operational',
      data: expect.objectContaining({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: '1.0.0',
      }),
    })
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
})
