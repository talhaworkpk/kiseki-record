/**
 * Kiseki Record — Onboarding Configuration
 *
 * Static configuration for each section's first-time introduction.
 * Used by the reusable SectionWelcome component and the Global Welcome.
 */

import {
  Zap,
  Stars,
  Target,
  BrainCircuit,
  FolderGit2,
  FileText,
  Book,
  Mail,
  Users,
  Bot,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { WelcomeSection } from './onboardingService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionWelcomeConfig {
  id: WelcomeSection
  title: string
  subtitle: string
  description: string
  features: string[]
  icon: LucideIcon
  primaryButtonText: string
  /** Tailwind color class prefix (e.g. 'amber', 'sky', 'emerald') */
  accentColor: string
}

export interface GlobalWelcomeFeature {
  icon: LucideIcon
  label: string
  description: string
}

// ---------------------------------------------------------------------------
// Global Welcome
// ---------------------------------------------------------------------------

export const GLOBAL_WELCOME_FEATURES: GlobalWelcomeFeature[] = [
  {
    icon: Zap,
    label: 'Build Habits',
    description: 'Track daily routines and build consistency',
  },
  {
    icon: Target,
    label: 'Track Goals',
    description: 'Set objectives and monitor your progress',
  },
  {
    icon: FolderGit2,
    label: 'Manage Projects',
    description: 'Organize your ideas into actionable work',
  },
  {
    icon: BrainCircuit,
    label: 'Develop Skills',
    description: 'Track your personal and professional growth',
  },
  {
    icon: Book,
    label: 'Capture Your Journey',
    description: 'Write entries and reflect on experiences',
  },
  {
    icon: Mail,
    label: 'Preserve Memories',
    description: 'Create time capsules to revisit later',
  },
  {
    icon: Users,
    label: 'Manage Relationships',
    description: 'Organize and nurture meaningful connections',
  },
  {
    icon: Bot,
    label: 'AI Assistant',
    description: 'Interact with your data through local AI',
  },
]

// ---------------------------------------------------------------------------
// Section Configs
// ---------------------------------------------------------------------------

