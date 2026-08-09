import { useState, useEffect } from 'react'
import { Bell, Clock, Cake, Unlock, CalendarDays, Trophy } from 'lucide-react'

export interface DesktopNotificationSettingsProps {
  devMode: boolean
}

export default function DesktopNotificationSettings({ devMode }: DesktopNotificationSettingsProps) {
  const [settings, setSettings] = useState<any>({
    desktopNotificationsEnabled: false,
    inactivityReminderEnabled: true,
    birthdayNotificationEnabled: true,
    annualMemoryNotificationEnabled: true,
    memoryCapsuleNotificationEnabled: true,
    achievementsNotificationEnabled: true
  })

  useEffect(() => {
    // @ts-ignore
    window.api.notifications.getSettings().then(setSettings)
  }, [])

  const updateSetting = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    // @ts-ignore
    await window.api.notifications.updateSettings({ [key]: value })
  }

  const triggerTest = (type: string) => {
    // @ts-ignore
    window.api.notifications.triggerTest(type)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Desktop Notifications</h2>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Allow Kiseki Record to run in the background and send you native Windows notifications. 
              Closing the main window will keep the app active in your system tray.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings.desktopNotificationsEnabled} 
              onChange={e => updateSetting('desktopNotificationsEnabled', e.target.checked)} 
            />
            <div className="w-11 h-6 bg-accent peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className={`space-y-4 pt-4 border-t border-border transition-opacity duration-300 ${!settings.desktopNotificationsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          
          <SettingRow 
            icon={<Clock size={20} className="text-blue-500" />}
            title="Daily Inactivity Reminder"
            description="Gentle reminder if you haven't opened the app for a day."
            checked={settings.inactivityReminderEnabled}
            onChange={v => updateSetting('inactivityReminderEnabled', v)}
          />

          <SettingRow 
            icon={<Cake size={20} className="text-pink-500" />}
            title="Birthday Notifications"
            description="A small celebration on your special day."
            checked={settings.birthdayNotificationEnabled}
            onChange={v => updateSetting('birthdayNotificationEnabled', v)}
          />

          <SettingRow 
            icon={<CalendarDays size={20} className="text-green-500" />}
            title="Annual Calendar Memories"
            description="Reminders for past journal entries that occurred on this day."
            checked={settings.annualMemoryNotificationEnabled}
            onChange={v => updateSetting('annualMemoryNotificationEnabled', v)}
          />

          <SettingRow 
            icon={<Unlock size={20} className="text-purple-500" />}
            title="Memory Capsule Unlocks"
            description="Notifies you when a locked memory capsule becomes available."
            checked={settings.memoryCapsuleNotificationEnabled}
            onChange={v => updateSetting('memoryCapsuleNotificationEnabled', v)}
          />

          <SettingRow 
            icon={<Trophy size={20} className="text-yellow-500" />}
            title="Achievements & Milestones"
            description="Alerts for significant app achievements and habit streaks."
            checked={settings.achievementsNotificationEnabled}
            onChange={v => updateSetting('achievementsNotificationEnabled', v)}
          />
        </div>
      </section>

      {devMode && (
        <section className="p-6 border border-destructive/30 rounded-xl bg-destructive/5 shadow-sm">
          <h2 className="text-lg font-bold text-destructive mb-4 flex items-center gap-2">
            <Bell size={20} /> Developer Testing
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Test the desktop notification triggers. Kiseki Record must have Desktop Notifications enabled above.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => triggerTest('inactivity')} className="px-4 py-2 bg-background border border-border rounded hover:bg-accent text-sm font-medium">Test Inactivity</button>
            <button onClick={() => triggerTest('birthday')} className="px-4 py-2 bg-background border border-border rounded hover:bg-accent text-sm font-medium">Test Birthday</button>
            <button onClick={() => triggerTest('memory')} className="px-4 py-2 bg-background border border-border rounded hover:bg-accent text-sm font-medium">Test Memory Capsule</button>
          </div>
        </section>
      )}
    </div>
  )
}

function SettingRow({ icon, title, description, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-background rounded-md shadow-sm border border-border">
          {icon}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className="w-9 h-5 bg-accent peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>
  )
}
