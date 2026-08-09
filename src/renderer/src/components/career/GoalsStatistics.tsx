import { Goal } from '../../types'
import { Target, Play, CalendarClock, CheckCircle2, Star, Archive } from 'lucide-react'

export default function GoalsStatistics({ goals, setFilters }: { goals: Goal[], setFilters?: any }) {
  
  const stats = {
    total: 0,
    active: 0,
    planned: 0,
    completed: 0,
    archived: 0,
    favorites: 0,
  }

  goals.forEach(g => {
    if (g.isArchived) {
      stats.archived++
      return
    }

    stats.total++
    if (g.status === 'Active') stats.active++
    else if (g.status === 'Planned') stats.planned++
    else if (g.status === 'Completed') stats.completed++
    
    if (g.isFavorite) stats.favorites++
  })

  const setStatus = (status: string) => {
    if (setFilters) setFilters((f: any) => ({ ...f, status, isFavorite: false, isArchived: false }))
  }

  const toggleBoolean = (key: string) => {
    if (setFilters) setFilters((f: any) => ({ ...f, status: 'all', isFavorite: false, isArchived: false, [key]: true }))
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 relative z-20">
      <button onClick={() => setStatus('all')} className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-red-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
          <Target size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.total}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Goals</div>
        </div>
      </button>

      <button onClick={() => setStatus('Active')} className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
          <Play size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.active}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active</div>
        </div>
      </button>

      <button onClick={() => setStatus('Planned')} className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-orange-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
          <CalendarClock size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.planned}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Planned</div>
        </div>
      </button>

      <button onClick={() => setStatus('Completed')} className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-green-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
          <CheckCircle2 size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.completed}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Completed</div>
        </div>
      </button>

      <button onClick={() => toggleBoolean('isFavorite')} className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-yellow-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
          <Star size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.favorites}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Favorites</div>
        </div>
      </button>

      <button onClick={() => toggleBoolean('isArchived')} className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-gray-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-gray-500/10 text-gray-500 flex items-center justify-center shrink-0">
          <Archive size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.archived}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Archived</div>
        </div>
      </button>
    </div>
  )
}
