export type CapabilityRating = 'excellent' | 'good' | 'limited' | 'unsupported' | 'not_tested' | 'test_failed' | 'hardware_limited';

export interface CapabilityTestResult {
  rating: CapabilityRating;
  passed?: number;
  total?: number;
  durationMs?: number;
  error?: string | null;
  reason?: string;
  testedAt?: number;
  testVersion?: number;
}

export type RecommendedRole = 'Primary Agent' | 'General Chat' | 'Vision AI';

export interface AIModelInfo {
  name: string;
  installed: boolean;
  available: boolean;

  size?: number; // Size in bytes
  parameterSize?: string; // e.g., "8B"
  contextLength?: number;

  health:
    | 'unknown'
    | 'testing'
    | 'healthy'
    | 'warning'
    | 'failed';

  capabilities: {
    chat: CapabilityTestResult;
    json: CapabilityTestResult;
    agent: CapabilityTestResult;
    reasoning: CapabilityTestResult;
    vision: CapabilityTestResult;
    ocr: CapabilityTestResult;
  };

  testVersion?: number;
  testDurationMs?: number;
  recommendedRoles?: RecommendedRole[];

  // Legacy fields
  compatibilityScore?: number;
  compatibilityLevel?:
    | 'excellent'
    | 'good'
    | 'limited'
    | 'unsupported';

  lastTestedAt?: number;
  
  performance?: {
    latencyMs?: number;
    tokensPerSecond?: number;
  };

  tags?: string[]; // Internal capability tags like "TEXT", "IMAGE", "AGENT"
}
