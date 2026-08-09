import React from 'react'
import { useNotificationContext } from '../contexts/NotificationContext'
import { Bell, CheckCircle2, Info, AlertTriangle, XCircle, Award, Target, Mail, Trash2, CheckSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotificationContext()
  const navigate = useNavigate()

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="text-primary" /> 
            Notifications
            {unreadCount > 0 && <span className="text-sm font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount} New</span>}
          </h1>
          <p className="text-muted-foreground mt-1">Your recent activity and alerts.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button 
              onClick={() => markAllAsRead()}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-foreground hover:bg-accent/80 rounded-xl font-bold text-sm transition-colors"
            >
              <CheckSquare size={16}/> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={() => {
                if (confirm('Clear all notifications? This cannot be undone.')) clearAll()
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl font-bold text-sm transition-colors"
            >
              <Trash2 size={16}/> Clear all
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <Bell size={48} className="opacity-20 mb-4" />
            <p className="text-lg font-bold">You're all caught up!</p>
            <p className="text-sm">No new notifications to show.</p>
          </div>
        ) : (
          notifications.map(n => {
            let icon = <Info className="text-blue-500" size={20} />
            if (n.type === 'success') icon = <CheckCircle2 className="text-green-500" size={20} />
            else if (n.type === 'warning') icon = <AlertTriangle className="text-yellow-500" size={20} />
            else if (n.type === 'error') icon = <XCircle className="text-red-500" size={20} />
            else if (n.type === 'achievement') icon = <Award className="text-yellow-500" size={20} />
            else if (n.type === 'milestone') icon = <Target className="text-orange-500" size={20} />
            else if (n.type === 'memory') icon = <Mail className="text-pink-500" size={20} />

            return (
              <div 
                key={n._id}
                onClick={() => {
                  if (!n.isRead) markAsRead(n._id!)
                  if (n.targetPath) navigate(n.targetPath)
                }}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${n.isRead ? 'bg-card border-border hover:border-border/80' : 'bg-primary/5 border-primary/20 shadow-sm'} ${n.targetPath ? 'cursor-pointer hover:shadow-md' : ''}`}
              >
                <div className="shrink-0 mt-1 bg-background p-2 rounded-xl shadow-sm border border-border">
                  {icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-bold text-base truncate ${!n.isRead ? 'text-foreground' : 'text-foreground/80'}`}>{n.title}</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNotification(n._id!) }}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete notification"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {n.message}
                  </p>
                  
                  {n.sourceModule && (
                    <div className="mt-3 inline-block bg-accent px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {n.sourceModule}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
