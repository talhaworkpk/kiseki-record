import React, { useState, useEffect, useRef } from 'react'
import { ChronicleEntry } from '../../types'
import { X, Tag } from 'lucide-react'

interface ChronicleEntryFormProps {
  entry: ChronicleEntry | null
  onSave: (entry: Partial<ChronicleEntry>) => void
  onClose: () => void
}

const CHRONICLE_TYPES = [
  'Observation', 'Event', 'Project', 'Person', 'Place', 'Idea', 'Activity'
]

export default function ChronicleEntryForm({ entry, onSave, onClose }: ChronicleEntryFormProps) {
  const [title, setTitle] = useState(entry?.title || '')
  const [description, setDescription] = useState(entry?.description || '')
  const [type, setType] = useState(entry?.type || '')
  const [tags, setTags] = useState<string>(entry?.tags?.join(', ') || '')

  const titleRef = useRef<HTMLInputElement>(null)

  // Auto-focus title
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus()
    }
  }, [])

  // Handle Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (title.trim()) {
          handleSubmit(new Event('submit') as unknown as React.FormEvent)
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [title, description, type, tags])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      type: type || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" data-stop-overscroll="true">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-[0_24px_50px_rgba(0,0,0,0.2)] rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/10 bg-accent/30">
            <h2 className="text-lg font-bold tracking-tight">
              {entry ? 'Edit Chronicle Entry' : 'New Chronicle Entry'}
            </h2>
            <button 
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-muted-foreground hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6" data-overscroll-glow="false">
            
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Entry Title
              </label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Friend Observation, My Plant, Weather"
                className="w-full bg-accent/30 border border-border/20 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this chronicle about?"
                className="w-full bg-accent/30 border border-border/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all min-h-[100px] resize-none placeholder:text-muted-foreground/40"
              />
            </div>

            {/* Metadata (Type & Tags) */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-border/10">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Category Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {CHRONICLE_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(type === t ? '' : t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${type === t ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-accent/40 text-muted-foreground hover:bg-accent'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Tag size={12} /> Tags (comma separated)
                </label>
                <input 
                  type="text" 
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. daily, thoughts, people"
                  className="w-full bg-accent/30 border border-border/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-accent/10 border-t border-border/10 flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60">
              Press <kbd className="font-sans px-1.5 py-0.5 rounded-md bg-white/10 border border-border/20 mx-1">Ctrl</kbd> + <kbd className="font-sans px-1.5 py-0.5 rounded-md bg-white/10 border border-border/20 mx-1">S</kbd> to save
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(var(--primary),0.2)] hover:shadow-[0_6px_16px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {entry ? 'Save Changes' : 'Create Entry'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
