import { SkillRecord } from '../../types'
import { Sparkles, ArrowUpCircle, Award, Trophy, Star, Archive } from 'lucide-react'

export default function SkillsStatistics({ skills, setFilters }: { skills: SkillRecord[], setFilters?: any }) {
  
  const stats = {
    total: 0,
    beginner: 0,
    intermediate: 0,
    expert: 0,
    archived: 0,
    favorites: 0,
  }

  skills.forEach(s => {
    if (s.isArchived) {
      stats.archived++
      return
    }

    stats.total++
    if (s.level < 40) stats.beginner++
    else if (s.level < 80) stats.intermediate++
    else stats.expert++
    
    if (s.isFavorite) stats.favorites++
  })

  const setLevelFilter = (level: string) => {
    if (setFilters) setFilters((f: any) => ({ ...f, level, isFavorite: false, isArchived: false }))
  }

  const toggleBoolean = (key: string) => {
    if (setFilters) setFilters((f: any) => ({ ...f, level: 'all', isFavorite: false, isArchived: false, [key]: true }))
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 relative z-20">
      <button onClick={() => setLevelFilter('all')} className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Sparkles size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.total}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Skills</div>
        </div>
      </button>

      <button onClick={() => setLevelFilter('beginner')} className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
          <ArrowUpCircle size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.beginner}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Beginner</div>
        </div>
      </button>

      <button onClick={() => setLevelFilter('intermediate')} className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-orange-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
          <Award size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.intermediate}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Intermediate</div>
        </div>
      </button>

      <button onClick={() => setLevelFilter('expert')} className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-purple-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
          <Trophy size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.expert}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Expert</div>
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
