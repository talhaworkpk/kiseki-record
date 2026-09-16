import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { ClockTimerState, ClockStopwatchState, ClockAlarm, ClockEvent } from '../lib/constants/clock'
import { NotificationEngine } from '../lib/NotificationEngine'
import { useAlarmStore } from '../components/GlobalAlarmOverlay'

interface ClockContextType {
  // Alarms
  alarms: ClockAlarm[]
  addAlarm: (alarm: ClockAlarm) => Promise<void>
  updateAlarm: (id: string, updates: Partial<ClockAlarm>) => Promise<void>
  deleteAlarm: (id: string) => Promise<void>
  toggleAlarm: (id: string, enabled: boolean) => Promise<void>
  
  // Timer
  timerState: ClockTimerState | null
  startTimer: (durationMs: number, label?: string) => void
  pauseTimer: () => void
  resumeTimer: () => void
  cancelTimer: () => void
  getTimerRemainingMs: () => number
  
  // Stopwatch
  stopwatchState: ClockStopwatchState | null
  startStopwatch: () => void
  pauseStopwatch: () => void
  resumeStopwatch: () => void
  resetStopwatch: () => void
  lapStopwatch: () => void
  getStopwatchElapsedMs: () => number
}

const ClockContext = createContext<ClockContextType | undefined>(undefined)

