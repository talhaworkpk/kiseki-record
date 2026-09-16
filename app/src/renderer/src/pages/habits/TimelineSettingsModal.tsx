import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Settings, Plus, Trash2, Image as ImageIcon, Upload, HelpCircle, Pencil, ZoomIn, ZoomOut, RotateCcw, Layout } from 'lucide-react'
import { normalizeUrl } from '../../lib/utils'

interface BoxShadow {
  id: string
  x: string
  y: string
  blur: string
  spread: string
  color: string
}

interface TimelineSettings {
  // Calendar settings
  calendarBgImage: string
  calendarBgVideo?: string
  calendarBgOpacity: number
  calendarBgOffsetX: number
  calendarBgOffsetY: number
  calendarBgZoom: number
  calendarBgFit: 'cover' | 'contain' | 'fill'
  calendarBorderColors: string[]
  calendarBoxShadows: BoxShadow[]
  calendarDateColor: string
  calendarDateHoverColor: string
  calendarBorderHoverColor: string
  calendarBorderWidth: number
  calendarBorderRotation: boolean
  calendarBorderRotationSpeed: number
  calendarBorderMovementType: string
  
  // Header settings
  headerBgImage: string
  headerBgVideo?: string
  headerBgOpacity: number
  headerBgOffsetX: number   // 0-100 (background-position %)
  headerBgOffsetY: number   // 0-100
  headerBgZoom: number      // 100-300 (background-size %)
  headerBgFit: 'cover' | 'contain' | 'fill'
  headerBorderColors: string[]
  headerBoxShadows: BoxShadow[]
  headerBorderWidth: number
  headerBorderRotation: boolean
  headerBorderRotationSpeed: number
  headerBorderMovementType: string
  sameAsPublic?: boolean

  // Card settings
  cardGlassmorphism: boolean
  cardBlur: number
  cardOpacity: number
}

interface TimelineSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: TimelineSettings) => void
  currentSettings: TimelineSettings
  isPrivate?: boolean
  publicSettings?: TimelineSettings
}

