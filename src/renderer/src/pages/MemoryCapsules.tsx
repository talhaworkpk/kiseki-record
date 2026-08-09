import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Mail, Clock, Lock, Unlock, Send, MailOpen, FileText, CheckSquare, Square, Trash2, ArrowUp } from 'lucide-react'
import { MemoryCapsule } from '../types'
import { NotificationEngine } from '../lib/NotificationEngine'

const CountdownTimer = ({ targetDate }: { targetDate: number }) => {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, targetDate - Date.now()))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, targetDate - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (timeLeft <= 0) return <span className="text-pink-500 animate-pulse">READY TO OPEN</span>

  const hours = Math.floor(timeLeft / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  return (
    <span>
      {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')} LEFT
    </span>
  )
}

export default function MemoryCapsules() {
  const [capsules, setCapsules] = useState<MemoryCapsule[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [selectedCapsule, setSelectedCapsule] = useState<MemoryCapsule | null>(null)
  
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Form State
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [unlockDuration, setUnlockDuration] = useState<number>(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default to 1 month from now
  const [showBackToTop, setShowBackToTop] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      setIsDragging(true)
      setStartY(e.clientY)
      setScrollTop(scrollRef.current?.scrollTop || 0)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const deltaY = e.clientY - startY
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollTop - deltaY
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

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowBackToTop(scrollRef.current.scrollTop > 200)
    }
  }

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (!scrollRef.current) return
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        scrollRef.current.scrollTop -= 50
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollRef.current.scrollTop += 50
      }
    }
    window.addEventListener('keydown', handleWindowKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', handleWindowKeyDown)
  }, [])

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      containerRef.current.style.setProperty('--mouse-x', `${x}px`)
      containerRef.current.style.setProperty('--mouse-y', `${y}px`)
      
      const hue = Math.floor((x / 4 + y / 4) % 360)
      containerRef.current.style.setProperty('--spotlight-color', `hsl(${hue}, 100%, 70%)`)
    }
  }

  const loadData = async () => {
    try {
      // @ts-ignore
      const caps = await window.api.db.find('memoryCapsules', {})
      caps.sort((a: any, b: any) => b.createdAt - a.createdAt)
      setCapsules(caps)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const location = useLocation()
  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    if (highlightId && !loading && capsules.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`capsule-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [location.search, loading, capsules.length])

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) return

    const now = Date.now()

    const newCapsule: MemoryCapsule = {
      title,
      message,
      status: 'locked',
      unlockDate: unlockDuration,
      createdAt: now
    }

    try {
      // @ts-ignore
      await window.api.db.insert('memoryCapsules', newCapsule)
      loadData()
      NotificationEngine.notify('info', 'Memory Capsule Sealed', `Your message is locked until ${new Date(newCapsule.unlockDate).toLocaleDateString()}`, 'Memory Capsules')
      
      setShowSuccessOverlay(true)
      setTimeout(() => {
        setShowSuccessOverlay(false)
        setIsCreating(false)
        setTitle('')
        setMessage('')
      }, 3000)
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpen = async (capsule: MemoryCapsule) => {
    if (capsule.status === 'locked' && capsule.unlockDate > Date.now()) {
      NotificationEngine.notify('warning', 'Capsule Locked', `This capsule unlocks on ${new Date(capsule.unlockDate).toLocaleDateString()}`, 'Memory Capsules')
      return
    }

    try {
      if (capsule.status === 'locked' || capsule.status === 'unlocked') {
        // @ts-ignore
        await window.api.db.update('memoryCapsules', { _id: capsule._id }, { $set: { status: 'opened', openedAt: Date.now() } })
        loadData()
        setSelectedCapsule({ ...capsule, status: 'opened', openedAt: Date.now() })
      } else {
        setSelectedCapsule(capsule)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const bulkAction = async (action: string) => {
    try {
      if (action === 'delete') {
        if (!confirm(`Delete ${selectedIds.size} selected capsule(s)?`)) return
        const ids = Array.from(selectedIds)
        for (const id of ids) {
          // @ts-ignore
          await window.api.db.remove('memoryCapsules', { _id: id })
        }
        NotificationEngine.notify('info', 'Capsules Deleted', `${ids.length} capsule(s) deleted.`, 'Memory Capsules')
        setSelectedIds(new Set())
        setIsSelectionMode(false)
        loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return null

  return (
    <div 
      ref={containerRef}
      onMouseMove={(e) => {
        handleGlobalMouseMove(e)
        handleMouseMove(e)
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      className={`relative p-8 h-full flex flex-col animate-in fade-in duration-500 w-full overflow-hidden ${isDragging ? 'cursor-grabbing select-none' : ''}`}
    >
      {/* Flat Grid Background with Mouse Spotlight Glow */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-10"
          style={{
            backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '4rem 4rem',
          }}
        />
        <div 
          className="absolute inset-0 opacity-40 dark:opacity-60 transition-opacity mix-blend-screen pointer-events-none"
          style={{
            background: 'radial-gradient(350px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), var(--spotlight-color, hsl(300, 100%, 70%)), transparent 70%)'
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col h-full">
        <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Mail className="text-pink-500" /> 
            Memory Capsules
          </h1>
          <p className="text-muted-foreground mt-1">Send a message to your future self.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds(new Set()) }}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold border transition-colors ${isSelectionMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-accent'}`}
            title="Toggle Selection Mode"
          >
            {isSelectionMode ? <CheckSquare size={16}/> : <Square size={16}/>}
            Select
          </button>
          
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-pink-600 transition-colors shadow-sm"
          >
            <Send size={18} /> Seal a Capsule
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Toolbar */}
      <div className={`relative z-10 overflow-hidden transition-all duration-300 ease-in-out ${isSelectionMode ? 'max-h-20 opacity-100 border-b border-border bg-accent/50 mb-6 rounded-xl' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm bg-background px-3 py-1 rounded-lg border border-border shadow-sm">{selectedIds.size} Selected</span>
            
            <button 
              onClick={() => {
                if (selectedIds.size === capsules.length) setSelectedIds(new Set())
                else setSelectedIds(new Set(capsules.map(c => c._id!)))
              }} 
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
            >
              <CheckSquare size={14}/> {selectedIds.size === capsules.length && capsules.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => bulkAction('delete')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 disabled:opacity-50"><Trash2 size={14}/> Delete</button>
            <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()) }} className="ml-2 text-muted-foreground hover:text-foreground text-sm font-bold">Cancel</button>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-none outline-none relative pb-10"
      >
        {capsules.length === 0 && !isCreating ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-pink-500/10 text-pink-500 rounded-full flex items-center justify-center mb-6">
              <Clock size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">No memory capsules yet.</h3>
            <p className="text-muted-foreground mb-6 max-w-md">Write a letter to yourself and lock it away. It's a great way to reflect on your journey when you open it in the future.</p>
            <button onClick={() => setIsCreating(true)} className="px-6 py-2 bg-background border border-border hover:bg-accent font-bold rounded-xl transition-colors">Create First Capsule</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capsules.map(cap => {
              const isLocked = cap.status === 'locked'
              const timeRemaining = cap.unlockDate - Date.now()
              const exactDays = Math.floor(timeRemaining / (1000 * 60 * 60 * 24))
              
              const isSelected = selectedIds.has(cap._id!)
              
              return (
                <div 
                  key={cap._id} 
                  id={`capsule-${cap._id}`}
                  className={`relative p-6 rounded-2xl border transition-all duration-1000 ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : isLocked ? 'bg-background border-border' : cap.status === 'unlocked' ? 'bg-pink-500/10 border-pink-500/30 cursor-pointer hover:bg-pink-500/20 hover:shadow-md' : 'bg-card border-border cursor-pointer hover:shadow-sm hover:border-border/80'}`}
                  onClick={() => {
                    if (isSelectionMode) {
                      const s = new Set(selectedIds)
                      if (s.has(cap._id!)) s.delete(cap._id!)
                      else s.add(cap._id!)
                      setSelectedIds(s)
                    } else {
                      handleOpen(cap)
                    }
                  }}
                >
                  {isSelectionMode && (
                    <div className="absolute -top-3 -right-3 z-20">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-transparent hover:border-primary/50'}`}>
                        <CheckSquare size={16} className={isSelected ? 'block' : 'hidden'} />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLocked ? 'bg-accent text-muted-foreground' : cap.status === 'unlocked' ? 'bg-pink-500 text-white shadow-sm' : 'bg-primary/10 text-primary'}`}>
                      {isLocked ? <Lock size={20} /> : cap.status === 'unlocked' ? <Unlock size={20} /> : <MailOpen size={20} />}
                    </div>
                    {isLocked && (
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {timeRemaining <= 0 ? (
                          <span className="text-pink-500 animate-pulse">Ready to Open</span>
                        ) : exactDays > 0 ? (
                          `${exactDays} DAY${exactDays !== 1 ? 'S' : ''} LEFT`
                        ) : (
                          <CountdownTimer targetDate={cap.unlockDate} />
                        )}
                      </div>
                    )}
                    {cap.status === 'unlocked' && <div className="text-xs font-bold text-pink-500 bg-pink-500/10 px-2 py-1 rounded-md animate-pulse">Ready to Open</div>}
                    {cap.status === 'opened' && <div className="text-xs font-bold text-muted-foreground bg-accent px-2 py-1 rounded-md">Opened</div>}
                  </div>
                  
                  <h3 className={`text-lg font-bold mb-1 ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {isLocked ? '🔒 Secret Message' : cap.title}
                  </h3>
                  
                  <div className="text-sm text-muted-foreground mt-4 space-y-1">
                    <div className="flex justify-between">
                      <span>Sealed:</span>
                      <span className="font-medium text-foreground">{new Date(cap.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unlocks:</span>
                      <span className="font-medium text-foreground">{new Date(cap.unlockDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
          {showSuccessOverlay ? (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-500/30 via-background/80 to-background/95 backdrop-blur-sm animate-in fade-in duration-300">
              <style>{`
                @keyframes spinCapsule {
                  0% { transform: scale(0) rotate(180deg); opacity: 0; }
                  40% { transform: scale(1.1) rotate(-10deg); opacity: 1; }
                  60% { transform: scale(0.95) rotate(5deg); }
                  80% { transform: scale(1.05) rotate(-2deg); }
                  100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes floatUpFade {
                  0% { transform: translate(0, 0) scale(0); opacity: 0; }
                  20% { opacity: 1; scale: 1; }
                  100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
                }
                @keyframes pulseRing {
                  0% { transform: scale(0.9); opacity: 0.8; }
                  50% { transform: scale(1.1); opacity: 0.4; }
                  100% { transform: scale(0.9); opacity: 0.8; }
                }
                @keyframes lockSnap {
                  0% { transform: translateY(-20px); opacity: 0; }
                  50% { transform: translateY(5px); opacity: 1; }
                  100% { transform: translateY(0); opacity: 1; }
                }
              `}</style>
              <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'spinCapsule 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
                {/* 3D Time Capsule SVG */}
                <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                  {/* Glowing Aura Ring */}
                  <circle cx="120" cy="120" r="100" fill="none" stroke="#fbcfe8" strokeWidth="2" opacity="0.3" style={{ animation: 'pulseRing 3s ease-in-out infinite' }} />
                  <circle cx="120" cy="120" r="85" fill="none" stroke="#f472b6" strokeWidth="4" opacity="0.4" style={{ animation: 'pulseRing 3s ease-in-out infinite reverse' }} />
                  
                  {/* Back Shadow */}
                  <rect x="75" y="45" width="90" height="150" rx="45" fill="#831843" opacity="0.4" transform="translate(10, 10) rotate(-5 120 120)" />
                  <rect x="75" y="45" width="90" height="150" rx="45" fill="#be185d" opacity="0.6" transform="translate(5, 5) rotate(-2 120 120)" />
                  
                  {/* Capsule Bottom Half (Steel/Silver) */}
                  <path d="M 75 120 L 165 120 L 165 150 C 165 175, 145 195, 120 195 C 95 195, 75 175, 75 150 Z" fill="#94a3b8" />
                  <path d="M 75 120 L 120 120 L 120 195 C 95 195, 75 175, 75 150 Z" fill="#cbd5e1" opacity="0.5" />
                  
                  {/* Capsule Top Half (Pink Glass) */}
                  <path d="M 75 120 L 165 120 L 165 90 C 165 65, 145 45, 120 45 C 95 45, 75 65, 75 90 Z" fill="#ec4899" />
                  <path d="M 75 120 L 120 120 L 120 45 C 95 45, 75 65, 75 90 Z" fill="#f472b6" opacity="0.5" />
                  <path d="M 85 70 C 85 55, 95 48, 110 48" stroke="#fbcfe8" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
                  
                  {/* Center Joining Ring */}
                  <rect x="70" y="115" width="100" height="10" rx="5" fill="#334155" />
                  <rect x="70" y="115" width="100" height="4" rx="2" fill="#64748b" />
                  
                  {/* Digital Clock / Timer Screen on Bottom Half */}
                  <rect x="95" y="145" width="50" height="20" rx="4" fill="#0f172a" />
                  <text x="120" y="159" fontFamily="monospace" fontSize="10" fontWeight="bold" fill="#ec4899" textAnchor="middle" letterSpacing="1">00:00</text>
                  
                  {/* Falling Lock */}
                  <g style={{ animation: 'lockSnap 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.5s both' }}>
                    <rect x="105" y="105" width="30" height="26" rx="4" fill="#f59e0b" />
                    <rect x="105" y="105" width="30" height="26" rx="4" fill="#fbbf24" opacity="0.6" transform="translate(-2, -2)" />
                    <path d="M 112 105 L 112 95 C 112 90, 128 90, 128 95 L 128 105" fill="none" stroke="#d97706" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="120" cy="118" r="3" fill="#78350f" />
                    <path d="M 119 121 L 121 121 L 121 126 L 119 126 Z" fill="#78350f" />
                  </g>
                </svg>

                {/* Flying Particles */}
                {[...Array(15)].map((_, i) => {
                  const angle = (i * 24 * Math.PI) / 180;
                  const dist = 100 + Math.random() * 50;
                  const tx = `${Math.cos(angle) * dist}px`;
                  const ty = `${Math.sin(angle) * dist}px`;
                  return (
                    <svg 
                      key={`star-${i}`} 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      className={`absolute top-1/2 left-1/2 -ml-3 -mt-10 ${i % 3 === 0 ? 'text-pink-300' : i % 3 === 1 ? 'text-rose-400' : 'text-fuchsia-400'}`}
                      style={{
                        '--tx': tx,
                        '--ty': ty,
                        animation: `floatUpFade 1.5s ease-out forwards ${0.3 + Math.random() * 0.3}s`
                      } as React.CSSProperties}
                    >
                      {i % 2 === 0 ? (
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
                      ) : (
                        <rect x="10" y="10" width="4" height="4" rx="2" fill="currentColor" />
                      )}
                    </svg>
                  )
                })}
                
                <h2 className="text-4xl font-extrabold text-pink-500 drop-shadow-lg tracking-tight text-center z-50">
                  Capsule Sealed!
                </h2>
              </div>
            </div>
          ) : (
          <div className="bg-card w-full max-w-lg border border-border rounded-2xl shadow-2xl flex flex-col p-6 animate-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Send size={24} className="text-pink-500"/> Seal a New Capsule</h2>
            <p className="text-sm text-muted-foreground mb-6">Write a message to your future self. It will be completely locked until the date you choose.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold block uppercase tracking-wider text-muted-foreground mb-1.5">Title (Optional)</label>
                <input autoFocus type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Note to 30-year-old me" className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-500 transition-shadow"/>
              </div>
              
              <div>
                <label className="text-sm font-bold block uppercase tracking-wider text-muted-foreground mb-1.5">Message</label>
                <textarea 
                  value={message} onChange={e=>setMessage(e.target.value)}
                  placeholder="Dear future me, how are things going?..." 
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500 transition-shadow min-h-[150px] resize-y"
                ></textarea>
              </div>

              <div>
                <label className="text-sm font-bold block uppercase tracking-wider text-muted-foreground mb-1.5">Unlock Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={unlockDuration ? new Date(unlockDuration - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={e => setUnlockDuration(new Date(e.target.value).getTime())}
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-500 transition-shadow appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
              <button onClick={() => setIsCreating(false)} className="px-4 py-2 rounded-xl font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={!title.trim() || !message.trim()} className="px-6 py-2 rounded-xl font-bold bg-pink-500 text-white hover:bg-pink-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">Seal Capsule</button>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Viewing Modal */}
      {selectedCapsule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedCapsule(null)}>
          <div className="bg-card w-full max-w-2xl border border-border rounded-2xl shadow-2xl flex flex-col p-8 animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-12 h-12 bg-pink-500/10 text-pink-500 rounded-xl flex items-center justify-center shrink-0">
                <MailOpen size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">{selectedCapsule.title}</h2>
                <p className="text-sm text-muted-foreground font-medium">Sealed on {new Date(selectedCapsule.createdAt).toLocaleDateString()} • Opened {selectedCapsule.openedAt ? new Date(selectedCapsule.openedAt).toLocaleDateString() : 'Just now'}</p>
              </div>
            </div>
            
            <div className="prose prose-sm dark:prose-invert max-w-none break-words min-h-[200px] whitespace-pre-wrap text-foreground/90 leading-relaxed text-base">
              {selectedCapsule.message}
            </div>

            <div className="mt-8 flex justify-end pt-4 border-t border-border">
              <button onClick={() => setSelectedCapsule(null)} className="px-6 py-2 rounded-xl font-bold bg-accent text-foreground hover:bg-accent/80 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        className={`absolute bottom-8 right-8 p-3 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 z-50 hover:bg-primary/90 hover:scale-105 active:scale-95 ${showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
        title="Back to Top"
      >
        <ArrowUp size={20} />
      </button>
    </div>
  )
}
