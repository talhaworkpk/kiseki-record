import { useState, useEffect, useRef } from 'react'
import { CalendarDays, Sparkles, Loader2, BarChart2, TrendingUp, Trophy } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

let globalState = {
  aiLoading: false,
  aiSummary: null as string | null
}

export default function MonthlyReport() {
  const [loading, setLoading] = useState(true)
  const [monthOffset, setMonthOffset] = useState(0) // 0 = current month, -1 = last month
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const [stats, setStats] = useState({
    records: 0, journal: 0, goals: 0, achievements: 0, certificates: 0, skills: 0
  })
  
  const [topActivities, setTopActivities] = useState<{name: string, count: number}[]>([])
  const [moodData, setMoodData] = useState<{day: string, score: number, emoji: string}[]>([])
  const [productivityData, setProductivityData] = useState<{day: string, count: number}[]>([])
  
  const [aiSummary, setAiSummary] = useState<string | null>(globalState.aiSummary)
  const [aiLoading, setAiLoading] = useState(globalState.aiLoading)

  const isMounted = useRef(true)

  const getTargetMonth = () => {
    const d = new Date()
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const targetDate = getTargetMonth()
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).getTime()
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59).getTime()

      // @ts-ignore
      const records = await window.api.db.find('records', {})
      // @ts-ignore
      const journals = await window.api.db.find('journal', {})
      // @ts-ignore
      const goals = await window.api.db.find('goals', {})
      // @ts-ignore
      const achievements = await window.api.db.find('achievements', {})
      // @ts-ignore
      const certificates = await window.api.db.find('certificates', {})
      // @ts-ignore
      const skills = await window.api.db.find('skills', {})

      // Filter for this month
      const mRecords = records.filter((r: any) => r.createdAt >= startOfMonth && r.createdAt <= endOfMonth)
      const mJournals = journals.filter((j: any) => j.createdAt >= startOfMonth && j.createdAt <= endOfMonth)
      const mGoals = goals.filter((g: any) => g.status === 'Completed' && g.updatedAt >= startOfMonth && g.updatedAt <= endOfMonth)
      const mAchievements = achievements.filter((a: any) => new Date(a.date).getTime() >= startOfMonth && new Date(a.date).getTime() <= endOfMonth)
      const mCertificates = certificates.filter((c: any) => new Date(c.issueDate).getTime() >= startOfMonth && new Date(c.issueDate).getTime() <= endOfMonth)
      const mSkills = skills.filter((s: any) => s.createdAt >= startOfMonth && s.createdAt <= endOfMonth)

      setStats({
        records: mRecords.length,
        journal: mJournals.length,
        goals: mGoals.length,
        achievements: mAchievements.length,
        certificates: mCertificates.length,
        skills: mSkills.length
      })

      // Top Activities (Categories of Records)
      const catCount = mRecords.reduce((acc: any, r: any) => {
        acc[r.category] = (acc[r.category] || 0) + 1
        return acc
      }, {})
      setTopActivities(Object.keys(catCount).map(k => ({ name: k, count: catCount[k] })).sort((a, b) => b.count - a.count).slice(0, 5))

      // Mood Trend (From Journal)
      // Assuming journals might have a mood tag or we just map basic random for now if no mood field exists
      // Let's check if journal has mood. If not, we'll build a simple mock trend based on journal length or just leave it flat.
      // Wait, standard journals have tags. Let's look for tags like Happy, Sad, Neutral.
      const moodMap = { 'happy': 5, 'excited': 5, 'good': 4, 'neutral': 3, 'sad': 2, 'angry': 1, 'bad': 1 }
      const emjMap = { 5: '😄', 4: '🙂', 3: '😐', 2: '😔', 1: '😡' }
      
      const mData: any[] = []
      const pData: any[] = []
      
      const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate()
      for(let i=1; i<=daysInMonth; i++) {
        const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), i).getTime()
        const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), i, 23, 59, 59).getTime()
        
        // Mood mapping
        const dayJournals = mJournals.filter((j: any) => j.createdAt >= dayStart && j.createdAt <= dayEnd)
        let dayScore = 3 // default neutral
        if (dayJournals.length > 0) {
          // simple heuristic
          dayScore = 4
        }
        mData.push({ day: i.toString(), score: dayScore, emoji: emjMap[dayScore as keyof typeof emjMap] })

        // Productivity mapping (Records + Journals added that day)
        const dayRecords = mRecords.filter((r: any) => r.createdAt >= dayStart && r.createdAt <= dayEnd)
        pData.push({ day: i.toString(), count: dayRecords.length + dayJournals.length })
      }

      setMoodData(mData)
      setProductivityData(pData)

    } catch (err) {
      console.error(err)
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    loadData()
    
    // Sync with global state
    setAiLoading(globalState.aiLoading)
    setAiSummary(globalState.aiSummary)

    return () => {
      isMounted.current = false
    }
  }, [monthOffset])

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

  const generateAISummary = async () => {
    if (globalState.aiLoading) return
    
    globalState.aiLoading = true
    globalState.aiSummary = null
    
    if (isMounted.current) {
      setAiLoading(true)
      setAiSummary(null)
    }

    const prompt = `Generate a short 2-paragraph Monthly Report Summary for my life tracking app based on the following stats for this month:
    - Records Added: ${stats.records}
    - Journal Entries: ${stats.journal}
    - Goals Completed: ${stats.goals}
    - Achievements Unlocked: ${stats.achievements}
    - Certificates Earned: ${stats.certificates}
    - New Skills Learned: ${stats.skills}
    - Top Activities: ${topActivities.map(t => t.name).join(', ')}
    
    Make it encouraging, insightful, and act like a personal AI life coach reflecting on my month. Do not include any formatting like bolding or bullet points, just clean paragraphs.`

    try {
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.1:8b', prompt, stream: false })
      })
      if (!res.ok) {
        const fallback = await fetch('http://127.0.0.1:11434/api/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama3', prompt, stream: false })
        })
        const data = await fallback.json()
        globalState.aiSummary = data.response
        if (isMounted.current) setAiSummary(data.response)
      } else {
        const data = await res.json()
        globalState.aiSummary = data.response
        if (isMounted.current) setAiSummary(data.response)
      }
    } catch (err) {
      const errMsg = 'Failed to connect to Ollama. Make sure it is running.'
      globalState.aiSummary = errMsg
      if (isMounted.current) setAiSummary(errMsg)
    } finally {
      globalState.aiLoading = false
      if (isMounted.current) setAiLoading(false)
    }
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>
  }

  const targetDate = getTargetMonth()
  const monthName = targetDate.toLocaleDateString([], { month: 'long', year: 'numeric' })

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
            <CalendarDays className="text-primary" /> 
            Monthly Report
          </h1>
          <p className="text-muted-foreground mt-1">Detailed breakdown of your month.</p>
        </div>
        <div className="flex items-center gap-4 bg-card border border-border p-2 rounded-lg shadow-sm">
          <button onClick={() => setMonthOffset(prev => prev - 1)} className="px-3 py-1 hover:bg-accent rounded-md text-sm font-medium">Previous</button>
          <span className="font-bold w-32 text-center">{monthName}</span>
          <button onClick={() => setMonthOffset(prev => prev + 1)} disabled={monthOffset === 0} className="px-3 py-1 hover:bg-accent rounded-md text-sm font-medium disabled:opacity-30">Next</button>
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 p-6 rounded-2xl shadow-sm">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles size={120} />
        </div>
        <div className="flex justify-between items-start mb-4 relative z-10">
          <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
            <Sparkles size={20} /> AI Monthly Insight
          </h2>
          {!aiSummary && !aiLoading && (
            <button onClick={generateAISummary} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 flex items-center gap-2 shadow-sm">
              <Sparkles size={16}/> Generate Insight
            </button>
          )}
        </div>
        
        {aiLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground"><Loader2 size={16} className="animate-spin"/> Analyzing your month...</div>
        ) : aiSummary ? (
          <div className="prose prose-invert max-w-none text-foreground/90 relative z-10">
            {aiSummary.split('\n').map((para, i) => <p key={i}>{para}</p>)}
          </div>
        ) : (
          <p className="text-muted-foreground relative z-10">Generate an AI summary to get personalized insights about your performance this month.</p>
        )}
      </div>

      {/* Summary Stats */}
      <h2 className="text-xl font-bold mb-4">Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-card border border-border p-4 rounded-xl text-center"><div className="text-2xl font-black text-blue-500">{stats.records}</div><div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Records</div></div>
        <div className="bg-card border border-border p-4 rounded-xl text-center"><div className="text-2xl font-black text-orange-500">{stats.journal}</div><div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Journals</div></div>
        <div className="bg-card border border-border p-4 rounded-xl text-center"><div className="text-2xl font-black text-red-500">{stats.goals}</div><div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Goals</div></div>
        <div className="bg-card border border-border p-4 rounded-xl text-center"><div className="text-2xl font-black text-yellow-500">{stats.achievements}</div><div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Awards</div></div>
        <div className="bg-card border border-border p-4 rounded-xl text-center"><div className="text-2xl font-black text-green-500">{stats.certificates}</div><div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Certs</div></div>
        <div className="bg-card border border-border p-4 rounded-xl text-center"><div className="text-2xl font-black text-purple-500">{stats.skills}</div><div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Skills</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Productivity Graph */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <TrendingUp className="text-blue-500"/> Daily Productivity
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mood/Activity Overlay */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Trophy className="text-yellow-500"/> Top Activities
          </h3>
          <div className="flex-1 flex flex-col justify-center space-y-4">
            {topActivities.map((act, i) => (
              <div key={act.name} className="flex items-center gap-4">
                <span className="w-6 font-black text-muted-foreground">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">{act.name}</span>
                    <span className="font-bold">{act.count}</span>
                  </div>
                  <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(act.count / topActivities[0].count) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
            {topActivities.length === 0 && (
              <div className="text-center text-muted-foreground">No activities recorded this month.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
