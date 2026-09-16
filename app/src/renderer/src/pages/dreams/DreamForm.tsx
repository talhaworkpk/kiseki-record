import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Image as ImageIcon, Plus } from 'lucide-react'
import { Dream } from '../../types'
import { DREAM_CATEGORIES } from '../../lib/constants/dreams'
import { normalizeUrl } from '../../lib/utils'
import { dreamService } from '../../lib/domain/DreamService'

interface DreamFormProps {
  initialData?: Partial<Dream>;
  onSave: (savedDream: Dream) => void;
  onCancel: () => void;
}

export default function DreamForm({ initialData, onSave, onCancel }: DreamFormProps) {
  const [form, setForm] = useState<Partial<Dream>>({
    title: '',
    category: 'other',
    status: 'Active',
    ...initialData
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const dreams = await dreamService.find({});
        const standardIds = DREAM_CATEGORIES.map(c => c.id);
        const uniqueCustoms = Array.from(new Set(dreams.map(d => d.category))).filter(c => c && !standardIds.includes(c));
        setCustomCategories(uniqueCustoms);
      } catch (err) {
        console.error("Failed to load custom categories", err);
      }
    };
    loadCustomCategories();
  }, []);

  const isQuantitative = form.targetAmount !== undefined || form.currentAmount !== undefined || form.targetCurrency !== undefined;
  const [showMeasurement, setShowMeasurement] = useState(isQuantitative);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, form, showMeasurement]);

  const handleAttachImage = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add();
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, imageUrl: result.files[0].filePath });
    }
  }

  const handleSubmit = async (e?: React.FormEvent | Event) => {
    if (e) e.preventDefault();
    if (!form.title?.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      let saved: Dream;
      
      const payload = { ...form };
      if (!showMeasurement) {
        payload.targetAmount = undefined;
        payload.currentAmount = undefined;
        payload.targetCurrency = undefined;
      }

      if (payload._id) {
        saved = await dreamService.update(payload._id, payload);
        onSave(saved);
      } else {
        saved = await dreamService.create(payload);
        setShowSuccessOverlay(true);
        setTimeout(() => {
          setShowSuccessOverlay(false);
          onSave(saved);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save dream');
    } finally {
      setIsSaving(false);
    }
  }
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let isDragging = false
    let startY = 0
    let scrollTop = 0
    let hasDragged = false

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) { // Right click
        isDragging = true
        hasDragged = false
        startY = e.pageY - el.offsetTop
        scrollTop = el.scrollTop
        el.style.cursor = 'grabbing'
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false
        el.style.cursor = ''
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      e.preventDefault()
      hasDragged = true
      const y = e.pageY - el.offsetTop
      const walk = (y - startY) * 2 // Scroll-fast
      el.scrollTop = scrollTop - walk
    }

    const handleContextMenu = (e: MouseEvent) => {
      if (hasDragged) {
        e.preventDefault()
      }
    }

    el.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('contextmenu', handleContextMenu)

    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel}></div>
      <div className="relative bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold">{initialData?._id ? 'Edit Dream' : 'New Dream'}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-accent rounded-md"><X size={20} /></button>
        </div>

        <div ref={scrollRef} className="overflow-y-auto p-6 scrollbar-thin">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">{error}</div>}
          
          <form id="dream-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-1">
              <label className="text-sm font-medium">What is your dream?</label>
              <input 
                autoFocus 
                type="text" 
                value={form.title || ''} 
                onChange={e => setForm({ ...form, title: e.target.value })} 
                className="w-full p-3 bg-background border border-border rounded-xl text-lg font-bold placeholder:font-normal" 
                placeholder="e.g., Buy a house, Learn to play piano, Travel to Japan..." 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium flex justify-between items-center">
                  Category
                  {!isAddingCategory && (
                    <button type="button" onClick={() => { setIsAddingCategory(true); setForm({ ...form, category: '' }); }} className="text-primary hover:bg-primary/10 p-1 rounded transition-colors flex items-center gap-1 text-xs">
                      <Plus size={12} /> New
                    </button>
                  )}
                </label>
                {isAddingCategory ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={form.category || ''} 
                      onChange={e => setForm({ ...form, category: e.target.value })} 
                      className="w-full p-2 bg-background border border-border rounded-xl"
                      placeholder="Custom category name..." 
                      autoFocus
                    />
                    <button type="button" onClick={() => { setIsAddingCategory(false); setForm({ ...form, category: 'other' }); }} className="p-2 hover:bg-accent rounded-xl text-muted-foreground">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <select 
                    value={form.category || 'other'} 
                    onChange={e => setForm({ ...form, category: e.target.value as any })} 
                    className="w-full p-2.5 bg-background border border-border rounded-xl"
                  >
                    {DREAM_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.displayName}</option>
                    ))}
                    {customCategories.length > 0 && <optgroup label="Custom">
                      {customCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>}
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <select 
                  value={form.status || 'Active'} 
                  onChange={e => setForm({ ...form, status: e.target.value as any })} 
                  className="w-full p-2.5 bg-background border border-border rounded-xl"
                >
                  <option value="Active">Active</option>
                  <option value="Achieved">Achieved</option>
                  <option value="Paused">Paused</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description (Optional)</label>
              <textarea 
                value={form.description || ''} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                rows={3} 
                className="w-full p-3 bg-background border border-border rounded-xl resize-none" 
                placeholder="Details about this dream..." 
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={showMeasurement} 
                  onChange={e => setShowMeasurement(e.target.checked)} 
                  className="rounded border-border bg-background"
                />
                Include measurable target (e.g., savings goal)
              </label>
              
              {showMeasurement && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 p-4 bg-accent/50 rounded-xl border border-border">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Target Amount</label>
                    <input 
                      type="number" 
                      min="0"
                      value={form.targetAmount ?? ''} 
                      onChange={e => setForm({ ...form, targetAmount: e.target.value ? Number(e.target.value) : undefined })} 
                      className="w-full p-2 bg-background border border-border rounded-md text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Current Amount</label>
                    <input 
                      type="number" 
                      min="0"
                      value={form.currentAmount ?? ''} 
                      onChange={e => setForm({ ...form, currentAmount: e.target.value ? Number(e.target.value) : undefined })} 
                      className="w-full p-2 bg-background border border-border rounded-md text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Currency/Unit</label>
                    <input 
                      type="text" 
                      value={form.targetCurrency || ''} 
                      onChange={e => setForm({ ...form, targetCurrency: e.target.value })} 
                      className="w-full p-2 bg-background border border-border rounded-md text-sm" 
                      placeholder="PKR, $, steps..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Target Date (Optional)</label>
                <input 
                  type="date" 
                  value={form.targetDate || ''} 
                  onChange={e => setForm({ ...form, targetDate: e.target.value })} 
                  className="w-full p-2.5 bg-background border border-border rounded-xl" 
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium block mb-1">Cover Image</label>
                {form.imageUrl ? (
                  <div className="relative h-11 rounded-xl overflow-hidden border border-border group cursor-pointer" onClick={handleAttachImage}>
                    <img src={normalizeUrl(form.imageUrl)} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">Change</div>
                  </div>
                ) : (
                  <button type="button" onClick={handleAttachImage} className="w-full h-11 flex items-center justify-center gap-2 bg-accent hover:bg-accent/80 border border-border rounded-xl text-sm font-medium transition-colors">
                    <ImageIcon size={16} /> Add Image
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <textarea 
                value={form.notes || ''} 
                onChange={e => setForm({ ...form, notes: e.target.value })} 
                rows={2} 
                className="w-full p-3 bg-background border border-border rounded-xl resize-none text-sm" 
                placeholder="Any private notes..." 
              />
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-border bg-card/50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-accent hover:bg-accent/80 rounded-xl font-bold transition-colors">
            Cancel
          </button>
          <button 
            form="dream-form" 
            type="submit" 
            disabled={isSaving}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Dream'}
          </button>
        </div>

      </div>

      {/* 3D Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/30 via-background/80 to-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <style>{`
            @keyframes popAndRotateCloud {
              0% { transform: scale(0) rotate(-20deg); opacity: 0; }
              50% { transform: scale(1.1) rotate(5deg); opacity: 1; }
              75% { transform: scale(0.95) rotate(-2deg); }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes floatUpFadeStar {
              0% { transform: translate(0, 0) scale(0); opacity: 0; }
              20% { opacity: 1; scale: 1; }
              100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
            }
            @keyframes flyStar {
              0% { transform: translate(0px, 10px); }
              100% { transform: translate(0px, -10px); }
            }
          `}</style>
          <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popAndRotateCloud 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            {/* 3D Dream SVG Base */}
            <svg width="300" height="240" viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              {/* Back shadows for 3D effect */}
              <path d="M60 150 C30 150, 20 120, 40 95 C45 60, 90 40, 130 65 C160 20, 230 40, 235 90 C270 95, 275 145, 240 160 C210 180, 80 180, 60 150 Z" fill="#4f46e5" opacity="0.3" transform="rotate(-3 150 120) translate(10, 10)" />
              <path d="M60 150 C30 150, 20 120, 40 95 C45 60, 90 40, 130 65 C160 20, 230 40, 235 90 C270 95, 275 145, 240 160 C210 180, 80 180, 60 150 Z" fill="#6366f1" opacity="0.5" transform="rotate(-1 150 120) translate(5, 5)" />
              
              {/* Main Cloud Body */}
              <path d="M60 150 C30 150, 20 120, 40 95 C45 60, 90 40, 130 65 C160 20, 230 40, 235 90 C270 95, 275 145, 240 160 C210 180, 80 180, 60 150 Z" fill="currentColor" className="text-card stroke-border" strokeWidth="3" />
              
              {/* Inner details to give it puffiness */}
              <path d="M90 75 C100 65, 120 65, 130 75" stroke="#a5b4fc" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
              <path d="M160 65 C180 50, 210 60, 215 80" stroke="#a5b4fc" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
              <path d="M55 125 C65 140, 90 145, 110 135" stroke="#a5b4fc" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
              
              {/* Floating Star */}
              <g style={{ animation: 'flyStar 2s ease-in-out infinite alternate' }}>
                <path d="M150 80 L160 110 L190 115 L165 135 L175 165 L150 145 L125 165 L135 135 L110 115 L140 110 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
                {/* Star inner shine */}
                <path d="M150 95 L153 115 L170 120 L155 130 Z" fill="#fef08a" opacity="0.7" />
              </g>
            </svg>

            {/* Flying Particles */}
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
                  className={`absolute top-1/2 left-1/2 -ml-3 -mt-8 ${i % 3 === 0 ? 'text-blue-400' : i % 3 === 1 ? 'text-indigo-400' : 'text-yellow-300'}`}
                  style={{
                    '--tx': tx,
                    '--ty': ty,
                    animation: `floatUpFadeStar 1.5s ease-out forwards ${0.3 + Math.random() * 0.3}s`
                  } as React.CSSProperties}
                >
                  {i % 2 === 0 ? (
                    <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" fill="currentColor" />
                  ) : (
                    <rect x="8" y="8" width="8" height="8" rx="4" fill="currentColor" />
                  )}
                </svg>
              )
            })}
            
            <h2 className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 drop-shadow-lg tracking-tight text-center z-50">
              Dream Planted!
            </h2>
          </div>
        </div>
      )}

    </div>,
    document.body
  )
}
