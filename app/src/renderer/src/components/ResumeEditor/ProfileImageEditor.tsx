import { useState, useRef, useEffect } from 'react'
import { Move, Maximize2, RotateCw, EyeOff, Square, Circle } from 'lucide-react'

interface ProfileImageEditorProps {
  src?: string
}

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

export default function ProfileImageEditor({ src }: ProfileImageEditorProps) {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [size, setSize] = useState<Size>({ width: 100, height: 100 })
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [shape, setShape] = useState<'circle' | 'square'>('circle')
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize') => {
    e.preventDefault()
    if (action === 'drag') {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    } else {
      setIsResizing(true)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        })
      } else if (isResizing) {
        const container = containerRef.current
        if (container) {
          const rect = container.getBoundingClientRect()
          const newWidth = Math.max(50, e.clientX - rect.left)
          const newHeight = Math.max(50, e.clientY - rect.top)
          setSize({ width: newWidth, height: newHeight })
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragOffset])

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 })
    setSize({ width: 100, height: 100 })
    setRotation(0)
  }

  if (isHidden) {
    return (
      <div className="flex items-center gap-2 p-2 bg-accent rounded">
        <EyeOff size={16} />
        <span className="text-sm">Profile photo hidden</span>
        <button onClick={() => setIsHidden(false)} className="text-primary hover:underline text-sm">
          Show
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-2 p-2 bg-accent rounded">
        <button
          onMouseDown={(e) => handleMouseDown(e, 'drag')}
          className="p-1 hover:bg-background rounded"
          title="Move"
        >
          <Move size={16} />
        </button>
        <button
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
          className="p-1 hover:bg-background rounded"
          title="Resize"
        >
          <Maximize2 size={16} />
        </button>
        <button
          onClick={() => setRotation((r) => r + 90)}
          className="p-1 hover:bg-background rounded"
          title="Rotate"
        >
          <RotateCw size={16} />
        </button>
        <button
          onClick={() => setShape(shape === 'circle' ? 'square' : 'circle')}
          className="p-1 hover:bg-background rounded"
          title={`Change to ${shape === 'circle' ? 'square' : 'circle'}`}
        >
          {shape === 'circle' ? <Square size={16} /> : <Circle size={16} />}
        </button>
        <button
          onClick={() => setIsHidden(true)}
          className="p-1 hover:bg-background rounded"
          title="Hide"
        >
          <EyeOff size={16} />
        </button>
        <button
          onClick={resetPosition}
          className="p-1 hover:bg-background rounded text-xs"
          title="Reset"
        >
          Reset
        </button>
      </div>

      {/* Image Container */}
      <div ref={containerRef} className="relative bg-accent/50 border-2 border-dashed border-border rounded min-h-[200px]">
        {src ? (
          <div
            className="absolute cursor-move overflow-hidden"
            style={{
              left: position.x,
              top: position.y,
              width: size.width,
              height: size.height,
              transform: `rotate(${rotation}deg)`,
              borderRadius: shape === 'circle' ? '50%' : '0'
            }}
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
          >
            <img
              src={src}
              alt="Profile"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Resize Handle */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-primary cursor-se-resize"
              onMouseDown={(e) => {
                e.stopPropagation()
                handleMouseDown(e, 'resize')
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No profile photo
          </div>
        )}
      </div>
    </div>
  )
}
