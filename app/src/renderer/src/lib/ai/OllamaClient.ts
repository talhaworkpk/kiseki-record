export class OllamaClient {
  private static readonly OLLAMA_URL = 'http://127.0.0.1:11434';

  /**
   * Check if Ollama is running and reachable
   */
  static async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch(this.OLLAMA_URL, { signal: AbortSignal.timeout(2000) });
      return res.ok || res.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Fetch all installed models from Ollama
   */
  static async listModels(): Promise<any[]> {
    try {
      const res = await fetch(`${this.OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('Failed to fetch from Ollama');
      const data = await res.json();
      return data.models || [];
    } catch (e) {
      console.warn('OllamaClient listModels error:', e);
      return [];
    }
  }

  /**
   * Dynamically fetch models and pick the smallest Llama model available,
   * or fallback to the absolute smallest model to save memory.
   */
  static async getBestModel(abortSignal?: AbortSignal): Promise<string> {
    const res = await fetch(`${this.OLLAMA_URL}/api/tags`, { signal: abortSignal });
    if (!res.ok) throw new Error('connection_failed');
    
    const data = await res.json();
    if (data.models && data.models.length > 0) {
      const sortedModels = [...data.models].sort((a: any, b: any) => (a.size || 0) - (b.size || 0));
      const preferred = sortedModels.find((m: any) => m.name.includes('llama'));
      return preferred ? preferred.name : sortedModels[0].name;
    }
    
    throw new Error('no_models_found');
  }

  /**
   * Fetch detailed information about a specific model
   */
  static async getModelInfo(modelName: string): Promise<any | null> {
    try {
      const res = await fetch(`${this.OLLAMA_URL}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Preload a model into memory
   */
  static async preloadModel(modelName: string, abortSignal?: AbortSignal): Promise<boolean> {
    try {
      const res = await fetch(`${this.OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: "", // Empty prompt just loads it into memory
          keep_alive: '5m',
          options: { num_ctx: 2048 } // Use same memory context as chat
        }),
        signal: abortSignal
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Basic chat/generation function for health checks
   */
  static async chat(
    model: string, 
    messages: any[], 
    format?: 'json', 
    options?: any, 
    abortSignal?: AbortSignal,
    keep_alive?: string | number
  ): Promise<{ content: string; metrics: any }> {
    const startTime = Date.now();
    try {
      const res = await fetch(`${this.OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          keep_alive: keep_alive !== undefined ? keep_alive : '5m', // default 5m
          options: options || { temperature: 0.1, num_ctx: 4096 }, // Capped context for testing to prevent OOM
          ...(format ? { format } : {})
        }),
        signal: abortSignal || AbortSignal.timeout(60000) // Increase timeout to 60s for slow local models
      });
      
      if (!res.ok) {
         let errorText = '';
         try { errorText = await res.text(); } catch {}
         throw new Error(`HTTPError: Ollama returned status ${res.status}. ${errorText}`);
      }
      
      const data = await res.json();
      const endTime = Date.now();
      
      return {
        content: data.message?.content || '',
        metrics: {
          latencyMs: endTime - startTime,
          eval_count: data.eval_count,
          eval_duration: data.eval_duration
        }
      };
    } catch (e: any) {
      if (e.name === 'TimeoutError') {
         throw new Error(`TimeoutError: Ollama request timed out`);
      }
      if (e.name === 'AbortError') {
         throw new Error('AbortError: Request was manually cancelled');
      }
      if (e.message?.includes('HTTPError')) {
         throw e;
      }
      throw new Error(`NetworkError: Failed to connect to Ollama. ${e.message}`);
    }
  }

  /**
   * List models currently loaded in Ollama's memory
   */
  static async ps(): Promise<any[]> {
    try {
      const res = await fetch(`${this.OLLAMA_URL}/api/ps`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    } catch (e) {
      return [];
    }
  }
}
