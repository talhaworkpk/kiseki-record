export type RetrievalSection = 
  | 'dashboard'
  | 'reports'
  | 'records'
  | 'journal'
  | 'habits'
  | 'relationships'
  | 'goals'
  | 'projects'
  | 'education'
  | 'career'
  | 'certificates'
  | 'achievements'
  | 'skills'
  | 'calendar'
  | 'memory_capsules'
  | 'notifications'
  | 'settings'
  | 'dreams'
  | 'clock'
  | 'unknown';

export type EntityOperation = 
  | 'list'
  | 'detail'
  | 'analytics'
  | 'timeline'
  | 'upcoming'
  | 'archived';

export type DashboardOperation = 
  | 'todayActivity'
  | 'currentProgress'
  | 'recentActivity'
  | 'statistics'
  | 'knowledgeGraph'
  | 'upcomingItems'
  | 'general';

export type ReportOperation =
  | 'mainReport'
  | 'timeline'
  | 'analytics'
  | 'statistics'
  | 'insights'
  | 'aiInsight';

export interface RetrievalDateRange {
  start?: number; // UNIX timestamp
  end?: number;   // UNIX timestamp
  semantic?: 'today' | 'yesterday' | 'tomorrow' | 'this_week' | 'last_week' | 'this_month' | 'this_year' | 'recent';
}

export interface RetrievalFilters {
  dateRange?: RetrievalDateRange;
  status?: 'active' | 'completed' | 'pending' | 'archived' | 'cancelled' | 'failed' | 'expired' | 'upcoming' | 'overdue';
  limit?: number;
  entityId?: string;
  entityName?: string;
}

export interface RetrievalIntent {
  section: RetrievalSection;
  operation?: string; // specific to section, e.g. DashboardOperation
  filters?: RetrievalFilters;
}

export interface DashboardDTO {
  type: 'goal' | 'habit' | 'record' | 'task';
  title: string;
  status: string;
  progress?: number;
  date?: string;
  relevance?: string;
}

export interface DashboardRetrievalResult {
  items: DashboardDTO[];
  summary?: string;
}

export interface ReportDTO {
  entityType: 'goal' | 'habit' | 'record' | 'project' | 'overview' | string;
  title?: string;
  metric?: string;
  value: number | string;
  date?: string;
  relevance?: string;
}

export interface ReportRetrievalResult {
  title: string;
  dateRange?: string;
  data: ReportDTO[];
  summary?: string;
}
