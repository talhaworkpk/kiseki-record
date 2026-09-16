import React, { useState } from 'react'
import { Lightbulb, Info, Key, Shield, HardDrive, Keyboard, Save, Lock, Bot, Archive, FileArchive, GitMerge, Palette, Smile, Image, FileText, Briefcase, MessageCircle, Link, MousePointerClick, ChevronDown, ChevronUp } from 'lucide-react'
import dairyIcon from '../../assets/dairy_icon.jpeg'
import { onboardingService, ALL_SECTIONS } from '../../lib/onboardingService'
import { ONBOARDING_CONFIGS } from '../../lib/onboardingConfig'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { RotateCcw } from 'lucide-react'
export default function UserGuidanceSettings() {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  
  const handleResetSection = (sectionId: string) => {
    onboardingService.resetSection(sectionId as any)
    NotificationEngine.notify('success', 'Introduction Reset', 'The introduction will play next time you visit this section.', 'Settings')
  }

  const handleResetAll = () => {
    if (window.confirm("Are you sure you want to reset all introductions including the global welcome?")) {
      onboardingService.resetAll()
      NotificationEngine.notify('success', 'All Introductions Reset', 'All onboarding sequences have been reset.', 'Settings')
    }
  }

  const tips = [
    {
      icon: <img src={dairyIcon} className="w-6 h-6 object-cover rounded shadow-sm" alt="Diary app" />,
      title: "Import from Diary App",
      description: "If you are using the Android app 'Diary with lock: Daily journey', you can import its export files by using the 'Import Notes' feature."
    },
    {
      icon: <Bot className="text-indigo-500" size={24} />,
      title: "Multi AI Models via Ollama",
      description: "Download a good AI model in Ollama for Kiseki Record. You can use multiple AI models at once and configure them in the AI Assistant settings."
    },
    {
      icon: <Archive className="text-amber-600" size={24} />,
      title: "Export File Limit",
      description: "The application can securely store up to 3 full vault export backup files."
    },
    {
      icon: <FileArchive className="text-teal-500" size={24} />,
      title: "Section-specific Backups",
      description: "We've added import/export functionality directly within important sections. This lets you quickly backup specific data instead of the entire app."
    },
    {
      icon: <GitMerge className="text-violet-500" size={24} />,
      title: "Smart Import Rules",
      description: "When using the import feature within sections, you can choose 'skip' or 'replace' logic, similar to USB file transfers, to avoid duplicate data."
    },
    {
      icon: <Palette className="text-cyan-500" size={24} />,
      title: "Customize AI Assistant UI",
      description: "You can add a custom background image to the AI Assistant. You can also customize the text and box colors for both your messages and the AI's responses."
    },
    {
      icon: <Smile className="text-orange-500" size={24} />,
      title: "AI Personality",
      description: "You can fully customize the personality and instructions of your AI assistant to suit your specific needs."
    },
    {
      icon: <Image className="text-sky-500" size={24} />,
      title: "Skill Card Backgrounds",
      description: "Make your learning aesthetic! You can add custom background images to your Skills cards."
    },
    {
      icon: <FileText className="text-gray-500" size={24} />,
      title: "Resume Builder",
      description: "You can easily create a basic CV using the built-in Resume Builder and directly export it to PDF."
    },
    {
      icon: <Briefcase className="text-purple-500" size={24} />,
      title: "Career AI Advisor",
      description: "Seek personalized professional advice and guidance directly from the AI model in the 'Career AI' section."
    },
    {
      icon: <MessageCircle className="text-emerald-500" size={24} />,
      title: "Message Yourself",
      description: "In the Relationships section, there is a WhatsApp-style 'Message Yourself' feature where you can safely log and reflect on your own personal memories."
    },
    {
      icon: <Link className="text-indigo-400" size={24} />,
      title: "Linked Personal Information",
      description: "Your 'You' profile in Relationships and your Basic Information in Career are deeply linked. Changes made in one will automatically sync to the other."
    },
    {
      icon: <Shield className="text-red-500" size={24} />,
      title: "Private Profile",
      description: "Your private profile is isolated. Data created in private mode stays in private mode unless you explicitly share it."
    },
    {
      icon: <HardDrive className="text-amber-500" size={24} />,
      title: "Local Backups",
      description: "Always export your vault regularly from the General settings tab. Your data is stored locally on your device, not on the cloud."
    },
    {
      icon: <Key className="text-emerald-600" size={24} />,
      title: "Master Password",
      description: "If you forget your master password for the private profile, your private data cannot be recovered. Keep it safe!"
    },
    {
      icon: <Lightbulb className="text-yellow-500" size={24} />,
      title: "Goal Tracking",
      description: "Break down large goals into smaller sub-goals. Tracking progress in small chunks makes achieving your dreams much easier."
    }
  ]

  const ShortcutItem = ({ keys, description }: { keys: string[], description: string }) => (
    <li className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{description}</span>
      <div className="flex gap-1">
        {keys.map((k, i) => (
          <React.Fragment key={i}>
            <kbd className="px-2 py-1 bg-accent border border-border rounded text-[11px] font-bold text-foreground font-mono uppercase shadow-sm">
              {k}
            </kbd>
            {i < keys.length - 1 && <span className="text-muted-foreground self-center text-[10px]">+</span>}
          </React.Fragment>
        ))}
      </div>
    </li>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
          <Info size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">User Guidance & Tips</h2>
          <p className="text-muted-foreground">Helpful information to get the most out of Kiseki Record</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-6 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
              <RotateCcw size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Section Introductions</h3>
              <p className="text-sm text-muted-foreground">Replay the welcome introduction overlays for specific sections</p>
            </div>
          </div>
          <button 
            onClick={handleResetAll}
            className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm font-semibold rounded-lg transition-colors"
          >
            Reset All
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {ALL_SECTIONS.map(sectionId => {
            const config = ONBOARDING_CONFIGS[sectionId]
            const Icon = config.icon
            return (
              <div key={sectionId} className="flex flex-col items-center justify-between p-3 border border-border rounded-xl bg-accent/20 hover:bg-accent/40 transition-colors gap-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className={`p-2 rounded-full bg-${config.accentColor}-500/20 text-${config.accentColor}-500`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-medium">{config.title}</span>
                </div>
                <button 
                  onClick={() => handleResetSection(sectionId)}
                  className="w-full py-1.5 px-2 bg-background border border-border rounded-md text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors uppercase tracking-wider"
                >
                  Replay
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-6">
        <button 
          onClick={() => setIsShortcutsOpen(!isShortcutsOpen)}
          className="w-full flex items-center justify-between p-5 bg-accent/30 hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Keyboard size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">Keyboard Shortcuts</h3>
              <p className="text-sm text-muted-foreground">View all available shortcuts to navigate the app faster</p>
            </div>
          </div>
          {isShortcutsOpen ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
        </button>
        
        {isShortcutsOpen && (
          <div className="p-5 border-t border-border bg-background/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-2 duration-300">
            <div>
              <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3">Global Shortcuts</h4>
              <ul className="space-y-2">
                 <ShortcutItem keys={['Ctrl', 'T']} description="Toggle Light/Dark Theme" />
                 <ShortcutItem keys={['Ctrl', 'S']} description="Save Current Item" />
                 <ShortcutItem keys={['Ctrl', 'Shift', 'Alt', 'P']} description="Toggle Private Mode" />
                 <ShortcutItem keys={['Ctrl', 'Shift', 'Alt', 'R']} description="Reload Application" />
                 <ShortcutItem keys={['Ctrl', '↑ / ↓']} description="Navigate Main Sections" />
                 <ShortcutItem keys={['Ctrl', 'Alt', '↑ / ↓']} description="Navigate Sub-Sections" />
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3">Quick Navigation</h4>
              <ul className="space-y-2">
                 <ShortcutItem keys={['Ctrl', 'Alt', 'D']} description="Dashboard" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'O']} description="Clock" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'H']} description="Habits Dashboard" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'X']} description="Skills" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'A']} description="AI Assistant" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'G']} description="Goals" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'R']} description="Relationships" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'M']} description="Memory Capsules" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'C']} description="Edu & Career" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'J']} description="Journal" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'P']} description="Reports" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'E']} description="Records" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'S']} description="Settings" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'Z']} description="Dreams" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'Q']} description="Projects" />
                 <ShortcutItem keys={['Ctrl', 'Alt', 'L']} description="Chronicle" />
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3">Navigation & Focus Mode</h4>
              <ul className="space-y-2">
                 <ShortcutItem keys={['Ctrl', 'Shift', 'N']} description="Open Quick Add (Dashboard)" />
                 <ShortcutItem keys={['Ctrl', 'Shift', 'S']} description="Focus Search Bar" />
                 <ShortcutItem keys={['Ctrl', 'F12']} description="Toggle Global Sidebar & Navbar" />
                 <ShortcutItem keys={['Ctrl', 'H']} description="Toggle Top Navbar" />
                 <ShortcutItem keys={['Ctrl', 'Shift', 'A']} description="Toggle AI Assistant Sidebar" />
                 <ShortcutItem keys={['Ctrl', '←']} description="Navigate Back" />
                 <ShortcutItem keys={['Ctrl', '→']} description="Navigate Forward" />
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 p-4 rounded-xl flex gap-4 items-center shadow-sm">
        <MousePointerClick className="w-8 h-8 shrink-0 text-blue-500" />
        <div>
          <h3 className="font-bold">Pro Navigation Tip</h3>
          <p className="text-sm">You can scroll anywhere in the app quickly! Just <strong>Hold Right-Click and Drag</strong> your mouse up or down to navigate effortlessly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tips.map((tip, index) => (
          <div key={index} className="p-5 border border-border bg-card rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex gap-4">
              <div className="shrink-0 p-3 bg-accent/50 rounded-xl group-hover:scale-110 transition-transform flex items-center justify-center">
                {tip.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{tip.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {tip.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-6 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-2xl">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Lightbulb className="text-purple-500" size={20}/>
          Pro Tip
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The app is designed to be fully functional offline. You can download maps for offline use and all your records are safely kept on your local hard drive. Enjoy absolute privacy!
        </p>
      </div>
    </div>
  )
}

