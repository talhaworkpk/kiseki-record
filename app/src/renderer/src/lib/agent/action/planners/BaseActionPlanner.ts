import { AgentAction } from '../ActionTypes';

export abstract class BaseActionPlanner {
  /**
   * Generates a prompt for the LLM based on the provided fields and values.
   */
  public abstract generatePrompt(fields: string[]): string;

  /**
   * Builds deterministic actions directly from structured fields, bypassing the LLM.
   */
  public buildDeterministicActions(fields: string[]): AgentAction[] {
    return [];
  }

  /**
   * Parses the raw LLM output into an array of AgentActions.
   */
  public parseActionRequests(rawOutput: string): { cleanMessage: string, requests: AgentAction[] } {
    const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/) || 
                      rawOutput.match(/\{[\s\S]*\}/);
                      
    if (!jsonMatch) {
      return { cleanMessage: "I attempted to process your request, but I was unable to generate a valid response.", requests: [] };
    }

    try {
      const data = JSON.parse(jsonMatch[0].replace(/```json|```/g, ''));
      if (data && Array.isArray(data.actions)) {
        return { cleanMessage: "Please confirm the following action plan:", requests: data.actions as AgentAction[] };
      }
    } catch (e) {
      console.error("[BaseActionPlanner] JSON Parsing Error:", e);
    }
    
    return { cleanMessage: "I attempted to process your request, but I was unable to generate a valid response.", requests: [] };
  }
}
