import React, { useState, useEffect } from 'react'
import { useClockContext } from '../../contexts/ClockContext'
import { Play, Pause, X } from 'lucide-react'

export default function TimerPage() {
  const { timerState, startTimer, pauseTimer, resumeTimer, cancelTimer, getTimerRemainingMs } = useClockContext()
  
  const [inputH, setInputH] = useState(0)
  const [inputM, setInputM] = useState(25)
  const [inputS, setInputS] = useState(0)
  
  const [displayMs, setDisplayMs] = useState(getTimerRemainingMs())
  
  useEffect(() => {
    if (!timerState || timerState.status === 'completed') {
       setDisplayMs(0)
       return
    }
    
    // Update visual display every frame roughly
    let frameId: number
    const update = () => {
      setDisplayMs(getTimerRemainingMs())
      frameId = requestAnimationFrame(update)
    }
    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [timerState, getTimerRemainingMs])
  
  const handleStart = () => {
    const totalMs = (inputH * 3600 + inputM * 60 + inputS) * 1000
    if (totalMs > 0) {
      startTimer(totalMs)
    }
  }
  
  const formatTime = (ms: number) => {
    const totalSecs = Math.ceil(ms / 1000)
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = timerState && timerState.duration > 0 
    ? ((timerState.duration - displayMs) / timerState.duration) * 100 
    : 0

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] animate-in fade-in zoom-in-95 duration-500">
      
      {!timerState || timerState.status === 'completed' ? (
        <div className="w-full max-w-md space-y-8">
           <div className="flex items-center justify-center gap-4 text-5xl font-mono p-8 rounded-3xl border shadow-sm backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
             <div className="flex flex-col items-center">
               <input type="number" min="0" max="99" value={inputH} onChange={e => setInputH(Number(e.target.value))} className="w-20 text-center bg-transparent outline-none rounded-lg" style={{ backgroundColor: 'var(--clock-hover)' }} />
               <span className="text-sm text-muted-foreground mt-2 font-sans">Hours</span>
             </div>
             <span className="opacity-50 mb-6">:</span>
             <div className="flex flex-col items-center">
               <input type="number" min="0" max="59" value={inputM} onChange={e => setInputM(Number(e.target.value))} className="w-20 text-center bg-transparent outline-none hover:bg-accent focus:bg-accent rounded-lg" />
               <span className="text-sm text-muted-foreground mt-2 font-sans">Min</span>
             </div>
             <span className="opacity-50 mb-6">:</span>
             <div className="flex flex-col items-center">
               <input type="number" min="0" max="59" value={inputS} onChange={e => setInputS(Number(e.target.value))} className="w-20 text-center bg-transparent outline-none rounded-lg" style={{ backgroundColor: 'var(--clock-hover)' }} />
               <span className="text-sm text-muted-foreground mt-2 font-sans">Sec</span>
             </div>
           </div>
           
           <div className="flex justify-center">
             <button onClick={handleStart} className="w-24 h-24 rounded-full text-primary-foreground flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 hover:opacity-90" style={{ backgroundColor: 'var(--clock-timer-start)', boxShadow: '0 0 20px var(--clock-timer-start)' }}>
               <Play size={32} className="ml-2" />
             </button>
           </div>
           
           <div className="pt-8">
             <p className="text-center text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">Presets</p>
             <div className="flex flex-wrap justify-center gap-2">
               {[5, 10, 15, 25, 30, 45, 60].map(m => (
                 <button 
                   key={m} 
                   onClick={() => { setInputH(0); setInputM(m); setInputS(0); startTimer(m * 60000, `${m}m Timer`) }}
                   className="px-4 py-2 rounded-full text-sm font-bold transition-colors hover:opacity-90"
                   style={{ backgroundColor: 'var(--clock-card-bg)', color: 'var(--clock-text)' }}
                 >
                   {m}m
                 </button>
               ))}
             </div>
           </div>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col items-center">
          
          <div className="relative w-80 h-80 flex items-center justify-center mb-12">
            <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" className="text-border opacity-20" />
              <circle 
                cx="50" cy="50" r="48" fill="none" stroke={timerState.status === 'paused' ? '#f59e0b' : 'var(--clock-accent)'} strokeWidth="4" 
                className="transition-all duration-300 ease-linear"
                style={{ filter: 'drop-shadow(0 0 8px var(--clock-glow))' }}
                strokeDasharray="301.59" 
                strokeDashoffset={301.59 - (progress / 100) * 301.59} 
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center z-10">
              <span className="text-6xl font-bold font-mono tracking-tighter">
                {formatTime(displayMs)}
              </span>
              <span className="text-muted-foreground mt-2 font-medium capitalize">{timerState.status}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button onClick={cancelTimer} className="w-14 h-14 rounded-full hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--clock-card-bg)' }}>
              <X size={24} />
            </button>
            
            {timerState.status === 'running' ? (
              <button onClick={pauseTimer} className="w-20 h-20 rounded-full text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95" style={{ backgroundColor: 'var(--clock-timer-start)', boxShadow: '0 0 15px var(--clock-timer-start)' }}>
                <Pause size={32} />
              </button>
            ) : (
              <button onClick={resumeTimer} className="w-20 h-20 rounded-full text-primary-foreground flex items-center justify-center transition-transform hover:scale-105 active:scale-95 hover:opacity-90" style={{ backgroundColor: 'var(--clock-timer-start)', boxShadow: '0 0 15px var(--clock-timer-start)' }}>
                <Play size={32} className="ml-2" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
