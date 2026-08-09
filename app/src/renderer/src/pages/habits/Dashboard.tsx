import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, X, Flame, Trophy, TrendingUp, Sparkles, Loader2, Plus, Clock, MoreVertical, Play, Pause, RotateCcw, StopCircle } from 'lucide-react'
import { Habit, HabitDailyRecord, HabitTimerSession } from '../../types'
import { calculateHabitStats, checkAutoMisses, runHabitMigrations, logHabitActivity } from './HabitManager'
import { NotificationEngine } from '../../lib/NotificationEngine'
import HabitFormModal from './HabitFormModal'
import HabitBreakModal from './HabitBreakModal'

let globalState = {
  aiLoading: false,
  aiReview: null as string | null
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitDailyRecord[]>([])
  const [todayLogsMap, setTodayLogsMap] = useState<Record<string, HabitDailyRecord>>({})
  
  const [stats, setStats] = useState<any>(null)
  const [nextHabit, setNextHabit] = useState<{title: string, due: string} | null>(null)
  
  const [aiReview, setAiReview] = useState<string | null>(globalState.aiReview)
  const [aiLoading, setAiLoading] = useState(globalState.aiLoading)

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [breakOpen, setBreakOpen] = useState(false)
  const [activeHabit, setActiveHabit] = useState<Habit | null>(null)

  // Toast / Undo
  const [toast, setToast] = useState<{message: string, onUndo?: () => void} | null>(null)
  const toastTimeout = useRef<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Timer State
  const [activeTimerHabit, setActiveTimerHabit] = useState<string | null>(null)
  const [timerElapsed, setTimerElapsed] = useState<Record<string, number>>({}) // habitId -> seconds
  const timerRef = useRef<any>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  const loadData = async () => {
    try {
      await runHabitMigrations()
      await checkAutoMisses()

      const s = await calculateHabitStats()
      if (s) {
        setStats(s)
        setHabits(s.allHabits)
        setLogs(s.allLogs)
        
        const tMap: Record<string, HabitDailyRecord> = {}
        s.logsToday.forEach((l: HabitDailyRecord) => tMap[l.habitId] = l)
        setTodayLogsMap(tMap)

        // Find Next Habit
        const pending = s.allHabits.filter((h:Habit) => !tMap[h._id!] || tMap[h._id!].status === 'pending')
        if (pending.length > 0) {
          // Sort by deadline if available
          pending.sort((a:Habit, b:Habit) => (a.deadlineTime || '23:59').localeCompare(b.deadlineTime || '23:59'))
          setNextHabit({ title: pending[0].title, due: pending[0].deadlineTime ? `Due by ${pending[0].deadlineTime}` : 'Anytime' })
        } else {
          setNextHabit(null)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isMounted = useRef(true)

  const location = useLocation()
  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    if (highlightId && !loading && habits.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`habit-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [location.search, loading, habits.length])

  useEffect(() => {
    isMounted.current = true
    loadData()
    
    // Sync with global state in case it changed while unmounted
    setAiLoading(globalState.aiLoading)
    setAiReview(globalState.aiReview)

    return () => {
      isMounted.current = false
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (activeTimerHabit) {
      timerRef.current = setInterval(() => {
        setTimerElapsed(prev => ({
          ...prev,
          [activeTimerHabit]: (prev[activeTimerHabit] || 0) + 1
        }))
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [activeTimerHabit])

  // Watch Timer Elapsed to auto-complete
  useEffect(() => {
    if (activeTimerHabit) {
      const h = habits.find(h => h._id === activeTimerHabit)
      const elapsed = timerElapsed[activeTimerHabit] || 0
      if (h && h.targetDuration && elapsed >= h.targetDuration) {
        // Auto complete
        handleToggle(h._id!, 'completed')
        setActiveTimerHabit(null) // stop
        showToast('Timer target reached! Habit completed.', undefined)
      }
    }
  }, [timerElapsed, activeTimerHabit])

  const showToast = (message: string, onUndo?: () => void) => {
    setToast({ message, onUndo })
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setToast(null), 5000)
  }

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

  const handleToggle = async (habitId: string, status: 'completed'|'missed', previousStatus?: string) => {
    try {
      const existing = todayLogsMap[habitId]
      
      const payload: Partial<HabitDailyRecord> = {
        habitId,
        date: todayStr,
        status,
        updatedAt: Date.now()
      }
      if (status === 'completed') payload.completionTime = Date.now()

      if (existing && existing._id) {
        // @ts-ignore
        await window.api.db.update('habitLogs', { _id: existing._id }, { $set: payload })
      } else {
        payload.createdAt = Date.now()
        // @ts-ignore
        await window.api.db.insert('habitLogs', payload)
      }
      
      await logHabitActivity(habitId, status === 'completed' ? 'completed' : 'missed')
      
      if (status === 'completed') {
        const habitName = habits.find(h => h._id === habitId)?.title || 'Habit'
        NotificationEngine.checkHabitMilestones(habitId, habitName)
      }
      
      loadData()
      
      showToast(`Marked as ${status}`, async () => {
        if (existing && existing._id) {
          // Revert to old status
          // @ts-ignore
          await window.api.db.update('habitLogs', { _id: existing._id }, { $set: { status: existing.status, updatedAt: Date.now() } })
        } else {
          // Delete
          // @ts-ignore
          await window.api.db.remove('habitLogs', { habitId, date: todayStr }, { multi: true })
        }
        await logHabitActivity(habitId, 'edited', 'Reverted status via undo.')
        loadData()
      })
      
    } catch(err) {
      console.error(err)
    }
  }

  const handleDelete = async (habitId: string, mode: 'archive' | 'delete') => {
    try {
      if (mode === 'archive') {
        // @ts-ignore
        await window.api.db.update('habits', { _id: habitId }, { $set: { archived: true } })
        await logHabitActivity(habitId, 'archived')
        NotificationEngine.notify('info', 'Habit Archived', 'The habit has been moved to archives.', 'Habits')
      } else {
        // @ts-ignore
        await window.api.db.remove('habits', { _id: habitId })
        // @ts-ignore
        await window.api.db.remove('habitLogs', { habitId }, { multi: true })
        NotificationEngine.notify('warning', 'Habit Deleted', 'The habit and its logs were removed.', 'Habits')
        if (activeHabit?._id === habitId) setActiveHabit(null)
      }
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const generateAIReview = async () => {
    if (globalState.aiLoading) return
    
    globalState.aiLoading = true
    globalState.aiReview = null
    
    if (isMounted.current) {
      setAiLoading(true)
      setAiReview(null)
    }

    const prompt = `Act as an encouraging habit coach. I completed ${stats?.completedToday} out of ${stats?.totalToday} habits today. My global completion rate is ${stats?.completionRate}%. Give me a highly personalized, short daily review (max 3 sentences). Tell me what I did well and give one actionable tip for tomorrow. Don't use markdown.`

    try {
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.1:8b', prompt, stream: false })
      })
      const data = res.ok ? await res.json() : await (await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama3', prompt, stream: false })})).json()
      
      globalState.aiReview = data.response
      if (isMounted.current) setAiReview(data.response)
    } catch (err) {
      const errMsg = 'Great job today! Consistency is the key to building strong habits. Try keeping this momentum tomorrow.'
      globalState.aiReview = errMsg
      if (isMounted.current) setAiReview(errMsg)
    } finally {
      globalState.aiLoading = false
      if (isMounted.current) setAiLoading(false)
    }
  }

  if (loading || !stats) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>

  return (
    <div 
      ref={scrollContainerRef}
      className={`h-full overflow-y-auto p-8 animate-in fade-in duration-500 relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-foreground text-background px-4 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 z-50">
          <span className="font-medium text-sm">{toast.message}</span>
          {toast.onUndo && (
            <button onClick={() => {toast.onUndo && toast.onUndo(); setToast(null);}} className="text-primary font-bold text-sm hover:underline">Undo</button>
          )}
          <button onClick={() => setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/5 border border-orange-500/30 p-4 rounded-2xl flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
          <Flame size={24} className="text-orange-500 mb-2" />
          <div className="text-3xl font-black text-orange-500">{stats.score}<span className="text-lg text-orange-500/50">/100</span></div>
          <div className="text-xs uppercase tracking-widest font-bold text-orange-500/80 mt-1">Habit Score</div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center">
          <div className="text-sm font-bold text-muted-foreground uppercase mb-1 flex items-center gap-2"><Check size={14}/> Completed Today</div>
          <div className="text-2xl font-black text-foreground">{stats.completedToday} <span className="text-muted-foreground text-sm">/ {stats.totalToday}</span></div>
          <div className="w-full bg-accent h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${stats.totalToday ? (stats.completedToday/stats.totalToday)*100 : 0}%`}}></div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center">
          <div className="text-sm font-bold text-muted-foreground uppercase mb-1 flex items-center gap-2"><Flame size={14}/> Daily Streak</div>
          <div className="text-2xl font-black text-foreground">{stats.currentStreak} Days</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Trophy size={10}/> Longest: {stats.longestStreak}</div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center">
          <div className="text-sm font-bold text-muted-foreground uppercase mb-1 flex items-center gap-2"><TrendingUp size={14}/> Completion Rate</div>
          <div className="text-2xl font-black text-foreground">{stats.completionRate}%</div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center relative group">
          <div className="text-sm font-bold text-muted-foreground uppercase mb-1 flex items-center gap-2"><Clock size={14}/> Next Habit</div>
          <div className="text-lg font-bold text-primary truncate w-full group-hover:whitespace-normal group-hover:absolute group-hover:bg-card group-hover:p-4 group-hover:border group-hover:z-10 group-hover:rounded-xl group-hover:shadow-2xl">
            {nextHabit ? nextHabit.title : 'All Done!'}
            <div className="text-xs text-muted-foreground mt-1">{nextHabit ? nextHabit.due : 'Enjoy your day.'}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 group-hover:opacity-0">{nextHabit ? nextHabit.due : 'Enjoy your day.'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Today's Checklist */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black flex items-center gap-2">Today's Habits</h2>
            <button onClick={() => { setActiveHabit(null); setFormOpen(true); }} className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors flex items-center gap-2 group">
              <Plus size={18}/> <span className="hidden sm:inline-block">Add Habit</span>
            </button>
          </div>

          <div className="space-y-3">
            {habits.map(h => {
              const statusLog = todayLogsMap[h._id!]
              const status = statusLog ? statusLog.status : 'pending'
              const elapsed = timerElapsed[h._id!] || 0
              
              // Helper to format mm:ss
              const formatTime = (secs: number) => {
                const m = Math.floor(secs / 60)
                const s = secs % 60
                return `${m}:${s.toString().padStart(2, '0')}`
              }

              return (
                <div key={h._id} id={`habit-${h._id}`} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-1000 ${status === 'completed' ? 'bg-green-500/5 border-green-500/30 shadow-inner' : status === 'missed' ? 'bg-red-500/5 border-red-500/30 opacity-75' : activeTimerHabit === h._id ? 'bg-blue-500/10 border-blue-500/50 shadow-md ring-2 ring-blue-500/20' : 'bg-card border-border hover:border-primary/50'}`}>
                  
                  {/* Left info */}
                  <div className="flex flex-col">
                    <span className={`text-lg font-bold ${status === 'completed' ? 'text-green-600 line-through decoration-green-500/50' : status === 'missed' ? 'text-red-500 line-through decoration-red-500/50' : 'text-foreground'}`}>
                      {h.title}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 font-medium">
                      {h.deadlineTime && <span className="flex items-center gap-1"><Clock size={12}/> By {h.deadlineTime}</span>}
                      
                      {/* Timer Display */}
                      {h.isTimerEnabled && (
                        <span className={`flex items-center gap-1 ${activeTimerHabit === h._id ? 'text-blue-500 font-bold' : ''}`}>
                          <StopCircle size={12}/> 
                          {formatTime(elapsed)} / {h.targetDuration ? formatTime(h.targetDuration) : '0:00'}
                        </span>
                      )}
                      
                      {/* Status Badge */}
                      <span className={`uppercase tracking-widest text-[10px] px-1.5 py-0.5 rounded-sm ${status === 'completed' ? 'bg-green-500/20 text-green-600' : status === 'missed' ? 'bg-red-500/20 text-red-500' : status === 'paused' ? 'bg-accent text-foreground' : 'bg-accent/50 text-muted-foreground'}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Right Actions */}
                  <div className="flex items-center gap-2">
                    
                    {/* Timer controls */}
                    {h.isTimerEnabled && status !== 'completed' && (
                      <div className="flex items-center gap-1 mr-2 bg-accent/30 p-1 rounded-xl">
                        {activeTimerHabit === h._id ? (
                          <button onClick={() => setActiveTimerHabit(null)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500 text-white shadow-md hover:scale-110 transition-transform"><Pause size={16}/></button>
                        ) : (
                          <button onClick={() => { setActiveTimerHabit(h._id!); setTimerElapsed(prev => ({...prev, [h._id!]: prev[h._id!] || 0})) }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent text-foreground hover:bg-blue-500/20 hover:text-blue-500 transition-colors"><Play size={16}/></button>
                        )}
                        <button onClick={() => setTimerElapsed(prev => ({...prev, [h._id!]: 0}))} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"><RotateCcw size={16}/></button>
                      </div>
                    )}

                    <button 
                      onClick={() => handleToggle(h._id!, 'completed')}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-110 ${status === 'completed' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-accent hover:bg-green-500/20 text-muted-foreground hover:text-green-500'}`}
                      title="Complete"
                    >
                      <Check size={20} strokeWidth={status === 'completed' ? 3 : 2} />
                    </button>
                    
                    <button 
                      onClick={() => handleToggle(h._id!, 'missed')}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-110 ${status === 'missed' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-accent hover:bg-red-500/20 text-muted-foreground hover:text-red-500'}`}
                      title="Mark as missed"
                    >
                      <X size={20} strokeWidth={status === 'missed' ? 3 : 2} />
                    </button>
                    
                    <div className="relative group ml-1">
                      <button className="w-8 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <MoreVertical size={18}/>
                      </button>
                      <div className="absolute right-0 top-10 w-48 bg-background border border-border rounded-xl shadow-2xl py-1 z-50 text-sm font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <button onClick={() => { setActiveHabit(h); setFormOpen(true); }} className="w-full text-left px-4 py-2 hover:bg-accent">Edit habit</button>
                        <button onClick={() => { setActiveHabit(h); setBreakOpen(true); }} className="w-full text-left px-4 py-2 hover:bg-accent text-yellow-500">Start break</button>
                        <div className="my-1 border-t border-border"></div>
                        <button onClick={() => handleDelete(h._id!, 'archive')} className="w-full text-left px-4 py-2 hover:bg-accent">Archive habit</button>
                        <button onClick={() => handleDelete(h._id!, 'delete')} className="w-full text-left px-4 py-2 hover:bg-red-500 hover:text-white text-red-500">Delete habit</button>
                      </div>
                    </div>

                  </div>
                </div>
              )
            })}
            {habits.length === 0 && (
              <div className="text-center p-8 border border-dashed border-border rounded-2xl text-muted-foreground bg-accent/10">
                You haven't set up any active habits yet. Click the Add Habit button to start!
              </div>
            )}
          </div>
        </div>

        {/* AI Daily Review */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-primary/10 to-background border border-primary/20 p-6 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none text-primary"><Sparkles size={120}/></div>
            
            <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary relative z-10"><Sparkles size={20}/> AI Daily Review</h3>
            
            {stats.completedToday > 0 || Object.keys(todayLogsMap).length > 0 ? (
              <div className="relative z-10">
                {aiLoading ? (
                  <div className="flex items-center gap-3 text-primary py-4"><Loader2 size={16} className="animate-spin"/> Analyzing your day...</div>
                ) : aiReview ? (
                  <div className="text-sm leading-relaxed text-foreground/90 font-medium bg-background/50 p-4 rounded-xl border border-border/50">
                    {aiReview}
                  </div>
                ) : (
                  <button onClick={generateAIReview} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                    <Sparkles size={18}/> Generate Review
                  </button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm relative z-10 bg-background/50 p-4 rounded-xl">Complete or miss some habits today to get your personalized AI review.</p>
            )}
          </div>
        </div>

      </div>

      <HabitFormModal 
        isOpen={formOpen} 
        onClose={() => setFormOpen(false)} 
        initialData={activeHabit || undefined}
        onSave={loadData}
        onDelete={handleDelete}
      />
      
      {activeHabit && (
        <HabitBreakModal 
          isOpen={breakOpen} 
          onClose={() => setBreakOpen(false)} 
          habit={activeHabit}
          onSave={loadData}
        />
      )}

    </div>
  )
}
