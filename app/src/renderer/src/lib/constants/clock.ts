export type RepeatType = 'once' | 'daily' | 'weekdays' | 'weekends' | 'custom'

export interface ClockAlarm {
  _id?: string
  time: string // "HH:MM" 24h format
  label: string
  repeat: RepeatType
  customDays?: number[] // 0 (Sun) to 6 (Sat)
  sound: string
  enabled: boolean
  snoozeDuration: number // minutes
  lastTriggeredAt?: number // timestamp
  profile?: string
}

export interface ClockTimerState {
  _id: string
  duration: number // total ms
  startTime: number | null // timestamp when started/resumed
  pausedAt: number | null // timestamp when paused
  accumulatedElapsed: number // ms elapsed before current pause/resume segment
  status: 'stopped' | 'running' | 'paused' | 'completed'
  label: string
}

export interface ClockStopwatchLap {
  _id: string
  lapNumber: number
  elapsed: number // ms at the time of lap
  timestamp: number // when lap was recorded
}

export interface ClockStopwatchState {
  _id: string
  startTime: number | null
  pausedAt: number | null
  accumulatedElapsed: number
  status: 'stopped' | 'running' | 'paused'
  laps: ClockStopwatchLap[]
}

export interface ClockEvent {
  _id?: string
  timestamp: number
  type: 'timer_started' | 'timer_completed' | 'timer_cancelled' | 'alarm_created' | 'alarm_triggered' | 'alarm_dismissed' | 'stopwatch_started' | 'stopwatch_completed'
  durationMs?: number
  label?: string
  profile?: string
}
