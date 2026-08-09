import React, { useState, useRef, useEffect } from 'react'
import { UploadCloud, X, File as FileIcon, Image as ImageIcon, Music, Video, Loader2, User } from 'lucide-react'

interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const TYPE_OPTIONS = [
  { value: 'journal', label: 'Journal Entry' },
  { value: 'records', label: 'Record' },
  { value: 'goals', label: 'Goal' },
  { value: 'relationships', label: 'Person' },
  { value: 'habits', label: 'Habit' },
  { value: 'education', label: 'Education' },
  { value: 'jobs', label: 'Job' },
  { value: 'projects', label: 'Project' },
  { value: 'skills', label: 'Skill' },
  { value: 'certificates', label: 'Certificate' },
  { value: 'achievements', label: 'Achievement' },
]

export function QuickAddModal({ isOpen, onClose, onSuccess }: QuickAddModalProps) {
  const [type, setType] = useState('journal')
  const [formData, setFormData] = useState<any>({})
  const [files, setFiles] = useState<File[]>([])
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedRelationships, setSavedRelationships] = useState<any[]>([])
  const [targetPersonId, setTargetPersonId] = useState<string>('new')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const profileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // @ts-ignore
      window.api.db.find('relationships', {}).then(setSavedRelationships).catch(console.error)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 1. Process files
      const uploadedPaths: { type: 'image' | 'audio' | 'video' | 'file', path: string }[] = []
      for (const file of files) {
        try {
          let res: any
          // @ts-ignore
          if (file.path && window.api.attachment.saveFile) {
            // @ts-ignore
            res = await window.api.attachment.saveFile(file.path)
          } else {
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = error => reject(error)
              reader.readAsDataURL(file)
            })
            // @ts-ignore
            res = await window.api.attachment.saveBase64(base64)
          }

          if (res && res.success && res.filePath) {
            let fileType = 'file'
            if (file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) fileType = 'image'
            else if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|mpeg)$/i)) fileType = 'audio'
            else if (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|mkv|avi|wmv|flv)$/i)) fileType = 'video'
            
            uploadedPaths.push({ type: fileType as 'image' | 'audio' | 'video' | 'file', path: res.filePath })
          }
        } catch (err) {
          console.error('Failed to upload file:', err)
        }
      }

      // 2. Map form data to database fields based on collection type
      const now = Date.now()
      const todayStr = new Date().toISOString().split('T')[0]
      let entry: any = { createdAt: now, updatedAt: now }

      let finalProfilePicture = ''
      if (profileImage) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = error => reject(error)
            reader.readAsDataURL(profileImage)
          })
          // @ts-ignore
          const res = await window.api.attachment.saveBase64(base64)
          if (res.success && res.filePath) {
            finalProfilePicture = res.filePath
          }
        } catch (err) {
          console.error('Failed to upload profile picture:', err)
        }
      }

      const photos = uploadedPaths.filter(p => p.type === 'image').map(p => p.path)
      const attachments = uploadedPaths.map(p => p.path) // All files as attachments as fallback
      const audios = uploadedPaths.filter(p => p.type === 'audio').map(p => p.path)
      const videos = uploadedPaths.filter(p => p.type === 'video').map(p => p.path)

      let shouldInsert = true

      if (type === 'journal') {
        entry = { ...entry, ...formData, date: todayStr, tags: [], isPrivate: false, photos, fileAttachments: attachments, voiceNotes: audios }
      } else if (type === 'records') {
        entry = { ...entry, ...formData, type: formData.type || 'Event', date: formData.date || todayStr, tags: [], privacyLevel: 'private', importance: 3, attachments }
      } else if (type === 'goals') {
        entry = { ...entry, ...formData, category: 'Career', priority: formData.priority || 'medium', status: formData.status || 'Active', startDate: formData.startDate || todayStr, targetDate: formData.targetDate || todayStr, progress: Number(formData.progress) || 0 }
      } else if (type === 'relationships') {
        if (targetPersonId === 'new') {
          entry = { ...entry, ...formData, tags: [], relationshipScore: 50, relationshipType: formData.relationshipType || 'Friend', profilePicture: finalProfilePicture || photos[0], photos, audio: audios, video: videos, attachments }
        } else {
          shouldInsert = false
          const existingPerson = savedRelationships.find(r => r._id === targetPersonId)
          if (existingPerson) {
            const updatePayload: any = {
              photos: [...(existingPerson.photos || []), ...photos],
              audio: [...(existingPerson.audio || []), ...audios],
              video: [...(existingPerson.video || []), ...videos],
              attachments: [...(existingPerson.attachments || []), ...attachments]
            }
            if (finalProfilePicture) updatePayload.profilePicture = finalProfilePicture
            // @ts-ignore
            await window.api.db.update('relationships', { _id: targetPersonId }, { $set: updatePayload }, {})
          }
        }
      } else if (type === 'habits') {
        entry = { ...entry, ...formData, priority: formData.priority || 'medium', scheduleType: formData.scheduleType || 'daily', isTimerEnabled: false, startDate: todayStr, archived: false, icon: formData.icon !== undefined ? formData.icon : '🌟' }
      } else if (type === 'education') {
        entry = { ...entry, ...formData, status: formData.status || 'Current', startDate: formData.startDate || todayStr, photos, attachments }
      } else if (type === 'jobs') {
        entry = { ...entry, ...formData, isCurrent: formData.isCurrent ?? true, startDate: formData.startDate || todayStr, attachments }
      } else if (type === 'projects') {
        const techArray = formData.technologies ? formData.technologies.split(',').map((t: string) => t.trim()) : []
        entry = { ...entry, ...formData, status: formData.status || 'Planning', startDate: formData.startDate || todayStr, technologies: techArray, screenshots: photos, attachments }
      } else if (type === 'skills') {
        entry = { ...entry, ...formData, level: Number(formData.level) || 50, yearsOfExperience: Number(formData.yearsOfExperience) || 1, backgroundImage: photos[0] }
      } else if (type === 'certificates') {
        entry = { ...entry, ...formData, issueDate: formData.issueDate || todayStr, imageAttachment: photos[0], pdfAttachment: attachments.find(a => a.endsWith('.pdf')) }
      } else if (type === 'achievements') {
        entry = { ...entry, ...formData, date: formData.date || todayStr, photos, attachments }
      }

      if (shouldInsert) {
        const collectionName = type === 'jobs' ? 'career' : type
        // @ts-ignore
        await window.api.db.insert(collectionName, entry)
      }
      
      onSuccess()
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Helper to render input
  const renderInput = (key: string, label: string, inputType: string = 'text', placeholder: string = '', isFirst: boolean = false) => (
    <div key={`${type}-${key}`}>
      <label className="text-sm font-medium text-muted-foreground mb-1 block">{label}</label>
      {inputType === 'textarea' ? (
        <textarea 
          autoFocus={isFirst}
          value={formData[key] || ''} 
          onChange={e => setFormData({...formData, [key]: e.target.value})}
          className="w-full p-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
          placeholder={placeholder}
        />
      ) : (
        <input 
          autoFocus={isFirst}
          type={inputType} 
          value={formData[key] || ''} 
          onChange={e => setFormData({...formData, [key]: e.target.value})}
          className="w-full p-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder={placeholder}
        />
      )}
    </div>
  )

  const renderSelect = (key: string, label: string, options: (string | {label: string, value: string})[]) => (
    <div>
      <label className="text-sm font-medium text-muted-foreground mb-1 block">{label}</label>
      <select 
        value={formData[key] || (typeof options[0] === 'string' ? options[0] : options[0].value)} 
        onChange={e => setFormData({...formData, [key]: e.target.value})}
        className="w-full p-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {options.map((o, i) => (
          <option key={i} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-xl">Quick Add</h3>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Type</label>
            <select 
              value={type} 
              onChange={e => {
                setType(e.target.value)
                setFormData({}) // Reset fields on type change
                setFiles([])
                setProfileImage(null)
              }}
              className="w-full p-3 bg-background border-2 border-primary/20 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 font-medium"
            >
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dynamic Fields */}
              {(type === 'journal' || type === 'records' || type === 'goals' || type === 'habits' || type === 'projects' || type === 'achievements') && (
                <div className="col-span-1 md:col-span-2">{renderInput('title', 'Title', 'text', 'Enter title...', true)}</div>
              )}
              
              {(type === 'journal' || type === 'records' || type === 'goals' || type === 'projects' || type === 'achievements') && (
              <div className="col-span-1 md:col-span-2">
                {renderInput(type === 'journal' ? 'content' : 'description', type === 'goals' ? 'Notes / Content' : 'Description', 'textarea', type === 'goals' ? 'Add any additional notes, details, or content related to this goal...' : 'Add details...')}
                {type === 'journal' && (
                  <button 
                    onClick={() => {
                      onClose()
                      window.location.hash = '#/journal'
                    }}
                    className="mt-2 text-sm text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    Open Full Journal Editor →
                  </button>
                )}
              </div>
            )}

            {type === 'records' && (
              <>
                {renderSelect('type', 'Record Sub-type', ['Event', 'Memory', 'Thought', 'Photo', 'Video', 'Document'])}
                {renderInput('date', 'Date', 'date')}
              </>
            )}
            {type === 'goals' && (
              <>
                {renderInput('progress', 'Progress (0-100)', 'number')}
                {renderSelect('status', 'Status', ['Active', 'Planned', 'Paused', 'Completed', 'Cancelled'])}
                {renderInput('startDate', 'Start Date', 'date')}
                {renderInput('targetDate', 'Target Date', 'date')}
              </>
            )}
            
            {type === 'relationships' && (
              <>
                <div className="col-span-1 md:col-span-2 mb-2">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Action</label>
                  <select 
                    value={targetPersonId} 
                    onChange={e => setTargetPersonId(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                  >
                    <option value="new">✨ Create New Person</option>
                    {savedRelationships.map(rel => (
                      <option key={rel._id} value={rel._id}>👤 Add Media to: {rel.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col items-center mb-2">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Profile Picture (Optional)</label>
                  <div 
                    onClick={() => profileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all overflow-hidden relative group bg-accent/30"
                  >
                    {profileImage ? (
                      <img src={URL.createObjectURL(profileImage)} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <UploadCloud size={20} className="text-white" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={profileInputRef} 
                    className="hidden" 
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setProfileImage(e.target.files[0])
                      }
                    }}
                  />
                  {profileImage && (
                    <button onClick={() => setProfileImage(null)} className="text-xs text-destructive mt-2 hover:underline">Remove</button>
                  )}
                </div>

                {targetPersonId === 'new' && (
                  <>
                    <div className="col-span-1 md:col-span-2">{renderInput('name', 'Name', 'text', '', true)}</div>
                    {renderInput('relationshipType', 'Relationship Type', 'text', 'e.g., Friend, Family')}
                    <div className="col-span-1 md:col-span-2">{renderInput('bio', 'Bio', 'textarea')}</div>
                  </>
                )}
              </>
            )}

            {type === 'habits' && (
              <>
                {renderInput('category', 'Category', 'text', 'e.g., Health')}
                {renderSelect('priority', 'Priority', ['low', 'medium', 'high'])}
                {renderSelect('scheduleType', 'Schedule', [
                  { label: 'Everyday', value: 'daily' },
                  { label: 'Weekdays', value: 'weekdays' },
                  { label: 'Weekends', value: 'weekends' },
                  { label: 'Specific Days', value: 'specific_days' }
                ])}
                {formData.scheduleType === 'specific_days' && (
                  <div className="col-span-1 md:col-span-2 flex justify-between gap-1 mt-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const days = formData.scheduleDays || []
                          if (days.includes(idx)) {
                            setFormData({...formData, scheduleDays: days.filter((d: number) => d !== idx)})
                          } else {
                            setFormData({...formData, scheduleDays: [...days, idx].sort()})
                          }
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                          (formData.scheduleDays || []).includes(idx) 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-accent text-muted-foreground hover:bg-accent/80'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {type === 'education' && (
              <>
                {renderInput('school', 'Institute Name', 'text', '', true)}
                {renderInput('degree', 'Degree')}
                {renderInput('field', 'Field of Study')}
                {renderSelect('status', 'Status', ['Current', 'Graduated', 'Dropped'])}
                {renderInput('startDate', 'Start Date', 'date')}
              </>
            )}

            {type === 'jobs' && (
              <>
                {renderInput('company', 'Company', 'text', '', true)}
                {renderInput('position', 'Position')}
                {renderInput('employmentType', 'Employment Type', 'text', 'e.g., Full-time')}
                {renderInput('startDate', 'Start Date', 'date')}
              </>
            )}

            {type === 'projects' && (
              <div className="col-span-1 md:col-span-2">
                {renderInput('technologies', 'Language / Technologies', 'text', 'html, Node.js, Electron')}
              </div>
            )}

            {type === 'skills' && (
              <>
                <div className="col-span-1 md:col-span-2">{renderInput('name', 'Skill Name', 'text', '', true)}</div>
                {renderInput('level', 'Level (1-100)', 'number')}
                {renderInput('yearsOfExperience', 'Years of Experience', 'number')}
              </>
            )}

            {type === 'certificates' && (
              <>
                <div className="col-span-1 md:col-span-2">{renderInput('name', 'Certificate Name', 'text', '', true)}</div>
                {renderInput('organization', 'Organization')}
                {renderInput('issueDate', 'Issue Date', 'date')}
              </>
            )}

            {type === 'achievements' && renderInput('date', 'Date', 'date')}
          </div>

          {/* Unified Media/File Uploader */}
          {type !== 'goals' && (
            type === 'habits' ? (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Drop Emoji</label>
                <input 
                  type="text" 
                  value={formData.icon !== undefined ? formData.icon : '🌟'} 
                  onChange={e => setFormData({...formData, icon: e.target.value})}
                  className="w-full p-4 bg-background border border-border rounded-xl text-3xl text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Drop an emoji here..."
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {type === 'skills' ? 'Add Background Img' :
                 type === 'certificates' ? 'Add Certificate Photo & File' :
                 type === 'relationships' ? 'Media (Photos, Audio, Video, Files)' :
                 'Attachments (Photos, Audio, Video, Files)'}
              </label>
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <UploadCloud size={40} className="text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                <p className="font-medium text-sm">Drag and drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse from your computer</p>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={e => {
                    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
                  }}
                />
              </div>
              
              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, idx) => {
                    let Icon = FileIcon
                    if (file.type.startsWith('image/')) Icon = ImageIcon
                    else if (file.type.startsWith('audio/')) Icon = Music
                    else if (file.type.startsWith('video/')) Icon = Video

                    const isImage = file.type.startsWith('image/')
                    const previewUrl = isImage ? URL.createObjectURL(file) : null

                    return (
                      <div key={idx} className="flex items-center justify-between bg-accent p-2 rounded-lg text-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {isImage && previewUrl ? (
                            <img src={previewUrl} alt="preview" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          ) : (
                            <Icon size={16} className="text-primary flex-shrink-0" />
                          )}
                          <span className="truncate">{file.name}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-destructive">
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            )
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-card/50">
          <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 bg-accent hover:bg-accent/80 rounded-xl font-medium transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-75 disabled:active:scale-100">
            {isSaving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Save Entry'}
          </button>
        </div>

      </div>
    </div>
  )
}
