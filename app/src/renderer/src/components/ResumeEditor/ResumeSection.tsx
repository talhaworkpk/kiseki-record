import { useState } from 'react'
import { GripVertical, Eye, EyeOff, Edit2, Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface ResumeSectionProps {
  title: string
  children: React.ReactNode
  onTitleChange: (title: string) => void
  onToggleVisibility: () => void
  onDuplicate: () => void
  onDelete: () => void
  isVisible: boolean
  canDelete?: boolean
}

export default function ResumeSection({
  title,
  children,
  onTitleChange,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  isVisible,
  canDelete = true
}: ResumeSectionProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      {/* Section Header */}
      <div className="flex items-center justify-between bg-accent px-4 py-2">
        <div className="flex items-center gap-2 flex-1">
          <GripVertical className="text-muted-foreground cursor-move" />
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingTitle(false)
              }}
              className="bg-background px-2 py-1 rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          ) : (
            <h3 className="font-semibold cursor-pointer hover:text-primary" onClick={() => setIsEditingTitle(true)}>
              {title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-background rounded"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={onToggleVisibility}
            className="p-1 hover:bg-background rounded"
            title={isVisible ? 'Hide' : 'Show'}
          >
            {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            onClick={() => setIsEditingTitle(true)}
            className="p-1 hover:bg-background rounded"
            title="Rename"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1 hover:bg-background rounded"
            title="Duplicate"
          >
            <Copy size={16} />
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Section Content */}
      {isVisible && !isCollapsed && (
        <div className="p-4 bg-background">
          {children}
        </div>
      )}
    </div>
  )
}
