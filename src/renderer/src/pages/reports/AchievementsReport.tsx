import { useState, useEffect, useRef } from 'react'
import { Award, CheckCircle2, Lock, Loader2, Trophy, Star, Shield } from 'lucide-react'

type Milestone = {
  id: string
  title: string
  description: string
  target: number
  current: number
  unlocked: boolean
  icon: any
  color: string
}

export default function AchievementsReport() {
  const [loading, setLoading] = useState(true)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      // @ts-ignore
      const records = await window.api.db.find('records', {})
      // @ts-ignore
      const journals = await window.api.db.find('journal', {})
      // @ts-ignore
      const goals = await window.api.db.find('goals', {})
      // @ts-ignore
      const certificates = await window.api.db.find('certificates', {})
      // @ts-ignore
      const skills = await window.api.db.find('skills', {})
      // @ts-ignore
      const projects = await window.api.db.find('projects', {})
      // @ts-ignore
      const unlocks = await window.api.db.find('systemUnlocks', {})
      const unlockMap = new Set(unlocks.map((u: any) => u.key))

      const rCount = records.length
      const jCount = journals.length
      const gCount = goals.filter((g: any) => g.status === 'Completed').length
      const cCount = certificates.length
      const sCount = skills.length
      const pCount = projects.length
      
      // Calculate streak from journal for the display counter
      let currentStreak = 0
      const dates = journals.map((j: any) => {
        const d = new Date(j.createdAt)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      }).sort((a: number, b: number) => b - a)
      if (dates.length > 0) {
        const uniqueDates = Array.from(new Set(dates))
        currentStreak = 1
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const diff = (uniqueDates[i] as number - (uniqueDates[i+1] as number)) / (1000 * 60 * 60 * 24)
          if (Math.round(diff) === 1) currentStreak++
          else break
        }
      }

      const ms: Milestone[] = [
        // Records
        { id: 'achievement:1-record', title: 'First Record', description: 'Create your first record.', target: 1, current: rCount, unlocked: unlockMap.has('achievement:1-record') || rCount >= 1, icon: Star, color: 'text-blue-500' },
        { id: 'achievement:100-records', title: 'Centurion', description: 'Create 100 records.', target: 100, current: rCount, unlocked: unlockMap.has('achievement:100-records') || rCount >= 100, icon: Shield, color: 'text-blue-600' },
        { id: 'achievement:365-records', title: 'A Year of Life', description: 'Create 365 records.', target: 365, current: rCount, unlocked: unlockMap.has('achievement:365-records') || rCount >= 365, icon: Trophy, color: 'text-blue-700' },
        
        // Journals
        { id: 'achievement:100-journals', title: '100 Journal Entries', description: '100 moments captured.', target: 100, current: jCount, unlocked: unlockMap.has('achievement:100-journals'), icon: BookIcon, color: 'text-orange-500' },
        { id: 'achievement:7-day-streak', title: '7-Day Streak', description: 'You showed up for 7 days in a row.', target: 7, current: currentStreak, unlocked: unlockMap.has('achievement:7-day-streak'), icon: Star, color: 'text-orange-600' },
        
        // Goals
        { id: 'achievement:10-goals', title: '10 Completed Goals', description: '10 goals completed.', target: 10, current: gCount, unlocked: unlockMap.has('achievement:10-goals'), icon: Trophy, color: 'text-red-600' },
        
        // Career/Skills
        { id: 'achievement:first-certificate', title: 'First Certificate', description: 'You recorded your first certificate.', target: 1, current: cCount, unlocked: unlockMap.has('achievement:first-certificate'), icon: Star, color: 'text-green-500' },
        { id: 'achievement:10-certificates', title: 'Lifelong Learner', description: 'Earn 10 certificates.', target: 10, current: cCount, unlocked: unlockMap.has('achievement:10-certificates') || cCount >= 10, icon: Trophy, color: 'text-green-600' },
      ]

      setMilestones(ms)
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

  const unlockedCount = milestones.filter(m => m.unlocked).length
  const progressPercent = Math.round((unlockedCount / milestones.length) * 100)

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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Award className="text-yellow-500" /> 
            Milestones Tracker
          </h1>
          <p className="text-muted-foreground mt-1">Automatically tracked achievements based on your activity.</p>
        </div>
      </div>

      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm mb-8 flex items-center gap-6">
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path className="text-accent" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
            <path className="text-yellow-500 transition-all duration-1000 ease-out" strokeDasharray={`${progressPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-foreground">{unlockedCount}/{milestones.length}</span>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black mb-1">Global Completion</h2>
          <p className="text-muted-foreground">You have unlocked {progressPercent}% of all automated milestones.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {milestones.map(m => (
          <div key={m.id} className={`p-6 rounded-2xl border transition-all ${m.unlocked ? 'bg-card border-border shadow-sm hover:border-yellow-500/50' : 'bg-background border-dashed border-border opacity-70 grayscale'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${m.unlocked ? 'bg-accent ' + m.color : 'bg-accent/50 text-muted-foreground'}`}>
                <m.icon size={24} />
              </div>
              {m.unlocked ? (
                <div className="text-yellow-500 flex items-center gap-1 text-sm font-bold bg-yellow-500/10 px-2 py-1 rounded-md"><CheckCircle2 size={16}/> Unlocked</div>
              ) : (
                <div className="text-muted-foreground flex items-center gap-1 text-sm font-bold"><Lock size={16}/> Locked</div>
              )}
            </div>
            <h3 className="text-lg font-bold mb-1 text-foreground">{m.title}</h3>
            <p className="text-sm text-muted-foreground mb-4 h-10">{m.description}</p>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className={m.unlocked ? 'text-primary' : 'text-muted-foreground'}>{m.current >= m.target ? m.target : m.current}</span>
                <span className="text-muted-foreground">{m.target}</span>
              </div>
              <div className="w-full bg-accent rounded-full h-1.5 overflow-hidden">
                <div className={`h-full ${m.unlocked ? 'bg-yellow-500' : 'bg-primary'}`} style={{ width: `${Math.min((m.current / m.target) * 100, 100)}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BookIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
}
