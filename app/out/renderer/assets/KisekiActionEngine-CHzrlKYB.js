import { I as IntentResolver, s as skillService, g as goalService, p as projectService, S as StructuredCommandParser } from "./index-Dplpcj2H.js";
import { RollbackManager } from "./RollbackManager-W6SUChy3.js";
class EntityResolver {
  /**
   * Resolves a natural language query for an entity to a specific ID.
   * If the query is ambiguous, it returns an error forcing the AI to ask the user.
   */
  static async resolve(entityType, query) {
    try {
      const intent = IntentResolver.resolve(query);
      let section = entityType + "s";
      if (entityType === "relationship") section = "relationships";
      const results = await window.api.db.find(section, { deletedAt: { $exists: false } });
      const matches = results.filter(
        (r) => r.title && r.title.toLowerCase().includes(query.toLowerCase()) || r.name && r.name.toLowerCase().includes(query.toLowerCase())
      );
      if (matches.length === 1) {
        return matches[0]._id;
      }
      if (matches.length > 1) {
        throw new Error(`Ambiguous resolution. I found ${matches.length} ${entityType}s matching "${query}". Please specify which one.`);
      }
      return null;
    } catch (e) {
      if (e.message.includes("Ambiguous")) {
        throw e;
      }
      return null;
    }
  }
}
class ActionExecutor {
  static async execute(request, executionContext) {
    const actionId = `action_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
    try {
      if (request.parentActionId) {
        const parentId = executionContext[request.parentActionId];
        if (!parentId) {
          return {
            success: false,
            actionId,
            type: request.type,
            message: `Could not resolve dependency: parentActionId '${request.parentActionId}' failed or was not executed.`,
            errorCode: "DEPENDENCY_FAILED"
          };
        }
        request.resolvedParentId = parentId;
      }
      let previousState = null;
      let newState = null;
      let entityId = request.resolvedTargetId;
      switch (request.type) {
        case "create_goal":
          let projectId = void 0;
          if (request.projectSearchQuery) {
            projectId = await EntityResolver.resolve("project", request.projectSearchQuery);
            if (!projectId) {
              console.warn(`[ActionExecutor] Could not resolve projectSearchQuery: ${request.projectSearchQuery}`);
            }
          }
          newState = await goalService.create({
            title: request.name,
            description: request.description,
            category: request.category,
            priority: request.priority,
            startDate: request.startDate,
            targetDate: request.targetDate || request.endDate,
            status: request.status,
            subGoals: request.subGoals,
            projectId
          });
          entityId = newState._id;
          break;
        case "update_goal":
          if (!entityId) throw new Error("Target ID not resolved for update_goal.");
          previousState = await goalService.getById(entityId);
          newState = await goalService.update(entityId, {
            ...request.changes,
            title: request.changes.name || previousState?.title
          });
          break;
        case "delete_goal":
          if (!entityId) throw new Error("Target ID not resolved for delete_goal.");
          previousState = await goalService.getById(entityId);
          await goalService.delete(entityId);
          break;
        case "create_sub_goal": {
          const parentId = request.resolvedParentId;
          if (!parentId) throw new Error("No parent ID resolved for sub-goal creation.");
          const parent = await goalService.getById(parentId);
          if (!parent) throw new Error("Parent goal not found in database.");
          const newSubGoal = {
            id: `sub_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
            title: request.name,
            description: request.description || "",
            completed: false,
            targetDate: request.targetDate,
            order: parent.subGoals ? parent.subGoals.length : 0
          };
          const updatedSubGoals = [...parent.subGoals || [], newSubGoal];
          newState = await goalService.update(parentId, { subGoals: updatedSubGoals });
          entityId = newSubGoal.id;
          previousState = parent;
          break;
        }
        case "update_sub_goal": {
          const parentId = request.resolvedParentId;
          if (!parentId) throw new Error("No parent ID resolved for sub-goal update.");
          const parent = await goalService.getById(parentId);
          if (!parent || !parent.subGoals) throw new Error("Parent goal not found or has no sub-goals.");
          const q = request.targetSearchQuery.toLowerCase().trim();
          const matches = parent.subGoals.filter((sg) => sg.title.toLowerCase().includes(q));
          if (matches.length === 0) throw new Error(`Could not find sub-goal matching "${request.targetSearchQuery}".`);
          let target = matches[0];
          if (matches.length > 1) {
            const exact = matches.filter((sg) => sg.title.toLowerCase() === q);
            if (exact.length !== 1) throw new Error(`Multiple sub-goals match "${request.targetSearchQuery}".`);
            target = exact[0];
          }
          const updatedSubGoals = parent.subGoals.map((sg) => {
            if (sg.id === target.id) {
              return { ...sg, ...request.changes, title: request.changes.name || sg.title };
            }
            return sg;
          });
          newState = await goalService.update(parentId, { subGoals: updatedSubGoals });
          entityId = target.id;
          previousState = parent;
          break;
        }
        case "delete_sub_goal": {
          const parentId = request.resolvedParentId;
          if (!parentId) throw new Error("No parent ID resolved for sub-goal deletion.");
          const parent = await goalService.getById(parentId);
          if (!parent || !parent.subGoals) throw new Error("Parent goal not found or has no sub-goals.");
          const q = request.targetSearchQuery.toLowerCase().trim();
          const matches = parent.subGoals.filter((sg) => sg.title.toLowerCase().includes(q));
          if (matches.length === 0) throw new Error(`Could not find sub-goal matching "${request.targetSearchQuery}".`);
          let target = matches[0];
          if (matches.length > 1) {
            const exact = matches.filter((sg) => sg.title.toLowerCase() === q);
            if (exact.length !== 1) throw new Error(`Multiple sub-goals match "${request.targetSearchQuery}".`);
            target = exact[0];
          }
          const updatedSubGoals = parent.subGoals.filter((sg) => sg.id !== target.id);
          newState = await goalService.update(parentId, { subGoals: updatedSubGoals });
          entityId = target.id;
          previousState = parent;
          break;
        }
        case "create_project": {
          newState = await projectService.create({
            title: request.name,
            description: request.description,
            startDate: request.startDate,
            endDate: request.endDate,
            status: request.status,
            technologies: request.technologies,
            gitUrl: request.githubUrl,
            websiteUrl: request.liveUrl
          });
          entityId = newState._id;
          break;
        }
        case "update_project": {
          if (!entityId) throw new Error("Target ID not resolved for update_project.");
          previousState = await projectService.getById(entityId);
          newState = await projectService.update(entityId, {
            ...request.changes,
            title: request.changes?.name || previousState?.title
          });
          break;
        }
        case "delete_project": {
          if (!entityId) throw new Error("Target ID not resolved for delete_project.");
          previousState = await projectService.getById(entityId);
          await projectService.delete(entityId);
          break;
        }
        case "link_project": {
          if (!entityId) throw new Error("Target ID (goal) not resolved for link_project.");
          const projectId2 = request.resolvedParentId;
          if (!projectId2) throw new Error("Project ID not resolved for link_project.");
          previousState = await goalService.getById(entityId);
          newState = await goalService.update(entityId, { projectId: projectId2 });
          break;
        }
        case "create_skill": {
          newState = await skillService.create({
            name: request.name,
            description: request.description,
            level: request.level || 0
          });
          entityId = newState._id;
          break;
        }
        case "update_skill": {
          if (!entityId) throw new Error("Target ID not resolved for update_skill.");
          previousState = await skillService.getById(entityId);
          newState = await skillService.update(entityId, {
            ...request.changes,
            name: request.changes?.name || previousState?.name
          });
          break;
        }
        case "delete_skill": {
          if (!entityId) throw new Error("Target ID not resolved for delete_skill.");
          previousState = await skillService.getById(entityId);
          await skillService.delete(entityId);
          break;
        }
        default: {
          const legacy = request;
          if (legacy.operation && legacy.entity) {
            return await this.executeLegacy(legacy, actionId);
          }
          throw new Error(`Execution for action type '${request.type}' is not implemented.`);
        }
      }
      return {
        success: true,
        actionId,
        type: request.type,
        entity: request.type.includes("sub_goal") ? "sub_goal" : request.type.includes("goal") ? "goal" : "item",
        entityId,
        previousState,
        newState,
        message: `Successfully executed ${request.type}.`
      };
    } catch (e) {
      console.error(`[ActionExecutor] Execution failed for ${request.type}:`, e);
      return {
        success: false,
        actionId,
        type: request.type,
        entity: request.type.includes("sub_goal") ? "sub_goal" : request.type.includes("goal") ? "goal" : "item",
        errorCode: "EXECUTION_FAILED",
        message: e.message
      };
    }
  }
  static async executeLegacy(request, actionId) {
    const service = request.entity === "project" ? projectService : request.entity === "goal" ? goalService : null;
    if (!service) throw new Error(`Service for ${request.entity} not found.`);
    let targetId = request.targetId;
    if (request.operation !== "create" && !targetId && request.targetSearchQuery) {
      targetId = await EntityResolver.resolve(request.entity, request.targetSearchQuery) || void 0;
    }
    if (request.operation !== "create" && !targetId) {
      throw new Error(`Target entity not found for legacy operation ${request.operation}.`);
    }
    let newState = null;
    if (request.operation === "create") newState = await service.create(request.data);
    else if (request.operation === "update") newState = await service.update(targetId, request.changes);
    else if (request.operation === "delete") await service.delete(targetId);
    return {
      success: true,
      actionId,
      type: request.operation,
      entity: request.entity,
      entityId: newState ? newState._id : targetId,
      newState,
      message: `Executed legacy ${request.operation} on ${request.entity}.`
    };
  }
}
class ActionValidator {
  /**
   * Validates an array of AgentActions.
   * Returns an error message string if invalid, or null if valid.
   */
  static validate(actions) {
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
      if (!action || typeof action !== "object") {
        return `Action at index ${i} is not a valid object.`;
      }
      const error = this.validateAction(action, i);
      if (error) return error;
    }
    return null;
  }
  static validateAction(action, index) {
    if (!action.type) {
      return `Action at index ${index} is missing a 'type'.`;
    }
    switch (action.type) {
      case "create_goal":
        if (!action.name || typeof action.name !== "string") return `create_goal at index ${index} requires a valid 'name'.`;
        break;
      case "update_goal":
        if (!action.targetSearchQuery || typeof action.targetSearchQuery !== "string") {
          return `update_goal at index ${index} requires a 'targetSearchQuery' to identify which goal to update.`;
        }
        if (!action.changes || typeof action.changes !== "object") {
          return `update_goal at index ${index} requires a 'changes' object.`;
        }
        break;
      case "delete_goal":
        if (!action.targetSearchQuery || typeof action.targetSearchQuery !== "string") {
          return `delete_goal at index ${index} requires a 'targetSearchQuery'.`;
        }
        break;
      case "create_sub_goal":
        if (!action.name || typeof action.name !== "string") return `create_sub_goal at index ${index} requires a 'name'.`;
        if (!action.parentGoalSearchQuery && !action.parentActionId) {
          return `create_sub_goal at index ${index} requires either a 'parentGoalSearchQuery' or a 'parentActionId'.`;
        }
        break;
      case "update_sub_goal":
        if (!action.targetSearchQuery || typeof action.targetSearchQuery !== "string") return `update_sub_goal at index ${index} requires a 'targetSearchQuery'.`;
        if (!action.changes || typeof action.changes !== "object") return `update_sub_goal at index ${index} requires a 'changes' object.`;
        break;
      case "delete_sub_goal":
        if (!action.targetSearchQuery || typeof action.targetSearchQuery !== "string") return `delete_sub_goal at index ${index} requires a 'targetSearchQuery'.`;
        break;
      case "create_project":
      case "update_project":
      case "delete_project":
        if (action.type.startsWith("update") || action.type.startsWith("delete")) {
          if (!action.targetSearchQuery && !action.targetId) {
            return `${action.type} requires a target identifier.`;
          }
        }
        break;
      case "link_project":
        if (!action.targetSearchQuery) {
          return `link_project at index ${index} requires a 'targetSearchQuery' (the goal to link).`;
        }
        if (!action.projectSearchQuery) {
          return `link_project at index ${index} requires a 'projectSearchQuery' (the project to link to).`;
        }
        break;
      case "create_skill":
        if (!action.name || typeof action.name !== "string") {
          return `create_skill at index ${index} requires a valid 'name'.`;
        }
        break;
      case "update_skill":
        if (!action.targetSearchQuery || typeof action.targetSearchQuery !== "string") {
          return `update_skill at index ${index} requires a 'targetSearchQuery' to identify which skill to update.`;
        }
        if (!action.changes || typeof action.changes !== "object") {
          return `update_skill at index ${index} requires a 'changes' object.`;
        }
        break;
      case "delete_skill":
        if (!action.targetSearchQuery || typeof action.targetSearchQuery !== "string") {
          return `delete_skill at index ${index} requires a 'targetSearchQuery'.`;
        }
        break;
      default:
        if (action.operation && action.entity) {
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
  static validateDependencies(actions) {
    const definedIds = /* @__PURE__ */ new Set();
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
class ActionNormalizer {
  static normalize(actions) {
    const mergedActions = [];
    const updateGoalMap = /* @__PURE__ */ new Map();
    const updateSubGoalMap = /* @__PURE__ */ new Map();
    for (const action of actions) {
      if (action.type === "update_goal") {
        const key = action.targetSearchQuery?.toLowerCase().trim();
        if (key) {
          if (updateGoalMap.has(key)) {
            const existing = updateGoalMap.get(key);
            existing.changes = { ...existing.changes, ...action.changes };
            continue;
          } else {
            updateGoalMap.set(key, action);
            mergedActions.push(action);
          }
        } else {
          mergedActions.push(action);
        }
      } else if (action.type === "update_sub_goal") {
        const key = `${action.parentGoalSearchQuery?.toLowerCase().trim()}_${action.targetSearchQuery?.toLowerCase().trim()}`;
        if (action.targetSearchQuery) {
          if (updateSubGoalMap.has(key)) {
            const existing = updateSubGoalMap.get(key);
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
        mergedActions.push(action);
      }
    }
    for (const action of mergedActions) {
      if (action.type === "update_goal") {
        if (action.changes && typeof action.changes.progress === "number") {
          action.changes.progress = Math.max(0, Math.min(100, action.changes.progress));
        }
      }
    }
    return mergedActions;
  }
}
class TargetResolver {
  /**
   * Resolves textual queries into unique database IDs.
   * Returns an error message if any target is unresolvable or ambiguous.
   * Returns null if all resolutions succeed.
   */
  static async resolveTargets(actions) {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if ("targetSearchQuery" in action && action.targetSearchQuery && !action.type.includes("sub_goal")) {
        let entityType = action.type.includes("goal") ? "goal" : action.type.includes("project") ? "project" : null;
        if (!entityType) entityType = action.type.includes("skill") ? "skill" : null;
        if (entityType) {
          try {
            const id = await this.resolveUnique(entityType, action.targetSearchQuery);
            action.resolvedTargetId = id;
          } catch (e) {
            return e.message;
          }
        }
      }
      if ("parentGoalSearchQuery" in action && action.parentGoalSearchQuery) {
        try {
          const id = await this.resolveUnique("goal", action.parentGoalSearchQuery);
          action.resolvedParentId = id;
        } catch (e) {
          return e.message;
        }
      }
      if ("projectSearchQuery" in action && action.projectSearchQuery) {
        try {
          const id = await this.resolveUnique("project", action.projectSearchQuery);
          action.resolvedParentId = id;
        } catch (e) {
          return e.message;
        }
      }
    }
    return null;
  }
  static async resolveUnique(entity, query) {
    let results = [];
    if (entity === "goal") {
      results = await goalService.find({});
    } else if (entity === "project") {
      results = await projectService.find({});
    } else if (entity === "skill") {
      results = await skillService.find({});
    }
    const q = query.toLowerCase().trim();
    const matches = results.filter((r) => {
      const title = (r.title || r.name || "").toLowerCase();
      return title.includes(q);
    });
    if (matches.length === 0) {
      throw new Error(`Could not find ${entity} matching "${query}".`);
    }
    if (matches.length > 1) {
      const exactMatches = matches.filter((r) => (r.title || r.name || "").toLowerCase() === q);
      if (exactMatches.length === 1) {
        return exactMatches[0]._id;
      }
      throw new Error(`I found multiple ${entity}s matching "${query}". Please be more specific.`);
    }
    return matches[0]._id;
  }
}
class BaseActionPlanner {
  /**
   * Builds deterministic actions directly from structured fields, bypassing the LLM.
   */
  buildDeterministicActions(fields) {
    return [];
  }
  /**
   * Parses the raw LLM output into an array of AgentActions.
   */
  parseActionRequests(rawOutput) {
    const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/) || rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { cleanMessage: "I attempted to process your request, but I was unable to generate a valid response.", requests: [] };
    }
    try {
      const data = JSON.parse(jsonMatch[0].replace(/```json|```/g, ""));
      if (data && Array.isArray(data.actions)) {
        return { cleanMessage: "Please confirm the following action plan:", requests: data.actions };
      }
    } catch (e) {
      console.error("[BaseActionPlanner] JSON Parsing Error:", e);
    }
    return { cleanMessage: "I attempted to process your request, but I was unable to generate a valid response.", requests: [] };
  }
}
class ProjectActionPlanner extends BaseActionPlanner {
  generatePrompt(fields) {
    const title = fields[0] || "";
    const description = fields[1] || "";
    const startDate = fields[2] || "";
    const endDate = fields[3] || "";
    const state = fields[4] || "";
    const technologies = fields.slice(5).filter((t) => t.trim() !== "");
    return `
You are Kiseki AI handling a Project action.

Available Project fields:
- title
- description
- startDate
- endDate
- state
- technologies

The user has provided the following structured data:
- title: "${title}"
- description: "${description}"
- startDate: "${startDate}"
- endDate: "${endDate}"
- state: "${state}"
- technologies: ${JSON.stringify(technologies)}

Normalize any natural-language dates (e.g. "today") and ambiguous states. 
Your output MUST be ONLY valid JSON matching this schema:

{
  "actions": [
    {
      "type": "create_project",
      "name": "<string>",
      "description": "<string>"
    }
  ]
}

Note: The database currently primarily supports 'name' and 'description' for create_project based on ActionTypes. Map the 'title' field to 'name'.
Ignore fields that the schema does not support.

Return ONLY JSON inside a code block.
    `.trim();
  }
  buildDeterministicActions(fields) {
    const title = fields[0] || "";
    const description = fields[1] || "";
    const startDate = StructuredCommandParser.normalizeDate(fields[2]);
    const endDate = StructuredCommandParser.normalizeDate(fields[3]);
    const state = StructuredCommandParser.normalizeStatus(fields[4]);
    const githubUrl = StructuredCommandParser.normalizeUrl(fields[5]);
    const liveUrl = StructuredCommandParser.normalizeUrl(fields[6]);
    const technologies = fields.slice(7).filter((t) => t.trim() !== "");
    const action = {
      type: "create_project",
      name: title.trim(),
      description: description.trim()
    };
    if (startDate) action.startDate = startDate;
    if (endDate) action.endDate = endDate;
    if (state) action.status = state;
    if (githubUrl) action.githubUrl = githubUrl;
    if (liveUrl) action.liveUrl = liveUrl;
    if (technologies.length > 0) action.technologies = technologies.map((t) => t.trim());
    return [action];
  }
}
class GoalActionPlanner extends BaseActionPlanner {
  generatePrompt(fields) {
    const title = fields[0] || "";
    const state = fields[1] || "";
    const startDate = fields[2] || "";
    const endDate = fields[3] || "";
    const description = fields[4] || "";
    let subGoals = [];
    let linkedProject = "";
    if (fields.length > 5) {
      if (fields.length === 6) {
        subGoals.push(fields[5]);
      } else {
        subGoals = fields.slice(5, fields.length - 1).filter((g) => g.trim() !== "");
        linkedProject = fields[fields.length - 1];
      }
    }
    return `
You are Kiseki AI handling a Goal action.

The user has provided the following structured data:
- title: "${title}"
- state: "${state}"
- startDate: "${startDate}"
- endDate: "${endDate}"
- description: "${description}"
- subGoals: ${JSON.stringify(subGoals)}
- linkedProject: "${linkedProject}"

Normalize dates (e.g. "today"). 
Your output MUST be ONLY valid JSON matching this schema:

{
  "actions": [
    {
      "type": "create_goal",
      "name": "<string>",
      "description": "<string>"
    },
    // Optional sub-goals
    {
      "type": "create_sub_goal",
      "parentGoalSearchQuery": "<exact name from create_goal>",
      "name": "<subgoal name>"
    },
    // Optional link project
    {
      "type": "link_project",
      "targetSearchQuery": "<exact name from create_goal>",
      "projectSearchQuery": "<linkedProject>"
    }
  ]
}

Return ONLY JSON inside a code block.
    `.trim();
  }
  buildDeterministicActions(fields) {
    const title = fields[0] || "";
    const state = StructuredCommandParser.normalizeStatus(fields[1]);
    const startDate = StructuredCommandParser.normalizeDate(fields[2]);
    const endDate = StructuredCommandParser.normalizeDate(fields[3]);
    const description = fields[4] || "";
    let subGoals = [];
    let linkedProject = "";
    if (fields.length > 5) {
      if (fields.length === 6) {
        subGoals.push(fields[5]);
      } else {
        subGoals = fields.slice(5, fields.length - 1).filter((g) => g.trim() !== "");
        linkedProject = fields[fields.length - 1];
      }
    }
    const actions = [];
    const goalAction = {
      type: "create_goal",
      name: title.trim(),
      description: description.trim()
    };
    if (startDate) goalAction.startDate = startDate;
    if (endDate) goalAction.endDate = endDate;
    if (state) goalAction.status = state;
    if (subGoals.length > 0) {
      goalAction.subGoals = subGoals.map((sg, i) => ({
        id: `sub_${Date.now()}_${i}_${Math.floor(Math.random() * 1e4)}`,
        title: sg.trim(),
        completed: false,
        order: i
      }));
    }
    if (linkedProject.trim()) {
      goalAction.projectSearchQuery = linkedProject.trim();
    }
    actions.push(goalAction);
    return actions;
  }
}
class KisekiActionEngine {
  static async processStructuredCommands(commands, selectedModel) {
    const allActions = [];
    for (const cmd of commands) {
      let planner;
      if (cmd.domain === "project") planner = new ProjectActionPlanner();
      else if (cmd.domain === "goal") planner = new GoalActionPlanner();
      if (!planner) continue;
      try {
        const requests = planner.buildDeterministicActions(cmd.fields);
        allActions.push(...requests);
      } catch (e) {
        console.error(`Failed to process structured command for ${cmd.domain}`, e);
      }
    }
    return allActions;
  }
  static async preparePlan(requests, conversationId, userMessageId) {
    const actionPlanId = `plan_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
    let error = ActionValidator.validate(requests);
    if (error) return this.createErrorPlan(actionPlanId, error);
    let normalized = ActionNormalizer.normalize(requests);
    error = ActionValidator.validate(normalized);
    if (error) return this.createErrorPlan(actionPlanId, `Validation failed after normalization: ${error}`);
    error = await TargetResolver.resolveTargets(normalized);
    if (error) return this.createErrorPlan(actionPlanId, error);
    error = ActionValidator.validateDependencies(normalized);
    if (error) return this.createErrorPlan(actionPlanId, error);
    return {
      actionPlanId,
      conversationId,
      userMessageId,
      actions: normalized,
      requiresConfirmation: true,
      status: "pending_confirmation",
      createdAt: Date.now()
    };
  }
  static createErrorPlan(actionPlanId, error) {
    return {
      actionPlanId,
      actions: [],
      requiresConfirmation: false,
      status: "failed",
      createdAt: Date.now(),
      error
    };
  }
  static async executePlan(plan) {
    if (plan.status !== "pending_confirmation" && plan.status !== "executing") {
      return { actionGroupId: null, results: [], message: "This action is no longer pending confirmation." };
    }
    if (Date.now() - plan.createdAt > 5 * 60 * 1e3) {
      return { actionGroupId: null, results: [], message: "This action has expired. Please send the request again." };
    }
    plan.status = "executing";
    if (!plan.actions || plan.actions.length === 0) {
      return { actionGroupId: null, results: [], message: "No valid actions found in the plan." };
    }
    const actionGroupId = `group_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
    const results = [];
    const group = {
      actionGroupId,
      conversationId: plan.conversationId,
      userMessageId: plan.userMessageId,
      createdAt: Date.now(),
      actions: [],
      status: "pending"
    };
    let successCount = 0;
    const executionContext = {};
    for (const req of plan.actions) {
      const res = await ActionExecutor.execute(req, executionContext);
      results.push(res);
      group.actions.push(res);
      if (res.success) {
        successCount++;
        if (req.id && res.entityId) {
          executionContext[req.id] = res.entityId;
        }
      }
    }
    const anySuccess = successCount > 0;
    const allSuccess = successCount === plan.actions.length;
    if (allSuccess) group.status = "completed";
    else if (anySuccess) group.status = "partially_completed";
    else group.status = "failed";
    if (anySuccess) {
      await RollbackManager.saveActionGroup(group);
      window.dispatchEvent(new CustomEvent("kiseki-action-completed", { detail: { actionGroupId } }));
    }
    plan.status = allSuccess ? "completed" : "failed";
    const finalMessage = this.generateDeterministicMessage(results);
    return { actionGroupId: anySuccess ? actionGroupId : null, results, message: finalMessage };
  }
  static generateDeterministicMessage(results) {
    if (results.length === 0) return "No actions were executed.";
    const successCount = results.filter((r) => r.success).length;
    if (results.length === 1) {
      const res = results[0];
      if (res.success) {
        const entityName = res.newState?.title || res.newState?.name || res.entity || "item";
        let opStr = String(res.type).split("_")[0];
        if (opStr === "create") opStr = "created";
        else if (opStr === "update") opStr = "updated";
        else if (opStr === "delete") opStr = "deleted";
        return `Done — I ${opStr} the ${res.entity || "item"} "${entityName}".`;
      } else {
        const entityName = res.entity || "item";
        return `I couldn't perform the operation on the ${entityName} because: ${res.message || "unknown error"}. No changes were made.`;
      }
    }
    if (successCount === results.length) {
      return `Done — I made all ${results.length} requested changes successfully.`;
    } else if (successCount > 0) {
      const failed = results.filter((r) => !r.success);
      return `${successCount} of ${results.length} changes completed successfully. However, ${failed.length} action(s) failed. (Example failure: ${failed[0].message})`;
    } else {
      return `I couldn't complete any of the requested changes. (Error: ${results[0].message})`;
    }
  }
}
export {
  KisekiActionEngine
};
