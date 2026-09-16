import { RetrievalIntent, RetrievalSection, DashboardOperation, RetrievalFilters, RetrievalDateRange } from './RetrievalTypes';

export class IntentResolver {
  /**
   * Analyzes the user's prompt to determine the retrieval intent.
   * For Phase 4, this focuses on identifying targeted scopes.
   */
  public static resolve(prompt: string): RetrievalIntent {
    const text = prompt.toLowerCase();
    
    const filters = this.extractFilters(text);
    
    // 1. Dashboard Intent Detection
    if (this.isDashboardIntent(text)) {
      let operation: DashboardOperation = 'general';
      
      if (text.includes('today') || text.includes('today\'s')) {
        operation = 'todayActivity';
        filters.dateRange = { semantic: 'today' };
      } else if (text.includes('progress') || text.includes('how am i doing')) {
        operation = 'currentProgress';
      } else if (text.includes('recent') || text.includes('recently')) {
        operation = 'recentActivity';
        filters.dateRange = { semantic: 'recent' };
      } else if (text.includes('upcoming')) {
        operation = 'upcomingItems';
      } else if (text.includes('statistic') || text.includes('stats')) {
        operation = 'statistics';
      } else if (text.includes('graph') || text.includes('knowledge')) {
        operation = 'knowledgeGraph';
      }
      
      return { section: 'dashboard', operation, filters };
    }

    // 2. Reports Intent Detection
    if (this.isReportIntent(text)) {
      let operation = 'mainReport';
      
      if (text.includes('timeline') || text.includes('changed')) {
        operation = 'timeline';
      } else if (text.includes('analytic') || text.includes('analysis')) {
        operation = 'analytics';
      } else if (text.includes('insight')) {
        operation = 'insights';
      } else if (text.includes('statistic') || text.includes('stats')) {
        operation = 'statistics';
      }
      
      // Determine entity filters for reports
      if (text.includes('goal')) filters.entityName = 'goal';
      else if (text.includes('habit')) filters.entityName = 'habit';
      else if (text.includes('project')) filters.entityName = 'project';
      else if (text.includes('record')) filters.entityName = 'record';
      
      return { section: 'reports', operation, filters };
    }
    
    // 3. Entity/Section Intent Detection (Phase 4.3 - 4.14)
    let entityOperation = 'list';
    if (text.includes('how many') || text.includes('count') || text.includes('total') || text.includes('number of')) {
      entityOperation = 'count';
    } else if (text.includes('statistic') || text.includes('stats')) {
      entityOperation = 'statistics';
    }

    if (text.includes('journal') || text.includes('write')) return { section: 'journal', operation: entityOperation, filters };
    if (text.includes('record') || text.includes('story mode')) return { section: 'records', operation: entityOperation, filters };
    if (text.includes('habit')) return { section: 'habits', operation: entityOperation, filters };
    if (text.includes('relationship') || text.includes('person') || text.includes('people') || text.includes('myself')) return { section: 'relationships', operation: entityOperation, filters };
    if (text.includes('education') || text.includes('degree')) return { section: 'education', operation: entityOperation, filters };
    if (text.includes('career') || text.includes('job') || text.includes('work')) return { section: 'career', operation: entityOperation, filters };
    if (text.includes('certificate')) return { section: 'certificates', operation: entityOperation, filters };
    if (text.includes('achievement')) return { section: 'achievements', operation: entityOperation, filters };
    if (text.includes('skill') || text.includes('learn')) return { section: 'skills', operation: entityOperation, filters };
    if (text.includes('calendar') || text.includes('event')) return { section: 'calendar', operation: entityOperation, filters };
    if (text.includes('capsule') || text.includes('memory')) return { section: 'memory_capsules', operation: entityOperation, filters };
    if (text.includes('notification')) return { section: 'notifications', operation: entityOperation, filters };
    if (text.includes('setting') || text.includes('preference')) return { section: 'settings', operation: entityOperation, filters };
    if (text.includes('dream')) return { section: 'dreams', operation: entityOperation, filters };
    if (text.includes('clock') || text.includes('stopwatch') || text.includes('timer') || text.includes('alarm')) return { section: 'clock', operation: entityOperation, filters };

    // Fallback Phase 2 logic mapped to Phase 4 structure
    if (text.includes('goal') || text.includes('objective') || text.includes('target')) {
      return { section: 'goals', operation: entityOperation, filters };
    } else if (text.includes('project') || text.includes('task')) {
      return { section: 'projects', operation: entityOperation, filters };
    }
    
    return { section: 'unknown', filters };
  }

  private static isDashboardIntent(text: string): boolean {
    const dashboardKeywords = [
      'dashboard', 
      'overview', 
      'summary', 
      'what is happening', 
      'what do i need to do',
      'what\'s happening',
      'current progress'
    ];
    
    return dashboardKeywords.some(keyword => text.includes(keyword)) || 
           (text.includes('today') && !text.includes('report') && !text.includes('record') && !text.includes('journal') && !text.includes('habit'));
  }

  private static isReportIntent(text: string): boolean {
    const reportKeywords = [
      'report',
      'analytics',
      'statistics',
      'timeline',
      'insights',
      'what changed'
    ];
    return reportKeywords.some(keyword => text.includes(keyword));
  }

  private static extractFilters(text: string): RetrievalFilters {
    const filters: RetrievalFilters = {};
    
    // Status filters
    if (text.includes('active') || text.includes('current')) filters.status = 'active';
    else if (text.includes('completed') || text.includes('done') || text.includes('finished')) filters.status = 'completed';
    else if (text.includes('archived')) filters.status = 'archived';
    
    // Semantic dates
    if (text.includes('today')) filters.dateRange = { semantic: 'today' };
    else if (text.includes('yesterday')) filters.dateRange = { semantic: 'yesterday' };
    else if (text.includes('tomorrow')) filters.dateRange = { semantic: 'tomorrow' };
    else if (text.includes('this week')) filters.dateRange = { semantic: 'this_week' };
    else if (text.includes('last week')) filters.dateRange = { semantic: 'last_week' };
    else if (text.includes('this month')) filters.dateRange = { semantic: 'this_month' };
    else if (text.includes('this year')) filters.dateRange = { semantic: 'this_year' };
    else if (text.includes('recent')) filters.dateRange = { semantic: 'recent' };
    
    // Limit filters
    const limitMatch = text.match(/latest\s+(\d+)|last\s+(\d+)|top\s+(\d+)/);
    if (limitMatch) {
      const num = parseInt(limitMatch[1] || limitMatch[2] || limitMatch[3]);
      if (!isNaN(num)) filters.limit = num;
    } else if (text.includes('latest') || text.includes('last') || text.includes('most recent')) {
      filters.limit = 1;
    }
    
    return filters;
  }
}
