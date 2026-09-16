import { p as projectService, g as goalService } from "./index-Dplpcj2H.js";
class RollbackManager {
  static collection = "actionGroups";
  /**
   * Save an action group to the database for future undo capabilities.
   */
  static async saveActionGroup(group) {
    await window.api.db.insert(this.collection, group);
  }
  /**
   * Fetches an ActionGroup by ID.
   */
  static async getActionGroup(actionGroupId) {
    const results = await window.api.db.find(this.collection, { actionGroupId });
    return results && results.length > 0 ? results[0] : null;
  }
  /**
   * Reverses an entire action group sequentially backwards.
   */
  static async undoGroup(actionGroupId) {
    const group = await this.getActionGroup(actionGroupId);
    if (!group) {
      console.warn(`[RollbackManager] ActionGroup ${actionGroupId} not found.`);
      return false;
    }
    if (group.status === "undone") {
      return true;
    }
    try {
      for (let i = group.actions.length - 1; i >= 0; i--) {
        const action = group.actions[i];
        if (action.success) {
          await this.reverseAction(action);
        }
      }
      group.status = "undone";
      await window.api.db.update(this.collection, { actionGroupId }, { $set: { status: "undone" } }, {});
      return true;
    } catch (e) {
      console.error("[RollbackManager] Failed to undo group:", e);
      group.status = "undo_failed";
      await window.api.db.update(this.collection, { actionGroupId }, { $set: { status: "undo_failed" } }, {});
      return false;
    }
  }
  static async reverseAction(action) {
    const service = this.getServiceForEntity(action.entity);
    if (!service) throw new Error(`Unknown entity for rollback: ${action.entity}`);
    switch (action.operation) {
      case "create":
        if (action.entityId) {
          await service.delete(action.entityId);
        }
        break;
      case "update":
      case "archive":
      case "restore":
      case "complete":
        if (action.entityId && action.previousState) {
          await service.update(action.entityId, action.previousState);
        }
        break;
      case "delete":
        if (action.previousState) {
          await service.create(action.previousState);
        }
        break;
      default:
        console.warn(`[RollbackManager] Operation ${action.operation} undo not fully implemented.`);
    }
  }
  static getServiceForEntity(entity) {
    switch (entity) {
      case "goal":
        return goalService;
      case "project":
        return projectService;
      default:
        return null;
    }
  }
}
export {
  RollbackManager
};
