import { Person } from '../../types'
import { NotificationEngine } from '../NotificationEngine'
import { createClient } from '@supabase/supabase-js'

class OnlineReminderServiceManager {
  private static instance: OnlineReminderServiceManager
  private initialized = false
  private supabase: any = null
  private checkInterval: NodeJS.Timeout | null = null
  
  // map of kisekiId -> status (true = online, false = offline)
  private knownStatus = new Map<string, boolean>()

  private constructor() {}

  public static getInstance(): OnlineReminderServiceManager {
    if (!OnlineReminderServiceManager.instance) {
      OnlineReminderServiceManager.instance = new OnlineReminderServiceManager()
    }
    return OnlineReminderServiceManager.instance
  }

  public init() {
    if (this.initialized) return
    this.initialized = true

    // Initialize Supabase client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey)
    }

    // Start background poller
    this.startService()
  }

  private startService() {
    // Check every 30 seconds
    this.checkInterval = setInterval(() => this.checkPresence(), 30000)
    // Run an initial check now
    this.checkPresence()
  }

  private async checkPresence() {
    if (!this.supabase || !navigator.onLine) return

    try {
      // 1. Get global setting
      // @ts-ignore
      const settings = await window.api.notifications.getSettings()
      if (settings.onlineReminderNotificationEnabled === false) return

      // 2. Get all tracked people
      // @ts-ignore
      const allPeople: Person[] = await window.api.db.find('people', {})
      const trackedPeople = allPeople.filter(p => p.notifyWhenOnline && p.kisekiId)

      if (trackedPeople.length === 0) return

      const trackedKisekiIds = trackedPeople.map(p => p.kisekiId!)

      // 3. Fetch their last_seen_at from Supabase
      const { data, error } = await this.supabase
        .from('kiseki_users')
        .select('kiseki_id, last_seen_at')
        .in('kiseki_id', trackedKisekiIds)

      if (error || !data) return

      const now = new Date().getTime()
      const OFFLINE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

      for (const row of data) {
        const isOnline = now - new Date(row.last_seen_at).getTime() < OFFLINE_THRESHOLD
        const previousStatus = this.knownStatus.get(row.kiseki_id)

        // If transitioning from Offline to Online (ignore Unknown -> Online)
        if (isOnline && previousStatus === false) {
          const person = trackedPeople.find(p => p.kisekiId === row.kiseki_id)
          if (person) {
            this.triggerNotification(person)
          }
        }

        // Only update status if it changed, or if it's the first time
        if (previousStatus !== isOnline) {
          this.knownStatus.set(row.kiseki_id, isOnline)
        }
      }
    } catch (error) {
      console.error('OnlineReminderService Error:', error)
    }
  }

  private triggerNotification(person: Person) {
    // Fire desktop notification using NotificationEngine
    NotificationEngine.notify(
      'info',
      `${person.name} is online`,
      `${person.name} is now online on Kiseki.`,
      'relationship-online',
      undefined,
      `/relationships/${person._id}` // Full navigation path
    )
  }
}

export const OnlineReminderService = OnlineReminderServiceManager.getInstance()
