import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, X, Flame, Trophy, TrendingUp, Sparkles, Loader2, Plus, Clock, MoreVertical, Play, Pause, RotateCcw, StopCircle, Activity } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip'
import { Habit, HabitDailyRecord, HabitTimerSession, HabitDifficulty } from '../../types'
import { calculateHabitStats, checkAutoMisses, runHabitMigrations, logHabitActivity, getEffectiveDeadline } from './HabitManager'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { OllamaClient } from '../../lib/ai/OllamaClient'
import HabitFormModal from './HabitFormModal'
import HabitBreakModal from './HabitBreakModal'

let globalState = {
  aiLoading: false,
  aiReview: null as string | null,
  aiError: null as string | null
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
  const [aiError, setAiError] = useState<string | null>(globalState.aiError)

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [breakOpen, setBreakOpen] = useState(false)
  const [activeHabit, setActiveHabit] = useState<Habit | null>(null)

  // Toast / Undo
  const [toast, setToast] = useState<{message: string, onUndo?: () => void} | null>(null)
  const toastTimeout = useRef<any>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Timer State
  const [activeTimerHabit, setActiveTimerHabit] = useState<string | null>(null)
  const [timerElapsed, setTimerElapsed] = useState<Record<string, number>>({}) // habitId -> seconds
  const timerRef = useRef<any>(null)

  const [currentTime, setCurrentTime] = useState(new Date())
  const processingMissesRef = useRef<Set<string>>(new Set())

  const todayStr = new Date().toISOString().split('T')[0]

  const loadData = async () => {
    try {
      await runHabitMigrations()
      await checkAutoMisses()

      const s = await calculateHabitStats()
      if (s) {
        setStats(s)
        setHabits(s.habitsToday)
        setLogs(s.allLogs)
        
        const tMap: Record<string, HabitDailyRecord> = {}
        s.logsToday.forEach((l: HabitDailyRecord) => tMap[l.habitId] = l)
        setTodayLogsMap(tMap)

        // Find Next Habit
        const pending = s.habitsToday.filter((h:Habit) => !tMap[h._id!] || tMap[h._id!].status === 'pending')
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
    setAiError(globalState.aiError)

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

  // Current time interval for countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Real-time auto-miss logic
  useEffect(() => {
    if (!habits || habits.length === 0) return
    const now = currentTime.getTime()
    
    habits.forEach(h => {
      const statusLog = todayLogsMap[h._id!]
      const status = statusLog ? statusLog.status : 'pending'
      
      if (status === 'pending' && !processingMissesRef.current.has(h._id!)) {
        const elapsed = timerElapsed[h._id!] || 0
        const effectiveDeadline = getEffectiveDeadline(h, elapsed).getTime()
        if (now > effectiveDeadline) {
          processingMissesRef.current.add(h._id!)
          const newStatus = h.category === 'Bad Habit' ? 'completed' : 'missed'
          handleToggle(h._id!, newStatus).finally(() => {
            setTimeout(() => processingMissesRef.current.delete(h._id!), 2000)
          })
        }
      }
    })
  }, [currentTime, habits, todayLogsMap, timerElapsed])

  const showToast = (message: string, onUndo?: () => void) => {
    setToast({ message, onUndo })
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setToast(null), 5000)
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

  const handleUpdateDifficulty = async (habitId: string, difficultyLevel: HabitDifficulty | null) => {
    try {
      const existing = todayLogsMap[habitId]
      
      if (existing && existing._id) {
        // @ts-ignore
        await window.api.db.update('habitLogs', { _id: existing._id }, { $set: { difficultyLevel, updatedAt: Date.now() } })
      } else {
        if (!difficultyLevel) return
        
        const payload: Partial<HabitDailyRecord> = {
          habitId,
          date: todayStr,
          status: 'pending',
          difficultyLevel,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        // @ts-ignore
        await window.api.db.insert('habitLogs', payload)
      }
      
      loadData()
      showToast('Difficulty saved.')
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (habitId: string, mode: 'archive' | 'delete') => {
    try {
      if (mode === 'archive') {
        // @ts-ignore
        await window.api.db.update('habits', { _id: habitId }, { $set: { archived: true, updatedAt: Date.now() } })
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
    globalState.aiError = null
    
    if (isMounted.current) {
      setAiLoading(true)
      setAiReview(null)
      setAiError(null)
    }

    const completedHabits = habits.filter(h => todayLogsMap[h._id!]?.status === 'completed').map(h => h.title).join(', ');
    const missedHabits = habits.filter(h => todayLogsMap[h._id!]?.status === 'missed').map(h => h.title).join(', ');
    const pendingHabits = habits.filter(h => !todayLogsMap[h._id!] || todayLogsMap[h._id!]?.status === 'pending').map(h => h.title).join(', ');
    
    const prompt = `You are a concise, encouraging habit coach. 
Today's Summary: Completed ${stats?.completedToday}/${stats?.totalToday} habits.
Completed: ${completedHabits || 'None'}
Missed: ${missedHabits || 'None'}
Pending: ${pendingHabits || 'None'}
Global Rate: ${stats?.completionRate}%

Write a brief 3-sentence daily review. 
Sentence 1: Praise them for the specific habits they completed.
Sentence 2: Acknowledge ALL the specific habits they missed and the ones still pending today.
Sentence 3: Give ONE short, actionable tip to help them complete their pending or missed habits tomorrow.
Do NOT use markdown. Do NOT use bullet points.`

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      // Fetch available models first using the shared client
      let selectedModel = '';
      try {
        selectedModel = await OllamaClient.getBestModel(controller.signal);
      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.message === 'no_models_found') {
          showToast('No models found in Ollama. Please run "ollama run llama3" in your terminal first.');
        } else {
          showToast('Cannot connect to Ollama. Please ensure Ollama is running locally.');
        }
        globalState.aiError = e.message;
        if (isMounted.current) setAiError(e.message);
        globalState.aiReview = null;
        if (isMounted.current) setAiReview(null);
        globalState.aiLoading = false;
        if (isMounted.current) setAiLoading(false);
        return;
      }

      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: selectedModel, 
          prompt, 
          stream: false, 
          keep_alive: 0,
          options: {
            num_ctx: 2048
          }
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        let errBody = '';
        try { errBody = await res.text(); } catch(e) {}
        throw new Error(`generation_failed: ${res.status} ${errBody}`);
      }
      
      clearTimeout(timeoutId);
      const data = await res.json();
      
      globalState.aiReview = data.response;
      if (isMounted.current) setAiReview(data.response);
    } catch (err: any) {
      let errMsg = 'An error occurred while generating the review.';
      if (err.name === 'AbortError') {
        errMsg = 'Request timed out after 2 minutes. Ollama might be stuck or still downloading.';
      } else if (err.message === 'connection_failed' || err.message.includes('fetch')) {
        errMsg = 'Cannot connect to Ollama. Please ensure Ollama is running locally.';
      } else if (err.message.startsWith('generation_failed')) {
        errMsg = 'Ollama error: ' + err.message.replace('generation_failed: ', '');
      } else {
        console.error(err);
      }
      
      showToast('Error generating AI review. See details below.');
      globalState.aiError = errMsg;
      if (isMounted.current) setAiError(errMsg);
      globalState.aiReview = null;
      if (isMounted.current) setAiReview(null);
    } finally {
      globalState.aiLoading = false
      if (isMounted.current) setAiLoading(false)
    }
  }

  if (loading || !stats) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full overflow-y-auto p-8 pb-32 animate-in fade-in duration-500 relative"
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
              
              const formatCountdown = (deadline: Date, now: Date) => {
                const diff = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000))
                const h = Math.floor(diff / 3600)
                const m = Math.floor((diff % 3600) / 60)
                const s = diff % 60
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
              }
              
              const currentDifficulty = statusLog?.difficultyLevel
              const diffIconMap: Record<string, { icon: string, color: string }> = {
                'easy': { icon: '🟢', color: 'text-green-500' },
                'slight': { icon: '🟡', color: 'text-yellow-500' },
                'difficult': { icon: '🟠', color: 'text-orange-500' },
                'very_difficult': { icon: '🔴', color: 'text-red-500' },
                'couldnt_resist': { icon: '⚫', color: 'text-gray-900 dark:text-gray-400' }
              }

              return (
                <div key={h._id} id={`habit-${h._id}`} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-1000 ${status === 'completed' ? 'bg-green-500/5 border-green-500/30 shadow-inner' : status === 'missed' ? 'bg-red-500/5 border-red-500/30 opacity-75' : activeTimerHabit === h._id ? 'bg-blue-500/10 border-blue-500/50 shadow-md ring-2 ring-blue-500/20' : 'bg-card border-border hover:border-primary/50'}`}>
                  
                  {/* Left info */}
                  <div className="flex flex-col">
                    {h.description ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-lg font-bold cursor-help ${status === 'completed' ? 'text-green-600 line-through decoration-green-500/50' : status === 'missed' ? 'text-red-500 line-through decoration-red-500/50' : 'text-foreground'}`}>
                            {h.title}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-center font-medium">
                          {h.description}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className={`text-lg font-bold ${status === 'completed' ? 'text-green-600 line-through decoration-green-500/50' : status === 'missed' ? 'text-red-500 line-through decoration-red-500/50' : 'text-foreground'}`}>
                        {h.title}
                      </span>
                    )}
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
                      {status === 'pending' ? (
                        <span className="uppercase tracking-widest text-[10px] px-1.5 py-0.5 rounded-sm bg-orange-500/20 text-orange-600 font-bold flex items-center gap-1">
                          <Clock size={10}/>
                          {formatCountdown(getEffectiveDeadline(h, elapsed), currentTime)}
                        </span>
                      ) : (
                        <span className={`uppercase tracking-widest text-[10px] px-1.5 py-0.5 rounded-sm ${status === 'completed' ? 'bg-green-500/20 text-green-600' : status === 'missed' ? 'bg-red-500/20 text-red-500' : status === 'paused' ? 'bg-accent text-foreground' : 'bg-accent/50 text-muted-foreground'}`}>
                          {status}
                        </span>
                      )}
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

                    {h.category !== 'Bad Habit' && (
                      <button 
                        onClick={() => handleToggle(h._id!, 'completed')}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-110 ${status === 'completed' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-accent hover:bg-green-500/20 text-muted-foreground hover:text-green-500'}`}
                        title="Complete"
                      >
                        <Check size={20} strokeWidth={status === 'completed' ? 3 : 2} />
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleToggle(h._id!, 'missed')}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-110 ${status === 'missed' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-accent hover:bg-red-500/20 text-muted-foreground hover:text-red-500'}`}
                      title="Mark as missed"
                    >
                      <X size={20} strokeWidth={status === 'missed' ? 3 : 2} />
                    </button>
                    
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <button 
                          className={`w-10 h-10 ml-1 rounded-xl flex items-center justify-center transition-transform hover:scale-110 ${currentDifficulty ? 'bg-accent shadow-inner' : 'hover:bg-accent text-muted-foreground hover:text-foreground'}`}
                          title="Record Resistance"
                        >
                          {currentDifficulty && diffIconMap[currentDifficulty] ? (
                            <span className="text-sm">{diffIconMap[currentDifficulty].icon}</span>
                          ) : (
                            <Activity size={18} />
                          )}
                        </button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content sideOffset={5} className="z-[9999] bg-card border border-border shadow-2xl rounded-2xl p-4 w-64 animate-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
                          <div className="text-sm font-bold mb-3 text-center">How strong was your urge to skip this habit?</div>
                          <div className="space-y-1">
                            <button onClick={() => handleUpdateDifficulty(h._id!, 'easy')} className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg text-sm text-left"><span className="text-base">🟢</span> <span className="font-medium">Easy (None)</span></button>
                            <button onClick={() => handleUpdateDifficulty(h._id!, 'slight')} className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg text-sm text-left"><span className="text-base">🟡</span> <span className="font-medium">Slight Resistance</span></button>
                            <button onClick={() => handleUpdateDifficulty(h._id!, 'difficult')} className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg text-sm text-left"><span className="text-base">🟠</span> <span className="font-medium">Difficult</span></button>
                            <button onClick={() => handleUpdateDifficulty(h._id!, 'very_difficult')} className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg text-sm text-left"><span className="text-base">🔴</span> <span className="font-medium">Very Difficult</span></button>
                            <button onClick={() => handleUpdateDifficulty(h._id!, 'couldnt_resist')} className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg text-sm text-left"><span className="text-base">⚫</span> <span className="font-medium">Couldn't Resist</span></button>
                          </div>
                          {currentDifficulty && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <button onClick={() => handleUpdateDifficulty(h._id!, null)} className="w-full py-2 bg-accent text-muted-foreground hover:text-foreground rounded-lg text-xs font-bold uppercase tracking-widest">Clear</button>
                            </div>
                          )}
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>

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
          <div className="bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 border border-indigo-500/30 p-6 rounded-3xl shadow-[0_0_40px_-15px_rgba(99,102,241,0.3)] relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-20 pointer-events-none text-indigo-500 blur-xl group-hover:blur-md transition-all duration-700">
              <Sparkles size={180}/>
            </div>
            
            <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-indigo-500 relative z-10">
              <Sparkles size={20} className="animate-pulse"/> AI Daily Review
            </h3>
            
            {stats.completedToday > 0 || Object.keys(todayLogsMap).length > 0 ? (
              <div className="relative z-10">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-6 text-indigo-500 space-y-3">
                    <Loader2 size={24} className="animate-spin"/>
                    <span className="text-sm font-bold tracking-widest uppercase animate-pulse">Consulting AI...</span>
                  </div>
                ) : aiError ? (
                  <div className="text-sm leading-relaxed text-red-500 font-medium bg-red-500/10 backdrop-blur-md p-5 rounded-2xl border border-red-500/20 shadow-inner">
                    <div className="font-bold mb-2">Error Generating Review</div>
                    <div className="select-text whitespace-pre-wrap">{aiError}</div>
                    <button onClick={() => { setAiError(null); globalState.aiError = null; }} className="mt-4 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors">Dismiss</button>
                  </div>
                ) : aiReview ? (
                  <div className="text-sm leading-relaxed text-foreground font-medium bg-background/60 backdrop-blur-md p-5 rounded-2xl border border-indigo-500/20 shadow-inner select-text">
                    {aiReview}
                  </div>
                ) : (
                  <button onClick={generateAIReview} className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2">
                    <Sparkles size={18}/> Generate Insights
                  </button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm relative z-10 bg-background/50 backdrop-blur-sm p-4 rounded-xl border border-border/50">Complete or miss some habits today to get your personalized AI review.</p>
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
