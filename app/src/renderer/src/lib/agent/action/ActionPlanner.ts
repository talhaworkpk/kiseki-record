import { AgentAction } from './ActionTypes';
import { EntityRegistry } from './ActionRegistry';

export class ActionPlanner {
  
  /**
   * Generates a highly optimized system prompt extension for Qwen3-VL 4B.
   */
  public static getSystemPromptExtension(): string {
    return `
=== ACTION ENGINE ===
You are an intelligent assistant. Answer the user's questions naturally based on the provided [KISEKI CONTEXT].

IF the user asks you to CREATE, UPDATE, or DELETE records, you MUST ALSO append a JSON block at the end of your response to execute those changes. 
If no actions are needed (e.g., normal chatting, refusing a request, answering a question), DO NOT output a JSON block at all. Just reply naturally.
You MUST output at least one natural sentence explaining your thoughts before any JSON block. Do not output only JSON.
Enclose the JSON in a markdown block: \`\`\`json { ... } \`\`\`

EXAMPLE JSON (DO NOT COPY THIS! ONLY USE THIS FORMAT FOR ACTUAL USER REQUESTS):
{
  "actions": [
    {
      "type": "update_goal",
      "targetSearchQuery": "test9",
      "changes": { "name": "Fitness Goal", "status": "Active", "progress": 50 }
    },
    {
      "type": "create_sub_goal",
      "parentGoalSearchQuery": "test9",
      "name": "Test1"
    },
    {
      "type": "create_goal",
      "name": "Fitness"
    },
    {
      "type": "link_project",
      "targetSearchQuery": "Fitness Goal",
      "projectSearchQuery": "My Project"
    }
  ]
}

Available Action Types:
- create_goal (requires: name)
- update_goal (requires: targetSearchQuery, changes)
- delete_goal (requires: targetSearchQuery)
- create_sub_goal (requires: parentGoalSearchQuery, name)
- update_sub_goal (requires: targetSearchQuery, changes)
- delete_sub_goal (requires: targetSearchQuery)
- create_project (requires: name)
- update_project (requires: targetSearchQuery, changes)
- delete_project (requires: targetSearchQuery)
- link_project (requires: targetSearchQuery (the goal), projectSearchQuery (the project))
- create_skill (requires: name)
- update_skill (requires: targetSearchQuery, changes)
- delete_skill (requires: targetSearchQuery)

Rules:
1. "targetSearchQuery" MUST be a human-readable name, NOT an ID.
2. Group multiple changes to the same entity into a single action.
3. NEVER copy the exact data from the example JSON above.
4. If you refuse a request, DO NOT output any JSON actions.
5. ONLY output a JSON block if the user EXPLICITLY and DIRECTLY asks you to "create", "update", or "delete" a record. Do NOT invent actions for analysis or general chatting.
`;
  }

  /**
   * Parses the raw text output from the LLM to extract the actions array.
   */
  public static parseActionRequests(aiResponse: string): { cleanMessage: string, requests: AgentAction[] } {
    let cleanMessage = aiResponse;
    const requests: AgentAction[] = [];

    // Match any ```json ... ``` block
    let jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let jsonString = jsonMatch ? jsonMatch[1] : null;
    let blockToRemove = jsonMatch ? jsonMatch[0] : '';
    
    // Fallback: look for the outermost { ... }
    if (!jsonString) {
      const firstBrace = aiResponse.indexOf('{');
      const lastBrace = aiResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonString = aiResponse.substring(firstBrace, lastBrace + 1);
        blockToRemove = jsonString;
      }
    }

    if (jsonString) {
      let successfullyParsedActions = false;
      try {
        jsonString = jsonString.replace(/^```json/i, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(jsonString);
        
        if (parsed && Array.isArray(parsed.actions)) {
          requests.push(...parsed.actions);
          successfullyParsedActions = true;
        } else if (parsed && Array.isArray(parsed.actionRequests)) {
          // Fallback for older model memories
          requests.push(...parsed.actionRequests);
          successfullyParsedActions = true;
        } else if (Array.isArray(parsed)) {
          requests.push(...parsed);
          successfullyParsedActions = true;
        } else if (parsed && parsed.type) {
          requests.push(parsed);
          successfullyParsedActions = true;
        }
      } catch (e) {
        console.error('[ActionPlanner] Failed to parse action JSON:', e, 'Raw JSON:', jsonString);
      }
      
      if (successfullyParsedActions) {
        cleanMessage = aiResponse.replace(blockToRemove, '').trim();
      }
    }

    if (requests.length === 0) {
      if (cleanMessage.trim().length === 0) {
        if (jsonString) {
          cleanMessage = "I've processed your action! Let me know if you need anything else.";
        } else {
          cleanMessage = "[System: The AI model returned an empty response. This usually happens when the local model's internal safety filters silently block explicit content. Try using an 'uncensored' model variant.]";
        }
      }
    } else {
      if (cleanMessage.trim().length === 0) {
        cleanMessage = "Please confirm the following action plan:";
      }
    }

    return { cleanMessage, requests };
  }
}
