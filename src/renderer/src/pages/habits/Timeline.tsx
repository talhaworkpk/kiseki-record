import { useState, useEffect, useMemo, useRef } from 'react'
import { Calendar as CalendarIcon, Loader2, Check, X, Circle, HelpCircle } from 'lucide-react'
import { Habit, HabitDailyRecord } from '../../types'

export default function Timeline() {
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitDailyRecord[]>([])

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      // @ts-ignore
      const allHabits = await window.api.db.find('habits', { archived: { $ne: true } })
      // @ts-ignore
      const allLogs = await window.api.db.find('habitLogs', {})
      
      setHabits(allHabits)
      setLogs(allLogs)
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

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days: Date[] = []
    
    // Pad previous month
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    // Pad next month
    const endPadding = 42 - days.length // 6 rows * 7 days
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }, [currentMonth])

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <Check size={12} className="text-white"/>
    if (status === 'missed') return <X size={12} className="text-white"/>
    if (status === 'paused') return <Circle size={12} className="text-white"/>
    return <HelpCircle size={12} className="text-muted-foreground"/>
  }

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>

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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1">Timeline</h1>
          <p className="text-muted-foreground font-medium">Your habit consistency mapped out.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl shadow-sm p-8">
        
        <div className="flex justify-between items-center mb-8">
          <button onClick={prevMonth} className="px-4 py-2 bg-accent text-foreground rounded-xl font-bold hover:bg-primary/20 hover:text-primary transition-colors">Previous</button>
          <div className="text-xl font-black flex items-center gap-2">
            <CalendarIcon size={20} className="text-primary"/> 
            {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={nextMonth} className="px-4 py-2 bg-accent text-foreground rounded-xl font-bold hover:bg-primary/20 hover:text-primary transition-colors">Next</button>
        </div>

        <div className="grid grid-cols-7 gap-4 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center font-bold text-muted-foreground uppercase text-xs tracking-widest">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-4">
          {calendarDays.map((d, i) => {
            const isCurrentMonth = d.getMonth() === currentMonth.getMonth()
            const dateStr = d.toISOString().split('T')[0]
            const dayLogs = logs.filter(l => l.date === dateStr)
            const isToday = dateStr === new Date().toISOString().split('T')[0]

            return (
              <div key={i} className={`min-h-[120px] p-3 rounded-2xl border transition-colors flex flex-col ${isCurrentMonth ? 'bg-background border-border' : 'bg-accent/20 border-transparent opacity-50'} ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                <div className={`font-bold mb-3 ${isToday ? 'text-primary text-lg' : 'text-foreground'}`}>
                  {d.getDate()}
                </div>
                <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                  {dayLogs.map((log, idx) => {
                    const habit = habits.find(h => h._id === log.habitId)
                    if (!habit) return null

                    let colorClass = 'bg-accent text-foreground'
                    if (log.status === 'completed') colorClass = 'bg-green-500'
                    else if (log.status === 'missed') colorClass = 'bg-red-500'
                    else if (log.status === 'paused') colorClass = 'bg-yellow-500'

                    return (
                      <div key={idx} className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md shadow-sm truncate ${colorClass}`}>
                        {getStatusIcon(log.status)}
                        <span className={`text-[10px] font-bold truncate ${log.status === 'completed' || log.status === 'missed' || log.status === 'paused' ? 'text-white' : 'text-muted-foreground'}`}>{habit.title}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
