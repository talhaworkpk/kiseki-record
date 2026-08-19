export interface RecordItem {
  _id?: string
  title: string
  description: string
  date: string // Primary event date/time
  startDate?: string
  endDate?: string
  type: string
  tags: string[]
  people?: string[] // IDs or names of relationships
  location?: string // Plain text location
  mood?: string
  importance: number // 1-5
  privacyLevel: 'public' | 'private'
  attachments?: string[]
  relatedGoals?: string[] // IDs of Goals
  relatedHabits?: string[] // IDs of Habits
  relatedRecords?: string[] // IDs of other Records
  aiSummary?: string // AI-generated summary
  createdAt: number
  updatedAt: number
  isFavorite: boolean
  isArchived: boolean
  views?: number
  deletedAt?: number // Soft deletion timestamp
}

export interface SubGoal {
  id: string
  title: string
  description?: string
  completed: boolean
  targetDate?: string
  notes?: string
  order: number
  startDate?: string
  completedAt?: string
}

export interface Goal {
  _id?: string
  projectId?: string | null
  title: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high'
  startDate: string
  targetDate: string
  progress: number
  status: 'Planned' | 'Active' | 'Paused' | 'Completed' | 'Cancelled' | 'Archived'
  notes?: string
  isFavorite?: boolean
  isArchived?: boolean
  subGoals?: SubGoal[]
  createdAt?: number
  updatedAt?: number
}

export interface Habit {
  _id?: string
  title: string
  description?: string
  category: string
  icon: string
  scheduleType: 'daily' | 'weekdays' | 'weekends' | 'specific_days'
  scheduleDays?: number[] // 0=Sun, 1=Mon, etc. (used if scheduleType='specific_days')
  preferredTime?: string
  deadlineTime?: string
  priority: 'low' | 'medium' | 'high'
  isTimerEnabled: boolean
  targetDuration?: number // in seconds
  startDate: string
  endDate?: string
  notes?: string
  archived: boolean
  isFavorite?: boolean
  createdAt: number
  updatedAt: number
}

export interface HabitDailyRecord {
  _id?: string
  habitId: string
  date: string // YYYY-MM-DD
  status: 'completed' | 'missed' | 'pending' | 'skipped' | 'not_scheduled' | 'paused'
  completionTime?: number // timestamp when marked completed
  createdAt: number
  updatedAt: number
}

export interface HabitTimerSession {
  _id?: string
  habitId: string
  date: string // YYYY-MM-DD
  startTime: number
  endTime: number
  duration: number // seconds
  status: 'completed' | 'interrupted'
  note?: string
}

export interface HabitBreak {
  _id?: string
  habitId: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  reason?: string
  autoResume: boolean
  createdAt: number
}

export interface HabitActivityLog {
  _id?: string
  habitId: string
  action: 'created' | 'edited' | 'completed' | 'missed' | 'auto_missed' | 'timer_started' | 'timer_paused' | 'timer_completed' | 'break_started' | 'break_ended' | 'archived' | 'restored' | 'deleted'
  timestamp: number
  details?: string
}

export interface JournalEntry {
  _id?: string
  title?: string
  content: string // Rich text HTML/JSON
  date: string
  mood: string
  weather?: string
  location?: string
  tags: string[]
  isPrivate: boolean
  photos?: string[]
  voiceNotes?: string[]
  fileAttachments?: string[]
  folder?: string
  createdAt: number
  updatedAt: number
  isFavorite?: boolean
  isArchived?: boolean
}

export interface Person {
  _id?: string
  name: string
  nickname?: string
  profilePicture?: string
  gender?: string
  birthday?: string
  phone?: string
  email?: string
  address?: string
  occupation?: string
  relationshipType: string // 'Family', 'Friend', 'Best Friend', 'Partner', etc.
  relationshipStarted?: string
  bio?: string
  notes?: { _id: string, content: string, createdAt: number, isPinned: boolean }[]
  tags: string[]
  location?: string
  socialLinks?: {
    instagram?: string
    facebook?: string
    linkedin?: string
    discord?: string
    twitter?: string
    website?: string
  }
  relationshipScore: number // 1-100
  lastInteraction?: number // timestamp
  createdAt: number
  updatedAt: number
  isArchived?: boolean
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  isFavorite?: boolean
  timestamp?: number
  images?: string[] // Attachment paths
}

