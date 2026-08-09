import React, { useState, useEffect } from 'react'
import { CalendarMemory } from '../../types'
import { X, Calendar as CalendarIcon, Paperclip, Edit, Trash2, Image as ImageIcon, FileText, Music, Play, Pause, Film } from 'lucide-react'
import TipTapEditor from '../ResumeEditor/TipTapEditor'

interface CalendarMemoryModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: { month: number, day: number } | null
  memories: CalendarMemory[]
  onSave: () => void
}

export function CalendarMemoryModal({ isOpen, onClose, selectedDate, memories, onSave }: CalendarMemoryModalProps) {
  const [activeMemory, setActiveMemory] = useState<CalendarMemory | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  
  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (memories.length === 1) {
        openMemory(memories[0])
      } else if (memories.length > 1) {
        setActiveMemory(null)
        setIsEditing(false)
      } else {
        startNewMemory()
      }
    } else {
      setActiveMemory(null)
      setIsEditing(false)
      setPlayingAudio(null)
    }
  }, [isOpen, memories])

  const openMemory = (m: CalendarMemory) => {
    setActiveMemory(m)
    setIsEditing(false)
    setTitle(m.title)
    setDescription(m.description || '')
    setAttachments(m.attachments || [])
  }

  const startNewMemory = () => {
    setActiveMemory(null)
    setIsEditing(true)
    setTitle('')
    setDescription('')
    setAttachments([])
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleUpload = async () => {
    try {
      // @ts-ignore
      const result = await window.api.attachment.add()
      if (result.success && result.files && result.files.length > 0) {
        const newAttachments = result.files.map((f: any) => f.filePath)
        setAttachments([...attachments, ...newAttachments])
      }
    } catch(e) { console.error(e) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !selectedDate) return

    const memoryData = {
      title,
      description,
      month: selectedDate.month,
      day: selectedDate.day,
      createdYear: activeMemory ? activeMemory.createdYear : new Date().getFullYear(),
      attachments,
      originalCreatedAt: activeMemory ? activeMemory.originalCreatedAt : Date.now(),
      updatedAt: Date.now()
    }

    try {
      if (activeMemory && activeMemory._id) {
        // @ts-ignore
        await window.api.db.update('calendarMemories', { _id: activeMemory._id }, { $set: memoryData })
      } else {
        // @ts-ignore
        await window.api.db.insert('calendarMemories', memoryData)
      }
      onSave()
      
      setShowSuccessOverlay(true)
      setTimeout(() => {
        setShowSuccessOverlay(false)
        if (activeMemory) {
          setIsEditing(false)
        } else {
          onClose()
        }
      }, 3000)
    } catch(err) { console.error(err) }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!activeMemory || !activeMemory._id) return

    if (confirm('Delete this Annual Memory?\nThis will remove the memory and stop its yearly notifications.')) {
      try {
        // @ts-ignore
        await window.api.db.remove('calendarMemories', { _id: activeMemory._id })
        onSave()
        onClose()
      } catch(err) { console.error(err) }
    }
  }

  const isAudio = (path: string) => path.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)
  const isImage = (path: string) => path.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i)
  const isVideo = (path: string) => path.match(/\.(mp4|webm|mkv|avi|mov)$/i)
  const isDocument = (path: string) => !isAudio(path) && !isImage(path) && !isVideo(path)

  const getSafeUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('file:///')) {
      const pathPart = url.slice(8)
      return 'local-media://' + encodeURIComponent(pathPart).replace(/%2F/g, '/').replace(/%3A/g, ':')
    }
    return url
  }

  const toggleAudio = (path: string, index: number) => {
    const audioEl = document.getElementById(`audio-${index}`) as HTMLAudioElement
    if (!audioEl) return

    if (playingAudio === path) {
      audioEl.pause()
      setPlayingAudio(null)
    } else {
      // Pause any existing playing audio
      if (playingAudio) {
        const currentIndex = attachments.filter(isAudio).indexOf(playingAudio)
        const currentEl = document.getElementById(`audio-${currentIndex}`) as HTMLAudioElement
        if (currentEl) currentEl.pause()
      }
      setPlayingAudio(path)
      audioEl.play().catch(e => {
        console.error("Audio play failed:", e)
        setPlayingAudio(null)
      })
      // Automatically reset when finished
      audioEl.onended = () => setPlayingAudio(null)
    }
  }

  if (!isOpen) return null

  const monthName = selectedDate ? new Date(2024, selectedDate.month - 1).toLocaleString('default', { month: 'long' }) : ''
  const displayDate = selectedDate ? `${monthName} ${selectedDate.day}` : ''

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {showSuccessOverlay ? (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/30 via-background/90 to-background/95 backdrop-blur-md animate-in fade-in duration-300">
            <style>{`
              @keyframes bounceCalendar {
                0% { transform: scale(0) translateY(50px); opacity: 0; }
                50% { transform: scale(1.1) translateY(-10px); opacity: 1; }
                70% { transform: scale(0.95) translateY(5px); }
                100% { transform: scale(1) translateY(0); opacity: 1; }
              }
              @keyframes floatUpFade {
                0% { transform: translate(0, 0) scale(0); opacity: 0; }
                20% { opacity: 1; scale: 1; }
                100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
              }
              @keyframes heartBeat {
                0% { transform: scale(1); }
                15% { transform: scale(1.3); }
                30% { transform: scale(1); }
                45% { transform: scale(1.3); }
                60% { transform: scale(1); }
              }
              @keyframes pageFlip {
                0% { transform: rotateX(0deg); opacity: 1; }
                50% { transform: rotateX(-90deg); opacity: 0.5; }
                100% { transform: rotateX(-180deg); opacity: 0; }
              }
            `}</style>
            <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'bounceCalendar 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
              {/* 3D Calendar SVG */}
              <svg width="220" height="220" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                {/* Back Shadow */}
                <rect x="30" y="50" width="180" height="170" rx="20" fill="#312e81" opacity="0.4" transform="translate(10, 15) rotate(-5 120 120)" />
                
                {/* Main Body (Pages) */}
                <rect x="30" y="50" width="180" height="170" rx="20" fill="#f8fafc" />
                <rect x="35" y="100" width="170" height="115" rx="15" fill="#f1f5f9" />
                
                {/* Calendar Header (Primary Color) */}
                <path d="M 30 70 C 30 58.95 38.95 50 50 50 L 190 50 C 201.05 50 210 58.95 210 70 L 210 95 L 30 95 L 30 70 Z" fill="hsl(var(--primary))" />
                
                {/* Spiral Bindings */}
                {[60, 100, 140, 180].map((cx, i) => (
                  <g key={i}>
                    <rect x={cx - 5} y="35" width="10" height="30" rx="5" fill="#94a3b8" />
                    <rect x={cx - 3} y="37" width="6" height="26" rx="3" fill="#cbd5e1" />
                    <circle cx={cx} cy="60" r="4" fill="#0f172a" opacity="0.3" />
                  </g>
                ))}
                
                {/* Animated Flipping Page */}
                <g style={{ transformOrigin: '120px 95px', animation: 'pageFlip 2.5s infinite ease-in-out', perspective: '1000px' }}>
                  <rect x="30" y="95" width="180" height="125" rx="20" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
                </g>
                
                {/* Date Grid */}
                <g opacity="0.5">
                  {[120, 150, 180].map((y, yi) => (
                    [60, 95, 130, 165].map((x, xi) => (
                      <rect key={`${yi}-${xi}`} x={x} y={y} width="15" height="15" rx="3" fill="#cbd5e1" />
                    ))
                  ))}
                </g>
                
                {/* Highlighted Heart/Date */}
                <g style={{ transformOrigin: '120px 150px', animation: 'heartBeat 2s infinite ease-in-out 1s' }}>
                  <rect x="110" y="140" width="30" height="30" rx="8" fill="hsl(var(--primary))" opacity="0.2" />
                  <path d="M125 162L123.55 160.68C118.3 155.91 115 152.92 115 149.25C115 146.26 117.36 143.9 120.35 143.9C122.04 143.9 123.66 144.69 125 145.92C126.34 144.69 127.96 143.9 129.65 143.9C132.64 143.9 135 146.26 135 149.25C135 152.92 131.7 155.91 126.45 160.69L125 162Z" fill="hsl(var(--primary))" />
                </g>
              </svg>

              {/* Flying Particles */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const dist = 90 + Math.random() * 40;
                const tx = `${Math.cos(angle) * dist}px`;
                const ty = `${Math.sin(angle) * dist}px`;
                return (
                  <svg 
                    key={`star-${i}`} 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="absolute top-1/2 left-1/2 -ml-3 -mt-10 text-primary"
                    style={{
                      '--tx': tx,
                      '--ty': ty,
                      animation: `floatUpFade 1.2s ease-out forwards ${0.2 + Math.random() * 0.3}s`
                    } as React.CSSProperties}
                  >
                    {i % 2 === 0 ? (
                      <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" fill="currentColor" />
                    ) : (
                      <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.6" />
                    )}
                  </svg>
                )
              })}
              
              <h2 className="text-4xl font-extrabold text-primary drop-shadow-lg tracking-tight text-center z-50">
                Memory Saved!
              </h2>
            </div>
          </div>
        ) : null}

        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card z-10 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon size={20} className="text-primary" />
            {displayDate}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {activeMemory === null && !isEditing ? (
            // List Memories
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Annual Memories</h3>
                <button onClick={startNewMemory} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:scale-105 transition-transform">
                  + Add Memory
                </button>
              </div>
              {memories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No memories saved for this date yet.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {memories.map(m => (
                    <button 
                      key={m._id} 
                      onClick={() => openMemory(m)}
                      className="text-left p-4 rounded-xl border border-border bg-accent/50 hover:bg-accent hover:border-primary/50 transition-all group"
                    >
                      <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{m.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Created in {m.createdYear}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : isEditing ? (
            // Edit Mode
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-6 flex-1">
              <div>
                <label htmlFor="memory-title" className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Title</label>
                <input id="memory-title" required autoFocus value={title} onChange={e=>setTitle(e.target.value)} type="text" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. First Day at University" />
              </div>

              <div className="flex-1 flex flex-col min-h-[200px]">
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Description</label>
                <div className="flex-1 border border-border rounded-xl bg-background overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-primary/50">
                  <div className="flex-1 overflow-y-auto p-4 prose dark:prose-invert text-foreground max-w-none prose-sm">
                    <TipTapEditor content={description} onChange={setDescription} placeholder="Write down the details of this memory..." />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block"><Paperclip size={14} className="inline mr-1 -mt-0.5"/> Attachments</label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((a, i) => (
                    <div key={i} className="relative group w-20 h-20 rounded-xl border border-border overflow-hidden bg-accent flex items-center justify-center">
                      {isImage(a) ? (
                        <img src={a} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center p-2 text-center">
                          {isAudio(a) ? <Music size={20} className="text-blue-500 mb-1" /> : isVideo(a) ? <Film size={20} className="text-purple-500 mb-1" /> : <FileText size={20} className="text-orange-500 mb-1" />}
                          <span className="text-[10px] font-bold break-all line-clamp-2 leading-tight">{a.split(/[\/\\]/).pop()}</span>
                        </div>
                      )}
                      <button type="button" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={16}/>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={handleUpload} className="w-20 h-20 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-accent transition-colors hover:text-foreground">
                    <Paperclip size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">Add</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            // Read Mode
            <div className="p-6 flex flex-col gap-8 flex-1">
              <div className="border-l-4 border-primary pl-4 py-1">
                <h3 className="text-2xl font-bold text-foreground">{title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span><span className="font-bold">Original Date:</span> {displayDate}, {activeMemory?.createdYear}</span>
                  <span><span className="font-bold">Annual Date:</span> {displayDate}</span>
                </div>
              </div>

              {description && (
                <div className="prose dark:prose-invert text-foreground max-w-none prose-sm bg-accent/30 p-5 rounded-2xl border border-border/50" dangerouslySetInnerHTML={{ __html: description }} />
              )}

              {attachments.length > 0 && (
                <div className="space-y-6">
                  {/* Images */}
                  {attachments.filter(isImage).length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2"><ImageIcon size={16} /> Photos</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {attachments.filter(isImage).map((img, i) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border shadow-sm cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
                            // @ts-ignore
                            if (window.api && window.api.fs) window.api.fs.open(img)
                          }}>
                            <img src={getSafeUrl(img)} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audio */}
                  {attachments.filter(isAudio).length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2"><Music size={16} /> Audio</h4>
                      <div className="grid gap-2">
                        {attachments.filter(isAudio).map((aud, i) => {
                          const filename = aud.split(/[\/\\]/).pop()
                          return (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-accent/30">
                              <button onClick={() => toggleAudio(aud, i)} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md hover:scale-105 transition-transform">
                                {playingAudio === aud ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{filename}</p>
                              </div>
                              <audio src={getSafeUrl(aud)} className="hidden" id={`audio-${i}`} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Video */}
                  {attachments.filter(isVideo).length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2"><Film size={16} /> Video</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {attachments.filter(isVideo).map((vid, i) => (
                          <div key={i} className="rounded-xl overflow-hidden border border-border shadow-sm bg-black">
                            <video src={getSafeUrl(vid)} controls className="w-full h-auto max-h-[300px] object-contain" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {attachments.filter(isDocument).length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2"><FileText size={16} /> Files</h4>
                      <div className="grid gap-2">
                        {attachments.filter(isDocument).map((doc, i) => {
                          const filename = doc.split(/[\/\\]/).pop()
                          return (
                            <button key={i} onClick={() => {
                              // @ts-ignore
                              if (window.api && window.api.fs) window.api.fs.open(doc)
                            }} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-accent/30 hover:bg-accent transition-colors text-left group">
                              <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                                <FileText size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{filename}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Click to open</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing ? (
          <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-card shrink-0">
            {activeMemory ? (
              <button type="button" onClick={handleDelete} className="text-red-500 font-bold hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors flex items-center gap-2">
                <Trash2 size={16} /> Delete
              </button>
            ) : <div></div>}
            <div className="flex gap-3">
              <button type="button" onClick={() => activeMemory ? setIsEditing(false) : onClose()} className="px-6 py-2.5 rounded-xl font-bold hover:bg-accent transition-colors">Cancel</button>
              <button type="button" onClick={handleSave} className="px-6 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                {activeMemory ? 'Save Changes' : 'Save Memory'}
              </button>
            </div>
          </div>
        ) : activeMemory ? (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-card shrink-0">
            {memories.length > 1 && (
              <button type="button" onClick={() => setActiveMemory(null)} className="px-6 py-2.5 rounded-xl font-bold hover:bg-accent transition-colors mr-auto">
                Back to List
              </button>
            )}
            <button type="button" onClick={handleEdit} className="px-6 py-2.5 rounded-xl font-bold bg-accent text-foreground hover:bg-primary/20 hover:text-primary transition-colors flex items-center gap-2">
              <Edit size={16} /> Edit Memory
            </button>
          </div>
        ) : null}

      </div>
    </div>
  )
}
