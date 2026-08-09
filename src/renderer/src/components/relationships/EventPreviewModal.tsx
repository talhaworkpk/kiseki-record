import { X, Calendar as CalendarIcon, MapPin, Users, Star, Image as ImageIcon, FileText, Download, Copy, Edit2, Trash2 } from 'lucide-react'

interface EventPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  event: any
  relationships: any[]
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export default function EventPreviewModal({ isOpen, onClose, event, relationships, onEdit, onDelete, onDuplicate }: EventPreviewModalProps) {
  if (!isOpen || !event) return null

  const dateObj = new Date(event.date)
  const displayDate = dateObj.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
  const displayTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const photos = event.attachments?.filter((a: string) => a.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || []
  const files = event.attachments?.filter((a: string) => !a.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || []

  const handleExport = () => {
    const data = { ...event }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Event_${event.title.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-border flex justify-between items-start bg-card z-10 shrink-0">
          <div>
            <h2 className="text-3xl font-black mb-2">{event.title}</h2>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarIcon size={16}/> {displayDate} • {displayTime}</span>
              {event.location && <span className="flex items-center gap-1"><MapPin size={16}/> {event.location}</span>}
              <span className="flex items-center gap-1 bg-accent px-2 py-0.5 rounded-md text-foreground">{event.category}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground"><X size={24} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-12">
          
          {/* Main Column */}
          <div className="flex-1 space-y-10">
            {/* Notes */}
            {event.description && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2"><FileText size={16}/> Notes</h3>
                <div 
                  className="prose prose-invert max-w-none prose-sm bg-accent/20 p-6 rounded-2xl border border-border" 
                  dangerouslySetInnerHTML={{ __html: event.description }} 
                />
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2"><ImageIcon size={16}/> Photos ({photos.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-video rounded-xl overflow-hidden border border-border hover:border-primary transition-colors block">
                      <img src={url} alt={`Photo ${i+1}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="w-full md:w-64 shrink-0 space-y-8">
            
            {/* Meta Card */}
            <div className="bg-accent/30 rounded-2xl p-5 border border-border space-y-6">
              
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Mood</div>
                <div className="text-xl font-bold bg-background border border-border inline-block px-3 py-1.5 rounded-lg shadow-sm">{event.mood || 'N/A'}</div>
              </div>

              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Rating</div>
                <div className="flex gap-1 text-yellow-500">
                  {[1,2,3,4,5].map(s => <Star key={s} size={20} className={s <= (event.importance||0) ? 'fill-yellow-500' : 'text-muted-foreground/30'}/>)}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase mb-2">People Present</div>
                <div className="flex flex-wrap gap-2">
                  {event.people?.map((pid: string) => {
                    const p = relationships.find(r => r._id === pid)
                    return (
                      <div key={pid} className="bg-background border border-border px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm">
                        <Users size={12} className="text-primary"/> {p ? p.name : pid}
                      </div>
                    )
                  })}
                  {(!event.people || event.people.length === 0) && <span className="text-sm text-muted-foreground">No one tagged.</span>}
                </div>
              </div>

              {event.tags && event.tags.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((t: string) => (
                      <span key={t} className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-md">#{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Attachments</div>
                  <div className="space-y-2">
                    {files.map((url: string, i: number) => (
                      <a key={i} href={url} download className="flex items-center gap-2 p-2 bg-background border border-border rounded-lg text-sm hover:bg-accent transition-colors">
                        <FileText size={16} className="text-blue-500 shrink-0"/>
                        <span className="truncate">{url.split('/').pop()}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button onClick={onEdit} className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                <Edit2 size={16}/> Edit Event
              </button>
              <button onClick={onDuplicate} className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-foreground font-bold rounded-xl hover:bg-accent/80 transition-colors">
                <Copy size={16}/> Duplicate
              </button>
              <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-foreground font-bold rounded-xl hover:bg-accent/80 transition-colors">
                <Download size={16}/> Export JSON
              </button>
              <button onClick={onDelete} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 text-red-500 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-colors mt-4">
                <Trash2 size={16}/> Delete Event
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
