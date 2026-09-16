import { RetrievalFilters, RetrievalSection, ReportDTO } from '../RetrievalTypes';

export class EntityRetrievalService {
  /**
   * Generic router for targeted Phase 4 queries.
   */
  public static async fetchEntityContext(section: RetrievalSection, filters: RetrievalFilters, operation?: string): Promise<ReportDTO[]> {
    console.log(`[EntityRetrieval] Fetching ${section}`, filters);
    
    // @ts-ignore
    const db = window.api.db;
    const data: ReportDTO[] = [];
    let collectionName = '';

    // Map section to db collection
    switch (section) {
      case 'goals': collectionName = 'goals'; break;
      case 'habits': collectionName = 'habits'; break;
      case 'projects': collectionName = 'projects'; break;
      case 'records': collectionName = 'records'; break;
      case 'journal': collectionName = 'journal'; break;
      case 'relationships': collectionName = 'relationships'; break;
      case 'education': collectionName = 'education'; break;
      case 'career': collectionName = 'career'; break;
      case 'certificates': collectionName = 'certificates'; break;
      case 'achievements': collectionName = 'achievements'; break;
      case 'skills': collectionName = 'skills'; break;
      case 'calendar': collectionName = 'calendarMemories'; break;
      case 'memory_capsules': collectionName = 'memoryCapsules'; break;
      case 'notifications': collectionName = 'notifications'; break;
      case 'dreams': collectionName = 'dreams'; break;
      case 'clock': collectionName = 'clockEvents'; break;
      default: return [];
    }

    try {
      const dbQuery: any = { deletedAt: { $exists: false } };

      if (filters.status) {
        // Simple mapping, might need more specific mappings per entity later
        if (filters.status === 'active') dbQuery.status = 'Active';
        if (filters.status === 'completed') dbQuery.status = 'Completed';
        if (filters.status === 'archived') dbQuery.status = 'Archived';
      }

      // In a real app, dateRange semantic mapping to timestamps would happen here:
      // if (filters.dateRange?.semantic === 'today') { dbQuery.updatedAt = { $gte: startOfDay, $lte: endOfDay }; }

      let results: any[] = await db.find(collectionName, dbQuery);
      
      // If fetching records, also fetch memory capsules since users refer to both as memories/stories
      if (section === 'records') {
        try {
          const capsules = await db.find('memoryCapsules', dbQuery);
          // Standardize memory capsules to look somewhat like records
          const mappedCapsules = capsules.map((c: any) => ({ ...c, type: 'Memory Capsule' }));
          results = [...results, ...mappedCapsules];
        } catch (e) {}
      }
      
      // Sort by recency
      results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      // If it's just a count operation, skip building the detailed list
      if (operation === 'count' || operation === 'statistics') {
        data.push({
          entityType: section as any,
          title: `Total ${section.charAt(0).toUpperCase() + section.slice(1)} Count`,
          metric: 'Count',
          value: results.length,
          relevance: `There are a total of ${results.length} ${section} matching the query.`
        });
        
        // Still allow relationships to append their attached record counts if needed
        if (section === 'relationships') {
          for (const r of results) {
            try {
              const relatedRecords = await db.find('records', {});
              const allMatchingRecords = relatedRecords.filter((rec: any) => rec.people && (rec.people.includes(r._id) || rec.people.includes(r.fullName) || rec.people.includes(r.name)));
              if (allMatchingRecords.length > 0) {
                 const typeCounts = allMatchingRecords.reduce((acc: any, rec: any) => {
                  const t = rec.type || 'Record';
                  acc[t] = (acc[t] || 0) + 1;
                  return acc;
                }, {});
                const breakdown = Object.entries(typeCounts).map(([t, c]) => `${c} ${t}s`).join(', ');
                data.push({
                  entityType: section as any,
                  title: `${r.fullName || r.name || 'Relationship'} Attached Items`,
                  metric: 'Total',
                  value: allMatchingRecords.length,
                  relevance: `(${breakdown})`
                });
              }
            } catch(e) {}
          }
        }
        return data;
      }

      // Apply limit
      if (filters.limit) {
        results = results.slice(0, filters.limit);
      } else {
        // Hard limit to prevent blowing up context anyway
        results = results.slice(0, 20); 
      }

      for (const r of results) {
        let title = r.title || r.name || (section === 'clock' ? r.label : undefined) || 'Untitled';
        let relevance: string | undefined = undefined;

        if (section === 'relationships') {
          // If this is the "myself" relationship, annotate it
          if (typeof r._id === 'string' && r._id.startsWith('self_')) {
            title = `${title} (Me / Myself)`;
            relevance = 'This is the user\'s own profile in Relationships.';
          }

          // Fetch the latest 3 records (memories) attached to this relationship
          try {
            const relatedRecords = await db.find('records', {});
            // Filter records where `people` array contains this relationship's ID or exact name
            const allMatchingRecords = relatedRecords
              .filter((rec: any) => rec.people && (rec.people.includes(r._id) || rec.people.includes(r.fullName) || rec.people.includes(r.name)))
              .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
              
            const matchingRecords = allMatchingRecords.slice(0, 10);
            
            if (allMatchingRecords.length > 0) {
              const typeCounts = allMatchingRecords.reduce((acc: any, rec: any) => {
                const t = rec.type || 'Record';
                acc[t] = (acc[t] || 0) + 1;
                return acc;
              }, {});
              const breakdown = Object.entries(typeCounts).map(([t, c]) => `${c} ${t}s`).join(', ');

              if (operation === 'count' || operation === 'statistics') {
                relevance = (relevance ? relevance + ' ' : '') + `Total Attached Items: ${allMatchingRecords.length} (${breakdown}).`;
              } else {
                relevance = (relevance ? relevance + ' ' : '') + 
                  `Attached Items (Total Count: ${allMatchingRecords.length} -> ${breakdown}${allMatchingRecords.length > 10 ? ', showing latest 10' : ''}): ` + 
                  matchingRecords.map((rec: any) => `[${rec.type || 'Record'}] '${rec.title || rec.description}'`).join(', ');
              }
            }
          } catch (e) {}
        }

        // Include the actual content/description for records or memories (often called "story mode")
        // ONLY if we are not just doing a count/stats query
        if ((r.description || r.message) && operation !== 'count' && operation !== 'statistics') {
          const content = r.description || r.message;
          relevance = (relevance ? relevance + ' | ' : '') + `Content/Story: ${content.substring(0, 300)}${content.length > 300 ? '...' : ''}`;
        }

        let itemDate = r.updatedAt ? new Date(r.updatedAt).toISOString().split('T')[0] : undefined;
        
        // For calendar memories, the actual event date is month/day
        if (section === 'calendar' && r.month && r.day) {
          const m = r.month.toString().padStart(2, '0');
          const d = r.day.toString().padStart(2, '0');
          const y = r.createdYear || new Date().getFullYear();
          itemDate = `${y}-${m}-${d}`;
        } else if (section === 'clock' && r.timestamp) {
          itemDate = new Date(r.timestamp).toISOString().split('T')[0];
        }

        data.push({
          entityType: section as any,
          title: title,
          metric: 'Status',
          value: r.status || r.relationshipScore || r.type || 'N/A',
          date: itemDate,
          ...(relevance ? { relevance } : {}) 
        });
      }

    } catch (e) {
      console.error(`[EntityRetrieval] Failed to fetch ${collectionName}:`, e);
    }

    return data;
  }
}
