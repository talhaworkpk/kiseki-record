import { RecordItem } from '../../types'
import { FileText, Image as ImageIcon, Calendar, BookOpen, Star, Archive, HardDrive } from 'lucide-react'

export default function RecordsStatistics({ records, setFilters }: { records: RecordItem[], setFilters?: any }) {
  
  const stats = {
    total: 0,
    photos: 0,
    events: 0,
    memories: 0,
    archived: 0,
    favorites: 0,
  }

  records.forEach(r => {
    const isArch = r.isArchived || !!r.deletedAt
    if (isArch) {
      stats.archived++
      return
    }

    stats.total++

    const t = r.type.toLowerCase()
    if (t.includes('photo')) stats.photos++
    else if (t.includes('event')) stats.events++
    else if (t.includes('memory')) stats.memories++
    
    if (r.isFavorite) stats.favorites++
  })

  const setType = (type: string) => {
    if (setFilters) setFilters((f: any) => ({ ...f, type, isFavorite: false, isArchived: false, hasImages: false, hasAttachments: false, dateRange: 'all', mood: '' }))
  }

  const toggleBoolean = (key: string) => {
    if (setFilters) setFilters((f: any) => ({ ...f, type: 'all', isFavorite: false, isArchived: false, hasImages: false, hasAttachments: false, dateRange: 'all', mood: '', [key]: true }))
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <button onClick={() => setType('all')} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <FileText size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.total}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Records</div>
        </div>
      </button>

      <button onClick={() => setType('Photo')} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-purple-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
          <ImageIcon size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.photos}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Photos</div>
        </div>
      </button>

      <button onClick={() => setType('Daily Event')} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-green-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
          <Calendar size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.events}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Events</div>
        </div>
      </button>

      <button onClick={() => setType('Memory')} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
          <BookOpen size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.memories}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Memories</div>
        </div>
      </button>

      <button onClick={() => toggleBoolean('isFavorite')} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-yellow-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
          <Star size={20}/>
        </div>
        <div>
          <div className="text-2xl font-black">{stats.favorites}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Favorites</div>
        </div>
      </button>

      <button onClick={() => toggleBoolean('isArchived')} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-orange-500/50 hover:shadow-md transition-all text-left">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
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
