import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Heart, Calendar, MessageCircle, FileText, Sparkles, Phone, Video, MoreVertical, Plus, Image as ImageIcon, File as FileIcon, Clock, Edit2, Trash2, Pin, Eye, Download, Music, Folder, Upload, Star, Shield, TrendingUp } from 'lucide-react'
import { NotificationEngine } from '../lib/NotificationEngine'
import { Person, RecordItem } from '../types'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { normalizeUrl, getSafeMediaUrl } from '../lib/utils'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import RelationshipEventsTab from '../components/relationships/RelationshipEventsTab'
import RelationshipMemoriesTab from '../components/relationships/RelationshipMemoriesTab'

export default function RelationshipProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [person, setPerson] = useState<Person | null>(null)
  const [records, setRecords] = useState<RecordItem[]>([])
  const [allRelationships, setAllRelationships] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('Overview')
  const [loading, setLoading] = useState(true)
  
  const [aiInsights, setAiInsights] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Modals & Menus
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showProfilePicManager, setShowProfilePicManager] = useState(false)
  const [showChangePicture, setShowChangePicture] = useState(false)
  
  // Forms
  const [showTimelineForm, setShowTimelineForm] = useState(false)
  const [showMemoryForm, setShowMemoryForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)

  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  
  const [cropPictureSrc, setCropPictureSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [editForm, setEditForm] = useState<Partial<Person>>({})
  const [showEditModal, setShowEditModal] = useState(false)
  const relTypes = ['Family', 'Friend', 'Best Friend', 'Partner', 'Colleague', 'Acquaintance', 'Other']

  const [formState, setFormState] = useState<any>({})
  const [editNoteId, setEditNoteId] = useState<string | null>(null)

  // Delete Checkboxes
  const [deleteOptions, setDeleteOptions] = useState({
    profile: true,
    timeline: true,
    notes: true,
    events: true,
    ai: true,
    memories: true
  })

  useEffect(() => {
    if (id) loadData(id)
  }, [id])

  const loadData = async (personId: string) => {
    setLoading(true)
    try {
      // @ts-ignore
      const pData = await window.api.db.find('relationships', { _id: personId })
      if (pData.length > 0) {
        let p = pData[0]
        // Migration: convert old string notes to new array format if needed
        if (typeof p.notes === 'string') {
          p.notes = [{ _id: Date.now().toString(), content: p.notes, createdAt: Date.now(), isPinned: false }]
        }
        if (!p.notes) p.notes = []
        setPerson(p)
      }
      
      // Fetch all relationships
      // @ts-ignore
      const allRels = await window.api.db.find('relationships', {})
      setAllRelationships(allRels)
      // Load related records
      // @ts-ignore
      const rData = await window.api.db.find('records', {})
      const related = rData.filter((r: RecordItem) =>
        (r.people && r.people.includes(personId)) ||
        (r.people && r.people.includes(pData[0]?.name))
      ).sort((a: RecordItem, b: RecordItem) => b.createdAt - a.createdAt)

      setRecords(related)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // --- Deletion Flow ---
  const handleDeletePerson = async () => {
    if (!person || !person._id) return
    try {
      if (deleteOptions.profile) {
        // @ts-ignore
        await window.api.db.remove('relationships', { _id: person._id }, {})
      }
      
      // If we are deleting timelines/memories/events, we find all linked records
      // and delete them. If user unchecked them, we leave them (they just lose the person tag context eventually or keep it as text).
      if (deleteOptions.timeline || deleteOptions.memories || deleteOptions.events) {
        const typesToDelete: string[] = []
        if (deleteOptions.timeline) typesToDelete.push('Timeline Event')
        if (deleteOptions.memories) typesToDelete.push('Memory')
        if (deleteOptions.events) typesToDelete.push('Event')

        const toDelete = records.filter(r => typesToDelete.includes(r.type))
        for (const r of toDelete) {
          // @ts-ignore
          await window.api.db.remove('records', { _id: r._id }, {})
        }
      }
      
      NotificationEngine.notify('info', 'Relationship Deleted', `"${person.name}" was removed.`, 'Relationships')
      navigate('/relationships')
    } catch (err) {
      console.error(err)
    }
  }

  // --- Profile Picture Management ---
  const updateProfilePicture = async (picPath: string) => {
    if (!person) return
    try {
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { profilePicture: picPath, updatedAt: Date.now() } }, {})
      
      if (person._id?.startsWith('self_')) {
        // @ts-ignore
        const existingProfile = await window.api.db.find('userProfile', {})
        if (existingProfile && existingProfile.length > 0) {
          // @ts-ignore
          await window.api.db.update('userProfile', { _id: existingProfile[0]._id }, { $set: { photoPath: picPath } }, {})
          // Trigger profile reload in parent component
          window.dispatchEvent(new CustomEvent('profileUpdated'))
        }
      }

      setPerson({ ...person, profilePicture: picPath })
      setShowChangePicture(false)
      setShowProfilePicManager(false)
    } catch (err) { console.error(err) }
  }

  // --- Photo Actions ---
  const handleUploadPhotos = async () => {
    try {
      // @ts-ignore
      const result = await window.api.attachment.add({ multiple: true })
      if (result.success && result.files) {
         for (const file of result.files) {
           const newRecord = {
             title: 'Uploaded Photo',
             type: 'Photo',
             date: new Date().toISOString(),
             people: [person!._id!],
             attachments: [file.filePath],
             createdAt: Date.now(),
             updatedAt: Date.now()
           }
           // @ts-ignore
           await window.api.db.insert('records', newRecord)
         }
         // @ts-ignore
         await window.api.db.update('relationships', { _id: person._id }, { $set: { updatedAt: Date.now() } }, {})
         loadData(person!._id!)
      }
    } catch(e) { console.error(e) }
  }

  const removeAttachment = async (photoUrl: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return
    
    const isInPerson = person?.attachments?.includes(photoUrl) || person?.photos?.includes(photoUrl) || person?.video?.includes(photoUrl) || person?.audio?.includes(photoUrl)
    
    if (isInPerson && person) {
      const updatePayload: any = {}
      if (person.attachments) updatePayload.attachments = person.attachments.filter(a => a !== photoUrl)
      if (person.photos) updatePayload.photos = person.photos.filter(a => a !== photoUrl)
      if (person.video) updatePayload.video = person.video.filter(a => a !== photoUrl)
      if (person.audio) updatePayload.audio = person.audio.filter(a => a !== photoUrl)
      
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { ...updatePayload, updatedAt: Date.now() } }, {})
      loadData(person._id!)
      return
    }

    const record = records.find(r => r.attachments?.includes(photoUrl))
    if (record) {
      const newAttachments = record.attachments!.filter(a => a !== photoUrl)
      // @ts-ignore
      await window.api.db.update('records', { _id: record._id }, { $set: { attachments: newAttachments, updatedAt: Date.now() } }, {})
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { updatedAt: Date.now() } }, {})
      loadData(person!._id!)
    }
  }

  // --- Dropdown Actions ---
  const handleDuplicatePerson = async () => {
    const copy = { ...person, _id: undefined, name: `${person?.name} (Copy)`, createdAt: Date.now(), updatedAt: Date.now() }
    try {
      // @ts-ignore
      await window.api.db.insert('relationships', copy)
      navigate('/relationships')
    } catch(e) { console.error(e) }
  }

  const handleArchivePerson = async () => {
    if (!person) return
    try {
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { isArchived: !person.isArchived, updatedAt: Date.now() } }, {})
      setPerson({ ...person, isArchived: !person.isArchived })
    } catch(e) { console.error(e) }
  }

  const handleExportProfile = () => {
    if (!person) return
    try {
      // Ensure all records have an attachments array explicitly defined
      const enrichedRecords = records.map(r => ({ ...r, attachments: r.attachments || [] }))
      const data = { person, records: enrichedRecords }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kiseki_profile_${person.name.replace(/\s+/g, '_')}.json`
      a.click()
      URL.revokeObjectURL(url)
      NotificationEngine.notify('success', 'Export Complete', `Successfully exported ${person.name}'s profile.`, 'Relationships')
    } catch (e) {
      console.error('Failed to export profile', e)
      NotificationEngine.notify('error', 'Export Failed', 'An error occurred while exporting the profile.', 'Relationships')
    }
  }

  const saveEditPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!person) return
    try {
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { ...editForm, updatedAt: Date.now() } }, {})
      
      // Sync back to User Profile if this is "Myself"
      if (person._id?.startsWith('self_')) {
        const userProfileUpdates: any = {}
        if (editForm.name !== undefined) userProfileUpdates.fullName = editForm.name
        if (editForm.profilePicture !== undefined) userProfileUpdates.photoPath = editForm.profilePicture
        if (editForm.gender !== undefined) userProfileUpdates.gender = editForm.gender
        if (editForm.birthday !== undefined) userProfileUpdates.dateOfBirth = editForm.birthday
        if (editForm.phone !== undefined) userProfileUpdates.phone = editForm.phone
        if (editForm.email !== undefined) userProfileUpdates.email = editForm.email
        if (editForm.address !== undefined) userProfileUpdates.address = editForm.address
        if (editForm.bio !== undefined) userProfileUpdates.bio = editForm.bio

        // @ts-ignore
        const existingProfile = await window.api.db.find('userProfile', {})
        if (existingProfile && existingProfile.length > 0) {
          // @ts-ignore
          await window.api.db.update('userProfile', { _id: existingProfile[0]._id }, { $set: userProfileUpdates }, {})
          // Trigger profile reload in parent component so App header updates
          window.dispatchEvent(new CustomEvent('profileUpdated'))
        }
      }

      setPerson({ ...person, ...editForm } as Person)
      setShowEditModal(false)
    } catch(err) { console.error(err) }
  }

  // --- File Attachments ---
  const handleAttachFile = async () => {
    try {
      // @ts-ignore
      const result = await window.api.attachment.add()
      if (result.success && result.files && result.files.length > 0) {
        setFormState((prev: any) => ({
          ...prev, 
          attachments: [...(prev.attachments || []), result.files[0].filePath]
        }))
      }
    } catch (err) { console.error(err) }
  }

  // --- Forms Submit ---
  const handleSaveRecord = async (e: React.FormEvent, defaultType: string) => {
    e.preventDefault()
    if (!person || !formState.title) return

    const now = Date.now()
    const newRecord: RecordItem = {
      title: formState.title,
      description: formState.description || '',
      date: formState.date || new Date().toISOString(),
      type: formState.type || defaultType, // 'Timeline Event', 'Memory', 'Event'
      tags: formState.tags || [],
      people: [person._id!],
      importance: 3,
      privacyLevel: 'private',
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      isArchived: false,
      attachments: formState.attachments || [],
      mood: formState.emotion || '',
      location: formState.location || ''
    }

    try {
      // @ts-ignore
      await window.api.db.insert('records', newRecord)
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { updatedAt: Date.now() } }, {})
      setFormState({})
      setShowTimelineForm(false)
      setShowMemoryForm(false)
      setShowEventForm(false)
      loadData(person._id!)
    } catch (err) { console.error(err) }
  }

  // --- Notes Management ---
  const saveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!person || !formState.content) return

    let newNotes = [...(person.notes || [])]
    
    if (editNoteId) {
      const idx = newNotes.findIndex(n => n._id === editNoteId)
      if (idx !== -1) newNotes[idx].content = formState.content
    } else {
      newNotes.push({
        _id: Date.now().toString(),
        content: formState.content,
        createdAt: Date.now(),
        isPinned: false
      })
    }

    try {
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { notes: newNotes, updatedAt: Date.now() } }, {})
      setPerson({ ...person, notes: newNotes })
      setFormState({})
      setEditNoteId(null)
      setShowNoteForm(false)
    } catch (err) { console.error(err) }
  }

  const deleteNote = async (noteId: string) => {
    if (!person) return
    const newNotes = (person.notes || []).filter(n => n._id !== noteId)
    try {
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { notes: newNotes, updatedAt: Date.now() } }, {})
      setPerson({ ...person, notes: newNotes })
    } catch (err) { console.error(err) }
  }

  const togglePinNote = async (noteId: string) => {
    if (!person) return
    const newNotes = [...(person.notes || [])]
    const idx = newNotes.findIndex(n => n._id === noteId)
    if (idx !== -1) newNotes[idx].isPinned = !newNotes[idx].isPinned
    
    try {
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { notes: newNotes, updatedAt: Date.now() } }, {})
      setPerson({ ...person, notes: newNotes })
    } catch (err) { console.error(err) }
  }

  // --- Import Memory ---
  const handleImportMemory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !person) return

    try {
      const text = await file.text()
      const importedData = JSON.parse(text)

      // Validate the imported data structure
      if (!importedData.title || !importedData.date) {
        NotificationEngine.notify('error', 'Invalid File', 'The JSON file does not contain valid memory data.', 'Relationships')
        return
      }

      // Create a new record from the imported data
      const now = Date.now()
      const newRecord: RecordItem = {
        title: importedData.title,
        description: importedData.description || '',
        date: importedData.date,
        type: importedData.type || 'Memory',
        tags: importedData.tags || [],
        people: [person._id!], // Associate with current relationship
        importance: importedData.importance || 3,
        privacyLevel: importedData.privacyLevel || 'private',
        createdAt: now,
        updatedAt: now,
        isFavorite: importedData.isFavorite || false,
        isArchived: importedData.isArchived || false,
        attachments: importedData.attachments || [],
        mood: importedData.mood || '',
        location: importedData.location || ''
      }

      // @ts-ignore
      await window.api.db.insert('records', newRecord)
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { updatedAt: Date.now() } }, {})
      
      NotificationEngine.notify('success', 'Import Successful', `Memory "${importedData.title}" has been imported to ${person.name}'s profile.`, 'Relationships')
      loadData(person._id!)

      // Reset the file input
      e.target.value = ''
    } catch (err) {
      console.error('Failed to import memory:', err)
      NotificationEngine.notify('error', 'Import Failed', 'Failed to import the memory. Please check the file format.', 'Relationships')
    }
  }

  // --- Calculate Dynamic Relationship Score & Health Metrics ---
  const calculateRelationshipMetrics = () => {
    if (!person || !records) return { score: 50, trust: 50, communication: 50, intimacy: 50, growth: 50 }

    const activeRecords = records.filter(r => !r.isArchived)
    const now = Date.now()
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000)
    const threeMonthsAgo = now - (90 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000)

    let score = 50 // Base score

    // INCREASE FACTORS

    // Factor 1: Number of interactions (max 20 points)
    const interactionCount = activeRecords.length
    score += Math.min(20, interactionCount * 2)

    // Factor 2: Recency of interactions (max 30 points)
    const recentInteractions = activeRecords.filter(r => new Date(r.date).getTime() > oneMonthAgo)
    const veryRecentInteractions = activeRecords.filter(r => new Date(r.date).getTime() > threeMonthsAgo)
    score += Math.min(20, recentInteractions.length * 5)
    score += Math.min(10, veryRecentInteractions.length * 2)

    // Factor 3: Media richness (max 15 points)
    const totalAttachments = activeRecords.reduce((acc, r) => acc + (r.attachments?.length || 0), 0)
    score += Math.min(15, totalAttachments * 2)

    // Factor 4: Favorites (max 10 points)
    const favoriteCount = activeRecords.filter(r => r.isFavorite).length
    score += Math.min(10, favoriteCount * 3)

    // Factor 5: Relationship duration (max 10 points)
    if (person.relationshipStarted) {
      const startDate = new Date(person.relationshipStarted).getTime()
      const monthsSinceStart = Math.floor((now - startDate) / (30 * 24 * 60 * 60 * 1000))
      score += Math.min(10, monthsSinceStart * 0.5)
    }

    // Factor 6: Variety of record types (max 15 points)
    const uniqueTypes = new Set(activeRecords.map(r => r.type)).size
    score += Math.min(15, uniqueTypes * 3)

    // DECREASE FACTORS

    // Factor 7: Lack of recent interactions (max -30 points)
    const oldInteractions = activeRecords.filter(r => new Date(r.date).getTime() < sixMonthsAgo)
    if (interactionCount > 0 && recentInteractions.length === 0) {
      score -= Math.min(30, oldInteractions.length * 3)
    }

    // Factor 8: High ratio of archived items (max -20 points)
    const totalRecords = records.length
    const archivedCount = records.filter(r => r.isArchived).length
    let archiveRatio = 0
    if (totalRecords > 0) {
      archiveRatio = archivedCount / totalRecords
      if (archiveRatio > 0.5) {
        score -= Math.min(20, Math.round(archiveRatio * 40))
      }
    }

    // Factor 9: No media despite many interactions (max -10 points)
    if (interactionCount > 5 && totalAttachments === 0) {
      score -= 10
    }

    // Factor 10: No favorites despite many interactions (max -10 points)
    if (interactionCount > 3 && favoriteCount === 0) {
      score -= 10
    }

    // Calculate individual health metrics
    let trust = 50
    let communication = 50
    let intimacy = 50
    let growth = 50

    // Trust based on consistency and duration
    if (person.relationshipStarted) {
      const startDate = new Date(person.relationshipStarted).getTime()
      const monthsSinceStart = Math.floor((now - startDate) / (30 * 24 * 60 * 60 * 1000))
      trust += Math.min(30, monthsSinceStart * 2)
    }
    trust += Math.min(20, interactionCount)
    trust -= Math.min(20, archivedCount * 5)

    // Communication based on recency and frequency
    communication += Math.min(30, recentInteractions.length * 10)
    communication += Math.min(20, veryRecentInteractions.length * 5)
    if (interactionCount > 0 && recentInteractions.length === 0) {
      communication -= Math.min(40, oldInteractions.length * 5)
    }

    // Intimacy based on media and favorites
    intimacy += Math.min(30, totalAttachments * 3)
    intimacy += Math.min(30, favoriteCount * 5)
    if (interactionCount > 5 && totalAttachments === 0) intimacy -= 20

    // Growth based on variety and new experiences
    growth += Math.min(30, uniqueTypes * 5)
    growth += Math.min(20, recentInteractions.length * 3)
    if (archiveRatio > 0.3) growth -= Math.min(20, archiveRatio * 50)

    // Ensure all metrics are between 0 and 100
    score = Math.max(0, Math.min(100, Math.round(score)))
    trust = Math.max(0, Math.min(100, Math.round(trust)))
    communication = Math.max(0, Math.min(100, Math.round(communication)))
    intimacy = Math.max(0, Math.min(100, Math.round(intimacy)))
    growth = Math.max(0, Math.min(100, Math.round(growth)))

    return { score, trust, communication, intimacy, growth }
  }

  const metrics = calculateRelationshipMetrics()
  const dynamicScore = metrics.score

  // Update the person's score in database when it changes significantly
  useEffect(() => {
    if (person && dynamicScore !== person.relationshipScore) {
      const updateScore = async () => {
        try {
          // @ts-ignore
          await window.api.db.update('relationships', { _id: person._id }, { $set: { relationshipScore: dynamicScore, updatedAt: Date.now() } })
          setPerson({ ...person, relationshipScore: dynamicScore })

          // Show notification based on score change
          const scoreChange = dynamicScore - person.relationshipScore
          if (scoreChange > 0) {
            NotificationEngine.notify(
              'success',
              'Relationship Score Improved',
              `Score increased by ${scoreChange} points to ${dynamicScore}/100`,
              'Relationships'
            )
          } else if (scoreChange < 0) {
            NotificationEngine.notify(
              'warning',
              'Relationship Score Changed',
              `Score decreased by ${Math.abs(scoreChange)} points to ${dynamicScore}/100`,
              'Relationships'
            )
          }
        } catch (err) {
          console.error('Failed to update relationship score:', err)
        }
      }
      updateScore()
    }
  }, [dynamicScore])

  // --- AI Insights ---
  const generateInsights = async () => {
    if (!person) return
    setIsGenerating(true)
    setAiInsights('')

    const systemPrompt = `You are a relationship analyst for the Kiseki Records app. Analyze the relationship with "${person.name}".
Relationship Type: ${person.relationshipType}
Score: ${dynamicScore}/100
Bio: ${person.bio || 'None'}
Start Date: ${person.relationshipStarted || 'Unknown'}

Recent interactions:
${records.slice(0, 10).map(r => `- ${new Date(r.date).toLocaleDateString()}: ${r.title} (${r.type})`).join('\n')}

Provide a brief, insightful summary of this relationship's health and suggest 1-2 ways to strengthen it.`

    try {
      const res = await fetch('http://127.0.0.1:11434/api/tags')
      let modelToUse = 'llama3'
      if (res.ok) {
         const data = await res.json()
         if (data.models && data.models.length > 0) {
            modelToUse = data.models[0].name
         }
      }

      const response = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelToUse, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate relationship insights.' }], stream: false })
      })
      if (response.ok) {
        const data = await response.json()
        setAiInsights(data.message?.content || 'No insights generated.')
      } else {
        setAiInsights(`Failed to generate insights. Is Ollama running with the "${modelToUse}" model installed? Try running \`ollama run ${modelToUse}\` in your terminal.`)
      }
    } catch (err) {
      setAiInsights('Error connecting to local AI engine. Make sure Ollama is running on your machine.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading profile...</div>
  if (!person) return <div className="p-8 text-center text-muted-foreground">Person not found.</div>

  const tabs = ['Overview', 'Timeline', 'Memories', 'Photos', 'Video', 'Audio', 'Events', 'AI Insights', 'Notes']

  const timelineRecords = records.filter(r => r.type === 'Timeline Event')
  const memoryRecords = records.filter(r => ['Memory', 'Journal', 'Voice', 'Video', 'Photo', 'Document', 'Link'].includes(r.type))
  const eventRecords = records.filter(r => r.type === 'Event')
  const pAttachments = person.attachments || []

  // Filter out archived records for media tabs
  const activeRecords = records.filter(r => !r.isArchived)

  // Get all photo attachments from memories, events, and other records (excluding archived)
  const allPhotoAttachments = activeRecords.flatMap(r => r.attachments?.filter((a: string) => a.match(/\.(jpg|jpeg|png|gif|webp)$/i)) || [])
  const photos = Array.from(new Set([...(person.photos || []), ...pAttachments.filter((a: string) => a.match(/\.(jpg|jpeg|png|gif|webp)$/i)), ...allPhotoAttachments]))

  // Get all audio attachments from memories, events, and other records (excluding archived)
  const allAudioAttachments = activeRecords.flatMap(r => r.attachments?.filter((a: string) => a.match(/\.(mp3|wav|ogg|m4a|mpeg)$/i)) || [])
  const audio = Array.from(new Set([...(person.audio || []), ...pAttachments.filter((a: string) => a.match(/\.(mp3|wav|ogg|m4a|mpeg)$/i)), ...allAudioAttachments]))

  // Get all video attachments from memories, events, and other records (excluding archived)
  const allVideoAttachments = activeRecords.flatMap(r => r.attachments?.filter((a: string) => a.match(/\.(mp4|webm|mov|mkv|avi|wmv|flv)$/i)) || [])
  const video = Array.from(new Set([...(person.video || []), ...pAttachments.filter((a: string) => a.match(/\.(mp4|webm|mov|mkv|avi|wmv|flv)$/i)), ...allVideoAttachments]))
  
  const sortedNotes = [...(person.notes || [])].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return b.createdAt - a.createdAt
  })

  // Find memory containing a specific attachment
  const findMemoryByAttachment = (attachmentUrl: string) => {
    return records.find(r => r.attachments?.includes(attachmentUrl))
  }

  // Navigate to memories or events tab and highlight specific record
  const handleGoToMemory = (attachmentUrl: string) => {
    const memory = findMemoryByAttachment(attachmentUrl)
    if (memory) {
      if (memory.type === 'Event') {
        setActiveTab('Events')
        setTimeout(() => {
          const el = document.getElementById(`event-card-${memory._id}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
            setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
          }
        }, 100)
      } else {
        setActiveTab('Memories')
        setTimeout(() => {
          const el = document.getElementById(`memory-card-${memory._id}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
            setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
          }
        }, 100)
      }
    } else {
      // Show notification if memory not found
      NotificationEngine.notify('info', 'Not Found', 'Attachment not found in any memory or event', 'Relationships')
    }
  }
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      
      let scrollable: Element | null = e.target as Element
      while (scrollable) {
        if (scrollable.scrollHeight > scrollable.clientHeight) {
          const overflowY = window.getComputedStyle(scrollable).overflowY
          if (overflowY === 'auto' || overflowY === 'scroll') {
             break
          }
        }
        scrollable = scrollable.parentElement
      }
      if (!scrollable) scrollable = document.querySelector('main') || document.documentElement
      
      const startY = e.clientY
      const startScrollY = scrollable.scrollTop || window.scrollY
      
      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY
        if (scrollable === document.documentElement) {
          window.scrollTo(window.scrollX, startScrollY - deltaY)
        } else {
          scrollable!.scrollTop = startScrollY - deltaY
        }
      }
      
      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }
  }

  return (
    <div 
      className="flex flex-col h-full bg-background animate-in fade-in duration-500 relative cursor-default"
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      
      {/* Header */}
      <div className="bg-card border-b border-border p-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/relationships')} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors"><ArrowLeft size={20} /></button>
          
          <div onClick={() => setShowProfilePicManager(true)} className="w-20 h-20 rounded-full bg-accent border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
            {person.profilePicture ? <img src={normalizeUrl(person.profilePicture)} className="w-full h-full object-cover"/> : <User size={32} className="text-muted-foreground"/>}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {person.name} {person.nickname && <span className="text-muted-foreground text-lg font-normal">({person.nickname})</span>}
              {/* @ts-ignore */}
              {person.isArchived && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Archived</span>}
            </h1>
            <p className="text-primary font-medium">{person.relationshipType}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Heart size={14} className="text-destructive fill-destructive"/> Score: {dynamicScore}</span>
              {person.relationshipStarted && <span className="flex items-center gap-1"><Calendar size={14}/> Since: {new Date(person.relationshipStarted).getFullYear()}</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center relative">
          <button title={person.phone || 'No phone number'} className="p-2.5 bg-accent text-accent-foreground hover:bg-accent/80 rounded-full shadow-sm"><Phone size={18}/></button>
          <button title="Implementation unfinished" onClick={() => alert('Implementation unfinished')} className="p-2.5 bg-accent text-accent-foreground hover:bg-accent/80 rounded-full shadow-sm"><MessageCircle size={18}/></button>
          <button title="Implementation unfinished" onClick={() => alert('Implementation unfinished')} className="p-2.5 bg-accent text-accent-foreground hover:bg-accent/80 rounded-full shadow-sm"><Video size={18}/></button>
          
          <div className="ml-4">
            <button title="More Actions" onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-accent rounded-md"><MoreVertical size={20}/></button>
            {showMenu && (
              <div className="absolute right-0 top-14 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                <button title="Edit this person's details" onClick={() => { setEditForm(person); setShowEditModal(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-accent">Edit Profile</button>
                <button title="Duplicate this person's profile" onClick={() => { handleDuplicatePerson(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-accent">Duplicate Person</button>
                {/* @ts-ignore */}
                <button title={person.isArchived ? "Unarchive person" : "Archive this person"} onClick={() => { handleArchivePerson(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-accent">{person.isArchived ? 'Unarchive Person' : 'Archive Person'}</button>
                <button title="Export profile to JSON file" onClick={() => { handleExportProfile(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-accent">Export Profile</button>
                <button title="Import memory from JSON file" onClick={() => { document.getElementById('import-memory-input')?.click(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"><Upload size={14}/> Import Memory</button>
                <button title="Generate relationship summary with local AI" onClick={() => { setActiveTab('AI Insights'); setShowMenu(false); generateInsights(); }} className="w-full text-left px-4 py-2 text-sm hover:bg-accent">Generate AI Summary</button>
                <div className="h-px bg-border my-1"></div>
                <button title="Delete this person permanently" onClick={() => { setShowDeleteModal(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10">Delete Person</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input for memory import */}
      <input
        id="import-memory-input"
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportMemory}
      />

      {/* Tabs */}
      <div className="flex gap-1 px-6 border-b border-border bg-card/50 overflow-x-auto shrink-0 scrollbar-hide">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-background">
        <div className="max-w-5xl mx-auto">
          
          {/* OVERVIEW */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={20} className="text-primary"/>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Score</span>
                  </div>
                  <div className="text-3xl font-black text-primary">{dynamicScore}<span className="text-lg text-primary/60">/100</span></div>
                </div>
                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={20} className="text-muted-foreground"/>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Interactions</span>
                  </div>
                  <div className="text-3xl font-black">{records.filter(r => !r.isArchived).length}</div>
                </div>
                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon size={20} className="text-muted-foreground"/>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Media</span>
                  </div>
                  <div className="text-3xl font-black">{records.filter(r => !r.isArchived).reduce((acc, r) => acc + (r.attachments?.length || 0), 0)}</div>
                </div>
                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={20} className="text-yellow-500"/>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Favorites</span>
                  </div>
                  <div className="text-3xl font-black">{records.filter(r => !r.isArchived && r.isFavorite).length}</div>
                </div>
              </div>

              {/* Relationship Health */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Heart size={20} className="text-destructive fill-destructive"/> Relationship Health</h3>
                  <div className="text-sm font-medium text-muted-foreground">Overall: {dynamicScore}/100</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium flex items-center gap-2"><Shield size={16} className="text-primary"/> Trust</span>
                        <span className="text-sm font-bold text-primary">{metrics.trust}%</span>
                      </div>
                      <div className="w-full bg-accent rounded-full h-3 overflow-hidden">
                        <div className="bg-primary h-3 rounded-full transition-all duration-500" style={{width: `${metrics.trust}%`}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium flex items-center gap-2"><MessageCircle size={16} className="text-blue-500"/> Communication</span>
                        <span className="text-sm font-bold text-blue-500">{metrics.communication}%</span>
                      </div>
                      <div className="w-full bg-accent rounded-full h-3 overflow-hidden">
                        <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{width: `${metrics.communication}%`}}></div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium flex items-center gap-2"><Sparkles size={16} className="text-purple-500"/> Intimacy</span>
                        <span className="text-sm font-bold text-purple-500">{metrics.intimacy}%</span>
                      </div>
                      <div className="w-full bg-accent rounded-full h-3 overflow-hidden">
                        <div className="bg-purple-500 h-3 rounded-full transition-all duration-500" style={{width: `${metrics.intimacy}%`}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium flex items-center gap-2"><TrendingUp size={16} className="text-green-500"/> Growth</span>
                        <span className="text-sm font-bold text-green-500">{metrics.growth}%</span>
                      </div>
                      <div className="w-full bg-accent rounded-full h-3 overflow-hidden">
                        <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{width: `${metrics.growth}%`}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio and Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {person.bio && (
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><User size={18}/> Bio</h3>
                    <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">{person.bio}</p>
                  </div>
                )}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold mb-4">Details</h3>
                  <ul className="space-y-3 text-sm">
                    {person.relationshipType && <li className="flex justify-between"><span className="text-muted-foreground">Relationship Type</span> <span className="font-medium">{person.relationshipType}</span></li>}
                    {person.relationshipStarted && <li className="flex justify-between"><span className="text-muted-foreground">Since</span> <span className="font-medium">{new Date(person.relationshipStarted).toLocaleDateString()}</span></li>}
                    {person.birthday && <li className="flex justify-between"><span className="text-muted-foreground">Birthday</span> <span className="font-medium">{person.birthday}</span></li>}
                    {person.occupation && <li className="flex justify-between"><span className="text-muted-foreground">Occupation</span> <span className="font-medium">{person.occupation}</span></li>}
                    {person.phone && <li className="flex justify-between"><span className="text-muted-foreground">Phone</span> <span className="font-medium">{person.phone}</span></li>}
                    {person.email && <li className="flex justify-between"><span className="text-muted-foreground">Email</span> <span className="font-medium">{person.email}</span></li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TIMELINE */}
          {activeTab === 'Timeline' && (
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">Timeline</h2>
                <button onClick={() => setShowTimelineForm(true)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1"><Plus size={16}/> Add Timeline Event</button>
              </div>

              {timelineRecords.length === 0 ? (
                <div className="text-center p-12 bg-card border border-border rounded-xl shadow-sm space-y-4">
                  <Clock size={48} className="mx-auto text-primary/40" />
                  <h3 className="text-lg font-bold">Start recording important moments.</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">Add when you met, first trip, graduation, arguments, celebrations, or any milestone.</p>
                  <button onClick={() => setShowTimelineForm(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium mt-2">+ Add Timeline Event</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {timelineRecords.map(record => (
                    <div key={record._id} className="relative pl-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-[-24px] before:w-0.5 before:bg-border last:before:hidden">
                      <div className="absolute left-1 top-2 w-4 h-4 rounded-full bg-primary ring-4 ring-background"></div>
                      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                        <h4 className="font-bold mb-1">{record.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{record.description?.replace(/<[^>]*>?/gm, '')}</p>
                        <div className="flex gap-4 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(record.date).toLocaleDateString()}</span>
                          {record.mood && <span>Feeling: {record.mood}</span>}
                          {record.location && <span>Location: {record.location}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MEMORIES */}
          {activeTab === 'Memories' && (
            <RelationshipMemoriesTab 
              person={person} 
              records={records} 
              relationships={allRelationships} 
              loadData={() => loadData(person._id!)} 
            />
          )}

          {/* EVENTS */}
          {activeTab === 'Events' && (
            <RelationshipEventsTab 
              person={person} 
              records={records} 
              relationships={allRelationships} 
              loadData={() => loadData(person._id!)} 
            />
          )}

          {/* PHOTOS */}
          {activeTab === 'Photos' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">Photos</h2>
                <div className="flex gap-2">
                  <button onClick={handleUploadPhotos} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1"><Plus size={16}/> Upload Photos</button>
                </div>
              </div>

              {photos.length === 0 ? (
                <div className="text-center p-12 bg-card border border-border rounded-xl shadow-sm space-y-4 max-w-3xl mx-auto">
                  <ImageIcon size={48} className="mx-auto text-primary/40" />
                  <h3 className="text-lg font-bold">Save memorable pictures together.</h3>
                  <button onClick={handleUploadPhotos} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium mt-2">+ Upload Photos</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo, i) => (
                    <div key={i} className="aspect-square bg-accent rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow relative group">
                      <img src={normalizeUrl(photo)} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                         <div className="flex gap-2 justify-center mb-auto pt-2">
                           <button onClick={() => updateProfilePicture(photo)} className="px-2 py-1 bg-primary/80 hover:bg-primary text-white text-xs rounded font-medium">Set Profile</button>
                         </div>
                         <div className="flex gap-2 justify-between items-center text-white">
                            <span className="text-xs truncate max-w-[100px]">{photo.split(/[/\\]/).pop()}</span>
                            <div className="flex gap-1">
                              {['Memory', 'Event'].includes(findMemoryByAttachment(photo)?.type || '') && (
                                <button onClick={() => handleGoToMemory(photo)} className="p-1.5 bg-white/20 rounded hover:bg-white/40" title="Go to Memory"><Folder size={14}/></button>
                              )}
                              <button onClick={() => setViewingPhoto(photo)} className="p-1.5 bg-white/20 rounded hover:bg-white/40"><Eye size={14}/></button>
                              <a href={normalizeUrl(photo)} download target="_blank" rel="noreferrer" className="p-1.5 bg-white/20 rounded hover:bg-white/40 flex items-center"><Download size={14}/></a>
                              <button onClick={() => removeAttachment(photo)} className="p-1.5 bg-destructive/80 rounded hover:bg-destructive"><Trash2 size={14}/></button>
                            </div>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIDEO */}
          {activeTab === 'Video' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">Video</h2>
                <div className="flex gap-2">
                  <button onClick={() => { setFormState({type: 'Video'}); setShowMemoryForm(true); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1"><Plus size={16}/> Upload Video</button>
                </div>
              </div>

              {video.length === 0 ? (
                <div className="text-center p-12 bg-card border border-border rounded-xl shadow-sm space-y-4 max-w-3xl mx-auto">
                  <Video size={48} className="mx-auto text-primary/40" />
                  <h3 className="text-lg font-bold">Save video memories together.</h3>
                  <button onClick={() => { setFormState({type: 'Video'}); setShowMemoryForm(true); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium mt-2">+ Upload Video</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {video.map((vid, i) => (
                    <div key={i} className="bg-black rounded-xl overflow-hidden border border-border shadow-sm group">
                      <video src={getSafeMediaUrl(vid)} controls className="w-full h-auto max-h-[300px] object-contain" />
                      <div className="p-3 bg-card border-t border-border flex justify-between items-center">
                         <span className="text-xs truncate max-w-[150px]">{vid.split(/[/\\]/).pop()}</span>
                         <div className="flex gap-1">
                            {['Memory', 'Event'].includes(findMemoryByAttachment(vid)?.type || '') && (
                              <button onClick={() => handleGoToMemory(vid)} className="p-1.5 bg-accent rounded hover:bg-muted" title="Go to Memory"><Folder size={14}/></button>
                            )}
                            <a href={normalizeUrl(vid)} download target="_blank" rel="noreferrer" className="p-1.5 bg-accent rounded hover:bg-muted"><Download size={14}/></a>
                            <button onClick={() => removeAttachment(vid)} className="p-1.5 bg-destructive/10 text-destructive rounded hover:bg-destructive hover:text-white"><Trash2 size={14}/></button>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AUDIO */}
          {activeTab === 'Audio' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">Audio</h2>
                <div className="flex gap-2">
                  <button onClick={() => { setFormState({type: 'Audio'}); setShowMemoryForm(true); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1"><Plus size={16}/> Upload Audio</button>
                </div>
              </div>

              {audio.length === 0 ? (
                <div className="text-center p-12 bg-card border border-border rounded-xl shadow-sm space-y-4 max-w-3xl mx-auto">
                  <Music size={48} className="mx-auto text-primary/40" />
                  <h3 className="text-lg font-bold">Save voice notes and audio memories.</h3>
                  <button onClick={() => { setFormState({type: 'Audio'}); setShowMemoryForm(true); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium mt-2">+ Upload Audio</button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {audio.map((aud, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-accent rounded-xl border border-border">
                      <Music size={24} className="text-blue-500 shrink-0"/>
                      <div className="flex-1 min-w-0">
                         <span className="text-sm font-bold truncate block">{aud.split(/[/\\]/).pop()}</span>
                         <audio src={getSafeMediaUrl(aud)} controls className="w-full mt-2 h-10" />
                      </div>
                      <div className="flex gap-1 ml-4 shrink-0 flex-col sm:flex-row">
                         {['Memory', 'Event'].includes(findMemoryByAttachment(aud)?.type || '') && (
                           <button onClick={() => handleGoToMemory(aud)} className="p-2 bg-background rounded hover:bg-muted text-muted-foreground" title="Go to Memory"><Folder size={16}/></button>
                         )}
                         <a href={normalizeUrl(aud)} download target="_blank" rel="noreferrer" className="p-2 bg-background rounded hover:bg-muted text-muted-foreground"><Download size={16}/></a>
                         <button onClick={() => removeAttachment(aud)} className="p-2 bg-destructive/10 rounded hover:bg-destructive text-destructive hover:text-white"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI INSIGHTS */}
          {activeTab === 'AI Insights' && (
            <div className="max-w-3xl mx-auto">
              {!aiInsights && !isGenerating ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={32} />
                  </div>
                  <h2 className="text-xl font-bold">Generate Relationship Insights</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Kiseki can analyze your timeline, memories, and notes to provide unique insights into your relationship with {person.name}, completely privately on your device.
                  </p>
                  <button onClick={generateInsights} className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 mt-4">
                    Generate Now
                  </button>
                </div>
              ) : isGenerating ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4 animate-pulse">
                  <Sparkles size={32} className="mx-auto text-primary animate-bounce" />
                  <p className="text-lg font-medium">Analyzing relationship patterns...</p>
                  <p className="text-sm text-muted-foreground">This happens entirely on your local machine.</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-primary"/> AI Insights</h2>
                    <button onClick={generateInsights} className="text-sm text-primary hover:underline">Regenerate</button>
                  </div>
                  <div className="prose dark:prose-invert max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>{aiInsights}</Markdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NOTES */}
          {activeTab === 'Notes' && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">Private Notes</h2>
                <button onClick={() => { setFormState({}); setEditNoteId(null); setShowNoteForm(true); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1"><Plus size={16}/> New Note</button>
              </div>

              {sortedNotes.length === 0 ? (
                <div className="text-center p-12 bg-card border border-border rounded-xl shadow-sm space-y-4">
                  <FileText size={48} className="mx-auto text-primary/40" />
                  <h3 className="text-lg font-bold">Private notes about this person.</h3>
                  <p className="text-sm text-muted-foreground">Keep track of preferences, gift ideas, or anything else.</p>
                  <button onClick={() => { setFormState({}); setEditNoteId(null); setShowNoteForm(true); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium mt-2">+ New Note</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedNotes.map(note => (
                    <div key={note._id} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-5 shadow-sm relative group">
                      {note.isPinned && <Pin size={14} className="absolute top-4 right-4 text-amber-600 fill-amber-600" />}
                      <p className="whitespace-pre-wrap text-sm mb-6 mt-2">{note.content}</p>
                      
                      <div className="absolute bottom-4 left-5 right-4 flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Created: {new Date(note.createdAt).toLocaleDateString()}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => togglePinNote(note._id)} className="p-1 hover:bg-accent rounded text-muted-foreground"><Pin size={12}/></button>
                          <button onClick={() => { setFormState({content: note.content}); setEditNoteId(note._id); setShowNoteForm(true); }} className="p-1 hover:bg-accent rounded text-muted-foreground"><Edit2 size={12}/></button>
                          <button onClick={() => deleteNote(note._id)} className="p-1 hover:bg-destructive/10 text-destructive rounded"><Trash2 size={12}/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-destructive/20 rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border bg-destructive/10">
              <h2 className="text-xl font-bold text-destructive">Delete Person</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-medium">Are you sure you want to delete {person.name}?</p>
              <p className="text-sm text-muted-foreground mb-4">This will permanently delete:</p>
              
              <div className="space-y-2 text-sm font-medium">
                <label className="flex items-center gap-2"><input type="checkbox" checked={deleteOptions.profile} onChange={e => setDeleteOptions({...deleteOptions, profile: e.target.checked})} className="rounded text-primary"/> Person Profile</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={deleteOptions.timeline} onChange={e => setDeleteOptions({...deleteOptions, timeline: e.target.checked})} className="rounded text-primary"/> Relationship Timeline</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={deleteOptions.notes} onChange={e => setDeleteOptions({...deleteOptions, notes: e.target.checked})} className="rounded text-primary"/> Relationship Notes</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={deleteOptions.events} onChange={e => setDeleteOptions({...deleteOptions, events: e.target.checked})} className="rounded text-primary"/> Relationship Events</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={deleteOptions.memories} onChange={e => setDeleteOptions({...deleteOptions, memories: e.target.checked})} className="rounded text-primary"/> Manual Memories linked only to this person</label>
              </div>
              <p className="text-xs text-muted-foreground mt-4 italic">Photos and generic records will NOT be deleted unless they exist only inside this profile.</p>
            </div>
            <div className="px-6 py-4 border-t border-border bg-card/50 flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-md font-medium text-muted-foreground hover:bg-accent">Cancel</button>
              <button onClick={handleDeletePerson} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md font-medium hover:bg-destructive/90">Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Event Modal */}
      {showTimelineForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center"><h2 className="text-xl font-bold">Add Timeline Event</h2></div>
            <form onSubmit={e => handleSaveRecord(e, 'Timeline Event')} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Title *</label><input required type="text" value={formState.title || ''} onChange={e => setFormState({...formState, title: e.target.value})} className="w-full p-2 rounded border border-border bg-background focus:ring-2 outline-none" placeholder="First Met, Vacation, etc."/></div>
              <div><label className="block text-sm font-medium mb-1">Date *</label><input required type="date" value={formState.date ? new Date(formState.date).toISOString().slice(0,10) : ''} onChange={e => setFormState({...formState, date: new Date(e.target.value).toISOString()})} className="w-full p-2 rounded border border-border bg-background outline-none"/></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={formState.description || ''} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full p-2 h-24 rounded border border-border bg-background outline-none"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Location</label><input type="text" value={formState.location || ''} onChange={e => setFormState({...formState, location: e.target.value})} className="w-full p-2 rounded border border-border bg-background"/></div>
                <div><label className="block text-sm font-medium mb-1">Emotion</label><input type="text" value={formState.emotion || ''} onChange={e => setFormState({...formState, emotion: e.target.value})} className="w-full p-2 rounded border border-border bg-background"/></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setShowTimelineForm(false)} className="px-4 py-2 text-muted-foreground hover:bg-accent rounded font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Memory Modal */}
      {showMemoryForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center"><h2 className="text-xl font-bold">Add Memory</h2></div>
            <form onSubmit={e => handleSaveRecord(e, formState.type || 'Journal')} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Memory Type</label>
                <div className="flex flex-wrap gap-2">
                  {['Journal', 'Audio', 'Video', 'Photo', 'Document', 'Link'].map(t => (
                    <label key={t} className="flex items-center gap-1 text-sm bg-accent px-3 py-1.5 rounded cursor-pointer border border-border has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
                      <input type="radio" name="memType" value={t} className="hidden" checked={(formState.type || 'Journal') === t} onChange={e => setFormState({...formState, type: e.target.value})} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Title *</label><input required type="text" value={formState.title || ''} onChange={e => setFormState({...formState, title: e.target.value})} className="w-full p-2 rounded border border-border bg-background focus:ring-2 outline-none"/></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={formState.description || ''} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full p-2 h-24 rounded border border-border bg-background outline-none"/></div>
              <div>
                <label className="block text-sm font-medium mb-1">Attach Files</label>
                {formState.attachments && formState.attachments.map((a:string, i:number) => <div key={i} className="text-xs bg-accent p-1 mb-1 truncate">{a}</div>)}
                <button type="button" onClick={handleAttachFile} className="text-sm px-3 py-1.5 bg-secondary text-secondary-foreground rounded mt-1">Upload File...</button>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setShowMemoryForm(false)} className="px-4 py-2 text-muted-foreground hover:bg-accent rounded font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center"><h2 className="text-xl font-bold">Add Event</h2></div>
            <form onSubmit={e => handleSaveRecord(e, 'Event')} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Event Title *</label><input required type="text" value={formState.title || ''} onChange={e => setFormState({...formState, title: e.target.value})} className="w-full p-2 rounded border border-border bg-background focus:ring-2 outline-none" placeholder="Birthday, Meeting, etc."/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Date *</label><input required type="date" value={formState.date ? new Date(formState.date).toISOString().slice(0,10) : ''} onChange={e => setFormState({...formState, date: new Date(e.target.value).toISOString()})} className="w-full p-2 rounded border border-border bg-background outline-none"/></div>
                <div><label className="block text-sm font-medium mb-1">Type</label><select value={formState.eventType || 'Meeting'} onChange={e => setFormState({...formState, eventType: e.target.value})} className="w-full p-2 rounded border border-border bg-background outline-none"><option>Birthday</option><option>Meeting</option><option>Trip</option><option>Anniversary</option></select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={formState.description || ''} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full p-2 h-20 rounded border border-border bg-background outline-none"/></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setShowEventForm(false)} className="px-4 py-2 text-muted-foreground hover:bg-accent rounded font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center"><h2 className="text-xl font-bold">{editNoteId ? 'Edit Note' : 'New Note'}</h2></div>
            <form onSubmit={saveNote} className="p-6 space-y-4">
              <div><textarea required value={formState.content || ''} onChange={e => setFormState({...formState, content: e.target.value})} className="w-full p-4 h-32 rounded border border-border bg-accent text-accent-foreground outline-none whitespace-pre-wrap" placeholder="Shopping ideas..."/></div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowNoteForm(false)} className="px-4 py-2 text-muted-foreground hover:bg-accent rounded font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium">Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Picture Manager */}
      {showProfilePicManager && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden text-center animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">{person.name}</h2>
              <div className="w-48 h-48 rounded-full bg-accent border-4 border-border mx-auto mb-8 overflow-hidden shadow-inner flex items-center justify-center">
                {person.profilePicture ? <img src={normalizeUrl(person.profilePicture)} className="w-full h-full object-cover"/> : <User size={64} className="text-muted-foreground"/>}
              </div>
              <div className="space-y-2">
                <button onClick={() => setShowChangePicture(true)} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary/90"><ImageIcon size={18}/> Change Picture</button>
                <button onClick={() => { if(person.profilePicture) { setCropPictureSrc(person.profilePicture); setShowProfilePicManager(false); } }} className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/80 flex items-center justify-center gap-2"><Edit2 size={18}/> Crop Picture</button>
                <button onClick={() => { if(person.profilePicture) setViewingPhoto(person.profilePicture); setShowProfilePicManager(false); }} className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/80 flex items-center justify-center gap-2"><Eye size={18}/> View Full Size</button>
                <button onClick={() => { setActiveTab('Photos'); setShowProfilePicManager(false); }} className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/80 flex items-center justify-center gap-2"><ImageIcon size={18}/> Open Photo Gallery</button>
                <button className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/80 flex items-center justify-center gap-2 text-yellow-500"><Heart size={18}/> Set Favorite Photo</button>
                {person.profilePicture && <button onClick={() => updateProfilePicture('')} className="w-full py-2.5 bg-destructive/10 text-destructive rounded-lg font-medium hover:bg-destructive/20 flex items-center justify-center gap-2 mt-4"><Trash2 size={18}/> Remove Picture</button>}
              </div>
            </div>
            <div className="p-4 bg-accent/30 border-t border-border">
              <button onClick={() => setShowProfilePicManager(false)} className="w-full py-2 text-muted-foreground hover:text-foreground font-medium">✕ Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Picture Modal */}
      {showChangePicture && (
        <div className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden text-center animate-in slide-in-from-bottom-4 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold">Choose Picture</h2>
              <button onClick={() => setShowChangePicture(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 space-y-3 text-sm font-medium">
              <button onClick={async () => {
                // @ts-ignore
                const res = await window.api.attachment.add()
                if (res.success && res.files && res.files.length > 0) updateProfilePicture(res.files[0].filePath)
              }} className="w-full py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 flex items-center justify-center gap-2"><ArrowLeft size={16} className="rotate-90"/> Upload from Computer</button>
              <button onClick={() => { setActiveTab('Memories'); setShowChangePicture(false); setShowProfilePicManager(false); }} className="w-full py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 flex items-center justify-center gap-2"><FileText size={16}/> Choose from Existing Memories</button>
              <button onClick={() => { setActiveTab('Photos'); setShowChangePicture(false); setShowProfilePicManager(false); }} className="w-full py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 flex items-center justify-center gap-2"><ImageIcon size={16}/> Choose from Existing Photos</button>
              <div className="w-full py-6 bg-background border-2 border-dashed border-border rounded-lg text-muted-foreground mt-4 cursor-pointer hover:bg-accent/30 transition-colors">
                <ImageIcon size={24} className="mx-auto mb-2 opacity-50" />
                Drag & Drop Image
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col">
          <div className="p-4 flex justify-between items-center text-white bg-gradient-to-b from-black/50 to-transparent">
            <span className="font-medium text-sm opacity-70">{viewingPhoto.split(/[/\\]/).pop()}</span>
            <div className="flex gap-4">
              <a href={normalizeUrl(viewingPhoto)} download target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><Download size={20}/></a>
              <button onClick={() => setViewingPhoto(null)} className="hover:text-destructive transition-colors"><ArrowLeft size={20} className="rotate-45" /></button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
            <img src={normalizeUrl(viewingPhoto)} className="max-w-full max-h-full object-contain" />
          </div>
        </div>
      )}

      {/* Crop Picture Modal */}
      {cropPictureSrc && (
        <div className="fixed inset-0 z-[70] bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden text-center animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold">Crop Picture</h2>
              <button onClick={() => setCropPictureSrc(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 bg-accent/20 flex items-center justify-center overflow-auto max-h-[60vh]">
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                aspect={1}
                circularCrop
              >
                <img 
                  ref={imageRef} 
                  src={normalizeUrl(cropPictureSrc)} 
                  onLoad={(e) => {
                    const { width, height } = e.currentTarget
                    const initialCrop = centerCrop(
                      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
                      width,
                      height
                    )
                    setCrop(initialCrop)
                  }}
                  crossOrigin="anonymous" 
                />
              </ReactCrop>
            </div>
            <div className="p-4 bg-accent/30 border-t border-border flex justify-end gap-3">
              <button onClick={() => setCropPictureSrc(null)} className="px-4 py-2 rounded-md font-medium text-muted-foreground hover:bg-accent">Cancel</button>
              <button onClick={async () => {
                if (!imageRef.current || !crop || crop.width === 0 || crop.height === 0) return
                
                const canvas = document.createElement('canvas')
                const scaleX = imageRef.current.naturalWidth / imageRef.current.width
                const scaleY = imageRef.current.naturalHeight / imageRef.current.height
                canvas.width = crop.width * scaleX
                canvas.height = crop.height * scaleY
                const ctx = canvas.getContext('2d')
                if (!ctx) return
                
                ctx.drawImage(
                  imageRef.current,
                  crop.x * scaleX,
                  crop.y * scaleY,
                  crop.width * scaleX,
                  crop.height * scaleY,
                  0,
                  0,
                  crop.width * scaleX,
                  crop.height * scaleY
                )
                
                const base64Image = canvas.toDataURL('image/jpeg', 0.9)
                try {
                  // @ts-ignore
                  const result = await window.api.attachment.saveBase64(base64Image)
                  if (result.success) {
                    updateProfilePicture(result.filePath)
                    setCropPictureSrc(null)
                  } else {
                    console.error("Failed to save crop:", result.error)
                  }
                } catch(e) { console.error(e) }
              }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90">Save Crop</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={saveEditPerson} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="flex items-center gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input type="text" required value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nickname</label>
                      <input type="text" value={editForm.nickname || ''} onChange={e => setEditForm({...editForm, nickname: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Gender</label>
                      <input type="text" value={editForm.gender || ''} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Relationship Type</label>
                  <select value={editForm.relationshipType || 'Friend'} onChange={e => setEditForm({...editForm, relationshipType: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background">
                    {relTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Relationship Started</label>
                  <input type="date" value={editForm.relationshipStarted || ''} onChange={e => setEditForm({...editForm, relationshipStarted: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Birthday</label><input type="date" value={editForm.birthday || ''} onChange={e => setEditForm({...editForm, birthday: e.target.value})} className="w-full p-2 rounded border border-border bg-background" /></div>
                <div><label className="block text-sm font-medium mb-1">Occupation</label><input type="text" value={editForm.occupation || ''} onChange={e => setEditForm({...editForm, occupation: e.target.value})} className="w-full p-2 rounded border border-border bg-background" /></div>
                <div><label className="block text-sm font-medium mb-1">Phone</label><input type="tel" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full p-2 rounded border border-border bg-background" /></div>
                <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full p-2 rounded border border-border bg-background" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Address / Location</label><input type="text" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full p-2 rounded border border-border bg-background" /></div>
              </div>

              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea value={editForm.bio || ''} onChange={e => setEditForm({...editForm, bio: e.target.value})} className="w-full p-2 h-24 rounded-md border border-border bg-background outline-none whitespace-pre-wrap placeholder:text-muted-foreground" />
              </div>
              
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium mb-2">Social Links</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['instagram', 'facebook', 'linkedin', 'twitter'].map(platform => (
                    <div key={platform} className="flex items-center">
                      <span className="w-24 text-xs capitalize text-muted-foreground">{platform}</span>
                      <input type="text" value={editForm.socialLinks?.[platform as keyof typeof editForm.socialLinks] || ''} onChange={e => setEditForm({...editForm, socialLinks: {...(editForm.socialLinks || {}), [platform]: e.target.value}})} className="flex-1 p-1.5 text-sm rounded border border-border bg-background" />
                    </div>
                  ))}
                </div>
              </div>
            </form>
            
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-accent/30">
              <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-md font-medium text-muted-foreground hover:bg-accent">Cancel</button>
              <button onClick={saveEditPerson} className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 shadow-sm">Save Changes</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
