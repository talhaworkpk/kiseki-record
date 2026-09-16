import { DashboardRetrievalResult, RetrievalFilters, DashboardDTO } from '../retrieval/RetrievalTypes';
import { Goal, Habit, ProjectRecord } from '../../../../types';

export class DashboardRetrievalService {
  /**
   * Main router for dashboard operations
   */
  public static async executeOperation(operation: string, filters: RetrievalFilters): Promise<DashboardRetrievalResult> {
    console.log(`[DashboardRetrieval] Executing operation: ${operation}`, filters);
    
    switch (operation) {
      case 'todayActivity':
        return this.getTodayActivity();
      case 'currentProgress':
        return this.getCurrentProgress();
      case 'recentActivity':
        return this.getRecentActivity(filters.limit || 5);
      case 'upcomingItems':
        return this.getUpcomingItems();
      default:
        // Default to today's overview
        return this.getTodayActivity();
    }
  }

  private static async getTodayActivity(): Promise<DashboardRetrievalResult> {
    // @ts-ignore
    const db = window.api.db;
    const items: DashboardDTO[] = [];
    
    // 1. Get active goals
    const activeGoals: Goal[] = await db.find('goals', { status: 'Active', deletedAt: { $exists: false } });
    for (const goal of activeGoals) {
      items.push({
        type: 'goal',
        title: goal.title,
        status: goal.status,
        progress: goal.progress,
        relevance: 'Active goal to work on'
      });
    }

    // 2. Get active habits
    const activeHabits: Habit[] = await db.find('habits', { status: 'Active', deletedAt: { $exists: false } });
    for (const habit of activeHabits) {
      items.push({
        type: 'habit',
        title: habit.title,
        status: habit.status,
        relevance: `Frequency: ${habit.frequency?.type || 'unknown'}`
      });
    }

    // Sort by type and return top items to keep context minimal
    // A more advanced version would filter purely by "scheduled for today" using DB logic
    return {
      items: items.slice(0, 10),
      summary: `You have ${activeGoals.length} active goals and ${activeHabits.length} active habits.`
    };
  }

  private static async getCurrentProgress(): Promise<DashboardRetrievalResult> {
    // @ts-ignore
    const db = window.api.db;
    
    const goals: Goal[] = await db.find('goals', { deletedAt: { $exists: false } });
    const completedGoals = goals.filter(g => g.status === 'Completed').length;
    const activeGoals = goals.filter(g => g.status === 'Active').length;
    
    const items: DashboardDTO[] = [
      { type: 'goal', title: 'Total Active Goals', status: activeGoals.toString() },
      { type: 'goal', title: 'Total Completed Goals', status: completedGoals.toString() }
    ];
    
    return {
      items,
      summary: 'High-level progress statistics.'
    };
  }

  private static async getRecentActivity(limit: number): Promise<DashboardRetrievalResult> {
    // @ts-ignore
    const db = window.api.db;
    const items: DashboardDTO[] = [];
    
    // Fetch recent goals
    const goals: Goal[] = await db.find('goals', { deletedAt: { $exists: false } });
    goals.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    for (const g of goals.slice(0, limit)) {
      items.push({ type: 'goal', title: g.title, status: g.status, date: new Date(g.updatedAt || Date.now()).toISOString().split('T')[0] });
    }
    
    return {
      items: items.slice(0, limit),
      summary: 'Recent application activity.'
    };
  }

  private static async getUpcomingItems(): Promise<DashboardRetrievalResult> {
    // @ts-ignore
    const db = window.api.db;
    const items: DashboardDTO[] = [];
    const now = Date.now();
    
    const goals: Goal[] = await db.find('goals', { status: 'Active', deletedAt: { $exists: false } });
    // Filter goals that have deadlines in the future
    const upcomingGoals = goals.filter(g => {
      if (!g.targetDate) return false;
      const t = new Date(g.targetDate).getTime();
      return t > now && t < now + (7 * 24 * 60 * 60 * 1000); // within 7 days
    });
    
    for (const g of upcomingGoals) {
      items.push({ type: 'goal', title: g.title, status: g.status, date: g.targetDate });
    }
    
    return {
      items,
      summary: upcomingGoals.length > 0 ? 'These items are due soon.' : 'Nothing due in the next 7 days.'
    };
  }
}
