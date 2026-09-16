import { AgentAction, ActionGroup, ActionResult, PendingActionPlan } from './ActionTypes';
import { ActionExecutor } from './ActionExecutor';
import { RollbackManager } from './RollbackManager';
import { ActionValidator } from './ActionValidator';
import { ActionNormalizer } from './ActionNormalizer';
import { TargetResolver } from './TargetResolver';
import { StructuredCommand } from './StructuredCommandParser';
import { ProjectActionPlanner } from './planners/ProjectActionPlanner';
import { GoalActionPlanner } from './planners/GoalActionPlanner';
import { KisekiAgent } from '../KisekiAgent';

export class KisekiActionEngine {
  
  public static async processStructuredCommands(commands: StructuredCommand[], selectedModel: string): Promise<AgentAction[]> {
    const allActions: AgentAction[] = [];
    
    for (const cmd of commands) {
      let planner: any;
      if (cmd.domain === 'project') planner = new ProjectActionPlanner();
      else if (cmd.domain === 'goal') planner = new GoalActionPlanner();
      
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

  public static async preparePlan(requests: AgentAction[], conversationId?: string, userMessageId?: string): Promise<PendingActionPlan> {
    const actionPlanId = `plan_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // 1. Initial Validation
    let error = ActionValidator.validate(requests);
    if (error) return this.createErrorPlan(actionPlanId, error);

    // 2. Normalization
    let normalized = ActionNormalizer.normalize(requests);

    // 3. Re-Validation
    error = ActionValidator.validate(normalized);
    if (error) return this.createErrorPlan(actionPlanId, `Validation failed after normalization: ${error}`);

    // 4. Target Resolution (Unique Match Rule)
    error = await TargetResolver.resolveTargets(normalized);
    if (error) return this.createErrorPlan(actionPlanId, error);

    // 5. Dependency Validation
    error = ActionValidator.validateDependencies(normalized);
    if (error) return this.createErrorPlan(actionPlanId, error);

    return {
      actionPlanId,
      conversationId,
      userMessageId,
      actions: normalized,
      requiresConfirmation: true,
      status: 'pending_confirmation',
      createdAt: Date.now()
    };
  }

  private static createErrorPlan(actionPlanId: string, error: string): PendingActionPlan {
    return {
      actionPlanId,
      actions: [],
      requiresConfirmation: false,
      status: 'failed',
      createdAt: Date.now(),
      error
    };
  }

  public static async executePlan(plan: PendingActionPlan): Promise<{ actionGroupId: string | null, results: ActionResult[], message: string }> {
    if (plan.status !== 'pending_confirmation' && plan.status !== 'executing') {
      return { actionGroupId: null, results: [], message: 'This action is no longer pending confirmation.' };
    }
    if (Date.now() - plan.createdAt > 5 * 60 * 1000) { 
      return { actionGroupId: null, results: [], message: 'This action has expired. Please send the request again.' };
    }

    plan.status = 'executing';
    
    if (!plan.actions || plan.actions.length === 0) {
      return { actionGroupId: null, results: [], message: 'No valid actions found in the plan.' };
    }

    const actionGroupId = `group_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const results: ActionResult[] = [];

    const group: ActionGroup = {
      actionGroupId,
      conversationId: plan.conversationId,
      userMessageId: plan.userMessageId,
      createdAt: Date.now(),
      actions: [],
      status: 'pending'
    };

    let successCount = 0;
    
    // Pass execution context to executor for parentActionId resolution
    const executionContext: Record<string, string> = {};

    for (const req of plan.actions) {
      const res = await ActionExecutor.execute(req, executionContext);
      results.push(res);
      group.actions.push(res);
      
      if (res.success) {
        successCount++;
        // If the action defines an ID, store its generated database ID in the context
        if (req.id && res.entityId) {
          executionContext[req.id] = res.entityId;
        }
      } else {
        // Sequential execution with partial failure: we continue executing remaining independent actions?
        // Wait, if an action fails, should we stop dependent actions?
        // Let's just log and continue. Dependent actions will fail naturally in Executor if parentActionId is not in context.
      }
    }

    const anySuccess = successCount > 0;
    const allSuccess = successCount === plan.actions.length;

    if (allSuccess) group.status = 'completed';
    else if (anySuccess) group.status = 'partially_completed';
    else group.status = 'failed';

    if (anySuccess) {
      await RollbackManager.saveActionGroup(group);
      window.dispatchEvent(new CustomEvent('kiseki-action-completed', { detail: { actionGroupId } }));
    }
    
    plan.status = allSuccess ? 'completed' : 'failed';
    const finalMessage = this.generateDeterministicMessage(results);

    return { actionGroupId: anySuccess ? actionGroupId : null, results, message: finalMessage };
  }

  private static generateDeterministicMessage(results: ActionResult[]): string {
    if (results.length === 0) return 'No actions were executed.';
    
    const successCount = results.filter(r => r.success).length;
    
    if (results.length === 1) {
      const res = results[0];
      if (res.success) {
        const entityName = res.newState?.title || res.newState?.name || res.entity || 'item';
        let opStr = String(res.type).split('_')[0];
        if (opStr === 'create') opStr = 'created';
        else if (opStr === 'update') opStr = 'updated';
        else if (opStr === 'delete') opStr = 'deleted';
        return `Done — I ${opStr} the ${res.entity || 'item'} "${entityName}".`;
      } else {
        const entityName = res.entity || 'item';
        return `I couldn't perform the operation on the ${entityName} because: ${res.message || 'unknown error'}. No changes were made.`;
      }
    }
    
    if (successCount === results.length) {
      return `Done — I made all ${results.length} requested changes successfully.`;
    } else if (successCount > 0) {
      const failed = results.filter(r => !r.success);
      return `${successCount} of ${results.length} changes completed successfully. However, ${failed.length} action(s) failed. (Example failure: ${failed[0].message})`;
    } else {
      return `I couldn't complete any of the requested changes. (Error: ${results[0].message})`;
    }
  }
}
