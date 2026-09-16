import { BaseActionPlanner } from './BaseActionPlanner';
import { AgentAction } from '../ActionTypes';
import { StructuredCommandParser } from '../StructuredCommandParser';

export class ProjectActionPlanner extends BaseActionPlanner {
  
  public generatePrompt(fields: string[]): string {
    // project: [title], [description], [start date], [end date], [state], [technologies]
    const title = fields[0] || '';
    const description = fields[1] || '';
    const startDate = fields[2] || '';
    const endDate = fields[3] || '';
    const state = fields[4] || '';
    const technologies = fields.slice(5).filter(t => t.trim() !== '');

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

  public buildDeterministicActions(fields: string[]): AgentAction[] {
    const title = fields[0] || '';
    const description = fields[1] || '';
    const startDate = StructuredCommandParser.normalizeDate(fields[2]);
    const endDate = StructuredCommandParser.normalizeDate(fields[3]);
    const state = StructuredCommandParser.normalizeStatus(fields[4]);
    const githubUrl = StructuredCommandParser.normalizeUrl(fields[5]);
    const liveUrl = StructuredCommandParser.normalizeUrl(fields[6]);
    const technologies = fields.slice(7).filter(t => t.trim() !== '');

    const action: any = {
      type: 'create_project',
      name: title.trim(),
      description: description.trim()
    };

    if (startDate) action.startDate = startDate;
    if (endDate) action.endDate = endDate;
    if (state) action.status = state;
    if (githubUrl) action.githubUrl = githubUrl;
    if (liveUrl) action.liveUrl = liveUrl;
    if (technologies.length > 0) action.technologies = technologies.map(t => t.trim());

    return [action as AgentAction];
  }
}
