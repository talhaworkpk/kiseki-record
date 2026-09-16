import { useState, useEffect, useMemo } from 'react'
import { Habit, HabitDailyRecord, HabitBreak } from '../types'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, format, isBefore, isAfter, startOfDay, parseISO } from 'date-fns'

export type FilterPeriod = 'date' | 'week' | 'month' | 'year'

interface AnalyticsResult {
  completedCount: number
  missedCount: number
  overcameResistanceCount: number
  breakDurationFormatted: string
  chartData: Array<{ name: string; completed: number; missed: number; date: string; difficultyLevel?: string | null }>
  isBeforeCreation: boolean
}

export function useHabitAnalytics(
  habit: Habit | null, 
  filter: FilterPeriod, 
  currentDate: Date,
  customStartDate?: Date, 
  customEndDate?: Date
) {
  const [logs, setLogs] = useState<HabitDailyRecord[]>([])
  const [breaks, setBreaks] = useState<HabitBreak[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!habit || !habit._id) {
      setLogs([])
      setBreaks([])
      return
    }

    const loadData = async () => {
      setLoading(true)
      try {
        // @ts-ignore
        const hLogs: HabitDailyRecord[] = await window.api.db.find('habitLogs', { habitId: habit._id })
        // @ts-ignore
        const hBreaks: HabitBreak[] = await window.api.db.find('habitBreaks', { habitId: habit._id })
        setLogs(hLogs || [])
        setBreaks(hBreaks || [])
      } catch (err) {
        console.error('Failed to load analytics data', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [habit])

  const analytics = useMemo<AnalyticsResult | null>(() => {
    if (!habit || !habit.createdAt) return null

    const createdAt = new Date(habit.createdAt)
    const startOfCreatedAt = startOfDay(createdAt)

    let startDate: Date
    let endDate: Date

    // Determine period boundaries
    switch (filter) {
      case 'week':
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 }) // Assuming Monday start
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(currentDate)
        endDate = endOfMonth(currentDate)
        break
      case 'year':
        startDate = startOfYear(currentDate)
        endDate = endOfYear(currentDate)
        break
      case 'date':
        startDate = customStartDate || startOfDay(new Date())
        endDate = customEndDate || startOfDay(new Date())
        break
    }

    if (isBefore(endDate, startOfCreatedAt)) {
       // Period is completely before habit creation
       return {
         completedCount: 0,
         missedCount: 0,
         overcameResistanceCount: 0,
         breakDurationFormatted: '-',
         chartData: [],
         isBeforeCreation: true
       }
    }

    // Clamp effective start date to when the habit was created
    const effectiveStartDate = isBefore(startDate, startOfCreatedAt) ? startOfCreatedAt : startDate

    let completedCount = 0
    let missedCount = 0
    let overcameResistanceCount = 0
    let chartData: Array<{ name: string; completed: number; missed: number; date: string; difficultyLevel?: string | null }> = []

    // Helper to check if habit is scheduled for a given date
    const isScheduled = (d: Date) => {
      const day = d.getDay()
      if (habit.scheduleType === 'daily') return true
      if (habit.scheduleType === 'weekdays') return day >= 1 && day <= 5
      if (habit.scheduleType === 'weekends') return day === 0 || day === 6
      if (habit.scheduleType === 'specific_days' && habit.scheduleDays) {
        return habit.scheduleDays.includes(day)
      }
      return true // default fallback
    }

    // Helper to check if a date is within any habit break
    const isWithinBreak = (d: Date) => {
      return breaks.some(b => {
        const bStart = startOfDay(parseISO(b.startDate))
        const bEnd = b.endDate ? startOfDay(parseISO(b.endDate)) : startOfDay(new Date())
        return (!isBefore(d, bStart) && !isAfter(d, bEnd))
      })
    }

    if (filter === 'year') {
      // Aggregate by month for Year filter
      const monthsMap: Record<string, { c: number, m: number, name: string }> = {}
      
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(startDate.getFullYear(), i, 1)
        if (isBefore(endOfMonth(monthDate), startOfCreatedAt) || isAfter(monthDate, new Date())) {
          continue; 
        }
        const mKey = format(monthDate, 'yyyy-MM')
        monthsMap[mKey] = { c: 0, m: 0, name: format(monthDate, 'MMM') }
      }

      // Pre-fill days in valid months to calculate inferred misses
      const todayStart = startOfDay(new Date())
      const daysInYear = eachDayOfInterval({ start: effectiveStartDate, end: isBefore(endDate, todayStart) ? endDate : todayStart })
      
      const loggedDays = new Set<string>()

      logs.forEach(l => {
        const logDate = parseISO(l.date)
        if (isBefore(logDate, effectiveStartDate) || isAfter(logDate, endDate)) return
        
        loggedDays.add(l.date)
        const mKey = format(logDate, 'yyyy-MM')
        if (monthsMap[mKey]) {
          if (l.status === 'completed') {
             monthsMap[mKey].c++
             completedCount++
             if (l.difficultyLevel === 'difficult' || l.difficultyLevel === 'very_difficult' || l.difficultyLevel === 'couldnt_resist') {
               overcameResistanceCount++
             }
          }
          if (l.status === 'missed') {
             monthsMap[mKey].m++
             missedCount++
          }
        }
      })

      // Infer misses / Bad habit completions
      daysInYear.forEach(d => {
        const dKey = format(d, 'yyyy-MM-dd')
        const mKey = format(d, 'yyyy-MM')
        // Only infer miss if day is strictly in the past (before today)
        if (!loggedDays.has(dKey) && isBefore(d, todayStart) && monthsMap[mKey]) {
          if (isScheduled(d) && !isWithinBreak(d)) {
            if (habit.category === 'Bad Habit') {
              monthsMap[mKey].c++
              completedCount++
            } else {
              monthsMap[mKey].m++
              missedCount++
            }
          }
        }
      })

      chartData = Object.keys(monthsMap).sort().map(k => ({
        name: monthsMap[k].name,
        date: k,
        completed: monthsMap[k].c,
        missed: monthsMap[k].m
      }))
    } else {
      // By individual day for Week, Month, Date
      const todayStart = startOfDay(new Date())
      const days = eachDayOfInterval({ start: effectiveStartDate, end: isBefore(endDate, todayStart) ? endDate : todayStart })
      
      const dayMap: Record<string, { c: number, m: number, name: string, difficultyLevel?: string | null }> = {}
      days.forEach(d => {
        const dKey = format(d, 'yyyy-MM-dd')
        dayMap[dKey] = { c: 0, m: 0, name: format(d, 'MMM d'), difficultyLevel: null }
      })

      const loggedDays = new Set<string>()

      logs.forEach(l => {
        if (dayMap[l.date]) {
          loggedDays.add(l.date)
          dayMap[l.date].difficultyLevel = l.difficultyLevel
          if (l.status === 'completed') {
             dayMap[l.date].c++
             completedCount++
             if (l.difficultyLevel === 'difficult' || l.difficultyLevel === 'very_difficult' || l.difficultyLevel === 'couldnt_resist') {
               overcameResistanceCount++
             }
          }
          if (l.status === 'missed') {
             dayMap[l.date].m++
             missedCount++
          }
        }
      })

      // Infer misses / Bad habit completions
      days.forEach(d => {
        const dKey = format(d, 'yyyy-MM-dd')
        if (!loggedDays.has(dKey) && isBefore(d, todayStart) && dayMap[dKey]) {
          if (isScheduled(d) && !isWithinBreak(d)) {
            if (habit.category === 'Bad Habit') {
              dayMap[dKey].c++
              completedCount++
            } else {
              dayMap[dKey].m++
              missedCount++
            }
          }
        }
      })

      chartData = Object.keys(dayMap).sort().map(k => ({
        name: dayMap[k].name,
        date: k,
        completed: dayMap[k].c,
        missed: dayMap[k].m,
        difficultyLevel: dayMap[k].difficultyLevel
      }))
    }

    // Calculate Break Duration
    // Sum durations of breaks that overlap with the effective period
    let totalBreakMs = 0
    breaks.forEach(b => {
      const bStart = parseISO(b.startDate)
      // Break end is either its explicit end date or today if autoResume is active
      const bEnd = b.endDate ? parseISO(b.endDate) : new Date()
      
      // Calculate intersection
      const intStart = isBefore(bStart, effectiveStartDate) ? effectiveStartDate : bStart
      const intEnd = isAfter(bEnd, endDate) ? endDate : bEnd

      if (!isBefore(intEnd, intStart)) {
         totalBreakMs += (intEnd.getTime() - intStart.getTime())
      }
    })

    const formatBreak = (ms: number) => {
      if (ms <= 0) return '0m'
      const mins = Math.floor(ms / 60000)
      const hours = Math.floor(mins / 60)
      const days = Math.floor(hours / 24)
      const remHours = hours % 24
      const remMins = mins % 60
      
      let res = ''
      if (days > 0) res += `${days}d `
      if (remHours > 0) res += `${remHours}h `
      if (remMins > 0 || res === '') res += `${remMins}m`
      return res.trim()
    }

    return {
      completedCount,
      missedCount,
      overcameResistanceCount,
      breakDurationFormatted: totalBreakMs > 0 ? formatBreak(totalBreakMs) : '0m',
      chartData,
      isBeforeCreation: false
    }
  }, [habit, logs, breaks, filter, currentDate, customStartDate, customEndDate])

  return { loading, analytics }
}
