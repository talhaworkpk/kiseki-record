import Store from 'electron-store'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { BrowserWindow } from 'electron'

interface PrivateProfileSettings {
  passwordHash?: string
  hint?: string
  autoLockTimeout: number // in minutes
  name: string
  photoPath?: string
}

export class ProfileManager {
  private store: Store
  private _currentProfile: 'public' | 'private' = 'public'
  private lockTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.store = new Store({
      name: 'profile-settings',
      defaults: {
        privateProfile: {
          autoLockTimeout: 15,
          name: 'Private User'
        } as PrivateProfileSettings
      }
    })
  }

  get currentProfile() {
    return this._currentProfile
  }

  // --- Crypto ---
  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex')
    const derivedKey = scryptSync(password, salt, 64)
    return `${salt}:${derivedKey.toString('hex')}`
  }

  private verifyPassword(password: string, hash: string): boolean {
    try {
      const [salt, key] = hash.split(':')
      const keyBuffer = Buffer.from(key, 'hex')
      const derivedKey = scryptSync(password, salt, 64)
      return timingSafeEqual(keyBuffer, derivedKey)
    } catch (e) {
      console.error('verifyPassword error:', e)
      return false
    }
  }

  // --- Auth & Setup ---
  public hasPrivateProfile(): boolean {
    const settings = this.store.get('privateProfile') as PrivateProfileSettings
    return !!settings?.passwordHash
  }

  public setupPrivateProfile(password: string, hint?: string, name?: string): boolean {
    try {
      const hash = this.hashPassword(password)
      const currentSettings = this.store.get('privateProfile') as PrivateProfileSettings
      
      this.store.set('privateProfile', {
        ...currentSettings,
        passwordHash: hash,
        hint,
        name: name || currentSettings.name || 'Private User'
      })
      return true
    } catch (e) {
      console.error('Failed to setup private profile', e)
      return false
    }
  }

  public authenticate(password: string): boolean {
    const settings = this.store.get('privateProfile') as PrivateProfileSettings
    if (!settings?.passwordHash) return false
    return this.verifyPassword(password, settings.passwordHash)
  }

  // --- State Switching ---
  public switchToPrivate(password: string, mainWindow: BrowserWindow): boolean {
    if (this.authenticate(password)) {
      this._currentProfile = 'private'
      this.resetAutoLockTimer(mainWindow)
      this.notifyFrontend(mainWindow)
      return true
    }
    return false
  }

  public switchToPublic(mainWindow: BrowserWindow): void {
    if (this._currentProfile !== 'public') {
      this._currentProfile = 'public'
      this.clearAutoLockTimer()
      this.notifyFrontend(mainWindow)
    }
  }

  // --- Auto Lock ---
  public resetAutoLockTimer(mainWindow: BrowserWindow) {
    this.clearAutoLockTimer()
    if (this._currentProfile === 'private') {
      const settings = this.store.get('privateProfile') as PrivateProfileSettings
      const timeoutMinutes = settings?.autoLockTimeout || 15
      
      if (timeoutMinutes > 0) {
        this.lockTimeout = setTimeout(() => {
          this.switchToPublic(mainWindow)
        }, timeoutMinutes * 60 * 1000)
      }
    }
  }

  public clearAutoLockTimer() {
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout)
      this.lockTimeout = null
    }
  }

  // --- Settings ---
  public getSettings() {
    try {
      const settings = this.store.get('privateProfile') as PrivateProfileSettings
      return {
        hasProfile: !!settings?.passwordHash,
        hint: settings?.hint,
        autoLockTimeout: settings?.autoLockTimeout,
        name: settings?.name,
        photoPath: settings?.photoPath
      }
    } catch (e) {
      console.error('getSettings error:', e)
      return { hasProfile: false }
    }
  }

  public updateSettings(updates: Partial<PrivateProfileSettings>) {
    const current = this.store.get('privateProfile') as PrivateProfileSettings
    
    // If updating password
    if (updates.passwordHash && typeof updates.passwordHash === 'string') {
      // In IPC, the frontend sends plaintext 'password', so we handle hashing here or before
      // Wait, the IPC should send { oldPassword, newPassword } instead. We'll handle it there.
    }

    this.store.set('privateProfile', { ...current, ...updates })
  }

  public updatePassword(oldPassword: string, newPassword: string): boolean {
    if (this.authenticate(oldPassword)) {
      const hash = this.hashPassword(newPassword)
      const current = this.store.get('privateProfile') as PrivateProfileSettings
      this.store.set('privateProfile', { ...current, passwordHash: hash })
      return true
    }
    return false
  }

  public deletePrivateProfile(password: string): boolean {
    if (this.authenticate(password)) {
      const current = this.store.get('privateProfile') as PrivateProfileSettings
      this.store.set('privateProfile', {
        autoLockTimeout: current.autoLockTimeout || 15,
        name: 'Private User'
        // no passwordHash, so it's "deleted"
      })
      return true
    }
    return false
  }

  private notifyFrontend(mainWindow: BrowserWindow) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('profile-changed', this._currentProfile)
    }
  }
}

// Export singleton instance
export const profileManager = new ProfileManager()
