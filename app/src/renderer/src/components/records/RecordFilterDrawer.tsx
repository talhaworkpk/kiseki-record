import { X, Filter } from 'lucide-react'

export interface RecordFilters {
  type: string
  mood: string
  hasImages: boolean
  hasAttachments: boolean
  isFavorite: boolean
  isArchived: boolean
  dateRange: string
}

interface RecordFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  filters: RecordFilters
  setFilters: (filters: RecordFilters) => void
  onClear: () => void
}

export default function RecordFilterDrawer({ isOpen, onClose, filters, setFilters, onClear }: RecordFilterDrawerProps) {
  
  const update = (key: keyof RecordFilters, value: any) => {
    setFilters({ ...filters, [key]: value })
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-background/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="h-16 px-6 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2"><Filter size={18}/> Advanced Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Record Type</label>
            <select value={filters.type} onChange={e => update('type', e.target.value)} className="w-full bg-background border border-border p-2.5 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary/50">
              <option value="all">All Types</option>
              <option value="Memory">Memory</option>
              <option value="Daily Event">Daily Event</option>
              <option value="Photo">Photo</option>
              <option value="Achievement">Achievement</option>
              <option value="Idea">Idea</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Mood</label>
            <input 
              type="text" 
              value={filters.mood} 
              onChange={e => update('mood', e.target.value)} 
              placeholder="e.g. Happy, Sad" 
              className="w-full bg-background border border-border p-2.5 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary/50" 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Date Range</label>
            <select value={filters.dateRange} onChange={e => update('dateRange', e.target.value)} className="w-full bg-background border border-border p-2.5 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary/50">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
              <option value="year">Past Year</option>
            </select>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors">
              <input type="checkbox" checked={filters.isFavorite} onChange={e => update('isFavorite', e.target.checked)} className="w-4 h-4 accent-yellow-500 rounded cursor-pointer" />
              <span className="font-bold text-sm">Favorites Only</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors">
              <input type="checkbox" checked={filters.hasImages} onChange={e => update('hasImages', e.target.checked)} className="w-4 h-4 accent-primary rounded cursor-pointer" />
              <span className="font-bold text-sm">Has Images</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors">
              <input type="checkbox" checked={filters.hasAttachments} onChange={e => update('hasAttachments', e.target.checked)} className="w-4 h-4 accent-primary rounded cursor-pointer" />
              <span className="font-bold text-sm">Has Attachments</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors">
              <input type="checkbox" checked={filters.isArchived} onChange={e => update('isArchived', e.target.checked)} className="w-4 h-4 accent-orange-500 rounded cursor-pointer" />
              <span className="font-bold text-sm text-orange-500">Show Archived</span>
            </label>
          </div>

        </div>

        <div className="p-6 border-t border-border shrink-0">
          <button onClick={onClear} className="w-full py-3 bg-accent text-foreground font-bold rounded-xl hover:bg-accent/80 transition-colors">
            Clear Filters
          </button>
        </div>

      </div>
    </>
  )
}
