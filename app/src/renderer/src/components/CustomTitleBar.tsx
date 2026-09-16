import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Square, Copy, X } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip'
// @ts-ignore
import iconUrl from '../../../../icon.png'
// @ts-ignore
import logoVideoUrl1 from '../assets/logo_video.mp4'
// @ts-ignore
import logoVideoUrl2 from '../assets/logo_video_2.mp4'
// @ts-ignore
import logoVideoUrl3 from '../assets/logo_video_3.mp4'

const logoVideos = [logoVideoUrl1, logoVideoUrl2, logoVideoUrl3]

export function CustomTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isFocused, setIsFocused] = useState(true)
  const [showFullIcon, setShowFullIcon] = useState(false)
  const [currentVideo, setCurrentVideo] = useState(logoVideos[0])
  const navigate = useNavigate()

  useEffect(() => {
    // Check initial state
    window.api.window.isMaximized().then(setIsMaximized)

    // Listen for state changes
    window.api.window.onMaximizedChanged(setIsMaximized)

    const onFocus = () => setIsFocused(true)
    const onBlur = () => setIsFocused(false)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)

    return () => {
      window.api.window.offMaximizedChanged()
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const handleMinimize = () => window.api.window.minimize()
  const handleMaximize = () => window.api.window.maximize()
  const handleClose = () => window.api.window.close()

  const handleDoubleClick = () => {
    handleMaximize()
  }

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <div 
          className={`relative flex items-center justify-between w-full select-none transition-all duration-500 overflow-hidden ${isFocused ? 'opacity-100 bg-background/60' : 'opacity-80 bg-background/40'}`}
          style={{
            height: '44px',
            WebkitAppRegion: 'drag',
            color: 'hsl(var(--foreground))',
            flexShrink: 0
          } as React.CSSProperties}
          onDoubleClick={handleDoubleClick}
        >
          {/* Single Seamless Fluid Ink Background */}
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none opacity-80 dark:opacity-50" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <div className="absolute inset-0 bg-gradient-to-r from-sky-400 via-blue-500 to-sky-300 animate-gradient-fluid mix-blend-multiply dark:mix-blend-screen" />
          </div>
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xl pointer-events-none" />
          <div className="relative z-10 flex items-center pl-4 gap-3.5 h-full overflow-hidden">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 blur-md rounded-full group-hover:bg-primary/50 transition-colors duration-500 opacity-0 group-hover:opacity-100"></div>
              <img 
                src={iconUrl} 
                alt="Kiseki Record Logo" 
                onClick={() => {
                  const randomVideo = logoVideos[Math.floor(Math.random() * logoVideos.length)]
                  setCurrentVideo(randomVideo)
                  setShowFullIcon(true)
                }}
                className="relative z-10 w-[20px] h-[20px] object-contain drop-shadow-sm transition-all group-hover:scale-110 active:scale-95 duration-500 cursor-pointer" 
                style={{ WebkitAppRegion: 'no-drag' } as any}
              />
            </div>
            <span 
              onClick={() => navigate('/')}
              className="text-[12px] font-extrabold tracking-[0.2em] uppercase text-sky-900 dark:text-sky-50 hover:text-sky-700 dark:hover:text-sky-200 cursor-pointer transition-all duration-500 drop-shadow-[0_2px_6px_rgba(56,189,248,0.5)] dark:drop-shadow-[0_2px_6px_rgba(56,189,248,0.8)]"
              style={{ WebkitAppRegion: 'no-drag' } as any}
            >
              Kiseki Record
            </span>
          </div>

          <div className="relative z-10 flex h-full items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleMinimize}
                  className="flex h-full w-[46px] items-center justify-center text-sky-900/80 hover:text-sky-900 dark:text-sky-100/80 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20 transition-all duration-200 group drop-shadow-[0_1px_2px_rgba(56,189,248,0.3)] dark:drop-shadow-[0_1px_2px_rgba(56,189,248,0.5)]"
                  tabIndex={-1}
                >
                  <div className="group-active:scale-90 transition-transform duration-100">
                    <Minus size={15} strokeWidth={1.5} />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                Minimize
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleMaximize}
                  className="flex h-full w-[46px] items-center justify-center text-sky-900/80 hover:text-sky-900 dark:text-sky-100/80 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20 transition-all duration-200 group drop-shadow-[0_1px_2px_rgba(56,189,248,0.3)] dark:drop-shadow-[0_1px_2px_rgba(56,189,248,0.5)]"
                  tabIndex={-1}
                >
                  <div className="group-active:scale-90 transition-transform duration-100">
                    {isMaximized ? (
                      <Copy size={13} strokeWidth={1.5} className="rotate-180 -scale-x-100" />
                    ) : (
                      <Square size={14} strokeWidth={1.5} />
                    )}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                {isMaximized ? "Restore Down" : "Maximize"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleClose}
                  className="flex h-full w-[46px] items-center justify-center text-sky-900/80 dark:text-sky-100/80 hover:bg-[#e81123] hover:text-white active:bg-[#f1707a] transition-all duration-200 group drop-shadow-[0_1px_2px_rgba(56,189,248,0.3)] dark:drop-shadow-[0_1px_2px_rgba(56,189,248,0.5)]"
                  tabIndex={-1}
                >
                  <div className="group-active:scale-90 transition-transform duration-100">
                    <X size={17} strokeWidth={1.5} />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="text-xs text-red-500 font-medium">
                Close
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {showFullIcon && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowFullIcon(false)}
        >
          <video 
            key={currentVideo}
            src={currentVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] md:w-[600px] md:h-[600px] object-cover rounded-[3rem] animate-in zoom-in-90 duration-500 shadow-2xl shadow-primary/30 cursor-pointer ring-1 ring-white/10" 
          />
        </div>
      )}
    </>
  )
}


