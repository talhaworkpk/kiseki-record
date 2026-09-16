import { BaseActionPlanner } from './BaseActionPlanner';
import { AgentAction } from '../ActionTypes';
import { StructuredCommandParser } from '../StructuredCommandParser';

export class GoalActionPlanner extends BaseActionPlanner {
  
  public generatePrompt(fields: string[]): string {
    // goal: [title], [state], [start date], [end date], [description], [sub-goal], [link project]
    const title = fields[0] || '';
    const state = fields[1] || '';
    const startDate = fields[2] || '';
    const endDate = fields[3] || '';
    const description = fields[4] || '';
    
    // Subgoals can repeat in position 5..N-1, the last field is linked project if present?
    // Wait, the spec says "[sub-goal] may occur multiple times". 
    // And "goal: Node.js goals, planned, today, , learn Node.js, phase 1, Node.js Project"
    // "link project" is position 6? If sub-goals repeat, does link project shift?
    // Yes, the prompt said: "goal: Node.js goals, planned, today, , learn Node.js, phase1, phase2, final, Node.js Project"
    
    let subGoals: string[] = [];
    let linkedProject = '';
    
    if (fields.length > 5) {
      if (fields.length === 6) {
        // If there's only one extra field, is it a subgoal or project?
        // The prompt mapped 5 -> sub-goal, 6 -> link project. So if length is 6, it could be a sub-goal.
        subGoals.push(fields[5]);
      } else {
        subGoals = fields.slice(5, fields.length - 1).filter(g => g.trim() !== '');
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

  public buildDeterministicActions(fields: string[]): AgentAction[] {
    const title = fields[0] || '';
    const state = StructuredCommandParser.normalizeStatus(fields[1]);
    const startDate = StructuredCommandParser.normalizeDate(fields[2]);
    const endDate = StructuredCommandParser.normalizeDate(fields[3]);
    const description = fields[4] || '';
    
    let subGoals: string[] = [];
    let linkedProject = '';
    
    if (fields.length > 5) {
      if (fields.length === 6) {
        subGoals.push(fields[5]);
      } else {
        subGoals = fields.slice(5, fields.length - 1).filter(g => g.trim() !== '');
        linkedProject = fields[fields.length - 1];
      }
    }

    const actions: AgentAction[] = [];
    
    const goalAction: any = {
      type: 'create_goal',
      name: title.trim(),
      description: description.trim()
    };

    if (startDate) goalAction.startDate = startDate;
    if (endDate) goalAction.endDate = endDate;
    if (state) goalAction.status = state;
    
    if (subGoals.length > 0) {
      goalAction.subGoals = subGoals.map((sg, i) => ({
        id: `sub_${Date.now()}_${i}_${Math.floor(Math.random() * 10000)}`,
        title: sg.trim(),
        completed: false,
        order: i
      }));
    }

    if (linkedProject.trim()) {
      goalAction.projectSearchQuery = linkedProject.trim();
    }

    actions.push(goalAction as AgentAction);

    return actions;
  }
}
