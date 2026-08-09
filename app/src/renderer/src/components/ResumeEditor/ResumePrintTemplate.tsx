import { EducationRecord, JobRecord, SkillRecord, ProjectRecord } from '../../types'

interface ResumePrintTemplateProps {
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

export default function ResumePrintTemplate({
  profile,
  professionalTitle,
  summary,
  jobs,
  education,
  skills,
  projects,
  accentColor,
  headingFont,
  bodyFont
}: ResumePrintTemplateProps) {
  return (
    <div className="resume-print-template">
      <style>{`
        @page { size: A4; margin: 0; }
        .resume-print-template {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          background: white;
          font-family: ${bodyFont}, Arial, sans-serif;
          color: #000;
          margin: 0;
          box-sizing: border-box;
        }
        .resume-print-template h1,
        .resume-print-template h2,
        .resume-print-template h3 {
          font-family: ${headingFont}, Arial, sans-serif;
        }
        .resume-print-template h2 {
          font-size: 18pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12pt;
          padding-bottom: 4pt;
          border-bottom: 2px solid ${accentColor};
        }
        .resume-print-template h3 {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 6pt;
        }
        .resume-print-template p {
          font-size: 11pt;
          line-height: 1.4;
          margin-bottom: 8pt;
        }
        .resume-print-template .header {
          margin-bottom: 20pt;
          padding-bottom: 15pt;
          border-bottom: 2px solid ${accentColor};
        }
        .resume-print-template .header h1 {
          font-size: 24pt;
          font-weight: bold;
          margin-bottom: 4pt;
        }
        .resume-print-template .header .title {
          font-size: 14pt;
          margin-bottom: 8pt;
          color: #333;
        }
        .resume-print-template .header .contact {
          font-size: 10pt;
          color: #666;
        }
        .resume-print-template .section {
          margin-bottom: 20pt;
          page-break-inside: avoid;
        }
        .resume-print-template .entry {
          margin-bottom: 12pt;
          page-break-inside: avoid;
        }
        .resume-print-template .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4pt;
        }
        .resume-print-template .entry-title {
          font-weight: bold;
          font-size: 12pt;
        }
        .resume-print-template .entry-date {
          font-size: 10pt;
          color: #666;
        }
        .resume-print-template .entry-subtitle {
          font-style: italic;
          font-size: 11pt;
          margin-bottom: 4pt;
          color: #444;
        }
        .resume-print-template .entry-description {
          font-size: 10pt;
          line-height: 1.4;
          color: #333;
        }
        .resume-print-template .skills-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8pt;
        }
        .resume-print-template .skill-item {
          font-size: 10pt;
        }
        .resume-print-template .profile-image {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 15pt;
          float: left;
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {profile?.photoPath && (
            <img 
              src={profile.photoPath} 
              alt="Profile" 
              className="profile-image"
              crossOrigin="anonymous"
            />
          )}
          <div style={{ flex: 1 }}>
            <h1>{profile?.fullName || 'Your Name'}</h1>
            <div className="title">{professionalTitle}</div>
            <div className="contact">
              {profile?.email && <span>{profile.email}</span>}
              {profile?.phone && <span> • {profile.phone}</span>}
              {profile?.address && <span> • {profile.address}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="section">
          <h2>Summary</h2>
          <p dangerouslySetInnerHTML={{ __html: summary }} />
        </div>
      )}

      {/* Experience */}
      {jobs.length > 0 && (
        <div className="section">
          <h2>Experience</h2>
          {jobs.map((job) => (
            <div key={job._id} className="entry">
              <div className="entry-header">
                <div className="entry-title" dangerouslySetInnerHTML={{ __html: job.position }} />
                <div className="entry-date">
                  {new Date(job.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })} - {job.isCurrent ? 'Present' : (job.endDate ? new Date(job.endDate).toLocaleDateString([], { month: 'short', year: 'numeric' }) : 'Present')}
                </div>
              </div>
              <div className="entry-subtitle" dangerouslySetInnerHTML={{ __html: job.company }} />
              {job.responsibilities && job.responsibilities.length > 0 && (
                <div className="entry-description">
                  {job.responsibilities.map((resp, idx) => (
                    <div key={idx} dangerouslySetInnerHTML={{ __html: resp }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="section">
          <h2>Education</h2>
          {education.map((edu) => (
            <div key={edu._id} className="entry">
              <div className="entry-header">
                <div className="entry-title" dangerouslySetInnerHTML={{ __html: edu.degree }} />
                <div className="entry-date">
                  {new Date(edu.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })} - {edu.status === 'Current' ? 'Present' : (edu.endDate ? new Date(edu.endDate).toLocaleDateString([], { month: 'short', year: 'numeric' }) : 'Present')}
                </div>
              </div>
              <div className="entry-subtitle" dangerouslySetInnerHTML={{ __html: edu.school }} />
              {edu.field && <div className="entry-subtitle" dangerouslySetInnerHTML={{ __html: edu.field }} />}
              {edu.grade && <div className="entry-description">Grade: {edu.grade}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="section">
          <h2>Projects</h2>
          {projects.map((proj) => (
            <div key={proj._id} className="entry">
              <div className="entry-header">
                <div className="entry-title" dangerouslySetInnerHTML={{ __html: proj.title }} />
                <div className="entry-date">{new Date(proj.startDate).getFullYear()}</div>
              </div>
              {proj.description && <div className="entry-description" dangerouslySetInnerHTML={{ __html: proj.description }} />}
              {proj.technologies && proj.technologies.length > 0 && (
                <div className="entry-description">
                  <strong>Technologies:</strong> {proj.technologies.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="section">
          <h2>Skills</h2>
          <div className="skills-grid">
            {skills.map((skill) => (
              <div key={skill._id} className="skill-item" dangerouslySetInnerHTML={{ __html: skill.name }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
