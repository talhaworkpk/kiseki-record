import { useState, useEffect, useRef } from 'react'
import { Award, Trophy, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Habit, HabitDailyRecord, HabitTimerSession, HabitBreak, SystemUnlock } from '../../types'
import { AchievementDefinitions, AchievementEngine, HabitAchievementMetrics } from '../../lib/AchievementEngine'
import { DraggableScroll } from '../../components/DraggableScroll'

export default function Milestones() {
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitDailyRecord[]>([])
  const [timers, setTimers] = useState<HabitTimerSession[]>([])
  const [breaks, setBreaks] = useState<HabitBreak[]>([])
  const [unlocks, setUnlocks] = useState<SystemUnlock[]>([])
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
      // @ts-ignore
      const b = await window.api.db.find('habitBreaks', {})
      // @ts-ignore
      const u = await window.api.db.find('systemUnlocks', {})
      
      setHabits(h)
      setLogs(l)
      setTimers(t)
      setBreaks(b)
      setUnlocks(u)
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

  const handleMouseUp = () => setIsDragging(false)

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>

  // Best Habit Logic (Legacy)
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

  // Most Dedicated (Legacy)
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

  const unlockedKeys = new Set(unlocks.map(u => u.key))

  // Calculate metrics for all habits
  const allMetrics = habits.map(h => 
    AchievementEngine.generateMetrics(h, logs.filter(l => l.habitId === h._id), breaks.filter(b => b.habitId === h._id))
  )

  const categories = Array.from(new Set(AchievementDefinitions.map(d => d.category)))

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div 
        ref={scrollContainerRef}
        className={`absolute inset-0 overflow-y-auto overflow-x-hidden p-4 md:p-8 animate-in fade-in duration-500 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => isDragging && e.preventDefault()}
      >
        <div className="w-full max-w-full min-w-0 mx-auto">
          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
          
          <div className="mb-8 w-full">
            <h1 className="text-3xl font-black mb-1 truncate">Milestones & Records</h1>
            <p className="text-muted-foreground font-medium truncate">Celebrate your habit-building journey.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-12 w-full">
            <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-6 md:p-8 rounded-3xl relative overflow-hidden group hover:border-primary/50 transition-colors w-full min-w-0">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 scale-150 group-hover:scale-110 transition-transform duration-700 pointer-events-none"><Trophy size={200}/></div>
              <div className="relative z-10 w-full min-w-0">
                <div className="text-sm font-bold text-primary uppercase mb-2 flex items-center gap-2"><Trophy size={16}/> Most Completed Habit</div>
                {bestHabit ? (
                  <>
                    <div className="text-2xl md:text-3xl font-black mb-2 truncate w-full" title={bestHabit.title}>{bestHabit.title}</div>
                    <div className="text-muted-foreground font-medium truncate w-full">Completed {maxCompleted} times total.</div>
                  </>
                ) : (
                  <div className="text-muted-foreground italic mt-4 truncate w-full">Complete habits to unlock this record.</div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-6 md:p-8 rounded-3xl relative overflow-hidden group hover:border-blue-500/50 transition-colors w-full min-w-0">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 scale-150 group-hover:scale-110 transition-transform duration-700 pointer-events-none"><Clock size={200}/></div>
              <div className="relative z-10 w-full min-w-0">
                <div className="text-sm font-bold text-blue-500 uppercase mb-2 flex items-center gap-2"><Clock size={16}/> Most Dedicated Habit</div>
                {mostDedicatedHabit ? (
                  <>
                    <div className="text-2xl md:text-3xl font-black mb-2 truncate w-full" title={mostDedicatedHabit.title}>{mostDedicatedHabit.title}</div>
                    <div className="text-muted-foreground font-medium truncate w-full">Tracked for {(maxTime / 3600).toFixed(1)} hours total.</div>
                  </>
                ) : (
                  <div className="text-muted-foreground italic mt-4 truncate w-full">Use the timer to unlock this record.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-12 w-full">
            {categories.map(cat => {
              const catDefs = AchievementDefinitions.filter(d => d.category === cat)
              if (catDefs.length === 0) return null

              return (
                <div key={cat} className="mb-12 w-full overflow-hidden">
                  <h2 className="text-2xl font-black mb-6 uppercase tracking-wider text-primary border-b border-border/50 pb-2 truncate w-full">{cat} Badges</h2>
                  <div className="w-full relative">
                    <DraggableScroll className="flex gap-4 md:gap-6 overflow-x-auto pb-4 pt-2 scrollbar-custom w-full select-none">
                {catDefs.map(def => {
                  
                  // Find the maximum progress and highest unlocked stage across all contexts
                  let highestStageIndex = -1
                  let bestProgress = 0
                  
                  if (def.scope === 'global') {
                    bestProgress = def.evaluator(allMetrics[0] || {} as any, allMetrics)
                    for (let i = def.stages.length - 1; i >= 0; i--) {
                      if (unlockedKeys.has(`global_achiev:${def.id}:${def.stages[i].id}`)) {
                        highestStageIndex = i; break;
                      }
                    }
                  } else if (def.scope === 'category') {
                    // Just take max across all unique categories
                    const catGroups = new Set(allMetrics.map(m => m.categoryId))
                    Array.from(catGroups).forEach(cId => {
                      const cMetrics = allMetrics.filter(m => m.categoryId === cId)
                      const agg = { ...(cMetrics[0]), totalCompletions: cMetrics.reduce((s,m) => s + m.totalCompletions, 0) }
                      const prog = def.evaluator(agg)
                      if (prog > bestProgress) bestProgress = prog
                      for (let i = def.stages.length - 1; i >= 0; i--) {
                        if (unlockedKeys.has(`category_achiev:${cId}:${def.id}:${def.stages[i].id}`) && i > highestStageIndex) {
                          highestStageIndex = i;
                        }
                      }
                    })
                  } else {
                    allMetrics.forEach(m => {
                      const prog = def.evaluator(m)
                      if (prog > bestProgress) bestProgress = prog
                      for (let i = def.stages.length - 1; i >= 0; i--) {
                        if (unlockedKeys.has(`habit_achiev:${m.habitId}:${def.id}:${def.stages[i].id}`) && i > highestStageIndex) {
                          highestStageIndex = i;
                        }
                      }
                    })
                  }

                  const isUnlocked = highestStageIndex >= 0
                  const isSecret = def.isSecret && !isUnlocked

                  const currentStage = isUnlocked ? def.stages[highestStageIndex] : def.stages[0]
                  const nextStage = highestStageIndex < def.stages.length - 1 ? def.stages[highestStageIndex + 1] : null

                  const isKiseki = def.isKiseki || currentStage?.rarity === 'Kiseki'

                  return (
                    <div key={def.id} className={`w-[280px] md:w-[320px] shrink-0 group relative p-5 rounded-[1.5rem] border overflow-hidden transition-all duration-300 transform ${isUnlocked ? (isKiseki ? 'bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/50 shadow-[0_8px_30px_rgba(234,179,8,0.15)] hover:-translate-y-1.5' : 'bg-gradient-to-br from-card to-primary/5 border-primary/30 shadow-[0_8px_25px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_35px_rgba(0,100,255,0.1)] hover:-translate-y-1.5') : 'bg-muted/30 border-border/60 grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all'}`}>
                      {isUnlocked && <div className={`absolute -top-12 -right-12 w-32 h-32 blur-3xl -z-10 transition-opacity duration-500 ${isKiseki ? 'bg-yellow-500/40 group-hover:bg-yellow-500/60' : 'bg-primary/20 group-hover:bg-primary/40'}`}></div>}
                      
                      <div className="flex items-start gap-4 mb-4 relative z-10">
                        <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl filter transition-transform duration-500 group-hover:scale-110 ${isUnlocked ? (isKiseki ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg shadow-yellow-500/30' : 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30') : 'bg-accent/80 text-muted-foreground'}`}>
                          {isSecret ? '❓' : currentStage?.icon || '🏆'}
                        </div>
                        <div className="flex-1 mt-0.5">
                          <h3 className={`font-black text-lg leading-tight tracking-tight ${isKiseki && isUnlocked ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                            {isSecret ? 'Secret Achievement' : def.title}
                          </h3>
                          {isUnlocked && (
                            <div className={`mt-1.5 text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded inline-block shadow-sm ${isKiseki ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                              {currentStage.title}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-[13px] font-medium text-muted-foreground/90 mb-5 min-h-[40px] leading-relaxed relative z-10">
                        {isSecret ? 'Keep building your habits to discover this achievement.' : def.description}
                      </p>

                      {!isSecret && nextStage && (
                        <div className="mt-auto pt-4 border-t border-border/50 relative z-10">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-2.5">
                            <span className="text-muted-foreground">Next: {nextStage.title}</span>
                            <span className={isKiseki ? 'text-yellow-600 dark:text-yellow-400' : 'text-primary'}>{bestProgress} / {nextStage.threshold}</span>
                          </div>
                          <div className="h-2 bg-accent/60 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full transition-all duration-1000 ease-out relative ${isKiseki ? 'bg-yellow-500' : 'bg-gradient-to-r from-primary to-blue-500'}`} style={{ width: `${Math.min(100, Math.max(0, (bestProgress / nextStage.threshold) * 100))}%` }}>
                              <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!isSecret && !nextStage && isUnlocked && (
                        <div className="mt-auto pt-4 border-t border-border/50 relative z-10">
                          <div className={`text-center text-[10px] font-black uppercase tracking-[0.2em] py-1.5 rounded ${isKiseki ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10' : 'text-primary bg-primary/10'}`}>
                            Maximum Stage Reached
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </DraggableScroll>
              </div>
            </div>
          )
        })}
      </div>
      </div>
    </div>
    </div>
  )
}

