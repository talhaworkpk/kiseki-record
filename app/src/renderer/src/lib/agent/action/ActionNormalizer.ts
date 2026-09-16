import { AgentAction, UpdateGoalAction, UpdateSubGoalAction } from './ActionTypes';

export class ActionNormalizer {
  public static normalize(actions: AgentAction[]): AgentAction[] {
    const mergedActions: AgentAction[] = [];
    
    // Maps to track updates to the same target for merging
    const updateGoalMap = new Map<string, UpdateGoalAction>();
    const updateSubGoalMap = new Map<string, UpdateSubGoalAction>();

    for (const action of actions) {
      if (action.type === 'update_goal') {
        const key = action.targetSearchQuery?.toLowerCase().trim();
        if (key) {
          if (updateGoalMap.has(key)) {
            const existing = updateGoalMap.get(key)!;
            existing.changes = { ...existing.changes, ...action.changes };
            continue; // Skip adding to mergedActions directly, we already appended it
          } else {
            updateGoalMap.set(key, action);
            mergedActions.push(action);
          }
        } else {
          mergedActions.push(action);
        }
      } else if (action.type === 'update_sub_goal') {
        const key = `${action.parentGoalSearchQuery?.toLowerCase().trim()}_${action.targetSearchQuery?.toLowerCase().trim()}`;
        if (action.targetSearchQuery) {
          if (updateSubGoalMap.has(key)) {
            const existing = updateSubGoalMap.get(key)!;
            existing.changes = { ...existing.changes, ...action.changes };
            continue;
          } else {
            updateSubGoalMap.set(key, action);
            mergedActions.push(action);
          }
        } else {
          mergedActions.push(action);
        }
      } else {
        // Not a mergeable update, just push
        mergedActions.push(action);
      }
    }

    // Apply specific normalizations (like numeric bounds) to the merged list
    for (const action of mergedActions) {
      if (action.type === 'update_goal') {
        if (action.changes && typeof action.changes.progress === 'number') {
          action.changes.progress = Math.max(0, Math.min(100, action.changes.progress));
        }
      }
    }

    return mergedActions;
  }
}
