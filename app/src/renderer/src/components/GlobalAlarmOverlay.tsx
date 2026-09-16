import React from 'react'
import { create } from 'zustand'

interface AlarmEventDetail {
  title: string
  message: string
}

interface AlarmStore {
  isOpen: boolean
  alarmData: AlarmEventDetail | null
  triggerAlarm: (title: string, message: string) => void
  dismissAlarm: () => void
}

export const useAlarmStore = create<AlarmStore>((set) => ({
  isOpen: false,
  alarmData: null,
  triggerAlarm: (title, message) => set({ isOpen: true, alarmData: { title, message } }),
  dismissAlarm: () => set({ isOpen: false, alarmData: null })
}))

export function GlobalAlarmOverlay() {
  const { isOpen, alarmData, dismissAlarm } = useAlarmStore()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/30 via-background/90 to-background/95 backdrop-blur-md animate-in fade-in duration-300">
      <style>{`
        @keyframes popAndRotateBell {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(15deg); opacity: 1; }
          75% { transform: scale(0.9) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes ringBell {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          50% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes shineCheck {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
      `}</style>
      
      <div 
        className="relative flex flex-col items-center justify-center gap-8 mb-8" 
        style={{ animation: 'popAndRotateBell 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        <div style={{ animation: 'ringBell 2s ease-in-out infinite 1s' }}>
          {/* 3D Bell SVG */}
          <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
            {/* Base Back */}
            <circle cx="120" cy="125" r="90" fill="#78350f" opacity="0.4" transform="rotate(-6 120 120)" />
            <circle cx="120" cy="120" r="90" fill="#92400e" opacity="0.6" transform="rotate(-3 120 120)" />
            
            {/* Main Circle */}
            <circle cx="120" cy="120" r="90" fill="#f59e0b" />
            <circle cx="120" cy="120" r="80" fill="#fbbf24" opacity="0.2" />
            
            {/* Inner Ring */}
            <circle cx="120" cy="120" r="70" fill="none" stroke="#d97706" strokeWidth="4" opacity="0.5" />
            
            {/* 3D Bell Shadow */}
            <path d="M 120 70 C 95 70 80 90 80 120 L 70 150 L 170 150 L 160 120 C 160 90 145 70 120 70 Z" fill="#78350f" opacity="0.4" transform="translate(5, 5)" />
            <path d="M 110 160 C 110 165 115 170 120 170 C 125 170 130 165 130 160" fill="#78350f" opacity="0.4" stroke="#78350f" strokeWidth="8" strokeLinecap="round" transform="translate(5, 5)" />
            
            {/* 3D Bell Main */}
            <path d="M 120 70 C 95 70 80 90 80 120 L 70 150 L 170 150 L 160 120 C 160 90 145 70 120 70 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="8" strokeLinejoin="round" />
            <path d="M 110 160 C 110 165 115 170 120 170 C 125 170 130 165 130 160" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
            
            {/* Shiny Overlay */}
            <g style={{ clipPath: 'url(#checkClip)' }}>
              <rect x="0" y="0" width="40" height="240" fill="white" opacity="0.3" style={{ animation: 'shineCheck 3s infinite linear' }} />
            </g>
            <defs>
              <clipPath id="checkClip">
                <circle cx="120" cy="120" r="90" />
              </clipPath>
            </defs>
          </svg>
        </div>
      </div>

      <div className="flex flex-col items-center text-center max-w-lg space-y-4 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-300 fill-mode-both">
        <h1 className="text-5xl font-black bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent drop-shadow-sm">
          {alarmData?.title || 'Alarm'}
        </h1>
        <p className="text-xl text-muted-foreground font-medium">
          {alarmData?.message || 'Time is up!'}
        </p>
        
        <button 
          onClick={dismissAlarm}
          className="mt-8 px-10 py-4 rounded-full bg-foreground text-background font-bold hover:scale-105 active:scale-95 transition-transform shadow-xl cursor-pointer pointer-events-auto"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
