import { useState, useEffect } from 'react'

type Phase = 'idle' | 'environment' | 'energy' | 'reveal' | 'impact' | 'text' | 'exit'

// Rarity Color Configuration
const RarityColors: Record<string, { frame: string, glow: string, text: string }> = {
  Beginner: { frame: 'from-slate-400 via-slate-200 to-slate-500', glow: 'rgba(148,163,184,0.3)', text: 'text-slate-300' },
  Bronze: { frame: 'from-orange-700 via-amber-500 to-orange-800', glow: 'rgba(217,119,6,0.4)', text: 'text-amber-500' },
  Silver: { frame: 'from-zinc-300 via-white to-zinc-400', glow: 'rgba(228,228,231,0.5)', text: 'text-zinc-200' },
  Gold: { frame: 'from-yellow-500 via-yellow-200 to-yellow-600', glow: 'rgba(234,179,8,0.6)', text: 'text-yellow-400' },
  Platinum: { frame: 'from-cyan-400 via-white to-blue-400', glow: 'rgba(56,189,248,0.6)', text: 'text-cyan-300' },
  Master: { frame: 'from-emerald-500 via-teal-200 to-emerald-600', glow: 'rgba(16,185,129,0.7)', text: 'text-emerald-400' },
  Legendary: { frame: 'from-purple-600 via-fuchsia-300 to-pink-600', glow: 'rgba(192,38,211,0.8)', text: 'text-fuchsia-400' },
  Kiseki: { frame: 'from-yellow-300 via-white to-amber-500', glow: 'rgba(253,224,71,0.9)', text: 'text-yellow-300' },
  Default: { frame: 'from-primary via-blue-300 to-primary/80', glow: 'rgba(59,130,246,0.5)', text: 'text-primary' }
}

// Category Shape Configuration (clip-path)
const CategoryShapes: Record<string, string> = {
  Streak: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', // Hexagon
  Consistency: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)', // Shield
  Growth: 'polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)', // Arrow/Pentagon
  Resilience: 'polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)', // Heptagon
  Builder: 'polygon(10% 0, 90% 0, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0 90%, 0 10%)', // Beveled Square
  Mastery: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', // Star
  Default: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
}

