import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { OverscrollContainer } from '../../components/ui/OverscrollContainer'
import { Habit, HabitDailyRecord, HabitBreak } from '../../types'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isAfter, startOfDay, parseISO } from 'date-fns'
import { X, ChevronLeft, ChevronRight, BarChart2, ArrowDown, ArrowUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Props {
  habits: Habit[]
  logs: HabitDailyRecord[]
  breaks: HabitBreak[]
  initialMonth: Date
  onClose: () => void
}

export default function MonthAnalyticsModal({ habits, logs, breaks, initialMonth, onClose }: Props) {
  const [currentDate, setCurrentDate] = useState<Date>(initialMonth)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const handlePrev = () => setCurrentDate(prev => subMonths(prev, 1))
  const handleNext = () => setCurrentDate(prev => addMonths(prev, 1))

  const analytics = useMemo(() => {
    const startDate = startOfMonth(currentDate)
    const endDate = endOfMonth(currentDate)
    const todayStart = startOfDay(new Date())

    let completedCount = 0
    let missedCount = 0
    let chartData: Array<{ name: string; completed: number; missed: number; date: string }> = []

    const habitStats: Record<string, { id: string, title: string, category: string, completed: number, missed: number, total: number }> = {}
    habits.forEach(h => {
      habitStats[h._id!] = { id: h._id!, title: h.title, category: h.category || '', completed: 0, missed: 0, total: 0 }
    })

    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const dayMap: Record<string, { c: number, m: number, name: string }> = {}
    
    days.forEach(d => {
      const dKey = format(d, 'yyyy-MM-dd')
      dayMap[dKey] = { c: 0, m: 0, name: format(d, 'MMM d') }
    })

    // Helper to check if a date is within any habit break for a specific habit
    const isWithinBreak = (d: Date, habitId: string) => {
      const habitBreaks = breaks.filter(b => b.habitId === habitId)
      return habitBreaks.some(b => {
        const bStart = startOfDay(parseISO(b.startDate))
        const bEnd = b.endDate ? startOfDay(parseISO(b.endDate)) : todayStart
        return (!isBefore(d, bStart) && !isAfter(d, bEnd))
      })
    }

    // Helper to check schedule
    const isScheduled = (d: Date, habit: Habit) => {
      const day = d.getDay()
      if (habit.scheduleType === 'daily') return true
      if (habit.scheduleType === 'weekdays') return day >= 1 && day <= 5
      if (habit.scheduleType === 'weekends') return day === 0 || day === 6
      if (habit.scheduleType === 'specific_days' && habit.scheduleDays) {
        return habit.scheduleDays.includes(day)
      }
      return true
    }

    const loggedDays = new Set<string>()

    logs.forEach(l => {
      if (dayMap[l.date]) {
        loggedDays.add(`${l.date}_${l.habitId}`)
        if (l.status === 'completed') {
           dayMap[l.date].c++
           completedCount++
           if (habitStats[l.habitId]) habitStats[l.habitId].completed++
        }
        if (l.status === 'missed') {
           dayMap[l.date].m++
           missedCount++
           if (habitStats[l.habitId]) habitStats[l.habitId].missed++
        }
      }
    })

    // Infer misses / Bad habit completions
    days.forEach(d => {
      const dKey = format(d, 'yyyy-MM-dd')
      if (isBefore(d, todayStart) && dayMap[dKey]) {
        habits.forEach(habit => {
          if (!habit.createdAt) return
          const hCreated = startOfDay(new Date(habit.createdAt))
          if (isBefore(d, hCreated)) return

          const logKey = `${dKey}_${habit._id}`
          if (!loggedDays.has(logKey)) {
            if (isScheduled(d, habit) && !isWithinBreak(d, habit._id!)) {
              if (habit.category === 'Bad Habit') {
                dayMap[dKey].c++
                completedCount++
                if (habitStats[habit._id!]) habitStats[habit._id!].completed++
              } else {
                dayMap[dKey].m++
                missedCount++
                if (habitStats[habit._id!]) habitStats[habit._id!].missed++
              }
            }
          }
        })
      }
    })

    chartData = Object.keys(dayMap).sort().map(k => ({
      name: dayMap[k].name,
      date: k,
      completed: dayMap[k].c,
      missed: dayMap[k].m
    }))

    const habitStatsList = Object.values(habitStats).map(h => ({
      ...h,
      total: h.completed + h.missed,
      percentage: (h.completed + h.missed) > 0 ? Math.round((h.completed / (h.completed + h.missed)) * 100) : 0
    })).filter(h => h.total > 0)

    const mostCompletedHabit = [...habitStatsList].sort((a, b) => b.completed - a.completed)[0]
    const mostMissedHabit = [...habitStatsList].sort((a, b) => b.missed - a.missed)[0]

    return { completedCount, missedCount, chartData, habitStatsList, mostCompletedHabit, mostMissedHabit }
  }, [currentDate, habits, logs, breaks])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-start bg-accent/30 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">📈</span>
              <h2 className="text-2xl font-black">Month Analytics</h2>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Overall habit performance across all habits
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-background border border-border hover:bg-accent rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <OverscrollContainer absolute={false} className="flex-1 min-h-0" containerClassName="p-6 space-y-6">
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 bg-background border border-border px-2 py-1 rounded-xl">
              <button onClick={handlePrev} className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"><ChevronLeft size={18}/></button>
              
              <input 
                type="month" 
                value={format(currentDate, 'yyyy-MM')} 
                onChange={(e) => {
                  if (e.target.value) {
                     // Adding T12:00:00 to avoid timezone issues when parsing "YYYY-MM"
                     setCurrentDate(new Date(e.target.value + '-01T12:00:00'))
                  }
                }}
                className="bg-transparent text-sm font-bold text-center outline-none cursor-pointer min-w-[140px]"
              />
              
              <button onClick={handleNext} className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"><ChevronRight size={18}/></button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Total Completed</div>
                  <div className="text-3xl font-black text-green-500">{analytics.completedCount}</div>
                </div>
                <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Total Missed</div>
                  <div className="text-3xl font-black text-red-500">{analytics.missedCount}</div>
                </div>
                
                <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Most Completed</div>
                  {analytics.mostCompletedHabit && analytics.mostCompletedHabit.completed > 0 ? (
                    <div>
                      <div className="text-lg font-bold truncate" title={analytics.mostCompletedHabit.title}>{analytics.mostCompletedHabit.title}</div>
                      <div className="text-sm font-medium text-green-500 mt-1">{analytics.mostCompletedHabit.completed} days</div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic mt-2">N/A</div>
                  )}
                </div>

                <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Most Missed</div>
                  {analytics.mostMissedHabit && analytics.mostMissedHabit.missed > 0 ? (
                    <div>
                      <div className="text-lg font-bold truncate" title={analytics.mostMissedHabit.title}>{analytics.mostMissedHabit.title}</div>
                      <div className="text-sm font-medium text-red-500 mt-1">{analytics.mostMissedHabit.missed} days</div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic mt-2">N/A</div>
                  )}
                </div>
              </div>

              {/* Chart */}
              <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                <h3 className="font-bold text-lg mb-4">Daily Performance</h3>
                
                {analytics.chartData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No activity to display.
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMissed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} minTickGap={15} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px' }} 
                          labelStyle={{ fontWeight: 'bold', color: 'var(--foreground)', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
                        <Area type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorMissed)" name="Missed" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Habit Performance List */}
            <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex flex-col h-full max-h-[600px]">
              <h3 className="font-bold text-lg mb-4 shrink-0 flex items-center justify-between">
                <span>Habit Breakdown</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="p-1 hover:bg-accent rounded text-muted-foreground transition-colors"
                    title={sortOrder === 'desc' ? "Sort Ascending" : "Sort Descending"}
                  >
                    {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                  </button>
                  <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-accent rounded-md">{format(currentDate, 'MMMM yyyy')}</span>
                </div>
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {analytics.habitStatsList.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                    No active habits found for this month.
                  </div>
                ) : (
                  [...analytics.habitStatsList]
                    .sort((a, b) => sortOrder === 'desc' ? b.percentage - a.percentage : a.percentage - b.percentage)
                    .map(h => (
                    <div key={h.id} className="p-3 bg-background border border-border/50 rounded-xl hover:border-border transition-colors group flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm truncate max-w-[200px]" title={h.title}>{h.title}</div>
                          {h.category && <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{h.category}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded" title="Completed">{h.completed}</span>
                          <span className="text-xs font-medium bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded" title="Missed">{h.missed}</span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-accent rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-green-500 transition-all duration-500" 
                            style={{ width: `${h.percentage}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-10 text-right ${
                          h.percentage >= 80 ? 'text-green-500' :
                          h.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {h.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </OverscrollContainer>
      </div>
    </div>,
    document.body
  )
}
