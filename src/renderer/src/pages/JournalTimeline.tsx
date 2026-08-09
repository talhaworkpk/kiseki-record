import { useState, useEffect, useRef } from 'react'
import { JournalEntry } from '../types'
import { Calendar, ArrowLeft, ArrowUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function JournalTimeline() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    fetchEntries()
  }, [])

  // Track scroll position for return to top button
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 300)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Right-click drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      setIsDragging(true)
      setDragStartY(e.clientY)
      setScrollTop(scrollContainerRef.current?.scrollTop || 0)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const deltaY = e.clientY - dragStartY
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollTop - deltaY
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (scrollContainerRef.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop += 100
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop -= 100
      }
    }
  }

  const fetchEntries = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('journal', {})
      setEntries(data.sort((a: any, b: any) => b.createdAt - a.createdAt))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div 
      ref={scrollContainerRef}
      className={`p-8 max-w-4xl mx-auto h-full overflow-y-auto animate-in fade-in scrollbar-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ minHeight: '100%' }}
    >
      <div className="flex items-center gap-4 mb-8">
        <Link to="/journal" className="p-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
            <Calendar className="text-primary"/> Journal Timeline
          </h1>
          <p className="text-muted-foreground">A chronological view of your memories.</p>
        </div>
      </div>

      <div className="relative border-l-2 border-border ml-6 space-y-8 pb-12 min-h-[200px]">
        {entries.map((entry) => (
          <div key={entry._id} className="relative pl-8">
            <div className="absolute -left-[11px] top-1 w-5 h-5 bg-primary rounded-full border-4 border-background"></div>
            
            <div className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
              {new Date(entry.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              <span className="text-xs font-normal opacity-70">{new Date(entry.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{entry.mood === 'happy' ? '😀' : entry.mood === 'sad' ? '😔' : entry.mood === 'angry' ? '😡' : entry.mood === 'tired' ? '😴' : entry.mood === 'calm' ? '😌' : '😐'}</span>
                {entry.tags.length > 0 && (
                  <span className="bg-accent px-2 py-0.5 rounded-full text-xs font-medium text-foreground">#{entry.tags[0]}</span>
                )}
                {entry.location && <span className="text-xs text-muted-foreground">• {entry.location}</span>}
              </div>
              
              <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-4 text-muted-foreground" dangerouslySetInnerHTML={{ __html: entry.content }} />
              
              {entry.photos && entry.photos.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto">
                  {entry.photos.map((p, i) => (
                    <img key={i} src={'file:///' + p.replace(/\\/g, '/')} className="h-24 w-24 object-cover rounded-lg border border-border" />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="pl-8 text-muted-foreground">No journal entries yet.</div>
        )}
      </div>

      {/* Return to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-110 z-50"
          title="Return to top"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  )
}
