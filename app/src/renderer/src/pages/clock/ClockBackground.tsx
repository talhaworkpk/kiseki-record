import React, { useEffect, useState } from 'react'
import { useClockAppearance } from '../../contexts/ClockAppearanceContext'
import { ClockAsset } from '../../lib/constants/clockAppearance'

interface Props {
  sectionId: 'overview' | 'alarm' | 'timer' | 'stopwatch' | 'timeline' | 'aiSight'
}

export default function ClockBackground({ sectionId }: Props) {
  const { settings, loadAssetInfo } = useClockAppearance()
  const [asset, setAsset] = useState<ClockAsset | null>(null)
  
  const { background } = settings
  
  // Determine if we should use global or per-section
  const activeAssetId = background.mode === 'per-section' && background.sections[sectionId]
    ? background.sections[sectionId]
    : background.globalAssetId

  useEffect(() => {
    if (activeAssetId) {
      loadAssetInfo(activeAssetId).then(a => setAsset(a))
    } else {
      setAsset(null)
    }
  }, [activeAssetId, loadAssetInfo])

  if (!asset) return null

  const isVideo = asset.type === 'video'
  const opacity = background.globalOpacity
  const blur = background.globalBlur
  const overlayOpacity = background.globalOverlayOpacity

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-500">
      {isVideo ? (
        <video 
          src={asset.relativePath} 
          autoPlay 
          muted 
          loop 
          playsInline
          className="w-full h-full object-cover"
          style={{ 
            opacity,
            filter: blur > 0 ? `blur(${blur}px)` : 'none',
            transform: blur > 0 ? `scale(${1 + (blur * 0.05)})` : 'none' // Prevent blurred edges from leaking background
          }}
          onError={(e) => console.error("Failed to load video background", e)}
        />
      ) : (
        <img 
          src={asset.relativePath} 
          alt="Background"
          className="w-full h-full object-cover"
          style={{ 
            opacity,
            filter: blur > 0 ? `blur(${blur}px)` : 'none',
            transform: blur > 0 ? `scale(${1 + (blur * 0.05)})` : 'none'
          }}
          onError={(e) => console.error("Failed to load image background", e)}
        />
      )}
      
      {/* Overlay to preserve text readability */}
      <div 
        className="absolute inset-0 bg-background" 
        style={{ opacity: overlayOpacity }} 
      />
    </div>
  )
}
