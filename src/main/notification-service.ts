import { Notification, BrowserWindow } from 'electron'
import { settingsStore, dbAsync } from './database'
import path from 'path'
// @ts-ignore
import iconUrl from '../../icon.png?asset'

export interface DesktopNotificationSettings {
  desktopNotificationsEnabled: boolean
  inactivityReminderEnabled: boolean
  birthdayNotificationEnabled: boolean
  annualMemoryNotificationEnabled: boolean
  memoryCapsuleNotificationEnabled: boolean
  achievementsNotificationEnabled: boolean
}

export class NotificationService {
  private static instance: NotificationService
  private pollInterval: NodeJS.Timeout | null = null
  private mainWindow: BrowserWindow | null = null

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  public getSettings(): DesktopNotificationSettings {
    const defaults: DesktopNotificationSettings = {
      desktopNotificationsEnabled: false,
      inactivityReminderEnabled: true,
      birthdayNotificationEnabled: true,
      annualMemoryNotificationEnabled: true,
      memoryCapsuleNotificationEnabled: true,
      achievementsNotificationEnabled: true
    }
    return (settingsStore.get('desktopNotifications') as DesktopNotificationSettings) || defaults
  }

  public updateSettings(updates: Partial<DesktopNotificationSettings>) {
    const current = this.getSettings()
    settingsStore.set('desktopNotifications', { ...current, ...updates })
    
    // Restart polling if notifications were just turned on
    if (updates.desktopNotificationsEnabled) {
      this.startBackgroundChecks()
    } else if (updates.desktopNotificationsEnabled === false) {
      this.stopBackgroundChecks()
    }
  }

  public markAppOpened() {
    settingsStore.set('lastAppOpenAt', Date.now())
  }

  public startBackgroundChecks() {
    this.stopBackgroundChecks()
    const settings = this.getSettings()
    if (!settings.desktopNotificationsEnabled) return

    // Run checks immediately, then every 30 minutes
    this.runScheduledChecks()
    this.pollInterval = setInterval(() => {
      this.runScheduledChecks()
    }, 30 * 60 * 1000)
  }

  public stopBackgroundChecks() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  public showNotification(
    title: string, 
    body: string, 
    type: string, 
    targetPath?: string,
    metadata?: any
  ) {
    const settings = this.getSettings()
    if (!settings.desktopNotificationsEnabled) return

    if (!Notification.isSupported()) return

    const notif = new Notification({
      title: `Kiseki Record`,
      subtitle: title,
      body,
      icon: iconUrl
    })

    notif.on('click', () => {
      this.handleNotificationClick(type, targetPath, metadata)
    })

    notif.show()
  }

