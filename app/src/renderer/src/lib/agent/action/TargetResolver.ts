import { AgentAction } from './ActionTypes';
import { goalService } from '../../domain/GoalService';
import { projectService } from '../../domain/ProjectService';
import { skillService } from '../../domain/SkillService';

export class TargetResolver {
  
  /**
   * Resolves textual queries into unique database IDs.
   * Returns an error message if any target is unresolvable or ambiguous.
   * Returns null if all resolutions succeed.
   */
  public static async resolveTargets(actions: AgentAction[]): Promise<string | null> {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      // Resolve main targetSearchQuery for top-level entities
      if ('targetSearchQuery' in action && action.targetSearchQuery && !action.type.includes('sub_goal')) {
        let entityType = action.type.includes('goal') ? 'goal' : action.type.includes('project') ? 'project' : null;
        if (!entityType) entityType = action.type.includes('skill') ? 'skill' : null;
        if (entityType) {
          try {
            const id = await this.resolveUnique(entityType, action.targetSearchQuery);
            action.resolvedTargetId = id;
          } catch (e: any) {
            return e.message;
          }
        }
      }
      
      // Resolve parentGoalSearchQuery for sub-goals
      if ('parentGoalSearchQuery' in action && action.parentGoalSearchQuery) {
        try {
          const id = await this.resolveUnique('goal', action.parentGoalSearchQuery);
          action.resolvedParentId = id;
        } catch (e: any) {
          return e.message;
        }
      }

      // Resolve projectSearchQuery for link_project
      if ('projectSearchQuery' in action && action.projectSearchQuery) {
        try {
          const id = await this.resolveUnique('project', action.projectSearchQuery as string);
          action.resolvedParentId = id; // using resolvedParentId for the linked project
        } catch (e: any) {
          return e.message;
        }
      }
    }
    return null;
  }
  
  private static async resolveUnique(entity: string, query: string): Promise<string> {
    let results: any[] = [];
    if (entity === 'goal') {
      results = await goalService.find({}); 
    } else if (entity === 'project') {
      results = await projectService.find({});
    } else if (entity === 'skill') {
      results = await skillService.find({});
    }

    const q = query.toLowerCase().trim();
    const matches = results.filter(r => {
      const title = (r.title || r.name || '').toLowerCase();
      return title.includes(q);
    });

    if (matches.length === 0) {
      throw new Error(`Could not find ${entity} matching "${query}".`);
    }
    
    if (matches.length > 1) {
      // Attempt exact match disambiguation
      const exactMatches = matches.filter(r => (r.title || r.name || '').toLowerCase() === q);
      if (exactMatches.length === 1) {
        return exactMatches[0]._id!;
      }
      throw new Error(`I found multiple ${entity}s matching "${query}". Please be more specific.`);
    }

    return matches[0]._id!;
  }
}
