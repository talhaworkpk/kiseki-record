import { AgentAction } from './ActionTypes';

export class ActionValidator {
  
  /**
   * Validates an array of AgentActions.
   * Returns an error message string if invalid, or null if valid.
   */
  public static validate(actions: AgentAction[]): string | null {
    if (!Array.isArray(actions)) {
      return "The action plan must be an array of actions.";
    }

    if (actions.length === 0) {
      return "The action plan is empty.";
    }

    if (actions.length > 10) {
      return "The action plan contains too many operations (max 10). Please break your request into smaller pieces.";
    }

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (!action || typeof action !== 'object') {
        return `Action at index ${i} is not a valid object.`;
      }

      const error = this.validateAction(action, i);
      if (error) return error;
    }

    return null;
  }

  private static validateAction(action: AgentAction, index: number): string | null {
    if (!action.type) {
      return `Action at index ${index} is missing a 'type'.`;
    }

    switch (action.type) {
      case 'create_goal':
        if (!action.name || typeof action.name !== 'string') return `create_goal at index ${index} requires a valid 'name'.`;
        break;

      case 'update_goal':
        if (!action.targetSearchQuery || typeof action.targetSearchQuery !== 'string') {
          return `update_goal at index ${index} requires a 'targetSearchQuery' to identify which goal to update.`;
        }
        if (!action.changes || typeof action.changes !== 'object') {
          return `update_goal at index ${index} requires a 'changes' object.`;
        }
        break;

      case 'delete_goal':
        if (!action.targetSearchQuery || typeof action.targetSearchQuery !== 'string') {
          return `delete_goal at index ${index} requires a 'targetSearchQuery'.`;
        }
        break;

      case 'create_sub_goal':
        if (!action.name || typeof action.name !== 'string') return `create_sub_goal at index ${index} requires a 'name'.`;
        if (!action.parentGoalSearchQuery && !action.parentActionId) {
          return `create_sub_goal at index ${index} requires either a 'parentGoalSearchQuery' or a 'parentActionId'.`;
        }
        break;

      case 'update_sub_goal':
        if (!action.targetSearchQuery || typeof action.targetSearchQuery !== 'string') return `update_sub_goal at index ${index} requires a 'targetSearchQuery'.`;
        if (!action.changes || typeof action.changes !== 'object') return `update_sub_goal at index ${index} requires a 'changes' object.`;
        break;

      case 'delete_sub_goal':
        if (!action.targetSearchQuery || typeof action.targetSearchQuery !== 'string') return `delete_sub_goal at index ${index} requires a 'targetSearchQuery'.`;
        break;

      case 'create_project':
      case 'update_project':
      case 'delete_project':
        // Minimal validation for projects since they were existing, but ensuring safety
        if (action.type.startsWith('update') || action.type.startsWith('delete')) {
           // Wait, update_project is technically LegacyActionRequest or BaseAction in my types. Let's just allow them to pass basic checks for now if we don't strictly type project.
           if (!(action as any).targetSearchQuery && !(action as any).targetId) {
             return `${action.type} requires a target identifier.`;
           }
        }
        break;

      case 'link_project':
        if (!(action as any).targetSearchQuery) {
          return `link_project at index ${index} requires a 'targetSearchQuery' (the goal to link).`;
        }
        if (!(action as any).projectSearchQuery) {
          return `link_project at index ${index} requires a 'projectSearchQuery' (the project to link to).`;
        }
        break;

      case 'create_skill':
        if (!(action as any).name || typeof (action as any).name !== 'string') {
          return `create_skill at index ${index} requires a valid 'name'.`;
        }
        break;

      case 'update_skill':
        if (!(action as any).targetSearchQuery || typeof (action as any).targetSearchQuery !== 'string') {
          return `update_skill at index ${index} requires a 'targetSearchQuery' to identify which skill to update.`;
        }
        if (!(action as any).changes || typeof (action as any).changes !== 'object') {
          return `update_skill at index ${index} requires a 'changes' object.`;
        }
        break;

      case 'delete_skill':
        if (!(action as any).targetSearchQuery || typeof (action as any).targetSearchQuery !== 'string') {
          return `delete_skill at index ${index} requires a 'targetSearchQuery'.`;
        }
        break;
        
      default:
        // For fallback or unknown types
        if ((action as any).operation && (action as any).entity) {
          // Legacy format
          return null; 
        }
        return `Unsupported action type: '${action.type}' at index ${index}.`;
    }

    return null;
  }

  /**
   * Verifies dependencies, ensuring that any action referencing a `parentActionId`
   * points to an action that was defined EARLIER in the array.
   */
  public static validateDependencies(actions: AgentAction[]): string | null {
    const definedIds = new Set<string>();

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (action.id) {
        definedIds.add(action.id);
      }

      if (action.parentActionId) {
        if (!definedIds.has(action.parentActionId)) {
          return `Action at index ${i} references parentActionId '${action.parentActionId}', but that ID was not defined by an earlier action.`;
        }
      }
    }

    return null;
  }
}
