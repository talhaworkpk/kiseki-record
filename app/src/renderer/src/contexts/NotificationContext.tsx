import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AppNotification } from '../types'
import { Bell, CheckCircle2, Info, AlertTriangle, XCircle, Award, Target, Mail, Calendar as CalendarIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { NotificationEngine } from '../lib/NotificationEngine'

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotificationContext must be used within a NotificationProvider')
  return context
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<AppNotification[]>([])
  const navigate = useNavigate()

  const loadNotifications = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('notifications', {})
      // sort newest first
      data.sort((a: any, b: any) => b.timestamp - a.timestamp)
      setNotifications(data)
    } catch (e) {
      console.error('Failed to load notifications', e)
    }
  }

  useEffect(() => {
    loadNotifications()
    
    // Check initial background unlocks on boot
    NotificationEngine.checkMemoryCapsules()
    NotificationEngine.checkAnnualMemories()
    NotificationEngine.checkBirthday()

    const handleNewNotification = (e: CustomEvent<AppNotification>) => {
      const newNotif = e.detail
      console.log('[NotificationContext] Received new notification event!', newNotif)
      setNotifications(prev => [newNotif, ...prev])
      
      // Add to toasts (limit to 5 visible)
      setToasts(prev => {
        const stack = [newNotif, ...prev]
        return stack.slice(0, 5)
      })

      // Auto dismiss toast after 5s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t._id !== newNotif._id))
      }, 5000)
    }

    // @ts-ignore
    window.addEventListener('app-notification', handleNewNotification)
    return () => {
      // @ts-ignore
      window.removeEventListener('app-notification', handleNewNotification)
    }
  }, [])

  const markAsRead = async (id: string) => {
    try {
      // @ts-ignore
      await window.api.db.update('notifications', { _id: id }, { $set: { isRead: true } })
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  const markAllAsRead = async () => {
    try {
      // @ts-ignore
      await window.api.db.update('notifications', { isRead: false }, { $set: { isRead: true } }, { multi: true })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (e) {
      console.error(e)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      // @ts-ignore
      await window.api.db.remove('notifications', { _id: id })
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const clearAll = async () => {
    try {
      // @ts-ignore
      await window.api.db.remove('notifications', {}, { multi: true })
      setNotifications([])
    } catch (e) {
      console.error(e)
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll }}>
      {children}
      
      {/* Global Toast Container */}
      <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-80">
        {toasts.map(toast => {
          
          let icon = <Info className="text-blue-500" size={20} />
          let bgClass = "bg-card border-border"
          
          if (toast.type === 'success') icon = <CheckCircle2 className="text-green-500" size={20} />
          else if (toast.type === 'warning') icon = <AlertTriangle className="text-yellow-500" size={20} />
          else if (toast.type === 'error') { icon = <XCircle className="text-red-500" size={20} />; bgClass = "bg-red-500/10 border-red-500/30" }
          else if (toast.type === 'achievement') icon = <Award className="text-yellow-500" size={20} />
          else if (toast.type === 'milestone') icon = <Target className="text-orange-500" size={20} />
          else if (toast.type === 'memory') icon = <Mail className="text-pink-500" size={20} />
          else if (toast.type === 'annual_memory') icon = <CalendarIcon className="text-indigo-500" size={20} />
          else if (toast.type === 'birthday') icon = <Award className="text-purple-500" size={20} />

          return (
            <div 
              key={toast._id} 
              className={`pointer-events-auto rounded-xl p-4 shadow-lg border animate-in slide-in-from-right-8 fade-in duration-300 flex items-start gap-3 cursor-pointer hover:shadow-xl transition-shadow ${bgClass}`}
              onClick={() => {
                setToasts(prev => prev.filter(t => t._id !== toast._id))
                markAsRead(toast._id!)
                if (toast.targetPath) navigate(toast.targetPath)
              }}
            >
              <div className="shrink-0 mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold truncate">{toast.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">{toast.message}</p>
              </div>
              <button 
                className="text-muted-foreground hover:text-foreground shrink-0" 
                onClick={(e) => {
                  e.stopPropagation()
                  setToasts(prev => prev.filter(t => t._id !== toast._id))
                }}
              >
                <XCircle size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}
