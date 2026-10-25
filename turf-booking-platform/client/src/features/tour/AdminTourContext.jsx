import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { driver } from 'driver.js'
import './tour.css'
import { adminTourSteps } from './adminTourSteps'
import { AdminTourWelcomeModal } from './AdminTourWelcomeModal'
import { useAuth } from '../../hooks/useAuth'
import { CheckCircle2, X } from 'lucide-react'

const STORAGE_KEY = 'webTourPrompted'

const safeGetStorage = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key)
    }
  } catch {
    // Graceful fallback for restricted storage environments
  }
  return null
}

const safeSetStorage = (key, value) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // Graceful fallback
  }
}

export const AdminTourContext = createContext(null)

export const AdminTourProvider = ({ children }) => {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [completionToast, setCompletionToast] = useState(false)
  const driverInstanceRef = useRef(null)
  const hasCheckedAutoPromptRef = useRef(false)
  const isTourActiveRef = useRef(false)

  // Mark tour as prompted in localStorage
  const markPrompted = useCallback(() => {
    safeSetStorage(STORAGE_KEY, 'true')
  }, [])

  // Clean up any active driver instance
  const cleanupTour = useCallback(() => {
    if (driverInstanceRef.current) {
      try {
        driverInstanceRef.current.destroy()
      } catch {
        // Safe destruction
      }
      driverInstanceRef.current = null
    }
    isTourActiveRef.current = false
  }, [])

  // Start the interactive tour
  const startTour = useCallback(() => {
    setIsModalOpen(false)
    cleanupTour()

    // Mark as active
    isTourActiveRef.current = true

    // Initialize driver.js
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: '#17231B',
      overlayOpacity: 0.65,
      stagePadding: 6,
      stageRadius: 12,
      popoverClass: 'turfspot-tour-popover',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Finish Tour 🎉',
      progressText: '{{current}} of {{total}}',
      steps: adminTourSteps,
      onDestroyStarted: () => {
        // Triggers when user clicks Finish, Close 'X', or clicks outside
        const isLastStep =
          driverObj.hasNextStep && !driverObj.hasNextStep()

        markPrompted()

        if (isLastStep) {
          setCompletionToast(true)
        }

        cleanupTour()
      },
    })

    driverInstanceRef.current = driverObj

    // Small delay to ensure any open modal is unmounted and layout is rendered
    setTimeout(() => {
      try {
        driverObj.drive()
      } catch (err) {
        console.error('Failed to start admin tour:', err)
        cleanupTour()
      }
    }, 100)
  }, [cleanupTour, markPrompted])

  // Handle skip button from Welcome Modal
  const skipTour = useCallback(() => {
    markPrompted()
    setIsModalOpen(false)
    cleanupTour()
  }, [markPrompted, cleanupTour])

  // Auto-check on first load when authenticated as admin
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !isAdmin) return
    if (hasCheckedAutoPromptRef.current) return

    hasCheckedAutoPromptRef.current = true

    const prompted = safeGetStorage(STORAGE_KEY)
    if (prompted !== 'true') {
      setIsModalOpen(true)
    }
  }, [isLoading, isAuthenticated, isAdmin])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTour()
    }
  }, [cleanupTour])

  // Auto dismiss completion toast after 6 seconds
  useEffect(() => {
    if (completionToast) {
      const timer = setTimeout(() => {
        setCompletionToast(false)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [completionToast])

  const value = {
    startTour,
    skipTour,
    isTourActive: isTourActiveRef.current,
  }

  return (
    <AdminTourContext.Provider value={value}>
      {children}

      {/* First-login Welcome Modal */}
      <AdminTourWelcomeModal
        isOpen={isModalOpen}
        onStart={startTour}
        onSkip={skipTour}
      />

      {/* Completion Toast Notification */}
      {completionToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[100001] max-w-md bg-white border border-[#C9DFCE] rounded-2xl p-4 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-[#267A45]" />
          </div>
          <div className="flex-1 pr-2">
            <h4 className="text-xs font-bold text-[#17231B]">You're All Set! 🎉</h4>
            <p className="text-[11px] text-[#526258] mt-0.5 leading-relaxed">
              You now know where to find the main tools in your admin panel. You can replay this tour anytime by clicking <strong>Tour Guide</strong> in the header.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCompletionToast(false)}
            className="p-1 rounded-lg text-[#647168] hover:text-[#17231B] hover:bg-[#F0F6F1] transition-colors cursor-pointer"
            aria-label="Dismiss completion message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </AdminTourContext.Provider>
  )
}

export const useAdminTour = () => {
  const context = useContext(AdminTourContext)
  if (!context) {
    throw new Error('useAdminTour must be used within an AdminTourProvider')
  }
  return context
}

export default AdminTourProvider
