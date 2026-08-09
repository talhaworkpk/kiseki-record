import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { FileText, Plus, Trash2, Edit2, X, Upload, ExternalLink, Image as ImageIcon, Award } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { CertificateRecord } from '../../types'
import { normalizeUrl } from '../../lib/utils'

export default function CertificatesGallery() {
  const [certificates, setCertificates] = useState<CertificateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const defaultForm: Partial<CertificateRecord> = {
    name: '', organization: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '', imageAttachment: '', pdfAttachment: ''
  }
  const [form, setForm] = useState<Partial<CertificateRecord>>(defaultForm)

  const loadData = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('certificates', {})
      const sorted = data.sort((a: any, b: any) => {
        const timeA = a.issueDate ? new Date(a.issueDate).getTime() : 0;
        const timeB = b.issueDate ? new Date(b.issueDate).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      })
      setCertificates(sorted)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const location = useLocation()
  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    if (highlightId && !loading && certificates.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`certificate-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [location.search, loading, certificates.length])

  const handleSave = async () => {
    try {
      if (editingId) {
        // @ts-ignore
        await window.api.db.update('certificates', { _id: editingId }, { $set: { ...form, updatedAt: Date.now() } }, {})
        NotificationEngine.notify('success', 'Certificate Updated', `"${form.name}" was updated.`, 'Career')
      } else {
        // @ts-ignore
        await window.api.db.insert('certificates', { ...form, createdAt: Date.now(), updatedAt: Date.now() })
        NotificationEngine.notify('success', 'Certificate Added', `Added "${form.name}".`, 'Career')
        setShowSuccessOverlay(true)
        setTimeout(() => setShowSuccessOverlay(false), 3000)
      }
      setIsAdding(false)
      setEditingId(null)
      loadData()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm('Delete this certificate?')) return
    try {
      // @ts-ignore
      await window.api.db.remove('certificates', { _id: id }, {})
      NotificationEngine.notify('info', 'Certificate Deleted', `"${title}" was removed.`, 'Career')
      loadData()
    } catch (err) { console.error(err) }
  }

  const openEdit = (record: CertificateRecord) => {
    setForm(record)
    setEditingId(record._id!)
    setIsAdding(true)
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAttachImage = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, imageAttachment: result.files[0].filePath })
    }
  }

  const handleAttachPdf = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, pdfAttachment: result.files[0].filePath })
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
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes sparkle {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 0.9; }
        }
      `}</style>

      {/* 3D Ambient Background - Celebration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 via-emerald-500/5 to-yellow-500/10 dark:from-green-900/10 dark:via-emerald-900/5 dark:to-yellow-900/10" />

        {/* Falling Confetti */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => {
            const isCircle = i % 3 === 0;
            const isStar = i % 3 === 1;
            const size = 6 + Math.random() * 10;
            return (
              <svg 
                key={`confetti-${i}`}
                viewBox="0 0 24 24" 
                className={`absolute drop-shadow-sm ${i % 2 === 0 ? 'text-yellow-400' : 'text-emerald-400'}`}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  animation: `fall ${10 + Math.random() * 15}s linear infinite`,
                  animationDelay: `${Math.random() * -20}s`,
                  fill: 'currentColor'
                }}
              >
                {isCircle ? (
                  <circle cx="12" cy="12" r="8" />
                ) : isStar ? (
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                ) : (
                  <rect x="6" y="2" width="12" height="20" rx="2" />
                )}
              </svg>
            )
          })}
        </div>

        {/* Floating Sparkles */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
             <svg 
               key={`sparkle-${i}`}
               viewBox="0 0 24 24" 
               className="absolute drop-shadow-sm text-yellow-300"
               style={{
                 width: `${10 + Math.random() * 14}px`,
                 height: `${10 + Math.random() * 14}px`,
                 left: `${Math.random() * 100}%`,
                 top: `${Math.random() * 100}%`,
                 animation: `sparkle ${3 + Math.random() * 4}s ease-in-out infinite`,
                 animationDelay: `${Math.random() * -5}s`,
                 fill: 'currentColor'
               }}
             >
               <path d="M12 2l2.4 7.6h8l-6.4 4.8 2.4 7.6-6.4-4.8-6.4 4.8 2.4-7.6-6.4-4.8h8z" />
             </svg>
          ))}
        </div>
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
            <FileText className="text-green-500" /> 
            Certificates & Licenses
          </h1>
          <p className="text-muted-foreground mt-1">Manage your professional certifications.</p>
        </div>
        {!isAdding && (
          <button onClick={() => { setForm(defaultForm); setEditingId(null); setIsAdding(true) }} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium flex items-center gap-2">
            <Plus size={18}/> Add Certificate
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{editingId ? 'Edit Certificate' : 'Add Certificate'}</h2>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-accent rounded-md"><X size={20}/></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Certificate Name</label>
              <input autoFocus type="text" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Issuing Organization</label>
              <input type="text" value={form.organization || ''} onChange={e => setForm({...form, organization: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Issue Date</label>
              <input type="month" value={form.issueDate || ''} onChange={e => setForm({...form, issueDate: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expiry Date (Optional)</label>
              <input type="month" value={form.expiryDate || ''} onChange={e => setForm({...form, expiryDate: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Credential ID</label>
              <input type="text" value={form.credentialId || ''} onChange={e => setForm({...form, credentialId: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Credential URL</label>
              <input type="text" value={form.credentialUrl || ''} onChange={e => setForm({...form, credentialUrl: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 border border-dashed border-border rounded-lg bg-accent/30 text-center">
              <label className="block text-sm font-medium mb-3">Certificate Image</label>
              {form.imageAttachment ? (
                <div className="relative inline-block group rounded-md overflow-hidden border border-border">
                  <img src={normalizeUrl(form.imageAttachment)} alt="certificate" className="max-h-32 object-contain" />
                  <button onClick={() => setForm({...form, imageAttachment: ''})} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                </div>
              ) : (
                <button onClick={handleAttachImage} className="flex items-center justify-center gap-2 mx-auto bg-background border border-border px-4 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  <ImageIcon size={16}/> Select Image
                </button>
              )}
            </div>

            <div className="p-4 border border-dashed border-border rounded-lg bg-accent/30 text-center">
              <label className="block text-sm font-medium mb-3">PDF Document</label>
              {form.pdfAttachment ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-medium truncate max-w-[200px]">{form.pdfAttachment ? form.pdfAttachment.split(/[\\/]/).pop() : 'PDF'}</span>
                  <button onClick={() => setForm({...form, pdfAttachment: ''})} className="text-destructive hover:text-destructive/80"><X size={14}/></button>
                </div>
              ) : (
                <button onClick={handleAttachPdf} className="flex items-center justify-center gap-2 mx-auto bg-background border border-border px-4 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  <Upload size={16}/> Select PDF
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-accent rounded-md hover:bg-accent/80 font-medium">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium">Save Certificate</button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map(record => (
          <div key={record._id} id={`certificate-${record._id}`} className="bg-card border border-border rounded-2xl shadow-sm relative group hover:border-green-500/50 transition-all duration-1000 flex flex-col overflow-hidden">
            
            {record.imageAttachment ? (
              <div className="h-48 w-full border-b border-border relative flex items-center justify-center overflow-hidden bg-black/5 dark:bg-white/5">
                <div 
                  className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 transform scale-125"
                  style={{ backgroundImage: `url("${normalizeUrl(record.imageAttachment).replace(/"/g, '%22')}")` }}
                />
                <img src={normalizeUrl(record.imageAttachment)} alt={record.name} className="max-w-[85%] max-h-[85%] object-contain relative z-10 drop-shadow-2xl rounded-sm border border-white/10" />
              </div>
            ) : (
              <div className="h-32 w-full border-b border-border bg-gradient-to-br from-green-500/10 to-green-500/5 flex flex-col items-center justify-center text-green-500">
                <Award size={48} className="opacity-50" />
              </div>
            )}
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10 bg-background/80 backdrop-blur-sm p-1 rounded-lg border border-border">
                <button onClick={() => openEdit(record)} className="p-1.5 rounded-md hover:bg-accent text-foreground"><Edit2 size={14}/></button>
                <button onClick={() => handleDelete(record._id!, record.name)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 size={14}/></button>
              </div>

              <h3 className="text-xl font-bold mb-1 pr-16">{record.name}</h3>
              <p className="text-muted-foreground font-medium mb-4">{record.organization}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-6 bg-accent/30 p-3 rounded-xl">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Issued</span>
                  <span className="font-semibold">{new Date(record.issueDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Expires</span>
                  <span className="font-semibold">{record.expiryDate ? new Date(record.expiryDate).toLocaleDateString([], { month: 'short', year: 'numeric' }) : 'Never'}</span>
                </div>
              </div>

              {record.credentialId && (
                <div className="text-sm mb-2 text-foreground/80">
                  <span className="text-muted-foreground">ID:</span> {record.credentialId}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-4 border-t border-border mt-auto">
                {record.credentialUrl && (
                  <a href={record.credentialUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 transition-colors">
                    <ExternalLink size={16}/> View Credential
                  </a>
                )}
                {record.pdfAttachment && (
                  <a href={normalizeUrl(record.pdfAttachment)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                    <FileText size={16}/> View PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {certificates.length === 0 && !isAdding && (
        <div className="text-center p-12 border border-dashed border-border rounded-xl text-muted-foreground bg-card/50 backdrop-blur">
          No certificates added yet.
        </div>
      )}
      </div>

      {showSuccessOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/30 via-background/80 to-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <style>{`
            @keyframes popAndRotate {
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
            @keyframes shineEffect {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
          <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popAndRotate 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            {/* 3D Certificate SVG Base */}
            <svg width="240" height="300" viewBox="0 0 240 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              {/* Back shadows for 3D effect */}
              <rect x="35" y="45" width="180" height="230" rx="12" fill="#16a34a" opacity="0.4" transform="rotate(-6 120 150)" />
              <rect x="25" y="35" width="180" height="230" rx="12" fill="#22c55e" opacity="0.6" transform="rotate(-3 120 150)" />
              
              {/* Main Certificate Body */}
              <rect x="20" y="25" width="180" height="230" rx="12" fill="currentColor" className="text-card stroke-border" strokeWidth="2" />
              
              {/* Shiny Overlay */}
              <g style={{ clipPath: 'url(#certClip)' }}>
                <rect x="20" y="25" width="50" height="300" fill="white" opacity="0.2" style={{ animation: 'shineEffect 2.5s infinite linear' }} transform="skewX(-20)" />
              </g>
              <defs>
                <clipPath id="certClip">
                  <rect x="20" y="25" width="180" height="230" rx="12" />
                </clipPath>
              </defs>

              {/* Inner Decorative Border */}
              <rect x="30" y="35" width="160" height="210" rx="6" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="6 6" />
              
              {/* Ribbon Tails */}
              <path d="M140 210 L125 260 L150 245 L175 260 L160 210 Z" fill="#eab308" />
              <path d="M140 210 L130 260 L150 250 L170 260 L160 210 Z" fill="#ca8a04" opacity="0.5" />
              
              {/* Golden Seal */}
              <circle cx="150" cy="200" r="30" fill="#facc15" />
              <circle cx="150" cy="200" r="24" stroke="#ca8a04" strokeWidth="2.5" strokeDasharray="3 3" />
              <path d="M142 195 L158 205 M158 195 L142 205" stroke="#ca8a04" strokeWidth="4" strokeLinecap="round" />
              
              {/* Header Text Line */}
              <rect x="50" y="65" width="120" height="10" rx="5" fill="#22c55e" />
              
              {/* Subtext Lines */}
              <rect x="50" y="100" width="100" height="6" rx="3" fill="currentColor" className="text-muted-foreground" opacity="0.4" />
              <rect x="50" y="120" width="90" height="6" rx="3" fill="currentColor" className="text-muted-foreground" opacity="0.4" />
              <rect x="50" y="140" width="110" height="6" rx="3" fill="currentColor" className="text-muted-foreground" opacity="0.4" />
              <rect x="50" y="160" width="70" height="6" rx="3" fill="currentColor" className="text-muted-foreground" opacity="0.4" />
            </svg>

            {/* Flying Stars / Confetti */}
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
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
                  className={`absolute top-1/2 left-1/2 -ml-3 -mt-3 ${i % 2 === 0 ? 'text-yellow-400' : 'text-green-400'}`}
                  style={{
                    '--tx': tx,
                    '--ty': ty,
                    animation: `floatUpFade 1.5s ease-out forwards ${0.3 + Math.random() * 0.3}s`
                  } as React.CSSProperties}
                >
                  <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" fill="currentColor" />
                </svg>
              )
            })}
            
            <h2 className="text-4xl font-extrabold text-green-600 dark:text-green-400 drop-shadow-lg tracking-tight text-center z-50">
              Certificate Saved!
            </h2>
          </div>
        </div>
      )}
    </div>
  )
}
