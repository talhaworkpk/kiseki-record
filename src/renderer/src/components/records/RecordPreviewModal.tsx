import { useEffect, useRef, useState } from 'react'
import { RecordItem } from '../../types'
import { X, ChevronLeft, ChevronRight, MapPin, Smile, Calendar, Tag, FileText, Download, Edit, Trash2, Maximize2, ExternalLink, Film, Music } from 'lucide-react'
import SafeImage from './SafeImage'
import { normalizeUrl, getSafeMediaUrl } from '../../lib/utils'

interface RecordPreviewModalProps {
  record: RecordItem | null
  isOpen: boolean
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  onAction: (action: string, record: RecordItem) => void
}

export default function RecordPreviewModal({ record, isOpen, onClose, onPrevious, onNext, onAction }: RecordPreviewModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.focus()
    }
  }, [isOpen, record])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      const tag = document.activeElement?.tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true'
      if (isInput) return

      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onPrevious) onPrevious()
      if (e.key === 'ArrowRight' && onNext) onNext()
      
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (scrollRef.current) scrollRef.current.scrollTop -= 60
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (scrollRef.current) scrollRef.current.scrollTop += 60
      }
    }
    window.addEventListener('keydown', handleKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onPrevious, onNext, onClose])

  if (!isOpen || !record) return null

  // For Photo type records, show first attachment as main image regardless of extension
  const firstImage = record.type === 'Photo' && record.attachments && record.attachments.length > 0 
    ? record.attachments[0] 
    : record.attachments?.find(a => a.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i))
    
  const firstVideo = record.type === 'Video' && record.attachments && record.attachments.length > 0
    ? record.attachments[0]
    : record.attachments?.find(a => a.match(/\.(mp4|webm|mkv|avi|mov|wmv|flv)$/i))

  const otherAttachments = record.attachments?.filter(a => a !== firstImage && a !== firstVideo) || []

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setStartY(e.pageY - scrollRef.current.offsetTop)
    setScrollTop(scrollRef.current.scrollTop)
  }

  const handleMouseLeave = () => setIsDragging(false)
  const handleMouseUp = () => setIsDragging(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const y = e.pageY - scrollRef.current.offsetTop
    const walk = (y - startY) * 1.5
    scrollRef.current.scrollTop = scrollTop - walk
  }

  return (
    <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
      
      {/* Base Background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl z-0" onClick={onClose} />
      
      {/* 3D Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] opacity-70 animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-500/20 blur-[120px] opacity-70 animate-[pulse_12s_ease-in-out_infinite_reverse]" />
        <div className="absolute -bottom-[20%] left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px] opacity-70 animate-[pulse_10s_ease-in-out_infinite]" />
      </div>

      {/* Floating Header */}
      <div className="fixed top-0 inset-x-0 h-16 bg-transparent flex items-center justify-between px-6 z-20 pointer-events-none">
        <div className="text-sm font-bold text-muted-foreground/80 tracking-widest uppercase pointer-events-auto bg-card/50 px-4 py-1.5 rounded-full backdrop-blur-md border border-border/50 shadow-sm flex items-center gap-2">
          Reading Mode <span className="text-[10px] bg-accent px-2 py-0.5 rounded ml-2">{record.type}</span>
        </div>
        
        <div className="flex items-center gap-2 pointer-events-auto">
          {onPrevious && <button onClick={onPrevious} className="p-2 bg-card/80 backdrop-blur-md hover:bg-accent border border-border/50 rounded-full transition-all text-muted-foreground hover:text-foreground shadow-lg"><ChevronLeft size={20}/></button>}
          {onNext && <button onClick={onNext} className="p-2 bg-card/80 backdrop-blur-md hover:bg-accent border border-border/50 rounded-full transition-all text-muted-foreground hover:text-foreground shadow-lg"><ChevronRight size={20}/></button>}
          <button onClick={onClose} className="p-2 ml-2 bg-card/80 backdrop-blur-md hover:bg-destructive hover:text-white border border-border/50 rounded-full transition-all text-muted-foreground shadow-lg">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area (Scrollable Viewport with drag-to-scroll) */}
      <div 
        ref={scrollRef}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`absolute inset-0 overflow-y-auto pt-24 pb-32 px-4 sm:px-12 scrollbar-none z-10 flex flex-col items-center focus:outline-none ${isDragging ? 'cursor-grabbing select-none' : 'cursor-default'}`}
      >
        
        {/* The "Paper" Container */}
        <div className="w-full max-w-4xl flex-shrink-0 bg-card border border-border shadow-2xl shadow-primary/5 rounded-[32px] overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col cursor-auto">
          
          {/* Header Image Area */}
          {firstImage ? (
            <div className="w-full h-[30vh] sm:h-[45vh] relative group bg-accent/20 shrink-0">
              <SafeImage 
                src={firstImage} 
                className="w-full h-full object-contain" 
                fallbackClassName="h-full" 
                openOriginal={() => window.open(normalizeUrl(firstImage))}
                forceDisplay={record.type === 'Photo'}
              />
              <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => window.open(normalizeUrl(firstImage))} className="p-2 bg-background/80 backdrop-blur rounded-lg text-foreground hover:bg-primary hover:text-white tooltip-trigger" title="Zoom/Open Original"><Maximize2 size={16}/></button>
              </div>
            </div>
          ) : firstVideo ? (
            <div className="w-full h-[30vh] sm:h-[45vh] relative group bg-black shrink-0">
              <video 
                src={getSafeMediaUrl(firstVideo)} 
                controls
                className="w-full h-full object-contain" 
              />
            </div>
          ) : record.type === 'Audio' || record.type === 'Voice' ? (
            <div className="w-full h-32 bg-cyan-500/10 flex items-center justify-center text-cyan-500 shrink-0">
              <Music size={48} />
            </div>
          ) : (
            <div className="w-full h-24 bg-accent/30 flex items-center justify-center text-muted-foreground/20 shrink-0">
              <FileText size={40} />
            </div>
          )}

          {/* Details Area */}
          <div className="p-8 sm:p-16">
            <div className="flex flex-wrap items-center gap-3 mb-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span>{new Date(record.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-serif font-black mb-8 leading-tight">{record.title}</h1>

            <div className="flex flex-wrap items-center gap-4 mb-10">
              {record.mood && (
                <div className="flex items-center gap-2 bg-accent/50 px-4 py-2 rounded-xl text-sm font-medium">
                  <Smile className="text-primary" size={18}/> {record.mood}
                </div>
              )}
              {record.location && (
                <div className="flex items-center gap-2 bg-accent/50 px-4 py-2 rounded-xl text-sm font-medium">
                  <MapPin className="text-primary" size={18}/> {record.location}
                </div>
              )}
              {record.tags && record.tags.map(t => (
                <div key={t} className="flex items-center gap-1 bg-accent/50 px-3 py-2 rounded-xl text-sm font-medium">
                  <Tag className="text-muted-foreground" size={14}/> {t}
                </div>
              ))}
            </div>

            <div className="prose prose-lg dark:prose-invert prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-bold max-w-none text-foreground/90 leading-relaxed mb-12">
              <div dangerouslySetInnerHTML={{ __html: record.description || '<i>No description provided.</i>' }} />
            </div>

            {/* Attachments */}
            {otherAttachments.length > 0 && (
              <div className="border-t border-border pt-12 mb-8">
                <h3 className="text-xl font-bold mb-6 font-serif">Attachments</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherAttachments.map((att, i) => {
                    const isVideo = att.match(/\.(mp4|webm|mkv|avi|mov|wmv|flv)$/i)
                    const isAudio = att.match(/\.(mp3|wav|ogg|m4a|aac|wma|flac)$/i)
                    const isImage = att.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i)
                    
                    return (
                      <div key={i} className="flex flex-col gap-2 p-3 bg-accent/30 border border-border rounded-xl group hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isVideo ? 'bg-red-500/10 text-red-500' : isAudio ? 'bg-cyan-500/10 text-cyan-500' : 'bg-background'}`}>
                            {isImage ? <img src={normalizeUrl(att)} className="w-full h-full object-cover rounded-lg" /> : isVideo ? <Film size={16}/> : isAudio ? <Music size={16}/> : <FileText size={16}/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate" title={att.split(/[\\/]/).pop()}>{att.split(/[\\/]/).pop()}</div>
                          </div>
                          <button onClick={() => window.open(normalizeUrl(att))} className="p-2 bg-background rounded-lg text-muted-foreground hover:text-primary tooltip-trigger" title="Open File">
                            <ExternalLink size={14}/>
                          </button>
                        </div>
                        {(isVideo || isAudio) && (
                          <div className="mt-2">
                             {isVideo ? (
                               <video src={getSafeMediaUrl(att)} controls className="w-full h-32 object-contain bg-black rounded" />
                             ) : (
                               <audio src={getSafeMediaUrl(att)} controls className="w-full h-10" />
                             )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* For Photo type records, show all attachments as a photo gallery if there are multiple */}
            {record.type === 'Photo' && record.attachments && record.attachments.length > 1 && (
              <div className="border-t border-border pt-12 mb-8">
                <h3 className="text-xl font-bold mb-6 font-serif">Photo Gallery</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {record.attachments.map((att, i) => (
                    <div key={i} className="aspect-square bg-accent/20 rounded-xl overflow-hidden border border-border group hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.open(normalizeUrl(att))}>
                      <img src={normalizeUrl(att)} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="w-full h-px bg-border/50 mb-12" />

            {/* Meta Footer */}
            <div className="flex flex-wrap gap-6 text-xs text-muted-foreground font-medium">
              <div>Created: {new Date(record.createdAt).toLocaleString()}</div>
              <div>Last Modified: {new Date(record.updatedAt).toLocaleString()}</div>
              <div>Views: {record.views || 0}</div>
            </div>

            {/* Bottom Action Bar */}
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-border">
              <div className="flex gap-2">
                <button onClick={() => onAction('edit', record)} className="px-5 py-2.5 bg-accent text-foreground hover:bg-primary hover:text-white rounded-xl font-bold flex items-center gap-2 transition-colors">
                  <Edit size={16}/> Edit
                </button>
              </div>
              <button onClick={() => onAction('delete', record)} className="p-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors tooltip-trigger" title="Delete">
                <Trash2 size={18}/>
              </button>
            </div>
            
            {/* End Mark */}
            <div className="mt-16 flex justify-center">
              <div className="w-12 h-1 bg-border rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
