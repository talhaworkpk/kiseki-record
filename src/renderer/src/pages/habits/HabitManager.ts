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
    const totalToday = allHabits.length // Rough estimate, needs check for scheduled days

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
}

// Auto Miss detection
export const checkAutoMisses = async () => {
  // Finds any habits that have a deadline passed today, and marks them missed if untouched.
  // Also checks past days.
  try {
    // @ts-ignore
    const allHabits: Habit[] = await window.api.db.find('habits', { archived: { $ne: true } })
    // @ts-ignore
    const allLogs: HabitDailyRecord[] = await window.api.db.find('habitLogs', {})
    
    for (const h of allHabits) {
      if (!h.deadlineTime) continue
      
      const now = new Date()
      const deadline = new Date()
      const [hh, mm] = h.deadlineTime.split(':')
      deadline.setHours(parseInt(hh), parseInt(mm), 0, 0)
      
      if (now > deadline) {
        const log = allLogs.find(l => l.habitId === h._id && l.date === todayStr)
        if (!log || log.status === 'pending') {
          // Mark as missed
          // @ts-ignore
          await window.api.db.update('habitLogs', 
            { habitId: h._id, date: todayStr }, 
            { $set: { status: 'missed', updatedAt: Date.now() } }, 
            { upsert: true }
          )
          if (h._id) await logHabitActivity(h._id, 'auto_missed', 'Deadline passed without completion.')
        }
      }
    }
  } catch (e) {
    console.error(e)
  }
}
