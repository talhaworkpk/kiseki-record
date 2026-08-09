import React from 'react'
import { Sun, Moon, Flame } from 'lucide-react'

export function DynamicWelcome({ data }: any) {
  const hour = new Date().getHours()
  let greeting = 'Welcome back!'
  let Icon = Sun
  
  if (hour < 12) {
    greeting = 'Good Morning! Ready to start another productive day?'
    Icon = Sun
  } else if (hour < 18) {
    greeting = 'Good Afternoon! Keep up the great work.'
    Icon = Sun
  } else {
    greeting = 'Welcome back! Here\'s what happened today.'
    Icon = Moon
  }

  // Streak calculation removed as per user request to remove mockup data

  return (
    <div className="flex items-center gap-4 py-4 mb-2">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
        <Icon size={28} />
      </div>
      <div>
        <h1 className="text-3xl font-black tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground mt-1 text-sm font-bold uppercase tracking-widest">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
