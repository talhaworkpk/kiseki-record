class c{static getSystemPromptExtension(){return`
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
`}static parseActionRequests(s){let a=s;const n=[];let o=s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i),t=o?o[1]:null,l=o?o[0]:"";if(!t){const r=s.indexOf("{"),e=s.lastIndexOf("}");r!==-1&&e>r&&(t=s.substring(r,e+1),l=t)}if(t){let r=!1;try{t=t.replace(/^```json/i,"").replace(/```$/,"").trim();const e=JSON.parse(t);e&&Array.isArray(e.actions)?(n.push(...e.actions),r=!0):e&&Array.isArray(e.actionRequests)?(n.push(...e.actionRequests),r=!0):Array.isArray(e)?(n.push(...e),r=!0):e&&e.type&&(n.push(e),r=!0)}catch(e){console.error("[ActionPlanner] Failed to parse action JSON:",e,"Raw JSON:",t)}r&&(a=s.replace(l,"").trim())}return n.length===0?a.trim().length===0&&(t?a="I've processed your action! Let me know if you need anything else.":a="[System: The AI model returned an empty response. This usually happens when the local model's internal safety filters silently block explicit content. Try using an 'uncensored' model variant.]"):a.trim().length===0&&(a="Please confirm the following action plan:"),{cleanMessage:a,requests:n}}}export{c as ActionPlanner};
