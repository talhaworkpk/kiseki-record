import { ActionGroup, ActionResult } from './ActionTypes';
import { goalService } from '../../domain/GoalService';
import { projectService } from '../../domain/ProjectService';

export class RollbackManager {
  private static collection = 'actionGroups';

  /**
   * Save an action group to the database for future undo capabilities.
   */
  public static async saveActionGroup(group: ActionGroup): Promise<void> {
    // @ts-ignore
    await window.api.db.insert(this.collection, group);
  }

  /**
   * Fetches an ActionGroup by ID.
   */
  public static async getActionGroup(actionGroupId: string): Promise<ActionGroup | null> {
    // @ts-ignore
    const results = await window.api.db.find(this.collection, { actionGroupId });
    return results && results.length > 0 ? results[0] : null;
  }

  /**
   * Reverses an entire action group sequentially backwards.
   */
  public static async undoGroup(actionGroupId: string): Promise<boolean> {
    const group = await this.getActionGroup(actionGroupId);
    if (!group) {
      console.warn(`[RollbackManager] ActionGroup ${actionGroupId} not found.`);
      return false;
    }

    if (group.status === 'undone') {
      return true; // already reversed
    }

    try {
      // Reverse iterate
      for (let i = group.actions.length - 1; i >= 0; i--) {
        const action = group.actions[i];
        if (action.success) {
          await this.reverseAction(action);
        }
      }
      
      // Mark undone
      group.status = 'undone';
      // @ts-ignore
      await window.api.db.update(this.collection, { actionGroupId }, { $set: { status: 'undone' } }, {});
      
      return true;
    } catch (e) {
      console.error('[RollbackManager] Failed to undo group:', e);
      group.status = 'undo_failed';
      // @ts-ignore
      await window.api.db.update(this.collection, { actionGroupId }, { $set: { status: 'undo_failed' } }, {});
      return false;
    }
  }

  private static async reverseAction(action: ActionResult): Promise<void> {
    const service = this.getServiceForEntity(action.entity);
    if (!service) throw new Error(`Unknown entity for rollback: ${action.entity}`);

    switch (action.operation) {
      case 'create':
        // If we created it, we undo by deleting it. 
        // Note: as per spec, if it pre-existed, we don't delete. 
        // But for 'create' action, by definition, the action created it.
        if (action.entityId) {
          await service.delete(action.entityId);
        }
        break;
      
      case 'update':
      case 'archive':
      case 'restore':
      case 'complete':
        // Restore previous state
        if (action.entityId && action.previousState) {
          await service.update(action.entityId, action.previousState);
        }
        break;
        
      case 'delete':
        // We only support restoring if previous state was captured
        if (action.previousState) {
          await service.create(action.previousState);
        }
        break;
        
      default:
        console.warn(`[RollbackManager] Operation ${action.operation} undo not fully implemented.`);
    }
  }

  private static getServiceForEntity(entity: string): any {
    switch (entity) {
      case 'goal': return goalService;
      case 'project': return projectService;
      // Map other services as they are built...
      default: return null;
    }
  }
}
