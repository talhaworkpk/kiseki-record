import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { LineChart as LineChartIcon, Activity, TrendingUp, Briefcase } from 'lucide-react'
import { JobRecord, SkillRecord, ProjectRecord } from '../../types'

export default function CareerAnalytics() {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [skills, setSkills] = useState<SkillRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])

  const loadData = async () => {
    try {
      // @ts-ignore
      setJobs(await window.api.db.find('career', {}))
      // @ts-ignore
      setSkills(await window.api.db.find('skills', {}))
      // @ts-ignore
      setProjects(await window.api.db.find('projects', {}))
    } catch (err) { console.error(err) }
  }

  useEffect(() => { loadData() }, [])

  // Most Used Technologies (from Projects and Jobs)
  const techCounts = [...projects.flatMap(p => p.technologies || []), ...jobs.flatMap(j => j.skillsUsed || [])]
    .reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  
  const techData = Object.keys(techCounts)
    .map(name => ({ name, count: techCounts[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Experience Growth over years (Projects started per year)
  const projByYear = projects.reduce((acc, p) => {
    const year = new Date(p.startDate).getFullYear().toString()
    acc[year] = (acc[year] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const projData = Object.keys(projByYear)
    .sort()
    .map(year => ({ year, count: projByYear[year] }))

  return (
    <div className="h-full overflow-y-auto p-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <LineChartIcon className="text-primary" /> 
          Career Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Insights into your professional growth and skills usage.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Briefcase size={20} className="text-blue-500"/>
            <span className="font-medium">Companies Worked</span>
          </div>
          <div className="text-4xl font-bold">{new Set(jobs.map(j => j.company)).size}</div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <TrendingUp size={20} className="text-purple-500"/>
            <span className="font-medium">Avg Proficiency</span>
          </div>
          <div className="text-4xl font-bold">
            {skills.length > 0 ? Math.round(skills.reduce((acc, s) => acc + s.level, 0) / skills.length) : 0}%
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Activity size={20} className="text-pink-500"/>
            <span className="font-medium">Most Used Tech</span>
          </div>
          <div className="text-2xl font-bold truncate">{techData[0]?.name || 'N/A'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Tech Stack Distribution */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold mb-4">Most Used Technologies</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={techData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Activity */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold mb-4">Projects Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="year" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, fill: '#ec4899' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
