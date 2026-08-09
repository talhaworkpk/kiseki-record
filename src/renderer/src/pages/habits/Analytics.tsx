import { useState, useEffect, useMemo, useRef } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { Loader2, TrendingUp, Trophy, AlertTriangle, Clock, Calendar, Hash, Target, Sparkles, Filter } from 'lucide-react'
import { Habit, HabitDailyRecord, HabitTimerSession, HabitBreak } from '../../types'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitDailyRecord[]>([])
  const [timerSessions, setTimerSessions] = useState<HabitTimerSession[]>([])
  const [breaks, setBreaks] = useState<HabitBreak[]>([])
  
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d')
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      // @ts-ignore
      const allHabits: Habit[] = await window.api.db.find('habits', { archived: { $ne: true } })
      // @ts-ignore
      const allLogs: HabitDailyRecord[] = await window.api.db.find('habitLogs', {})
      // @ts-ignore
      const allTimers: HabitTimerSession[] = await window.api.db.find('habitTimerSessions', {})
      // @ts-ignore
      const allBreaks: HabitBreak[] = await window.api.db.find('habitBreaks', {})

      setHabits(allHabits)
      setLogs(allLogs)
      setTimerSessions(allTimers)
      setBreaks(allBreaks)
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

  // Analytics Computation Engine
  const analytics = useMemo<{
    completed: number;
    missed: number;
    paused: number;
    completionRate: number;
    bestHabit: Habit | null | undefined;
    worstHabit: Habit | null | undefined;
    trendData: any[];
    totalTimerSeconds: number;
    avgTimerMinutes: number;
    hoursTracked: string;
  } | null>(() => {
    if (habits.length === 0 || logs.length === 0) return null

    // Filter by habit
    const fLogs = selectedHabitId === 'all' ? logs : logs.filter(l => l.habitId === selectedHabitId)
    const fTimers = selectedHabitId === 'all' ? timerSessions : timerSessions.filter(t => t.habitId === selectedHabitId)

    // Filter by Date Range
    const today = new Date()
    today.setHours(0,0,0,0)
    let startDate = new Date(0)
    if (timeRange === '7d') startDate = new Date(today.getTime() - 7 * 86400000)
    if (timeRange === '30d') startDate = new Date(today.getTime() - 30 * 86400000)

    const rLogs = timeRange === 'all' ? fLogs : fLogs.filter(l => new Date(l.date) >= startDate)
    
    if (rLogs.length === 0) return null // empty state

    const completed = rLogs.filter(l => l.status === 'completed').length
    const missed = rLogs.filter(l => l.status === 'missed').length
    const paused = rLogs.filter(l => l.status === 'paused' || l.status === 'skipped').length
    const totalEligible = completed + missed
    const completionRate = totalEligible > 0 ? Math.round((completed / totalEligible) * 100) : 0

    // Best & Worst Habits (only when all habits selected)
    let bestHabit: Habit | null | undefined = null
    let worstHabit: Habit | null | undefined = null
    if (selectedHabitId === 'all') {
      const hStats: Record<string, { c: number, m: number }> = {}
      habits.forEach(h => hStats[h._id!] = { c: 0, m: 0 })
      rLogs.forEach(l => {
        if (l.status === 'completed' && hStats[l.habitId]) hStats[l.habitId].c++
        if (l.status === 'missed' && hStats[l.habitId]) hStats[l.habitId].m++
      })
      
      let highestRate = -1
      let lowestRate = 101
      Object.entries(hStats).forEach(([id, stats]) => {
        const t = stats.c + stats.m
        if (t > 2) { // minimum threshold
          const r = (stats.c / t) * 100
          if (r > highestRate) { highestRate = r; bestHabit = habits.find(h=>h._id===id) }
          if (r < lowestRate) { lowestRate = r; worstHabit = habits.find(h=>h._id===id) }
        }
      })
    }

    // Chart Data Generation (Trend over the selected days)
    const trendData: any[] = []
    if (timeRange !== 'all') {
      const daysCount = timeRange === '7d' ? 7 : 30
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000)
        const dStr = d.toISOString().split('T')[0]
        const dLogs = rLogs.filter(l => l.date === dStr)
        
        const c = dLogs.filter(l => l.status === 'completed').length
        const m = dLogs.filter(l => l.status === 'missed').length
        const r = (c + m) > 0 ? Math.round((c / (c + m)) * 100) : 0
        trendData.push({ date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), rate: r, completed: c, missed: m })
      }
    } else {
      // Group by month
      const monthsMap: Record<string, {c:number, m:number}> = {}
      rLogs.forEach(l => {
        const mStr = l.date.substring(0, 7) // YYYY-MM
        if (!monthsMap[mStr]) monthsMap[mStr] = {c:0, m:0}
        if (l.status === 'completed') monthsMap[mStr].c++
        if (l.status === 'missed') monthsMap[mStr].m++
      })
      Object.entries(monthsMap).sort().forEach(([mStr, st]) => {
        const r = (st.c + st.m) > 0 ? Math.round((st.c / (st.c + st.m)) * 100) : 0
        trendData.push({ date: mStr, rate: r, completed: st.c, missed: st.m })
      })
    }

    // Timer Stats
    const totalTimerSeconds = fTimers.reduce((acc, t) => acc + t.duration, 0)
    const avgTimerMinutes = fTimers.length > 0 ? Math.round((totalTimerSeconds / fTimers.length) / 60) : 0
    const hoursTracked = (totalTimerSeconds / 3600).toFixed(1)

    return {
      completed, missed, paused, completionRate, bestHabit, worstHabit, trendData, totalTimerSeconds, avgTimerMinutes, hoursTracked
    }
  }, [habits, logs, timerSessions, breaks, timeRange, selectedHabitId])

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
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1">Real Analytics</h1>
          <p className="text-muted-foreground font-medium">Understand your patterns with accurate data.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-xl">
            <Filter size={14} className="text-muted-foreground"/>
            <select value={selectedHabitId} onChange={e=>setSelectedHabitId(e.target.value)} className="bg-transparent text-sm font-bold outline-none cursor-pointer">
              <option value="all">All Habits</option>
              {habits.map(h => <option key={h._id} value={h._id}>{h.title}</option>)}
            </select>
          </div>
          <div className="flex bg-accent rounded-xl p-1 shrink-0">
            {['7d', '30d', 'all'].map(r => (
              <button key={r} onClick={() => setTimeRange(r as any)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${timeRange === r ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {r === 'all' ? 'All Time' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!analytics ? (
        <div className="text-center p-12 bg-card border border-dashed border-border rounded-3xl max-w-2xl mx-auto mt-20">
          <Sparkles size={48} className="mx-auto text-primary/30 mb-4"/>
          <h2 className="text-2xl font-bold mb-2">Not enough habit activity yet.</h2>
          <p className="text-muted-foreground">Complete habits for a few days to unlock comprehensive analytics and charts.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
              <div className="text-sm font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2"><TrendingUp size={16}/> Completion Rate</div>
              <div className="text-4xl font-black">{analytics.completionRate}%</div>
              <div className="text-xs text-muted-foreground mt-2 font-medium">Across {analytics.completed + analytics.missed} eligible records</div>
            </div>
            
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
              <div className="text-sm font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2"><Target size={16}/> Completed</div>
              <div className="text-4xl font-black text-green-500">{analytics.completed}</div>
              <div className="text-xs text-muted-foreground mt-2 font-medium">vs {analytics.missed} Missed</div>
            </div>

            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
              <div className="text-sm font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2"><Clock size={16}/> Time Tracked</div>
              <div className="text-4xl font-black text-blue-500">{analytics.hoursTracked}h</div>
              <div className="text-xs text-muted-foreground mt-2 font-medium">Avg {analytics.avgTimerMinutes}m per session</div>
            </div>

            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
              <div className="text-sm font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2"><Calendar size={16}/> Paused / Skipped</div>
              <div className="text-4xl font-black text-yellow-500">{analytics.paused}</div>
              <div className="text-xs text-muted-foreground mt-2 font-medium">Days protected from streak loss</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-card border border-border p-6 rounded-3xl shadow-sm h-[400px] flex flex-col">
              <h3 className="font-bold text-lg mb-6">Completion Trend</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.trendData}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="rate" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              {selectedHabitId === 'all' && (
                <>
                  {analytics.bestHabit && (
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 p-6 rounded-3xl">
                      <div className="text-sm font-bold text-green-600/80 uppercase mb-2 flex items-center gap-2"><Trophy size={16}/> Best Performing</div>
                      <div className="text-2xl font-black text-green-600 truncate">{analytics.bestHabit.title}</div>
                      <div className="text-xs text-green-600/80 font-medium mt-1">Keep up the great work!</div>
                    </div>
                  )}
                  {analytics.worstHabit && (
                    <div className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 p-6 rounded-3xl">
                      <div className="text-sm font-bold text-red-500/80 uppercase mb-2 flex items-center gap-2"><AlertTriangle size={16}/> Needs Attention</div>
                      <div className="text-2xl font-black text-red-500 truncate">{analytics.worstHabit.title}</div>
                      <div className="text-xs text-red-500/80 font-medium mt-1">Try lowering the target temporarily.</div>
                    </div>
                  )}
                </>
              )}

              <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex-1">
                <h3 className="font-bold text-lg mb-4">Volume (Completed vs Missed)</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.trendData}>
                      <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: 'var(--accent)'}} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }} />
                      <Legend />
                      <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[0,0,4,4]} />
                      <Bar dataKey="missed" stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  )
}
