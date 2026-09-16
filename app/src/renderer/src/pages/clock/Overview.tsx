import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClockContext } from '../../contexts/ClockContext'
import { Play, Timer as TimerIcon, Bell, TimerReset, Zap } from 'lucide-react'

import { useClockAppearance } from '../../contexts/ClockAppearanceContext'

export default function Overview() {
  const navigate = useNavigate()
  const { timerState, stopwatchState, alarms, startTimer } = useClockContext()
  const { settings } = useClockAppearance()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const activeAlarms = alarms.filter(a => a.enabled)

  const handleQuickTimer = (minutes: number) => {
    startTimer(minutes * 60 * 1000, `${minutes}m Timer`)
    navigate('/clock/timer')
  }

  const g = settings.gradient;
  const gradientStyle = g.enabled ? (
    g.type === 'premium' && g.premiumColors
      ? `linear-gradient(${g.direction || '-45deg'}, ${g.premiumColors.join(', ')})`
      : `linear-gradient(${g.direction || 'to right'}, ${g.color1}, ${g.color2})`
  ) : 'var(--clock-primary-bg)';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Hero Time Display */}
      <style>{`
        @keyframes premium-gradient-anim {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="flex flex-col items-center justify-center p-12 rounded-3xl border shadow-xl relative overflow-hidden backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ 
          opacity: settings.gradient.opacity ?? 1,
          background: gradientStyle,
          backgroundSize: g.enabled && g.type === 'premium' ? '400% 400%' : '100% 100%',
          animation: g.enabled && g.type === 'premium' ? 'premium-gradient-anim 15s ease infinite' : 'none'
        }}></div>
        <h1 className="text-7xl md:text-8xl font-bold tracking-tighter mb-4 drop-shadow-sm font-mono text-[var(--clock-text)]">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-xl text-muted-foreground font-medium">
          {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Active Timer Card */}
        <div className="rounded-2xl p-6 border shadow-sm flex flex-col h-full transition-colors backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
          <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--clock-accent)' }}>
            <TimerIcon size={20} />
            <h3 className="font-bold">Active Timer</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {timerState ? (
              <div className="text-center cursor-pointer group" onClick={() => navigate('/clock/timer')}>
                <div className="text-3xl font-bold font-mono transition-colors" style={{ color: 'var(--clock-text)' }}>
                   {timerState.status === 'completed' ? 'Done' : timerState.label}
                </div>
                <div className="text-sm text-muted-foreground mt-2 capitalize">{timerState.status}</div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground flex flex-col items-center gap-3">
                <p>No active timers</p>
                <button 
                  onClick={() => navigate('/clock/timer')}
                  className="px-4 py-2 rounded-full text-sm font-bold transition-colors hover:opacity-90 text-white"
                  style={{ background: 'var(--clock-primary-bg)' }}
                >
                  Start one when you're ready
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stopwatch Card */}
        <div className="rounded-2xl p-6 border shadow-sm flex flex-col h-full transition-colors backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
          <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--clock-accent)' }}>
            <TimerReset size={20} />
            <h3 className="font-bold">Stopwatch</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center">
             {stopwatchState ? (
              <div className="text-center cursor-pointer group" onClick={() => navigate('/clock/stopwatch')}>
                <div className="text-3xl font-bold font-mono transition-colors" style={{ color: 'var(--clock-text)' }}>
                  Running
                </div>
                <div className="text-sm text-muted-foreground mt-2 capitalize">{stopwatchState.status}</div>
              </div>
             ) : (
               <div className="text-center text-muted-foreground flex flex-col items-center gap-3">
                 <p>Ready when you are</p>
                 <button 
                  onClick={() => navigate('/clock/stopwatch')}
                  className="px-4 py-2 rounded-full text-sm font-bold transition-colors hover:opacity-90 text-white"
                  style={{ background: 'var(--clock-primary-bg)' }}
                 >
                   Start Session
                 </button>
               </div>
             )}
          </div>
        </div>

        {/* Alarms Card */}
        <div className="rounded-2xl p-6 border shadow-sm flex flex-col h-full transition-colors backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
          <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--clock-accent)' }}>
            <Bell size={20} />
            <h3 className="font-bold">Alarms</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {activeAlarms.length > 0 ? (
               <div className="space-y-3 cursor-pointer" onClick={() => navigate('/clock/alarm')}>
                 {activeAlarms.slice(0, 3).map(a => (
                   <div key={a._id} className="flex justify-between items-center text-sm p-2 rounded-lg" style={{ backgroundColor: 'var(--clock-hover)' }}>
                     <span className="font-bold">{a.time}</span>
                     <span className="text-muted-foreground truncate max-w-[120px]">{a.label}</span>
                   </div>
                 ))}
                 {activeAlarms.length > 3 && (
                   <div className="text-xs text-center text-muted-foreground pt-2">+{activeAlarms.length - 3} more</div>
                 )}
               </div>
            ) : (
              <div className="text-center text-muted-foreground flex flex-col items-center gap-3">
                <p>No active alarms</p>
                <button 
                  onClick={() => navigate('/clock/alarm')}
                  className="px-4 py-2 rounded-full text-sm font-bold transition-colors hover:opacity-90 text-white"
                  style={{ background: 'var(--clock-primary-bg)' }}
                >
                  Create one
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Quick Presets */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--clock-accent)' }}>
          <Zap size={18} /> Quick Start
        </h3>
        <div className="flex flex-wrap gap-3">
          {[5, 10, 15, 25, 30, 60].map(m => (
            <button
              key={m}
              onClick={() => handleQuickTimer(m)}
              className="flex-1 min-w-[100px] flex items-center justify-center gap-2 p-4 rounded-xl border transition-all group font-bold shadow-sm backdrop-blur-[var(--clock-backdrop-blur)] hover:opacity-90 text-white"
              style={{ background: 'var(--clock-primary-bg)', borderColor: 'var(--clock-border)' }}
            >
              <Play size={16} className="opacity-50 group-hover:opacity-100" />
              {m} min
            </button>
          ))}
        </div>
      </div>
      
    </div>
  )
}
