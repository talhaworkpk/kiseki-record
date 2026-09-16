import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Check } from 'lucide-react'
import { projectService } from '../../lib/domain/ProjectService'
import { goalService } from '../../lib/domain/GoalService'
import { skillService } from '../../lib/domain/SkillService'

interface LinkSelectorModalProps {
  type: 'Goal' | 'Project' | 'Skill' | 'Certificate'
  existingIds: string[]
  onLink: (selectedIds: string[]) => void
  onClose: () => void
}

export default function LinkSelectorModal({ type, existingIds, onLink, onClose }: LinkSelectorModalProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true)
      try {
        let fetchedItems: any[] = []
        if (type === 'Goal') {
          fetchedItems = await goalService.find({ isArchived: { $ne: true } })
        } else if (type === 'Project') {
          fetchedItems = await projectService.find({ isArchived: { $ne: true } })
        } else if (type === 'Skill') {
          fetchedItems = await skillService.find({ isArchived: { $ne: true } })
        } else if (type === 'Certificate') {
          // @ts-ignore
          fetchedItems = await window.api.db.find('certificates', {})
        }
        setItems(fetchedItems)
      } catch (err) {
        console.error(`Failed to load ${type}s:`, err)
      } finally {
        setLoading(false)
      }
    }
    loadItems()
  }, [type])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredItems = items.filter(item => {
    const title = item.title || item.name || ''
    return title.toLowerCase().includes(search.toLowerCase())
  })

  const toggleSelect = (id: string) => {
    if (existingIds.includes(id)) return // Already linked
    
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleSave = () => {
    onLink(Array.from(selectedIds))
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold">Link {type}s</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-md transition-colors"><X size={20} /></button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${type}s...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No {type}s found.</div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map(item => {
                const id = item._id
                const title = item.title || item.name || 'Untitled'
                const isExisting = existingIds.includes(id)
                const isSelected = selectedIds.has(id)
                
                return (
                  <button
                    key={id}
                    onClick={() => toggleSelect(id)}
                    disabled={isExisting}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors text-sm ${
                      isExisting 
                        ? 'opacity-50 cursor-not-allowed bg-accent/50' 
                        : isSelected
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-accent'
                    }`}
                  >
                    <span className="font-medium truncate mr-2">{title}</span>
                    {isExisting ? (
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded">Linked</span>
                    ) : isSelected ? (
                      <Check size={16} className="text-primary flex-shrink-0" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-accent/30 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={selectedIds.size === 0}
            className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Link {selectedIds.size > 0 ? selectedIds.size : ''} {selectedIds.size === 1 ? 'Item' : 'Items'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
