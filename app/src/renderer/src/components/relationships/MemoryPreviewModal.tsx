import { useState, useEffect } from 'react'
import { X, Calendar as CalendarIcon, MapPin, Users, Image as ImageIcon, FileText, Download, Copy, Edit2, Trash2, Folder, PlayCircle } from 'lucide-react'

interface MemoryPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  memory: any
  relationships: any[]
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export default function MemoryPreviewModal({ isOpen, onClose, memory, relationships, onEdit, onDelete, onDuplicate }: MemoryPreviewModalProps) {
  const [slideshowActive, setSlideshowActive] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)

  // For Photo type records, treat all attachments as photos regardless of extension
  const photos = memory?.type === 'Photo' && memory?.attachments
    ? memory.attachments
    : memory?.attachments?.filter((a: string) => a.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i)) || []
  const videos = memory?.attachments?.filter((a: string) => a.match(/\.(mp4|webm|ogg|mov)$/i)) || []
  const audio = memory?.attachments?.filter((a: string) => a.match(/\.(mp3|wav|ogg|m4a)$/i)) || []
  const files = memory?.attachments?.filter((a: string) => !a.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2|mp4|webm|ogg|mov|mp3|wav|m4a)$/i)) || []

  const getVisualMedia = () => [...photos, ...videos]

  // Stop slideshow when closing
  useEffect(() => {
    if (!isOpen) {
      setSlideshowActive(false)
      setSlideIndex(0)
    }
  }, [isOpen])

  // Auto-advance slideshow
  useEffect(() => {
    let interval: any
    const visualMedia = getVisualMedia()
    if (slideshowActive && visualMedia.length > 0) {
      interval = setInterval(() => {
        setSlideIndex((prev) => (prev + 1) % visualMedia.length)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [slideshowActive, memory])

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      const tag = document.activeElement?.tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true'
      if (isInput) return

      if (e.key === 'Escape') {
        if (slideshowActive) {
          setSlideshowActive(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, slideshowActive, onClose])

  if (!isOpen || !memory) return null

  const dateObj = new Date(memory.date)
  const displayDate = dateObj.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })

  const handleExport = () => {
    const data = { ...memory }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Memory_${memory.title.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- Slideshow Overlay ---
  if (slideshowActive) {
    const visualMedia = getVisualMedia()
    const currentMedia = visualMedia[slideIndex]
    const isVideo = currentMedia?.match(/\.(mp4|webm|ogg|mov)$/i)

    return (
      <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center animate-in fade-in duration-1000">
        <button onClick={() => setSlideshowActive(false)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-colors z-10">
          <X size={32} />
        </button>
        <div className="absolute top-6 left-6 text-white text-xl font-black drop-shadow-md z-10 opacity-70">
          {slideIndex + 1} / {visualMedia.length}
        </div>

        {visualMedia.length > 0 ? (
          <div className="w-full h-full flex items-center justify-center relative p-12">
            {isVideo ? (
              <video src={currentMedia} autoPlay controls className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-700" />
            ) : (
              <img key={currentMedia} src={currentMedia} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-700" />
            )}
            
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full text-white text-lg font-medium shadow-2xl">
              {memory.title}
            </div>
          </div>
        ) : (
          <div className="text-white text-2xl font-bold">No photos or videos to show.</div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-5xl h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-border flex justify-between items-start bg-card z-10 shrink-0">
          <div>
            <h2 className="text-4xl font-black mb-3">{memory.title}</h2>
            <div className="flex flex-wrap gap-4 text-sm font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground"><CalendarIcon size={16}/> {displayDate}</span>
              {memory.location && <span className="flex items-center gap-1.5"><MapPin size={16}/> {memory.location}</span>}
              <span className="flex items-center gap-1.5 bg-accent px-3 py-1 rounded-md text-foreground"><Folder size={16}/> {memory.category || 'General'} Album</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getVisualMedia().length > 0 && (
              <button onClick={() => { setSlideIndex(0); setSlideshowActive(true) }} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-primary/20">
                <PlayCircle size={18} /> Slideshow
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground"><X size={24} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-12">
          
          {/* Main Column */}
          <div className="flex-1 space-y-12">
            
            {/* Story Mode */}
            {memory.description && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2 tracking-widest"><FileText size={16}/> Story</h3>
                <div 
                  className="prose prose-invert max-w-none prose-sm md:prose-base bg-accent/20 p-8 rounded-3xl border border-border leading-loose" 
                  dangerouslySetInnerHTML={{ __html: memory.description }} 
                />
              </div>
            )}

            {/* Photos & Videos Gallery */}
            {(photos.length > 0 || videos.length > 0) && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2 tracking-widest"><ImageIcon size={16}/> Visual Memories</h3>
                <div className="columns-2 md:columns-3 gap-4 space-y-4">
                  {getVisualMedia().map((url: string, i: number) => {
                    const isVid = url.match(/\.(mp4|webm|ogg|mov)$/i)
                    return (
                      <div key={i} className="break-inside-avoid relative rounded-2xl overflow-hidden border border-border group shadow-sm hover:shadow-xl transition-all">
                        {isVid ? (
                          <video src={url} controls className="w-full object-cover" />
                        ) : (
                          <a href={url} target="_blank" rel="noreferrer" className="block w-full">
                            <img src={url} alt={`Memory ${i+1}`} className="w-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-80 shrink-0 space-y-8">
            
            {/* Meta Card */}
            <div className="bg-accent/30 rounded-3xl p-6 border border-border space-y-6">
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Mood</div>
                  <div className="text-xl font-bold bg-background border border-border inline-block px-3 py-1.5 rounded-xl shadow-sm">{memory.mood || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Rating</div>
                  <div className="text-xl font-black text-yellow-500 bg-background border border-border inline-block px-3 py-1.5 rounded-xl shadow-sm">
                    {memory.importance || 0} / 10
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase mb-3">People Present</div>
                <div className="flex flex-wrap gap-2">
                  {memory.people?.map((pid: string) => {
                    const p = relationships.find(r => r._id === pid)
                    return (
                      <div key={pid} className="bg-background border border-border px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm">
                        <Users size={14} className="text-primary"/> {p ? p.name : pid}
                      </div>
                    )
                  })}
                  {(!memory.people || memory.people.length === 0) && <span className="text-sm text-muted-foreground">No one tagged.</span>}
                </div>
              </div>

              {memory.tags && memory.tags.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-3">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {memory.tags.map((t: string) => (
                      <span key={t} className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">#{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              {audio.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-3">Voice Notes</div>
                  <div className="space-y-3">
                    {audio.map((url: string, i: number) => (
                      <div key={i} className="p-3 bg-background border border-border rounded-xl">
                        <audio src={url} controls className="w-full h-8" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-3">Documents</div>
                  <div className="space-y-2">
                    {files.map((url: string, i: number) => (
                      <a key={i} href={url} download className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl text-sm font-medium hover:bg-accent transition-colors group">
                        <FileText size={18} className="text-blue-500 shrink-0 group-hover:scale-110 transition-transform"/>
                        <span className="truncate">{url.split('/').pop()}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button onClick={onEdit} className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                <Edit2 size={18}/> Edit Memory
              </button>
              <button onClick={onDuplicate} className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-foreground font-bold rounded-xl hover:bg-accent/80 transition-colors">
                <Copy size={18}/> Duplicate
              </button>
              <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-foreground font-bold rounded-xl hover:bg-accent/80 transition-colors">
                <Download size={18}/> Export JSON
              </button>
              <button onClick={onDelete} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-colors mt-6">
                <Trash2 size={18}/> Delete Permanently
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
