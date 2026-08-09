import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { useState, useRef, useEffect } from 'react'
import { Crop } from 'lucide-react'
import ImageCropModal from './ImageCropModal'

export default function ResizableImage(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props
  const { src, alt, title, width, height } = node.attrs

  const [isResizing, setIsResizing] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handlers for Resizing
  const handleMouseDown = (e: React.MouseEvent, corner: string) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.pageX
    const startY = e.pageY
    const startWidth = containerRef.current?.offsetWidth || 0
    const startHeight = containerRef.current?.offsetHeight || 0

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.pageX - startX
      const dy = moveEvent.pageY - startY
      
      let newWidth = startWidth
      let newHeight = startHeight

      if (corner.includes('right')) newWidth = startWidth + dx
      if (corner.includes('left')) newWidth = startWidth - dx
      if (corner.includes('bottom')) newHeight = startHeight + dy
      if (corner.includes('top')) newHeight = startHeight - dy

      // Maintain aspect ratio or just free resize? Free resize allows stretching, 
      // but usually users prefer aspect ratio. Let's do simple free resize since we don't know original aspect ratio.
      // Wait, standard HTML images maintain aspect ratio if only width is set. 
      // If both are set, it stretches. We'll set both.
      updateAttributes({ width: Math.max(50, newWidth), height: Math.max(50, newHeight) })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleCropComplete = (croppedBase64: string) => {
    updateAttributes({ src: croppedBase64, width: null, height: null })
  }

  return (
    <NodeViewWrapper className="inline-block relative group" style={{ maxWidth: '100%', verticalAlign: 'middle', lineHeight: 0 }}>
      <div 
        ref={containerRef}
        className={`relative inline-block ${selected || isResizing ? 'ring-2 ring-primary' : ''}`}
        style={{ width: width || 'auto', height: height || 'auto', maxWidth: '100%', lineHeight: 0 }}
      >
        <img
          src={src}
          alt={alt}
          title={title}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
        />

        {/* Action Toolbar (Hover) */}
        {!isResizing && (
          <div className={`absolute top-2 right-2 flex gap-1 opacity-0 ${selected ? 'opacity-100' : 'group-hover:opacity-100'} transition-opacity bg-card/80 backdrop-blur rounded-lg p-1 shadow-sm border border-border`}>
            <button 
              onClick={(e) => { e.preventDefault(); setShowCropModal(true) }} 
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
              title="Crop Image"
            >
              <Crop size={14} />
            </button>
          </div>
        )}

        {/* Resize Handles (Show only when selected) */}
        {selected && (
          <>
            <div 
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary border-2 border-white rounded-full cursor-nwse-resize"
              onMouseDown={(e) => handleMouseDown(e, 'top-left')}
            />
            <div 
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary border-2 border-white rounded-full cursor-nesw-resize"
              onMouseDown={(e) => handleMouseDown(e, 'top-right')}
            />
            <div 
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary border-2 border-white rounded-full cursor-nesw-resize"
              onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
            />
            <div 
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary border-2 border-white rounded-full cursor-nwse-resize"
              onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
            />
          </>
        )}
      </div>

      <ImageCropModal 
        isOpen={showCropModal} 
        imageSrc={src} 
        onClose={() => setShowCropModal(false)} 
        onCropComplete={handleCropComplete} 
      />
    </NodeViewWrapper>
  )
}
