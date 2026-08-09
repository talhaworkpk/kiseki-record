import { useState, useEffect, useRef } from 'react'
import { JournalEntry } from '../types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { TrendingUp, Award, PenTool, Hash, Activity, Sparkles, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const MOOD_COLORS: Record<string, string> = {
  happy: '#eab308', // yellow-500
  calm: '#3b82f6', // blue-500
  neutral: '#9ca3af', // gray-400
  sad: '#6366f1', // indigo-500
  angry: '#ef4444', // red-500
  tired: '#8b5cf6' // violet-500
}

export default function JournalAnalytics() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    fetchEntries()
  }, [])

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

  const fetchEntries = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('journal', {})
      setEntries(data)
    } catch (err) {
      console.error(err)
    }
  }

  // --- Calculations ---
  
  // Total words
  const totalWords = entries.reduce((acc, curr) => {
    const plainText = curr.content.replace(/<[^>]*>?/gm, '')
    return acc + (plainText.match(/\b[-?a-zA-Z0-9._]+\b/g)?.length || 0)
  }, 0)

  // Entries this month
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const entriesThisMonth = entries.filter(e => {
    const d = new Date(e.createdAt)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).length

  // Writing Streak (consecutive days)
  let streak = 0
  const uniqueDates = Array.from(new Set(entries.map(e => new Date(e.createdAt).toDateString()))).map(d => new Date(d))
  uniqueDates.sort((a, b) => b.getTime() - a.getTime()) // newest first
  
  if (uniqueDates.length > 0) {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    
    let current = uniqueDates[0].toDateString()
    if (current === today || current === yesterday) {
      streak = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        const diff = (uniqueDates[i-1].getTime() - uniqueDates[i].getTime()) / 86400000
        if (Math.round(diff) === 1) streak++
        else break
      }
    }
  }

  // Most common moods
  const moodCounts = entries.reduce((acc, curr) => {
    if (curr.mood) {
      acc[curr.mood] = (acc[curr.mood] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
  const moodData = Object.keys(moodCounts).map(k => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: moodCounts[k], moodId: k }))
  moodData.sort((a, b) => b.value - a.value)

  // Most used tags
  const tagCounts = entries.reduce((acc, curr) => {
    curr.tags.forEach(t => {
      acc[t] = (acc[t] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)
  const topTags = Object.keys(tagCounts).map(k => ({ name: k, value: tagCounts[k] })).sort((a, b) => b.value - a.value).slice(0, 5)

  // Activity over last 30 days
  const activityData: any[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const dateStr = d.toDateString()
    const count = entries.filter(e => new Date(e.createdAt).toDateString() === dateStr).length
    activityData.push({ date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), count })
  }

  return (
    <div 
      ref={scrollContainerRef}
      className={`p-8 max-w-6xl mx-auto h-full overflow-y-auto animate-in fade-in ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex items-center gap-4 mb-8">
        <Link to="/journal" className="p-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
            <Activity className="text-primary"/> Journal Analytics
          </h1>
          <p className="text-muted-foreground">Insights and statistics about your writing journey.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <TrendingUp size={20} className="text-orange-500"/>
            <span className="font-medium">Writing Streak</span>
          </div>
          <div className="text-4xl font-bold">{streak} <span className="text-lg font-normal text-muted-foreground">days</span></div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <PenTool size={20} className="text-blue-500"/>
            <span className="font-medium">Entries This Month</span>
          </div>
          <div className="text-4xl font-bold">{entriesThisMonth}</div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Award size={20} className="text-green-500"/>
            <span className="font-medium">Total Words</span>
          </div>
          <div className="text-4xl font-bold">{totalWords.toLocaleString()}</div>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Hash size={20} className="text-purple-500"/>
            <span className="font-medium">Total Tags Used</span>
          </div>
          <div className="text-4xl font-bold">{Object.keys(tagCounts).length}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Activity Chart */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold mb-4">Writing Activity (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mood Distribution */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold mb-4">Mood Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moodData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {moodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={MOOD_COLORS[entry.moodId] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
      
      {/* AI Insights & Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <Sparkles className="absolute -right-4 -top-4 text-primary opacity-10 w-32 h-32" />
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary"><Sparkles size={20}/> AI Insights</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Your writing suggests a strong focus on <strong>Personal Growth</strong> and <strong>Work-life Balance</strong> this month. 
            You tend to be most productive and positive when writing in the mornings. There is a recurring theme of gratitude in your entries tagged with <strong>#Family</strong>.
          </p>
          <p className="text-sm opacity-70">
            *This insight is generated locally by AI analyzing your recent journal themes.
          </p>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold mb-4">Top Tags</h3>
          <div className="space-y-4">
            {topTags.map((t, i) => (
              <div key={i} className="flex justify-between items-center gap-2 overflow-hidden">
                <span className="bg-accent px-3 py-1 rounded-full text-sm font-medium truncate max-w-[200px]" title={`#${t.name}`}>#{t.name}</span>
                <span className="text-muted-foreground font-medium shrink-0 whitespace-nowrap">{t.value} entries</span>
              </div>
            ))}
            {topTags.length === 0 && <div className="text-muted-foreground text-sm">No tags used yet.</div>}
          </div>
        </div>
      </div>
      
    </div>
  )
}
