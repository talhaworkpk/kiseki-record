import React from 'react'
import { Target, Zap, Book, Users, FileText } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export function SummaryWidget({ data }: any) {
  const records = data.records || []
  const goals = data.goals || []
  const habits = data.habits || []
  const journal = data.journal || []
  const relationships = data.relationships || []

  const habitsDone = habits.filter((h:any)=>h.completedToday).length
  const habitsLeft = habits.length - habitsDone
  
  // Calculate Progress %
  const progressPct = habits.length === 0 ? 0 : Math.round((habitsDone / habits.length) * 100)

  // Calculate Streak based on consecutive journal entries
  const getStreak = () => {
    if (journal.length === 0) return 0
    let streak = 0
    const today = new Date().setHours(0,0,0,0)
    // @ts-ignore
    const dates = journal.map((j:any) => new Date(j.createdAt).setHours(0,0,0,0)).sort((a,b) => b - a)
    let currentCheck = today
    
    if (dates[0] !== today && dates[0] !== today - 86400000) {
      return 0
    }
    
    const uniqueDates = [...new Set(dates)]
    for (let i = 0; i < uniqueDates.length; i++) {
      if (uniqueDates[i] === currentCheck || (i === 0 && uniqueDates[0] === currentCheck - 86400000)) {
        streak++
        currentCheck = (uniqueDates[i] as number) - 86400000
      } else {
        break
      }
    }
    return streak
  }
  const currentStreak = getStreak()

  const lifeScore = Math.min(100, Math.round(
    (goals.filter((g:any)=>g.status === 'Completed').length * 5) + 
    (habitsDone * 2) + 
    (journal.length * 3) + 
    (relationships.length * 2)
  )) || 0

  const renderSparkline = (dataArr: any[], color: string) => {
    // Generate real sparkline data based on item creation dates over last 7 days
    let chartData = Array(7).fill(0).map(() => ({ value: 0 }))
    if (dataArr && dataArr.length > 0) {
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000
      
      chartData = Array(7).fill(0).map((_, i) => {
        const targetDay = now - ((6 - i) * dayMs)
        const count = dataArr.filter(item => {
          const itemDate = item.createdAt || item.updatedAt || Date.now()
          return Math.abs(itemDate - targetDay) < dayMs
        }).length
        return { value: count }
      })
    }
    
    // Add small minimum variation so sparkline isn't a single 0 line if all 0
    const hasData = chartData.some(d => d.value > 0)
    if (!hasData) chartData = chartData.map(() => ({ value: 1 }))

    return (
      <div className="h-10 w-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const getWeekTrend = (arr: any[]) => {
    if (!arr || arr.length === 0) return '+0 This Week'
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const thisWeek = arr.filter(i => (i.createdAt || i.updatedAt || now) > now - weekMs).length
    return `+${thisWeek} This Week`
  }

  return (
    <div className="p-6 bg-card rounded-2xl border border-border flex flex-col xl:flex-row gap-8 shadow-sm">
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-4">Today's Progress</h2>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }}></div>
          </div>
          <div className="flex justify-between items-center mt-3 text-sm font-bold">
            <span className="text-muted-foreground">{habitsDone} Habits Done</span>
            <span className="text-primary">{progressPct}%</span>
            <span className="text-muted-foreground">{habitsLeft} Habits Left</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Current Streak</div>
            <div className="text-2xl font-black text-orange-500 flex items-center gap-2">🔥 {currentStreak} Days</div>
          </div>
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Life Score</div>
            <div className="text-2xl font-black text-green-500 flex items-center gap-2">⭐ {lifeScore}</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-4 xl:w-2/3">
        {[
          { label: 'Records', count: records.length, color: '#3b82f6', bg: 'bg-blue-500/10', icon: FileText, trend: getWeekTrend(records) },
          { label: 'Habits', count: habits.length, color: '#22c55e', bg: 'bg-green-500/10', icon: Zap, trend: `${habits.length - habitsLeft}/${habits.length} Done` },
          { label: 'Goals', count: goals.length, color: '#f97316', bg: 'bg-orange-500/10', icon: Target, trend: `${goals.filter((g:any)=>g.status === 'Completed').length}/${goals.length} Done` },
          { label: 'Journal', count: journal.length, color: '#a855f7', bg: 'bg-purple-500/10', icon: Book, trend: getWeekTrend(journal) },
          { label: 'People', count: relationships.length, color: '#ec4899', bg: 'bg-pink-500/10', icon: Users, trend: `${relationships.length} Connected` }
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-background hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" style={{ color: stat.color }}>
              <stat.icon size={64} />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bg}`} style={{ color: stat.color }}>
                  <stat.icon size={16} />
                </div>
                <div className="text-right">
                  <div className="text-xl font-black">{stat.count}</div>
                </div>
              </div>
              <div className="text-sm font-bold text-foreground">{stat.label}</div>
              <div className="text-[10px] font-bold text-muted-foreground mt-1 flex justify-between items-end">
                <span>{stat.trend}</span>
                {renderSparkline(data[stat.label.toLowerCase()] || [], stat.color)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
