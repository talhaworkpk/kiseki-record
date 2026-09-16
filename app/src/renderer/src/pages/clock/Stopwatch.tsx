import React, { useState, useEffect } from 'react'
import { useClockContext } from '../../contexts/ClockContext'
import { Play, Pause, RotateCcw, Flag } from 'lucide-react'

export default function Stopwatch() {
  const { stopwatchState, startStopwatch, pauseStopwatch, resumeStopwatch, resetStopwatch, lapStopwatch, getStopwatchElapsedMs } = useClockContext()
  
  const [displayMs, setDisplayMs] = useState(getStopwatchElapsedMs())

  useEffect(() => {
    if (!stopwatchState || stopwatchState.status !== 'running') {
      setDisplayMs(getStopwatchElapsedMs())
      return
    }
    
    let frameId: number
    const update = () => {
      setDisplayMs(getStopwatchElapsedMs())
      frameId = requestAnimationFrame(update)
    }
    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [stopwatchState, getStopwatchElapsedMs])

  const formatTime = (ms: number, showMs = true) => {
    const totalSecs = Math.floor(ms / 1000)
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    const milliseconds = Math.floor((ms % 1000) / 10)
    
    let base = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    if (h > 0) {
      base = `${h.toString().padStart(2, '0')}:${base}`
    }
    if (showMs) {
      base += `.${milliseconds.toString().padStart(2, '0')}`
    }
    return base
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] animate-in fade-in zoom-in-95 duration-500 py-8">
      
      <div className="text-center mb-12">
        <h1 className="text-7xl md:text-8xl font-bold font-mono tracking-tighter tabular-nums drop-shadow-sm">
          {formatTime(displayMs)}
        </h1>
        {stopwatchState && (
          <p className="text-muted-foreground mt-4 font-medium uppercase tracking-wider">
            {stopwatchState.status}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-6 mb-12">
        {!stopwatchState ? (
          <button onClick={startStopwatch} className="w-20 h-20 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95">
            <Play size={32} className="ml-2" />
          </button>
        ) : (
          <>
            <button 
              onClick={stopwatchState.status === 'running' ? lapStopwatch : resetStopwatch} 
              className="w-14 h-14 rounded-full bg-accent hover:bg-accent/80 text-foreground flex items-center justify-center transition-colors shadow-sm"
            >
              {stopwatchState.status === 'running' ? <Flag size={20} /> : <RotateCcw size={20} />}
            </button>
            
            <button 
              onClick={stopwatchState.status === 'running' ? pauseStopwatch : resumeStopwatch} 
              className="w-20 h-20 rounded-full text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'var(--clock-stopwatch-start)', boxShadow: '0 0 15px var(--clock-stopwatch-start)' }}
            >
              {stopwatchState.status === 'running' ? <Pause size={32} /> : <Play size={32} className="ml-2" />}
            </button>
          </>
        )}
      </div>
      
      {stopwatchState && stopwatchState.laps.length > 0 && (
        <div className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="max-h-[250px] overflow-y-auto">
            {stopwatchState.laps.slice().reverse().map((lap, index) => {
              const prevLap = stopwatchState.laps[stopwatchState.laps.length - 2 - index]
              const lapDiff = prevLap ? lap.elapsed - prevLap.elapsed : lap.elapsed
              
              return (
                <div key={lap._id} className="flex justify-between items-center p-4 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                  <span className="text-muted-foreground font-medium">Lap {lap.lapNumber}</span>
                  <div className="flex gap-4 font-mono text-sm">
                    <span className="text-muted-foreground">+{formatTime(lapDiff)}</span>
                    <span className="font-bold w-24 text-right">{formatTime(lap.elapsed)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
    </div>
  )
}
