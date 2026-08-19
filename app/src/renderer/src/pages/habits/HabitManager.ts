import { Habit, HabitDailyRecord, HabitBreak, HabitActivityLog } from '../../types'

const todayStr = new Date().toISOString().split('T')[0]

// Utility to run migrations on existing habits and logs
export const runHabitMigrations = async () => {
  try {
    // @ts-ignore
    const habits: any[] = await window.api.db.find('habits', {})
    let migratedCount = 0

    for (const h of habits) {
      if (h.priority === undefined || h.isTimerEnabled === undefined) {
        // Old structure detected, migrate it
        const newHabit: Partial<Habit> = {
          title: h.title,
          category: h.category || 'General',
          icon: h.icon === 'Sparkles' ? '✨' : (h.icon || '✨'),
          scheduleType: h.scheduleType || 'daily',
          scheduleDays: h.scheduleDays || [0, 1, 2, 3, 4, 5, 6],
          priority: h.priority || 'medium',
          isTimerEnabled: h.isTimerEnabled || false,
          targetDuration: h.targetDuration || 1800,
          startDate: h.startDate || (h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : todayStr),
          archived: h.archived || false,
          createdAt: h.createdAt || Date.now(),
          updatedAt: Date.now()
        }
        // @ts-ignore
        await window.api.db.update('habits', { _id: h._id }, { $set: newHabit })
        migratedCount++
      }
    }
    if (migratedCount > 0) console.log(`Migrated ${migratedCount} habits to new schema.`)

    // We don't necessarily need to migrate habitLogs because the structure is close enough,
    // but we can ensure they have createdAt/updatedAt
  } catch (err) {
    console.error('Habit migration failed:', err)
  }
}

// Add function to check if habit is active on a specific day
export const isHabitActiveOnDay = (habit: Habit, date: Date = new Date()): boolean => {
  const day = date.getDay()
  if (habit.scheduleType === 'weekdays') return day >= 1 && day <= 5
  if (habit.scheduleType === 'weekends') return day === 0 || day === 6
  if (habit.scheduleType === 'specific_days' && habit.scheduleDays) {
    return habit.scheduleDays.includes(day)
  }
  return true
}

// Helper to determine the effective deadline for a habit
export const getEffectiveDeadline = (h: Habit, elapsed: number = 0): Date => {
  const deadlineStr = h.deadlineTime || h.preferredTime || '23:59'
  const [hh, mm] = deadlineStr.split(':')
  const baseTime = new Date()
  baseTime.setHours(parseInt(hh), parseInt(mm), 59, 999)
  
  if (h.isTimerEnabled && h.targetDuration) {
    const remainingDuration = Math.max(0, h.targetDuration - elapsed)
    return new Date(baseTime.getTime() - (remainingDuration * 1000))
  }
  
  return baseTime
}

// Utility to calculate real stats globally
export const calculateHabitStats = async () => {
  try {
    // @ts-ignore
    const allHabits: Habit[] = await window.api.db.find('habits', { archived: { $ne: true } })
    // @ts-ignore
    const allLogs: HabitDailyRecord[] = await window.api.db.find('habitLogs', {})
    // @ts-ignore
    const allBreaks: HabitBreak[] = await window.api.db.find('habitBreaks', {})

    const logsToday = allLogs.filter(l => l.date === todayStr)
    const completedToday = logsToday.filter(l => l.status === 'completed').length
    const habitsToday = allHabits.filter(h => isHabitActiveOnDay(h, new Date()))
    const totalToday = habitsToday.length

    const totalEligible = allHabits.length * (new Set(allLogs.map(l => l.date)).size || 1)
    const totalCompleted = allLogs.filter(l => l.status === 'completed').length
    const completionRate = totalEligible ? Math.round((totalCompleted / totalEligible) * 100) : 0

    // Streak Calculation (simplified for global dashboard, usually done per habit)
    let currentStreak = 0
    let longestStreak = 0
    
    // We will do per-habit calculations in Analytics.
    return {
      score: Math.min(100, Math.round(completionRate * 1.1)),
      completedToday,
      totalToday,
      currentStreak,
      longestStreak,
      completionRate,
      allHabits,
      habitsToday,
      allLogs,
      logsToday
    }
  } catch (err) {
    console.error(err)
    return null
  }
}

export const logHabitActivity = async (habitId: string, action: HabitActivityLog['action'], details?: string) => {
  const log: HabitActivityLog = {
    habitId,
    action,
    timestamp: Date.now(),
    details
  }
  // @ts-ignore
  await window.api.db.insert('habitActivityLogs', log)
  // Bump the parent habit's updatedAt to ensure export/import sync works
  // @ts-ignore
  await window.api.db.update('habits', { _id: habitId }, { $set: { updatedAt: Date.now() } }, {})
}

// Auto Miss detection
export const checkAutoMisses = async () => {
  try {
    // @ts-ignore
    const allHabits: Habit[] = await window.api.db.find('habits', { archived: { $ne: true } })
    // @ts-ignore
    const allLogs: HabitDailyRecord[] = await window.api.db.find('habitLogs', {})
    
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // To avoid timezone issues with ISOString, construct it properly in local time
    const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

    for (const h of allHabits) {
      // 1. Backfill past missing days
      const startDate = new Date(h.startDate || h.createdAt || Date.now())
      startDate.setHours(0, 0, 0, 0)
      
      const loopDate = new Date(startDate)
      while (loopDate < today) {
        const loopDateStr = loopDate.toLocaleDateString('en-CA')
        
        if (isHabitActiveOnDay(h, loopDate)) {
          const log = allLogs.find(l => l.habitId === h._id && l.date === loopDateStr)
          if (!log || log.status === 'pending') {
            const newStatus = h.category === 'Bad Habit' ? 'completed' : 'missed'
            // @ts-ignore
            await window.api.db.update('habitLogs', 
              { habitId: h._id, date: loopDateStr }, 
              { $set: { status: newStatus, updatedAt: Date.now() } }, 
              { upsert: true }
            )
            if (h._id) await logHabitActivity(h._id, `auto_${newStatus}`, `Auto filled for past day ${loopDateStr}`)
          }
        }
        loopDate.setDate(loopDate.getDate() + 1)
      }

      // 2. Check today
      if (isHabitActiveOnDay(h, new Date())) {
        const logToday = allLogs.find(l => l.habitId === h._id && l.date === todayStr)
        if (!logToday || logToday.status === 'pending') {
          const effectiveDeadline = getEffectiveDeadline(h)
          if (now > effectiveDeadline) {
            const newStatus = h.category === 'Bad Habit' ? 'completed' : 'missed'
            // @ts-ignore
            await window.api.db.update('habitLogs', 
              { habitId: h._id, date: todayStr }, 
              { $set: { status: newStatus, updatedAt: Date.now() } }, 
              { upsert: true }
            )
            if (h._id) await logHabitActivity(h._id, `auto_${newStatus}`, 'Effective deadline passed.')
          }
        }
      }
    }
  } catch (e) {
    console.error(e)
  }
}
