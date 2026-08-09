import { AppNotification, MemoryCapsule, SystemUnlock } from '../types'

export class NotificationEngine {
  static async notify(
    type: AppNotification['type'],
    title: string,
    message: string,
    sourceModule?: string,
    targetPath?: string,
    metadata?: any
  ) {
    const notification: AppNotification = {
      title,
      message,
      type,
      sourceModule,
      targetPath,
      isRead: false,
      timestamp: Date.now(),
      metadata
    }

    try {
      console.log('[NotificationEngine] Attempting to insert:', notification)
      // @ts-ignore
      const saved = await window.api.db.insert('notifications', notification)
      console.log('[NotificationEngine] Successfully inserted, dispatching event:', saved)
      // Dispatch event for the global toast context
      window.dispatchEvent(new CustomEvent('app-notification', { detail: saved }))
    } catch (e: any) {
      console.error('Failed to save notification:', e)
      alert('Notification Engine Error: ' + e.message)
    }
  }

  static async hasUnlocked(key: string): Promise<boolean> {
    try {
      // @ts-ignore
      const unlocks = await window.api.db.find('systemUnlocks', { key })
      return unlocks.length > 0
    } catch (e) {
      return false
    }
  }

  static async unlockAchievement(key: string, title: string, description: string) {
    if (await this.hasUnlocked(key)) return

    try {
      // @ts-ignore
      await window.api.db.insert('systemUnlocks', { key, unlockedAt: Date.now() })
      await this.notify('achievement', `Achievement Unlocked: ${title}`, description, 'System', '/achievements')
      
      // Attempt desktop notification
      // @ts-ignore
      if (window.api.notifications) {
        // @ts-ignore
        window.api.notifications.triggerInApp('achievement', `Achievement Unlocked: ${title}`, description, 'System', '/achievements')
      }

      // Force trigger achievement celebration custom event
      window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: { title, description } }))
    } catch (e) {
      console.error('Failed to unlock achievement', e)
    }
  }

  static async checkAchievements() {
    try {
      // @ts-ignore
      const journals = await window.api.db.find('journal', {})
      // @ts-ignore
      const certificates = await window.api.db.find('certificates', {})
      // @ts-ignore
      const goals = await window.api.db.find('goals', {})
      
      // 1. 100 Journal Entries
      if (journals.length >= 100) {
        await this.unlockAchievement('achievement:100-journals', '100 Journal Entries', '100 moments captured.')
      }

      // 2. First Certificate
      if (certificates.length >= 1) {
        await this.unlockAchievement('achievement:first-certificate', 'First Certificate', 'You recorded your first certificate.')
      }

      // 3. 10 Completed Goals
      const completedGoals = goals.filter((g: any) => g.status === 'Completed').length
      if (completedGoals >= 10) {
        await this.unlockAchievement('achievement:10-goals', '10 Completed Goals', '10 goals completed.')
      }

      // Streak logic (Journal based)
      let currentStreak = 0
      const dates = journals.map((j: any) => {
        const d = new Date(j.createdAt)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      }).sort((a: number, b: number) => b - a)

      if (dates.length > 0) {
        const uniqueDates = Array.from(new Set(dates))
        currentStreak = 1
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const diff = (uniqueDates[i] as number - (uniqueDates[i+1] as number)) / (1000 * 60 * 60 * 24)
          if (Math.round(diff) === 1) currentStreak++
          else break
        }
      }

      if (currentStreak >= 7) {
        await this.unlockAchievement('achievement:7-day-streak', '7-Day Streak', 'You showed up for 7 days in a row.')
      }

    } catch (e) {
      console.error('Achievement check failed', e)
    }
  }

  static async checkHabitMilestones(habitId: string, habitName: string) {
    try {
      // @ts-ignore
      const logs = await window.api.db.find('habitLogs', { habitId, status: 'completed' })
      const completions = logs.length

      const milestones = [7, 14, 30, 50, 100, 365]
      for (const m of milestones) {
        if (completions >= m) {
          const key = `milestone:${habitId}:${m}`
          if (!(await this.hasUnlocked(key))) {
            // @ts-ignore
            await window.api.db.insert('systemUnlocks', { key, unlockedAt: Date.now() })
            await this.notify('milestone', `Habit Milestone: ${m} Days`, `${habitName} reached ${m} completions!`, 'Habits', '/habits')
            
            // Attempt desktop notification
            // @ts-ignore
            if (window.api.notifications) {
              // @ts-ignore
              window.api.notifications.triggerInApp('milestone', `Habit Milestone: ${m} Days`, `${habitName} reached ${m} completions!`, 'Habits', '/habits')
            }
          }
        }
      }
    } catch (e) {
      console.error('Habit milestone check failed', e)
    }
  }

  static async checkMemoryCapsules() {
    try {
      // @ts-ignore
      const capsules = await window.api.db.find('memoryCapsules', { status: 'locked' })
      const now = Date.now()

      for (const cap of capsules) {
        if (cap.unlockDate <= now) {
          // Unlock it
          // @ts-ignore
          await window.api.db.update('memoryCapsules', { _id: cap._id }, { $set: { status: 'unlocked' } })
          await this.notify(
            'memory', 
            'Memory Capsule Unlocked', 
            `A message from your past self is ready to open.`, 
            'Memory', 
            '/memory-capsules'
          )
        }
      }
    } catch (e) {
      console.error('Memory Capsule check failed', e)
    }
  }

  static async checkAnnualMemories() {
    try {
      // @ts-ignore
      const memories = await window.api.db.find('calendarMemories', {})
      const today = new Date()
      const currentYear = today.getFullYear()
      const currentMonth = today.getMonth() + 1 // 1-12
      const currentDay = today.getDate() // 1-31

      // Determine if it's a leap year
      const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0)

      const activeMemories = memories.filter((m: any) => {
        // Normal match
        if (m.month === currentMonth && m.day === currentDay) return true
        // Leap year fallback: Feb 29 memory on Feb 28 in a non-leap year
        if (!isLeapYear && m.month === 2 && m.day === 29 && currentMonth === 2 && currentDay === 28) return true
        return false
      })

      if (activeMemories.length === 0) return

      // Deduplication: we use systemUnlocks to track if we've already notified for this memory this year
      const memoriesToNotify = []
      for (const m of activeMemories) {
        const key = `annual_memory:${m._id}:${currentYear}`
        if (!(await this.hasUnlocked(key))) {
          memoriesToNotify.push({ memory: m, key })
        }
      }

      if (memoriesToNotify.length === 0) return

      // Mark them as notified
      for (const item of memoriesToNotify) {
        // @ts-ignore
        await window.api.db.insert('systemUnlocks', { key: item.key, unlockedAt: Date.now() })
      }

      // Grouping
      const targetPath = `/?calendarMemoryMonth=${currentMonth}&calendarMemoryDay=${currentDay}`
      
      if (memoriesToNotify.length === 1) {
        const m = memoriesToNotify[0].memory
        const yearsAgo = currentYear - m.createdYear
        let subtitle = `You saved this memory for today.`
        if (yearsAgo === 1) subtitle = `You saved this memory one year ago today.`
        else if (yearsAgo > 1) subtitle = `You saved this memory ${yearsAgo} years ago.`

        await this.notify(
          'annual_memory',
          m.title,
          subtitle,
          'Calendar',
          targetPath
        )
      } else {
        await this.notify(
          'annual_memory',
          `${memoriesToNotify.length} Annual Memories`,
          `You have ${memoriesToNotify.length} memories associated with today.`,
          'Calendar',
          targetPath
        )
      }
    } catch (e) {
      console.error('Annual Memories check failed', e)
    }
  }

  static async checkBirthday() {
    try {
      // @ts-ignore
      const profiles = await window.api.db.find('userProfile', {})
      if (profiles.length === 0) return

      const profile = profiles[0]
      if (!profile.dateOfBirth) return

      const parts = profile.dateOfBirth.split('-')
      if (parts.length < 3) return

      const birthMonth = parseInt(parts[1], 10)
      const birthDay = parseInt(parts[2], 10)

      const today = new Date()
      const currentYear = today.getFullYear()
      const currentMonth = today.getMonth() + 1
      const currentDay = today.getDate()

      if (currentMonth === birthMonth && currentDay === birthDay) {
        const key = `birthday_notification:${currentYear}`
        if (!(await this.hasUnlocked(key))) {
          // @ts-ignore
          await window.api.db.insert('systemUnlocks', { key, unlockedAt: Date.now() })
          
          await this.notify(
            'birthday',
            'Happy Birthday!',
            `Wishing you a wonderful birthday, ${profile.fullName.split(' ')[0]}!`,
            'System',
            '/'
          )
        }
      }
    } catch (e) {
      console.error('Birthday check failed', e)
    }
  }
}
