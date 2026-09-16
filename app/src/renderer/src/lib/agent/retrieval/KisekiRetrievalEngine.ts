import { IntentResolver } from './IntentResolver';
import { DashboardRetrievalService } from './services/DashboardRetrievalService';
import { ReportsRetrievalService } from './services/ReportsRetrievalService';
import { EntityRetrievalService } from './services/EntityRetrievalService';
import { PrivacyGuard } from './PrivacyGuard';
import { KisekiContextBuilder } from '../KisekiContextBuilder';
import { KisekiSearchService } from '../KisekiSearchService';

export class KisekiRetrievalEngine {
  /**
   * Main entry point for Phase 4 Retrieval Pipeline
   */
  public static async process(lastUserMessage: string, allMessages: any[]): Promise<string> {
    if (!lastUserMessage) return '';
    
    // 1. Resolve Intent
    let intent = IntentResolver.resolve(lastUserMessage);
    console.log(`[RetrievalEngine] Resolved intent:`, intent);
    
    // Phase 4.15 Privacy Guard
    intent = await PrivacyGuard.enforce(intent);
    
    let dbContext = '';
    
    try {
      // 2. Route to appropriate service
      switch (intent.section) {
        case 'dashboard':
          const dashboardResult = await DashboardRetrievalService.executeOperation(intent.operation || 'general', intent.filters || {});
          dbContext = KisekiContextBuilder.buildDashboardContext(dashboardResult);
          break;
          
        case 'reports':
          const reportResult = await ReportsRetrievalService.executeOperation(intent.operation || 'mainReport', intent.filters || {});
          dbContext = KisekiContextBuilder.buildReportsContext(reportResult);
          break;
          
        case 'unknown':
          console.log(`[RetrievalEngine] Unknown section, skipping targeted retrieval.`);
          break;
          
        default:
          // Phase 4.3 - 4.14 (Entity queries)
          const entityData = await EntityRetrievalService.fetchEntityContext(intent.section, intent.filters || {}, intent.operation);
          dbContext = KisekiContextBuilder.buildReportsContext({
            title: `${intent.section.toUpperCase()} Data`,
            data: entityData,
            summary: `Retrieved records for ${intent.section}`
          });
          
          if (intent.section === 'calendar') {
            const lUser = lastUserMessage.toLowerCase();
            if (!lUser.includes('calendar') && !lUser.includes('calender')) {
              dbContext += "\n[SYSTEM INSTRUCTION]\nNote: The user asked about 'events' but didn't specify which kind. You just retrieved Calendar events. If appropriate, casually ask the user if they were looking for their Calendar events, or if they meant 'Relationship Events' (events attached to a person's profile).\n";
            }
          }
          break;
      }
      
      console.log(`[RetrievalEngine] Context size generated: ${dbContext.length} chars`);
    } catch (error) {
      console.error('[RetrievalEngine] Retrieval failed:', error);
      dbContext = "[KISEKI CONTEXT]\nFailed to retrieve context data. Proceeding without external context.\n[/KISEKI CONTEXT]\n\n";
    }
    
    return dbContext;
  }
}
