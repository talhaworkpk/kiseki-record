import React, { useState, useEffect } from 'react'
import { BrainCircuit, Clock, Timer, Zap, Activity } from 'lucide-react'
import { ClockEvent } from '../../lib/constants/clock'

export default function AISight() {
  const [events, setEvents] = useState<ClockEvent[]>([])
  
  const [stats, setStats] = useState({
    totalTimersCompleted: 0,
    totalTimerDurationMs: 0,
    totalStopwatchDurationMs: 0,
    totalAlarmsTriggered: 0,
    mostActiveHour: -1,
  })

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // @ts-ignore
        const profile = await window.api.profile.getCurrent()
        // @ts-ignore
        const data = await window.api.db.find('clockEvents', { profile })
        setEvents(data)
        
        let completedTimers = 0
        let timerMs = 0
        let stopwatchMs = 0
        let alarms = 0
        const hourCounts: Record<number, number> = {}
        
        data.forEach((e: ClockEvent) => {
          const h = new Date(e.timestamp).getHours()
          hourCounts[h] = (hourCounts[h] || 0) + 1
          
          if (e.type === 'timer_completed') {
            completedTimers++
            if (e.durationMs) timerMs += e.durationMs
          } else if (e.type === 'stopwatch_completed') {
            if (e.durationMs) stopwatchMs += e.durationMs
          } else if (e.type === 'alarm_triggered') {
            alarms++
          }
        })
        
        let maxCount = 0
        let topHour = -1
        Object.entries(hourCounts).forEach(([hourStr, count]) => {
          if (count > maxCount) {
            maxCount = count
            topHour = parseInt(hourStr)
          }
        })
        
        setStats({
          totalTimersCompleted: completedTimers,
          totalTimerDurationMs: timerMs,
          totalStopwatchDurationMs: stopwatchMs,
          totalAlarmsTriggered: alarms,
          mostActiveHour: topHour,
        })
      } catch (err) {
        console.error('Failed to load events for AI Sight', err)
      }
    }
    
    fetchEvents()
  }, [])

  const formatDurationStr = (ms: number) => {
    if (ms === 0) return '0h 0m'
    const totalMins = Math.round(ms / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const getHourString = (h: number) => {
    if (h < 0) return 'N/A'
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:00 ${ampm}`
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 py-8">
      
      <div className="mb-12">
        <h1 className="text-3xl font-bold font-mono flex items-center gap-3">
          <BrainCircuit className="text-purple-500" /> AI Sight
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Deterministic analysis of your time patterns.</p>
      </div>
      
      {events.length < 5 ? (
        <div className="text-center p-12 rounded-3xl border shadow-sm backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
          <BrainCircuit size={48} className="mx-auto text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-xl font-bold">Not enough activity yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-sm">
            Keep using the Clock. Complete some focus timers or use the stopwatch to generate insights about your patterns.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="border p-6 rounded-2xl shadow-sm backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Timer size={18} />
                <span className="font-bold text-xs uppercase tracking-wider">Timers Completed</span>
              </div>
              <p className="text-4xl font-bold font-mono">{stats.totalTimersCompleted}</p>
            </div>
            
            <div className="border p-6 rounded-2xl shadow-sm backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
              <div className="flex items-center gap-2 text-blue-500 mb-2">
                <Clock size={18} />
                <span className="font-bold text-xs uppercase tracking-wider">Total Focus Time</span>
              </div>
              <p className="text-3xl font-bold font-mono">{formatDurationStr(stats.totalTimerDurationMs)}</p>
            </div>
            
            <div className="border p-6 rounded-2xl shadow-sm backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Activity size={18} />
                <span className="font-bold text-xs uppercase tracking-wider">Most Active Time</span>
              </div>
              <p className="text-3xl font-bold font-mono">{getHourString(stats.mostActiveHour)}</p>
            </div>
            
            <div className="border p-6 rounded-2xl shadow-sm backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
              <div className="flex items-center gap-2 text-green-500 mb-2">
                <Zap size={18} />
                <span className="font-bold text-xs uppercase tracking-wider">Total Events</span>
              </div>
              <p className="text-4xl font-bold font-mono">{events.length}</p>
            </div>
            
          </div>
          
          <div className="border rounded-3xl p-8 shadow-sm backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <BrainCircuit className="text-purple-500" size={20} /> Observations
            </h3>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 text-primary rounded-full shrink-0"><Timer size={16} /></div>
                <div>
                  <h4 className="font-bold text-sm">Focus Habit</h4>
                  <p className="text-muted-foreground text-sm">
                    {stats.totalTimersCompleted > 0 
                      ? `You've completed ${stats.totalTimersCompleted} focus sessions, accumulating ${formatDurationStr(stats.totalTimerDurationMs)} of deep work.`
                      : "You haven't completed any focus sessions yet."}
                  </p>
                </div>
              </li>
              
              <li className="flex items-start gap-4">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-full shrink-0"><Activity size={16} /></div>
                <div>
                  <h4 className="font-bold text-sm">Peak Productivity</h4>
                  <p className="text-muted-foreground text-sm">
                    {stats.mostActiveHour >= 0 
                      ? `Your peak interaction time is around ${getHourString(stats.mostActiveHour)}, suggesting this is your most active window.`
                      : "Not enough data to determine peak productivity times."}
                  </p>
                </div>
              </li>
            </ul>
          </div>
          
        </div>
      )}
      
    </div>
  )
}
