import { useState, useRef, useEffect } from 'react'
import { RecordItem, Person } from '../../types'
import { Eye, Edit, Copy, Trash2, Archive, Star, Image as ImageIcon, Award, Calendar, FileText, Book, BookOpen, MapPin, Smile, User, Film, Music } from 'lucide-react'
import SafeImage from './SafeImage'
import { getSafeMediaUrl } from '../../lib/utils'

interface RecordCardProps {
  record: RecordItem
  viewMode: 'grid' | 'list'
  isSelectionMode: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onAction: (action: string, record: RecordItem) => void
  relationships?: Person[]
}

export default function RecordCard({ record, viewMode, isSelectionMode, isSelected, onToggleSelect, onAction, relationships = [] }: RecordCardProps) {
  const [showMore, setShowMore] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [localRelationships, setLocalRelationships] = useState<Person[]>(relationships)

  // Load fresh relationships when component mounts or when relationships prop changes
  useEffect(() => {
    const loadRelationships = async () => {
      try {
        // @ts-ignore
        const rels = await window.api.db.find('relationships', {})
        console.log('RecordCard: Loaded relationships:', rels.length, 'for record:', record._id)
        console.log('RecordCard: Memory people IDs:', record.people)
        console.log('RecordCard: Available relationship IDs:', rels.map(r => r._id))
        setLocalRelationships(rels)
      } catch(e) {
        console.error('RecordCard: Error loading relationships:', e)
        // Fallback to prop relationships if DB fetch fails
        setLocalRelationships(relationships)
      }
    }
    // Only fetch from DB if relationships prop is empty
    if (relationships.length === 0) {
      loadRelationships()
    } else {
      setLocalRelationships(relationships)
    }
  }, [record._id, record.people, relationships])

  // Handle outside click for context menu
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.pageX, y: e.pageY })
  }

  const fireAction = (action: string) => {
    setContextMenu(null)
    onAction(action, record)
  }

  // Type Badges Config
  const getTypeConfig = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('memory')) return { color: 'bg-blue-500/10 text-blue-500', icon: <BookOpen size={14}/> }
    if (t.includes('event')) return { color: 'bg-green-500/10 text-green-500', icon: <Calendar size={14}/> }
    if (t.includes('photo')) return { color: 'bg-purple-500/10 text-purple-500', icon: <ImageIcon size={14}/> }
    if (t.includes('journal')) return { color: 'bg-orange-500/10 text-orange-500', icon: <Book size={14}/> }
    if (t.includes('achievement')) return { color: 'bg-yellow-500/10 text-yellow-500', icon: <Award size={14}/> }
    if (t.includes('video')) return { color: 'bg-red-500/10 text-red-500', icon: <Film size={14}/> }
    if (t.includes('audio') || t.includes('voice')) return { color: 'bg-cyan-500/10 text-cyan-500', icon: <Music size={14}/> }
    return { color: 'bg-accent text-foreground', icon: <FileText size={14}/> }
  }

  const typeConfig = getTypeConfig(record.type)

  // Find thumbnail if photo exists - for Photo type records, use first attachment regardless of extension
  const firstImage = record.type === 'Photo' && record.attachments && record.attachments.length > 0
    ? record.attachments[0]
    : record.attachments?.find(a => a.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i))
  
  const firstVideo = record.attachments?.find(a => a.match(/\.(mp4|webm|mkv|avi|mov|wmv|flv)$/i))
  
  // Get related relationships
  const relatedPeople = record.people?.map(personId => {
    const person = localRelationships.find(r => r._id === personId)
    if (!person) {
      console.log('Relationship not found for ID:', personId, 'Available relationships:', localRelationships.map(r => ({ id: r._id, name: r.name })))
      return 'Unknown Person' // Fallback instead of showing raw ID
    }
    return person.name
  }).filter(Boolean) || []
  
  // Clean text for description
  const cleanDesc = record.description?.replace(/<[^>]*>?/gm, '') || ''
  const isLongDesc = cleanDesc.length > 150

  return (
    <>
      <div 
        onContextMenu={handleContextMenu}
        className={`group relative flex flex-col bg-card border rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 ${isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-border hover:border-primary/50'} ${viewMode === 'list' ? 'flex-row items-stretch' : ''}`}
      >
        
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="absolute top-4 left-4 z-20">
            <input 
              type="checkbox" 
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-5 h-5 accent-primary cursor-pointer drop-shadow-md rounded"
            />
          </div>
        )}

        {/* Thumbnail Area (Grid Mode) */}
        {viewMode === 'grid' && (
          <div className="relative h-40 bg-accent/30 rounded-t-2xl border-b border-border overflow-hidden shrink-0 group flex items-center justify-center">
            {firstImage ? (
              <SafeImage src={firstImage} className="w-full h-full" />
            ) : firstVideo || (record.type === 'Video' && record.attachments && record.attachments.length > 0) ? (
              <video
                src={getSafeMediaUrl(firstVideo || (record.attachments?.[0] || '')) + '#t=1'}
                preload="metadata"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground/30 scale-[3]">
                {typeConfig.icon}
              </div>
            )}
            
            {/* Quick Actions Hover Overlay */}
            <div className={`absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur border border-border rounded-lg p-1 shadow-lg ${isSelectionMode ? 'hidden' : ''}`}>
              <button onClick={() => fireAction('preview')} title="Preview" className="p-1.5 hover:bg-primary/20 hover:text-primary rounded text-foreground transition-colors"><Eye size={14}/></button>
              <button onClick={() => fireAction('edit')} title="Edit" className="p-1.5 hover:bg-primary/20 hover:text-primary rounded text-foreground transition-colors"><Edit size={14}/></button>
              <button onClick={() => fireAction('favorite')} title="Favorite" className="p-1.5 hover:bg-yellow-500/20 hover:text-yellow-500 rounded text-foreground transition-colors"><Star size={14} className={record.isFavorite ? "fill-yellow-500 text-yellow-500" : ""} /></button>
            </div>
            
            <div className={`absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm backdrop-blur border border-white/10 ${typeConfig.color}`}>
              {typeConfig.icon} {record.type}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold truncate pr-4 text-foreground leading-tight">{record.title}</h3>
            {record.isFavorite && <Star size={16} className="text-yellow-500 fill-yellow-500 shrink-0"/>}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium mb-3">
            <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(record.date).toLocaleDateString()}</span>
            {record.mood && <span className="flex items-center gap-1 text-foreground/80 bg-accent px-2 py-0.5 rounded-md"><Smile size={12}/> {record.mood}</span>}
            {record.location && <span className="flex items-center gap-1"><MapPin size={12}/> {record.location}</span>}
            {relatedPeople.length > 0 && (
              <span className="flex items-center gap-1 text-foreground/80 bg-primary/10 px-2 py-0.5 rounded-md">
                <User size={12}/> {relatedPeople.slice(0, 2).join(', ')}{relatedPeople.length > 2 ? ` +${relatedPeople.length - 2}` : ''}
              </span>
            )}
          </div>

          <div className="text-sm text-foreground/80 mb-4 leading-relaxed flex-1">
            <div className={showMore ? '' : 'line-clamp-3'}>
              {cleanDesc}
            </div>
            {isLongDesc && viewMode === 'grid' && (
              <button onClick={() => setShowMore(!showMore)} className="text-primary text-xs font-bold mt-1 hover:underline">
                {showMore ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>

          {/* Tags */}
          {record.tags && record.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {record.tags.map(t => (
                <span key={t} className="text-[10px] font-bold text-muted-foreground bg-accent/50 px-2 py-1 rounded-md">#{t}</span>
              ))}
            </div>
          )}

          {/* Footer Stats */}
          <div className="flex justify-between items-center pt-3 border-t border-border mt-auto text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
            <div className="flex items-center gap-3">
              <span title={`Created: ${new Date(record.createdAt).toLocaleString()}`}>
                C: {new Date(record.createdAt).toLocaleDateString([],{month:'short', day:'numeric'})}
              </span>
              <span title={`Modified: ${new Date(record.updatedAt).toLocaleString()}`}>
                M: {new Date(record.updatedAt).toLocaleDateString([],{month:'short', day:'numeric'})}
              </span>
            </div>
            <div className="flex items-center gap-1" title={`${record.views || 0} views`}>
              <Eye size={10}/> {record.views || 0}
            </div>
          </div>
        </div>

        {/* List Mode specific extra UI */}
        {viewMode === 'list' && (
          <div className="flex items-center gap-2 p-5 shrink-0 border-l border-border bg-card/50">
            {!isSelectionMode && (
              <>
                <button onClick={() => fireAction('preview')} title="Preview" className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors"><Eye size={16}/></button>
                <button onClick={() => fireAction('edit')} title="Edit" className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors"><Edit size={16}/></button>
                <button onClick={() => fireAction('duplicate')} title="Duplicate" className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors"><Copy size={16}/></button>
                <button onClick={() => fireAction('delete')} title="Delete" className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-colors"><Trash2 size={16}/></button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div 
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-48 bg-background border border-border rounded-xl shadow-2xl py-1 text-sm font-medium animate-in fade-in zoom-in-95 duration-100"
        >
          <button onClick={() => fireAction('preview')} className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-accent"><Eye size={14}/> Preview</button>
          <button onClick={() => fireAction('edit')} className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-accent"><Edit size={14}/> Edit</button>
          <button onClick={() => fireAction('duplicate')} className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-accent"><Copy size={14}/> Duplicate</button>
          <div className="my-1 border-t border-border"></div>
          <button onClick={() => fireAction('favorite')} className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-accent"><Star size={14}/> {record.isFavorite ? 'Unfavorite' : 'Favorite'}</button>
          <button onClick={() => fireAction('export')} className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-accent">Export</button>
          <div className="my-1 border-t border-border"></div>
          {record.isArchived ? (
            <button onClick={() => fireAction('unarchive')} className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-accent"><Archive size={14}/> Unarchive</button>
          ) : (
            <button onClick={() => fireAction('archive')} className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-accent"><Archive size={14}/> Archive</button>
          )}
          <button onClick={() => fireAction('delete')} className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-red-500 hover:text-white text-red-500"><Trash2 size={14}/> Delete</button>
        </div>
      )}
    </>
  )
}
