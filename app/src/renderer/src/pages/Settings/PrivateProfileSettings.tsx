import React, { useState, useEffect } from 'react'
import { Lock, Download, Trash2, Key } from 'lucide-react'

export default function PrivateProfileSettings() {
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  
  const [hint, setHint] = useState('')
  const [autoLockTimeout, setAutoLockTimeout] = useState(15)
  const [settingsMsg, setSettingsMsg] = useState('')

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteMsg, setDeleteMsg] = useState('')
  
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // @ts-ignore
      const s = await window.api.profile.getSettings()
      setSettings(s)
      setHint(s.hint || '')
      setAutoLockTimeout(s.autoLockTimeout || 15)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg('')
    if (newPassword.length < 4) {
      setPasswordMsg('New password too short.')
      return
    }
    try {
      // @ts-ignore
      const success = await window.api.profile.updatePassword(oldPassword, newPassword)
      if (success) {
        setPasswordMsg('Password updated successfully.')
        setOldPassword('')
        setNewPassword('')
      } else {
        setPasswordMsg('Incorrect old password.')
      }
    } catch (err: any) {
      setPasswordMsg('Error updating password.')
    }
  }

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsMsg('')
    try {
      // @ts-ignore
      await window.api.profile.updateSettings({ hint, autoLockTimeout })
      setSettingsMsg('Settings updated.')
    } catch (err) {
      setSettingsMsg('Error updating settings.')
    }
  }

  const handleDeleteProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteMsg('')
    if (!confirm('WARNING: This will permanently delete your Private Profile access and reset the configuration. The underlying data will NOT be deleted from the database files automatically, but you will lose access to it. Proceed?')) {
      return
    }
    try {
      // @ts-ignore
      const success = await window.api.profile.delete(deletePassword)
      if (success) {
        // App will auto switch to public
      } else {
        setDeleteMsg('Incorrect password.')
      }
    } catch (err) {
      setDeleteMsg('Error deleting profile.')
    }
  }

  const handleLockNow = async () => {
    // @ts-ignore
    await window.api.profile.switch(null)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-8 animate-in fade-in">
      <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2"><Lock size={20}/> Security Settings</h2>
            <p className="text-muted-foreground text-sm">Manage your private profile security and access.</p>
          </div>
          <button onClick={handleLockNow} className="px-4 py-2 bg-destructive/10 text-destructive font-bold rounded-lg hover:bg-destructive hover:text-white transition-colors">
            Lock Now
          </button>
        </div>

        <form onSubmit={handleUpdateSettings} className="space-y-4 max-w-md border-b border-border pb-6 mb-6">
          <h3 className="font-bold text-sm">General Options</h3>
          <div>
            <label className="text-xs font-bold text-muted-foreground">Auto-Lock Timeout (Minutes)</label>
            <input 
              type="number" min="0" 
              value={autoLockTimeout} 
              onChange={e => setAutoLockTimeout(Number(e.target.value))}
              className="w-full mt-1 p-2 bg-background border border-border rounded-lg outline-none"
            />
            <p className="text-xs text-muted-foreground mt-1">Set to 0 to disable auto-lock (not recommended).</p>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">Password Hint</label>
            <input 
              type="text" 
              value={hint} 
              onChange={e => setHint(e.target.value)}
              className="w-full mt-1 p-2 bg-background border border-border rounded-lg outline-none"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90">Save Settings</button>
          {settingsMsg && <span className="ml-3 text-sm font-medium text-green-500">{settingsMsg}</span>}
        </form>

        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md pb-6 border-b border-border mb-6">
          <h3 className="font-bold text-sm">Change Password</h3>
          <div>
            <input 
              type="password" placeholder="Current Password" required
              value={oldPassword} onChange={e => setOldPassword(e.target.value)}
              className="w-full p-2 bg-background border border-border rounded-lg outline-none"
            />
          </div>
          <div>
            <input 
              type="password" placeholder="New Password" required
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full p-2 bg-background border border-border rounded-lg outline-none"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-accent text-accent-foreground font-bold rounded-lg hover:opacity-90">Update Password</button>
          {passwordMsg && <span className="ml-3 text-sm font-medium text-primary">{passwordMsg}</span>}
        </form>

        <form onSubmit={handleDeleteProfile} className="space-y-4 max-w-md">
          <h3 className="font-bold text-sm text-destructive">Danger Zone</h3>
          <p className="text-xs text-muted-foreground">Resetting the private profile will revoke access to all private data permanently.</p>
          <div className="flex gap-2">
            <input 
              type="password" placeholder="Confirm Password to Delete" required
              value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
              className="flex-1 p-2 bg-background border border-destructive/50 rounded-lg outline-none focus:border-destructive"
            />
            <button type="submit" className="px-4 py-2 bg-destructive text-destructive-foreground font-bold rounded-lg hover:opacity-90 flex items-center gap-2">
              <Trash2 size={16}/> Delete Profile
            </button>
          </div>
          {deleteMsg && <span className="text-sm font-medium text-destructive block mt-2">{deleteMsg}</span>}
        </form>

      </section>
    </div>
  )
}
