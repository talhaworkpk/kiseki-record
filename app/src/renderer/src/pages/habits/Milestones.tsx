import { useState, useEffect, useRef } from 'react'
import { Award, Trophy, Zap, Clock, Loader2, Star } from 'lucide-react'
import { Habit, HabitDailyRecord, HabitTimerSession } from '../../types'

export default function Milestones() {
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitDailyRecord[]>([])
  const [timers, setTimers] = useState<HabitTimerSession[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      // @ts-ignore
      const h = await window.api.db.find('habits', { archived: { $ne: true } })
      // @ts-ignore
      const l = await window.api.db.find('habitLogs', {})
      // @ts-ignore
      const t = await window.api.db.find('habitTimerSessions', {})
      
      setHabits(h)
      setLogs(l)
      setTimers(t)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Right-click drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      setIsDragging(true)
      setDragStartY(e.clientY)
      setScrollTop(scrollContainerRef.current?.scrollTop || 0)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const deltaY = e.clientY - dragStartY
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollTop - deltaY
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (scrollContainerRef.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop += 100
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop -= 100
      }
    }
  }

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>

  // Best Habit Logic
  let bestHabitId: string | null = null
  let maxCompleted = 0
  const completionMap: Record<string, number> = {}
  logs.filter(l => l.status === 'completed').forEach(l => {
    completionMap[l.habitId] = (completionMap[l.habitId] || 0) + 1
    if (completionMap[l.habitId] > maxCompleted) {
      maxCompleted = completionMap[l.habitId]
      bestHabitId = l.habitId
    }
  })
  const bestHabit = habits.find(h => h._id === bestHabitId)

  // Most Dedicated (Most Time Tracked)
  let mostDedicatedId: string | null = null
  let maxTime = 0
  const timeMap: Record<string, number> = {}
  timers.forEach(t => {
    timeMap[t.habitId] = (timeMap[t.habitId] || 0) + t.duration
    if (timeMap[t.habitId] > maxTime) {
      maxTime = timeMap[t.habitId]
      mostDedicatedId = t.habitId
    }
  })
  const mostDedicatedHabit = habits.find(h => h._id === mostDedicatedId)

  const achievements = [
    {
      title: "First Steps",
      description: "Completed your first habit.",
      icon: <Zap size={24}/>,
      unlocked: logs.filter(l => l.status === 'completed').length > 0,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20"
    },
    {
      title: "Consistency Master",
      description: "Completed 50 habit occurrences.",
      icon: <Trophy size={24}/>,
      unlocked: logs.filter(l => l.status === 'completed').length >= 50,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      title: "Time Manager",
      description: "Tracked 10 hours of habit time.",
      icon: <Clock size={24}/>,
      unlocked: timers.reduce((acc, t) => acc + t.duration, 0) >= 36000, // 10 hours
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      title: "Perfect Week",
      description: "7 consecutive days of completions. (Keep it up!)",
      icon: <Star size={24}/>,
      unlocked: false, // simplified for now
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    }
  ]

  return (
    <div 
      ref={scrollContainerRef}
      className={`h-full overflow-y-auto p-8 animate-in fade-in duration-500 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1">Milestones & Records</h1>
        <p className="text-muted-foreground font-medium">Celebrate your habit-building journey.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-8 rounded-3xl relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 scale-150 group-hover:scale-110 transition-transform duration-700 pointer-events-none"><Trophy size={200}/></div>
          <div className="relative z-10">
            <div className="text-sm font-bold text-primary uppercase mb-2 flex items-center gap-2"><Trophy size={16}/> Most Completed Habit</div>
            {bestHabit ? (
              <>
                <div className="text-3xl font-black mb-2 truncate">{bestHabit.title}</div>
                <div className="text-muted-foreground font-medium">Completed {maxCompleted} times total.</div>
              </>
            ) : (
              <div className="text-muted-foreground italic mt-4">Complete habits to unlock this record.</div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-8 rounded-3xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 scale-150 group-hover:scale-110 transition-transform duration-700 pointer-events-none"><Clock size={200}/></div>
          <div className="relative z-10">
            <div className="text-sm font-bold text-blue-500 uppercase mb-2 flex items-center gap-2"><Clock size={16}/> Most Dedicated Habit</div>
            {mostDedicatedHabit ? (
              <>
                <div className="text-3xl font-black mb-2 truncate">{mostDedicatedHabit.title}</div>
                <div className="text-muted-foreground font-medium">Tracked for {(maxTime / 3600).toFixed(1)} hours total.</div>
              </>
            ) : (
              <div className="text-muted-foreground italic mt-4">Use the timer to unlock this record.</div>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Award size={20}/> Achievement Badges</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {achievements.map((ach, i) => (
          <div key={i} className={`p-6 rounded-3xl border ${ach.unlocked ? `${ach.bg} ${ach.border}` : 'bg-card border-border opacity-60 grayscale'} transition-all`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${ach.unlocked ? ach.bg : 'bg-accent'}`}>
              <div className={ach.unlocked ? ach.color : 'text-muted-foreground'}>{ach.icon}</div>
            </div>
            <h3 className="font-bold text-lg mb-1">{ach.title}</h3>
            <p className="text-sm text-muted-foreground font-medium">{ach.description}</p>
            {ach.unlocked && <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 inline-block px-2 py-1 rounded">Unlocked</div>}
          </div>
        ))}
      </div>

    </div>
  )
}
