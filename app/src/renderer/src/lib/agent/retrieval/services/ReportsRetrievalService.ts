import { ReportRetrievalResult, RetrievalFilters, ReportDTO } from '../retrieval/RetrievalTypes';
import { Goal, Habit, ProjectRecord, JournalEntry } from '../../../../types';

export class ReportsRetrievalService {
  /**
   * Main router for reports operations
   */
  public static async executeOperation(operation: string, filters: RetrievalFilters): Promise<ReportRetrievalResult> {
    console.log(`[ReportsRetrieval] Executing operation: ${operation}`, filters);
    
    switch (operation) {
      case 'mainReport':
        return this.getMainReport(filters);
      case 'timeline':
        return this.getTimeline(filters);
      case 'analytics':
      case 'statistics':
        return this.getAnalytics(filters);
      case 'insights':
      case 'aiInsight':
        return this.getInsights(filters);
      default:
        return this.getMainReport(filters);
    }
  }

  private static async getMainReport(filters: RetrievalFilters): Promise<ReportRetrievalResult> {
    // @ts-ignore
    const db = window.api.db;
    const data: ReportDTO[] = [];
    
    let title = 'Main Report';
    let summary = 'Overview of activity.';

    // If filtering by entity, restrict data
    const entity = filters.entityName;
    
    if (!entity || entity === 'goal') {
      const goals: Goal[] = await db.find('goals', { deletedAt: { $exists: false } });
      const completed = goals.filter(g => g.status === 'Completed').length;
      data.push({ entityType: 'goal', metric: 'Total Completed', value: completed });
    }
    
    if (!entity || entity === 'habit') {
      const habits: Habit[] = await db.find('habits', { deletedAt: { $exists: false } });
      const active = habits.filter(h => h.status === 'Active').length;
      data.push({ entityType: 'habit', metric: 'Total Active', value: active });
    }
    
    if (!entity || entity === 'project') {
      const projects: ProjectRecord[] = await db.find('projects', { deletedAt: { $exists: false } });
      data.push({ entityType: 'project', metric: 'Total Projects', value: projects.length });
    }

    if (filters.dateRange?.semantic) {
      title += ` - ${filters.dateRange.semantic}`;
    }

    return { title, data, summary };
  }

  private static async getTimeline(filters: RetrievalFilters): Promise<ReportRetrievalResult> {
    // @ts-ignore
    const db = window.api.db;
    const data: ReportDTO[] = [];
    
    // Fetch recent items and sort by creation/update time to simulate a timeline
    const goals: Goal[] = await db.find('goals', { deletedAt: { $exists: false } });
    goals.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    const limit = filters.limit || 10;
    
    for (const g of goals.slice(0, limit)) {
      data.push({
        entityType: 'goal',
        title: g.title,
        metric: 'Status Changed',
        value: g.status,
        date: new Date(g.updatedAt || Date.now()).toISOString().split('T')[0]
      });
    }
    
    return {
      title: 'Timeline Report',
      summary: 'Chronological timeline of recent changes.',
      data
    };
  }

  private static async getAnalytics(filters: RetrievalFilters): Promise<ReportRetrievalResult> {
    // @ts-ignore
    const db = window.api.db;
    const data: ReportDTO[] = [];
    
    if (filters.entityName === 'habit' || !filters.entityName) {
      const habits: Habit[] = await db.find('habits', { deletedAt: { $exists: false } });
      const total = habits.length;
      data.push({ entityType: 'habit', metric: 'Habit Count', value: total });
    }
    
    if (filters.entityName === 'goal' || !filters.entityName) {
      const goals: Goal[] = await db.find('goals', { deletedAt: { $exists: false } });
      const avgProgress = goals.length > 0 ? goals.reduce((acc, g) => acc + (g.progress || 0), 0) / goals.length : 0;
      data.push({ entityType: 'goal', metric: 'Average Progress', value: `${Math.round(avgProgress)}%` });
    }

    return {
      title: 'Analytics Report',
      summary: 'Statistical analytics across requested modules.',
      data
    };
  }

  private static async getInsights(filters: RetrievalFilters): Promise<ReportRetrievalResult> {
    // For insights, we just return a summary of key metrics
    return this.getAnalytics(filters);
  }
}
