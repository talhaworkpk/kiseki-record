import { app, ipcMain, session } from 'electron'
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
  { collection: 'calendarMemories', name: 'Calendar' },
  { collection: 'actionGroups', name: 'AI Assistant Data' },
  { collection: 'dreams', name: 'Dreams' },
  { collection: 'dream_goals', name: 'Dream Goals' },
  { collection: 'dream_projects', name: 'Dream Projects' },
  { collection: 'dream_skills', name: 'Dream Skills' },
  { collection: 'dream_certificates', name: 'Dream Certificates' },
  { collection: 'clockAppearance', name: 'Clock Appearance' },
  { collection: 'clockAssets', name: 'Clock Assets' },
  { collection: 'clockAlarms', name: 'Clock Alarms' },
  { collection: 'clockEvents', name: 'Clock Events' },
  { collection: 'relationshipConversations', name: 'Relationship Conversations' }
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
            let itemName = doc.title || doc.name || doc.label || doc.company || doc.school || doc.degree;
            
            if (config.collection === 'clockAssets') {
              itemName = `Asset: ${doc.originalName || doc.storedName || doc._id}`;
            } else if (config.collection === 'clockEvents') {
              const eventType = doc.type ? doc.type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Event';
              itemName = `${eventType}${doc.label ? ` - ${doc.label}` : ''}`;
            } else if (config.collection === 'clockAlarms') {
              itemName = `Alarm: ${doc.time || ''} ${doc.label ? `(${doc.label})` : ''}`.trim() || `Alarm (${doc._id})`;
            }

            if (!itemName) {
              if (config.collection === 'journal') {
                const preview = doc.content ? doc.content.replace(/<[^>]*>?/gm, '').trim().substring(0, 25) : '';
                itemName = preview ? `"${preview}..."` : `Journal on ${doc.date || 'Unknown'}`;
              } else if (config.collection === 'actionGroups') {
                itemName = `Agent Task (${doc.actionGroupId ? doc.actionGroupId.replace('group_', '').substring(0, 6) : (doc._id ? doc._id.substring(0,6) : 'Unknown')})`;
              } else if (config.collection === 'relationshipConversations') {
                if (doc.personId === 'self_p' || doc.personId?.startsWith('self_')) itemName = 'Personal Notes Chat';
                else {
                  try {
                    const persons = await dbAsync.find('relationships', { _id: doc.personId });
                    if (persons && persons[0] && (persons[0].name || persons[0].title)) itemName = `Chat with ${persons[0].name || persons[0].title}`;
                  } catch (e) {}
                  if (!itemName) itemName = `Chat (${doc.personId ? doc.personId.replace('rel_', '').substring(0, 6) : 'Unknown'})`;
                }
              } else if (config.collection === 'dream_goals') {
                try {
                  const goals = await dbAsync.find('goals', { _id: doc.goalId });
                  if (goals && goals[0] && (goals[0].title || goals[0].name)) itemName = `Goal: ${goals[0].title || goals[0].name}`;
                } catch (e) {}
              } else if (config.collection === 'dream_projects') {
                try {
                  const projs = await dbAsync.find('projects', { _id: doc.projectId });
                  if (projs && projs[0] && (projs[0].title || projs[0].name)) itemName = `Project: ${projs[0].title || projs[0].name}`;
                } catch (e) {}
              } else if (config.collection === 'dream_skills') {
                try {
                  const skills = await dbAsync.find('skills', { _id: doc.skillId });
                  if (skills && skills[0] && (skills[0].title || skills[0].name)) itemName = `Skill: ${skills[0].title || skills[0].name}`;
                } catch (e) {}
              } else if (config.collection === 'dream_certificates') {
                try {
                  const certs = await dbAsync.find('certificates', { _id: doc.certificateId });
                  if (certs && certs[0] && (certs[0].title || certs[0].name)) itemName = `Cert: ${certs[0].title || certs[0].name}`;
                } catch (e) {}
              } else if (config.collection === 'clockAppearance') {
                itemName = 'Custom Clock Appearance';
              }
              
              if (!itemName) {
                itemName = `${config.name} Item (${doc._id ? doc._id.substring(0,6) : 'Unknown'})`;
              }
            }
            
            section.items.push({
              name: itemName,
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
    
    const drivePath = process.platform === 'win32' ? userDataPath.substring(0, 3).toUpperCase() : '/'
    let driveInfo: DriveInfo = { path: drivePath, total: 0, free: 0, used: 0, percentUsed: 0 }
    try {
      const stat = fs.statfsSync(userDataPath)
      const total = stat.bsize * stat.blocks
      const free = stat.bsize * stat.bfree
      const used = total - free
      driveInfo = {
        path: drivePath,
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
    const beforeStats = getFolderSize(cachePath)
    
    try {
      if (session.defaultSession) {
        await session.defaultSession.clearCache()
        await session.defaultSession.clearStorageData({ storages: ['cache', 'shadercache'] })
      }
    } catch (e) {
      console.error('Failed to clear electron cache', e)
    }

    try {
      if (fs.existsSync(cachePath)) {
        const files = fs.readdirSync(cachePath)
        for (const file of files) {
          try {
            fs.rmSync(join(cachePath, file), { recursive: true, force: true })
          } catch(e) {} // skip locked files
        }
      }
    } catch (e) {
      console.error('Failed to manually clear cache folder', e)
    }
    
    const afterStats = getFolderSize(cachePath)
    const freed = beforeStats.size - afterStats.size
    return freed > 0 ? freed : 0
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
  },

  async resetData(mode: 'public' | 'private' | 'both'): Promise<boolean> {
    try {
      for (const config of SECTION_CONFIG) {
        if (mode === 'both') {
          await dbAsync.remove(config.collection, {}, { multi: true });
        } else {
          await dbAsync.remove(config.collection, { profile: mode }, { multi: true });
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to reset data', err);
      return false;
    }
  }
}

export function setupStorageHandlers() {
  ipcMain.handle('storage:getInfo', (_, mode) => storageService.getStorageInfo(mode))
  ipcMain.handle('storage:clearCache', () => storageService.clearCache())
  ipcMain.handle('storage:setMaxAppSize', (_, size) => storageService.setMaxAppSize(size))
  ipcMain.handle('storage:checkLimits', (_, size) => storageService.checkLimitsBeforeWrite(size))
  ipcMain.handle('storage:resetData', (_, mode) => storageService.resetData(mode))
}