export function ClockProvider({ children }: { children: React.ReactNode }) {
  const [alarms, setAlarms] = useState<ClockAlarm[]>([])
  
  const [timerState, setTimerState] = useState<ClockTimerState | null>(() => {
    const saved = localStorage.getItem('kiseki_clock_timer')
    return saved ? JSON.parse(saved) : null
  })
  
  const [stopwatchState, setStopwatchState] = useState<ClockStopwatchState | null>(() => {
    const saved = localStorage.getItem('kiseki_clock_stopwatch')
    return saved ? JSON.parse(saved) : null
  })
  
  // Load alarms from DB
  useEffect(() => {
    const loadAlarms = async () => {
      // @ts-ignore
      const profile = await window.api.profile.getCurrent()
      // @ts-ignore
      const data = await window.api.db.find('clockAlarms', { profile })
      setAlarms(data)
    }
    loadAlarms()
  }, [])
  
  // Persist timer/stopwatch state when it changes
  useEffect(() => {
    if (timerState) {
      localStorage.setItem('kiseki_clock_timer', JSON.stringify(timerState))
    } else {
      localStorage.removeItem('kiseki_clock_timer')
    }
  }, [timerState])
  
  useEffect(() => {
    if (stopwatchState) {
      localStorage.setItem('kiseki_clock_stopwatch', JSON.stringify(stopwatchState))
    } else {
      localStorage.removeItem('kiseki_clock_stopwatch')
    }
  }, [stopwatchState])
  
  // ALARMS
  const addAlarm = async (alarm: ClockAlarm) => {
    // @ts-ignore
    const profile = await window.api.profile.getCurrent()
    // @ts-ignore
    const doc = await window.api.db.insert('clockAlarms', { ...alarm, profile })
    setAlarms(prev => [...prev, doc])
  }
  
  const updateAlarm = async (id: string, updates: Partial<ClockAlarm>) => {
    // @ts-ignore
    await window.api.db.update('clockAlarms', { _id: id }, { $set: updates }, {})
    setAlarms(prev => prev.map(a => a._id === id ? { ...a, ...updates } : a))
  }
  
  const deleteAlarm = async (id: string) => {
    // @ts-ignore
    await window.api.db.remove('clockAlarms', { _id: id }, {})
    setAlarms(prev => prev.filter(a => a._id !== id))
  }
  
  const toggleAlarm = async (id: string, enabled: boolean) => {
    await updateAlarm(id, { enabled })
  }
  
  // TIMER 
  const startTimer = (durationMs: number, label = 'Focus Timer') => {
    setTimerState({
      _id: Date.now().toString(),
      duration: durationMs,
      startTime: Date.now(),
      pausedAt: null,
      accumulatedElapsed: 0,
      status: 'running',
      label
    })
    
    recordClockEvent('timer_started', { label, durationMs })
  }
  
  const pauseTimer = () => {
    setTimerState(prev => {
      if (!prev || prev.status !== 'running') return prev
      return {
        ...prev,
        status: 'paused',
        pausedAt: Date.now()
      }
    })
  }
  
  const resumeTimer = () => {
    setTimerState(prev => {
      if (!prev || prev.status !== 'paused') return prev
      const now = Date.now()
      const pausedDuration = now - (prev.pausedAt || now)
      
      return {
        ...prev,
        status: 'running',
        pausedAt: null,
        accumulatedElapsed: prev.accumulatedElapsed + (prev.pausedAt ? (prev.pausedAt - (prev.startTime || prev.pausedAt)) : 0),
        startTime: now
      }
    })
  }
  
  const cancelTimer = () => {
    if (timerState && timerState.status !== 'completed') {
      recordClockEvent('timer_cancelled', { label: timerState.label })
    }
    setTimerState(null)
  }
  
  const getTimerRemainingMs = useCallback(() => {
    if (!timerState) return 0
    if (timerState.status === 'completed') return 0
    if (timerState.status === 'paused') {
      const elapsed = timerState.accumulatedElapsed + ((timerState.pausedAt || Date.now()) - (timerState.startTime || timerState.pausedAt || Date.now()))
      return Math.max(0, timerState.duration - elapsed)
    }
    
    const elapsed = timerState.accumulatedElapsed + (Date.now() - (timerState.startTime || Date.now()))
    return Math.max(0, timerState.duration - elapsed)
  }, [timerState])
  
  // STOPWATCH
  const startStopwatch = () => {
    setStopwatchState({
      _id: Date.now().toString(),
      startTime: Date.now(),
      pausedAt: null,
      accumulatedElapsed: 0,
      status: 'running',
      laps: []
    })
    recordClockEvent('stopwatch_started', {})
  }
  
  const pauseStopwatch = () => {
    setStopwatchState(prev => {
      if (!prev || prev.status !== 'running') return prev
      return {
        ...prev,
        status: 'paused',
        pausedAt: Date.now()
      }
    })
  }
  
  const resumeStopwatch = () => {
    setStopwatchState(prev => {
      if (!prev || prev.status !== 'paused') return prev
      const now = Date.now()
      
      return {
        ...prev,
        status: 'running',
        pausedAt: null,
        accumulatedElapsed: prev.accumulatedElapsed + (prev.pausedAt ? (prev.pausedAt - (prev.startTime || prev.pausedAt)) : 0),
        startTime: now
      }
    })
  }
  
  const lapStopwatch = () => {
    setStopwatchState(prev => {
      if (!prev || prev.status !== 'running') return prev
      
      const currentElapsed = prev.accumulatedElapsed + (Date.now() - (prev.startTime || Date.now()))
      
      return {
        ...prev,
        laps: [...prev.laps, {
          _id: Date.now().toString(),
          lapNumber: prev.laps.length + 1,
          elapsed: currentElapsed,
          timestamp: Date.now()
        }]
      }
    })
  }
  
  const resetStopwatch = () => {
    if (stopwatchState) {
       const elapsed = getStopwatchElapsedMs()
       recordClockEvent('stopwatch_completed', { durationMs: elapsed })
    }
    setStopwatchState(null)
  }
  
  const getStopwatchElapsedMs = useCallback(() => {
    if (!stopwatchState) return 0
    if (stopwatchState.status === 'paused') {
      return stopwatchState.accumulatedElapsed + ((stopwatchState.pausedAt || Date.now()) - (stopwatchState.startTime || stopwatchState.pausedAt || Date.now()))
    }
    
    return stopwatchState.accumulatedElapsed + (Date.now() - (stopwatchState.startTime || Date.now()))
  }, [stopwatchState])
  
  
  // TICKER LOOP for Timer & Alarms
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Check Timer
      if (timerState && timerState.status === 'running') {
        const remaining = getTimerRemainingMs()
        if (remaining <= 0) {
          // Timer finished
          setTimerState(prev => prev ? { ...prev, status: 'completed', accumulatedElapsed: prev.duration, startTime: null, pausedAt: null } : null)
          
          recordClockEvent('timer_completed', { label: timerState.label, durationMs: timerState.duration })
          
          triggerNotification(
            'Timer Complete', 
            `Your ${timerState.label || 'timer'} is finished.`, 
            'clock_timer',
            '/clock/timer'
          )
        }
      }
      
      // 2. Check Alarms
      if (alarms.length > 0) {
        const now = new Date()
        const currentH = now.getHours()
        const currentM = now.getMinutes()
        const currentDay = now.getDay()
        
        alarms.forEach(alarm => {
          if (!alarm.enabled) return
          
          const [alarmH, alarmM] = alarm.time.split(':').map(Number)
          
          if (alarmH === currentH && alarmM === currentM) {
            let shouldTrigger = false
            if (alarm.repeat === 'once') shouldTrigger = true
            else if (alarm.repeat === 'daily') shouldTrigger = true
            else if (alarm.repeat === 'weekdays' && currentDay >= 1 && currentDay <= 5) shouldTrigger = true
            else if (alarm.repeat === 'weekends' && (currentDay === 0 || currentDay === 6)) shouldTrigger = true
            else if (alarm.repeat === 'custom' && alarm.customDays?.includes(currentDay)) shouldTrigger = true
            
            if (shouldTrigger) {
              const lastT = alarm.lastTriggeredAt ? new Date(alarm.lastTriggeredAt) : null
              const alreadyTriggeredToday = lastT && 
                lastT.getFullYear() === now.getFullYear() && 
                lastT.getMonth() === now.getMonth() && 
                lastT.getDate() === now.getDate() &&
                lastT.getHours() === currentH &&
                lastT.getMinutes() === currentM
                
              if (!alreadyTriggeredToday) {
                triggerNotification('Alarm', alarm.label || 'Time to wake up!', 'clock_alarm', '/clock/alarm')
                recordClockEvent('alarm_triggered', { label: alarm.label })
                
                const updates: Partial<ClockAlarm> = { lastTriggeredAt: now.getTime() }
                if (alarm.repeat === 'once') updates.enabled = false
                updateAlarm(alarm._id!, updates)
              }
            }
          }
        })
      }
      
    }, 1000)
    
    return () => clearInterval(interval)
  }, [timerState, alarms, getTimerRemainingMs])
  
  // Helpers
  const recordClockEvent = async (type: ClockEvent['type'], options: { label?: string, durationMs?: number }) => {
    // @ts-ignore
    const profile = await window.api.profile.getCurrent()
    const event: ClockEvent = {
      timestamp: Date.now(),
      type,
      ...options,
      profile
    }
    // @ts-ignore
    await window.api.db.insert('clockEvents', event)
  }
  
  const triggerNotification = async (title: string, message: string, type: string, targetPath: string) => {
    const isAppFocused = document.hasFocus() && document.visibilityState === 'visible'

    try {
      await NotificationEngine.notify(type as any, title, message, 'Clock', targetPath)
      
      if (type === 'clock_alarm') {
        useAlarmStore.getState().triggerAlarm(title, message)
        
        try {
          if (Notification.permission === 'granted') {
            new Notification('Kiseki Record', { body: message })
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('Kiseki Record', { body: message })
              }
            })
          }
        } catch (e) {
          console.warn('Native notification failed:', e)
        }
      }

      // @ts-ignore
      await window.api.notifications.triggerInApp(type, title, message, 'Clock', targetPath)
    } catch (e) {
      console.warn("Notification failed", e)
    }
    
    playBeep()
  }

  return (
    <ClockContext.Provider value={{
      alarms, addAlarm, updateAlarm, deleteAlarm, toggleAlarm,
      timerState, startTimer, pauseTimer, resumeTimer, cancelTimer, getTimerRemainingMs,
      stopwatchState, startStopwatch, pauseStopwatch, resumeStopwatch, resetStopwatch, lapStopwatch, getStopwatchElapsedMs
    }}>
      {children}
    </ClockContext.Provider>
  )
}

export function useClockContext() {
  const context = useContext(ClockContext)
  if (context === undefined) {
    throw new Error('useClockContext must be used within a ClockProvider')
  }
  return context
}

function playBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    for (let i = 0; i < 2; i++) {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + (i * 200), audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start(audioCtx.currentTime + (i * 0.15));
        osc.stop(audioCtx.currentTime + (i * 0.15) + 0.1);
    }
  } catch (e) {
    console.error("Audio playback failed", e)
  }
}
