import { useEffect } from 'react'
import { useNavigationHistory } from '../contexts/NavigationHistoryContext'

export function useKeyboardShortcuts() {
  const { goBack, goForward, canGoBack, canGoForward } = useNavigationHistory()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl + Left Arrow (back)
      if (event.ctrlKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        if (canGoBack) {
          goBack()
        }
      }
      
      // Check for Ctrl + Right Arrow (forward)
      if (event.ctrlKey && event.key === 'ArrowRight') {
        event.preventDefault()
        if (canGoForward) {
          goForward()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canGoBack, canGoForward, goBack, goForward])
}
