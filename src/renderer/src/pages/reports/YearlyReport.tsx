import { useState, useEffect, useRef } from 'react'
import { Calendar as CalendarIcon, Sparkles, Loader2, Music, TrendingUp, Award, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

let globalState = {
  aiLoading: false,
  aiSummary: null as string | null
}

export default function YearlyReport() {
  const [loading, setLoading] = useState(true)
  const [yearOffset, setYearOffset] = useState(0) // 0 = current year, -1 = last year
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const [stats, setStats] = useState({
    records: 0, journal: 0, goals: 0, certificates: 0, projects: 0, skills: 0, photos: 0
  })
  
  const [monthlyData, setMonthlyData] = useState<{month: string, count: number}[]>([])
  const [bestMonth, setBestMonth] = useState({ name: '', count: 0 })
  
  const [aiSummary, setAiSummary] = useState<string | null>(globalState.aiSummary)
  const [aiLoading, setAiLoading] = useState(globalState.aiLoading)

  const isMounted = useRef(true)

  const getTargetYear = () => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + yearOffset)
    return d.getFullYear()
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const year = getTargetYear()
      const startOfYear = new Date(year, 0, 1).getTime()
      const endOfYear = new Date(year, 11, 31, 23, 59, 59).getTime()

      // @ts-ignore
      const records = await window.api.db.find('records', {})
      // @ts-ignore
      const journals = await window.api.db.find('journal', {})
      // @ts-ignore
      const goals = await window.api.db.find('goals', {})
      // @ts-ignore
      const projects = await window.api.db.find('projects', {})
      // @ts-ignore
      const certificates = await window.api.db.find('certificates', {})
      // @ts-ignore
      const skills = await window.api.db.find('skills', {})

      // Filter for this year
      const yRecords = records.filter((r: any) => r.createdAt >= startOfYear && r.createdAt <= endOfYear)
      const yJournals = journals.filter((j: any) => j.createdAt >= startOfYear && j.createdAt <= endOfYear)
      const yGoals = goals.filter((g: any) => g.status === 'Completed' && g.updatedAt >= startOfYear && g.updatedAt <= endOfYear)
      const yProjects = projects.filter((p: any) => new Date(p.startDate).getTime() >= startOfYear && new Date(p.startDate).getTime() <= endOfYear)
      const yCertificates = certificates.filter((c: any) => new Date(c.issueDate).getTime() >= startOfYear && new Date(c.issueDate).getTime() <= endOfYear)
      const ySkills = skills.filter((s: any) => s.createdAt >= startOfYear && s.createdAt <= endOfYear)
      
      const yPhotos = yRecords.reduce((acc: number, r: any) => acc + (r.attachments?.length || 0), 0)

      setStats({
        records: yRecords.length,
        journal: yJournals.length,
        goals: yGoals.length,
        projects: yProjects.length,
        certificates: yCertificates.length,
        skills: ySkills.length,
        photos: yPhotos
      })

      // Monthly breakdown
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const mData: any[] = []
      let bMonth = { name: '', count: -1 }

      for(let i = 0; i < 12; i++) {
        const mStart = new Date(year, i, 1).getTime()
        const mEnd = new Date(year, i + 1, 0, 23, 59, 59).getTime()
        const mCount = yRecords.filter((r: any) => r.createdAt >= mStart && r.createdAt <= mEnd).length +
                       yJournals.filter((j: any) => j.createdAt >= mStart && j.createdAt <= mEnd).length
        
        mData.push({ month: months[i], count: mCount })
        if (mCount > bMonth.count) {
          bMonth = { name: months[i], count: mCount }
        }
      }

      setMonthlyData(mData)
      setBestMonth(bMonth)

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
  }, [yearOffset])

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

    const prompt = `Generate a 2-3 paragraph "Year in Review" (Spotify Wrapped style) for my life based on these stats for ${getTargetYear()}:
    - Records Added: ${stats.records}
    - Journal Entries: ${stats.journal}
    - Goals Completed: ${stats.goals}
    - New Projects: ${stats.projects}
    - Certificates Earned: ${stats.certificates}
    - New Skills Learned: ${stats.skills}
    - Most Productive Month: ${bestMonth.name} (${bestMonth.count} activities)
    
    Make it celebratory, reflective, and highlight my growth. Do not use formatting like markdown bold or bullet points.`

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

  const year = getTargetYear()

  return (
    <div 
      ref={scrollContainerRef}
      className={`h-full overflow-y-auto p-8 animate-in fade-in duration-500 bg-gradient-to-b from-background to-background/50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-4 text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
            <Music className="text-primary" size={36} /> 
            {year} Wrapped
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">A look back at your incredible year of growth.</p>
        </div>
        <div className="flex items-center gap-4 bg-card/80 backdrop-blur border border-border p-2 rounded-xl shadow-sm">
          <button onClick={() => setYearOffset(prev => prev - 1)} className="px-3 py-1.5 hover:bg-accent rounded-lg text-sm font-medium">Previous</button>
          <span className="font-black text-xl w-24 text-center">{year}</span>
          <button onClick={() => setYearOffset(prev => prev + 1)} disabled={yearOffset === 0} className="px-3 py-1.5 hover:bg-accent rounded-lg text-sm font-medium disabled:opacity-30">Next</button>
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="mb-12 relative overflow-hidden bg-gradient-to-tr from-purple-500/20 via-primary/10 to-background border border-primary/30 p-8 rounded-3xl shadow-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles size={160} />
        </div>
        <div className="flex justify-between items-start mb-6 relative z-10">
          <h2 className="text-2xl font-black flex items-center gap-2 text-foreground">
            <Sparkles size={24} className="text-primary"/> AI Year Reflection
          </h2>
          {!aiSummary && !aiLoading && (
            <button onClick={generateAISummary} className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-primary/20">
              <Sparkles size={18}/> Generate Reflection
            </button>
          )}
        </div>
        
        {aiLoading ? (
          <div className="flex items-center justify-center gap-3 text-muted-foreground py-8"><Loader2 size={24} className="animate-spin text-primary"/> Analyzing 365 days of data...</div>
        ) : aiSummary ? (
          <div className="prose prose-invert prose-lg max-w-none text-foreground/90 relative z-10">
            {aiSummary.split('\n').map((para, i) => <p key={i} className="leading-relaxed">{para}</p>)}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-lg text-muted-foreground relative z-10 font-medium">Generate an AI summary to get a personalized story of your year.</p>
          </div>
        )}
      </div>

      {/* Big Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 p-6 rounded-3xl text-center flex flex-col items-center justify-center hover:scale-105 transition-transform">
          <div className="text-5xl font-black text-blue-500 mb-2">{stats.records}</div>
          <div className="text-sm font-bold text-blue-500/70 uppercase tracking-widest">Total Records</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 p-6 rounded-3xl text-center flex flex-col items-center justify-center hover:scale-105 transition-transform">
          <div className="text-5xl font-black text-orange-500 mb-2">{stats.journal}</div>
          <div className="text-sm font-bold text-orange-500/70 uppercase tracking-widest">Journal Entries</div>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 p-6 rounded-3xl text-center flex flex-col items-center justify-center hover:scale-105 transition-transform">
          <div className="text-5xl font-black text-red-500 mb-2">{stats.goals}</div>
          <div className="text-sm font-bold text-red-500/70 uppercase tracking-widest">Goals Completed</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 p-6 rounded-3xl text-center flex flex-col items-center justify-center hover:scale-105 transition-transform">
          <div className="text-5xl font-black text-purple-500 mb-2">{stats.skills}</div>
          <div className="text-sm font-bold text-purple-500/70 uppercase tracking-widest">Skills Learned</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Monthly Activity Area Chart */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-3xl shadow-sm">
          <h3 className="text-xl font-black flex items-center gap-2 mb-6">
            <TrendingUp className="text-primary"/> Activity Across the Year
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', color: 'hsl(var(--foreground))', padding: '12px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Highlights Side Column */}
        <div className="space-y-6">
          <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Award className="text-yellow-500" size={32}/>
            </div>
            <div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Best Month</div>
              <div className="text-2xl font-black">{bestMonth.name}</div>
              <div className="text-sm text-foreground/70">{bestMonth.count} activities logged</div>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center shrink-0">
              <Zap className="text-pink-500" size={32}/>
            </div>
            <div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Projects</div>
              <div className="text-2xl font-black">{stats.projects}</div>
              <div className="text-sm text-foreground/70">Major initiatives started</div>
            </div>
          </div>
          
          <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Award className="text-green-500" size={32}/>
            </div>
            <div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Certificates</div>
              <div className="text-2xl font-black">{stats.certificates}</div>
              <div className="text-sm text-foreground/70">New qualifications earned</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
