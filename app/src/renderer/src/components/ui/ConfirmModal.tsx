import React, { useEffect } from 'react'
import { AlertTriangle, X, Info } from 'lucide-react'

interface ConfirmModalProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = true
}: ConfirmModalProps) {
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onConfirm, onCancel])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 perspective-1000" data-stop-overscroll="true">
      {/* Animated Backdrop */}
      <div 
        className="absolute inset-0 bg-background/40 backdrop-blur-xl transition-opacity animate-in fade-in duration-500" 
        onClick={onCancel}
      />
      
      {/* Premium Glassmorphism Modal */}
      <div className={`relative w-full max-w-md bg-card/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-[0.98] duration-300 ease-out shadow-2xl ${
        destructive ? 'shadow-red-500/10' : 'shadow-primary/10'
      }`}>
        
        {/* Ambient Glow behind modal content */}
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none ${
          destructive ? 'bg-red-500' : 'bg-primary'
        }`} />
        
        <div className="relative p-8 pb-10">
          <div className="flex flex-col items-center text-center">
            {/* Highly Stylized Icon */}
            <div className="relative mb-6">
              <div className={`absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse ${
                destructive ? 'bg-red-500' : 'bg-primary'
              }`} />
              <div className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-inner ${
                destructive 
                  ? 'bg-gradient-to-br from-red-500/20 to-rose-600/10 border border-red-500/20 text-red-500' 
                  : 'bg-gradient-to-br from-primary/20 to-blue-600/10 border border-primary/20 text-primary'
              }`}>
                <div className="absolute inset-1 rounded-full border border-white/10" />
                {destructive ? <AlertTriangle size={28} strokeWidth={1.5} /> : <Info size={28} strokeWidth={1.5} />}
              </div>
            </div>

            {/* Typography */}
            <h3 className="text-2xl font-black text-foreground tracking-tight mb-3">
              {title}
            </h3>
            <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed px-4 max-w-[90%]">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="flex items-center gap-3 p-4 bg-accent/20 border-t border-white/5 backdrop-blur-md">
          <button
            onClick={onCancel}
            className="flex-1 px-5 py-3.5 rounded-2xl text-sm font-bold text-muted-foreground bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 hover:text-foreground transition-all duration-200 active:scale-[0.98]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-5 py-3.5 rounded-2xl text-sm font-black text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 ${
              destructive 
                ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/25 border-t border-white/20' 
                : 'bg-gradient-to-r from-primary to-blue-600 shadow-primary/25 border-t border-white/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
