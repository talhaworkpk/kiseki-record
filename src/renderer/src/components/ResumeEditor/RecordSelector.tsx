import { useState, useEffect } from 'react'
import { GripVertical, Check, ChevronDown, ChevronUp, X, Settings2 } from 'lucide-react'

interface RecordItem {
  _id?: string
  title: string
  [key: string]: any
}

interface RecordSelectorProps {
  records: RecordItem[]
  selectedIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
  onReorder: (newOrder: any[]) => void
  label: string
}

export default function RecordSelector({
  records,
  selectedIds,
  onSelectionChange,
  onReorder,
  label
}: RecordSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const toggleSelection = (id: string | undefined) => {
    if (!id) return
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newRecords = [...records]
    ;[newRecords[index - 1], newRecords[index]] = [newRecords[index], newRecords[index - 1]]
    onReorder(newRecords)
  }

  const moveDown = (index: number) => {
    if (index === records.length - 1) return
    const newRecords = [...records]
    ;[newRecords[index], newRecords[index + 1]] = [newRecords[index + 1], newRecords[index]]
    onReorder(newRecords)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-md border border-border transition-colors whitespace-nowrap"
      >
        <Settings2 size={16} />
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {selectedIds.length}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-accent/30">
              <h3 className="text-lg font-bold">Select {label}</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {records.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground bg-accent/10 rounded-xl border border-dashed border-border">
                  No records available
                </div>
              ) : (
                records.map((record, index) => (
                  <div
                    key={record._id || index}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      record._id && selectedIds.includes(record._id) ? 'bg-primary/5 border-primary/30' : 'bg-background border-border'
                    }`}
                  >
                    <GripVertical className="text-muted-foreground/50" size={16} />
                    
                    {record._id && (
                      <button
                        onClick={() => toggleSelection(record._id!)}
                        className={`w-6 h-6 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                          selectedIds.includes(record._id!)
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border hover:border-primary bg-background'
                        }`}
                      >
                        {selectedIds.includes(record._id!) && <Check size={14} strokeWidth={3} />}
                      </button>
                    )}
                    
                    <span className="flex-1 text-sm font-medium line-clamp-2" title={record.title}>{record.title}</span>
                    
                    <div className="flex flex-col gap-1 shrink-0 bg-accent/50 rounded-md p-1 border border-border/50">
                      <button
                        onClick={() => moveUp(index)}
                        className="p-1 hover:bg-background rounded hover:text-primary disabled:opacity-30 transition-colors"
                        disabled={index === 0}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        className="p-1 hover:bg-background rounded hover:text-primary disabled:opacity-30 transition-colors"
                        disabled={index === records.length - 1}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-accent/10 flex justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-105 transition-transform"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
