import { Goal, ProjectRecord } from '../../types'

export class KisekiSearchService {
  /**
   * Search Goals with a hard limit of 5.
   */
  public static async searchGoals(options?: { status?: string, limit?: number }): Promise<Goal[]> {
    try {
      // @ts-ignore
      const db = window.api.db
      const query: any = { deletedAt: { $exists: false } }
      
      const records = await db.find('goals', query)
      
      const sorted = records.sort((a: Goal, b: Goal) => {
        if (a.status === 'Active' && b.status !== 'Active') return -1
        if (a.status !== 'Active' && b.status === 'Active') return 1
        return b.progress - a.progress
      })
      
      const limit = options?.limit || 5
      return sorted.slice(0, limit)
    } catch (e) {
      console.error('[KisekiSearchService] Failed to search goals:', e)
      return []
    }
  }

  /**
   * Search Projects with a hard limit of 5.
   */
  public static async searchProjects(options?: { status?: string, limit?: number }): Promise<ProjectRecord[]> {
    try {
      // @ts-ignore
      const db = window.api.db
      const query: any = { deletedAt: { $exists: false } }
      
      const records = await db.find('projects', query)
      
      const sorted = records.sort((a: ProjectRecord, b: ProjectRecord) => {
        if (a.status === 'Active' && b.status !== 'Active') return -1
        if (a.status !== 'Active' && b.status === 'Active') return 1
        return b.updatedAt - a.updatedAt
      })
      
      const limit = options?.limit || 5
      return sorted.slice(0, limit)
    } catch (e) {
      console.error('[KisekiSearchService] Failed to search projects:', e)
      return []
    }
  }
}
