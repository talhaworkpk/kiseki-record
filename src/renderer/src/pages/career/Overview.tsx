import { useState, useEffect } from 'react'
import { GraduationCap, Briefcase, Sparkles, Award, FolderGit2, FileText, Clock } from 'lucide-react'
import { EducationRecord, JobRecord, SkillRecord, CertificateRecord, ProjectRecord } from '../../types'

export default function Overview() {
  const [education, setEducation] = useState<EducationRecord[]>([])
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [skills, setSkills] = useState<SkillRecord[]>([])
  const [certificates, setCertificates] = useState<CertificateRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])

  const loadData = async () => {
    try {
      // @ts-ignore
      setEducation(await window.api.db.find('education', {}))
      // @ts-ignore
      setJobs(await window.api.db.find('career', {}))
      // @ts-ignore
      setSkills(await window.api.db.find('skills', {}))
      // @ts-ignore
      setCertificates(await window.api.db.find('certificates', {}))
      // @ts-ignore
      setProjects(await window.api.db.find('projects', {}))
    } catch (error) {
      console.error('Failed to load career data', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const currentEducation = education.find(e => e.status === 'Current')
  const currentJob = jobs.find(j => j.isCurrent)

  // Calculate experience in years
  const calcExperience = () => {
    let totalMonths = 0
    jobs.forEach(job => {
      const start = new Date(job.startDate)
      const end = job.endDate ? new Date(job.endDate) : new Date()
      totalMonths += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    })
    const years = Math.floor(totalMonths / 12)
    return years > 0 ? `${years} Years` : `${totalMonths} Months`
  }

  return (
    <div className="h-full overflow-y-auto p-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <GraduationCap className="text-primary" /> 
          Overview Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Summary of your education and professional career.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Current Education */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform"><GraduationCap size={24}/></div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Education</span>
          </div>
          {currentEducation ? (
            <>
              <h3 className="text-xl font-bold line-clamp-2 leading-tight mb-2">{currentEducation.degree}</h3>
              <p className="text-muted-foreground">{currentEducation.school}</p>
              <p className="text-sm font-medium text-primary mt-4">{new Date(currentEducation.startDate).getFullYear()} - Present</p>
            </>
          ) : (
            <div className="text-muted-foreground h-full flex items-center pt-4">No current education recorded.</div>
          )}
        </div>

        {/* Current Occupation */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform"><Briefcase size={24}/></div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Occupation</span>
          </div>
          {currentJob ? (
            <>
              <h3 className="text-xl font-bold line-clamp-2 leading-tight mb-2">{currentJob.position}</h3>
              <p className="text-muted-foreground">{currentJob.company}</p>
              <p className="text-sm font-medium text-blue-500 mt-4">{currentJob.employmentType}</p>
            </>
          ) : (
            <div className="text-muted-foreground h-full flex items-center pt-4">No current occupation recorded.</div>
          )}
        </div>

        {/* Total Experience */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl group-hover:scale-110 transition-transform"><Clock size={24}/></div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Experience</span>
          </div>
          <div className="text-4xl font-bold mt-2">{calcExperience()}</div>
          <p className="text-muted-foreground text-sm mt-4">Total professional experience</p>
        </div>

        {/* Skills */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl group-hover:scale-110 transition-transform"><Sparkles size={24}/></div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills</span>
          </div>
          <div className="text-4xl font-bold mt-2">{skills.length}</div>
          <p className="text-muted-foreground text-sm mt-4">Documented skills</p>
        </div>

        {/* Certificates */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-500/10 text-green-500 rounded-xl group-hover:scale-110 transition-transform"><Award size={24}/></div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certificates</span>
          </div>
          <div className="text-4xl font-bold mt-2">{certificates.length}</div>
          <p className="text-muted-foreground text-sm mt-4">Earned certifications</p>
        </div>

        {/* Projects */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-pink-500/10 text-pink-500 rounded-xl group-hover:scale-110 transition-transform"><FolderGit2 size={24}/></div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects</span>
          </div>
          <div className="text-4xl font-bold mt-2">{projects.length}</div>
          <p className="text-muted-foreground text-sm mt-4">Completed and active projects</p>
        </div>

      </div>
    </div>
  )
}
