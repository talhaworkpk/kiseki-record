import { AgentAction, ActionResult, LegacyActionRequest } from './ActionTypes';
import { goalService } from '../../domain/GoalService';
import { projectService } from '../../domain/ProjectService';
import { skillService } from '../../domain/SkillService';
import { EntityResolver } from './EntityResolver';

export class ActionExecutor {
  
  public static async execute(request: AgentAction, executionContext: Record<string, string>): Promise<ActionResult> {
    const actionId = `action_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    
    try {
      // 1. Resolve Dependency ID if present
      if (request.parentActionId) {
        const parentId = executionContext[request.parentActionId];
        if (!parentId) {
          return {
            success: false, actionId, type: request.type,
            message: `Could not resolve dependency: parentActionId '${request.parentActionId}' failed or was not executed.`,
            errorCode: 'DEPENDENCY_FAILED'
          };
        }
        request.resolvedParentId = parentId;
      }

      let previousState: any = null;
      let newState: any = null;
      let entityId: string | undefined = request.resolvedTargetId;

      // 2. Execute based on ActionType
      switch (request.type) {
        case 'create_goal':
          let projectId = undefined;
          if ((request as any).projectSearchQuery) {
            projectId = await EntityResolver.resolve('project', (request as any).projectSearchQuery);
            if (!projectId) {
              console.warn(`[ActionExecutor] Could not resolve projectSearchQuery: ${(request as any).projectSearchQuery}`);
            }
          }
          
          newState = await goalService.create({
            title: request.name,
            description: request.description,
            category: request.category,
            priority: request.priority,
            startDate: request.startDate,
            targetDate: request.targetDate || request.endDate,
            status: (request as any).status,
            subGoals: (request as any).subGoals,
            projectId: projectId
          });
          entityId = newState._id;
          break;

        case 'update_goal':
          if (!entityId) throw new Error("Target ID not resolved for update_goal.");
          previousState = await goalService.getById(entityId);
          newState = await goalService.update(entityId, {
            ...request.changes,
            title: request.changes.name || previousState?.title
          });
          break;

        case 'delete_goal':
          if (!entityId) throw new Error("Target ID not resolved for delete_goal.");
          previousState = await goalService.getById(entityId);
          await goalService.delete(entityId);
          break;

        case 'create_sub_goal': {
          const parentId = request.resolvedParentId;
          if (!parentId) throw new Error("No parent ID resolved for sub-goal creation.");
          const parent = await goalService.getById(parentId);
          if (!parent) throw new Error("Parent goal not found in database.");
          
          const newSubGoal = {
            id: `sub_${Date.now()}_${Math.floor(Math.random()*10000)}`,
            title: request.name,
            description: request.description || '',
            completed: false,
            targetDate: request.targetDate,
            order: parent.subGoals ? parent.subGoals.length : 0
          };
          const updatedSubGoals = [...(parent.subGoals || []), newSubGoal];
          newState = await goalService.update(parentId, { subGoals: updatedSubGoals });
          entityId = newSubGoal.id;
          previousState = parent;
          break;
        }

        case 'update_sub_goal': {
          const parentId = request.resolvedParentId;
          if (!parentId) throw new Error("No parent ID resolved for sub-goal update.");
          const parent = await goalService.getById(parentId);
          if (!parent || !parent.subGoals) throw new Error("Parent goal not found or has no sub-goals.");
          
          const q = request.targetSearchQuery.toLowerCase().trim();
          const matches = parent.subGoals.filter(sg => sg.title.toLowerCase().includes(q));
          if (matches.length === 0) throw new Error(`Could not find sub-goal matching "${request.targetSearchQuery}".`);
          
          let target = matches[0];
          if (matches.length > 1) {
            const exact = matches.filter(sg => sg.title.toLowerCase() === q);
            if (exact.length !== 1) throw new Error(`Multiple sub-goals match "${request.targetSearchQuery}".`);
            target = exact[0];
          }
          
          const updatedSubGoals = parent.subGoals.map(sg => {
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

        case 'delete_sub_goal': {
          const parentId = request.resolvedParentId;
          if (!parentId) throw new Error("No parent ID resolved for sub-goal deletion.");
          const parent = await goalService.getById(parentId);
          if (!parent || !parent.subGoals) throw new Error("Parent goal not found or has no sub-goals.");
          
          const q = request.targetSearchQuery.toLowerCase().trim();
          const matches = parent.subGoals.filter(sg => sg.title.toLowerCase().includes(q));
          if (matches.length === 0) throw new Error(`Could not find sub-goal matching "${request.targetSearchQuery}".`);
          
          let target = matches[0];
          if (matches.length > 1) {
            const exact = matches.filter(sg => sg.title.toLowerCase() === q);
            if (exact.length !== 1) throw new Error(`Multiple sub-goals match "${request.targetSearchQuery}".`);
            target = exact[0];
          }
          
          const updatedSubGoals = parent.subGoals.filter(sg => sg.id !== target.id);
          newState = await goalService.update(parentId, { subGoals: updatedSubGoals });
          entityId = target.id;
          previousState = parent;
          break;
        }

        case 'create_project': {
          newState = await projectService.create({
            title: (request as any).name,
            description: (request as any).description,
            startDate: (request as any).startDate,
            endDate: (request as any).endDate,
            status: (request as any).status,
            technologies: (request as any).technologies,
            gitUrl: (request as any).githubUrl,
            websiteUrl: (request as any).liveUrl
          });
          entityId = newState._id;
          break;
        }

        case 'update_project': {
          if (!entityId) throw new Error("Target ID not resolved for update_project.");
          previousState = await projectService.getById(entityId);
          newState = await projectService.update(entityId, {
            ...(request as any).changes,
            title: (request as any).changes?.name || previousState?.title
          });
          break;
        }

        case 'delete_project': {
          if (!entityId) throw new Error("Target ID not resolved for delete_project.");
          previousState = await projectService.getById(entityId);
          await projectService.delete(entityId);
          break;
        }

        case 'link_project': {
          if (!entityId) throw new Error("Target ID (goal) not resolved for link_project.");
          const projectId = request.resolvedParentId; // We stored the project ID here in TargetResolver
          if (!projectId) throw new Error("Project ID not resolved for link_project.");
          
          previousState = await goalService.getById(entityId);
          newState = await goalService.update(entityId, { projectId });
          break;
        }

        case 'create_skill': {
          newState = await skillService.create({
            name: (request as any).name,
            description: (request as any).description,
            level: (request as any).level || 0
          });
          entityId = newState._id;
          break;
        }

        case 'update_skill': {
          if (!entityId) throw new Error("Target ID not resolved for update_skill.");
          previousState = await skillService.getById(entityId);
          newState = await skillService.update(entityId, {
            ...(request as any).changes,
            name: (request as any).changes?.name || previousState?.name
          });
          break;
        }

        case 'delete_skill': {
          if (!entityId) throw new Error("Target ID not resolved for delete_skill.");
          previousState = await skillService.getById(entityId);
          await skillService.delete(entityId);
          break;
        }

        // Legacy Fallback for unspecified
        default: {
          const legacy = request as any as LegacyActionRequest;
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
        entity: request.type.includes('sub_goal') ? 'sub_goal' : request.type.includes('goal') ? 'goal' : 'item',
        entityId,
        previousState,
        newState,
        message: `Successfully executed ${request.type}.`
      };

    } catch (e: any) {
      console.error(`[ActionExecutor] Execution failed for ${request.type}:`, e);
      return {
        success: false,
        actionId,
        type: request.type,
        entity: request.type.includes('sub_goal') ? 'sub_goal' : request.type.includes('goal') ? 'goal' : 'item',
        errorCode: 'EXECUTION_FAILED',
        message: e.message
      };
    }
  }

  private static async executeLegacy(request: LegacyActionRequest, actionId: string): Promise<ActionResult> {
    const service = request.entity === 'project' ? projectService : request.entity === 'goal' ? goalService : null;
    if (!service) throw new Error(`Service for ${request.entity} not found.`);

    let targetId = request.targetId;
    if (request.operation !== 'create' && !targetId && request.targetSearchQuery) {
      targetId = await EntityResolver.resolve(request.entity, request.targetSearchQuery) || undefined;
    }

    if (request.operation !== 'create' && !targetId) {
      throw new Error(`Target entity not found for legacy operation ${request.operation}.`);
    }

    let newState = null;
    if (request.operation === 'create') newState = await service.create(request.data);
    else if (request.operation === 'update') newState = await service.update(targetId!, request.changes);
    else if (request.operation === 'delete') await service.delete(targetId!);

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
