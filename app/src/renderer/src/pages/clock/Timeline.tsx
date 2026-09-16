import React, { useState, useEffect } from 'react'
import { History, Timer, TimerReset, Bell, CheckCircle2, Play, XCircle } from 'lucide-react'
import { ClockEvent } from '../../lib/constants/clock'

export default function Timeline() {
  const [events, setEvents] = useState<ClockEvent[]>([])
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // @ts-ignore
        const profile = await window.api.profile.getCurrent()
        
        // Calculate date boundaries
        const now = new Date()
        let minTimestamp = 0
        
        if (filter === 'today') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          minTimestamp = start.getTime()
        } else if (filter === 'week') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
          minTimestamp = start.getTime()
        } else if (filter === 'month') {
          const start = new Date(now.getFullYear(), now.getMonth(), 1)
          minTimestamp = start.getTime()
        }
        
        const query: any = { profile }
        if (minTimestamp > 0) {
           query.timestamp = { $gte: minTimestamp }
        }
        
        // @ts-ignore
        const data = await window.api.db.find('clockEvents', query)
        // Sort descending
        data.sort((a: ClockEvent, b: ClockEvent) => b.timestamp - a.timestamp)
        setEvents(data)
      } catch (err) {
        console.error('Failed to fetch clock events', err)
      }
    }
    
    fetchEvents()
  }, [filter])

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    const totalMins = Math.round(ms / 60000)
    if (totalMins < 60) return `${totalMins}m`
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const getEventIcon = (type: ClockEvent['type']) => {
    switch (type) {
      case 'timer_started': return <Play className="text-blue-500" size={16} />
      case 'timer_completed': return <CheckCircle2 className="text-green-500" size={16} />
      case 'timer_cancelled': return <XCircle className="text-red-500" size={16} />
      case 'alarm_created': return <Bell className="text-amber-500" size={16} />
      case 'alarm_triggered': return <Bell className="text-amber-500" size={16} />
      case 'alarm_dismissed': return <CheckCircle2 className="text-amber-500" size={16} />
      case 'stopwatch_started': return <Play className="text-blue-500" size={16} />
      case 'stopwatch_completed': return <TimerReset className="text-blue-500" size={16} />
      default: return <History size={16} />
    }
  }

  const getEventTitle = (e: ClockEvent) => {
    switch (e.type) {
      case 'timer_started': return 'Timer Started'
      case 'timer_completed': return 'Timer Completed'
      case 'timer_cancelled': return 'Timer Cancelled'
      case 'alarm_created': return 'Alarm Created'
      case 'alarm_triggered': return 'Alarm Triggered'
      case 'alarm_dismissed': return 'Alarm Dismissed'
      case 'stopwatch_started': return 'Stopwatch Started'
      case 'stopwatch_completed': return 'Stopwatch Session'
      default: return e.type
    }
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 py-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono flex items-center gap-3">
            <History className="text-primary" /> Timeline
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">A record of how you've spent your time.</p>
        </div>
        
        <div className="flex bg-accent rounded-lg p-1">
          {(['today', 'week', 'month', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-bold capitalize transition-all ${filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      <div className="rounded-3xl p-8 shadow-sm border backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
        {events.length === 0 ? (
          <div className="text-center py-12">
            <History size={48} className="mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-bold">Your time story will appear here</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">Complete a timer or stopwatch session to begin building your timeline.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-border ml-4 space-y-8 pb-4">
            {events.map((event, i) => {
              const date = new Date(event.timestamp)
              const isNewDay = i === 0 || new Date(events[i-1].timestamp).getDate() !== date.getDate()
              
              return (
                <div key={event._id || i}>
                  {isNewDay && (
                    <div className="mb-6 -ml-4 pl-4 pt-4">
                      <span className="bg-accent text-muted-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  
                  <div className="relative pl-8 group">
                    <div className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-background border-2 border-border group-hover:border-primary transition-colors flex items-center justify-center">
                    </div>
                    
                    <div className="bg-background border border-border group-hover:border-primary/30 rounded-xl p-4 shadow-sm transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-accent rounded-md">
                            {getEventIcon(event.type)}
                          </div>
                          <span className="font-bold text-sm">{getEventTitle(event)}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{event.label || 'Session'}</span>
                        {event.durationMs && (
                          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {formatDuration(event.durationMs)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
    </div>
  )
}
