import React, { useState, useEffect } from 'react'
import { X, Lock, Key } from 'lucide-react'

export function PrivateAuthModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [hintText, setHintText] = useState('')

  useEffect(() => {
    if (isOpen) {
      setPassword('')
      setError('')
      setShowHint(false)
      // fetch hint text silently
      // @ts-ignore
      window.api.profile.getSettings().then((s: any) => setHintText(s.hint || 'No hint set.'))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // @ts-ignore
      const success = await window.api.profile.switch(password)
      if (success) {
        onSuccess() // this will trigger the profile-changed reload, but we call onSuccess anyway
      } else {
        setError('Incorrect password.')
      }
    } catch (err: any) {
      setError(err.message || 'Error verifying password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-border p-8 relative overflow-hidden animate-in zoom-in-95">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
            <Lock size={32} className="text-foreground" />
          </div>
          <h2 className="text-2xl font-black">Private Profile</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                autoFocus
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all text-center tracking-widest text-lg"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm font-bold text-center animate-in shake">{error}</div>}

          {showHint && (
            <div className="text-xs font-medium text-center text-muted-foreground bg-accent/50 py-2 rounded-lg">
              Hint: {hintText}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 mt-6 bg-foreground text-background font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex justify-center items-center"
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>

          {!showHint && hintText && hintText !== 'No hint set.' && (
            <button 
              type="button" 
              onClick={() => setShowHint(true)}
              className="w-full text-xs font-bold text-muted-foreground hover:text-foreground mt-4"
            >
              Forgot Password?
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
