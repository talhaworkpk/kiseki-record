import { JournalEntry } from '../../types'
import { X, Calendar, Clock, MapPin, Tag } from 'lucide-react'
import { normalizeUrl, getSafeMediaUrl } from '../../lib/utils'
import { useEffect, useRef, useState } from 'react'

const MOODS = [
  { emoji: '😀', label: 'Happy', value: 'happy' },
  { emoji: '😌', label: 'Calm', value: 'calm' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '😔', label: 'Sad', value: 'sad' },
  { emoji: '😡', label: 'Angry', value: 'angry' },
  { emoji: '😴', label: 'Tired', value: 'tired' }
]

export default function JournalPreviewModal({
  isOpen,
  entry,
  onClose
}: {
  isOpen: boolean
  entry: JournalEntry | null
  onClose: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      const tag = document.activeElement?.tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true'
      if (isInput) return

      if (e.key === 'Escape') onClose()

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
  }, [isOpen])

  if (!isOpen || !entry) return null

  const mood = MOODS.find(m => m.value === entry.mood)

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
    <div className="fixed inset-0 z-50 animate-in fade-in duration-300">
      
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
        <div className="text-sm font-bold text-muted-foreground/80 tracking-widest uppercase pointer-events-auto bg-card/50 px-4 py-1.5 rounded-full backdrop-blur-md border border-border/50 shadow-sm">
          Reading Mode
        </div>
        <button onClick={onClose} className="p-2 bg-card/80 backdrop-blur-md hover:bg-accent border border-border/50 rounded-full transition-all text-muted-foreground hover:text-foreground shadow-lg pointer-events-auto">
          <X size={20} />
        </button>
      </div>

      {/* Main Content Area (Scrollable Viewport) */}
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
        <div className="w-full max-w-3xl flex-shrink-0 bg-card border border-border shadow-2xl shadow-primary/5 rounded-[32px] p-8 sm:p-16 relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col cursor-auto">
          
          {/* Entry Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 text-3xl shadow-sm border border-primary/20">
            {mood?.emoji}
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-black leading-tight text-foreground mb-6">
            {entry.title || 'Untitled Entry'}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-primary/70" />
              {new Date(entry.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-primary/70" />
              {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {entry.tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <Tag size={12} className="text-muted-foreground mr-1" />
              {entry.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-accent/50 text-foreground text-xs font-semibold rounded-md">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {entry.photos && entry.photos.length > 0 && (
          <div className="mb-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {entry.photos.map((photo, i) => {
              const isVideo = photo.match(/\.(mp4|webm|mkv|avi|mov|wmv|flv)$/i)
              const isAudio = photo.match(/\.(mp3|wav|ogg|m4a|aac|wma|flac)$/i)
              return (
                <div key={i} className="w-full flex items-center justify-center bg-accent/10 rounded-2xl p-3 border border-border/50 shadow-sm">
                  {isVideo ? (
                    <video src={getSafeMediaUrl(photo)} controls className="w-full h-auto max-h-[500px] rounded-xl object-contain bg-black" />
                  ) : isAudio ? (
                    <audio src={getSafeMediaUrl(photo)} controls className="w-full h-12" />
                  ) : (
                    <img src={normalizeUrl(photo)} alt={`Attached ${i + 1}`} className="w-full h-auto max-h-[500px] rounded-xl object-cover" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="w-full h-px bg-border/50 mb-12" />

        {/* Rich Text Body */}
        <article 
          className="prose prose-lg dark:prose-invert prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-bold prose-a:text-primary max-w-none prose-img:rounded-2xl prose-img:shadow-lg prose-img:mx-auto prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />
        
        {/* End Mark */}
        <div className="mt-20 flex justify-center">
          <div className="w-12 h-1 bg-border rounded-full" />
        </div>

        </div>
      </div>
    </div>
  )
}
