import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Health Check API', () => {
  it('GET /api/v1/health returns 200 with operational status', async () => {
    const response = await request(app).get('/api/v1/health')

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('success', true)
    expect(response.body).toHaveProperty('message', 'Turf Booking Platform API is operational')
    expect(response.body.data).toHaveProperty('status', 'healthy')
    expect(response.body.data).toHaveProperty('uptime')
    expect(response.body.data).toHaveProperty('timestamp')
  })

  it('GET /api/v1/unknown-route returns 404', async () => {
    const response = await request(app).get('/api/v1/unknown-route')

    expect(response.status).toBe(404)
    expect(response.body).toHaveProperty('success', false)
    expect(response.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND')
  })
})
