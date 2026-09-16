import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useNavigationHistory } from '../contexts/NavigationHistoryContext'

export function useKeyboardShortcuts() {
  const { goBack, goForward, canGoBack, canGoForward } = useNavigationHistory()
  const navigate = useNavigate()
  const location = useLocation()

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

      // Main Section Navigation (Ctrl + Up/Down)
      if (event.ctrlKey && !event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault()
        
        const MAIN_SECTIONS = [
          '/',
          '/reports',
          '/records',
          '/journal',
          '/memory-capsules',
          '/clock',
          '/chronicle',
          '/build-grow/overview',
          '/dreams',
          '/habits',
          '/relationships',
          '/career/overview',
          '/assistant',
          '/notifications',
          '/settings'
        ]

        // Find current main section
        let currentIndex = MAIN_SECTIONS.findIndex(path => {
          if (path === '/') return location.pathname === '/'
          if (path.startsWith('/career') && location.pathname.startsWith('/career')) return true
          if (path.startsWith('/build-grow') && location.pathname.startsWith('/build-grow')) return true
          if (path.startsWith('/habits') && location.pathname.startsWith('/habits')) return true
          if (path.startsWith('/dreams') && location.pathname.startsWith('/dreams')) return true
          if (path.startsWith('/clock') && location.pathname.startsWith('/clock')) return true
          return location.pathname.startsWith(path)
        })

        if (currentIndex !== -1) {
          if (event.key === 'ArrowDown') {
            const nextIndex = (currentIndex + 1) % MAIN_SECTIONS.length
            navigate(MAIN_SECTIONS[nextIndex])
          } else {
            const prevIndex = (currentIndex - 1 + MAIN_SECTIONS.length) % MAIN_SECTIONS.length
            navigate(MAIN_SECTIONS[prevIndex])
          }
        }
      }

      // Sub-Section Navigation (Ctrl + Alt + Up/Down)
      if (event.ctrlKey && event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault()

        const SUB_SECTIONS: Record<string, string[]> = {
          '/habits': [
            '/habits',
            '/habits/all',
            '/habits/timeline',
            '/habits/analytics',
            '/habits/insights',
            '/habits/history',
            '/habits/milestones',
            '/habits/archived'
          ],
          '/build-grow': [
            '/build-grow/overview',
            '/build-grow/projects',
            '/build-grow/goals',
            '/build-grow/skills',
            '/build-grow/ai-insights'
          ],
          '/career': [
            '/career/overview',
            '/career/timeline',
            '/career/education',
            '/career/career',
            '/career/certificates',
            '/career/achievements',
            '/career/resume',
            '/career/analytics',
            '/career/ai'
          ]
        }

        // Determine which base section we are in
        let baseSection = ''
        if (location.pathname.startsWith('/habits')) baseSection = '/habits'
        else if (location.pathname.startsWith('/build-grow')) baseSection = '/build-grow'
        else if (location.pathname.startsWith('/career')) baseSection = '/career'

        if (baseSection && SUB_SECTIONS[baseSection]) {
          const subs = SUB_SECTIONS[baseSection]
          let currentIndex = subs.findIndex(path => location.pathname === path)
          if (currentIndex === -1) {
             // Fallback if not an exact match
             currentIndex = subs.findIndex(path => location.pathname.startsWith(path))
             if (currentIndex === -1) currentIndex = 0
          }
          
          if (event.key === 'ArrowDown') {
            const nextIndex = (currentIndex + 1) % subs.length
            navigate(subs[nextIndex])
          } else {
            const prevIndex = (currentIndex - 1 + subs.length) % subs.length
            navigate(subs[prevIndex])
          }
        }
      }

      // Global Navigation Shortcuts
      if (event.ctrlKey && event.altKey && !event.shiftKey && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        const key = event.key.toLowerCase()
        switch (key) {
          case 'd':
            event.preventDefault()
            navigate('/dashboard')
            break
          case 'o':
            event.preventDefault()
            navigate('/clock')
            break
          case 'h':
            event.preventDefault()
            navigate('/habits')
            break
          case 'x':
            event.preventDefault()
            navigate('/career/skills')
            break
          case 'a':
            event.preventDefault()
            navigate('/assistant')
            break
          case 'g':
            event.preventDefault()
            navigate('/career/goals')
            break
          case 'r':
            event.preventDefault()
            navigate('/relationships')
            break
          case 'm':
            event.preventDefault()
            navigate('/memory-capsules')
            break
          case 'c':
            event.preventDefault()
            navigate('/career')
            break
          case 'j':
            event.preventDefault()
            navigate('/journal')
            break
          case 'p':
            event.preventDefault()
            navigate('/reports')
            break
          case 'e':
            event.preventDefault()
            navigate('/records')
            break
          case 's':
            event.preventDefault()
            navigate('/settings')
            break
          case 'z':
            event.preventDefault()
            navigate('/dreams')
            break
          case 'q':
            event.preventDefault()
            navigate('/build-grow/projects')
            break
          case 'l':
            event.preventDefault()
            navigate('/chronicle')
            break
        }
      }

      // Global Search Focus
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        const searchInput = document.querySelector('input[placeholder^="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canGoBack, canGoForward, goBack, goForward, navigate, location.pathname])
}
