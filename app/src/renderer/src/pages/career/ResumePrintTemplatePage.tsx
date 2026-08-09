import { useEffect, useState } from 'react'
import ResumePrintTemplate from '../../components/ResumeEditor/ResumePrintTemplate'
import { EducationRecord, JobRecord, SkillRecord, ProjectRecord } from '../../types'

interface ResumeData {
  profile: any
  professionalTitle: string
  summary: string
  jobs: JobRecord[]
  education: EducationRecord[]
  skills: SkillRecord[]
  projects: ProjectRecord[]
  accentColor: string
  headingFont: string
  bodyFont: string
}

export default function ResumePrintTemplatePage() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [fontsReady, setFontsReady] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)

  useEffect(() => {
    // Wait for fonts to be ready
    document.fonts.ready.then(() => {
      setFontsReady(true)
    })
  }, [])

  useEffect(() => {
    // Listen for resume data from main process
    const listener = (_: any, data: ResumeData) => {
      setResumeData(data)
    }
    
    // @ts-ignore
    window.api.ipcRenderer?.on('resume-data', listener)
    
    return () => {
      // @ts-ignore
      window.api.ipcRenderer?.removeListener('resume-data', listener)
    }
  }, [])

  useEffect(() => {
    if (resumeData && fontsReady) {
      // Wait for images to load
      const imagePromises: Promise<void>[] = []
      
      // Check profile image
      if (resumeData.profile?.photoPath) {
        const img = new Image()
        const promise = new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve() // Resolve even on error to not block export
          img.src = resumeData.profile.photoPath
        })
        imagePromises.push(promise)
      }
      
      Promise.all(imagePromises).then(() => {
        setImagesLoaded(true)
      })
    }
  }, [resumeData, fontsReady])

  useEffect(() => {
    // Signal to main process that resume is ready for PDF generation
    if (resumeData && fontsReady && imagesLoaded) {
      // @ts-ignore
      window.__resumeReady = true
    }
  }, [resumeData, fontsReady, imagesLoaded])

  if (!resumeData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8 print:p-0 print:bg-white print:min-h-0 print:block">
      <ResumePrintTemplate
        profile={resumeData.profile}
        professionalTitle={resumeData.professionalTitle}
        summary={resumeData.summary}
        jobs={resumeData.jobs}
        education={resumeData.education}
        skills={resumeData.skills}
        projects={resumeData.projects}
        accentColor={resumeData.accentColor}
        headingFont={resumeData.headingFont}
        bodyFont={resumeData.bodyFont}
      />
    </div>
  )
}
