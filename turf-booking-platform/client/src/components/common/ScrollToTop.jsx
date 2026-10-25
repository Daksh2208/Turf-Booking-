import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop component:
 * 1. Automatically scrolls to the top (0, 0) of every new page on route change.
 * 2. Smoothly scrolls to in-page anchor targets if a hash is present (e.g. #sports, #arenas, #how-it-works).
 */
export const ScrollToTop = () => {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace('#', '')
      const element = document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
        return
      }

      const timer = setTimeout(() => {
        const el = document.getElementById(targetId)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)

      return () => clearTimeout(timer)
    }

    // Reset scroll to top immediately on page change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
  }, [pathname, hash])

  return null
}

export default ScrollToTop
