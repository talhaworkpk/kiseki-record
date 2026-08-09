import React, { useState } from 'react'
import { X, Lock, CheckCircle, Shield } from 'lucide-react'

export function PrivateSetupModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [hint, setHint] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      // @ts-ignore
      const success = await window.api.profile.setupPrivate(password, hint, 'Private User')
      if (success) {
        onSuccess()
      } else {
        setError('Failed to setup private profile. Try again.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border p-8 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 shadow-sm border border-primary/20">
            <Shield size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-black">Create Private Profile</h2>
          <p className="text-sm text-muted-foreground mt-2">
            A secure, hidden space for your private records. Data in this profile will never appear in your public dashboard.
          </p>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Secret Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Enter password..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Confirm Password</label>
            <div className="relative">
              <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Confirm password..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Password Hint (Optional)</label>
            <input 
              type="text" 
              value={hint}
              onChange={e => setHint(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="E.g., My first pet's name"
            />
          </div>

          {error && <div className="text-red-500 text-sm font-bold text-center bg-red-500/10 py-2 rounded-lg">{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 mt-6 bg-primary text-primary-foreground font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 flex justify-center items-center gap-2"
          >
            {loading ? 'Creating...' : 'Create Secure Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
