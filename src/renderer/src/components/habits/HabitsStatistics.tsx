import { Habit } from '../../types'
import { CheckCircle2, ListChecks, Calendar, Star, Clock } from 'lucide-react'

export default function HabitsStatistics({ habits, setFilters }: { habits: Habit[], setFilters?: any }) {
  
  const stats = {
    total: habits.filter(h => !h.archived).length,
    daily: habits.filter(h => !h.archived && h.scheduleType === 'daily').length,
    weekdays: habits.filter(h => !h.archived && h.scheduleType === 'weekdays').length,
    weekends: habits.filter(h => !h.archived && h.scheduleType === 'weekends').length,
    specific: habits.filter(h => !h.archived && h.scheduleType === 'specific_days').length,
    favorites: habits.filter(h => !h.archived && h.isFavorite).length
  }

  const StatCard = ({ icon: Icon, label, value, color, filterType }: any) => (
    <div 
      onClick={() => setFilters && setFilters((prev: any) => {
        if (filterType === 'favorite') {
          return { ...prev, isFavorite: !prev.isFavorite }
        }
        return { ...prev, scheduleType: filterType }
      })}
      className={`bg-card/70 backdrop-blur-md border border-border p-4 rounded-xl flex items-center gap-4 transition-all hover:scale-105 cursor-pointer shadow-sm group hover:border-${color}-500/50`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${color}-500/10 text-${color}-500 group-hover:bg-${color}-500 group-hover:text-white transition-colors`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      <StatCard icon={ListChecks} label="All Habits" value={stats.total} color="blue" filterType="all" />
      <StatCard icon={Calendar} label="Daily" value={stats.daily} color="green" filterType="daily" />
      <StatCard icon={Clock} label="Weekdays" value={stats.weekdays} color="orange" filterType="weekdays" />
      <StatCard icon={Clock} label="Weekends" value={stats.weekends} color="purple" filterType="weekends" />
      <StatCard icon={CheckCircle2} label="Specific" value={stats.specific} color="teal" filterType="specific_days" />
      <StatCard icon={Star} label="Favorites" value={stats.favorites} color="yellow" filterType="favorite" />
    </div>
  )
}