  private handleNotificationClick(type: string, targetPath?: string, metadata?: any) {
    // Restore window
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore()
      this.mainWindow.show()
      this.mainWindow.focus()

      // Tell renderer to navigate
      if (targetPath) {
        this.mainWindow.webContents.send('desktop-notification-click', { type, targetPath, metadata })
      }
    }
  }

  private async runScheduledChecks() {
    try {
      const settings = this.getSettings()
      if (!settings.desktopNotificationsEnabled) return

      const now = new Date()

      // 1. Inactivity Check
      if (settings.inactivityReminderEnabled) {
        await this.checkInactivity(now)
      }

      // 2. Birthday Check
      if (settings.birthdayNotificationEnabled) {
        await this.checkBirthday(now)
      }

      // 3. Memory Capsule Check
      if (settings.memoryCapsuleNotificationEnabled) {
        await this.checkMemoryCapsules(now)
      }

      // 4. Annual Memory Check
      if (settings.annualMemoryNotificationEnabled) {
        await this.checkAnnualMemories(now)
      }
    } catch (err) {
      console.error('[NotificationService] Background check error:', err)
    }
  }

  private async checkInactivity(now: Date) {
    // Target 10:00 AM local time
    if (now.getHours() < 10) return

    const lastOpenAt = settingsStore.get('lastAppOpenAt') as number
    if (!lastOpenAt) return

    const lastOpenDate = new Date(lastOpenAt)
    // Normalize to start of day for comparison
    lastOpenDate.setHours(0, 0, 0, 0)
    
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const diffDays = Math.floor((today.getTime() - lastOpenDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // If they missed at least 1 calendar day
    if (diffDays >= 1) {
      const lastInactivityNotif = settingsStore.get('lastInactivityNotificationDate') as string
      const todayStr = today.toISOString().split('T')[0]

      if (lastInactivityNotif !== todayStr) {
        settingsStore.set('lastInactivityNotificationDate', todayStr)
        this.showNotification('Inactivity Reminder', "You haven't checked in today. Your journey is waiting for you.", 'inactivity', '/')
        
        // Push in-app notification too
        await this.pushInAppNotification('inactivity', 'Reminder', "You haven't checked in today.", 'System', '/')
      }
    }
  }

  private async checkBirthday(now: Date) {
    if (now.getHours() < 9) return

    try {
      const profiles = await dbAsync.find('userProfile', {})
      if (profiles.length === 0) return

      const profile = profiles[0]
      if (!profile.dateOfBirth) return

      const parts = profile.dateOfBirth.split('-')
      if (parts.length < 3) return

      const birthMonth = parseInt(parts[1], 10)
      const birthDay = parseInt(parts[2], 10)

      if (now.getMonth() + 1 === birthMonth && now.getDate() === birthDay) {
        const lastBirthdayNotifYear = settingsStore.get('lastBirthdayNotificationYear') as number
        if (lastBirthdayNotifYear !== now.getFullYear()) {
          settingsStore.set('lastBirthdayNotificationYear', now.getFullYear())
          this.showNotification('🎂 Happy Birthday!', `Take a moment today to celebrate your journey and how far you've come.`, 'birthday', '/')
          
          await this.pushInAppNotification('birthday', 'Happy Birthday!', `Wishing you a wonderful birthday, ${profile.fullName?.split(' ')[0] || 'friend'}!`, 'System', '/')
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  private async checkMemoryCapsules(now: Date) {
    try {
      const capsules = await dbAsync.find('memoryCapsules', { status: 'locked' })
      const nowMs = now.getTime()

      for (const cap of capsules) {
        if (cap.unlockDate <= nowMs) {
          // Unlock it directly in db
          await dbAsync.update('memoryCapsules', { _id: cap._id }, { $set: { status: 'unlocked' } })
          this.showNotification('💌 Memory Capsule', `A Memory Capsule from your past self is ready to open.`, 'memory', '/memory-capsules')
          
          await this.pushInAppNotification('memory', 'Memory Capsule Unlocked', `A message from your past self is ready to open.`, 'Memory', '/memory-capsules')
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  private async checkAnnualMemories(now: Date) {
    if (now.getHours() < 9) return

    try {
      const memories = await dbAsync.find('calendarMemories', {})
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      const currentDay = now.getDate()

      const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0)

      const activeMemories = memories.filter((m: any) => {
        if (m.month === currentMonth && m.day === currentDay) return true
        if (!isLeapYear && m.month === 2 && m.day === 29 && currentMonth === 2 && currentDay === 28) return true
        return false
      })

      if (activeMemories.length === 0) return

      let notifiedCount = 0
      for (const m of activeMemories) {
        const key = `annual_memory:${m._id}:${currentYear}`
        const unlocks = await dbAsync.find('systemUnlocks', { key })
        
        if (unlocks.length === 0) {
          await dbAsync.insert('systemUnlocks', { key, unlockedAt: Date.now() })
          notifiedCount++
        }
      }

      if (notifiedCount > 0) {
        const targetPath = `/?calendarMemoryMonth=${currentMonth}&calendarMemoryDay=${currentDay}`
        
        if (notifiedCount === 1) {
          this.showNotification('📅 Annual Memory', `You saved a memory for this day. Click to revisit it.`, 'annual_memory', targetPath)
          await this.pushInAppNotification('annual_memory', 'Annual Memory', `You saved this memory for today.`, 'Calendar', targetPath)
        } else {
          this.showNotification('📅 Annual Memories', `You have ${notifiedCount} memories associated with today.`, 'annual_memory', targetPath)
          await this.pushInAppNotification('annual_memory', `${notifiedCount} Annual Memories`, `You have ${notifiedCount} memories associated with today.`, 'Calendar', targetPath)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Push an in-app notification directly to db from main process
  public async pushInAppNotification(type: string, title: string, message: string, sourceModule?: string, targetPath?: string) {
    try {
      const notification = {
        title,
        message,
        type,
        sourceModule,
        targetPath,
        isRead: false,
        timestamp: Date.now()
      }
      const saved = await dbAsync.insert('notifications', notification)
      
      // Send to UI if open so it updates live
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('app-notification', saved)
      }
    } catch (e) {
      console.error(e)
    }
  }
}

export const notificationService = NotificationService.getInstance()
