import React, { useEffect, useRef, useId } from 'react'

interface OverscrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  containerClassName?: string;
  absolute?: boolean;
}

export function OverscrollContainer({ children, className = '', containerClassName = '', absolute = true, ...props }: OverscrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const topSvgRef = useRef<SVGSVGElement>(null)
  const topPathRef = useRef<SVGPathElement>(null)
  const bottomSvgRef = useRef<SVGSVGElement>(null)
  const bottomPathRef = useRef<SVGPathElement>(null)
  
  const topGradientId = useId()
  const bottomGradientId = useId()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let isDragging = false
    let startY = 0
    let startX = 0
    let scrollTop = 0
    let scrollLeft = 0
    let hasDragged = false
    let currentTranslateY = 0
    
    let scrollTargetY: HTMLElement | null = null
    let scrollTargetX: HTMLElement | null = null

    let rafId: number | null = null

    const rubberBand = (distance: number, dimension: number) => {
      return (distance * 0.85 * dimension) / (dimension + distance * 0.85)
    }

    let cachedRectLeft = 0
    let cachedClientWidth = 0
    let cachedClientHeight = 0
    let cachedScrollHeight = 0
    let cachedScrollClientHeight = 0

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 2) { 
        e.preventDefault()
        isDragging = true
        hasDragged = false
        startY = e.pageY
        startX = e.pageX
        
        scrollTargetY = el
        scrollTargetX = null
        
        let target = e.target as HTMLElement
        
        // Find closest vertical scroll target
        let currentY = target
        let blocked = false
        while (currentY && currentY !== el) {
          if (currentY.getAttribute('data-stop-overscroll') === 'true') {
            blocked = true
            break
          }
          const style = window.getComputedStyle(currentY)
          const isScrollableY = (style.overflowY === 'auto' || style.overflowY === 'scroll')
          if (isScrollableY && currentY.scrollHeight > currentY.clientHeight) {
            scrollTargetY = currentY
            break
          }
          currentY = currentY.parentElement as HTMLElement
        }
        
        if (blocked) return
        
        // Find closest horizontal scroll target
        let currentX = target
        while (currentX && currentX !== el) {
          const style = window.getComputedStyle(currentX)
          const isScrollableX = (style.overflowX === 'auto' || style.overflowX === 'scroll')
          if (isScrollableX && currentX.scrollWidth > currentX.clientWidth) {
            scrollTargetX = currentX
            break
          }
          currentX = currentX.parentElement as HTMLElement
        }

        scrollTop = scrollTargetY.scrollTop
        if (scrollTargetX) {
          scrollLeft = scrollTargetX.scrollLeft
        }
        
        cachedRectLeft = el.getBoundingClientRect().left
        cachedClientWidth = el.clientWidth
        cachedClientHeight = el.clientHeight
        cachedScrollHeight = scrollTargetY.scrollHeight
        cachedScrollClientHeight = scrollTargetY.clientHeight
        
        el.style.cursor = 'grabbing'
        el.style.transition = 'none'
      }
    }

    const handlePointerUp = () => {
      if (isDragging) {
        isDragging = false
        el.style.cursor = ''
        if (rafId) cancelAnimationFrame(rafId)
        
        const springCurve = 'cubic-bezier(0.2, 1.2, 0.3, 1)'
        
        if (currentTranslateY !== 0 && scrollTargetY) {
          currentTranslateY = 0
          const target = scrollTargetY
          target.style.transition = `transform 0.5s ${springCurve}`
          target.style.transform = `translateY(0px)`
          
          // Clear transform after animation to restore fixed positioning for child modals
          setTimeout(() => {
            if (target) {
              target.style.transform = ''
              target.style.transition = ''
            }
          }, 500)
        }
        
        const width = cachedClientWidth || el.clientWidth
        
        if (topSvgRef.current && topPathRef.current) {
          topSvgRef.current.style.transition = 'opacity 0.6s ease-out'
          topSvgRef.current.style.opacity = '0'
          topPathRef.current.style.transition = `d 0.5s ${springCurve}`
          topPathRef.current.setAttribute('d', `M 0,0 Q ${width/2},0 ${width},0`)
        }
        if (bottomSvgRef.current && bottomPathRef.current) {
          bottomSvgRef.current.style.transition = 'opacity 0.6s ease-out'
          bottomSvgRef.current.style.opacity = '0'
          bottomPathRef.current.style.transition = `d 0.5s ${springCurve}`
          bottomPathRef.current.setAttribute('d', `M 0,400 Q ${width/2},400 ${width},400`)
        }
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      e.preventDefault()
      hasDragged = true
      
      const walkY = (e.pageY - startY) * 1.5
      const walkX = (e.pageX - startX) * 1.5
      const mouseX = e.clientX - cachedRectLeft
      
      if (rafId) cancelAnimationFrame(rafId)
      
      rafId = requestAnimationFrame(() => {
        // Handle horizontal scrolling natively
        if (scrollTargetX) {
          scrollTargetX.scrollLeft = scrollLeft - walkX
        }
        
        if (!scrollTargetY) return

        const newScrollTop = scrollTop - walkY
        const maxScroll = Math.max(0, cachedScrollHeight - cachedScrollClientHeight)
        const width = cachedClientWidth
        const height = cachedScrollClientHeight
        const controlX = Math.max(0, Math.min(width, mouseX))

        if (newScrollTop < 0) {
          scrollTargetY.scrollTop = 0
          const overscrollDist = Math.abs(newScrollTop)
          currentTranslateY = rubberBand(overscrollDist, height)
          if (scrollTargetY.getAttribute('data-no-bounce') !== 'true') scrollTargetY.style.transform = `translateY(${currentTranslateY}px)`
          
          if (scrollTargetY.getAttribute('data-overscroll-glow') !== 'false' && topSvgRef.current && topPathRef.current) {
            const intensity = Math.min(1, currentTranslateY / 100)
            const dropDistance = currentTranslateY * 1.5
            topSvgRef.current.style.opacity = Math.min(1, intensity * 2).toString()
            topSvgRef.current.style.transition = 'none'
            topPathRef.current.style.transition = 'none'
            topPathRef.current.setAttribute('d', `M 0,0 Q ${controlX},${dropDistance} ${width},0`)
          }
        } else if (newScrollTop > maxScroll) {
          scrollTargetY.scrollTop = maxScroll
          const overscrollDist = Math.abs(newScrollTop - maxScroll)
          currentTranslateY = -rubberBand(overscrollDist, height)
          if (scrollTargetY.getAttribute('data-no-bounce') !== 'true') scrollTargetY.style.transform = `translateY(${currentTranslateY}px)`
          
          if (scrollTargetY.getAttribute('data-overscroll-glow') !== 'false' && bottomSvgRef.current && bottomPathRef.current) {
            const intensity = Math.min(1, Math.abs(currentTranslateY) / 100)
            const riseDistance = Math.abs(currentTranslateY) * 1.5
            bottomSvgRef.current.style.opacity = Math.min(1, intensity * 2).toString()
            bottomSvgRef.current.style.transition = 'none'
            bottomPathRef.current.style.transition = 'none'
            bottomPathRef.current.setAttribute('d', `M 0,400 Q ${controlX},${400 - riseDistance} ${width},400`)
          }
        } else {
          scrollTargetY.scrollTop = newScrollTop
          if (currentTranslateY !== 0) {
            currentTranslateY = 0
            scrollTargetY.style.transform = ''
          }
        }
      })
    }
    
    const handleContextMenu = (e: MouseEvent) => {
      if (hasDragged) {
        e.preventDefault()
      }
    }

    el.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    el.addEventListener('contextmenu', handleContextMenu)

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      el.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  // Fix SVG ids for gradient referencing
  const cleanTopId = topGradientId.replace(/:/g, '')
  const cleanBottomId = bottomGradientId.replace(/:/g, '')

  return (
    <div className={`relative overflow-hidden ${!absolute ? 'flex flex-col' : ''} ${className}`} {...props}>
      {/* Top Glow SVG */}
      <div className="absolute top-0 left-0 w-full h-[400px] overflow-visible pointer-events-none z-50">
        <svg ref={topSvgRef} className="w-full h-full opacity-0 overflow-visible will-change-[opacity,transform]" preserveAspectRatio="none">
          <defs>
            <linearGradient id={cleanTopId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(56,189,248,0.4)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
            </linearGradient>
          </defs>
          <path ref={topPathRef} d="M 0,0 Q 0,0 0,0" fill={`url(#${cleanTopId})`} stroke="rgba(56,189,248,0.8)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Bottom Glow SVG */}
      <div className="absolute bottom-0 left-0 w-full h-[400px] overflow-visible pointer-events-none z-50">
        <svg ref={bottomSvgRef} className="w-full h-full opacity-0 overflow-visible will-change-[opacity,transform]" preserveAspectRatio="none">
          <defs>
            <linearGradient id={cleanBottomId} x1="0" x2="0" y1="1" y2="0">
              <stop offset="0%" stopColor="rgba(56,189,248,0.4)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
            </linearGradient>
          </defs>
          <path ref={bottomPathRef} d="M 0,400 Q 0,400 0,400" fill={`url(#${cleanBottomId})`} stroke="rgba(56,189,248,0.8)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Scrollable Container */}
      <div ref={containerRef} className={`${absolute ? 'absolute inset-0' : 'flex-1 min-h-0 relative'} overflow-y-auto scrollbar-none custom-scrollbar-sidebar ${containerClassName}`}>
        {children}
      </div>
    </div>
  )
}
