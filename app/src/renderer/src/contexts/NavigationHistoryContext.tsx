import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface NavigationHistoryContextType {
  canGoBack: boolean
  canGoForward: boolean
  goBack: () => void
  goForward: () => void
  addToHistory: (path: string) => void
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType | undefined>(undefined)

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [backStack, setBackStack] = useState<string[]>([])
  const [forwardStack, setForwardStack] = useState<string[]>([])
  const isInternalNavigation = useRef(false)
  const previousLocation = useRef(location.pathname)

  const canGoBack = backStack.length > 0
  const canGoForward = forwardStack.length > 0

  // Track location changes and add to history
  useEffect(() => {
    if (isInternalNavigation.current) {
      isInternalNavigation.current = false
      return
    }

    // Only add to history if the location actually changed
    if (location.pathname !== previousLocation.current) {
      setBackStack(prev => {
        // Don't add if it's the same as the last item in back stack
        if (prev.length > 0 && prev[prev.length - 1] === location.pathname) {
          return prev
        }
        // Add current location to back stack
        const newBackStack = [...prev, previousLocation.current]
        // Clear forward stack when navigating to a new location
        setForwardStack([])
        return newBackStack
      })
      previousLocation.current = location.pathname
    }
  }, [location.pathname])

  const addToHistory = useCallback((_path: string) => {
    // This is called when user clicks on navigation links
    // The useEffect will handle the actual history tracking
  }, [])

  const goBack = useCallback(() => {
    if (backStack.length === 0) return
    
    setBackStack(prev => {
      const newBackStack = [...prev]
      const previousPath = newBackStack.pop()!
      
      // Add current location to forward stack
      setForwardStack(forwardPrev => [location.pathname, ...forwardPrev])
      
      // Mark as internal navigation to prevent history tracking
      isInternalNavigation.current = true
      previousLocation.current = previousPath
      
      // Navigate to previous path
      navigate(previousPath)
      
      return newBackStack
    })
  }, [backStack.length, location.pathname, navigate])

  const goForward = useCallback(() => {
    if (forwardStack.length === 0) return
    
    setForwardStack(prev => {
      const newForwardStack = [...prev]
      const nextPath = newForwardStack.shift()!
      
      // Add current location to back stack
      setBackStack(backPrev => [...backPrev, location.pathname])
      
      // Mark as internal navigation to prevent history tracking
      isInternalNavigation.current = true
      previousLocation.current = nextPath
      
      // Navigate to next path
      navigate(nextPath)
      
      return newForwardStack
    })
  }, [forwardStack.length, location.pathname, navigate])

  return (
    <NavigationHistoryContext.Provider
      value={{
        canGoBack,
        canGoForward,
        goBack,
        goForward,
        addToHistory
      }}
    >
      {children}
    </NavigationHistoryContext.Provider>
  )
}

export function useNavigationHistory() {
  const context = useContext(NavigationHistoryContext)
  if (context === undefined) {
    throw new Error('useNavigationHistory must be used within a NavigationHistoryProvider')
  }
  return context
}
