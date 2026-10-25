import { Server } from 'socket.io'
import { logger } from './config/logger.js'
import { env } from './config/env.js'

let io = null

export const initSocket = (httpServer) => {
  const rawClientUrls = (env.CLIENT_URL || '')
    .split(',')
    .map((u) => u.trim().replace(/\/$/, ''))
    .filter(Boolean)

  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://turf-booking-fronend.onrender.com',
    'https://turf-booking-frontend.onrender.com',
    ...rawClientUrls,
  ].filter(Boolean)

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        const cleanOrigin = origin.trim().replace(/\/$/, '')
        if (
          allowedOrigins.includes(cleanOrigin) ||
          cleanOrigin.endsWith('.onrender.com') ||
          cleanOrigin.endsWith('.vercel.app') ||
          cleanOrigin.endsWith('.netlify.app') ||
          cleanOrigin.endsWith('.pages.dev') ||
          cleanOrigin.includes('localhost') ||
          cleanOrigin.includes('127.0.0.1')
        ) {
          return callback(null, true)
        }
        return callback(null, false)
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'Socket client connected')

    socket.on('join_turf_date', ({ turfId, date }) => {
      if (turfId && date) {
        const roomName = `turf:${turfId}:${date}`
        socket.join(roomName)
        logger.debug({ socketId: socket.id, room: roomName }, 'Client joined room')
      }
    })

    socket.on('leave_turf_date', ({ turfId, date }) => {
      if (turfId && date) {
        const roomName = `turf:${turfId}:${date}`
        socket.leave(roomName)
        logger.debug({ socketId: socket.id, room: roomName }, 'Client left room')
      }
    })

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Socket client disconnected')
    })
  })

  return io
}

export const getIO = () => {
  return io
}

export const broadcastAvailabilityUpdate = ({ turfId, date, reason = 'hold_changed' } = {}) => {
  if (!io) return
  if (!turfId || !date) return

  const roomName = `turf:${turfId}:${date}`
  io.to(roomName).emit('availability_update', {
    turfId: String(turfId),
    date,
    reason,
    timestamp: Date.now(),
  })
}

export default {
  initSocket,
  getIO,
  broadcastAvailabilityUpdate,
}
