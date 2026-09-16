/**
 * Kiseki Record — useOnboarding Hook
 *
 * Provides a clean interface for section pages to integrate
 * first-time welcome overlays.
 *
 * Usage:
 *   const { showWelcome, completeWelcome } = useOnboarding('habits')
 *
 *   return (
 *     <>
 *       {showWelcome && <SectionWelcome config={...} onComplete={completeWelcome} />}
 *       {existing section JSX}
 *     </>
 *   )
 */

import { useState, useEffect, useCallback } from 'react'
import { onboardingService, type WelcomeSection } from '../lib/onboardingService'

interface UseOnboardingReturn {
  /** Whether the section introduction should currently be displayed */
  showWelcome: boolean
  /** Call this when the user completes or skips the introduction */
  completeWelcome: () => void
}

export function useOnboarding(section: WelcomeSection): UseOnboardingReturn {
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    // Check if this section's introduction has been completed
    const completed = onboardingService.isSectionCompleted(section)
    if (!completed) {
      // Small delay to let the page render underneath first,
      // creating a smooth overlay appearance
      const timer = setTimeout(() => setShowWelcome(true), 100)
      return () => clearTimeout(timer)
    }
  }, [section])

  const completeWelcome = useCallback(() => {
    onboardingService.completeSection(section)
    setShowWelcome(false)
  }, [section])

  return { showWelcome, completeWelcome }
}
