export type ActionOperation = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'archive' 
  | 'restore' 
  | 'complete' 
  | 'uncomplete' 
  | 'link' 
  | 'unlink';

export type ActionType = 
  | 'create_goal' | 'update_goal' | 'delete_goal'
  | 'create_sub_goal' | 'update_sub_goal' | 'delete_sub_goal'
  | 'create_project' | 'update_project' | 'delete_project'
  | 'link_project'
  | 'create_skill' | 'update_skill' | 'delete_skill';

export interface BaseAction {
  id?: string;
  type: ActionType;
  parentActionId?: string; // Used for dependency resolution in sequential execution
  resolvedTargetId?: string; // Injected by TargetResolver
  resolvedParentId?: string; // Injected by TargetResolver
}

export interface CreateGoalAction extends BaseAction {
  type: 'create_goal';
  name: string;
  description?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  startDate?: string;
  targetDate?: string;
}

export interface UpdateGoalAction extends BaseAction {
  type: 'update_goal';
  targetSearchQuery: string;
  changes: {
    name?: string;
    description?: string;
    status?: 'Planned' | 'Active' | 'Paused' | 'Completed' | 'Cancelled' | 'Archived';
    progress?: number;
    priority?: 'low' | 'medium' | 'high';
  };
}

export interface DeleteGoalAction extends BaseAction {
  type: 'delete_goal';
  targetSearchQuery: string;
}

export interface CreateSubGoalAction extends BaseAction {
  type: 'create_sub_goal';
  parentGoalSearchQuery?: string;
  name: string;
  description?: string;
  targetDate?: string;
}

export interface UpdateSubGoalAction extends BaseAction {
  type: 'update_sub_goal';
  parentGoalSearchQuery?: string;
  targetSearchQuery: string;
  changes: {
    name?: string;
    completed?: boolean;
    targetDate?: string;
  };
}

export interface DeleteSubGoalAction extends BaseAction {
  type: 'delete_sub_goal';
  parentGoalSearchQuery?: string;
  targetSearchQuery: string;
}

export interface CreateProjectAction extends BaseAction {
  type: 'create_project';
  name: string;
  description?: string;
}

export interface UpdateProjectAction extends BaseAction {
  type: 'update_project';
  targetSearchQuery: string;
  changes: {
    name?: string;
    description?: string;
  };
}

export interface DeleteProjectAction extends BaseAction {
  type: 'delete_project';
  targetSearchQuery: string;
}

export interface LinkProjectAction extends BaseAction {
  type: 'link_project';
  targetSearchQuery: string; // The goal to link
  projectSearchQuery: string; // The project to link it to
}

export interface CreateSkillAction extends BaseAction {
  type: 'create_skill';
  name: string;
  description?: string;
  level?: number;
}

export interface UpdateSkillAction extends BaseAction {
  type: 'update_skill';
  targetSearchQuery: string;
  changes: {
    name?: string;
    description?: string;
    level?: number;
  };
}

export interface DeleteSkillAction extends BaseAction {
  type: 'delete_skill';
  targetSearchQuery: string;
}

// Fallback for untyped actions from older versions or dynamic implementations
export interface LegacyActionRequest {
  actionId?: string;
  operation: ActionOperation;
  entity: string;
  targetId?: string;
  targetSearchQuery?: string;
  data?: any;
  changes?: any;
}

export type AgentAction = 
  | CreateGoalAction 
  | UpdateGoalAction 
  | DeleteGoalAction
  | CreateSubGoalAction 
  | UpdateSubGoalAction 
  | DeleteSubGoalAction
  | CreateProjectAction
  | UpdateProjectAction
  | DeleteProjectAction
  | LinkProjectAction
  | CreateSkillAction
  | UpdateSkillAction
  | DeleteSkillAction
  | (BaseAction & LegacyActionRequest);

export interface ActionPlan {
  actions: AgentAction[];
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  type: ActionType | ActionOperation;
  entity?: string; // for legacy
  entityId?: string;
  previousState?: any;
  newState?: any;
  message?: string;
  errorCode?: string;
}

export interface ActionGroup {
  actionGroupId: string;
  conversationId?: string;
  userMessageId?: string;
  createdAt: number;
  actions: ActionResult[];
  status: 'pending' | 'completed' | 'failed' | 'partially_completed' | 'undone' | 'undo_failed';
}

export type ActionPlanStatus = 'idle' | 'planning' | 'pending_confirmation' | 'cancelled' | 'executing' | 'completed' | 'failed';

export interface PendingActionPlan {
  actionPlanId: string;
  conversationId?: string;
  userMessageId?: string;
  actions: AgentAction[];
  requiresConfirmation: boolean;
  status: ActionPlanStatus;
  createdAt: number;
  error?: string;
}
