import { OllamaClient } from './OllamaClient';
import { AIModelInfo } from './ModelTypes';
import { ModelHealthChecker } from './ModelHealthChecker';

export class ModelRegistry {
  private static CACHE_KEY = 'kiseki_ai_models_cache';
  public static readonly TEST_VERSION = 4;
  private static models: AIModelInfo[] = [];
  private static listeners: ((models: AIModelInfo[]) => void)[] = [];

  /**
   * Initialize the registry, load cache, and perform a lightweight discovery
   */
  static async initialize() {
    this.loadCache();
    await this.discoverModels();
  }

  /**
   * Subscribe to model list changes
   */
  static subscribe(callback: (models: AIModelInfo[]) => void) {
    this.listeners.push(callback);
    callback(this.models);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private static notifyListeners() {
    this.listeners.forEach(cb => cb([...this.models]));
  }

  private static loadCache() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        this.models = JSON.parse(cached);
        this.models.forEach(m => {
          // Invalidate old cache tests
          if (m.testVersion !== this.TEST_VERSION) {
            m.health = 'unknown';
            m.capabilities = {
              chat: { rating: 'not_tested' },
              json: { rating: 'not_tested' },
              agent: { rating: 'not_tested' },
              reasoning: { rating: 'not_tested' },
              vision: { rating: 'not_tested' },
              ocr: { rating: 'not_tested' }
            };
            delete m.compatibilityLevel;
            delete m.compatibilityScore;
            m.testVersion = this.TEST_VERSION;
            
            // Re-eval vision statically to set unsupported if it's definitely not a vision model
            if (m.tags && !m.tags.includes('IMAGE')) {
               m.capabilities.vision = { rating: 'unsupported', reason: 'Not a vision architecture' };
               m.capabilities.ocr = { rating: 'unsupported', reason: 'Not a vision architecture' };
            }
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load ModelRegistry cache', e);
    }
  }

  private static saveCache() {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.models));
    } catch (e) {
      console.warn('Failed to save ModelRegistry cache', e);
    }
  }

  /**
   * Discover currently installed models without running expensive tests.
   * If a model is new, it is added with 'unknown' health.
   * If a model is removed, it is marked as uninstalled.
   */
  static async discoverModels() {
    const isRunning = await OllamaClient.checkConnection();
    if (!isRunning) {
      this.models.forEach(m => m.available = false);
      this.notifyListeners();
      return;
    }

    const installedTags = await OllamaClient.listModels();
    const installedNames = installedTags.map(t => t.name);

    let changed = false;

    // Mark removed models
    this.models.forEach(m => {
      if (m.installed && !installedNames.includes(m.name)) {
        m.installed = false;
        m.available = false;
        changed = true;
      }
    });

    // Add new models
    for (const tag of installedTags) {
      const existing = this.models.find(m => m.name === tag.name);
      if (!existing) {
        this.models.push({
          name: tag.name,
          installed: true,
          available: true,
          size: tag.size,
          parameterSize: tag.details?.parameter_size,
          health: 'unknown',
          testVersion: this.TEST_VERSION,
          capabilities: {
            chat: { rating: 'not_tested' },
            json: { rating: 'not_tested' },
            agent: { rating: 'not_tested' },
            reasoning: { rating: 'not_tested' },
            vision: (tag.details?.families || []).some((f: string) => ['clip', 'llava', 'bakllava', 'qwen2vl', 'qwen3vl', 'minicpm-v', 'vision'].includes(f.toLowerCase())) ? { rating: 'not_tested' } : { rating: 'unsupported' },
            ocr: (tag.details?.families || []).some((f: string) => ['clip', 'llava', 'bakllava', 'qwen2vl', 'qwen3vl', 'minicpm-v', 'vision'].includes(f.toLowerCase())) ? { rating: 'not_tested' } : { rating: 'unsupported' }
          }
        });
        changed = true;
      } else {
        if (!existing.installed || !existing.available) {
          existing.installed = true;
          existing.available = true;
          changed = true;
        }

        if (!existing.capabilities || typeof existing.capabilities.chat === 'boolean' || existing.testVersion !== this.TEST_VERSION) {
          const isVision = (tag.details?.families || []).some((f: string) => ['clip', 'llava', 'bakllava', 'qwen2vl', 'qwen3vl', 'minicpm-v', 'vision'].includes(f.toLowerCase()));
          existing.capabilities = {
            chat: { rating: 'not_tested' },
            json: { rating: 'not_tested' },
            agent: { rating: 'not_tested' },
            reasoning: { rating: 'not_tested' },
            vision: isVision ? { rating: 'not_tested' } : { rating: 'unsupported' },
            ocr: isVision ? { rating: 'not_tested' } : { rating: 'unsupported' }
          };
          existing.testVersion = this.TEST_VERSION;
          changed = true;
        }
        // Update size info if it was missing
        if (!existing.size && tag.size) {
          existing.size = tag.size;
          existing.parameterSize = tag.details?.parameter_size;
          changed = true;
        }
      }
    }

    if (changed) {
      this.saveCache();
      this.notifyListeners();
    }
  }

  /**
   * Get all models
   */
  static getModels(): AIModelInfo[] {
    return [...this.models];
  }

  /**
   * Manually test a specific model
   */
  static async testModel(modelName: string, abortSignal?: AbortSignal): Promise<void> {
    const model = this.models.find(m => m.name === modelName);
    if (!model) return;

    model.health = 'testing';
    this.notifyListeners();

    try {
      const result = await ModelHealthChecker.testModel(modelName, abortSignal);
      
      Object.assign(model, result);
      model.testVersion = this.TEST_VERSION;
      
      this.saveCache();
      this.notifyListeners();
    } catch (e: any) {
      if (e.message !== 'Aborted') {
        model.health = 'failed';
        model.compatibilityLevel = 'unsupported';
        this.saveCache();
        this.notifyListeners();
      } else {
        // Restore to previous or unknown if aborted
        if (model.health === 'testing') {
           model.health = model.lastTestedAt ? 'healthy' : 'unknown'; // naive fallback
           this.notifyListeners();
        }
      }
    }
  }
}