// ── Interactive image position/zoom editor ──────────────────────────────────
// Uses background-image with pixel-computed background-size so the browser
// renders at native image resolution at all zoom levels — no blurring.
function ImageEditor({
  src,
  offsetX,
  offsetY,
  zoom,
  fit = 'cover',
  onChange,
  aspectRatio = '16 / 3',
}: {
  src: string
  offsetX: number
  offsetY: number
  zoom: number
  fit?: 'cover' | 'contain' | 'fill'
  onChange: (x: number, y: number, z: number) => void
  aspectRatio?: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  const safeSrc = src.startsWith('local-media://') ? src : src.replace(/^file:\/\/\//, 'local-media://')
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

  useEffect(() => {
    setNaturalSize(null)
    const img = new Image()
    img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = safeSrc
  }, [safeSrc])

  // Compute pixel background-size and background-position from stored 0-100% values
  const getBgStyle = (containerW: number, containerH: number): React.CSSProperties => {
    if (!naturalSize) return { backgroundImage: `url(${safeSrc})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    let baseScale: number
    if (fit === 'contain') {
      baseScale = Math.min(containerW / naturalSize.w, containerH / naturalSize.h)
    } else if (fit === 'fill') {
      // fill stretches to exact container size regardless of aspect ratio
      const scaledW = Math.round(containerW * (zoom / 100))
      const scaledH = Math.round(containerH * (zoom / 100))
      const posX = -Math.round((offsetX / 100) * Math.max(0, scaledW - containerW))
      const posY = -Math.round((offsetY / 100) * Math.max(0, scaledH - containerH))
      return {
        backgroundImage: `url(${safeSrc})`,
        backgroundSize: `${scaledW}px ${scaledH}px`,
        backgroundPosition: `${posX}px ${posY}px`,
        backgroundRepeat: 'no-repeat',
      }
    } else {
      // cover (default)
      baseScale = Math.max(containerW / naturalSize.w, containerH / naturalSize.h)
    }
    const scaleToFit = baseScale * (zoom / 100)
    const scaledW = Math.round(naturalSize.w * scaleToFit)
    const scaledH = Math.round(naturalSize.h * scaleToFit)
    const posX = -Math.round((offsetX / 100) * Math.max(0, scaledW - containerW))
    const posY = -Math.round((offsetY / 100) * Math.max(0, scaledH - containerH))
    return {
      backgroundImage: `url(${safeSrc})`,
      backgroundSize: `${scaledW}px ${scaledH}px`,
      backgroundPosition: `${posX}px ${posY}px`,
      backgroundRepeat: 'no-repeat',
    }
  }

  // Use a ResizeObserver-friendly approach: compute on render using offsetWidth/Height
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!boxRef.current) return
    const ro = new ResizeObserver(() => setTick(t => t + 1))
    ro.observe(boxRef.current)
    return () => ro.disconnect()
  }, [])

  const containerW = boxRef.current?.offsetWidth ?? 600
  const containerH = boxRef.current?.offsetHeight ?? 120
  const bgStyle = getBgStyle(containerW, containerH)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !boxRef.current || !naturalSize) return
    const baseScale = fit === 'contain'
      ? Math.min(containerW / naturalSize.w, containerH / naturalSize.h)
      : Math.max(containerW / naturalSize.w, containerH / naturalSize.h)
    const scaleToFit = baseScale * (zoom / 100)
    const scaledW = naturalSize.w * scaleToFit
    const scaledH = naturalSize.h * scaleToFit
    const maxOffX = Math.max(1, scaledW - containerW)
    const maxOffY = Math.max(1, scaledH - containerH)
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    onChange(
      clamp(offsetX - (dx / maxOffX) * 100, 0, 100),
      clamp(offsetY - (dy / maxOffY) * 100, 0, 100),
      zoom
    )
  }

  const handleMouseUp = () => { dragging.current = false }
  const adjustZoom = (delta: number) => onChange(offsetX, offsetY, clamp(zoom + delta, 100, 300))
  const reset = () => onChange(50, 50, 100)

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        className="relative w-full rounded-xl overflow-hidden border-2 border-primary/40 select-none bg-black"
        style={{ aspectRatio, cursor: dragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="absolute inset-0" style={bgStyle} />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[11px] font-bold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
            Hold & drag to reposition
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => adjustZoom(-10)} className="p-2 rounded-lg bg-accent hover:bg-accent/80 transition-colors text-foreground" title="Zoom out"><ZoomOut size={15} /></button>
        <div className="flex-1 flex items-center gap-2">
          <input type="range" min={100} max={300} step={5} value={zoom}
            onChange={(e) => onChange(offsetX, offsetY, parseInt(e.target.value))}
            className="flex-1 accent-primary" />
          <span className="text-xs text-muted-foreground w-10 text-right">{zoom}%</span>
        </div>
        <button onClick={() => adjustZoom(10)} className="p-2 rounded-lg bg-accent hover:bg-accent/80 transition-colors text-foreground" title="Zoom in"><ZoomIn size={15} /></button>
        <button onClick={reset} className="p-2 rounded-lg bg-accent hover:bg-accent/80 transition-colors text-muted-foreground" title="Reset"><RotateCcw size={15} /></button>
      </div>
      <div className="text-[10px] text-muted-foreground text-center">
        Position {Math.round(offsetX)}% / {Math.round(offsetY)}%  ·  Zoom {zoom}%
      </div>
    </div>
  )
}
// ──────────────────────────────────────────────────────────────────────────────

export default function TimelineSettingsModal({ isOpen, onClose, onSave, currentSettings, isPrivate, publicSettings }: TimelineSettingsModalProps) {
  const [settings, setSettings] = useState<TimelineSettings>(currentSettings)
  const [showBoxShadowHelp, setShowBoxShadowHelp] = useState(false)
  const [showHeaderImageEditor, setShowHeaderImageEditor] = useState(false)
  const [showCalendarImageEditor, setShowCalendarImageEditor] = useState(false)

  useEffect(() => {
    setSettings(currentSettings)
  }, [currentSettings])

  const handleFileUpload = async (type: 'calendar' | 'header', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        try {
          // @ts-ignore
          const result = await window.api.attachment.saveBase64(base64)
          console.log('File upload result:', result)
          if (result.success && result.filePath) {
            // Convert file:// to local-media:// protocol for proper loading
            const mediaUrl = result.filePath.replace(/^file:\/\/\//, 'local-media://')
            console.log('Converted to media URL:', mediaUrl)
            if (type === 'calendar') {
              setSettings({ ...settings, calendarBgImage: mediaUrl })
            } else {
              setSettings({ ...settings, headerBgImage: mediaUrl })
            }
          } else {
            console.error('Failed to save image:', result.error)
          }
        } catch (err) {
          console.error('Error saving image:', err)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Error reading file:', err)
    }
  }

  const handleVideoUpload = async (type: 'calendar' | 'header', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // Use saveFile with the local path for videos (since base64 conversion is too heavy)
      // @ts-ignore
      const result = await window.api.attachment.saveFile((file as any).path)
      if (result.success && result.filePath) {
        const mediaUrl = result.filePath.replace(/^file:\/\/\//, 'local-media://')
        if (type === 'calendar') {
          setSettings({ ...settings, calendarBgVideo: mediaUrl })
        } else {
          setSettings({ ...settings, headerBgVideo: mediaUrl })
        }
      } else {
        console.error('Failed to save video:', result.error)
      }
    } catch (err) {
      console.error('Error uploading video:', err)
    }
  }

  const handleSave = () => {
    onSave(settings)
    onClose()
  }

  const addBorderColor = (type: 'calendar' | 'header') => {
    if (type === 'calendar' && settings.calendarBorderColors.length < 3) {
      setSettings({ ...settings, calendarBorderColors: [...settings.calendarBorderColors, '#ff0000'] })
    } else if (type === 'header' && settings.headerBorderColors.length < 3) {
      setSettings({ ...settings, headerBorderColors: [...settings.headerBorderColors, '#ff0000'] })
    }
  }

  const removeBorderColor = (type: 'calendar' | 'header', index: number) => {
    if (type === 'calendar') {
      setSettings({ ...settings, calendarBorderColors: settings.calendarBorderColors.filter((_, i) => i !== index) })
    } else {
      setSettings({ ...settings, headerBorderColors: settings.headerBorderColors.filter((_, i) => i !== index) })
    }
  }

  const addBoxShadow = (type: 'calendar' | 'header') => {
    const shadows = type === 'calendar' ? settings.calendarBoxShadows : settings.headerBoxShadows
    if (shadows.length < 5) {
      const newShadow: BoxShadow = {
        id: Date.now().toString(),
        x: '0',
        y: '4',
        blur: '6',
        spread: '-1',
        color: 'rgba(0, 0, 0, 0.1)'
      }
      if (type === 'calendar') {
        setSettings({ ...settings, calendarBoxShadows: [...settings.calendarBoxShadows, newShadow] })
      } else {
        setSettings({ ...settings, headerBoxShadows: [...settings.headerBoxShadows, newShadow] })
      }
    }
  }

  const removeBoxShadow = (type: 'calendar' | 'header', id: string) => {
    if (type === 'calendar') {
      setSettings({ ...settings, calendarBoxShadows: settings.calendarBoxShadows.filter(s => s.id !== id) })
    } else {
      setSettings({ ...settings, headerBoxShadows: settings.headerBoxShadows.filter(s => s.id !== id) })
    }
  }

  const updateBoxShadow = (type: 'calendar' | 'header', id: string, field: keyof BoxShadow, value: string) => {
    if (type === 'calendar') {
      setSettings({
        ...settings,
        calendarBoxShadows: settings.calendarBoxShadows.map(s => s.id === id ? { ...s, [field]: value } : s)
      })
    } else {
      setSettings({
        ...settings,
        headerBoxShadows: settings.headerBoxShadows.map(s => s.id === id ? { ...s, [field]: value } : s)
      })
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card shrink-0">
          <div>
            <h2 className="text-xl font-bold text-primary">Timeline Customization</h2>
            <div className="text-sm font-medium text-muted-foreground">Personalize your timeline appearance</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {isPrivate && (
            <div className="flex items-center justify-between p-4 bg-accent/20 border border-border rounded-xl">
              <div>
                <div className="font-bold text-sm text-foreground">Same as Public Timeline</div>
                <div className="text-xs text-muted-foreground">Use the same customization as your public profile</div>
              </div>
              <button
                onClick={() => {
                  const newSameAsPublic = !settings.sameAsPublic
                  if (newSameAsPublic && publicSettings) {
                    setSettings({ ...publicSettings, sameAsPublic: true })
                  } else {
                    setSettings({ ...settings, sameAsPublic: false })
                  }
                }}
                className={`w-12 h-6 rounded-full transition-colors ${settings.sameAsPublic ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.sameAsPublic ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}

          {(!isPrivate || !settings.sameAsPublic) && (
            <>
              {/* Calendar Settings */}
              <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Settings size={18} className="text-primary" />
              Calendar Settings
            </h3>
            
            {/* Background Image */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Background Image</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.calendarBgImage}
                    onChange={(e) => setSettings({ ...settings, calendarBgImage: e.target.value })}
                    placeholder="https://example.com/image.jpg or upload from PC"
                    className="flex-1 bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none text-sm"
                  />
                  {settings.calendarBgImage ? (
                    <div className="flex gap-2">
                      {(() => {
                        const calFit = settings.calendarBgFit ?? 'cover'
                        const editDisabled = calFit !== 'cover'
                        const editTitle = editDisabled
                          ? `Position & zoom have no effect in "${calFit}" mode`
                          : 'Edit position & zoom'
                        return (
                          <button
                            onClick={() => !editDisabled && setShowCalendarImageEditor(v => !v)}
                            className={`relative px-3 py-3 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm
                              ${editDisabled
                                ? 'opacity-40 cursor-not-allowed bg-accent text-muted-foreground'
                                : showCalendarImageEditor
                                  ? 'bg-primary/20 text-primary cursor-pointer'
                                  : 'bg-accent hover:bg-accent/80 text-foreground cursor-pointer'
                              }`}
                            title={editTitle}
                          >
                            <Pencil size={15} />
                            {editDisabled && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] font-black text-black leading-none">!</span>
                            )}
                          </button>
                        )
                      })()}
                      <select
                        value={settings.calendarBgFit ?? 'cover'}
                        onChange={(e) => setSettings({ ...settings, calendarBgFit: e.target.value as 'cover' | 'contain' | 'fill' })}
                        className="px-2 py-2 bg-accent hover:bg-accent/80 border border-border rounded-xl text-sm text-foreground cursor-pointer outline-none focus:ring-2 focus:ring-primary/50"
                        title="Image fit mode"
                      >
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                        <option value="fill">Fill</option>
                      </select>
                      <button
                        onClick={() => {
                          setSettings({ ...settings, calendarBgImage: '', calendarBgOffsetX: 50, calendarBgOffsetY: 50, calendarBgZoom: 100 })
                          setShowCalendarImageEditor(false)
                        }}
                        className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl cursor-pointer transition-colors flex items-center gap-2 font-medium text-sm"
                        title="Remove image"
                      >
                        <X size={16} />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl cursor-pointer transition-colors flex items-center gap-2 font-medium text-sm">
                      <Upload size={16} />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('calendar', e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Interactive editor */}
                {settings.calendarBgImage && showCalendarImageEditor && (
                  <ImageEditor
                    src={settings.calendarBgImage}
                    offsetX={settings.calendarBgOffsetX ?? 50}
                    offsetY={settings.calendarBgOffsetY ?? 50}
                    zoom={settings.calendarBgZoom ?? 100}
                    fit={settings.calendarBgFit ?? 'cover'}
                    onChange={(x, y, z) => setSettings({ ...settings, calendarBgOffsetX: x, calendarBgOffsetY: y, calendarBgZoom: z })}
                    aspectRatio="4 / 3"
                  />
                )}

                {/* Collapsed thumbnail */}
                {settings.calendarBgImage && !showCalendarImageEditor && (
                  <div className="relative h-20 rounded-lg overflow-hidden border border-border">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${settings.calendarBgImage.startsWith('local-media://') ? settings.calendarBgImage : settings.calendarBgImage.replace(/^file:\/\/\//, 'local-media://')})`,
                        backgroundSize: `${settings.calendarBgZoom ?? 100}%`,
                        backgroundPosition: `${settings.calendarBgOffsetX ?? 50}% ${settings.calendarBgOffsetY ?? 50}%`,
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Background Video */}
            <div className="space-y-2 mt-4">
              <label className="text-xs font-bold text-muted-foreground uppercase">Background Video</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.calendarBgVideo || ''}
                    onChange={(e) => setSettings({ ...settings, calendarBgVideo: e.target.value })}
                    placeholder="https://example.com/video.mp4 or upload from PC"
                    className="flex-1 bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none text-sm"
                  />
                  {settings.calendarBgVideo ? (
                    <button
                      onClick={() => setSettings({ ...settings, calendarBgVideo: '' })}
                      className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl cursor-pointer transition-colors flex items-center gap-2 font-medium text-sm"
                      title="Remove video"
                    >
                      <X size={16} />
                      Remove
                    </button>
                  ) : (
                    <label className="px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl cursor-pointer transition-colors flex items-center gap-2 font-medium text-sm">
                      <Upload size={16} />
                      Upload
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoUpload('calendar', e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                {settings.calendarBgVideo && (
                  <div className="text-xs text-muted-foreground bg-accent/20 p-2 rounded-lg border border-border">
                    Video active. It will cover the background behind the calendar.
                  </div>
                )}
              </div>
            </div>

            {/* Background Opacity */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
                <span>Background Opacity</span>
                <span className="text-foreground">{Math.round(settings.calendarBgOpacity * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.calendarBgOpacity}
                onChange={(e) => setSettings({ ...settings, calendarBgOpacity: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            {/* Date Colors */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Date Colors</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.calendarDateColor}
                      onChange={(e) => setSettings({ ...settings, calendarDateColor: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={settings.calendarDateColor}
                      onChange={(e) => setSettings({ ...settings, calendarDateColor: e.target.value })}
                      className="flex-1 bg-background border border-border p-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Hover Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.calendarDateHoverColor}
                      onChange={(e) => setSettings({ ...settings, calendarDateHoverColor: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={settings.calendarDateHoverColor}
                      onChange={(e) => setSettings({ ...settings, calendarDateHoverColor: e.target.value })}
                      className="flex-1 bg-background border border-border p-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Border Hover Color */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Border Hover Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.calendarBorderHoverColor}
                  onChange={(e) => setSettings({ ...settings, calendarBorderHoverColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={settings.calendarBorderHoverColor}
                  onChange={(e) => setSettings({ ...settings, calendarBorderHoverColor: e.target.value })}
                  className="flex-1 bg-background border border-border p-2 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Border Width */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
                <span>Border Width</span>
                <span className="text-foreground">{settings.calendarBorderWidth}px</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.calendarBorderWidth}
                onChange={(e) => setSettings({ ...settings, calendarBorderWidth: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            {/* Border Rotation */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between items-center">
                <span>Border Rotation</span>
                <button
                  onClick={() => setSettings({ ...settings, calendarBorderRotation: !settings.calendarBorderRotation })}
                  className={`w-12 h-6 rounded-full transition-colors ${settings.calendarBorderRotation ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.calendarBorderRotation ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </label>
              {settings.calendarBorderRotation && (
                <div className="space-y-3 pl-1">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground flex justify-between">
                      <span>Rotation Speed</span>
                      <span className="text-foreground">{settings.calendarBorderRotationSpeed}s</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      step="1"
                      value={settings.calendarBorderRotationSpeed}
                      onChange={(e) => setSettings({ ...settings, calendarBorderRotationSpeed: parseFloat(e.target.value) })}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>1s (fast)</span>
                      <span>60s (slow)</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Movement Type</label>
                    <select
                      value={settings.calendarBorderMovementType ?? 'clockwise'}
                      onChange={(e) => setSettings({ ...settings, calendarBorderMovementType: e.target.value })}
                      className="w-full bg-background border border-border p-2 rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                      <option value="clockwise">↻ Clockwise</option>
                      <option value="counter-clockwise">↺ Counter-clockwise</option>
                      <option value="pulse">◉ Pulse</option>
                      <option value="bounce">⬡ Bounce</option>
                      <option value="sweep">⟳ Sweep</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Gradient Border Colors */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between items-center">
                <span>Gradient Border Colors ({settings.calendarBorderColors.length}/3)</span>
                {settings.calendarBorderColors.length < 3 && (
                  <button
                    onClick={() => addBorderColor('calendar')}
                    className="p-1 hover:bg-accent rounded-md text-primary"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {settings.calendarBorderColors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...settings.calendarBorderColors]
                        newColors[index] = e.target.value
                        setSettings({ ...settings, calendarBorderColors: newColors })
                      }}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <button
                      onClick={() => removeBorderColor('calendar', index)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Box Shadows */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>Box Shadows ({settings.calendarBoxShadows.length}/5)</span>
                  <button
                    onClick={() => setShowBoxShadowHelp(!showBoxShadowHelp)}
                    className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    title="What do these values mean?"
                  >
                    <HelpCircle size={14} />
                  </button>
                </div>
                {settings.calendarBoxShadows.length < 5 && (
                  <button
                    onClick={() => addBoxShadow('calendar')}
                    className="p-1 hover:bg-accent rounded-md text-primary"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </label>
              {showBoxShadowHelp && (
                <div className="bg-accent/50 p-3 rounded-lg text-xs space-y-2 border border-border">
                  <div className="font-semibold text-foreground mb-2">Box Shadow Properties:</div>
                  <div><strong>X:</strong> Horizontal offset. Positive = right, Negative = left</div>
                  <div><strong>Y:</strong> Vertical offset. Positive = down, Negative = up</div>
                  <div><strong>Blur:</strong> How blurry the shadow is. Higher = more faded/soft</div>
                  <div><strong>Spread:</strong> Shadow size. Positive = larger, Negative = smaller</div>
                </div>
              )}
              <div className="space-y-3">
                {settings.calendarBoxShadows.map((shadow) => (
                  <div key={shadow.id} className="bg-accent/30 p-3 rounded-xl border border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">Shadow</span>
                      <button
                        onClick={() => removeBoxShadow('calendar', shadow.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">X</label>
                        <input
                          type="text"
                          value={shadow.x}
                          onChange={(e) => updateBoxShadow('calendar', shadow.id, 'x', e.target.value)}
                          className="w-full bg-background border border-border p-2 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Y</label>
                        <input
                          type="text"
                          value={shadow.y}
                          onChange={(e) => updateBoxShadow('calendar', shadow.id, 'y', e.target.value)}
                          className="w-full bg-background border border-border p-2 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Blur</label>
                        <input
                          type="text"
                          value={shadow.blur}
                          onChange={(e) => updateBoxShadow('calendar', shadow.id, 'blur', e.target.value)}
                          className="w-full bg-background border border-border p-2 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Spread</label>
                        <input
                          type="text"
                          value={shadow.spread}
                          onChange={(e) => updateBoxShadow('calendar', shadow.id, 'spread', e.target.value)}
                          className="w-full bg-background border border-border p-2 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Color</label>
                        <input
                          type="color"
                          value={shadow.color}
                          onChange={(e) => updateBoxShadow('calendar', shadow.id, 'color', e.target.value)}
                          className="w-full h-8 rounded-lg cursor-pointer border-0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Header Settings */}
          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ImageIcon size={18} className="text-primary" />
              Header Settings
            </h3>
            
            {/* Background Image */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Background Image</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.headerBgImage}
                    onChange={(e) => setSettings({ ...settings, headerBgImage: e.target.value })}
                    placeholder="https://example.com/image.jpg or upload from PC"
                    className="flex-1 bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none text-sm"
                  />
                  {settings.headerBgImage ? (
                    <div className="flex gap-2">
                      {(() => {
                        const hdrFit = settings.headerBgFit ?? 'cover'
                        const editDisabled = hdrFit !== 'cover'
                        const editTitle = editDisabled
                          ? `Position & zoom have no effect in "${hdrFit}" mode`
                          : 'Edit position & zoom'
                        return (
                          <button
                            onClick={() => !editDisabled && setShowHeaderImageEditor(v => !v)}
                            className={`relative px-3 py-3 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm
                              ${editDisabled
                                ? 'opacity-40 cursor-not-allowed bg-accent text-muted-foreground'
                                : showHeaderImageEditor
                                  ? 'bg-primary/20 text-primary cursor-pointer'
                                  : 'bg-accent hover:bg-accent/80 text-foreground cursor-pointer'
                              }`}
                            title={editTitle}
                          >
                            <Pencil size={15} />
                            {editDisabled && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] font-black text-black leading-none">!</span>
                            )}
                          </button>
                        )
                      })()}
                      <select
                        value={settings.headerBgFit ?? 'cover'}
                        onChange={(e) => setSettings({ ...settings, headerBgFit: e.target.value as 'cover' | 'contain' | 'fill' })}
                        className="px-2 py-2 bg-accent hover:bg-accent/80 border border-border rounded-xl text-sm text-foreground cursor-pointer outline-none focus:ring-2 focus:ring-primary/50"
                        title="Image fit mode"
                      >
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                        <option value="fill">Fill</option>
                      </select>
                      <button
                        onClick={() => {
                          setSettings({ ...settings, headerBgImage: '', headerBgOffsetX: 50, headerBgOffsetY: 50, headerBgZoom: 100 })
                          setShowHeaderImageEditor(false)
                        }}
                        className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl cursor-pointer transition-colors flex items-center gap-2 font-medium text-sm"
                        title="Remove image"
                      >
                        <X size={16} />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl cursor-pointer transition-colors flex items-center gap-2 font-medium text-sm">
                      <Upload size={16} />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('header', e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Interactive editor — shown when pencil icon is active */}
                {settings.headerBgImage && showHeaderImageEditor && (
                  <ImageEditor
                    src={settings.headerBgImage}
                    offsetX={settings.headerBgOffsetX ?? 50}
                    offsetY={settings.headerBgOffsetY ?? 50}
                    zoom={settings.headerBgZoom ?? 100}
                    fit={settings.headerBgFit ?? 'cover'}
                    onChange={(x, y, z) => setSettings({ ...settings, headerBgOffsetX: x, headerBgOffsetY: y, headerBgZoom: z })}
                    aspectRatio="16 / 3"
                  />
                )}

                {/* Collapsed thumbnail when editor is closed */}
                {settings.headerBgImage && !showHeaderImageEditor && (
                  <div className="relative h-16 rounded-lg overflow-hidden border border-border">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${settings.headerBgImage.startsWith('local-media://') ? settings.headerBgImage : settings.headerBgImage.replace(/^file:\/\/\//, 'local-media://')})`,
                        backgroundSize: `${settings.headerBgZoom ?? 100}%`,
                        backgroundPosition: `${settings.headerBgOffsetX ?? 50}% ${settings.headerBgOffsetY ?? 50}%`,
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Background Video */}
            <div className="space-y-2 mt-4">
              <label className="text-xs font-bold text-muted-foreground uppercase">Background Video</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.headerBgVideo || ''}
                    onChange={(e) => setSettings({ ...settings, headerBgVideo: e.target.value })}
                    placeholder="https://example.com/video.mp4 or upload from PC"
                    className="flex-1 bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none text-sm"
                  />
                  {settings.headerBgVideo ? (
                    <button
                      onClick={() => setSettings({ ...settings, headerBgVideo: '' })}
                      className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl cursor-pointer transition-colors flex items-center gap-2 font-medium text-sm"
                      title="Remove video"
                    >
                      <X size={16} />
                      Remove
                    </button>
                  ) : (
                    <label className="px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl cursor-pointer transition-colors flex items-center gap-2 font-medium text-sm">
                      <Upload size={16} />
                      Upload
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoUpload('header', e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                {settings.headerBgVideo && (
                  <div className="text-xs text-muted-foreground bg-accent/20 p-2 rounded-lg border border-border">
                    Video active. It will cover the background behind the header.
                  </div>
                )}
              </div>
            </div>

            {/* Background Opacity */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
                <span>Background Opacity</span>
                <span className="text-foreground">{Math.round(settings.headerBgOpacity * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.headerBgOpacity}
                onChange={(e) => setSettings({ ...settings, headerBgOpacity: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            {/* Gradient Border Colors */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between items-center">
                <span>Gradient Border Colors ({settings.headerBorderColors.length}/3)</span>
                {settings.headerBorderColors.length < 3 && (
                  <button
                    onClick={() => addBorderColor('header')}
                    className="p-1 hover:bg-accent rounded-md text-primary"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {settings.headerBorderColors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...settings.headerBorderColors]
                        newColors[index] = e.target.value
                        setSettings({ ...settings, headerBorderColors: newColors })
                      }}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <button
                      onClick={() => removeBorderColor('header', index)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Border Width */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
                <span>Border Width</span>
                <span className="text-foreground">{settings.headerBorderWidth}px</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.headerBorderWidth}
                onChange={(e) => setSettings({ ...settings, headerBorderWidth: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            {/* Border Rotation */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between items-center">
                <span>Border Rotation</span>
                <button
                  onClick={() => setSettings({ ...settings, headerBorderRotation: !settings.headerBorderRotation })}
                  className={`w-12 h-6 rounded-full transition-colors ${settings.headerBorderRotation ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.headerBorderRotation ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </label>
              {settings.headerBorderRotation && (
                <div className="space-y-3 pl-1">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground flex justify-between">
                      <span>Rotation Speed</span>
                      <span className="text-foreground">{settings.headerBorderRotationSpeed}s</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      step="1"
                      value={settings.headerBorderRotationSpeed}
                      onChange={(e) => setSettings({ ...settings, headerBorderRotationSpeed: parseFloat(e.target.value) })}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>1s (fast)</span>
                      <span>60s (slow)</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Movement Type</label>
                    <select
                      value={settings.headerBorderMovementType ?? 'clockwise'}
                      onChange={(e) => setSettings({ ...settings, headerBorderMovementType: e.target.value })}
                      className="w-full bg-background border border-border p-2 rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                      <option value="clockwise">↻ Clockwise</option>
                      <option value="counter-clockwise">↺ Counter-clockwise</option>
                      <option value="pulse">◉ Pulse</option>
                      <option value="bounce">⬡ Bounce</option>
                      <option value="sweep">⟳ Sweep</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Box Shadows */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>Box Shadows ({settings.headerBoxShadows.length}/5)</span>
                  <button
                    onClick={() => setShowBoxShadowHelp(!showBoxShadowHelp)}
                    className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    title="What do these values mean?"
                  >
                    <HelpCircle size={14} />
                  </button>
                </div>
                {settings.headerBoxShadows.length < 5 && (
                  <button
                    onClick={() => addBoxShadow('header')}
                    className="p-1 hover:bg-accent rounded-md text-primary"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </label>
              {showBoxShadowHelp && (
                <div className="bg-accent/50 p-3 rounded-lg text-xs space-y-2 border border-border">
                  <div className="font-semibold text-foreground mb-2">Box Shadow Properties:</div>
                  <div><strong>X:</strong> Horizontal offset. Positive = right, Negative = left</div>
                  <div><strong>Y:</strong> Vertical offset. Positive = down, Negative = up</div>
                  <div><strong>Blur:</strong> How blurry the shadow is. Higher = more faded/soft</div>
                  <div><strong>Spread:</strong> Shadow size. Positive = larger, Negative = smaller</div>
                </div>
              )}
              <div className="space-y-3">
                {settings.headerBoxShadows.map((shadow) => (
                  <div key={shadow.id} className="bg-accent/30 p-3 rounded-xl border border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">Shadow</span>
                      <button
                        onClick={() => removeBoxShadow('header', shadow.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">X</label>
                        <input
                          type="text"
                          value={shadow.x}
                          onChange={(e) => updateBoxShadow('header', shadow.id, 'x', e.target.value)}
                          className="w-full bg-background border border-border p-2 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Y</label>
                        <input
                          type="text"
                          value={shadow.y}
                          onChange={(e) => updateBoxShadow('header', shadow.id, 'y', e.target.value)}
                          className="w-full bg-background border border-border p-2 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Blur</label>
                        <input
                          type="text"
                          value={shadow.blur}
                          onChange={(e) => updateBoxShadow('header', shadow.id, 'blur', e.target.value)}
                          className="w-full bg-background border border-border p-2 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Spread</label>
                        <input
                          type="text"
                          value={shadow.spread}
                          onChange={(e) => updateBoxShadow('header', shadow.id, 'spread', e.target.value)}
                          className="w-full bg-background border border-border p-2 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Color</label>
                        <input
                          type="color"
                          value={shadow.color}
                          onChange={(e) => updateBoxShadow('header', shadow.id, 'color', e.target.value)}
                          className="w-full h-8 rounded-lg cursor-pointer border-0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
            
            {/* Card Settings */}
            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layout size={18} className="text-primary" />
                Card Settings
              </h3>
              
              <div className="p-4 bg-accent/20 border border-border rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-foreground">Glassmorphism Mode</div>
                    <div className="text-xs text-muted-foreground">Frosted glass effect for cards</div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, cardGlassmorphism: !settings.cardGlassmorphism })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.cardGlassmorphism ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.cardGlassmorphism ? 'left-[calc(100%-1.25rem)]' : 'left-1'}`} />
                  </button>
                </div>

                {settings.cardGlassmorphism && (
                  <div className="space-y-6 pt-4 border-t border-border/50">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
                        <span>Card Blur</span>
                        <span className="text-foreground bg-background px-2 py-0.5 rounded shadow-sm text-[10px]">{settings.cardBlur}px</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="40"
                        step="1"
                        value={settings.cardBlur}
                        onChange={(e) => setSettings({ ...settings, cardBlur: Number(e.target.value) })}
                        className="w-full accent-primary cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
                        <span>Card Opacity</span>
                        <span className="text-foreground bg-background px-2 py-0.5 rounded shadow-sm text-[10px]">{Math.round(settings.cardOpacity * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.cardOpacity}
                        onChange={(e) => setSettings({ ...settings, cardOpacity: Number(e.target.value) })}
                        className="w-full accent-primary cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-card shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold hover:bg-accent transition-colors">Cancel</button>
          <button 
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl font-bold bg-primary text-white hover:scale-105 transition-transform shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Settings size={18} /> Save Settings
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
