/**
 * Kiseki Record — Global Welcome Page
 *
 * Full-screen, premium welcome shown only on first-ever application launch.
 * More elaborate than section introductions — strong Kiseki branding,
 * feature overview grid, and elegant animations.
 */

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { GLOBAL_WELCOME_FEATURES } from '../../lib/onboardingConfig'

interface GlobalWelcomeProps {
  onComplete: () => void
}

export function GlobalWelcome({ onComplete }: GlobalWelcomeProps) {
  const [phase, setPhase] = useState(0) // 0=mounting, 1=visible, 2=exiting
  
  useEffect(() => {
    const timer = setTimeout(() => setPhase(1), 60)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setPhase(2)
    setTimeout(() => onComplete(), 500)
  }

  const isVisible = phase === 1
  const isExiting = phase === 2

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Full-screen layered background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Ambient gradient orbs */}
      <div
        className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] transition-all duration-[2000ms] ${
          isVisible && !isExiting
            ? 'opacity-30 scale-100'
            : 'opacity-0 scale-75'
        } bg-gradient-to-br from-sky-400 to-blue-600`}
      />
      <div
        className={`absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] transition-all duration-[2500ms] delay-200 ${
          isVisible && !isExiting
            ? 'opacity-25 scale-100'
            : 'opacity-0 scale-75'
        } bg-gradient-to-tl from-indigo-500 to-violet-400`}
      />
      <div
        className={`absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full blur-[80px] transition-all duration-[2000ms] delay-500 ${
          isVisible && !isExiting
            ? 'opacity-20 scale-100'
            : 'opacity-0 scale-75'
        } bg-gradient-to-r from-amber-400 to-orange-300`}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-6 sm:px-8 flex flex-col items-center text-center">
        {/* Kiseki branding badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/15 text-primary mb-8 transition-all duration-700 ${
            isVisible && !isExiting
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-6 opacity-0 scale-90'
          }`}
        >
          <Sparkles size={16} strokeWidth={2.5} />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Kiseki Record</span>
        </div>

        {/* Hero title */}
        <h1
          className={`text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 transition-all duration-700 delay-100 leading-tight ${
            isVisible && !isExiting
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
          }`}
        >
          Welcome to{' '}
          <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
            Kiseki
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className={`text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed mb-12 transition-all duration-700 delay-200 ${
            isVisible && !isExiting
              ? 'translate-y-0 opacity-100'
              : 'translate-y-6 opacity-0'
          }`}
        >
          Your life, goals, memories, relationships and journey — organized in one place.
        </p>

        {/* Feature grid */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-12 w-full max-w-2xl transition-all duration-700 delay-300 ${
            isVisible && !isExiting
              ? 'translate-y-0 opacity-100'
              : 'translate-y-6 opacity-0'
          }`}
        >
          {GLOBAL_WELCOME_FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={i}
                className="group flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-2xl bg-card/50 dark:bg-card/30 backdrop-blur-sm border border-border/30 hover:border-border/60 hover:bg-card/80 dark:hover:bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  transitionDelay: isVisible && !isExiting ? `${350 + i * 50}ms` : '0ms',
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-foreground/90 leading-tight block">
                    {feature.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 leading-snug hidden sm:block mt-0.5">
                    {feature.description}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center gap-3 transition-all duration-700 delay-[600ms] ${
            isVisible && !isExiting
              ? 'translate-y-0 opacity-100'
              : 'translate-y-6 opacity-0'
          }`}
        >
          <button
            onClick={handleDismiss}
            className="group relative px-10 py-3.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 text-white rounded-2xl text-sm font-bold shadow-[0_8px_30px_-6px_rgba(59,130,246,0.5)] hover:shadow-[0_12px_40px_-6px_rgba(59,130,246,0.6)] hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-300 overflow-hidden"
          >
            <span className="relative z-10">Get Started</span>
            <div className="absolute inset-0 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
          <button
            onClick={handleDismiss}
            className="px-8 py-3.5 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card/60 active:scale-[0.97] transition-all duration-300"
          >
            Skip
          </button>
        </div>

        {/* Bottom tagline */}
        <p
          className={`mt-10 text-[11px] text-muted-foreground/40 tracking-wider uppercase font-medium transition-all duration-700 delay-[800ms] ${
            isVisible && !isExiting
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          Private · Local-first · Your data stays yours
        </p>
      </div>
    </div>
  )
}
