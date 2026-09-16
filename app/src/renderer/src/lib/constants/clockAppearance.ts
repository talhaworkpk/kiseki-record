export interface ClockAsset {
  id: string
  type: 'image' | 'video' | 'cursor'
  originalName: string
  storedName: string
  relativePath: string
  mimeType: string
  size: number
  createdAt: number
}

export type ThemeDensity = 'compact' | 'comfortable' | 'spacious'

export interface ClockAppearanceSettings {
  theme: {
    accentColor: string
    textColor: string
    boxColor: string
    hoverColor: string
    borderColor: string
    glowColor: string
    timerStartColor: string
    stopwatchStartColor: string
  }
  gradient: {
    enabled: boolean
    type: 'basic' | 'premium'
    color1: string
    color2: string
    premiumColors: string[]
    direction: string
    intensity: number
    opacity?: number
  }
  background: {
    mode: 'global' | 'per-section'
    globalAssetId?: string
    globalOpacity: number
    globalBlur: number
    globalOverlayOpacity: number
    sections: {
      overview?: string
      alarm?: string
      timer?: string
      stopwatch?: string
      timeline?: string
      aiSight?: string
    }
  }
  cursor: {
    type: 'default' | 'emoji' | 'image'
    emoji?: string
    assetId?: string
    size: number
    trail: boolean
    clickEffect: 'none' | 'ripple' | 'glow' | 'particle'
  }
  effects: {
    glass: boolean
    glassTransparency: number
    blurIntensity: number
    glowEnabled: boolean
    animationsEnabled: boolean
    hoverEffectsEnabled: boolean
  }
  layout: {
    density: ThemeDensity
    cornerRadius: number
    cardTransparency: number
    navigationStyle: 'solid' | 'glass' | 'minimal'
  }
}

export const KISEKI_DEFAULT_APPEARANCE: ClockAppearanceSettings = {
  theme: {
    accentColor: '#8B5CF6',
    textColor: '#FFFFFF',
    boxColor: 'rgba(255,255,255,0.05)',
    hoverColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.1)',
    glowColor: '#8B5CF6',
    timerStartColor: '#F59E0B',
    stopwatchStartColor: '#3B82F6'
  },
  gradient: {
    enabled: false,
    type: 'basic',
    color1: '#8B5CF6',
    color2: '#EC4899',
    premiumColors: ['#87CEEB', '#4F46E5', '#DAA520', '#87CEEB'],
    direction: 'to right',
    intensity: 0.5,
    opacity: 1
  },
  background: {
    mode: 'global',
    globalOpacity: 1,
    globalBlur: 0,
    globalOverlayOpacity: 0,
    sections: {}
  },
  cursor: {
    type: 'default',
    size: 24,
    trail: false,
    clickEffect: 'none'
  },
  effects: {
    glass: false,
    glassTransparency: 0.5,
    blurIntensity: 10,
    glowEnabled: false,
    animationsEnabled: true,
    hoverEffectsEnabled: true
  },
  layout: {
    density: 'comfortable',
    cornerRadius: 16,
    cardTransparency: 1,
    navigationStyle: 'solid'
  }
}