export const ONBOARDING_CONFIGS: Record<string, SectionWelcomeConfig> = {
  habits: {
    id: 'habits',
    title: 'Welcome to Habits',
    subtitle: 'Build consistency, one day at a time.',
    description:
      'Habits helps you build positive routines and track your daily and weekly progress. See how consistent you are, unlock milestones, and let data guide your growth.',
    features: [
      'Create and manage daily or weekly habits',
      'Track completion and view streaks',
      'Analyze your consistency over time',
      'Earn habit milestones and achievements',
      'Get AI-powered insights on your patterns',
    ],
    icon: Zap,
    primaryButtonText: 'Explore Habits',
    accentColor: 'amber',
  },

  dreams: {
    id: 'dreams',
    title: 'Welcome to Dreams',
    subtitle: 'Where your aspirations take shape.',
    description:
      'Dreams is your space for long-term aspirations — the things you want to achieve, experience, or create in life. Connect your dreams to goals, projects, and skills to turn ideas into reality.',
    features: [
      'Define your long-term dreams and aspirations',
      'Connect dreams to goals and projects',
      'Link dreams to skills you want to develop',
      'Turn abstract ideas into actionable progress',
      'Organize dreams by category',
    ],
    icon: Stars,
    primaryButtonText: 'Explore Dreams',
    accentColor: 'violet',
  },

  goals: {
    id: 'goals',
    title: 'Welcome to Goals',
    subtitle: 'Turn ambitions into measurable objectives.',
    description:
      'Goals helps you break down larger ambitions into specific, trackable objectives. Set targets, monitor progress, and celebrate completions as you work toward what matters most.',
    features: [
      'Create goals with deadlines and priorities',
      'Track progress with visual indicators',
      'Use sub-goals for complex objectives',
      'Connect goals with projects',
      'Monitor progress over time',
    ],
    icon: Target,
    primaryButtonText: 'Explore Goals',
    accentColor: 'emerald',
  },

  skills: {
    id: 'skills',
    title: 'Welcome to Skills',
    subtitle: 'Track your personal and professional development.',
    description:
      'Skills helps you log and visualize your learning journey. Track proficiency levels, connect skills to projects, record certificates, and see how far you have come.',
    features: [
      'Track skills and proficiency levels',
      'Connect skills with projects',
      'Record certificates and achievements',
      'See your development progress over time',
    ],
    icon: BrainCircuit,
    primaryButtonText: 'Explore Skills',
    accentColor: 'cyan',
  },

  projects: {
    id: 'projects',
    title: 'Welcome to Projects',
    subtitle: 'Turn goals and ideas into concrete work.',
    description:
      'Projects is where your goals and ideas become real. Organize your active work, track progress, connect related goals and skills, and showcase what you have built.',
    features: [
      'Create and manage personal and professional projects',
      'Connect projects with goals and skills',
      'Track project progress and milestones',
      'Add screenshots and documentation',
      'Organize your active and completed work',
    ],
    icon: FolderGit2,
    primaryButtonText: 'Explore Projects',
    accentColor: 'blue',
  },

  records: {
    id: 'records',
    title: 'Welcome to Records',
    subtitle: 'Capture and organize important information.',
    description:
      'Records lets you store personal notes, documents, and important information. Write rich-text entries, attach files, tag and filter your records, and keep everything organized in one place.',
    features: [
      'Create rich-text records with formatting',
      'Attach images and files',
      'Tag, search, and filter records',
      'Organize by type, mood, and date',
      'Archive and manage your collection',
    ],
    icon: FileText,
    primaryButtonText: 'Explore Records',
    accentColor: 'rose',
  },

  journey: {
    id: 'journey',
    title: 'Welcome to Your Journey',
    subtitle: 'Your personal timeline of experiences.',
    description:
      'Your Journey is a space to write about your day, reflect on experiences, and track your mood over time. Build a rich personal history that you can look back on and learn from.',
    features: [
      'Write daily journal entries',
      'Track your mood and emotions',
      'Add photos and media to entries',
      'Search and revisit past experiences',
      'View analytics and timeline of your journey',
    ],
    icon: Book,
    primaryButtonText: 'Explore Journey',
    accentColor: 'indigo',
  },

  'memory-capsule': {
    id: 'memory-capsule',
    title: 'Welcome to Memory Capsule',
    subtitle: 'Preserve moments, revisit them later.',
    description:
      'Memory Capsule lets you create time capsules with messages to your future self. Seal a memory and set a date — when the time comes, unlock it and relive the moment.',
    features: [
      'Create time capsules with personal messages',
      'Set unlock dates in the future',
      'Seal memories to be opened later',
      'Receive notifications when capsules are ready',
    ],
    icon: Mail,
    primaryButtonText: 'Explore Memory Capsule',
    accentColor: 'pink',
  },

  relationships: {
    id: 'relationships',
    title: 'Welcome to Relationships',
    subtitle: 'Organize and nurture meaningful connections.',
    description:
      'Relationships helps you keep track of the people who matter most. Create profiles, log conversations and memories, and make sure you stay connected with the people in your life.',
    features: [
      'Create detailed relationship profiles',
      'Log conversations and shared memories',
      'Filter and search your connections',
      'Track relationship types and details',
      'Send and receive messages between profiles',
    ],
    icon: Users,
    primaryButtonText: 'Explore Relationships',
    accentColor: 'teal',
  },

  'ai-assistant': {
    id: 'ai-assistant',
    title: 'Meet Your Kiseki AI Assistant',
    subtitle: 'Your intelligent companion for Kiseki.',
    description:
      'The AI Assistant is powered by your local Ollama models. It can help you understand and work with your goals, projects, habits, records, journal entries, memories, and more — all while keeping your data private.',
    features: [
      'Chat with your AI about your Kiseki data',
      'Ask questions about goals, habits, and projects',
      'Get insights from your records and journal',
      'Use multiple AI models via Ollama',
      'All processing stays local and private',
    ],
    icon: Bot,
    primaryButtonText: 'Meet Your Assistant',
    accentColor: 'purple',
  },
}
