import { useState, useEffect } from 'react'
import { UserProfile } from '../types'

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      // @ts-ignore
      const data = await window.api.db.find('userProfile', {})
      console.log('useUserProfile - loaded data:', data)
      if (data && data.length > 0) {
        setProfile(data[0])
      }
    } catch (err) {
      console.error('Failed to load user profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      // @ts-ignore
      const existing = await window.api.db.find('userProfile', {})
      const profileData = {
        ...updates,
        lastUpdated: Date.now(),
        createdAt: existing.length > 0 ? existing[0].createdAt : Date.now()
      }
      
      if (existing.length > 0) {
        // @ts-ignore
        await window.api.db.update('userProfile', { _id: existing[0]._id }, { $set: profileData })
      } else {
        // @ts-ignore
        await window.api.db.insert('userProfile', profileData)
      }
      
      // Reload profile after update
      await loadProfile()
      return true
    } catch (err) {
      console.error('Failed to update user profile:', err)
      return false
    }
  }

  useEffect(() => {
    loadProfile()

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadProfile()
    }
    window.addEventListener('profileUpdated', handleProfileUpdate)
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate)
  }, [])

  return { profile, isLoading, loadProfile, updateProfile }
}
