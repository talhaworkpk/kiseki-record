import React, { useEffect, useRef } from 'react'

export function BirthdayBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }
    window.addEventListener('resize', handleResize)

    const particles: any[] = []
    const colors = ['#f472b6', '#c084fc', '#818cf8', '#60a5fa', '#34d399', '#fbbf24', '#facc15']

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height - height, // Start off-screen above
        r: Math.random() * 6 + 2, // Radius
        d: Math.random() * 150 + 10, // Density
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleInc: (Math.random() * 0.07) + 0.05,
        tiltAngle: 0
      })
    }

    let animationFrameId: number
    let angle = 0

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      
      angle += 0.01
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        
        p.tiltAngle += p.tiltAngleInc
        // Move downwards and sway sideways
        p.y += (Math.cos(angle + p.d) + 1 + p.r / 2) / 2
        p.x += Math.sin(angle)
        
        // Wrap around when falling off screen
        if (p.x > width + 20 || p.x < -20 || p.y > height) {
          p.x = Math.random() * width
          p.y = -20
          p.tilt = Math.floor(Math.random() * 10) - 10
        }

        ctx.beginPath()
        ctx.lineWidth = p.r
        ctx.strokeStyle = p.color
        ctx.moveTo(p.x + p.tilt + p.r, p.y)
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r)
        ctx.stroke()
      }

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0 opacity-60 dark:opacity-40"
      style={{ mixBlendMode: 'normal' }}
    />
  )
}
