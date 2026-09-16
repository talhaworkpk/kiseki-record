import { KisekiRetrievalEngine } from '../retrieval/KisekiRetrievalEngine';
import { IntentResolver } from '../retrieval/IntentResolver';

export class EntityResolver {
  /**
   * Resolves a natural language query for an entity to a specific ID.
   * If the query is ambiguous, it returns an error forcing the AI to ask the user.
   */
  public static async resolve(entityType: string, query: string): Promise<string | null> {
    try {
      // Re-use Phase 4 Retrieval logic to find entities.
      const intent = IntentResolver.resolve(query);
      
      // Override section if we know the entityType explicitly
      let section = entityType + 's'; // e.g. goal -> goals
      if (entityType === 'relationship') section = 'relationships';
      
      // We will perform a highly targeted search
      // @ts-ignore
      const results = await window.api.db.find(section, { deletedAt: { $exists: false } });
      
      // Simple filter based on query (can be upgraded with embeddings later)
      const matches = results.filter(r => 
        (r.title && r.title.toLowerCase().includes(query.toLowerCase())) ||
        (r.name && r.name.toLowerCase().includes(query.toLowerCase()))
      );

      if (matches.length === 1) {
        return matches[0]._id;
      }
      
      if (matches.length > 1) {
        throw new Error(`Ambiguous resolution. I found ${matches.length} ${entityType}s matching "${query}". Please specify which one.`);
      }

      return null;
    } catch (e: any) {
      if (e.message.includes('Ambiguous')) {
        throw e;
      }
      return null;
    }
  }
}
