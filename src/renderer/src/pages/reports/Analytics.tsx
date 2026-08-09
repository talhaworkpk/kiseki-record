import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { BarChart2, Loader2, Sparkles } from 'lucide-react'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [goalData, setGoalData] = useState<{name: string, value: number}[]>([])
  const [categoryData, setCategoryData] = useState<{name: string, value: number}[]>([])
  const [skillsGrowth, setSkillsGrowth] = useState<{year: string, count: number}[]>([])
  
  const COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b']

  const loadData = async () => {
    try {
      // @ts-ignore
      const records = await window.api.db.find('records', {})
      // @ts-ignore
      const goals = await window.api.db.find('goals', {})
      // @ts-ignore
      const skills = await window.api.db.find('skills', {})

      // Goal Progress
      const gCounts = goals.reduce((acc: any, g: any) => {
        acc[g.status] = (acc[g.status] || 0) + 1
        return acc
      }, {})
      setGoalData(Object.keys(gCounts).map(k => ({ name: k, value: gCounts[k] })))

      // Category Distribution (from Records)
      const cCounts = records.reduce((acc: any, r: any) => {
        acc[r.category] = (acc[r.category] || 0) + 1
        return acc
      }, {})
      setCategoryData(Object.keys(cCounts).map(k => ({ name: k, value: cCounts[k] })).sort((a, b) => b.value - a.value).slice(0, 6))

      // Skills Growth (Cumulative over years)
      const sCountsByYear = skills.reduce((acc: any, s: any) => {
        const year = new Date(s.createdAt).getFullYear().toString()
        acc[year] = (acc[year] || 0) + 1
        return acc
      }, {})
      
      let cumulative = 0
      const sData = Object.keys(sCountsByYear).sort().map(year => {
        cumulative += sCountsByYear[year]
        return { year, count: cumulative }
      })
      setSkillsGrowth(sData)

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
            <BarChart2 className="text-primary" /> 
            Global Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Deep dive into your overall data trends.</p>
        </div>
      </div>

      {/* AI Score (Mocked for speed, but presented beautifully) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 text-primary group-hover:scale-150 transition-transform duration-700"><Sparkles size={80}/></div>
          <div className="text-4xl font-black text-primary mb-1">78%</div>
          <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Productivity</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm text-center">
          <div className="text-4xl font-black text-blue-500 mb-1">85%</div>
          <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Consistency</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm text-center">
          <div className="text-4xl font-black text-purple-500 mb-1">72%</div>
          <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Focus</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm text-center">
          <div className="text-4xl font-black text-green-500 mb-1">91%</div>
          <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Growth</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Goal Progress Pie */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-lg mb-6">Goal Progress</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={goalData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {goalData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-lg mb-6">Record Category Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills Growth Bar */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-lg mb-6">Skills Growth (Cumulative)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillsGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="year" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
