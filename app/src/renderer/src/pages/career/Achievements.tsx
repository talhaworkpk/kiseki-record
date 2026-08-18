import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Award, Plus, Trash2, Edit2, X, Image as ImageIcon, Upload, FileText, Eye, PlayCircle } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { AchievementRecord } from '../../types'
import { normalizeUrl } from '../../lib/utils'

export default function Achievements() {
  const [achievements, setAchievements] = useState<AchievementRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingAchievement, setViewingAchievement] = useState<AchievementRecord | null>(null)
  const [slideshowActive, setSlideshowActive] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [isSlideshowPaused, setIsSlideshowPaused] = useState(false)

  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-advance slideshow
  useEffect(() => {
    let interval: any
    const allMedia = viewingAchievement?.photos || []
    if (slideshowActive && allMedia.length > 0 && !isSlideshowPaused) {
      interval = setInterval(() => {
        setSlideIndex((prev) => (prev + 1) % allMedia.length)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [slideshowActive, viewingAchievement, isSlideshowPaused])

  // Escape key to close and space key to pause slideshow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!slideshowActive) return

      const tag = document.activeElement?.tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true'
      if (isInput) return

      if (e.key === 'Escape') {
        setSlideshowActive(false)
      }

      if (e.key === ' ') {
        e.preventDefault()
        setIsSlideshowPaused(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && slideshowActive) {
        setIsSlideshowPaused(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [slideshowActive])

  const defaultForm: Partial<AchievementRecord> = {
    title: '', date: '', description: '', photos: [], certificates: [], notes: '', attachments: []
  }
  const [form, setForm] = useState<Partial<AchievementRecord>>(defaultForm)

  const loadData = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('achievements', {})
      const sorted = data.sort((a: any, b: any) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      })
      setAchievements(sorted)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const location = useLocation()
  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    if (highlightId && !loading && achievements.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`achievement-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [location.search, loading, achievements.length])

  const handleSave = async () => {
    try {
      if (editingId) {
        // @ts-ignore
        await window.api.db.update('achievements', { _id: editingId }, { $set: { ...form, updatedAt: Date.now() } })
        NotificationEngine.notify('success', 'Achievement Updated', `"${form.title}" was updated.`, 'Career')
      } else {
        // @ts-ignore
        await window.api.db.insert('achievements', { ...form, createdAt: Date.now(), updatedAt: Date.now() })
        NotificationEngine.notify('success', 'Achievement Added', `Added "${form.title}".`, 'Career')
        setShowSuccessOverlay(true)
        setTimeout(() => setShowSuccessOverlay(false), 3000)
      }
      setIsAdding(false)
      setEditingId(null)
      loadData()
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        if (isAdding) {
          e.preventDefault()
          handleSave()
        }
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [isAdding, form, editingId])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm('Delete this achievement?')) return
    try {
      // @ts-ignore
      await window.api.db.remove('achievements', { _id: id }, {})
      NotificationEngine.notify('info', 'Achievement Deleted', `"${title}" was removed.`, 'Career')
      loadData()
    } catch (err) { console.error(err) }
  }

  const openEdit = (record: AchievementRecord) => {
    setForm(record)
    setEditingId(record._id!)
    setIsAdding(true)
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAttachPhoto = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, photos: [...(form.photos || []), result.files[0].filePath] })
    }
  }

  const handleAttachFile = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, attachments: [...(form.attachments || []), result.files[0].filePath] })
    }
  }

  // Right-click drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName)) return
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

  // Keyboard navigation
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

  return (
    <div className="h-full bg-background animate-in fade-in duration-500 relative overflow-hidden flex flex-col">
      <style>{`
        @keyframes root-draw {
          0% { stroke-dasharray: 400; stroke-dashoffset: 400; opacity: 0; }
          10% { opacity: 0.8; }
          40% { stroke-dashoffset: 0; opacity: 0.8; }
          80% { stroke-dashoffset: 0; opacity: 0.3; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        .root-grow {
          stroke-dasharray: 400;
          stroke-dashoffset: 400;
          animation: root-draw 20s ease-in-out infinite;
        }
        @keyframes hardship-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>

      {/* 3D Ambient Background - Organic Roots of Overcoming Hardship */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full opacity-70">
          <defs>
            <linearGradient id="root-grad-amber" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#78350f" /> {/* deep dark brown/amber */}
              <stop offset="40%" stopColor="#b45309" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="root-grad-emerald" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#064e3b" /> {/* very dark green */}
              <stop offset="50%" stopColor="#047857" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="base-hardship" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#1c1917" stopOpacity="0.5" /> {/* stone/hardship color */}
              <stop offset="100%" stopColor="#1c1917" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Hardship Base / Earth */}
          <path d="M 0 100 Q 25 80 50 100 T 100 100 Z" fill="url(#base-hardship)" className="animate-[hardship-pulse_8s_ease-in-out_infinite]" />
          <path d="M 0 100 Q 30 85 60 95 T 100 80 L 100 100 Z" fill="url(#root-grad-emerald)" opacity="0.3" className="animate-[hardship-pulse_12s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />

          {/* Growing Organic Roots */}
          <g fill="none" strokeLinecap="round">
            {/* Cluster 1 */}
            <path d="M 10 100 C 15 80, 5 60, 20 40 S 15 10, 25 -5" stroke="url(#root-grad-amber)" strokeWidth="3" className="root-grow" style={{ animationDelay: '0s' }} />
            <path d="M 12 100 C 12 85, 20 75, 18 55 S 25 30, 22 5" stroke="url(#root-grad-emerald)" strokeWidth="1.5" className="root-grow" style={{ animationDelay: '3s' }} />
            <path d="M 8 100 C 5 80, 15 70, 10 40 S 20 20, 15 0" stroke="url(#root-grad-amber)" strokeWidth="2" className="root-grow" style={{ animationDelay: '6s' }} />

            {/* Cluster 2 */}
            <path d="M 35 100 C 30 70, 45 60, 35 30 S 50 10, 40 -10" stroke="url(#root-grad-amber)" strokeWidth="4" className="root-grow" style={{ animationDelay: '2s' }} />
            <path d="M 33 100 C 40 85, 30 65, 42 50 S 35 25, 45 5" stroke="url(#root-grad-emerald)" strokeWidth="2" className="root-grow" style={{ animationDelay: '5s' }} />
            <path d="M 38 100 C 42 80, 32 60, 40 40 S 30 20, 45 0" stroke="url(#root-grad-amber)" strokeWidth="1" className="root-grow" style={{ animationDelay: '8s' }} />

            {/* Cluster 3 */}
            <path d="M 60 100 C 70 80, 55 60, 65 40 S 55 10, 70 -5" stroke="url(#root-grad-amber)" strokeWidth="3.5" className="root-grow" style={{ animationDelay: '1s' }} />
            <path d="M 65 100 C 60 85, 75 70, 62 50 S 70 20, 65 5" stroke="url(#root-grad-emerald)" strokeWidth="1.5" className="root-grow" style={{ animationDelay: '4s' }} />
            <path d="M 58 100 C 50 75, 65 65, 55 45 S 65 15, 60 -5" stroke="url(#root-grad-amber)" strokeWidth="2" className="root-grow" style={{ animationDelay: '7s' }} />

            {/* Cluster 4 */}
            <path d="M 85 100 C 80 75, 95 65, 85 35 S 95 15, 85 -5" stroke="url(#root-grad-amber)" strokeWidth="2.5" className="root-grow" style={{ animationDelay: '1.5s' }} />
            <path d="M 88 100 C 95 80, 85 60, 92 40 S 85 20, 95 5" stroke="url(#root-grad-emerald)" strokeWidth="1.5" className="root-grow" style={{ animationDelay: '3.5s' }} />
            <path d="M 82 100 C 75 80, 90 70, 80 50 S 90 30, 82 10" stroke="url(#root-grad-amber)" strokeWidth="2" className="root-grow" style={{ animationDelay: '9s' }} />
          </g>
        </svg>
      </div>

      <div 
        ref={scrollContainerRef}
        className={`absolute inset-0 overflow-y-auto p-8 z-10 scrollbar-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Award className="text-yellow-500" />
              Milestones & Achievements
            </h1>
            <p className="text-muted-foreground mt-1">Track your awards, honors, and professional milestones.</p>
          </div>
          {!isAdding && (
            <button onClick={() => { setForm(defaultForm); setEditingId(null); setIsAdding(true) }} className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-medium flex items-center gap-2">
              <Plus size={18} /> Add Achievement
            </button>
          )}
        </div>

        {isAdding ? (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Achievement' : 'Add Achievement'}</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-accent rounded-md"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input autoFocus type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full p-2 bg-background border border-border rounded-md" placeholder="e.g. Won 1st Place in Hackathon" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="month" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Photos & Media</label>
              <div className="flex flex-wrap gap-4 mb-4">
                {form.photos?.map((img, i) => (
                  <div key={i} className="relative group rounded-md overflow-hidden border border-border w-24 h-24">
                    <img src={normalizeUrl(img)} alt="photo" className="w-full h-full object-cover" />
                    <button onClick={() => setForm({ ...form, photos: form.photos?.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                  </div>
                ))}
                <button onClick={handleAttachPhoto} className="flex flex-col items-center justify-center w-24 h-24 bg-background border border-dashed border-border rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <ImageIcon size={20} className="mb-1" />
                  <span className="text-xs font-medium">Add Photo</span>
                </button>
              </div>
              <label className="block text-sm font-medium mb-2 mt-4">Attachments</label>
              <div className="flex flex-wrap gap-2">
                {form.attachments?.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 bg-accent px-3 py-1.5 rounded-md text-sm">
                    <a href={normalizeUrl(att)} target="_blank" className="hover:underline truncate max-w-[200px]">{att ? att.split(/[\\/]/).pop() : 'Attachment'}</a>
                    <button onClick={() => setForm({...form, attachments: form.attachments?.filter((_, idx) => idx !== i)})} className="text-destructive hover:text-destructive/80"><X size={12}/></button>
                  </div>
                ))}
                <button onClick={handleAttachFile} className="flex items-center gap-2 bg-background border border-dashed border-border px-4 py-1.5 rounded-md text-sm hover:bg-accent">
                  <Upload size={14}/> Add File
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-accent rounded-md hover:bg-accent/80 font-medium">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-medium">Save Achievement</button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map(record => (
            <div key={record._id} id={`achievement-${record._id}`} className="bg-card border border-border rounded-2xl shadow-sm relative group hover:border-yellow-500/50 transition-all duration-1000 flex flex-col overflow-hidden">

              {record.photos && record.photos.length > 0 ? (
                <div className="h-48 w-full border-b border-border relative flex items-center justify-center overflow-hidden bg-black/5 dark:bg-white/5">
                  <div 
                    className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 transform scale-125"
                    style={{ backgroundImage: `url("${normalizeUrl(record.photos[0]).replace(/"/g, '%22')}")` }}
                  />
                  <img src={normalizeUrl(record.photos[0])} alt="Achievement" className="max-w-[90%] max-h-[90%] object-contain relative z-10 drop-shadow-2xl rounded-sm border border-white/10" />
                </div>
              ) : (
                <div className="h-16 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 w-full border-b border-border"></div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10 bg-background/80 backdrop-blur-sm p-1 rounded-lg border border-border">
                  <button onClick={() => setViewingAchievement(record)} className="p-1.5 rounded-md hover:bg-accent text-foreground" title="View Details"><Eye size={14} /></button>
                  <button onClick={() => openEdit(record)} className="p-1.5 rounded-md hover:bg-accent text-foreground" title="Edit"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(record._id!, record.title)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 size={14} /></button>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">
                  <Award size={14} /> {new Date(record.date).toLocaleDateString([], { month: 'long', year: 'numeric' })}
                </div>
                <h3 onClick={() => setViewingAchievement(record)} className="text-xl font-bold mb-2 pr-24 cursor-pointer hover:text-yellow-500 transition-colors decoration-yellow-500/30 hover:underline underline-offset-4">{record.title}</h3>

                {record.description && <p className="text-sm text-foreground/80 flex-1">{record.description}</p>}

                {((record.photos && record.photos.length > 1) || (record.attachments && record.attachments.length > 0)) && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {record.photos && record.photos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-custom">
                        {record.photos.slice(1).map((img, i) => (
                          <img key={i} src={normalizeUrl(img)} alt="Achievement" className="h-16 w-24 object-cover rounded-md border border-border shrink-0 hover:scale-105 transition-transform cursor-pointer" onClick={() => setViewingAchievement(record)} />
                        ))}
                      </div>
                    )}
                    {record.attachments && record.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {record.attachments.map((att, i) => (
                          <a key={i} href={normalizeUrl(att)} target="_blank" className="flex items-center gap-1.5 text-xs font-medium bg-accent px-2 py-1 rounded hover:bg-yellow-500/10 hover:text-yellow-600 transition-colors truncate max-w-[200px]">
                            <FileText size={12}/> {att ? att.split(/[\\/]/).pop() : 'Attachment'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {achievements.length === 0 && !isAdding && (
          <div className="text-center p-12 border border-dashed border-border rounded-xl text-muted-foreground bg-card/50 backdrop-blur">
            No achievements logged yet. Celebrate your wins!
          </div>
        )}
      </div>

      {/* Achievement Details Modal */}
      {viewingAchievement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingAchievement(null)}></div>
          <div className="relative bg-card border border-border w-full max-w-4xl max-h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {viewingAchievement.photos && viewingAchievement.photos.length > 0 && (
              <div 
                className="h-64 w-full border-b border-border bg-accent/30 shrink-0 cursor-pointer group relative"
                onClick={() => { setSlideIndex(0); setSlideshowActive(true); }}
              >
                <img src={normalizeUrl(viewingAchievement.photos[0])} alt={viewingAchievement.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <PlayCircle size={48} className="text-white/80 drop-shadow-lg" />
                </div>
              </div>
            )}
            
            <button onClick={() => setViewingAchievement(null)} className="absolute top-4 right-4 p-2 bg-background/50 backdrop-blur rounded-full hover:bg-background/80 transition-colors z-10 text-foreground border border-border">
              <X size={20} />
            </button>

            <div 
              className={`p-6 md:p-10 overflow-y-auto scrollbar-thin ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              ref={(el) => {
                if (el && !el.onmousedown) {
                  let isDown = false;
                  let startY = 0;
                  let scrollTop = 0;
                  
                  el.onmousedown = (e) => {
                    isDown = true;
                    startY = e.pageY - el.offsetTop;
                    scrollTop = el.scrollTop;
                    el.classList.add('cursor-grabbing');
                    el.classList.remove('cursor-grab');
                  };
                  el.onmouseleave = () => {
                    isDown = false;
                    el.classList.remove('cursor-grabbing');
                    el.classList.add('cursor-grab');
                  };
                  el.onmouseup = () => {
                    isDown = false;
                    el.classList.remove('cursor-grabbing');
                    el.classList.add('cursor-grab');
                  };
                  el.onmousemove = (e) => {
                    if (!isDown) return;
                    e.preventDefault();
                    const y = e.pageY - el.offsetTop;
                    const walk = (y - startY) * 1.5;
                    el.scrollTop = scrollTop - walk;
                  };
                }
              }}
            >
              <div className="flex justify-between items-start mb-4 pr-12">
                <h2 className="text-3xl font-extrabold">{viewingAchievement.title}</h2>
                <div className="flex items-center gap-3">
                  {viewingAchievement.photos && viewingAchievement.photos.length > 0 && (
                    <button onClick={() => { setSlideIndex(0); setSlideshowActive(true) }} className="px-4 py-2 bg-yellow-500 text-white font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-yellow-500/20">
                      <PlayCircle size={18} /> Slideshow
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm font-bold text-yellow-600 uppercase tracking-wider mb-8">
                <Award size={18} /> {new Date(viewingAchievement.date).toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </div>

              <div className="mb-8">
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">About this achievement</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-a:text-yellow-500 hover:prose-a:text-yellow-600 whitespace-pre-wrap">
                  {viewingAchievement.description || <span className="text-muted-foreground italic">No description provided.</span>}
                </div>
              </div>

              {viewingAchievement.photos && viewingAchievement.photos.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Gallery</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {viewingAchievement.photos.map((img, i) => (
                      <div 
                        key={i} 
                        className="aspect-video rounded-xl overflow-hidden border border-border shadow-sm group relative cursor-pointer"
                        onClick={() => { setSlideIndex(i); setSlideshowActive(true); }}
                      >
                        <img src={normalizeUrl(img)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye size={32} className="text-white drop-shadow-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingAchievement.attachments && viewingAchievement.attachments.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Attachments</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingAchievement.attachments.map((att, i) => (
                      <a key={i} href={normalizeUrl(att)} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-yellow-500/10 hover:text-yellow-600 font-medium transition-colors border border-border shadow-sm">
                        <FileText size={18} /> {att ? att.split(/[\\/]/).pop() : 'Attachment'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slideshow Overlay */}
      {slideshowActive && viewingAchievement && viewingAchievement.photos && viewingAchievement.photos.length > 0 && createPortal(
        <div
          className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-1000"
          onMouseDown={() => setIsSlideshowPaused(true)}
          onMouseUp={() => setIsSlideshowPaused(false)}
          onMouseLeave={() => setIsSlideshowPaused(false)}
        >
          <button onClick={() => setSlideshowActive(false)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-colors z-10">
            <X size={32} />
          </button>
          <div className="absolute top-6 left-6 text-white text-xl font-black drop-shadow-md z-10 opacity-70">
            {slideIndex + 1} / {viewingAchievement.photos.length}
          </div>

          <div className="w-full h-full flex items-center justify-center relative p-12">
            <img 
              key={viewingAchievement.photos[slideIndex]} 
              src={normalizeUrl(viewingAchievement.photos[slideIndex])} 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-700" 
            />
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full text-white text-lg font-medium shadow-2xl">
              {viewingAchievement.title}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3D Success Overlay */}
      {showSuccessOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/30 via-background/80 to-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <style>{`
            @keyframes popAndRotateTrophy {
              0% { transform: scale(0) rotate(-45deg); opacity: 0; }
              50% { transform: scale(1.2) rotate(15deg); opacity: 1; }
              75% { transform: scale(0.9) rotate(-5deg); }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes floatUpFade {
              0% { transform: translate(0, 0) scale(0); opacity: 0; }
              20% { opacity: 1; scale: 1; }
              100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
            }
            @keyframes shineTrophy {
              0% { transform: translateX(-150%) skewX(-20deg); }
              100% { transform: translateX(250%) skewX(-20deg); }
            }
          `}</style>
          <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popAndRotateTrophy 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            {/* 3D Trophy SVG Base */}
            <svg width="240" height="300" viewBox="0 0 240 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              {/* Back shadows for 3D effect */}
              <path d="M 60 70 Q 120 280 180 70 Z" fill="#ca8a04" opacity="0.4" transform="rotate(-6 120 150)" />
              <path d="M 50 60 Q 120 280 190 60 Z" fill="#eab308" opacity="0.6" transform="rotate(-3 120 150)" />
              
              {/* Base pedestal */}
              <path d="M 90 260 L 150 260 L 170 290 L 70 290 Z" fill="#b45309" />
              <rect x="85" y="245" width="70" height="15" rx="2" fill="#d97706" />
              
              {/* Stem */}
              <rect x="110" y="200" width="20" height="45" fill="#facc15" />
              
              {/* Cup Bowl */}
              <path d="M 40 50 C 40 180, 200 180, 200 50 Z" fill="#fef08a" />
              <path d="M 40 50 C 40 180, 200 180, 200 50 Z" fill="none" stroke="#eab308" strokeWidth="8" />
              
              {/* Left Handle */}
              <path d="M 45 70 C 5 70, 5 130, 65 140" fill="none" stroke="#facc15" strokeWidth="12" strokeLinecap="round" />
              <path d="M 45 70 C 5 70, 5 130, 65 140" fill="none" stroke="#ca8a04" strokeWidth="12" strokeLinecap="round" opacity="0.3" transform="translate(3,3)" />

              {/* Right Handle */}
              <path d="M 195 70 C 235 70, 235 130, 175 140" fill="none" stroke="#facc15" strokeWidth="12" strokeLinecap="round" />
              <path d="M 195 70 C 235 70, 235 130, 175 140" fill="none" stroke="#ca8a04" strokeWidth="12" strokeLinecap="round" opacity="0.3" transform="translate(-3,3)" />
              
              {/* Cup Rim */}
              <ellipse cx="120" cy="50" rx="80" ry="20" fill="#fef9c3" stroke="#eab308" strokeWidth="6" />
              
              {/* Shiny Overlay */}
              <g style={{ clipPath: 'url(#trophyClip)' }}>
                <rect x="20" y="20" width="40" height="300" fill="white" opacity="0.4" style={{ animation: 'shineTrophy 3s infinite linear' }} />
              </g>
              <defs>
                <clipPath id="trophyClip">
                  <path d="M 40 50 C 40 180, 200 180, 200 50 Z" />
                </clipPath>
              </defs>
              
              {/* Star inside Cup */}
              <path d="M 120 70 L 128 95 L 155 95 L 133 110 L 140 135 L 120 120 L 100 135 L 107 110 L 85 95 L 112 95 Z" fill="#fbbf24" />
            </svg>

            {/* Flying Stars / Confetti */}
            {[...Array(15)].map((_, i) => {
              const angle = (i * 24 * Math.PI) / 180;
              const dist = 120 + Math.random() * 60;
              const tx = `${Math.cos(angle) * dist}px`;
              const ty = `${Math.sin(angle) * dist}px`;
              return (
                <svg 
                  key={`star-${i}`} 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className={`absolute top-1/2 left-1/2 -ml-3 -mt-16 ${i % 3 === 0 ? 'text-yellow-300' : i % 3 === 1 ? 'text-orange-400' : 'text-white'}`}
                  style={{
                    '--tx': tx,
                    '--ty': ty,
                    animation: `floatUpFade 1.5s ease-out forwards ${0.3 + Math.random() * 0.3}s`
                  } as React.CSSProperties}
                >
                  {i % 2 === 0 ? (
                    <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" fill="currentColor" />
                  ) : (
                    <circle cx="12" cy="12" r="8" fill="currentColor" />
                  )}
                </svg>
              )
            })}
            
            <h2 className="text-4xl font-extrabold text-yellow-600 dark:text-yellow-400 drop-shadow-lg tracking-tight text-center z-50">
              Achievement Unlocked!
            </h2>
          </div>
        </div>
      )}
    </div>
  )
}
