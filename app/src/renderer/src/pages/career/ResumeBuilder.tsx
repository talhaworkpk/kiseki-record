import { useState, useEffect } from 'react'
import { FileText, ZoomIn, ZoomOut, RotateCcw, Settings, Plus, Trash2, ChevronUp, ChevronDown, Copy, Sparkles, Undo, Redo, Printer, RefreshCw } from 'lucide-react'
import TipTapEditor from '../../components/ResumeEditor/TipTapEditor'
import RecordSelector from '../../components/ResumeEditor/RecordSelector'
import { EducationRecord, JobRecord, SkillRecord, ProjectRecord } from '../../types'
import { logError, logInfo } from '../../utils/logger'
import { useUserProfile } from '../../hooks/useUserProfile'
import ProfileImageEditor from '../../components/ResumeEditor/ProfileImageEditor'

interface ResumeSection {
  id: string
  title: string
  isVisible: boolean
}

export default function ResumeBuilder() {
  const [education, setEducation] = useState<EducationRecord[]>([])
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [skills, setSkills] = useState<SkillRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const { profile } = useUserProfile()
  
  // Selected records for each section
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [selectedEducation, setSelectedEducation] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  
  // Section visibility
  const [sections] = useState<Record<string, ResumeSection>>({
    header: { id: 'header', title: 'Header', isVisible: true },
    summary: { id: 'summary', title: 'Summary', isVisible: true },
    experience: { id: 'experience', title: 'Experience', isVisible: true },
    education: { id: 'education', title: 'Education', isVisible: true },
    skills: { id: 'skills', title: 'Skills', isVisible: true },
    projects: { id: 'projects', title: 'Projects', isVisible: true },
  })
  
  // Editable content
  const [summary, setSummary] = useState('')
  const [professionalTitle, setProfessionalTitle] = useState('Professional Title')
  
  // Local editable copies of records
  const [editableJobs, setEditableJobs] = useState<JobRecord[]>([])
  const [editableEducation, setEditableEducation] = useState<EducationRecord[]>([])
  const [editableSkills, setEditableSkills] = useState<SkillRecord[]>([])
  const [editableProjects, setEditableProjects] = useState<ProjectRecord[]>([])
  
  // Save dialog state
  const [saveDialog, setSaveDialog] = useState<{ recordId: string; recordType: string; changes: any } | null>(null)
  
  // Sync confirmation state
  const [syncDialog, setSyncDialog] = useState<{ sectionType: string } | null>(null)
  
  // Reset confirmation state
  const [resetDialog, setResetDialog] = useState<{ sectionType: string } | null>(null)
  
  // AI menu state
  const [aiMenuOpen, setAiMenuOpen] = useState<{ recordId: string; recordType: string } | null>(null)
  
  // PDF preview state
  const [pdfPreview, setPdfPreview] = useState<{ url: string; size: number } | null>(null)
  const [pdfZoom, setPdfZoom] = useState(1)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  
  // Error dialog state
  const [errorDialog, setErrorDialog] = useState<{ message: string; stack?: string; logs?: string } | null>(null)
  
  // Page controls
  const [zoom, setZoom] = useState(100)
  const [showSettings, setShowSettings] = useState(false)
  
  // Theme
  const [accentColor, setAccentColor] = useState('#000000')
  const [headingFont, setHeadingFont] = useState('Arial')
  const [bodyFont, setBodyFont] = useState('Arial')

  const loadData = async () => {
    try {
      // @ts-ignore
      const edu = await window.api.db.find('education', {})
      // @ts-ignore
      const car = await window.api.db.find('career', {})
      // @ts-ignore
      const ski = await window.api.db.find('skills', {})
      // @ts-ignore
      const pro = await window.api.db.find('projects', {})

      setEducation(edu.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()))
      setJobs(car.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()))
      setSkills(ski.sort((a: any, b: any) => b.level - a.level))
      setProjects(pro.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()))
      
      // Create editable copies
      setEditableJobs(JSON.parse(JSON.stringify(car)))
      setEditableEducation(JSON.parse(JSON.stringify(edu)))
      setEditableSkills(JSON.parse(JSON.stringify(ski)))
      setEditableProjects(JSON.parse(JSON.stringify(pro)))
      
      // Select all by default
      setSelectedJobs(car.map((j: any) => j._id))
      setSelectedEducation(edu.map((e: any) => e._id))
      setSelectedSkills(ski.map((s: any) => s._id))
      setSelectedProjects(pro.map((p: any) => p._id))
    } catch (err) {
      console.error('Failed to load data for resume', err)
    }
  }

  useEffect(() => {
    loadData()
    
    // Listen for error messages from main process
    const handleError = (_: any, errorData: any) => {
      logError(errorData.source, errorData.message, { stack: errorData.stack })
    }
    
    // @ts-ignore
    window.api.ipcRenderer?.on('log-error', handleError)
    
    return () => {
      // @ts-ignore
      window.api.ipcRenderer?.removeListener('log-error', handleError)
    }
  }, [])

  const handlePrint = async () => {
    logInfo('ResumeBuilder', 'Export button clicked')
    try {
      // Prepare resume data for export
      const resumeData = {
        profile,
        professionalTitle,
        summary,
        jobs: editableJobs.filter((job) => selectedJobs.includes(job._id!)),
        education: editableEducation.filter((edu) => selectedEducation.includes(edu._id!)),
        skills: editableSkills.filter((skill) => selectedSkills.includes(skill._id!)),
        projects: editableProjects.filter((proj) => selectedProjects.includes(proj._id!)),
        accentColor,
        headingFont,
        bodyFont
      }
      
      logInfo('ResumeBuilder', 'Sending resume data to IPC')
      
      // @ts-ignore
      const pdfBuffer = await window.api.export.pdf(resumeData)
      logInfo('ResumeBuilder', `PDF buffer received, size: ${pdfBuffer.length}`)
      
      // Convert buffer to base64 data URL for more reliable iframe loading
      const uint8Array = new Uint8Array(pdfBuffer)
      let binary = ''
      const len = uint8Array.byteLength
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i])
      }
      const base64 = btoa(binary)
      const dataUrl = `data:application/pdf;base64,${base64}`
      setPdfPreview({ url: dataUrl })
      logInfo('ResumeBuilder', 'PDF preview set successfully')
    } catch (err: any) {
      logError('ResumeBuilder', 'Failed to export PDF', err)
      
      // Get export logs for detailed error information
      // @ts-ignore
      const exportLogs = await window.api.export.getLogs()
      
      setErrorDialog({
        message: err?.message || 'Unknown error occurred',
        stack: err?.stack,
        logs: exportLogs
      })
    }
  }
  
  const handleDownloadPdf = () => {
    if (pdfPreview) {
      // Convert data URL back to blob for download
      const base64Data = pdfPreview.url.split(',')[1]
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      a.click()
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100)
    }
  }
  
  const handleClosePreview = () => {
    if (pdfPreview) {
      URL.revokeObjectURL(pdfPreview.url)
      setPdfPreview(null)
    }
  }
  
  const handleAddRecord = (type: string) => {
    const newId = Date.now().toString()
    if (type === 'experience') {
      const newJob: JobRecord = {
        _id: newId,
        position: '',
        company: '',
        employmentType: 'Full-time',
        startDate: new Date().toISOString(),
        isCurrent: true,
        responsibilities: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      setEditableJobs([...editableJobs, newJob])
      setSelectedJobs([...selectedJobs, newId])
    } else if (type === 'education') {
      const newEdu: EducationRecord = {
        _id: newId,
        school: '',
        degree: '',
        field: '',
        startDate: new Date().toISOString(),
        status: 'Current',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      setEditableEducation([...editableEducation, newEdu])
      setSelectedEducation([...selectedEducation, newId])
    } else if (type === 'skills') {
      const newSkill: SkillRecord = {
        _id: newId,
        name: '',
        level: 3,
        yearsOfExperience: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      setEditableSkills([...editableSkills, newSkill])
      setSelectedSkills([...selectedSkills, newId])
    } else if (type === 'projects') {
      const newProject: ProjectRecord = {
        _id: newId,
        title: '',
        description: '',
        status: 'Active',
        startDate: new Date().toISOString(),
        technologies: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      setEditableProjects([...editableProjects, newProject])
      setSelectedProjects([...selectedProjects, newId])
    }
  }
  
  const handleMoveRecord = (type: string, index: number, direction: 'up' | 'down') => {
    const moveArray = (arr: any[], idx: number, dir: 'up' | 'down') => {
      const newArr = [...arr]
      if (dir === 'up' && idx > 0) {
        [newArr[idx], newArr[idx - 1]] = [newArr[idx - 1], newArr[idx]]
      } else if (dir === 'down' && idx < arr.length - 1) {
        [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]]
      }
      return newArr
    }
    
    if (type === 'experience') {
      setEditableJobs(moveArray(editableJobs, index, direction))
    } else if (type === 'education') {
      setEditableEducation(moveArray(editableEducation, index, direction))
    } else if (type === 'skills') {
      setEditableSkills(moveArray(editableSkills, index, direction))
    } else if (type === 'projects') {
      setEditableProjects(moveArray(editableProjects, index, direction))
    }
  }
  
  const handleDeleteRecord = (type: string, id: string) => {
    if (type === 'experience') {
      setEditableJobs(editableJobs.filter(j => j._id !== id))
      setSelectedJobs(selectedJobs.filter(jId => jId !== id))
    } else if (type === 'education') {
      setEditableEducation(editableEducation.filter(e => e._id !== id))
      setSelectedEducation(selectedEducation.filter(eId => eId !== id))
    } else if (type === 'skills') {
      setEditableSkills(editableSkills.filter(s => s._id !== id))
      setSelectedSkills(selectedSkills.filter(sId => sId !== id))
    } else if (type === 'projects') {
      setEditableProjects(editableProjects.filter(p => p._id !== id))
      setSelectedProjects(selectedProjects.filter(pId => pId !== id))
    }
  }
  
  const handleDuplicateRecord = (type: string, record: any) => {
    const newId = Date.now().toString()
    const newRecord = { ...record, _id: newId, createdAt: Date.now(), updatedAt: Date.now() }
    
    if (type === 'experience') {
      setEditableJobs([...editableJobs, newRecord])
      setSelectedJobs([...selectedJobs, newId])
    } else if (type === 'education') {
      setEditableEducation([...editableEducation, newRecord])
      setSelectedEducation([...selectedEducation, newId])
    } else if (type === 'skills') {
      setEditableSkills([...editableSkills, newRecord])
      setSelectedSkills([...selectedSkills, newId])
    } else if (type === 'projects') {
      setEditableProjects([...editableProjects, newRecord])
      setSelectedProjects([...selectedProjects, newId])
    }
  }
  
  const handleSaveToOriginal = async () => {
    if (!saveDialog) return
    
    try {
      if (saveDialog.recordId === 'all') {
        // Handle bulk sync
        if (saveDialog.recordType === 'career') {
          for (const job of editableJobs) {
            if (job._id && job._id.length > 10) {
              // @ts-ignore
              await window.api.db.update('career', { _id: job._id }, job, {})
            }
          }
        }
      } else {
        // Handle single record update
        // @ts-ignore
        await window.api.db.update(saveDialog.recordType, { _id: saveDialog.recordId }, saveDialog.changes, {})
      }
      setSaveDialog(null)
      // Reload data to reflect changes
      loadData()
    } catch (err) {
      console.error('Failed to save to original:', err)
      setErrorDialog({
        message: err instanceof Error ? err.message : 'Failed to save to original record',
        stack: err instanceof Error ? err.stack : undefined
      })
    }
  }
  
  const handleCopyError = () => {
    if (errorDialog) {
      const text = `Error: ${errorDialog.message}\n\nStack:\n${errorDialog.stack || 'No stack trace available'}\n\nExport Logs:\n${errorDialog.logs || 'No export logs available'}`
      navigator.clipboard.writeText(text)
    }
  }
  
  const handleSaveErrorLog = () => {
    if (errorDialog) {
      const text = `Error: ${errorDialog.message}\n\nStack:\n${errorDialog.stack || 'No stack trace available'}\n\nExport Logs:\n${errorDialog.logs || 'No export logs available'}\n\nTimestamp: ${new Date().toISOString()}`
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `error-log-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror:not(.ProseMirror-focused) p.is-editor-empty:first-child::before {
          color: #9ca3af;
        }
      `}</style>
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText size={20} />
          Resume Builder
        </h2>
        
        <div className="flex items-center gap-4 print:hidden">
          <RecordSelector
            label="Experience"
            records={jobs.map(j => ({ ...j, title: j.position }))}
            selectedIds={selectedJobs}
            onSelectionChange={setSelectedJobs}
            onReorder={setJobs}
          />
          
          <RecordSelector
            label="Education"
            records={education.map(e => ({ ...e, title: `${e.degree} - ${e.school}` }))}
            selectedIds={selectedEducation}
            onSelectionChange={setSelectedEducation}
            onReorder={setEducation}
          />
          
          <RecordSelector
            label="Skills"
            records={skills.map(s => ({ ...s, title: s.name }))}
            selectedIds={selectedSkills}
            onSelectionChange={setSelectedSkills}
            onReorder={setSkills}
          />
          
          <RecordSelector
            label="Projects"
            records={projects.map(p => ({ ...p, title: p.title }))}
            selectedIds={selectedProjects}
            onSelectionChange={setSelectedProjects}
            onReorder={setProjects}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden print:hidden">
        {/* Toolbar */}
        <div className="border-b border-border p-4 flex items-center justify-between bg-card print:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-2 hover:bg-accent rounded" title="Zoom Out">
              <ZoomIn size={18} />
            </button>
            <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-2 hover:bg-accent rounded" title="Zoom In">
              <ZoomOut size={18} />
            </button>
            <div className="w-px h-6 bg-border mx-2" />
            <button className="p-2 hover:bg-accent rounded" title="Undo">
              <Undo size={18} />
            </button>
            <button className="p-2 hover:bg-accent rounded" title="Redo">
              <Redo size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-accent hover:bg-accent/80 rounded-md flex items-center gap-2"
            >
              <Settings size={18} />
              Settings
            </button>
            <button onClick={handlePrint} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2">
              <Printer size={18} />
              Export
            </button>
          </div>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="border-b border-border p-4 bg-accent print:hidden">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Accent Color</label>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-full h-10 rounded border border-border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Heading Font</label>
                <select
                  value={headingFont}
                  onChange={(e) => setHeadingFont(e.target.value)}
                  className="w-full h-10 rounded border border-border px-2"
                >
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Helvetica">Helvetica</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Body Font</label>
                <select
                  value={bodyFont}
                  onChange={(e) => setBodyFont(e.target.value)}
                  className="w-full h-10 rounded border border-border px-2"
                >
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Helvetica">Helvetica</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* Resume Preview Area */}
        <div className="flex-1 overflow-auto p-8 bg-gray-100 print:p-0 print:bg-white print:flex print:overflow-visible">
          <div 
            id="resume-content"
            className="max-w-[21cm] min-h-[29.7cm] mx-auto bg-white shadow-lg print:shadow-none print:m-0 print:w-full print:max-w-full transition-transform"
            style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top center',
              '--accent-color': accentColor,
              '--heading-font': headingFont,
              '--body-font': bodyFont
            } as React.CSSProperties}
          >

            {/* Header Section */}
            {sections.header?.isVisible && (
              <div className="mb-8 border-b-2 pb-6" style={{ borderColor: accentColor }}>
                <div className="p-6">
                  <div className="flex gap-6">
                    <ProfileImageEditor src={profile?.photoPath} />
                    <div className="flex-1">
                      <TipTapEditor
                        content={profile?.fullName || 'Your Name'}
                        onChange={() => {}}
                        placeholder="Click to enter your name..."
                      />
                      <TipTapEditor
                        content={professionalTitle}
                        onChange={setProfessionalTitle}
                        placeholder="Click to enter professional title..."
                      />
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                        <TipTapEditor
                          content={profile?.email || 'your.email@example.com'}
                          onChange={() => {}}
                          placeholder="Click to enter email..."
                        />
                        <TipTapEditor
                          content={profile?.phone || '+1 234 567 8900'}
                          onChange={() => {}}
                          placeholder="Click to enter phone number..."
                        />
                        <TipTapEditor
                          content={profile?.address || 'City, Country'}
                          onChange={() => {}}
                          placeholder="Click to enter address..."
                        />
                      </div>
                      {(profile?.linkedin || profile?.github || profile?.website) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                          {profile?.linkedin && <span>LinkedIn: {profile.linkedin}</span>}
                          {profile?.github && <span>GitHub: {profile.github}</span>}
                          {profile?.website && <span>Website: {profile.website}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Summary Section */}
            {sections.summary?.isVisible && (
              <div className="mb-8">
                <h2 className="text-xl font-bold uppercase tracking-wider mb-4" style={{ color: accentColor, fontFamily: headingFont }}>Summary</h2>
                <div className="p-4">
                  <TipTapEditor
                    content={summary}
                    onChange={setSummary}
                    placeholder="Click to enter professional summary..."
                  />
                </div>
              </div>
            )}

            {/* Experience Section */}
            {sections.experience?.isVisible && (
              <div className="mb-8 group/section">
                <div className="flex justify-between items-center mb-4 relative">
                  <h2 className="text-xl font-bold uppercase tracking-wider" style={{ color: accentColor, fontFamily: headingFont }}>Experience</h2>
                  <div className="absolute right-0 top-0 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200 print:hidden">
                    <div className="flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 p-1">
                      <button 
                        onClick={() => setSyncDialog({ sectionType: 'experience' })}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Sync with Kiseki Record"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button 
                        onClick={() => handleAddRecord('experience')}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Add New Record"
                      >
                        <Plus size={16} />
                      </button>
                      <button 
                        onClick={() => setResetDialog({ sectionType: 'experience' })}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Reset to Original"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Improve with AI"
                      >
                        <Sparkles size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {editableJobs.filter((job) => job._id && selectedJobs.includes(job._id)).map((job) => {
                    const filteredIndex = editableJobs.filter((j) => j._id && selectedJobs.includes(j._id)).findIndex((j) => j._id === job._id)
                    return (
                    <div key={job._id} className="border-l-2 pl-4 relative group hover:bg-gray-50 rounded-r-lg transition-colors duration-150" style={{ borderColor: accentColor }}>
                      <div className="absolute -right-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 print:hidden">
                        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-1 flex flex-col gap-1">
                          <button onClick={() => handleDuplicateRecord('experience', job)} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Copy">
                            <Copy size={14} />
                          </button>
                          <button onClick={() => handleMoveRecord('experience', filteredIndex, 'up')} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Move Up" disabled={filteredIndex === 0}>
                            <ChevronUp size={14} />
                          </button>
                          <button onClick={() => handleMoveRecord('experience', filteredIndex, 'down')} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Move Down" disabled={filteredIndex === editableJobs.filter((j) => j._id && selectedJobs.includes(j._id)).length - 1}>
                            <ChevronDown size={14} />
                          </button>
                          <button onClick={() => handleDeleteRecord('experience', job._id!)} className="p-2 text-gray-500 hover:text-red-500 rounded-md transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Improve with AI">
                            <Sparkles size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-baseline mb-1">
                        <TipTapEditor
                          content={job.position}
                          onChange={(content) => {
                            const updated = [...editableJobs]
                            const originalIndex = editableJobs.findIndex((j) => j._id === job._id)
                            updated[originalIndex] = { ...updated[originalIndex], position: content }
                            setEditableJobs(updated)
                          }}
                          placeholder="Click to enter position..."
                        />
                        <span className="text-sm font-bold text-gray-500">
                          {new Date(job.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })} - {job.isCurrent ? 'Present' : (job.endDate ? new Date(job.endDate).toLocaleDateString([], { month: 'short', year: 'numeric' }) : 'Present')}
                        </span>
                      </div>
                      <TipTapEditor
                        content={job.company}
                        onChange={(content) => {
                          const updated = [...editableJobs]
                          const originalIndex = editableJobs.findIndex((j) => j._id === job._id)
                          updated[originalIndex] = { ...updated[originalIndex], company: content }
                          setEditableJobs(updated)
                        }}
                        placeholder="Click to enter company name..."
                      />
                      
                      {job.responsibilities && job.responsibilities.length > 0 && (
                        <TipTapEditor
                          content={job.responsibilities.join('<br>')}
                          onChange={(content) => {
                            const updated = [...editableJobs]
                            const originalIndex = editableJobs.findIndex((j) => j._id === job._id)
                            updated[originalIndex] = { ...updated[originalIndex], responsibilities: content.split('<br>').filter(Boolean) }
                            setEditableJobs(updated)
                          }}
                          placeholder="Click to add a responsibility..."
                        />
                      )}
                    </div>
                    )})}
                </div>
              </div>
            )}

            {/* Education Section */}
            {sections.education?.isVisible && (
              <div className="mb-8 group/section">
                <div className="flex justify-between items-center mb-4 relative">
                  <h2 className="text-xl font-bold uppercase tracking-wider" style={{ color: accentColor, fontFamily: headingFont }}>Education</h2>
                  <div className="absolute right-0 top-0 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200 print:hidden">
                    <div className="flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 p-1">
                      <button 
                        onClick={() => {
                          const changes = editableEducation.filter(e => selectedEducation.includes(e._id!))
                          if (changes.length > 0) {
                            setSaveDialog({
                              recordId: 'all',
                              recordType: 'education',
                              changes: { $set: { education: changes } }
                            })
                          }
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Sync with Kiseki Record"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button 
                        onClick={() => handleAddRecord('education')}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Add New Record"
                      >
                        <Plus size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditableEducation(education)
                          loadData()
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Reset to Original"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Improve with AI"
                      >
                        <Sparkles size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {editableEducation.filter((edu) => edu._id && selectedEducation.includes(edu._id)).map((edu) => {
                    const filteredIndex = editableEducation.filter((e) => e._id && selectedEducation.includes(e._id)).findIndex((e) => e._id === edu._id)
                    return (
                    <div key={edu._id} className="border-l-2 pl-4 relative group hover:bg-gray-50 rounded-r-lg transition-colors duration-150" style={{ borderColor: accentColor }}>
                      <div className="absolute -right-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 print:hidden">
                        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-1 flex flex-col gap-1">
                          <button onClick={() => handleDuplicateRecord('education', edu)} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Copy">
                            <Copy size={14} />
                          </button>
                          <button onClick={() => handleMoveRecord('education', filteredIndex, 'up')} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Move Up" disabled={filteredIndex === 0}>
                            <ChevronUp size={14} />
                          </button>
                          <button onClick={() => handleMoveRecord('education', filteredIndex, 'down')} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Move Down" disabled={filteredIndex === editableEducation.filter((e) => e._id && selectedEducation.includes(e._id)).length - 1}>
                            <ChevronDown size={14} />
                          </button>
                          <button onClick={() => handleDeleteRecord('education', edu._id!)} className="p-2 text-gray-500 hover:text-red-500 rounded-md transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Improve with AI">
                            <Sparkles size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-baseline mb-1">
                        <TipTapEditor
                          content={edu.degree}
                          onChange={(content) => {
                            const updated = [...editableEducation]
                            const originalIndex = editableEducation.findIndex((e) => e._id === edu._id)
                            updated[originalIndex] = { ...updated[originalIndex], degree: content }
                            setEditableEducation(updated)
                          }}
                          placeholder="Click to enter degree..."
                        />
                        <span className="text-sm font-bold text-gray-500">
                          {edu.startDate ? new Date(edu.startDate).getFullYear() : ''} - {edu.status === 'Current' ? 'Present' : (edu.endDate ? new Date(edu.endDate).getFullYear() : '')}
                        </span>
                      </div>
                      <TipTapEditor
                        content={edu.school}
                        onChange={(content) => {
                          const updated = [...editableEducation]
                          const originalIndex = editableEducation.findIndex((e) => e._id === edu._id)
                          updated[originalIndex] = { ...updated[originalIndex], school: content }
                          setEditableEducation(updated)
                        }}
                        placeholder="Click to enter school name..."
                      />
                      {edu.field && (
                        <TipTapEditor
                          content={edu.field}
                          onChange={(content) => {
                            const updated = [...editableEducation]
                            const originalIndex = editableEducation.findIndex((e) => e._id === edu._id)
                            updated[originalIndex] = { ...updated[originalIndex], field: content }
                            setEditableEducation(updated)
                          }}
                          placeholder="Click to enter field of study..."
                        />
                      )}
                      {edu.grade && (
                        <TipTapEditor
                          content={edu.grade}
                          onChange={(content) => {
                            const updated = [...editableEducation]
                            const originalIndex = editableEducation.findIndex((e) => e._id === edu._id)
                            updated[originalIndex] = { ...updated[originalIndex], grade: content }
                            setEditableEducation(updated)
                          }}
                          placeholder="Grade / GPA (optional)"
                        />
                      )}
                    </div>
                    )})}
                </div>
              </div>
            )}

            {/* Projects Section */}
            {sections.projects?.isVisible && (
              <div className="mb-8 group/section">
                <div className="flex justify-between items-center mb-4 relative">
                  <h2 className="text-xl font-bold uppercase tracking-wider" style={{ color: accentColor, fontFamily: headingFont }}>Projects</h2>
                  <div className="absolute right-0 top-0 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200 print:hidden">
                    <div className="flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 p-1">
                      <button 
                        onClick={() => {
                          const changes = editableProjects.filter(p => selectedProjects.includes(p._id!))
                          if (changes.length > 0) {
                            setSaveDialog({
                              recordId: 'all',
                              recordType: 'projects',
                              changes: { $set: { projects: changes } }
                            })
                          }
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Sync with Kiseki Record"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button 
                        onClick={() => handleAddRecord('projects')}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Add New Record"
                      >
                        <Plus size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditableProjects(projects)
                          loadData()
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Reset to Original"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Improve with AI"
                      >
                        <Sparkles size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {editableProjects.filter((proj) => proj._id && selectedProjects.includes(proj._id)).map((proj) => {
                    const filteredIndex = editableProjects.filter((p) => p._id && selectedProjects.includes(p._id)).findIndex((p) => p._id === proj._id)
                    return (
                    <div key={proj._id} className="border-l-2 pl-4 relative group hover:bg-gray-50 rounded-r-lg transition-colors duration-150" style={{ borderColor: accentColor }}>
                      <div className="absolute -right-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 print:hidden">
                        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-1 flex flex-col gap-1">
                          <button onClick={() => handleDuplicateRecord('projects', proj)} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Copy">
                            <Copy size={14} />
                          </button>
                          <button onClick={() => handleMoveRecord('projects', filteredIndex, 'up')} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Move Up" disabled={filteredIndex === 0}>
                            <ChevronUp size={14} />
                          </button>
                          <button onClick={() => handleMoveRecord('projects', filteredIndex, 'down')} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Move Down" disabled={filteredIndex === editableProjects.filter((p) => p._id && selectedProjects.includes(p._id)).length - 1}>
                            <ChevronDown size={14} />
                          </button>
                          <button onClick={() => handleDeleteRecord('projects', proj._id!)} className="p-2 text-gray-500 hover:text-red-500 rounded-md transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Improve with AI">
                            <Sparkles size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-baseline mb-1">
                        <TipTapEditor
                          content={proj.title}
                          onChange={(content) => {
                            const updated = [...editableProjects]
                            const originalIndex = editableProjects.findIndex((p) => p._id === proj._id)
                            updated[originalIndex] = { ...updated[originalIndex], title: content }
                            setEditableProjects(updated)
                          }}
                          placeholder="Click to enter project title..."
                        />
                        <span className="text-sm font-bold text-gray-500">{new Date(proj.startDate).getFullYear()}</span>
                      </div>
                      <TipTapEditor
                        content={proj.description || ''}
                        onChange={(content) => {
                          const updated = [...editableProjects]
                          const originalIndex = editableProjects.findIndex((p) => p._id === proj._id)
                          updated[originalIndex] = { ...updated[originalIndex], description: content }
                          setEditableProjects(updated)
                        }}
                        placeholder="Click to enter project description..."
                      />
                      {proj.technologies && proj.technologies.length > 0 && (
                        <TipTapEditor
                          content={proj.technologies.join(', ')}
                          onChange={(content) => {
                            const updated = [...editableProjects]
                            const originalIndex = editableProjects.findIndex((p) => p._id === proj._id)
                            updated[originalIndex] = { ...updated[originalIndex], technologies: content.split(', ') }
                            setEditableProjects(updated)
                          }}
                          placeholder="Click to enter technologies..."
                        />
                      )}
                    </div>
                    )})}
                </div>
              </div>
            )}

            {/* Skills Section */}
            {sections.skills?.isVisible && (
              <div className="mb-8 group/section">
                <div className="flex justify-between items-center mb-4 relative">
                  <h2 className="text-xl font-bold uppercase tracking-wider" style={{ color: accentColor, fontFamily: headingFont }}>Skills</h2>
                  <div className="absolute right-0 top-0 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200 print:hidden">
                    <div className="flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 p-1">
                      <button 
                        onClick={() => {
                          const changes = editableSkills.filter(s => selectedSkills.includes(s._id!))
                          if (changes.length > 0) {
                            setSaveDialog({
                              recordId: 'all',
                              recordType: 'skills',
                              changes: { $set: { skills: changes } }
                            })
                          }
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Sync with Kiseki Record"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button 
                        onClick={() => handleAddRecord('skills')}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Add New Record"
                      >
                        <Plus size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditableSkills(skills)
                          loadData()
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Reset to Original"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                        title="Improve with AI"
                      >
                        <Sparkles size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-800" style={{ fontFamily: bodyFont }}>
                    {editableSkills.filter((skill) => skill._id && selectedSkills.includes(skill._id)).map((skill) => {
                      const filteredIndex = editableSkills.filter((s) => s._id && selectedSkills.includes(s._id)).findIndex((s) => s._id === skill._id)
                      return (
                      <div key={skill._id} className="relative group hover:bg-gray-50 px-2 py-1 rounded-md transition-colors duration-150">
                        <div className="absolute -right-8 -top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 print:hidden">
                          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-1 flex flex-col gap-1">
                            <button onClick={() => handleDuplicateRecord('skills', skill)} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Copy">
                              <Copy size={12} />
                            </button>
                            <button onClick={() => handleMoveRecord('skills', filteredIndex, 'up')} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Move Up" disabled={filteredIndex === 0}>
                              <ChevronUp size={12} />
                            </button>
                            <button onClick={() => handleMoveRecord('skills', filteredIndex, 'down')} className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Move Down" disabled={filteredIndex === editableSkills.filter((s) => s._id && selectedSkills.includes(s._id)).length - 1}>
                              <ChevronDown size={12} />
                            </button>
                            <button onClick={() => handleDeleteRecord('skills', skill._id!)} className="p-2 text-gray-500 hover:text-red-500 rounded-md transition-colors" title="Delete">
                              <Trash2 size={12} />
                            </button>
                            <button className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors" title="Improve with AI">
                              <Sparkles size={12} />
                            </button>
                          </div>
                        </div>
                        <TipTapEditor
                          content={skill.name}
                          onChange={(content) => {
                            const updated = [...editableSkills]
                            const originalIndex = editableSkills.findIndex((s) => s._id === skill._id)
                            updated[originalIndex] = { ...updated[originalIndex], name: content }
                            setEditableSkills(updated)
                          }}
                          placeholder="Click to enter skill..."
                        />
                      </div>
                      )})}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Error Dialog */}
      {errorDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-red-500">Export Failed</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Error:</label>
              <p className="text-sm bg-muted p-3 rounded font-mono">{errorDialog.message}</p>
            </div>
            {errorDialog.stack && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Stack:</label>
                <p className="text-xs bg-muted p-3 rounded font-mono max-h-40 overflow-auto">{errorDialog.stack}</p>
              </div>
            )}
            {errorDialog.logs && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Export Logs:</label>
                <p className="text-xs bg-muted p-3 rounded font-mono max-h-40 overflow-auto">{errorDialog.logs}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button 
                onClick={handleCopyError}
                className="px-4 py-2 bg-accent hover:bg-accent/80 rounded-md"
              >
                Copy Error
              </button>
              <button 
                onClick={handleSaveErrorLog}
                className="px-4 py-2 bg-accent hover:bg-accent/80 rounded-md"
              >
                Save Log
              </button>
              <button 
                onClick={() => setErrorDialog(null)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Save Dialog */}
      {saveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Save Changes</h2>
            <p className="text-sm mb-4">Where do you want to save these changes?</p>
            <div className="space-y-2 mb-4">
              <button 
                onClick={handleSaveToOriginal}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Update original record
              </button>
              <button 
                onClick={() => setSaveDialog(null)}
                className="w-full px-4 py-2 bg-accent hover:bg-accent/80 rounded-md"
              >
                Save only in this resume
              </button>
              <button 
                onClick={() => setSaveDialog(null)}
                className="w-full px-4 py-2 border border-border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sync Confirmation Dialog */}
      {syncDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Sync with Kiseki Record</h2>
            <p className="text-sm mb-4">Sync this section with Kiseki Record?</p>
            <p className="text-xs text-gray-500 mb-4">This will update the resume with the latest saved records.</p>
            <div className="space-y-2 mb-4">
              <button 
                onClick={() => {
                  // Handle sync logic
                  setSyncDialog(null)
                }}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Sync Now
              </button>
              <button 
                onClick={() => setSyncDialog(null)}
                className="w-full px-4 py-2 border border-border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reset Confirmation Dialog */}
      {resetDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Reset Section</h2>
            <p className="text-sm mb-4">Reset this section to the original Kiseki Record version?</p>
            <p className="text-xs text-gray-500 mb-4">This will remove resume-only edits for this section.</p>
            <div className="space-y-2 mb-4">
              <button 
                onClick={() => {
                  if (resetDialog.sectionType === 'experience') {
                    setEditableJobs(jobs)
                  } else if (resetDialog.sectionType === 'education') {
                    setEditableEducation(education)
                  } else if (resetDialog.sectionType === 'projects') {
                    setEditableProjects(projects)
                  } else if (resetDialog.sectionType === 'skills') {
                    setEditableSkills(skills)
                  }
                  loadData()
                  setResetDialog(null)
                }}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Reset
              </button>
              <button 
                onClick={() => setResetDialog(null)}
                className="w-full px-4 py-2 border border-border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Improvement Menu */}
      {aiMenuOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setAiMenuOpen(null)}>
          <div className="bg-background rounded-lg shadow-lg p-4 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Improve with AI</h3>
            <div className="space-y-1">
              <button className="w-full text-left px-4 py-2 hover:bg-accent rounded-md text-sm">Improve Writing</button>
              <button className="w-full text-left px-4 py-2 hover:bg-accent rounded-md text-sm">Make More Professional</button>
              <button className="w-full text-left px-4 py-2 hover:bg-accent rounded-md text-sm">Shorten</button>
              <button className="w-full text-left px-4 py-2 hover:bg-accent rounded-md text-sm">Expand</button>
              <button className="w-full text-left px-4 py-2 hover:bg-accent rounded-md text-sm">ATS Optimize</button>
              <button className="w-full text-left px-4 py-2 hover:bg-accent rounded-md text-sm">Fix Grammar</button>
              <button className="w-full text-left px-4 py-2 hover:bg-accent rounded-md text-sm">Rewrite</button>
              <button className="w-full text-left px-4 py-2 hover:bg-accent rounded-md text-sm">Generate Bullet Points</button>
            </div>
          </div>
        </div>
      )}
      
      {/* PDF Preview Dialog */}
      {pdfPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-5xl w-full mx-4 h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">PDF Preview</h2>
              <button onClick={handleClosePreview} className="p-2 hover:bg-accent rounded-md">
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <button 
                onClick={() => setPdfZoom(Math.max(0.5, pdfZoom - 0.25))}
                className="px-3 py-1 border border-border rounded-md hover:bg-accent text-sm"
                disabled={pdfZoom <= 0.5}
              >
                Zoom Out
              </button>
              <span className="text-sm font-medium w-16 text-center">{Math.round(pdfZoom * 100)}%</span>
              <button 
                onClick={() => setPdfZoom(Math.min(2, pdfZoom + 0.25))}
                className="px-3 py-1 border border-border rounded-md hover:bg-accent text-sm"
                disabled={pdfZoom >= 2}
              >
                Zoom In
              </button>
              <button 
                onClick={() => setPdfZoom(1)}
                className="px-3 py-1 border border-border rounded-md hover:bg-accent text-sm"
              >
                Reset
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 rounded-md flex items-center justify-center">
              <iframe 
                src={pdfPreview.url} 
                className="border-0"
                style={{ 
                  width: '794px',
                  height: '1123px',
                  transform: `scale(${pdfZoom})`,
                  transformOrigin: 'top center'
                }}
                title="PDF Preview" 
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={handleClosePreview} className="px-4 py-2 border border-border rounded-md hover:bg-accent">
                Back
              </button>
              <button onClick={handleDownloadPdf} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
