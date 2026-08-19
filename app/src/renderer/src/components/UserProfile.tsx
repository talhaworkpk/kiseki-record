import { useState, useEffect, useRef } from 'react'
import { User, Mail, Phone, MapPin, Calendar, Linkedin, Github, Link as LinkIcon, Camera, X, Save, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { UserProfile } from '../types'

interface UserProfileDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function UserProfileDialog({ isOpen, onClose }: UserProfileDialogProps) {
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    linkedin: '',
    github: '',
    website: '',
    photoPath: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [completion, setCompletion] = useState(0)
  const [isCropMode, setIsCropMode] = useState(false)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [cropScale, setCropScale] = useState(1)
  const [cropRotation, setCropRotation] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const loadProfile = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('userProfile', {})
      if (data && data.length > 0) {
        setProfile(data[0])
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen])

  useEffect(() => {
    const fields = ['fullName', 'email', 'phone', 'address', 'photoPath']
    const completed = fields.filter(field => profile[field as keyof UserProfile] && profile[field as keyof UserProfile] !== '').length
    setCompletion(Math.round((completed / fields.length) * 100))
  }, [profile])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // @ts-ignore
      const existing = await window.api.db.find('userProfile', {})
      
      // Clean up profile data - remove undefined values
      const profileData: any = {
        fullName: profile.fullName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        lastUpdated: Date.now(),
        createdAt: existing.length > 0 ? existing[0].createdAt : Date.now()
      }
      
      // Only add optional fields if they have values
      if (profile.dateOfBirth) profileData.dateOfBirth = profile.dateOfBirth
      if (profile.gender) profileData.gender = profile.gender
      if (profile.nationality) profileData.nationality = profile.nationality
      if (profile.linkedin) profileData.linkedin = profile.linkedin
      if (profile.github) profileData.github = profile.github
      if (profile.website) profileData.website = profile.website
      if (profile.photoPath) profileData.photoPath = profile.photoPath
      
      if (existing.length > 0) {
        // @ts-ignore
        await window.api.db.update('userProfile', { _id: existing[0]._id }, { $set: profileData }, {})
      } else {
        // @ts-ignore
        await window.api.db.insert('userProfile', profileData)
      }

      // Sync with "Self" Relationship profile
      // @ts-ignore
      const currentProfile = await window.api.profile.getCurrent()
      const selfId = `self_${currentProfile}`
      
      // @ts-ignore
      const selfRel = await window.api.db.find('relationships', { _id: selfId })
      const selfPerson = {
        name: profileData.fullName,
        profilePicture: profileData.photoPath || '',
        gender: profileData.gender || '',
        birthday: profileData.dateOfBirth || '',
        phone: profileData.phone || '',
        email: profileData.email || '',
        address: profileData.address || '',
        relationshipType: 'Myself',
        updatedAt: Date.now()
      }
      if (selfRel && selfRel.length > 0) {
        // @ts-ignore
        await window.api.db.update('relationships', { _id: selfId }, { $set: selfPerson }, {})
      } else {
        // @ts-ignore
        await window.api.db.insert('relationships', { _id: selfId, ...selfPerson, tags: [], notes: [], createdAt: Date.now() })
      }
      onClose()
      // Trigger profile reload in parent component
      window.dispatchEvent(new CustomEvent('profileUpdated'))
    } catch (err: any) {
      alert('Failed to save profile: ' + (err?.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setProfile({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      gender: '',
      nationality: '',
      linkedin: '',
      github: '',
      website: '',
      photoPath: ''
    })
  }

  const handlePhotoUpload = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setCropImage(result.files[0].filePath)
      setIsCropMode(true)
      setCropScale(1)
      setCropRotation(0)
    }
  }

  const handleApplyCrop = async () => {
    if (!canvasRef.current || !cropImage) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = async () => {
        try {
          const size = 200
          canvas.width = size
          canvas.height = size

          ctx.save()
          ctx.translate(size / 2, size / 2)
          ctx.rotate((cropRotation * Math.PI) / 180)
          ctx.scale(cropScale, cropScale)
          ctx.drawImage(img, -size / 2, -size / 2, size, size)
          ctx.restore()

          const base64 = canvas.toDataURL('image/png')
          
          console.log('Saving cropped image via base64...')
          // Save the cropped image
          // @ts-ignore
          const result = await window.api.attachment.saveBase64(base64)
          console.log('Save result:', result)
          
          if (result.success) {
            setProfile({ ...profile, photoPath: result.filePath })
            setIsCropMode(false)
            setCropImage(null)
            resolve()
          } else {
            console.error('Failed to save cropped image:', result.error)
            alert('Failed to save cropped image')
            reject(result.error)
          }
        } catch (err) {
          console.error('Error in crop processing:', err)
          reject(err)
        }
      }
      img.onerror = () => {
        console.error('Failed to load image for cropping')
        reject(new Error('Failed to load image'))
      }
      img.src = cropImage
    })
  }

  const handleCancelCrop = () => {
    setIsCropMode(false)
    setCropImage(null)
    setCropScale(1)
    setCropRotation(0)
  }

  const handleRemovePhoto = () => {
    setProfile({ ...profile, photoPath: '' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="text-primary" /> User Profile
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-md">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Completion Indicator */}
          <div className="bg-accent/30 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Profile Completion</span>
              <span className="text-sm font-bold text-primary">{completion}%</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${completion}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className={profile.fullName ? 'text-green-500' : 'text-muted-foreground'}>
                {profile.fullName ? '✓' : '✗'} Name
              </span>
              <span className={profile.email ? 'text-green-500' : 'text-muted-foreground'}>
                {profile.email ? '✓' : '✗'} Email
              </span>
              <span className={profile.phone ? 'text-green-500' : 'text-muted-foreground'}>
                {profile.phone ? '✓' : '✗'} Phone
              </span>
              <span className={profile.address ? 'text-green-500' : 'text-muted-foreground'}>
                {profile.address ? '✓' : '✗'} Address
              </span>
              <span className={profile.photoPath ? 'text-green-500' : 'text-muted-foreground'}>
                {profile.photoPath ? '✓' : '✗'} Photo
              </span>
            </div>
          </div>

          {/* Profile Photo */}
          <div className="flex flex-col items-center">
            {isCropMode ? (
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-border bg-accent flex items-center justify-center">
                  {cropImage && (
                    <img 
                      src={cropImage} 
                      alt="Crop preview" 
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${cropScale}) rotate(${cropRotation}deg)`
                      }}
                    />
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => setCropScale(Math.max(0.5, cropScale - 0.1))}
                    className="p-2 bg-accent rounded-md hover:bg-accent/80"
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button 
                    onClick={() => setCropScale(Math.min(3, cropScale + 0.1))}
                    className="p-2 bg-accent rounded-md hover:bg-accent/80"
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button 
                    onClick={() => setCropRotation(cropRotation - 90)}
                    className="p-2 bg-accent rounded-md hover:bg-accent/80"
                    title="Rotate Left"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button 
                    onClick={() => setCropRotation(cropRotation + 90)}
                    className="p-2 bg-accent rounded-md hover:bg-accent/80"
                    title="Rotate Right"
                  >
                    <RotateCw size={16} />
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={handleCancelCrop}
                    className="px-3 py-1 bg-accent rounded-md hover:bg-accent/80 text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleApplyCrop}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                  >
                    Apply
                  </button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : (
              <div className="relative group">
                {profile.photoPath ? (
                  <img 
                    src={profile.photoPath} 
                    alt="Profile" 
                    className="w-32 h-32 rounded-full object-cover border-4 border-border"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-accent border-4 border-border flex items-center justify-center">
                    <User size={48} className="text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={handlePhotoUpload}
                    className="p-2 bg-white rounded-full hover:bg-accent"
                    title="Upload Photo"
                  >
                    <Camera size={16} />
                  </button>
                  {profile.photoPath && (
                    <button 
                      onClick={handleRemovePhoto}
                      className="p-2 bg-white rounded-full hover:bg-destructive hover:text-destructive-foreground"
                      title="Remove Photo"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WEBP supported</p>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border pb-2">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <User size={14} /> Full Name
                </label>
                <input
                  type="text"
                  value={profile.fullName || ''}
                  onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-md"
                  placeholder="Muhammad Talha Rao"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Mail size={14} /> Email Address
                </label>
                <input
                  type="email"
                  value={profile.email || ''}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-md"
                  placeholder="talha@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Phone size={14} /> Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-md"
                  placeholder="+92 300 1234567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <MapPin size={14} /> Home Address
                </label>
                <input
                  type="text"
                  value={profile.address || ''}
                  onChange={e => setProfile({ ...profile, address: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-md"
                  placeholder="Karachi, Pakistan"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Calendar size={14} /> Date of Birth (Optional)
                </label>
                <input
                  type="date"
                  value={profile.dateOfBirth || ''}
                  onChange={e => setProfile({ ...profile, dateOfBirth: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Gender (Optional)</label>
                <select
                  value={profile.gender || ''}
                  onChange={e => setProfile({ ...profile, gender: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-md"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Nationality (Optional)</label>
                <input
                  type="text"
                  value={profile.nationality || ''}
                  onChange={e => setProfile({ ...profile, nationality: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-md"
                  placeholder="Pakistani"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border pb-2">Social Links (Optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Linkedin size={14} className="text-blue-600" /> LinkedIn
                </label>
                <input
                  type="url"
                  value={profile.linkedin || ''}
                  onChange={e => setProfile({ ...profile, linkedin: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-md"
                  placeholder="linkedin.com/in/talha"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Github size={14} /> GitHub
                </label>
                <input
                  type="url"
                  value={profile.github || ''}
                  onChange={e => setProfile({ ...profile, github: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-md"
                  placeholder="github.com/talha"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <LinkIcon size={14} /> Personal Website
                </label>
                <input
                  type="url"
                  value={profile.website || ''}
                  onChange={e => setProfile({ ...profile, website: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-md"
                  placeholder="talharao.com"
                />
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-sm text-green-700">
            <p className="font-medium mb-1">🔒 Privacy Notice</p>
            <p className="text-xs">All profile information remains completely local. Nothing is uploaded online. No account is required. Everything is stored only on your computer.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-card border-t border-border p-6 flex justify-end gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-accent rounded-md hover:bg-accent/80 font-medium flex items-center gap-2"
          >
            <RotateCcw size={16} /> Reset to Default
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-accent rounded-md hover:bg-accent/80 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} /> {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
