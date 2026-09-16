import React from 'react'
import { X, Image as ImageIcon, Video, Palette, MousePointer2, Sparkles, Layout, Info, Plus, Trash2 } from 'lucide-react'
import { useClockAppearance } from '../../contexts/ClockAppearanceContext'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ClockStudioPanel({ isOpen, onClose }: Props) {
  const { settings, updateSettings, resetToDefault, registerAsset } = useClockAppearance()
  const [activeTab, setActiveTab] = React.useState('appearance')

  if (!isOpen) return null

  const handleChooseAsset = async (type: 'background' | 'cursor') => {
    try {
      // @ts-ignore
      const res = await window.api.clockAssets.choose(type)
      if (res.success && res.asset) {
        await registerAsset(res.asset)
        if (type === 'background') {
          updateSettings({
            background: {
              ...settings.background,
              globalAssetId: res.asset.id
            }
          })
        } else if (type === 'cursor') {
          updateSettings({
            cursor: {
              ...settings.cursor,
              type: 'image',
              assetId: res.asset.id
            }
          })
        }
      }
    } catch (e: any) {
      console.error(e)
    }
  }

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-background/80 backdrop-blur-2xl border-l border-border shadow-[0_0_40px_rgba(0,0,0,0.3)] flex flex-col z-50 animate-in slide-in-from-right-full duration-300">
      <div className="flex items-center justify-between p-5 border-b border-border/50 bg-card/30">
        <h2 className="font-bold text-lg bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
          <Palette size={18} className="text-primary" />
          Clock Studio
        </h2>
        <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"><X size={18} /></button>
      </div>

      <div className="flex border-b border-border/50 text-sm overflow-x-auto scrollbar-none bg-card/10">
        <Tab name="appearance" icon={Palette} active={activeTab} set={setActiveTab} />
        <Tab name="background" icon={ImageIcon} active={activeTab} set={setActiveTab} />
        <Tab name="cursor" icon={MousePointer2} active={activeTab} set={setActiveTab} />
        <Tab name="effects" icon={Sparkles} active={activeTab} set={setActiveTab} />
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-8 custom-scrollbar">
        {activeTab === 'appearance' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <ColorPicker label="Accent Color" value={settings.theme.accentColor} onChange={val => updateSettings({ theme: { ...settings.theme, accentColor: val }})} />
            <ColorPicker label="Text Color" value={settings.theme.textColor} onChange={val => updateSettings({ theme: { ...settings.theme, textColor: val }})} />
            <ColorPicker label="Timer Start Color" value={settings.theme.timerStartColor || '#F59E0B'} onChange={val => updateSettings({ theme: { ...settings.theme, timerStartColor: val }})} />
            <ColorPicker label="Stopwatch Start Color" value={settings.theme.stopwatchStartColor || '#3B82F6'} onChange={val => updateSettings({ theme: { ...settings.theme, stopwatchStartColor: val }})} />
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Card Base Color</label>
                <div className="group relative">
                  <Info size={14} className="text-muted-foreground cursor-help" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                    Use rgba(r,g,b,a) for transparency support.
                  </div>
                </div>
              </div>
              <input type="text" value={settings.theme.boxColor} onChange={e => updateSettings({ theme: { ...settings.theme, boxColor: e.target.value }})} className="w-full bg-accent/50 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm font-mono transition-all outline-none" />
            </div>
            
            <div className="pt-6 border-t border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold">Use Gradient</label>
                  <div className="group relative">
                    <Info size={14} className="text-muted-foreground cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                      Applies a smooth gradient to the primary backgrounds instead of a solid accent color.
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.gradient.enabled} onChange={e => updateSettings({ gradient: { ...settings.gradient, enabled: e.target.checked }})} className="sr-only peer" />
                  <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              
              {settings.gradient.enabled && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex bg-card/50 p-1 rounded-lg border border-border/50">
                    <button 
                      onClick={() => updateSettings({ gradient: { ...settings.gradient, type: 'basic' }})} 
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${settings.gradient.type !== 'premium' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                    >Basic</button>
                    <button 
                      onClick={() => updateSettings({ gradient: { ...settings.gradient, type: 'premium' }})} 
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${settings.gradient.type === 'premium' ? 'bg-gradient-to-r from-primary to-pink-500 text-white shadow-sm' : 'hover:bg-background/50'}`}
                    >Premium ✨</button>
                  </div>
                  
                  {settings.gradient.type !== 'premium' ? (
                    <>
                      <ColorPicker label="Gradient Color 1" value={settings.gradient.color1} onChange={val => updateSettings({ gradient: { ...settings.gradient, color1: val }})} />
                      <ColorPicker label="Gradient Color 2" value={settings.gradient.color2} onChange={val => updateSettings({ gradient: { ...settings.gradient, color2: val }})} />
                    </>
                  ) : (
                    <div className="space-y-3">
                      {(settings.gradient.premiumColors || []).map((color, idx) => (
                        <div key={idx} className="flex items-end gap-2">
                          <div className="flex-1">
                            <ColorPicker label={`Color ${idx + 1}`} value={color} onChange={val => {
                              const newColors = [...(settings.gradient.premiumColors || [])]
                              newColors[idx] = val
                              updateSettings({ gradient: { ...settings.gradient, premiumColors: newColors }})
                            }} />
                          </div>
                          {(settings.gradient.premiumColors?.length || 0) > 2 && (
                            <button
                              onClick={() => {
                                const newColors = (settings.gradient.premiumColors || []).filter((_, i) => i !== idx)
                                updateSettings({ gradient: { ...settings.gradient, premiumColors: newColors }})
                              }}
                              className="h-9 px-2.5 mb-0.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg flex items-center justify-center transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      {(settings.gradient.premiumColors?.length || 0) < 5 && (
                        <button
                          onClick={() => {
                            const newColors = [...(settings.gradient.premiumColors || [])]
                            newColors.push('#87CEEB')
                            updateSettings({ gradient: { ...settings.gradient, premiumColors: newColors }})
                          }}
                          className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors border border-primary/20"
                        >
                          <Plus size={14} /> Add Color
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-1.5 pt-3 mt-3 border-t border-border/50">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex justify-between">
                      <span>Gradient Opacity</span>
                      <span className="text-foreground">{Math.round((settings.gradient.opacity ?? 1) * 100)}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.05" 
                      value={settings.gradient.opacity ?? 1} 
                      onChange={e => updateSettings({ gradient: { ...settings.gradient, opacity: Number(e.target.value) }})} 
                      className="w-full accent-primary" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'background' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <button onClick={() => handleChooseAsset('background')} className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
              <ImageIcon size={18} />
              Choose Media (Image/Video)
            </button>
            {settings.background.globalAssetId && (
               <button onClick={() => updateSettings({ background: { ...settings.background, globalAssetId: undefined }})} className="w-full py-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 rounded-xl font-medium text-sm transition-colors">
                 Remove Background
               </button>
            )}
            
            <div className="space-y-5 pt-6 border-t border-border/50">
              <SliderControl 
                label="Opacity" 
                value={settings.background.globalOpacity} 
                min={0} max={1} step={0.05} 
                formatter={v => `${Math.round(v * 100)}%`}
                onChange={v => updateSettings({ background: { ...settings.background, globalOpacity: v }})} 
              />
              <SliderControl 
                label="Blur" 
                value={settings.background.globalBlur} 
                min={0} max={20} step={1} 
                formatter={v => `${v}px`}
                onChange={v => updateSettings({ background: { ...settings.background, globalBlur: v }})} 
              />
              <SliderControl 
                label="Dark Overlay" 
                value={settings.background.globalOverlayOpacity} 
                min={0} max={1} step={0.05} 
                formatter={v => `${Math.round(v * 100)}%`}
                onChange={v => updateSettings({ background: { ...settings.background, globalOverlayOpacity: v }})} 
                tooltip="Adds a dark layer over the background to improve text readability."
              />
            </div>
          </div>
        )}

        {activeTab === 'cursor' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex gap-2 p-1 bg-accent/50 rounded-lg">
              <button onClick={() => updateSettings({ cursor: { ...settings.cursor, type: 'default' }})} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${settings.cursor.type === 'default' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}>Default</button>
              <button onClick={() => updateSettings({ cursor: { ...settings.cursor, type: 'emoji' }})} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${settings.cursor.type === 'emoji' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}>Emoji</button>
              <button onClick={() => updateSettings({ cursor: { ...settings.cursor, type: 'image' }})} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${settings.cursor.type === 'image' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}>Image</button>
            </div>

            {settings.cursor.type === 'emoji' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Emoji Character</label>
                <input 
                  type="text" 
                  maxLength={2}
                  value={settings.cursor.emoji ?? ''} 
                  placeholder="(Win + .)"
                  onChange={e => updateSettings({ cursor: { ...settings.cursor, emoji: e.target.value }})} 
                  className="w-full bg-accent/50 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-3 text-2xl text-center transition-all outline-none placeholder:text-sm placeholder:text-muted-foreground/50" 
                />
              </div>
            )}

            {settings.cursor.type === 'image' && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                <button onClick={() => handleChooseAsset('cursor')} className="w-full py-4 bg-accent hover:bg-accent/80 border border-border/50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                  <MousePointer2 size={18} />
                  Choose Cursor Image
                </button>
                {settings.cursor.assetId && (
                  <p className="text-xs text-center text-muted-foreground">Custom cursor active.</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between bg-accent/30 border border-border/50 p-4 rounded-xl shadow-sm">
              <div className="flex flex-col">
                <label className="text-sm font-bold">Glassmorphism Mode</label>
                <span className="text-[10px] text-muted-foreground">Frosted glass effect for cards</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.effects.glass} onChange={e => updateSettings({ effects: { ...settings.effects, glass: e.target.checked }})} className="sr-only peer" />
                <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            {settings.effects.glass && (
              <div className="space-y-5 pt-2 animate-in slide-in-from-top-2 duration-200">
                <SliderControl 
                  label="Card Blur" 
                  value={settings.effects.blurIntensity} 
                  min={0} max={40} step={1} 
                  formatter={v => `${v}px`}
                  onChange={v => updateSettings({ effects: { ...settings.effects, blurIntensity: v }})} 
                />
                <SliderControl 
                  label="Card Opacity" 
                  value={settings.effects.glassTransparency} 
                  min={0} max={1} step={0.05} 
                  formatter={v => `${Math.round(v * 100)}%`}
                  onChange={v => updateSettings({ effects: { ...settings.effects, glassTransparency: v }})} 
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-5 border-t border-border/50 bg-card/30">
        <button onClick={resetToDefault} className="w-full py-2.5 bg-accent hover:bg-accent/80 border border-border/50 rounded-xl text-sm font-bold transition-colors">
          Restore Defaults
        </button>
      </div>
    </div>
  )
}

function Tab({ name, icon: Icon, active, set }: { name: string, icon: any, active: string, set: (s: string) => void }) {
  const isActive = active === name
  return (
    <button 
      onClick={() => set(name)}
      className={`flex-1 p-3 flex flex-col items-center gap-1.5 border-b-2 transition-all ${isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
    >
      <Icon size={18} className={isActive ? 'animate-pulse duration-1000' : ''} />
      <span className="text-[10px] uppercase font-bold tracking-wider">{name}</span>
    </button>
  )
}

function ColorPicker({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="flex gap-2">
        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border/50 shadow-sm flex-shrink-0">
          <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
        </div>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 bg-accent/50 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 text-sm font-mono transition-all outline-none" />
      </div>
    </div>
  )
}

function SliderControl({ label, value, min, max, step, onChange, formatter, tooltip }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
          {tooltip && (
            <div className="group relative">
              <Info size={14} className="text-muted-foreground cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <span className="text-xs font-mono bg-accent px-2 py-0.5 rounded text-foreground">{formatter(value)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={e => onChange(parseFloat(e.target.value))} 
        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" 
      />
    </div>
  )
}
