import React, { useEffect, useState } from 'react'

export function CustomCursor() {
  const cursorRef = React.useRef<HTMLDivElement>(null)
  const [isPointer, setIsPointer] = useState(false)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const checkPointer = () => {
      const usePointer = localStorage.getItem('useAppPointer') !== 'false'
      setEnabled(usePointer)
      if (usePointer) {
        document.body.classList.add('app-pointer')
      } else {
        document.body.classList.remove('app-pointer')
      }
    }
    
    checkPointer()
    window.addEventListener('appPointerChanged', checkPointer)
    return () => window.removeEventListener('appPointerChanged', checkPointer)
  }, [])

  useEffect(() => {
    if (!enabled) return;
    const updatePosition = (e: PointerEvent) => {
      if (cursorRef.current) {
        // Use translate3d for hardware acceleration and zero latency
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
        cursorRef.current.style.opacity = '1'
      }

      // Check if hovering over a clickable element
      const target = e.target as HTMLElement
      const isClickable = 
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.tagName.toLowerCase() === 'a' ||
        target.tagName.toLowerCase() === 'button' ||
        target.closest('a') !== null ||
        target.closest('button') !== null ||
        target.closest('[role="button"]') !== null ||
        target.classList.contains('cursor-pointer')

      setIsPointer(isClickable)
    }

    const handlePointerLeave = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '0'
    }
    const handlePointerEnter = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '1'
    }

    window.addEventListener('pointermove', updatePosition, { passive: true })
    document.addEventListener('pointerleave', handlePointerLeave)
    document.addEventListener('pointerenter', handlePointerEnter)

    return () => {
      window.removeEventListener('pointermove', updatePosition)
      document.removeEventListener('pointerleave', handlePointerLeave)
      document.removeEventListener('pointerenter', handlePointerEnter)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div 
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-[999999] opacity-0 transition-opacity duration-150 will-change-transform"
    >
      {isPointer ? (
        // Hover State: Glowing Ring with pulsing center (No black shadow)
        <div className="relative -left-4 -top-4 w-8 h-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-sky-400 rounded-full opacity-20 animate-ping"></div>
          <div className="absolute inset-0 border-[1.5px] border-sky-400 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)]"></div>
          <div className="w-2.5 h-2.5 bg-sky-300 rounded-full shadow-[0_0_8px_rgba(56,189,248,1)]"></div>
        </div>
      ) : (
        // Default State: Sleek Arrow with pure sky blue drop shadow (No black shadow)
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="28" 
          height="28" 
          viewBox="0 0 32 32"
          className="drop-shadow-[0_4px_12px_rgba(2,132,199,0.5)]"
        >
          <defs>
            <linearGradient id="cursorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <path 
            d="M6 3l16 11-7 2 4 8-3 2-4-8-6 5V3z" 
            fill="url(#cursorGrad)" 
            stroke="#ffffff" 
            strokeWidth="1.5" 
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}
