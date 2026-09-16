/**
 * Kiseki Record — SectionWelcome Component
 *
 * Reusable overlay that introduces a section on first visit.
 * Compact, focused, and non-blocking. Quickly explains what the
 * section does, then lets the user continue.
 */

import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { SectionWelcomeConfig } from '../../lib/onboardingConfig'

interface SectionWelcomeProps {
  config: SectionWelcomeConfig
  onComplete: () => void
}

// Accent color map for dynamic styling
const ACCENT_STYLES: Record<string, { gradient: string; iconBg: string; btnBg: string; ring: string; featureIcon: string }> = {
  amber:   { gradient: 'from-amber-500/15 via-orange-400/8 to-transparent', iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', btnBg: 'bg-amber-600 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400', ring: 'ring-amber-500/20', featureIcon: 'text-amber-500' },
  violet:  { gradient: 'from-violet-500/15 via-purple-400/8 to-transparent', iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400', btnBg: 'bg-violet-600 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400', ring: 'ring-violet-500/20', featureIcon: 'text-violet-500' },
  emerald: { gradient: 'from-emerald-500/15 via-green-400/8 to-transparent', iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', btnBg: 'bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400', ring: 'ring-emerald-500/20', featureIcon: 'text-emerald-500' },
  cyan:    { gradient: 'from-cyan-500/15 via-sky-400/8 to-transparent', iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400', btnBg: 'bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400', ring: 'ring-cyan-500/20', featureIcon: 'text-cyan-500' },
  blue:    { gradient: 'from-blue-500/15 via-sky-400/8 to-transparent', iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', btnBg: 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400', ring: 'ring-blue-500/20', featureIcon: 'text-blue-500' },
  rose:    { gradient: 'from-rose-500/15 via-pink-400/8 to-transparent', iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400', btnBg: 'bg-rose-600 hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400', ring: 'ring-rose-500/20', featureIcon: 'text-rose-500' },
  indigo:  { gradient: 'from-indigo-500/15 via-blue-400/8 to-transparent', iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400', btnBg: 'bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400', ring: 'ring-indigo-500/20', featureIcon: 'text-indigo-500' },
  pink:    { gradient: 'from-pink-500/15 via-rose-400/8 to-transparent', iconBg: 'bg-pink-500/15 text-pink-600 dark:text-pink-400', btnBg: 'bg-pink-600 hover:bg-pink-500 dark:bg-pink-500 dark:hover:bg-pink-400', ring: 'ring-pink-500/20', featureIcon: 'text-pink-500' },
  teal:    { gradient: 'from-teal-500/15 via-emerald-400/8 to-transparent', iconBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400', btnBg: 'bg-teal-600 hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400', ring: 'ring-teal-500/20', featureIcon: 'text-teal-500' },
  purple:  { gradient: 'from-purple-500/15 via-indigo-400/8 to-transparent', iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400', btnBg: 'bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400', ring: 'ring-purple-500/20', featureIcon: 'text-purple-500' },
}

export function SectionWelcome({ config, onComplete }: SectionWelcomeProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const accent = ACCENT_STYLES[config.accentColor] || ACCENT_STYLES.blue
  const Icon = config.icon

  useEffect(() => {
    // Trigger entrance animation after mount
    const timer = setTimeout(() => setIsVisible(true), 30)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onComplete()
    }, 350)
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-400 ${
        isExiting
          ? 'opacity-0 scale-105'
          : isVisible
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95'
      }`}
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/70 dark:bg-background/80"
        onClick={handleDismiss}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-lg mx-4 bg-card/95 dark:bg-card/90 backdrop-blur-2xl border border-border/40 rounded-3xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 ${
          isExiting
            ? 'translate-y-4 opacity-0'
            : isVisible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Top accent gradient */}
        <div className={`absolute inset-0 bg-gradient-to-b ${accent.gradient} pointer-events-none`} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative p-8 sm:p-10">
          {/* Icon */}
          <div
            className={`w-16 h-16 rounded-2xl ${accent.iconBg} flex items-center justify-center mb-6 ring-1 ${accent.ring} shadow-sm transition-all duration-700 ${
              isVisible && !isExiting ? 'scale-100 rotate-0' : 'scale-75 -rotate-12'
            }`}
          >
            <Icon size={28} strokeWidth={1.75} />
          </div>

          {/* Title */}
          <h2
            className={`text-2xl font-bold tracking-tight text-foreground mb-1.5 transition-all duration-500 delay-75 ${
              isVisible && !isExiting ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            {config.title}
          </h2>

          {/* Subtitle */}
          <p
            className={`text-sm font-medium text-muted-foreground mb-5 transition-all duration-500 delay-100 ${
              isVisible && !isExiting ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            {config.subtitle}
          </p>

          {/* Description */}
          <p
            className={`text-sm leading-relaxed text-foreground/80 dark:text-foreground/70 mb-6 transition-all duration-500 delay-150 ${
              isVisible && !isExiting ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            {config.description}
          </p>

          {/* Features */}
          <div
            className={`space-y-2.5 mb-8 transition-all duration-500 delay-200 ${
              isVisible && !isExiting ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            {config.features.map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-3"
              >
                <CheckCircle2
                  size={16}
                  className={`${accent.featureIcon} shrink-0 mt-0.5`}
                  strokeWidth={2.5}
                />
                <span className="text-sm text-foreground/75 dark:text-foreground/65 leading-snug">{feature}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div
            className={`flex items-center gap-3 transition-all duration-500 delay-300 ${
              isVisible && !isExiting ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            <button
              onClick={handleDismiss}
              className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold text-white ${accent.btnBg} shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-300`}
            >
              {config.primaryButtonText}
            </button>
            <button
              onClick={handleDismiss}
              className="px-5 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 active:scale-[0.97] transition-all duration-300"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
