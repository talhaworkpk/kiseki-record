import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Briefcase, Plus, Trash2, Edit2, X, Upload, MapPin, Building, Calendar, DollarSign } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { JobRecord } from '../../types'
import { normalizeUrl } from '../../lib/utils'

export default function CareerList() {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const defaultForm: Partial<JobRecord> = {
    company: '', position: '', employmentType: 'Full-time', startDate: '', endDate: '', isCurrent: false, salary: '', responsibilities: [], skillsUsed: [], projects: [], achievements: [], references: [], attachments: [], photos: []
  }
  const [form, setForm] = useState<Partial<JobRecord>>(defaultForm)

  const [skillsInput, setSkillsInput] = useState('')
  const [responsibilitiesInput, setResponsibilitiesInput] = useState('')

  const loadData = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('career', {})
      const sorted = data.sort((a: any, b: any) => {
        const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      })
      setJobs(sorted)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const location = useLocation()
  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    if (highlightId && !loading && jobs.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`career-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [location.search, loading, jobs.length])

  useEffect(() => {
    loadData()
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      setMousePos({ x, y })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleSave = async () => {
    try {
      if (editingId) {
        // @ts-ignore
        await window.api.db.update('career', { _id: editingId }, { $set: { ...form, updatedAt: Date.now() } })
        NotificationEngine.notify('success', 'Career Record Updated', `"${form.position}" at ${form.company} was updated.`, 'Career')
      } else {
        // @ts-ignore
        await window.api.db.insert('career', { ...form, createdAt: Date.now(), updatedAt: Date.now() })
        NotificationEngine.notify('success', 'Career Record Added', `Added "${form.position}" at ${form.company}.`, 'Career')
        setShowSuccessOverlay(true)
        setTimeout(() => setShowSuccessOverlay(false), 3000)
      }
      setIsAdding(false)
      setEditingId(null)
      loadData()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm('Delete this career record?')) return
    try {
      // @ts-ignore
      await window.api.db.remove('career', { _id: id }, {})
      NotificationEngine.notify('info', 'Career Record Deleted', `"${title}" was removed.`, 'Career')
      loadData()
    } catch (err) { console.error(err) }
  }

  const openEdit = (record: JobRecord) => {
    setForm(record)
    setSkillsInput(record.skillsUsed?.join(', ') || '')
    setResponsibilitiesInput(record.responsibilities?.join('\n') || '')
    setEditingId(record._id!)
    setIsAdding(true)
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAttach = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, attachments: [...(form.attachments || []), result.files[0].filePath] })
    }
  }

  const handleAttachPhoto = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, photos: [...(form.photos || []), result.files[0].filePath] })
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
        @keyframes water-drop {
          0% { transform: translateY(-10vh) scaleY(1); opacity: 0; }
          10% { opacity: 0.6; }
          80% { transform: translateY(80vh) scaleY(1.5); opacity: 0.6; }
          100% { transform: translateY(100vh) scaleY(1); opacity: 0; }
        }
      `}</style>
      
      {/* 3D Ambient Background - Water Dropping */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Parallax ambient blobs */}
        <div 
          className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] opacity-70 transition-transform duration-700 ease-out" 
          style={{ transform: `translate(${mousePos.x * 150}px, ${mousePos.y * 150}px)` }}
        />
        <div 
          className="absolute top-[40%] right-[10%] w-[50%] h-[50%] rounded-full bg-cyan-400/10 blur-[120px] opacity-70 transition-transform duration-1000 ease-out" 
          style={{ transform: `translate(${mousePos.x * -200}px, ${mousePos.y * -200}px)` }}
        />

        {/* Falling Water Drops */}
        {[...Array(15)].map((_, i) => (
          <div 
            key={i}
            className="absolute top-0 w-1.5 h-12 bg-gradient-to-b from-transparent via-blue-400/40 to-blue-300/80 rounded-full blur-[1px]"
            style={{
              left: `${Math.random() * 100}%`,
              animation: `water-drop ${1.5 + Math.random() * 2}s linear infinite`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}

        {/* Ground Water Level (Scales with Jobs) */}
        <div 
          className="absolute bottom-0 left-[-10%] right-[-10%] bg-blue-500/30 blur-[60px] opacity-80 transition-all duration-1000 ease-out" 
          style={{ height: `${Math.min(80, jobs.length * 15)}%`, minHeight: '15%' }}
        />
        <div 
          className="absolute bottom-[-10%] left-[-10%] w-[120%] rounded-[100%] bg-cyan-600/40 blur-[80px] opacity-70 transition-all duration-1000 ease-out" 
          style={{ height: `${Math.min(90, jobs.length * 18)}%`, minHeight: '20%' }}
        />
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
              <Briefcase className="text-blue-500" /> 
              Career Experience
            </h1>
            <p className="text-muted-foreground mt-1">Track your work history, positions, and responsibilities.</p>
          </div>
        {!isAdding && (
          <button onClick={() => { setForm(defaultForm); setSkillsInput(''); setResponsibilitiesInput(''); setEditingId(null); setIsAdding(true) }} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium flex items-center gap-2">
            <Plus size={18}/> Add Experience
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{editingId ? 'Edit Job' : 'Add Job'}</h2>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-accent rounded-md"><X size={20}/></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <input autoFocus type="text" value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Position / Title</label>
              <input type="text" value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employment Type</label>
              <select value={form.employmentType} onChange={e => setForm({...form, employmentType: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md">
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Salary (Optional)</label>
              <input type="text" value={form.salary || ''} onChange={e => setForm({...form, salary: e.target.value})} placeholder="e.g. $80k / year" className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            
            <div className="md:col-span-2 flex items-center gap-2 mb-2 mt-2">
              <input type="checkbox" id="isCurrent" checked={form.isCurrent} onChange={e => setForm({...form, isCurrent: e.target.checked, endDate: e.target.checked ? '' : form.endDate})} className="w-4 h-4 rounded text-blue-600 border-border" />
              <label htmlFor="isCurrent" className="text-sm font-medium">I currently work here</label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="month" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="month" value={form.endDate || ''} disabled={form.isCurrent} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md disabled:opacity-50" />
            </div>
            
            <div className="md:col-span-2 mt-2">
              <label className="block text-sm font-medium mb-1">Responsibilities (one per line)</label>
              <textarea value={responsibilitiesInput} onChange={e => setResponsibilitiesInput(e.target.value)} onBlur={() => {
                const lines = responsibilitiesInput.split('\n')
                const processed = lines.map(s => s.trim()).filter(Boolean)
                setForm({...form, responsibilities: processed})
              }} rows={4} className="w-full p-2 bg-background border border-border rounded-md" placeholder="Developed new features..." />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Skills Used (comma separated)</label>
              <input type="text" value={skillsInput} onChange={e => setSkillsInput(e.target.value)} onBlur={() => {
                const parts = skillsInput.split(',')
                const processed = parts.map(s => s.trim()).filter(Boolean)
                setForm({...form, skillsUsed: processed})
              }} className="w-full p-2 bg-background border border-border rounded-md" placeholder="React, Node.js, Leadership" />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Attachments & Photos</label>
            <div className="flex flex-wrap gap-4 mb-4">
              {form.photos?.map((img, i) => (
                <div key={i} className="relative group rounded-md overflow-hidden border border-border w-24 h-24">
                  <img src={normalizeUrl(img)} alt="photo" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, photos: form.photos?.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                </div>
              ))}
              <button onClick={handleAttachPhoto} className="flex flex-col items-center justify-center w-24 h-24 bg-background border border-dashed border-border rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <span className="text-xs font-medium">Add Photo</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.attachments?.map((att, i) => (
                <div key={i} className="flex items-center gap-2 bg-accent px-3 py-1.5 rounded-md text-sm">
                  <a href={normalizeUrl(att)} target="_blank" className="hover:underline truncate max-w-[200px]">{att ? att.split(/[\\/]/).pop() : 'Attachment'}</a>
                  <button onClick={() => setForm({...form, attachments: form.attachments?.filter((_, idx) => idx !== i)})} className="text-destructive hover:text-destructive/80"><X size={14}/></button>
                </div>
              ))}
              <button onClick={handleAttach} className="flex items-center gap-2 bg-background border border-dashed border-border px-4 py-1.5 rounded-md text-sm hover:bg-accent">
                <Upload size={14}/> Add File
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-accent rounded-md hover:bg-accent/80 font-medium">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium">Save Job</button>
          </div>
        </div>
      ) : null}

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border">
        {jobs.map(record => (
          <div key={record._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            
            {/* Timeline dot */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <Briefcase size={20} />
            </div>
            
            {/* Card */}
            <div id={`career-${record._id}`} className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border border-border p-6 rounded-2xl shadow-sm relative group-hover:border-blue-500/50 transition-all duration-1000">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <button onClick={() => openEdit(record)} className="p-1.5 bg-background border border-border rounded-md hover:bg-accent"><Edit2 size={14}/></button>
                <button onClick={() => handleDelete(record._id!, record.position)} className="p-1.5 bg-background border border-border text-destructive rounded-md hover:bg-destructive/10"><Trash2 size={14}/></button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-blue-500 font-semibold mb-1">
                <Calendar size={14} />
                <span>
                  {new Date(record.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })} 
                  {' - '} 
                  {record.isCurrent || !record.endDate ? 'Present' : new Date(record.endDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                </span>
                {record.isCurrent && <span className="ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full text-xs">Current</span>}
              </div>
              
              <h3 className="text-xl font-bold mb-1">{record.position}</h3>
              <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
                <span className="flex items-center gap-1"><Building size={14}/> {record.company}</span>
                <span className="flex items-center gap-1"><MapPin size={14}/> {record.employmentType}</span>
                {record.salary && <span className="flex items-center gap-1"><DollarSign size={14}/> {record.salary}</span>}
              </div>
              
              {record.responsibilities && record.responsibilities.length > 0 && (
                <ul className="space-y-2 mb-4">
                  {record.responsibilities.map((resp, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/80">
                      <span className="text-blue-500 mt-1">•</span> {resp}
                    </li>
                  ))}
                </ul>
              )}

              {record.skillsUsed && record.skillsUsed.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                  {record.skillsUsed.map(s => <span key={s} className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-md text-xs font-medium">{s}</span>)}
                </div>
              )}

              {((record.photos && record.photos.length > 0) || (record.attachments && record.attachments.length > 0)) && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  {record.photos && record.photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {record.photos.map((img, i) => (
                        <img key={i} src={normalizeUrl(img)} alt="Job Photo" className="h-16 w-24 object-cover rounded-md border border-border shrink-0 hover:scale-105 transition-transform" />
                      ))}
                    </div>
                  )}
                  {record.attachments && record.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {record.attachments.map((att, i) => (
                        <a key={i} href={normalizeUrl(att)} target="_blank" className="flex items-center gap-1.5 text-xs font-medium bg-accent px-2 py-1 rounded hover:bg-blue-500/10 hover:text-blue-500 transition-colors truncate max-w-[150px]">
                          <Briefcase size={12}/> {att ? att.split(/[\\/]/).pop() : 'Attachment'}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        ))}
        {jobs.length === 0 && !isAdding && (
          <div className="text-center p-12 bg-card border border-dashed border-border rounded-xl text-muted-foreground w-full relative z-10">
            No work experience recorded yet.
          </div>
        )}
      </div>
      </div>

      {/* 3D Success Overlay */}
      {showSuccessOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/30 via-background/80 to-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <style>{`
            @keyframes popAndRotateBriefcase {
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
            @keyframes shineBriefcase {
              0% { transform: translateX(-150%) skewX(-20deg); }
              100% { transform: translateX(250%) skewX(-20deg); }
            }
          `}</style>
          <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popAndRotateBriefcase 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            {/* 3D Briefcase SVG Base */}
            <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              {/* Back shadows for 3D effect */}
              <rect x="25" y="65" width="190" height="140" rx="12" fill="#1e3a8a" opacity="0.4" transform="rotate(-6 120 120)" />
              <rect x="15" y="55" width="190" height="140" rx="12" fill="#1d4ed8" opacity="0.6" transform="rotate(-3 120 120)" />
              
              {/* Briefcase Handle */}
              <path d="M 90 60 L 90 35 C 90 20, 150 20, 150 35 L 150 60" fill="none" stroke="#64748b" strokeWidth="12" strokeLinecap="round" />
              <path d="M 90 60 L 90 35 C 90 20, 150 20, 150 35 L 150 60" fill="none" stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" opacity="0.5" transform="translate(2, -2)" />
              
              {/* Main Body */}
              <rect x="20" y="60" width="200" height="150" rx="16" fill="#3b82f6" />
              
              {/* Lid Line */}
              <rect x="15" y="110" width="210" height="8" rx="4" fill="#1e40af" />
              
              {/* Straps */}
              <rect x="60" y="60" width="20" height="150" fill="#2563eb" />
              <rect x="160" y="60" width="20" height="150" fill="#2563eb" />
              
              {/* Locks / Buckles */}
              <rect x="55" y="100" width="30" height="20" rx="4" fill="#cbd5e1" />
              <rect x="65" y="105" width="10" height="10" rx="2" fill="#64748b" />
              
              <rect x="155" y="100" width="30" height="20" rx="4" fill="#cbd5e1" />
              <rect x="165" y="105" width="10" height="10" rx="2" fill="#64748b" />

              {/* Shiny Overlay */}
              <g style={{ clipPath: 'url(#briefcaseClip)' }}>
                <rect x="20" y="60" width="40" height="150" fill="white" opacity="0.3" style={{ animation: 'shineBriefcase 3s infinite linear' }} />
              </g>
              <defs>
                <clipPath id="briefcaseClip">
                  <rect x="20" y="60" width="200" height="150" rx="16" />
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
                  className={`absolute top-1/2 left-1/2 -ml-3 -mt-10 ${i % 3 === 0 ? 'text-blue-300' : i % 3 === 1 ? 'text-cyan-400' : 'text-white'}`}
                  style={{
                    '--tx': tx,
                    '--ty': ty,
                    animation: `floatUpFade 1.5s ease-out forwards ${0.3 + Math.random() * 0.3}s`
                  } as React.CSSProperties}
                >
                  {i % 2 === 0 ? (
                    <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" fill="currentColor" />
                  ) : (
                    <rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor" />
                  )}
                </svg>
              )
            })}
            
            <h2 className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 drop-shadow-lg tracking-tight text-center z-50">
              Experience Saved!
            </h2>
          </div>
        </div>
      )}
    </div>
  )
}
