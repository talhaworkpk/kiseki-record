import Datastore from '@seald-io/nedb'
import Store from 'electron-store'
import { app } from 'electron'
import { join } from 'path'

const userDataPath = app.getPath('userData')
const dataPath = join(userDataPath, 'data')

export const settingsStore = new Store()

export const db = {
  records: new Datastore({ filename: join(dataPath, 'records.db'), autoload: true }),
  goals: new Datastore({ filename: join(dataPath, 'goals.db'), autoload: true }),
  habits: new Datastore({ filename: join(dataPath, 'habits.db'), autoload: true }),
  habitLogs: new Datastore({ filename: join(dataPath, 'habitLogs.db'), autoload: true }),
  habitTimerSessions: new Datastore({ filename: join(dataPath, 'habitTimerSessions.db'), autoload: true }),
  habitBreaks: new Datastore({ filename: join(dataPath, 'habitBreaks.db'), autoload: true }),
  habitActivityLogs: new Datastore({ filename: join(dataPath, 'habitActivityLogs.db'), autoload: true }),
  relationships: new Datastore({ filename: join(dataPath, 'relationships.db'), autoload: true }),
  journal: new Datastore({ filename: join(dataPath, 'journal.db'), autoload: true }),
  conversations: new Datastore({ filename: join(dataPath, 'conversations.db'), autoload: true }),
  education: new Datastore({ filename: join(dataPath, 'education.db'), autoload: true }),
  career: new Datastore({ filename: join(dataPath, 'career.db'), autoload: true }),
  projects: new Datastore({ filename: join(dataPath, 'projects.db'), autoload: true }),
  skills: new Datastore({ filename: join(dataPath, 'skills.db'), autoload: true }),
  certificates: new Datastore({ filename: join(dataPath, 'certificates.db'), autoload: true }),
  achievements: new Datastore({ filename: join(dataPath, 'achievements.db'), autoload: true }),
  userProfile: new Datastore({ filename: join(dataPath, 'userProfile.db'), autoload: true }),
  notifications: new Datastore({ filename: join(dataPath, 'notifications.db'), autoload: true }),
  memoryCapsules: new Datastore({ filename: join(dataPath, 'memoryCapsules.db'), autoload: true }),
  systemUnlocks: new Datastore({ filename: join(dataPath, 'systemUnlocks.db'), autoload: true }),
  calendarMemories: new Datastore({ filename: join(dataPath, 'calendarMemories.db'), autoload: true }),
  actionGroups: new Datastore({ filename: join(dataPath, 'actionGroups.db'), autoload: true }),
  dreams: new Datastore({ filename: join(dataPath, 'dreams.db'), autoload: true }),
  dream_goals: new Datastore({ filename: join(dataPath, 'dream_goals.db'), autoload: true }),
  dream_projects: new Datastore({ filename: join(dataPath, 'dream_projects.db'), autoload: true }),
  dream_skills: new Datastore({ filename: join(dataPath, 'dream_skills.db'), autoload: true }),
  dream_certificates: new Datastore({ filename: join(dataPath, 'dream_certificates.db'), autoload: true }),
  clockAppearance: new Datastore({ filename: join(dataPath, 'clockAppearance.db'), autoload: true }),
  clockAssets: new Datastore({ filename: join(dataPath, 'clockAssets.db'), autoload: true }),
  clockAlarms: new Datastore({ filename: join(dataPath, 'clockAlarms.db'), autoload: true }),
  clockEvents: new Datastore({ filename: join(dataPath, 'clockEvents.db'), autoload: true }),
  relationshipConversations: new Datastore({ filename: join(dataPath, 'relationshipConversations.db'), autoload: true }),
  chronicle: new Datastore({ filename: join(dataPath, 'chronicle.db'), autoload: true }),
  chronicleRecords: new Datastore({ filename: join(dataPath, 'chronicleRecords.db'), autoload: true }),
}

// Ensure unique constraints if needed
// db.records.ensureIndex({ fieldName: 'id', unique: true })

export const dbAsync = {
  find: (collection: string, query: any): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      db[collection as keyof typeof db].find(query, (err: Error, docs: any[]) => {
        if (err) reject(err)
        else resolve(docs)
      })
    })
  },
  insert: (collection: string, doc: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      db[collection as keyof typeof db].insert(doc, (err: Error | null, newDoc: any) => {
        if (err) reject(err)
        else resolve(newDoc)
      })
    })
  },
  update: (collection: string, query: any, update: any, options: any = {}): Promise<number> => {
    return new Promise((resolve, reject) => {
      db[collection as keyof typeof db].update(query, update, options, (err: Error | null, numReplaced: number) => {
        if (err) reject(err)
        else resolve(numReplaced)
      })
    })
  },
  remove: (collection: string, query: any, options: any = {}): Promise<number> => {
    return new Promise((resolve, reject) => {
      db[collection as keyof typeof db].remove(query, options, (err: Error | null, numRemoved: number) => {
        if (err) reject(err)
        else resolve(numRemoved)
      })
    })
  }
}
