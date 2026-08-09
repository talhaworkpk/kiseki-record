import { useEffect, useState } from 'react'

export function ShootingStars() {
  const [stars, setStars] = useState<{id: number, top: number, left: number, delay: number, duration: number}[]>([])

  useEffect(() => {
    // Generate shooting stars with random positions, delays, and durations
    const newStars = Array.from({ length: 75 }).map((_, i) => ({
      id: i,
      top: Math.random() * -50 - 10, // Start slightly above the screen
      left: Math.random() * 120 - 30, // Start anywhere between -30vw to 90vw
      delay: Math.random() * 8, // More frequent overlapping
      duration: Math.random() * 3 + 2.5 // Slightly faster
    }))
    setStars(newStars)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-70">
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute h-[3px] w-[150px] bg-gradient-to-r from-transparent via-black to-transparent"
          style={{
            top: `${star.top}vh`,
            left: `${star.left}vw`,
            animation: `shootingStarAnim ${star.duration}s ${star.delay}s infinite linear`,
            opacity: 1,
            transform: 'rotate(45deg)'
          }}
        />
      ))}
    </div>
  )
}
