export interface Release {
  version: string;
  downloadUrl: string;
  fileSize: string;
  releaseDate: string;
  sha256?: string;
  portableUrl?: string;
  portableFileSize?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  tips?: string[];
}

export const appConfig = {
  name: 'Kiseki Record',
  tagline: 'Your Personal AI Life Operating System',
  description: 'A private, local-first personal life-record desktop application that helps you track every aspect of your life with AI assistance.',
  
  // Latest release information - update this when releasing new versions
  latestRelease: {
    version: '1.2.0',
    downloadUrl: 'https://github.com/talhaworkpk/kiseki-record/releases/download/v1.2.0/Kiseki.Record.Setup.1.0.0.exe',
    fileSize: '92.3 MB',
    releaseDate: new Date().toISOString().split('T')[0],
    sha256: 'placeholder-sha256-hash-will-be-added-on-release',
    portableUrl: undefined,
    portableFileSize: undefined,
  } as Release,
  
  // System requirements
  systemRequirements: {
    os: 'Windows 10 or later (64-bit)',
    ram: '4 GB RAM minimum, 8 GB recommended',
    storage: '500 MB available disk space',
    processor: 'Intel Core i3 or equivalent',
  },

  // Screenshots
  screenshots: [
    {
      src: '/screenshots/dashboard.png',
      title: 'Dashboard',
      description: 'Get a quick overview of your life at a glance',
    },
    {
      src: '/screenshots/analytics.png',
      title: 'Analytics',
      description: 'Dive deep into your life data with powerful analytics',
    },
    {
      src: '/screenshots/journal.png',
      title: 'Journal',
      description: 'Capture your thoughts, experiences, and ideas',
    },
    {
      src: '/screenshots/settings.png',
      title: 'Settings',
      description: 'Customize Kiseki Record to fit your needs',
    },
    {
      src: '/screenshots/relationship.png',
      title: 'Relationships',
      description: 'Nurture your connections and track interactions',
    },
    {
      src: '/screenshots/goals.png',
      title: 'Goals',
      description: 'Set, track, and achieve your personal and professional goals',
    },
  ],
  
  // Contact information
  contact: {
    email: 'talha.work.pk@gmail.com',
    github: 'https://github.com/talhaworkpk',
    phone: '+92 344 1646700',
  },
  
  // Social links
  social: {
    github: 'https://github.com/talhaworkpk/kiseki-record',
    twitter: '', // Add when available
    discord: '', // Add when available
  },
  
  // Changelog history
  changelog: [
    {
      version: '1.4.0',
      date: new Date().toISOString().split('T')[0],
      changes: [
        'Deep integration between Projects and Goals: Link goals directly to projects',
        'Automatic Project progress calculation based on linked goals and sub-goals',
        'Robust Conflict Resolution engine for JSON imports (Habits, Goals)',
        'Redesigned global action menus (Three-dots menus) across Relationships, Habits, and Goals',
        'New keyboard shortcuts (e.g., Ctrl+S to create memories)',
        'UI enhancements and bug fixes for a smoother user experience'
      ],
      tips: [
        'Pro Tip: Use the new Project dropdown when creating a Goal to automatically track its progress in your Project Portfolio!',
        'You can now safely import backups—if a conflict is detected, you will be prompted to replace or skip the imported item.'
      ]
    },
    {
      version: '1.3.0',
      date: new Date().toISOString().split('T')[0],
      changes: [
        'Added Sub-goals support to break down your main goals into actionable steps',
        'Added Grid/List view toggle in the Goals section for better organization',
        'Introduced detailed Preview Modals with image Slideshows for Projects, Career, Education, and Certificates',
        'Enabled custom album creation when adding new memories in Relationships',
        'Overhauled the Habits section to be significantly more user-friendly and intuitive',
        'Added global keyboard shortcut (Ctrl+S) to instantly save forms across the app (Goals, Skills, Projects, Habits, Records, etc.)'
      ],
      tips: [
        'Pro Tip: You can now press Ctrl+S to quickly save your progress instead of clicking the save button when creating a new Goal, Project, or Habit!'
      ]
    },
    {
      version: '1.2.0',
      date: new Date().toISOString().split('T')[0],
      changes: [
        'Added a versatile "New" button in the dashboard for quick additions',
        'Enhanced "Search" functionality across the application',
        'Added comprehensive support for Audio & Video rendering in Dashboard Calendar, Records, and Relationships',
        'Introduced "Recent Vaults" for faster backup management',
        'Added temporary interactive 3D SVG backgrounds that show up when adding new Certificates, Achievements, or Projects in the dashboard',
      ],
      tips: [
        'Pro Tip: Use the new "New" button on your dashboard for instantly quick-adding entries like journals, habits, or records from anywhere!',
        'Keep track of your backups easily using the new "Recent Vaults" feature to manage multiple backup files.',
        'Check out the dynamic background image behind your Skills section to see your progress visualized beautifully!',
      ],
    },
    {
      version: '1.1.0',
      date: new Date().toISOString().split('T')[0],
      changes: [
        'Added System Tray integration for background execution',
        'Added native Windows Desktop Notifications (Birthdays, Inactivity, Achievements)',
        'Added Memory Capsules feature for time-locked memories',
        'Enhanced Vault Backups with tracking for recent exports',
        'Added one-click import, merge, rename, and download for Vault backups',
        'Improved UI with comprehensive hover tooltips across the application',
      ],
    },
    {
      version: '1.0.0',
      date: '2024-08-04',
      changes: [
        'Initial Release',
        'AI Chat with local Ollama support',
        'Relationship Management',
        'Memories & Timeline',
        'Habit Tracker',
        'Goals & Career Tracking',
        'Reports & Analytics',
        'Resume Builder',
        'Skills & Certificates',
        'Offline-first architecture',
        'Privacy-focused design',
        'Vault Backup System',
        'Life Analytics Dashboard',
      ],
    },
  ] as ChangelogEntry[],
  
  // SEO metadata
  seo: {
    title: 'Kiseki Record - Your Personal AI Life Operating System',
    description: 'A private, local-first personal life-record desktop application. Track memories, habits, goals, relationships, and more with AI assistance - all offline and privacy-focused.',
    keywords: ['life record', 'personal tracker', 'AI assistant', 'offline app', 'privacy focused', 'habit tracker', 'goal setting', 'relationship management'],
    ogImage: '/og-image.png', // Add to public folder
  },
};

export default appConfig;
