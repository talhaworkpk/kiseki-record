import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { ClockAppearanceSettings, KISEKI_DEFAULT_APPEARANCE, ClockAsset } from '../lib/constants/clockAppearance'

interface ClockAppearanceContextType {
  settings: ClockAppearanceSettings
  updateSettings: (updates: Partial<ClockAppearanceSettings>) => void
  resetToDefault: () => void
  assets: Record<string, ClockAsset>
  loadAssetInfo: (assetId: string) => Promise<ClockAsset | null>
  registerAsset: (asset: ClockAsset) => Promise<void>
}

const ClockAppearanceContext = createContext<ClockAppearanceContextType | undefined>(undefined)

export function ClockAppearanceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ClockAppearanceSettings>(KISEKI_DEFAULT_APPEARANCE)
  const [assets, setAssets] = useState<Record<string, ClockAsset>>({})
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialized = useRef(false)

  // Load from DB on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // @ts-ignore
        const profile = await window.api.profile.getCurrent()
        // @ts-ignore
        const docs = await window.api.db.find('clockAppearance', { profile })
        if (docs && docs.length > 0) {
          setSettings({ ...KISEKI_DEFAULT_APPEARANCE, ...docs[0].settings })
        }
      } catch (err) {
        console.error("Failed to load clock appearance", err)
      } finally {
        isInitialized.current = true
      }
    }
    loadSettings()
  }, [])

  // Persist with debounce
  useEffect(() => {
    if (!isInitialized.current) return
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // @ts-ignore
        const profile = await window.api.profile.getCurrent()
        // @ts-ignore
        const docs = await window.api.db.find('clockAppearance', { profile })
        
        if (docs && docs.length > 0) {
          // @ts-ignore
          await window.api.db.update('clockAppearance', { _id: docs[0]._id }, { $set: { settings } }, {})
        } else {
          // @ts-ignore
          await window.api.db.insert('clockAppearance', { profile, settings })
        }
      } catch (err) {
        console.error("Failed to save clock appearance", err)
      }
    }, 500)
    
    // Inject CSS variables
    applyCSSVariables(settings)
    
  }, [settings])

  const updateSettings = (updates: Partial<ClockAppearanceSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  const resetToDefault = () => {
    setSettings(KISEKI_DEFAULT_APPEARANCE)
  }

  const loadAssetInfo = async (assetId: string): Promise<ClockAsset | null> => {
    if (assets[assetId]) return assets[assetId]
    
    try {
      // @ts-ignore
      const profile = await window.api.profile.getCurrent()
      // @ts-ignore
      const docs = await window.api.db.find('clockAssets', { id: assetId, profile })
      if (docs && docs.length > 0) {
        const asset = docs[0] as ClockAsset
        setAssets(prev => ({ ...prev, [assetId]: asset }))
        return asset
      }
    } catch (err) {
      console.error("Failed to load asset", err)
    }
    return null
  }
  
  const registerAsset = async (asset: ClockAsset) => {
    try {
      // @ts-ignore
      const profile = await window.api.profile.getCurrent()
      // @ts-ignore
      await window.api.db.insert('clockAssets', { ...asset, profile })
      setAssets(prev => ({ ...prev, [asset.id]: asset }))
    } catch (err) {
      console.error("Failed to register asset", err)
    }
  }

  return (
    <ClockAppearanceContext.Provider value={{ settings, updateSettings, resetToDefault, assets, loadAssetInfo, registerAsset }}>
      {children}
    </ClockAppearanceContext.Provider>
  )
}

const hexToRgba = (hex: string, alpha: number): string => {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
  if (c.length === 6) {
    const r = parseInt(c.slice(0, 2), 16)
    const g = parseInt(c.slice(2, 4), 16)
    const b = parseInt(c.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return hex
}

function applyCSSVariables(settings: ClockAppearanceSettings) {
  const root = document.documentElement
  
  root.style.setProperty('--clock-accent', settings.theme.accentColor)
  root.style.setProperty('--clock-text', settings.theme.textColor)
  root.style.setProperty('--clock-card', settings.theme.boxColor)
  root.style.setProperty('--clock-hover', settings.theme.hoverColor)
  root.style.setProperty('--clock-border', settings.theme.borderColor)
  root.style.setProperty('--clock-glow', settings.theme.glowColor)
  root.style.setProperty('--clock-timer-start', settings.theme.timerStartColor || '#F59E0B')
  root.style.setProperty('--clock-stopwatch-start', settings.theme.stopwatchStartColor || '#3B82F6')
  
  const op = settings.gradient.opacity ?? 1
  if (settings.gradient.enabled) {
    if (settings.gradient.type === 'premium' && settings.gradient.premiumColors) {
      const colors = settings.gradient.premiumColors.map(c => hexToRgba(c, op))
      root.style.setProperty('--clock-primary-bg', `linear-gradient(${settings.gradient.direction || '-45deg'}, ${colors.join(', ')})`)
    } else {
      root.style.setProperty('--clock-primary-bg', `linear-gradient(${settings.gradient.direction}, ${hexToRgba(settings.gradient.color1, op)}, ${hexToRgba(settings.gradient.color2, op)})`)
    }
  } else {
    root.style.setProperty('--clock-primary-bg', hexToRgba(settings.theme.accentColor, op))
  }
  
  if (settings.effects.glass) {
    root.style.setProperty('--clock-backdrop-blur', `${settings.effects.blurIntensity}px`)
    root.style.setProperty('--clock-card-bg', `rgba(255, 255, 255, ${settings.effects.glassTransparency})`)
  } else {
    root.style.setProperty('--clock-backdrop-blur', '0px')
    root.style.setProperty('--clock-card-bg', settings.theme.boxColor)
  }

  // Cursor handling
  if (settings.cursor.type === 'image' && settings.cursor.assetId) {
    // We can't synchronously load the asset path here easily because applyCSSVariables is synchronous.
    // Instead we will handle the actual cursor URL in the layout or by triggering a re-render.
    // Wait, let's just let ClockLayout handle the inline style for cursor since it has access to the context.
  }
}

export function useClockAppearance() {
  const ctx = useContext(ClockAppearanceContext)
  if (!ctx) throw new Error('useClockAppearance must be inside ClockAppearanceProvider')
  return ctx
}
