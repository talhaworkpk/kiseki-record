import { RetrievalIntent } from './RetrievalTypes';

export class PrivacyGuard {
  /**
   * Phase 4.15: Privacy/Public Mode Enforcement
   * The retrieval engine should apply the privacy boundary BEFORE data reaches the model.
   * If the app is in Public Mode, and the intent is deemed highly private (e.g., Journal, Memory Capsules),
   * the guard will block it or redact the filters.
   */
  public static async enforce(intent: RetrievalIntent): Promise<RetrievalIntent> {
    // Determine if we are in public mode. 
    let isPublicMode = true; // default safe
    try {
      // @ts-ignore
      const currentProfile = await window.api.profile.getCurrent();
      isPublicMode = currentProfile !== 'private';
    } catch (e) {
      console.warn('[PrivacyGuard] Failed to check profile mode, assuming public.', e);
    }
    
    if (isPublicMode) {
      const privateSections = ['journal', 'memory_capsules', 'relationships', 'records'];
      
      if (privateSections.includes(intent.section)) {
        console.warn(`[PrivacyGuard] BLOCKED access to ${intent.section} due to Public Mode.`);
        // Override the intent so the engine doesn't fetch real data
        return {
          section: 'unknown',
          filters: { entityName: 'Blocked by PrivacyGuard' }
        };
      }
    }
    
    return intent;
  }
}
