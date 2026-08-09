import { useState, useRef } from 'react'
import { FileSearch, Check, Printer, FileText, Download } from 'lucide-react'

export default function CustomReport() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [includeAI, setIncludeAI] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const [reportType, setReportType] = useState('Custom')
  const [categories, setCategories] = useState({
    records: true,
    journal: true,
    goals: true,
    habits: true,
    relationships: true,
    skills: true,
    achievements: true,
    photos: true
  })

  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<any>(null)

  const handleReportTypeChange = (type: string) => {
    setReportType(type)
    const now = new Date()
    if (type === 'Daily') {
      const today = now.toISOString().split('T')[0]
      setStartDate(today)
      setEndDate(today)
    } else if (type === 'Weekly') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      setStartDate(lastWeek.toISOString().split('T')[0])
      setEndDate(now.toISOString().split('T')[0])
    } else if (type === 'Monthly') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      setStartDate(lastMonth.toISOString().split('T')[0])
      setEndDate(now.toISOString().split('T')[0])
    } else if (type === 'Yearly') {
      const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      setStartDate(lastYear.toISOString().split('T')[0])
      setEndDate(now.toISOString().split('T')[0])
    }
  }
  
  // PDF Preview State
  const [pdfPreview, setPdfPreview] = useState<{ url: string } | null>(null)
  const [pdfZoom, setPdfZoom] = useState(1)
  const [exporting, setExporting] = useState(false)

  const handleToggle = (key: keyof typeof categories) => {
    setCategories(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.')
      return
    }
    
    setGenerating(true)
    try {
      const sDate = new Date(startDate).getTime()
      const eDate = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1)

      const result: any = { 
        timeRange: `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
        startDate: sDate,
        endDate: eDate,
        includeAI,
        reportType
      }
      
      // @ts-ignore
      const profile = await window.api.db.find('userProfile', {})
      result.profile = profile[0] || {}

      if (includeAI) {
        try {
          const prompt = `Analyze this summary of a user's life over the period ${result.timeRange}. Provide a brief 3-sentence encouraging summary and one recommendation.\nRecords: ${categories.records ? 'included' : 'excluded'}\nJournals: ${categories.journal ? 'included' : 'excluded'}\nGoals: ${categories.goals ? 'included' : 'excluded'}\nHabits: ${categories.habits ? 'included' : 'excluded'}\nSkills: ${categories.skills ? 'included' : 'excluded'}\nRelationships: ${categories.relationships ? 'included' : 'excluded'}\nAchievements: ${categories.achievements ? 'included' : 'excluded'}`
          const aiRes = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama3',
              prompt,
              stream: false
            })
          })
          if (aiRes.ok) {
            const aiData = await aiRes.json()
            result.aiSummary = aiData.response
          }
        } catch (e) {
          result.aiSummary = "Could not reach AI."
        }
      }

      if (categories.records) {
        // @ts-ignore
        const r = await window.api.db.find('records', {})
        result.records = r.filter((x: any) => x.createdAt >= sDate && x.createdAt <= eDate)
      }
      if (categories.journal) {
        // @ts-ignore
        const j = await window.api.db.find('journal', {})
        result.journal = j.filter((x: any) => x.createdAt >= sDate && x.createdAt <= eDate)
      }
      if (categories.goals) {
        // @ts-ignore
        const g = await window.api.db.find('goals', {})
        result.goals = g
      }
      if (categories.skills) {
        // @ts-ignore
        const s = await window.api.db.find('skills', {})
        result.skills = s
      }
      if (categories.habits) {
        // @ts-ignore
        const h = await window.api.db.find('habits', {})
        result.habits = h
      }
      if (categories.relationships) {
        // @ts-ignore
        const rel = await window.api.db.find('relationships', {})
        result.relationships = rel
      }
      if (categories.achievements) {
        // @ts-ignore
        const ach = await window.api.db.find('achievements', {})
        result.achievements = ach
      }

      setReport(result)

    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = async () => {
    if (!report) return
    setExporting(true)
    try {
      // @ts-ignore
      const pdfBuffer = await window.api.export.reportPdf(report)
      
      const uint8Array = new Uint8Array(pdfBuffer)
      const blob = new Blob([uint8Array], { type: 'application/pdf' })
      const objectUrl = URL.createObjectURL(blob)
      setPdfPreview({ url: objectUrl })
    } catch (err: any) {
      console.error('Failed to export PDF', err)
      alert(`Failed to generate PDF: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadPdf = () => {
    if (pdfPreview) {
      const a = document.createElement('a')
      a.href = pdfPreview.url
      a.download = `Custom_Report_${startDate}_${endDate}.pdf`
      a.click()
    }
  }

  const handleClosePreview = () => {
    if (pdfPreview) {
      URL.revokeObjectURL(pdfPreview.url)
      setPdfPreview(null)
    }
  }

  // Right-click drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      setIsDragging(true)
      setDragStartY(e.clientY)
      setScrollTop(scrollContainerRef.current?.scrollTop || 0)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const deltaY = e.clientY - dragStartY
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollTop - deltaY
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (scrollContainerRef.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop += 100
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop -= 100
      }
    }
  }

  return (
    <div 
      ref={scrollContainerRef}
      className={`h-full overflow-y-auto p-8 animate-in fade-in duration-500 print:bg-white print:p-0 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      
      <div className="mb-8 print:hidden">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileSearch className="text-primary" /> 
          Custom Reports
        </h1>
        <p className="text-muted-foreground mt-1">Generate highly specific reports based on exact dates and categories.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        
        {/* Configuration Form */}
        <div className="lg:col-span-1 bg-card border border-border p-6 rounded-2xl shadow-sm h-fit">
          <h3 className="font-bold mb-4">Report Type</h3>
          <select 
            value={reportType} 
            onChange={(e) => handleReportTypeChange(e.target.value)}
            className="w-full p-2 mb-6 bg-background border border-border rounded-md"
          >
            <option value="Custom">Custom Report</option>
            <option value="Daily">Daily Summary</option>
            <option value="Weekly">Weekly Report</option>
            <option value="Monthly">Monthly Progress</option>
            <option value="Yearly">Yearly Life Book</option>
          </select>

          <h3 className="font-bold mb-4">Date Range</h3>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => {setStartDate(e.target.value); setReportType('Custom')}} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => {setEndDate(e.target.value); setReportType('Custom')}} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
          </div>

          <h3 className="font-bold mb-4">Categories to Include</h3>
          <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto pr-2">
            {Object.keys(categories).map((key) => (
              <label key={key} onClick={() => handleToggle(key as keyof typeof categories)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer border border-transparent hover:border-border transition-colors">
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${categories[key as keyof typeof categories] ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-transparent'}`}>
                  <Check size={14} />
                </div>
                <span className="capitalize">{key}</span>
              </label>
            ))}
          </div>

          <label onClick={() => setIncludeAI(!includeAI)} className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg cursor-pointer mb-6 border border-primary/20">
            <div className={`w-5 h-5 rounded flex items-center justify-center border ${includeAI ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-primary/30 text-transparent'}`}>
              <Check size={14} />
            </div>
            <span className="font-bold text-primary">Include AI Summary</span>
          </label>

          <button onClick={handleGenerate} disabled={generating || !startDate || !endDate} className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2">
          {report ? (
            <div className="bg-card border border-border p-8 rounded-2xl shadow-sm relative">
              <div className="absolute top-8 right-8 flex gap-2">
                <button onClick={handlePrint} disabled={exporting} className="p-2 bg-background border border-border rounded-md hover:bg-accent text-foreground transition-colors disabled:opacity-50" title="Print to PDF">
                  <Printer size={18}/>
                </button>
                <button className="p-2 bg-background border border-border rounded-md hover:bg-accent text-foreground transition-colors" title="Export Raw JSON">
                  <Download size={18}/>
                </button>
              </div>

              <h2 className="text-2xl font-black mb-2 flex items-center gap-2"><FileText className="text-primary"/> {report.reportType === 'Custom' ? 'Life Report' : report.reportType + ' Report'} Generated</h2>
              <p className="text-muted-foreground mb-8">Timeframe: {report.timeRange}</p>

              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {report.records && (
                    <div className="bg-accent/50 p-4 rounded-xl text-center"><div className="text-3xl font-black text-blue-500">{report.records.length}</div><div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Records</div></div>
                  )}
                  {report.journal && (
                    <div className="bg-accent/50 p-4 rounded-xl text-center"><div className="text-3xl font-black text-orange-500">{report.journal.length}</div><div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Journals</div></div>
                  )}
                  {report.goals && (
                    <div className="bg-accent/50 p-4 rounded-xl text-center"><div className="text-3xl font-black text-red-500">{report.goals.length}</div><div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Active Goals</div></div>
                  )}
                  {report.habits && (
                    <div className="bg-accent/50 p-4 rounded-xl text-center"><div className="text-3xl font-black text-green-500">{report.habits.length}</div><div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Tracked Habits</div></div>
                  )}
                </div>
                
                {includeAI && (
                  <div className="bg-primary/5 border border-primary/20 p-6 rounded-xl">
                    <h3 className="font-bold text-primary mb-2 flex items-center gap-2">AI Summary</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {report.aiSummary || "Your Life Report is ready to be exported. The beautiful multi-page PDF will contain progress bars, timelines, mood analytics, relationship tracking, and personalized insights based on your selected parameters."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-2xl h-full flex flex-col items-center justify-center p-12 text-muted-foreground text-center">
              <FileSearch size={48} className="mb-4 opacity-20"/>
              <h3 className="text-lg font-bold text-foreground">No Report Generated</h3>
              <p className="max-w-md mt-2">Select your parameters on the left and click "Generate Report" to build a customized view of your data.</p>
            </div>
          )}
        </div>

      </div>

      {/* Print View (Only visible when printing via normal window print) */}
      <div className="hidden print:block max-w-[21cm] min-h-[29.7cm] mx-auto bg-white text-black p-12">
        <h1 className="text-4xl font-black mb-2 border-b-2 border-black pb-4">{reportType === 'Custom' ? 'Life Report' : reportType + ' Report'}</h1>
        {report && (
          <>
            <p className="text-xl text-gray-600 font-medium mb-12">Period: {report.timeRange}</p>
            <div className="space-y-4 text-lg">
              {report.records && <div className="flex justify-between border-b py-2 border-gray-200"><span>Records Added</span> <span className="font-bold">{report.records.length}</span></div>}
              {report.journal && <div className="flex justify-between border-b py-2 border-gray-200"><span>Journal Entries</span> <span className="font-bold">{report.journal.length}</span></div>}
              {report.goals && <div className="flex justify-between border-b py-2 border-gray-200"><span>Active Goals</span> <span className="font-bold">{report.goals.length}</span></div>}
              {report.habits && <div className="flex justify-between border-b py-2 border-gray-200"><span>Tracked Habits</span> <span className="font-bold">{report.habits.length}</span></div>}
            </div>
          </>
        )}
      </div>

      {/* PDF Preview Dialog */}
      {pdfPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-5xl w-full mx-4 h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">PDF Preview</h2>
              <button onClick={handleClosePreview} className="p-2 hover:bg-accent rounded-md">
                <span className="sr-only">Close</span>✕
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setPdfZoom(Math.max(0.5, pdfZoom - 0.25))} className="px-3 py-1 border border-border rounded-md hover:bg-accent text-sm" disabled={pdfZoom <= 0.5}>Zoom Out</button>
              <span className="text-sm font-medium w-16 text-center">{Math.round(pdfZoom * 100)}%</span>
              <button onClick={() => setPdfZoom(Math.min(2, pdfZoom + 0.25))} className="px-3 py-1 border border-border rounded-md hover:bg-accent text-sm" disabled={pdfZoom >= 2}>Zoom In</button>
              <button onClick={() => setPdfZoom(1)} className="px-3 py-1 border border-border rounded-md hover:bg-accent text-sm">Reset</button>
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
              <button onClick={handleClosePreview} className="px-4 py-2 border border-border rounded-md hover:bg-accent">Back</button>
              <button onClick={handleDownloadPdf} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Download PDF</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
