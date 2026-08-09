import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Person } from '../types'
import { Search, Plus, User, Calendar, Heart, MoreVertical, Upload, Download } from 'lucide-react'
import { normalizeUrl } from '../lib/utils'
import { NotificationEngine } from '../lib/NotificationEngine'

export default function Relationships() {
  const navigate = useNavigate()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [sortBy, setSortBy] = useState('Updated')
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [showGlobalMenu, setShowGlobalMenu] = useState(false)
  const [form, setForm] = useState<Partial<Person>>({})
  useEffect(() => {
    fetchPeople()
  }, [])
  const fetchPeople = async () => {
    setLoading(true)
    try {
      // @ts-ignore
      const data = await window.api.db.find('relationships', {})
      setPeople(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportAll = async () => {
    try {
      // @ts-ignore
      const allRecords = await window.api.db.find('records', {})
      const data = { relationships: people, records: allRecords }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kiseki_all_relationships.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch(err) { console.error(err) }
  }

  const handleImportAll = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (data.relationships && Array.isArray(data.relationships)) {
            const idMap = new Map<string, string>()
            for (const person of data.relationships) {
              const oldId = person._id
              const copy = { ...person, _id: undefined, createdAt: Date.now(), updatedAt: Date.now() }
              
              if (typeof copy.notes === 'string') {
                copy.notes = [{ _id: Date.now().toString(), content: copy.notes, createdAt: Date.now(), isPinned: false }]
              } else if (!copy.notes) {
                copy.notes = []
              }

              // @ts-ignore
              const newPerson = await window.api.db.insert('relationships', copy)
              if (oldId) idMap.set(oldId, newPerson._id)
            }
            if (data.records && Array.isArray(data.records)) {
               for (const record of data.records) {
                 const newPeople = (record.people || []).map((pId: string) => idMap.get(pId) || pId)
                 const copyRecord = { ...record, _id: undefined, people: newPeople, createdAt: Date.now(), updatedAt: Date.now() }
                 // @ts-ignore
                 await window.api.db.insert('records', copyRecord)
               }
            }
            fetchPeople()
            alert('Import successful.')
          } else {
            alert('Invalid export file format.')
          }
        } catch (err) {
          alert('Failed to parse file.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleImportPerson = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (data.person) {
            const oldId = data.person._id
            const copy = { ...data.person, _id: undefined, createdAt: Date.now(), updatedAt: Date.now() }
            
            if (typeof copy.notes === 'string') {
              copy.notes = [{ _id: Date.now().toString(), content: copy.notes, createdAt: Date.now(), isPinned: false }]
            } else if (!copy.notes) {
              copy.notes = []
            }

            // @ts-ignore
            const newPerson = await window.api.db.insert('relationships', copy)
            
            if (data.records && Array.isArray(data.records)) {
              for (const record of data.records) {
                const newPeople = (record.people || []).map((pId: string) => pId === oldId ? newPerson._id : pId)
                const copyRecord = { ...record, _id: undefined, people: newPeople, createdAt: Date.now(), updatedAt: Date.now() }
                // @ts-ignore
                await window.api.db.insert('records', copyRecord)
              }
            }
            fetchPeople()
            alert('Imported person and their records.')
          } else {
            alert('Invalid person export file.')
          }
        } catch (err) {
          alert('Failed to parse file.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleAttachImage = async () => {
    try {
      // @ts-ignore
      const result = await window.api.attachment.add()
      if (result.success && result.files && result.files.length > 0) {
        setForm(prev => ({ ...prev, profilePicture: result.files[0].filePath }))
      }
    } catch (err) { console.error(err) }
  }

  const savePerson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) return
    const now = Date.now()
    
    const newPerson: Person = {
      name: form.name,
      nickname: form.nickname || '',
      profilePicture: form.profilePicture || '',
      gender: form.gender || '',
      birthday: form.birthday || '',
      phone: form.phone || '',
      email: form.email || '',
      address: form.address || '',
      occupation: form.occupation || '',
      relationshipType: form.relationshipType || 'Friend',
      relationshipStarted: form.relationshipStarted || '',
      bio: form.bio || '',
      notes: form.notes ? [{ _id: Date.now().toString(), content: (form.notes as unknown as string), createdAt: Date.now(), isPinned: false }] : [],
      tags: form.tags || [],
      location: form.location || '',
      socialLinks: form.socialLinks || {},
      relationshipScore: form.relationshipScore || 50,
      lastInteraction: now,
      createdAt: now,
      updatedAt: now
    }
    
    try {
      // @ts-ignore
      await window.api.db.insert('relationships', newPerson)
      NotificationEngine.notify('success', 'Person Added', `You added "${form.name}" to your relationships.`, 'Relationships')
      fetchPeople()
      
      setShowSuccessOverlay(true)
      setTimeout(() => {
        setShowSuccessOverlay(false)
        setShowAddModal(false)
        setForm({})
      }, 3000)
    } catch (err) { console.error(err) }
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

  const relTypes = ['All', 'Family', 'Friend', 'Best Friend', 'Partner', 'Wife', 'Husband', 'Crush', 'Classmate', 'Coworker', 'Teacher', 'Student', 'Neighbor', 'Online Friend', 'Client', 'Relative', 'Other']

  let filtered = people.filter(p => (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
  if (filterType !== 'All') {
    filtered = filtered.filter(p => p.relationshipType === filterType)
  }
  
  if (sortBy === 'Updated') {
    filtered.sort((a, b) => b.updatedAt - a.updatedAt)
  } else if (sortBy === 'Closest') {
    filtered.sort((a, b) => b.relationshipScore - a.relationshipScore)
  } else if (sortBy === 'Alphabetical') {
    filtered.sort((a, b) => a.name.localeCompare(b.name))
  }

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 relative overflow-hidden">
      <style>{`
        @keyframes float-heart {
          0% { transform: translateY(100vh) scale(0.5) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          80% { opacity: 0.6; }
          100% { transform: translateY(-20vh) scale(1.5) rotate(45deg); opacity: 0; }
        }
        @keyframes wave-ribbon {
          0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.6; }
          50% { transform: translateY(10px) scaleY(1.05); opacity: 0.9; }
        }
      `}</style>
      
      {/* 3D Ambient Background - Love/Cute (Hearts & Ribbons) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Soft blush background gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 via-pink-500/5 to-transparent dark:from-rose-900/20 dark:via-pink-900/10" />

        {/* Decorative Ribbons (Wavy SVG) */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute bottom-0 w-full h-[50vh] opacity-70">
          <defs>
            <linearGradient id="ribbon-grad-rose" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" /> {/* rose-500 */}
              <stop offset="50%" stopColor="#fb7185" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#fda4af" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ribbon-grad-pink" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" /> {/* pink-500 */}
              <stop offset="50%" stopColor="#f472b6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#fbcfe8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 0 100 Q 25 20 50 80 T 100 0 L 100 100 Z" fill="url(#ribbon-grad-rose)" className="animate-[wave-ribbon_10s_ease-in-out_infinite]" style={{ transformOrigin: 'bottom' }} />
          <path d="M 0 100 Q 35 40 70 60 T 100 10 L 100 100 Z" fill="url(#ribbon-grad-pink)" className="animate-[wave-ribbon_14s_ease-in-out_infinite]" style={{ animationDelay: '2s', transformOrigin: 'bottom' }} />
        </svg>

        {/* Floating Hearts */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <svg 
              key={`heart-rose-${i}`}
              viewBox="0 0 24 24" 
              className="absolute drop-shadow-md text-rose-400"
              style={{
                width: `${12 + Math.random() * 16}px`,
                height: `${12 + Math.random() * 16}px`,
                left: `${Math.random() * 100}%`,
                animation: `float-heart ${15 + Math.random() * 20}s linear infinite`,
                animationDelay: `${Math.random() * 15}s`,
                fill: 'currentColor'
              }}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          ))}
          {[...Array(15)].map((_, i) => (
            <svg 
              key={`heart-pink-${i}`}
              viewBox="0 0 24 24" 
              className="absolute drop-shadow-md text-pink-300"
              style={{
                width: `${8 + Math.random() * 12}px`,
                height: `${8 + Math.random() * 12}px`,
                left: `${Math.random() * 100}%`,
                animation: `float-heart ${18 + Math.random() * 25}s linear infinite`,
                animationDelay: `${Math.random() * 20}s`,
                fill: 'currentColor'
              }}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          ))}
        </div>
      </div>

      <div className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between shrink-0 relative z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <User className="text-primary" size={20} /> Relationships
        </h1>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="pl-9 pr-4 py-1.5 text-sm rounded-full border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="p-1.5 text-sm rounded-md border border-border bg-background outline-none">
            {relTypes.map(t => <option key={t}>{t}</option>)}
          </select>
          
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="p-1.5 text-sm rounded-md border border-border bg-background outline-none">
            <option value="Updated">Recently Updated</option>
            <option value="Closest">Closest</option>
            <option value="Alphabetical">Alphabetical</option>
          </select>

          <button onClick={() => { setForm({}); setShowAddModal(true); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2">
            <Plus size={20} /> Add Person
          </button>
          
          <div className="relative">
             <button onClick={() => setShowGlobalMenu(!showGlobalMenu)} className="p-2 bg-card border border-border rounded-lg hover:bg-accent"><MoreVertical size={20}/></button>
             {showGlobalMenu && (
               <div className="absolute right-0 top-12 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                 <button onClick={() => { handleImportPerson(); setShowGlobalMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"><Upload size={16}/> Import Person</button>
                 <button onClick={() => { handleImportAll(); setShowGlobalMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"><Upload size={16}/> Import All</button>
                 <button onClick={() => { handleExportAll(); setShowGlobalMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"><Download size={16}/> Export All</button>
               </div>
             )}
          </div>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto p-6 relative z-10 scrollbar-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {loading ? (
          <div className="flex justify-center text-muted-foreground mt-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground h-64 border-2 border-dashed border-border rounded-xl">
            <User size={48} className="mb-4 opacity-20" />
            <p>No people found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(person => (
              <div 
                key={person._id} 
                onClick={() => navigate(`/relationships/${person._id}`)}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer relative group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center overflow-hidden shrink-0">
                    {person.profilePicture ? <img src={normalizeUrl(person.profilePicture)} className="w-full h-full object-cover"/> : <User size={24} className="text-muted-foreground"/>}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{person.name}</h3>
                    <span className="text-sm bg-accent text-accent-foreground px-2 py-0.5 rounded-full inline-block mt-1">{person.relationshipType}</span>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between items-center bg-background rounded p-2 border border-border">
                    <span className="flex items-center gap-1"><Heart size={14} className="text-destructive fill-destructive"/> Score</span>
                    <span className="font-bold text-foreground">{person.relationshipScore}</span>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <span className="flex items-center gap-1"><Calendar size={14}/> Last Interaction</span>
                    <span>{person.lastInteraction ? new Date(person.lastInteraction).toLocaleDateString() : 'Never'}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border text-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Open Profile →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          {showSuccessOverlay ? (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-500/30 via-background/80 to-background/95 backdrop-blur-sm animate-in fade-in duration-300">
              <style>{`
                @keyframes popAndBeatHeart {
                  0% { transform: scale(0) rotate(-15deg); opacity: 0; }
                  30% { transform: scale(1.2) rotate(10deg); opacity: 1; }
                  50% { transform: scale(0.95) rotate(-5deg); }
                  70% { transform: scale(1.1) rotate(5deg); }
                  100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes floatUpFade {
                  0% { transform: translate(0, 0) scale(0); opacity: 0; }
                  20% { opacity: 1; scale: 1; }
                  100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
                }
                @keyframes shineHeart {
                  0% { transform: translateX(-150%) skewX(-20deg); }
                  100% { transform: translateX(250%) skewX(-20deg); }
                }
              `}</style>
              <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popAndBeatHeart 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
                {/* 3D Heart SVG */}
                <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                  {/* Back Shadow */}
                  <path d="M 120 210 C 120 210, 20 140, 20 75 C 20 40, 50 15, 85 15 C 105 15, 120 30, 120 30 C 120 30, 135 15, 155 15 C 190 15, 220 40, 220 75 C 220 140, 120 210, 120 210 Z" fill="#881337" opacity="0.4" transform="translate(10, 15) rotate(-5 120 120)" />
                  <path d="M 120 210 C 120 210, 20 140, 20 75 C 20 40, 50 15, 85 15 C 105 15, 120 30, 120 30 C 120 30, 135 15, 155 15 C 190 15, 220 40, 220 75 C 220 140, 120 210, 120 210 Z" fill="#9f1239" opacity="0.6" transform="translate(5, 8) rotate(-2 120 120)" />
                  
                  {/* Main Heart */}
                  <path d="M 120 210 C 120 210, 20 140, 20 75 C 20 40, 50 15, 85 15 C 105 15, 120 30, 120 30 C 120 30, 135 15, 155 15 C 190 15, 220 40, 220 75 C 220 140, 120 210, 120 210 Z" fill="#e11d48" />
                  
                  {/* Inner Highlight Volume */}
                  <path d="M 120 190 C 120 190, 35 130, 35 75 C 35 45, 60 25, 85 25 C 100 25, 120 40, 120 40 C 120 40, 140 25, 155 25 C 180 25, 205 45, 205 75 C 205 130, 120 190, 120 190 Z" fill="#f43f5e" opacity="0.8" />
                  
                  {/* Top Gloss Curve */}
                  <path d="M 45 65 C 45 40, 65 25, 85 25 C 95 25, 110 32, 120 40 C 100 50, 75 75, 60 100 C 50 85, 45 75, 45 65 Z" fill="#fb7185" opacity="0.9" />
                  
                  {/* Shiny Overlay */}
                  <g style={{ clipPath: 'url(#heartClip)' }}>
                    <rect x="0" y="0" width="50" height="240" fill="white" opacity="0.25" style={{ animation: 'shineHeart 3s infinite linear' }} />
                  </g>
                  <defs>
                    <clipPath id="heartClip">
                      <path d="M 120 210 C 120 210, 20 140, 20 75 C 20 40, 50 15, 85 15 C 105 15, 120 30, 120 30 C 120 30, 135 15, 155 15 C 190 15, 220 40, 220 75 C 220 140, 120 210, 120 210 Z" />
                    </clipPath>
                  </defs>
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
                      className={`absolute top-1/2 left-1/2 -ml-3 -mt-10 ${i % 3 === 0 ? 'text-rose-300' : i % 3 === 1 ? 'text-pink-400' : 'text-white'}`}
                      style={{
                        '--tx': tx,
                        '--ty': ty,
                        animation: `floatUpFade 1.5s ease-out forwards ${0.3 + Math.random() * 0.3}s`
                      } as React.CSSProperties}
                    >
                      {i % 2 === 0 ? (
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
                      ) : (
                        <rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor" />
                      )}
                    </svg>
                  )
                })}
                
                <h2 className="text-4xl font-extrabold text-rose-500 drop-shadow-lg tracking-tight text-center z-50">
                  Person Added!
                </h2>
              </div>
            </div>
          ) : (
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">Add Person</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form id="add-person-form" onSubmit={savePerson} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-accent flex flex-col items-center justify-center overflow-hidden shrink-0 border border-border relative group cursor-pointer" onClick={handleAttachImage}>
                  {form.profilePicture ? (
                    <img src={normalizeUrl(form.profilePicture)} className="w-full h-full object-cover"/>
                  ) : (
                    <User size={32} className="text-muted-foreground"/>
                  )}
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs text-center p-2">
                    Upload<br/>Image
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input autoFocus type="text" required value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nickname</label>
                      <input type="text" value={form.nickname || ''} onChange={e => setForm({...form, nickname: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Gender</label>
                      <input type="text" value={form.gender || ''} onChange={e => setForm({...form, gender: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Relationship Type</label>
                  <select value={form.relationshipType || 'Friend'} onChange={e => setForm({...form, relationshipType: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background">
                    {relTypes.filter(t => t !== 'All').map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Relationship Started</label>
                  <input type="date" value={form.relationshipStarted || ''} onChange={e => setForm({...form, relationshipStarted: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Birthday</label><input type="date" value={form.birthday || ''} onChange={e => setForm({...form, birthday: e.target.value})} className="w-full p-2 rounded border border-border bg-background" /></div>
                <div><label className="block text-sm font-medium mb-1">Occupation</label><input type="text" value={form.occupation || ''} onChange={e => setForm({...form, occupation: e.target.value})} className="w-full p-2 rounded border border-border bg-background" /></div>
                <div><label className="block text-sm font-medium mb-1">Phone</label><input type="tel" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2 rounded border border-border bg-background" /></div>
                <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-2 rounded border border-border bg-background" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Address / Location</label><input type="text" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} className="w-full p-2 rounded border border-border bg-background" /></div>
              </div>

              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea value={form.bio || ''} onChange={e => setForm({...form, bio: e.target.value})} className="w-full p-2 h-24 rounded-md border border-border bg-background outline-none whitespace-pre-wrap placeholder:text-muted-foreground" placeholder="Met at university. Very supportive. Loves traveling..." />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Private Notes</label>
                <textarea value={(form.notes as unknown as string) || ''} onChange={e => setForm({...form, notes: e.target.value as any})} className="w-full p-2 h-20 rounded-md border border-border bg-accent text-accent-foreground outline-none whitespace-pre-wrap placeholder:text-muted-foreground" placeholder="Allergic to peanuts. Prefers tea." />
              </div>
              
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium mb-2">Social Links</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['instagram', 'facebook', 'linkedin', 'twitter'].map(platform => (
                    <div key={platform} className="flex items-center">
                      <span className="w-24 text-xs capitalize text-muted-foreground">{platform}</span>
                      <input type="text" value={form.socialLinks?.[platform as keyof typeof form.socialLinks] || ''} onChange={e => setForm({...form, socialLinks: {...(form.socialLinks || {}), [platform]: e.target.value}})} className="flex-1 p-1.5 text-sm rounded border border-border bg-background" />
                    </div>
                  ))}
                </div>
              </div>
            </form>
            
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-accent/30">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-md font-medium text-muted-foreground hover:bg-accent">Cancel</button>
              <button type="submit" form="add-person-form" className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 shadow-sm">Save Person</button>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  )
}