export function GlobalAchievementCelebration() {
  const [queue, setQueue] = useState<any[]>([])
  const [activeAchievement, setActiveAchievement] = useState<any | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    const handleUnlock = (e: any) => {
      const detail = e.detail
      if (!detail) return
      setQueue(prev => [...prev, detail])
    }
    window.addEventListener('achievement-unlocked', handleUnlock)
    return () => window.removeEventListener('achievement-unlocked', handleUnlock)
  }, [])

  // Queue Manager
  useEffect(() => {
    if (phase === 'idle' && queue.length > 0) {
      setActiveAchievement(queue[0])
      setQueue(prev => prev.slice(1))
      setPhase('environment')
    }
  }, [queue, phase])

  // Phase Orchestrator
  useEffect(() => {
    if (phase === 'idle') return

    const timings: Record<Phase, number> = {
      idle: 0,
      environment: 300,
      energy: 400,
      reveal: 400,
      impact: 200,
      text: 2500, // hold time
      exit: 600
    }

    // Extend hold time for rare achievements
    if (phase === 'text' && activeAchievement?.isKiseki) timings.text = 3500

    const nextPhaseMap: Record<Phase, Phase> = {
      idle: 'idle',
      environment: 'energy',
      energy: 'reveal',
      reveal: 'impact',
      impact: 'text',
      text: 'exit',
      exit: 'idle'
    }

    const timer = setTimeout(() => {
      const next = nextPhaseMap[phase]
      setPhase(next)
      if (next === 'idle') setActiveAchievement(null)
    }, timings[phase])

    return () => clearTimeout(timer)
  }, [phase, activeAchievement])

  if (phase === 'idle' || !activeAchievement) return null

  // Fallback property mapping
  const title = activeAchievement.achievementTitle || activeAchievement.title || 'Achievement Unlocked'
  const stage = activeAchievement.stageTitle || activeAchievement.stage || activeAchievement.rarity || 'Milestone'
  const description = activeAchievement.description || ''
  const rarityKey = activeAchievement.isKiseki ? 'Kiseki' : (activeAchievement.rarity || 'Default')
  const colors = RarityColors[rarityKey] || RarityColors.Default
  const categoryKey = activeAchievement.category || 'Default'
  const shape = CategoryShapes[categoryKey] || CategoryShapes.Default
  const isRare = ['Gold', 'Platinum', 'Master', 'Legendary', 'Kiseki'].includes(rarityKey)

  // Determine which visual elements are mounted/visible based on phase
  const showEnvironment = phase !== 'exit'
  const showEnergy = ['energy', 'reveal'].includes(phase)
  const showBadge = ['reveal', 'impact', 'text'].includes(phase)
  const showImpact = phase === 'impact' || phase === 'text'
  const showText = phase === 'text'

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none perspective-[2000px] select-none"
      onClick={() => setPhase('exit')}
    >
      <style>{`
        .achiev-env { transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
        .achiev-env-enter { opacity: 1; backdrop-filter: blur(8px); }
        .achiev-env-exit { opacity: 0; backdrop-filter: blur(0px); }
        
        .energy-particle {
          position: absolute;
          border-radius: 50%;
          animation: energy-gather 0.4s cubic-bezier(0.2, 0, 1, 1) forwards;
        }
        @keyframes energy-gather {
          0% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
          50% { opacity: 1; scale: 1; }
          100% { transform: translate(0, 0) scale(0); opacity: 0; }
        }

        .badge-container {
          transform-style: preserve-3d;
          animation: badge-reveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes badge-reveal {
          0% { transform: translateZ(-500px) rotateX(-30deg) rotateY(20deg) scale(0.5); opacity: 0; }
          100% { transform: translateZ(50px) rotateX(10deg) rotateY(-5deg) scale(1); opacity: 1; }
        }
        .badge-float {
          animation: badge-float 4s ease-in-out infinite alternate;
        }
        @keyframes badge-float {
          0% { transform: translateY(0) rotateX(10deg) rotateY(-5deg); }
          100% { transform: translateY(-15px) rotateX(15deg) rotateY(5deg); }
        }

        .badge-impact {
          animation: badge-impact 0.6s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
        }
        @keyframes badge-impact {
          0% { transform: scale(1); filter: brightness(1); }
          20% { transform: scale(1.15); filter: brightness(1.5); }
          100% { transform: scale(1); filter: brightness(1); }
        }

        .light-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.8) 50%, transparent 80%);
          background-size: 200% 100%;
          mix-blend-mode: overlay;
          animation: sweep-anim 2s ease-in-out forwards;
        }
        @keyframes sweep-anim {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .text-reveal {
          opacity: 0;
          transform: translateY(20px);
          animation: text-reveal-anim 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes text-reveal-anim {
          to { opacity: 1; transform: translateY(0); }
        }
        
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.3s; }
        .stagger-3 { animation-delay: 0.5s; }
        .stagger-4 { animation-delay: 0.7s; }

        .metallic-text {
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          background-size: 200% auto;
          animation: text-shine 3s linear infinite;
        }
        @keyframes text-shine {
          to { background-position: 200% center; }
        }
      `}</style>

      {/* PHASE 1: Environment - Cinematic Darkening & Spotlight */}
      <div 
        className={`absolute inset-0 transition-colors duration-1000 ${rarityKey === 'Kiseki' ? 'bg-black/95' : 'bg-black/80'} achiev-env ${showEnvironment ? 'achiev-env-enter' : 'achiev-env-exit'} pointer-events-auto`}
        style={{ background: rarityKey === 'Kiseki' ? 'radial-gradient(circle at center, rgba(20,20,20,0.9) 10%, rgba(0,0,0,1) 70%)' : 'radial-gradient(circle at center, rgba(40,40,40,0.8) 10%, rgba(0,0,0,0.95) 70%)' }}
      ></div>

      {/* PHASE 2: Energy Gathering */}
      {showEnergy && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(20)].map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const dist = 150 + Math.random() * 150;
            return (
              <div 
                key={`energy-${i}`}
                className="energy-particle w-2 h-2"
                style={{
                  backgroundColor: colors.glow.replace(/[\d.]+\)$/g, '1)'),
                  boxShadow: `0 0 10px ${colors.glow}`,
                  '--tx': `${Math.cos(angle) * dist}px`,
                  '--ty': `${Math.sin(angle) * dist}px`,
                  animationDelay: `${Math.random() * 0.2}s`
                } as any}
              ></div>
            )
          })}
        </div>
      )}

      {/* Main Container - Positions badge and text */}
      <div className={`relative flex flex-col items-center justify-center gap-12 w-full max-w-3xl achiev-env ${showEnvironment ? 'opacity-100' : 'opacity-0 scale-95'}`}>
        
        {/* PHASE 3 & 4: Badge Hero */}
        {showBadge && (
          <div className={`relative z-20 badge-container ${showText ? 'badge-float' : ''}`}>
            {/* Impact Glow Aura */}
            {showImpact && (
              <div 
                className="absolute inset-0 rounded-full blur-[100px] -z-10 animate-in fade-in zoom-in duration-1000"
                style={{ backgroundColor: colors.glow.replace(/[\d.]+\)$/g, '0.5)') }}
              ></div>
            )}

            {/* The Emblem */}
            <div 
              className={`relative flex items-center justify-center w-48 h-48 md:w-56 md:h-56 ${showImpact && phase === 'impact' ? 'badge-impact' : ''}`}
            >
              {/* Outer Frame (Metallic) */}
              <div 
                className={`absolute inset-[-4px] bg-gradient-to-br ${colors.frame} drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]`}
                style={{ clipPath: shape }}
              ></div>
              
              {/* Inner Core (Dark inset) */}
              <div 
                className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950 flex items-center justify-center"
                style={{ clipPath: shape, boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.8)' }}
              >
                {/* Subtle Inner Pattern */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                
                {/* Icon */}
                <div 
                  className="text-7xl md:text-8xl filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.9)] relative z-10"
                  style={{ transform: 'translateZ(30px)' }}
                >
                  {activeAchievement.icon || '🏆'}
                </div>
              </div>

              {/* Light Sweep Effect */}
              {showImpact && (
                <div 
                  className="light-sweep z-20"
                  style={{ clipPath: shape }}
                ></div>
              )}
            </div>
            
            {/* Impact Particles Burst */}
            {phase === 'impact' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                {[...Array(isRare ? 16 : 8)].map((_, i) => {
                  const angle = (i * (360 / (isRare ? 16 : 8)) * Math.PI) / 180;
                  const dist = 120 + Math.random() * 80;
                  return (
                    <div 
                      key={`impact-${i}`}
                      className="absolute w-1 h-1 rounded-full animate-out fade-out duration-1000"
                      style={{
                        backgroundColor: '#fff',
                        boxShadow: `0 0 10px 2px ${colors.glow}`,
                        transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`,
                        transition: 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
                      }}
                      ref={el => { if (el) setTimeout(() => { el.style.transform = `translate(${Math.cos(angle) * dist * 1.5}px, ${Math.sin(angle) * dist * 1.5}px) scale(1)` }, 10) }}
                    ></div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* PHASE 5: Text Reveal */}
        {showText && (
          <div className="text-center space-y-5 relative z-10 w-full" style={{ transform: 'translateZ(40px)' }}>
            
            <div className={`text-reveal stagger-1 text-sm md:text-base font-black uppercase tracking-[0.4em] drop-shadow-[0_2px_4px_rgba(0,0,0,1)] ${isRare ? `metallic-text bg-gradient-to-r ${colors.frame}` : 'text-zinc-200'}`}>
              ✦ {isRare ? 'Rare Achievement' : 'Achievement'} Unlocked ✦
            </div>

            <h2 className="text-reveal stagger-2 font-black text-5xl md:text-6xl text-white tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,1)]">
              {title}
            </h2>

            <div className="text-reveal stagger-3">
              <span className={`inline-block text-lg md:text-xl font-bold uppercase tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,1)] ${colors.text}`}>
                {stage}
              </span>
            </div>

            {description && (
              <p className="text-reveal stagger-4 text-base md:text-lg text-white font-medium max-w-lg mx-auto leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                {description}
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
