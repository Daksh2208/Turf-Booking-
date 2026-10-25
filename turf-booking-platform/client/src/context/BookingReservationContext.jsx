import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import customerBookingService from '../services/customer/booking.service'
import { useAuth } from '../hooks/useAuth'

const BookingReservationContext = createContext(null)

const getSocketUrl = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
  return import.meta.env.VITE_SOCKET_URL || apiBase.replace(/\/api\/v1\/?$/, '')
}

export const BookingReservationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const [currentReservation, setCurrentReservation] = useState(() => {
    try {
      const saved = sessionStorage.getItem('turf_active_reservation')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          return parsed
        }
        sessionStorage.removeItem('turf_active_reservation')
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
    return null
  })

  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [holdError, setHoldError] = useState('')
  const socketRef = useRef(null)
  const listenersRef = useRef(new Set())

  // Countdown timer based on authoritative expiresAt
  useEffect(() => {
    if (!currentReservation?.expiresAt) {
      setCountdownSeconds(0)
      return
    }

    const updateRemaining = () => {
      const expTime = new Date(currentReservation.expiresAt).getTime()
      const diff = Math.max(0, Math.round((expTime - Date.now()) / 1000))
      setCountdownSeconds(diff)

      if (diff === 0) {
        // Reservation expired
        setCurrentReservation(null)
        try {
          sessionStorage.removeItem('turf_active_reservation')
        } catch {
          // Ignore
        }
      }
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [currentReservation?.expiresAt])

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketUrl = getSocketUrl()
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('availability_update', (payload) => {
      listenersRef.current.forEach((cb) => {
        try {
          cb(payload)
        } catch {
          // Ignore callback errors
        }
      })
    })

    socket.on('reconnect', () => {
      listenersRef.current.forEach((cb) => {
        try {
          cb({ reason: 'socket_reconnected' })
        } catch {
          // Ignore
        }
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Subscribe to real-time room updates for a specific turf and date
  const subscribeToTurfDate = useCallback((turfId, date, onUpdate) => {
    const socket = socketRef.current
    if (socket && turfId && date) {
      socket.emit('join_turf_date', { turfId, date })
    }

    if (onUpdate) {
      listenersRef.current.add(onUpdate)
    }

    return () => {
      if (socket && turfId && date) {
        socket.emit('leave_turf_date', { turfId, date })
      }
      if (onUpdate) {
        listenersRef.current.delete(onUpdate)
      }
    }
  }, [])

  // Hold discrete slots for customer
  const holdSlots = useCallback(
    async ({ turfId, date, slots }) => {
      if (!isAuthenticated) {
        setHoldError('Please log in or register to select and reserve slots.')
        return null
      }
      if (user?.role === 'admin') {
        setHoldError('Admin accounts cannot reserve customer slots.')
        return null
      }

      setIsHolding(true)
      setHoldError('')

      try {
        const payload = {
          turfId,
          date,
          slots,
          reservationId:
            currentReservation?.turfId === turfId && currentReservation?.date === date
              ? currentReservation?.reservationId
              : undefined,
        }

        const data = await customerBookingService.holdSlots(payload)
        const res = data.reservation

        setCurrentReservation(res)
        try {
          sessionStorage.setItem('turf_active_reservation', JSON.stringify(res))
        } catch {
          // Ignore storage quota errors
        }

        return data
      } catch (err) {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Failed to reserve slot. It may have just been selected by another customer.'
        setHoldError(msg)
        throw err
      } finally {
        setIsHolding(false)
      }
    },
    [isAuthenticated, user?.role, currentReservation]
  )

  // Explicitly release customer's reservation
  const releaseReservation = useCallback(
    async (turfId, date) => {
      const resId = currentReservation?.reservationId
      setCurrentReservation(null)
      setCountdownSeconds(0)
      try {
        sessionStorage.removeItem('turf_active_reservation')
      } catch {
        // Ignore
      }

      if (isAuthenticated && (resId || (turfId && date))) {
        try {
          await customerBookingService.releaseReservation({
            reservationId: resId,
            turfId,
            date,
          })
        } catch {
          // Best-effort release
        }
      }
    },
    [isAuthenticated, currentReservation]
  )

  // Restore active reservation on page mount / back navigation
  const restoreReservation = useCallback(
    async (turfId, date) => {
      if (!isAuthenticated) return null

      try {
        const active = await customerBookingService.getCurrentReservation(turfId, date)
        if (active && active.expiresAt && new Date(active.expiresAt).getTime() > Date.now()) {
          setCurrentReservation(active)
          try {
            sessionStorage.setItem('turf_active_reservation', JSON.stringify(active))
          } catch {
            // Ignore
          }
          return active
        } else {
          // Expired or released
          if (
            currentReservation?.turfId === turfId &&
            currentReservation?.date === date
          ) {
            setCurrentReservation(null)
            try {
              sessionStorage.removeItem('turf_active_reservation')
            } catch {
              // Ignore
            }
          }
          return null
        }
      } catch {
        return null
      }
    },
    [isAuthenticated, currentReservation]
  )

  // Clear reservation state on booking completion
  const clearReservation = useCallback(() => {
    setCurrentReservation(null)
    setCountdownSeconds(0)
    setHoldError('')
    try {
      sessionStorage.removeItem('turf_active_reservation')
    } catch {
      // Ignore
    }
  }, [])

  return (
    <BookingReservationContext.Provider
      value={{
        currentReservation,
        countdownSeconds,
        isHolding,
        holdError,
        setHoldError,
        holdSlots,
        releaseReservation,
        restoreReservation,
        clearReservation,
        subscribeToTurfDate,
      }}
    >
      {children}
    </BookingReservationContext.Provider>
  )
}

export const useBookingReservation = () => {
  const context = useContext(BookingReservationContext)
  if (!context) {
    return {
      currentReservation: null,
      countdownSeconds: 0,
      isHolding: false,
      holdError: '',
      setHoldError: () => {},
      holdSlots: async () => null,
      releaseReservation: async () => false,
      restoreReservation: async () => null,
      clearReservation: () => {},
      subscribeToTurfDate: () => () => {},
    }
  }
  return context
}

export default BookingReservationContext
