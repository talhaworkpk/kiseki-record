import { KisekiRetrievalEngine } from './retrieval/KisekiRetrievalEngine'

export class KisekiAgent {
  /**
   * Phase 4: Agent Wrapper with Retrieval Engine
   */
  public static async sendMessage(options: {
    model: string;
    messages: any[];
    abortSignal?: AbortSignal;
    skipKiseki?: boolean;
  }): Promise<{ response: Response, dbContext: string }> {
    
    // Step 11: Safety check - Bypass database if any image is attached to the recent messages
    const hasImages = options.messages.some(m => m.images && m.images.length > 0);
    const lastUserMessage = options.messages.filter(m => m.role === 'user').pop()?.content || '';
    
    let dbContext = '';
    
    if (!hasImages && lastUserMessage && !options.skipKiseki) {
      dbContext = await KisekiRetrievalEngine.process(lastUserMessage, options.messages);
    }

    // Phase 5 System Prompt Injection
    let ActionPlanner: any = null;
    let systemPromptExtension = '';
    try {
      if (!options.skipKiseki) {
        const plannerModule = await import('./action/ActionPlanner');
        ActionPlanner = plannerModule.ActionPlanner;
        systemPromptExtension = '\n\n' + ActionPlanner.getSystemPromptExtension();
      }
    } catch (e) {
      console.warn('Phase 5 not fully ready:', e);
    }
    
    // Inject context into the latest user message instead of system prompt
    // This preserves Ollama's KV cache for the system prompt and conversation history,
    // drastically speeding up prompt evaluation on slow hardware.
    const finalMessages = [...options.messages];
    if (dbContext) {
      const lastUserIndex = finalMessages.map(m => m.role).lastIndexOf('user');
      if (lastUserIndex !== -1) {
        finalMessages[lastUserIndex] = { 
          ...finalMessages[lastUserIndex], 
          content: dbContext + finalMessages[lastUserIndex].content 
        };
      }
    }

    // Inject system prompt extension to the system prompt
    const systemIndex = finalMessages.findIndex(m => m.role === 'system');
    if (systemIndex !== -1) {
      finalMessages[systemIndex] = {
        ...finalMessages[systemIndex],
        content: finalMessages[systemIndex].content + systemPromptExtension
      };
    } else {
      finalMessages.unshift({
        role: 'system',
        content: 'You are Kiseki, a helpful AI assistant.' + systemPromptExtension
      });
    }

    // Calculate a safe dynamic context window
    let textLength = 0;
    let imageCount = 0;
    for (const m of finalMessages) {
      textLength += (m.content?.length || 0);
      if (m.images) imageCount += m.images.length;
    }
    
    // ~3 chars per token for text, ~1500 tokens per image for LLaVA
    const estimatedTokens = Math.ceil(textLength / 3) + (imageCount * 1500);
    // Min 2048, Max 16384, plus 1024 for response space
    const safeNumCtx = Math.max(2048, Math.min(16384, estimatedTokens + 1024));

    console.log('[KisekiAgent] Sending one Ollama request with dynamic num_ctx:', safeNumCtx);
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model,
        messages: finalMessages,
        stream: true,
        options: { num_ctx: safeNumCtx } 
      }),
      signal: options.abortSignal
    });

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        // ignore
      }
      throw new Error(`Failed to fetch from Ollama: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return { response, dbContext };
  }
}