export interface Conversation {
  _id?: string
  title: string
  messages: Message[]
  isPinned?: boolean
  updatedAt: number
  createdAt?: number
}

export interface EducationRecord {
  _id?: string
  school: string
  degree: string
  field: string
  startDate: string
  endDate?: string
  status: 'Current' | 'Graduated' | 'Dropped'
  grade?: string
  description?: string
  subjects?: string[]
  activities?: string[]
  achievements?: string[]
  attachments?: string[]
  photos?: string[]
  createdAt: number
  updatedAt: number
}

export interface JobRecord {
  _id?: string
  company: string
  position: string
  employmentType: string
  startDate: string
  endDate?: string
  isCurrent: boolean
  salary?: string
  responsibilities?: string[]
  skillsUsed?: string[]
  projects?: string[]
  achievements?: string[]
  references?: string[]
  attachments?: string[]
  createdAt: number
  updatedAt: number
}

export interface SkillRecord {
  _id?: string
  name: string
  level: number
  yearsOfExperience: number
  startDate?: string
  lastUsed?: string
  relatedProjects?: string[]
  certificates?: string[]
  backgroundImage?: string
  imageOpacity?: number
  notes?: string
  isFavorite?: boolean
  isArchived?: boolean
  createdAt: number
  updatedAt: number
}

export interface ProjectRecord {
  _id?: string
  title: string
  description: string
  status: 'Planning' | 'Active' | 'Completed' | 'On Hold'
  startDate: string
  endDate?: string
  technologies: string[]
  gitUrl?: string
  websiteUrl?: string
  screenshots?: string[]
  attachments?: string[]
  relatedSkills?: string[]
  createdAt: number
  updatedAt: number
}

export interface CertificateRecord {
  _id?: string
  name: string
  organization: string
  issueDate: string
  expiryDate?: string
  credentialId?: string
  credentialUrl?: string
  pdfAttachment?: string
  imageAttachment?: string
  relatedSkills?: string[]
  createdAt: number
  updatedAt: number
}

export interface AchievementRecord {
  _id?: string
  title: string
  date: string
  description?: string
  photos?: string[]
  certificates?: string[]
  attachments?: string[]
  notes?: string
  relatedEducation?: string
  relatedCareer?: string
  createdAt: number
  updatedAt: number
}

export interface UserProfile {
  _id?: string
  fullName: string
  email: string
  phone: string
  address: string
  dateOfBirth?: string
  gender?: string
  nationality?: string
  linkedin?: string
  github?: string
  website?: string
  photoPath?: string
  lastUpdated: number
  createdAt: number
}

export interface AppNotification {
  _id?: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'achievement' | 'milestone' | 'memory' | 'system' | 'annual_memory' | 'birthday'
  sourceModule?: string
  targetPath?: string // Route path to navigate to on click
  isRead: boolean
  timestamp: number
  metadata?: any
}

export interface MemoryCapsule {
  _id?: string
  title: string
  message: string
  status: 'locked' | 'unlocked' | 'opened'
  unlockDate: number // Timestamp when it can be opened
  createdAt: number
  openedAt?: number // Timestamp when it was actually opened
}

export interface SystemUnlock {
  _id?: string
  key: string // e.g., 'achievement:7-day-streak'
  unlockedAt: number
}

export interface CalendarMemory {
  _id?: string
  title: string
  description?: string
  month: number // 1-12
  day: number // 1-31
  createdYear: number
  photos?: string[]
  audio?: string[]
  files?: string[]
  originalCreatedAt: number
  updatedAt: number
}

export interface StorageSection {
  name: string
  size: number
  count: number
  items: { name: string; size: number }[]
}

export interface StorageFileType {
  type: string
  size: number
  count: number
}

export interface DriveInfo {
  path: string
  total: number
  free: number
  used: number
  percentUsed: number
}

export interface AppStorageInfo {
  totalAppSize: number
  maxAppSize: number | null
  fileCount: number
  sections: StorageSection[]
  fileTypes: StorageFileType[]
  drive: DriveInfo
  cacheSize: number
}
