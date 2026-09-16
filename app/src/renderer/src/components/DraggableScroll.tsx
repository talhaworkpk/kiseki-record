import React, { useState, useRef, HTMLAttributes } from 'react'

interface DraggableScrollProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: React.ReactNode
}

export function DraggableScroll({ className = '', children, ...props }: DraggableScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    e.preventDefault()
    setIsDragging(true)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY !== 0 && scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY
    }
  }

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDragStart={(e) => e.preventDefault()}
      className={`w-full max-w-full select-none ${className} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      {...props}
    >
      {children}
    </div>
  )
}
