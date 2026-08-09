import React from 'react'
import { Clock, Zap, Book, Users, Target, ImageIcon } from 'lucide-react'

export function TimelineWidget({ data }: any) {
  const records = data.records || []
  const todayStart = new Date().setHours(0, 0, 0, 0)

  const events: any[] = []

  records.forEach((r: any) => {
    if (r.createdAt && r.createdAt > todayStart) {
      events.push({
        title: r.title || 'New Record',
        type: 'record',
        time: new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        icon: ImageIcon,
        color: 'text-blue-500',
        ts: r.createdAt
      })
    }
  })

  // Add more from data.journal, data.goals etc if needed
  const journal = data.journal || []
  journal.forEach((j: any) => {
    if (j.createdAt && j.createdAt > todayStart) {
      events.push({
        title: 'Journal Entry',
        type: 'journal',
        time: new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        icon: Book,
        color: 'text-purple-500',
        ts: j.createdAt
      })
    }
  })

  events.sort((a, b) => b.ts - a.ts)

  return (
    <div className="p-6 bg-card rounded-2xl border border-border h-full">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Clock size={20} /> Today's Timeline
      </h2>
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3.5 before:-translate-x-px before:h-[calc(100%-2rem)] before:w-0.5 before:bg-border">
        {events.map((evt, i) => (
          <div key={i} className="relative flex items-center gap-4 group">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full bg-background border-2 border-border shadow-sm z-10 ${evt.color} group-hover:scale-110 transition-transform`}>
              <evt.icon size={12} />
            </div>
            <div className="flex-1 flex justify-between items-center p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
              <div>
                <p className="font-bold text-sm text-foreground">{evt.title}</p>
                <p className="text-xs font-medium text-muted-foreground capitalize">{evt.type}</p>
              </div>
              <div className="text-xs font-bold text-muted-foreground">{evt.time}</div>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-muted-foreground text-sm">No events today.</p>}
      </div>
    </div>
  )
}
