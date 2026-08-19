import { app, ipcMain } from 'electron'
import { join } from 'path'
import fs from 'fs'
import path from 'path'
import { dbAsync, settingsStore } from './database'
import { AppStorageInfo, StorageSection, StorageFileType, DriveInfo } from '../renderer/src/types'

const userDataPath = app.getPath('userData')
const dataPath = join(userDataPath, 'data')
const cachePath = app.getPath('cache')

function getFileSizeSafe(filePath: string): number {
  try {
    return fs.statSync(filePath).size
  } catch {
    return 0
  }
}

function getFolderSize(folderPath: string): { size: number, count: number } {
  let size = 0
  let count = 0
  try {
    if (!fs.existsSync(folderPath)) return { size, count }
    const files = fs.readdirSync(folderPath)
    for (const file of files) {
      const fullPath = join(folderPath, file)
      const stats = fs.statSync(fullPath)
      if (stats.isDirectory()) {
        const sub = getFolderSize(fullPath)
        size += sub.size
        count += sub.count
      } else {
        size += stats.size
        count++
      }
    }
  } catch {}
  return { size, count }
}

function extractFilePathsFromDoc(doc: any): string[] {
  let paths: string[] = []
  if (doc.attachments && Array.isArray(doc.attachments)) {
    paths.push(...doc.attachments.filter((p: string) => p.startsWith('file:///')))
  }
  if (doc.photos && Array.isArray(doc.photos)) {
    paths.push(...doc.photos.filter((p: string) => p.startsWith('file:///')))
  }
  if (doc.audio && Array.isArray(doc.audio)) {
    paths.push(...doc.audio.filter((p: string) => p.startsWith('file:///')))
  }
  if (doc.videos && Array.isArray(doc.videos)) {
    paths.push(...doc.videos.filter((p: string) => p.startsWith('file:///')))
  }
  if (doc.documents && Array.isArray(doc.documents)) {
    paths.push(...doc.documents.filter((p: string) => p.startsWith('file:///')))
  }
  if (doc.coverImage && doc.coverImage.startsWith('file:///')) {
    paths.push(doc.coverImage)
  }
  // Remove file:/// and fix slashes
  return paths.map(p => {
    let clean = p.replace(/^file:\/\/\//i, '')
    try { clean = decodeURIComponent(clean) } catch {}
    return clean
  })
}

const SECTION_CONFIG = [
  { collection: 'relationships', name: 'Relationships' },
  { collection: 'journal', name: 'Journal' },
  { collection: 'records', name: 'Records' },
  { collection: 'goals', name: 'Goals' },
  { collection: 'habits', name: 'Habits' },
  { collection: 'projects', name: 'Projects' },
  { collection: 'career', name: 'Career' },
  { collection: 'education', name: 'Education' },
  { collection: 'certificates', name: 'Certificates' },
  { collection: 'skills', name: 'Skills' },
  { collection: 'achievements', name: 'Achievements' },
  { collection: 'memoryCapsules', name: 'Memory Capsules' },
  { collection: 'calendarMemories', name: 'Calendar' }
]

export const storageService = {
  async getStorageInfo(mode: 'public' | 'private' | 'both' = 'both'): Promise<AppStorageInfo> {
    const sections: StorageSection[] = []
    let totalAppSize = 0
    let totalFileCount = 0
    const fileTypes: Record<string, StorageFileType> = {
      Images: { type: 'Images', size: 0, count: 0 },
      Videos: { type: 'Videos', size: 0, count: 0 },
      Audio: { type: 'Audio', size: 0, count: 0 },
      Documents: { type: 'Documents', size: 0, count: 0 },
      Database: { type: 'Database', size: 0, count: 0 },
      Other: { type: 'Other', size: 0, count: 0 }
    }

    for (const config of SECTION_CONFIG) {
      const section: StorageSection = { name: config.name, size: 0, count: 0, items: [] }
      let dbPath = join(dataPath, `${config.collection}.db`)
      let dbSize = getFileSizeSafe(dbPath)
      
      section.size += dbSize
      section.count += 1
      fileTypes.Database.size += dbSize
      fileTypes.Database.count += 1

      try {
        const query: any = {}
        if (mode === 'public') query.profile = 'public'
        else if (mode === 'private') query.profile = 'private'
        // if 'both', we leave query empty to fetch all
        
        const docs = await dbAsync.find(config.collection, query)
        for (const doc of docs) {
          // Attribute the database JSON footprint to the item as well
          const dbItemFootprint = Buffer.byteLength(JSON.stringify(doc), 'utf8')
          let itemSize = dbItemFootprint
          
          section.size += dbItemFootprint
          section.count += 1 // count the record itself

          const paths = extractFilePathsFromDoc(doc)
          for (const p of paths) {
            const size = getFileSizeSafe(p)
            itemSize += size
            section.size += size
            section.count += 1 // count each file
            
            const ext = path.extname(p).toLowerCase()
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
              fileTypes.Images.size += size
              fileTypes.Images.count += 1
            } else if (['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext)) {
              fileTypes.Videos.size += size
              fileTypes.Videos.count += 1
            } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
              fileTypes.Audio.size += size
              fileTypes.Audio.count += 1
            } else if (['.pdf', '.doc', '.docx', '.txt', '.csv'].includes(ext)) {
              fileTypes.Documents.size += size
              fileTypes.Documents.count += 1
            } else {
              fileTypes.Other.size += size
              fileTypes.Other.count += 1
            }
          }

          if (itemSize > 0) {
            section.items.push({
              name: doc.title || doc.name || doc.company || doc.school || doc.degree || 'Untitled',
              size: itemSize
            })
          }
        }
      } catch (err) {
        console.error(`Error calculating storage for ${config.name}:`, err)
      }

      section.items.sort((a, b) => b.size - a.size)
      sections.push(section)
      totalAppSize += section.size
      totalFileCount += section.count
    }

    const remainingDbs = ['habitLogs', 'habitTimerSessions', 'habitBreaks', 'habitActivityLogs', 'conversations', 'userProfile', 'notifications', 'systemUnlocks']
    let otherDbSize = 0
    let otherDbCount = 0
    for (const dbName of remainingDbs) {
      const dbPath = join(dataPath, `${dbName}.db`)
      const sz = getFileSizeSafe(dbPath)
      otherDbSize += sz
      if (sz > 0) otherDbCount++
    }
    
    if (otherDbSize > 0) {
      sections.push({ name: 'System Data', size: otherDbSize, count: otherDbCount, items: [] })
      totalAppSize += otherDbSize
      totalFileCount += otherDbCount
      fileTypes.Database.size += otherDbSize
      fileTypes.Database.count += otherDbCount
    }

    sections.sort((a, b) => b.size - a.size)
    const cacheStats = getFolderSize(cachePath)
    
    let driveInfo: DriveInfo = { path: userDataPath.substring(0, 3) || 'C:\\', total: 0, free: 0, used: 0, percentUsed: 0 }
    try {
      const stat = fs.statfsSync(userDataPath)
      const total = stat.bsize * stat.blocks
      const free = stat.bsize * stat.bfree
      const used = total - free
      driveInfo = {
        path: userDataPath.substring(0, 3).toUpperCase(),
        total,
        free,
        used,
        percentUsed: total > 0 ? (used / total) * 100 : 0
      }
    } catch (e) {
      console.error('Failed to get drive info', e)
    }

    const maxAppSize = settingsStore.get('maxAppSize', null) as number | null

    return {
      totalAppSize,
      maxAppSize,
      fileCount: totalFileCount,
      sections,
      fileTypes: Object.values(fileTypes).filter(ft => ft.size > 0).sort((a, b) => b.size - a.size),
      drive: driveInfo,
      cacheSize: cacheStats.size
    }
  },

  async clearCache(): Promise<number> {
    const stats = getFolderSize(cachePath)
    try {
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true })
        fs.mkdirSync(cachePath, { recursive: true })
      }
    } catch (e) {
      console.error('Failed to clear cache', e)
    }
    return stats.size
  },

  async setMaxAppSize(sizeInBytes: number | null) {
    settingsStore.set('maxAppSize', sizeInBytes)
  },

  async checkLimitsBeforeWrite(expectedBytes: number): Promise<{ allowed: boolean, reason?: string }> {
    const maxAppSize = settingsStore.get('maxAppSize', null) as number | null
    if (maxAppSize !== null) {
      const info = await this.getStorageInfo()
      if (info.totalAppSize + expectedBytes > maxAppSize) {
        return { allowed: false, reason: 'APP_LIMIT_REACHED' }
      }
    }
    try {
      const stat = fs.statfsSync(userDataPath)
      const free = stat.bsize * stat.bfree
      if (expectedBytes + (100 * 1024 * 1024) > free) {
        return { allowed: false, reason: 'DRIVE_LIMIT_REACHED' }
      }
    } catch (e) {}
    return { allowed: true }
  }
}

export function setupStorageHandlers() {
  ipcMain.handle('storage:getInfo', (_, mode) => storageService.getStorageInfo(mode))
  ipcMain.handle('storage:clearCache', () => storageService.clearCache())
  ipcMain.handle('storage:setMaxAppSize', (_, size) => storageService.setMaxAppSize(size))
  ipcMain.handle('storage:checkLimits', (_, size) => storageService.checkLimitsBeforeWrite(size))
}
