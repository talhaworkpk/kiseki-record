import React, { useState, useEffect } from 'react'
import { ImageOff, RefreshCw, ExternalLink } from 'lucide-react'
import { normalizeUrl } from '../../lib/utils'

interface SafeImageProps {
  src: string
  alt?: string
  className?: string
  fallbackClassName?: string
  onLoad?: () => void
  openOriginal?: () => void
  forceDisplay?: boolean // If true, show image even if it fails to load
}

export default function SafeImage({ src, alt, className, fallbackClassName, onLoad, openOriginal, forceDisplay = false }: SafeImageProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retryKey, setRetryKey] = useState(0)
  const imgRef = React.useRef<HTMLImageElement>(null)

  const normalizedSrc = normalizeUrl(src)

  useEffect(() => {
    setError(false)
    setLoading(true)
    
    if (imgRef.current?.complete) {
      if (imgRef.current.naturalWidth === 0) setError(true)
      else setLoading(false)
    }
  }, [src, retryKey])

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Image failed to load:', normalizedSrc, e)
    if (!forceDisplay) {
      setError(true)
      setLoading(false)
    } else {
      // Force display mode - still show the image even if it fails
      setLoading(false)
    }
  }

  const handleLoad = () => {
    setError(false)
    setLoading(false)
    if (onLoad) onLoad()
  }

  if (error && !forceDisplay) {
    return (
      <div className={`flex flex-col items-center justify-center bg-accent border border-dashed border-border rounded-lg p-4 text-center ${fallbackClassName || className}`}>
        <ImageOff size={32} className="text-muted-foreground/50 mb-2" />
        <p className="text-sm font-medium text-muted-foreground mb-1">Image could not be loaded</p>
        <p className="text-xs text-muted-foreground/70 mb-3 truncate max-w-[200px]">{src.split(/[\\/]/).pop()}</p>
        <div className="flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setRetryKey(k => k + 1) }} 
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-background border border-border rounded-md hover:bg-card hover:text-primary transition-colors"
          >
            <RefreshCw size={12} /> Retry
          </button>
          {openOriginal && (
            <button 
              onClick={(e) => { e.stopPropagation(); openOriginal() }} 
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-background border border-border rounded-md hover:bg-card hover:text-primary transition-colors"
            >
              <ExternalLink size={12} /> Open File
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {loading && !error && (
        <div className="absolute inset-0 bg-accent animate-pulse rounded-lg"></div>
      )}
      <img
        ref={imgRef}
        key={retryKey}
        src={normalizedSrc}
        alt={alt || 'Image'}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loading && !error ? 'opacity-0' : 'opacity-100'}`}
        onError={handleError}
        onLoad={handleLoad}
        crossOrigin="anonymous"
      />
    </div>
  )
}
