import { OllamaClient } from './OllamaClient';
import { AIModelInfo, CapabilityTestResult, CapabilityRating, RecommendedRole } from './ModelTypes';
import { ModelRegistry } from './ModelRegistry';
import testImage from '../../assets/test_image.jpg';

export class ModelHealthChecker {
  static async getBase64Image(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  static async testModel(modelName: string, abortSignal?: AbortSignal, currentVisionStatus?: CapabilityRating): Promise<Partial<AIModelInfo>> {
    const startTime = Date.now();
    let totalLatency = 0;
    
    // Initialize base capabilities
    const capabilities: AIModelInfo['capabilities'] = {
      chat: { rating: 'not_tested', testedAt: Date.now(), testVersion: ModelRegistry.TEST_VERSION },
      json: { rating: 'not_tested', testedAt: Date.now(), testVersion: ModelRegistry.TEST_VERSION },
      agent: { rating: 'not_tested', testedAt: Date.now(), testVersion: ModelRegistry.TEST_VERSION },
      reasoning: { rating: 'not_tested', testedAt: Date.now(), testVersion: ModelRegistry.TEST_VERSION },
      vision: { rating: currentVisionStatus || 'not_tested', testedAt: Date.now(), testVersion: ModelRegistry.TEST_VERSION },
      ocr: { rating: 'not_tested', testedAt: Date.now(), testVersion: ModelRegistry.TEST_VERSION }
    };

    // Keep track of healthy tests
    let health: AIModelInfo['health'] = 'healthy';
    
    // TEST 1: Chat
    try {
      const start = Date.now();
      const res = await OllamaClient.chat(modelName, [
        { role: 'system', content: 'You are performing a capability test.' },
        { role: 'user', content: 'Reply with exactly: KISEKI_TEST_OK' }
      ], undefined, undefined, abortSignal, 0);
      
      const content = res.content.trim();
      const duration = Date.now() - start;
      totalLatency += res.metrics?.latencyMs || duration;
      
      if (content.includes('KISEKI_TEST_OK')) {
        capabilities.chat.rating = content === 'KISEKI_TEST_OK' ? 'excellent' : 'good';
        capabilities.chat.reason = content === 'KISEKI_TEST_OK' ? 'Perfect instruction adherence' : 'Contained expected string but was verbose';
      } else {
        capabilities.chat.rating = 'unsupported';
        capabilities.chat.reason = 'Failed to generate expected string';
      }
      capabilities.chat.durationMs = duration;
    } catch (e: any) {
      if (e.message?.includes('AbortError')) throw e;
      capabilities.chat.rating = 'test_failed';
      capabilities.chat.error = e.message;
      health = 'warning'; // General failure could indicate model loading issue
    }

    // TEST 2: JSON
    try {
      const start = Date.now();
      const res = await OllamaClient.chat(modelName, [
        { role: 'user', content: 'Return a JSON object with exactly one property named status whose value is ok.' }
      ], undefined, undefined, abortSignal, 0);
      
      let content = res.content.trim();
      const duration = Date.now() - start;
      totalLatency += res.metrics?.latencyMs || duration;
      
      let jsonRating: CapabilityRating = 'excellent';
      if (content.startsWith('```')) {
        const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          content = match[1].trim();
          jsonRating = 'good'; // used markdown block
        }
      }
      
      try {
        const parsed = JSON.parse(content);
        if (parsed.status === 'ok' || parsed.status === 'OK') {
          capabilities.json.rating = jsonRating;
        } else {
          capabilities.json.rating = 'limited';
          capabilities.json.reason = 'Parsed JSON but missing required properties';
        }
      } catch (err) {
        capabilities.json.rating = 'unsupported';
        capabilities.json.reason = 'Output was not valid JSON';
      }
      capabilities.json.durationMs = duration;
    } catch (e: any) {
      if (e.message?.includes('AbortError')) throw e;
      capabilities.json.rating = 'test_failed';
      capabilities.json.error = e.message;
    }

    // TEST 3: Agent
    try {
      const start = Date.now();
      const res = await OllamaClient.chat(modelName, [
        { role: 'system', content: 'Available tools:\n{"name": "get_weather", "description": "Get current weather in a city", "parameters": {"city": "string"}}\nReply with a JSON tool call structure: {"tool": "get_weather", "arguments": {"city": "..."}}' },
        { role: 'user', content: 'The user wants the weather in Lahore. Which tool should you call and what arguments should you provide?' }
      ], undefined, undefined, abortSignal, 0);
      
      let content = res.content.trim();
      const duration = Date.now() - start;
      totalLatency += res.metrics?.latencyMs || duration;
      
      let agentRating: CapabilityRating = 'excellent';
      if (content.startsWith('```')) {
        const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          content = match[1].trim();
          agentRating = 'good';
        }
      }
      
      try {
        const parsed = JSON.parse(content);
        if (parsed.tool === 'get_weather' && parsed.arguments && parsed.arguments.city?.toLowerCase() === 'lahore') {
          capabilities.agent.rating = agentRating;
        } else {
          capabilities.agent.rating = 'limited';
          capabilities.agent.reason = 'Structured tool call detected but arguments/name were incorrect';
        }
      } catch (err) {
        capabilities.agent.rating = 'unsupported';
        capabilities.agent.reason = 'Failed to output correct tool schema';
      }
      capabilities.agent.durationMs = duration;
    } catch (e: any) {
      if (e.message?.includes('AbortError')) throw e;
      capabilities.agent.rating = 'test_failed';
      capabilities.agent.error = e.message;
    }

    // TEST 4: Reasoning
    try {
      const start = Date.now();
      const res = await OllamaClient.chat(modelName, [
        { role: 'user', content: 'If I have 3 apples and eat 1, how many are left? Answer with just the number.' }
      ], undefined, undefined, abortSignal, 0);
      
      const content = res.content.trim();
      const duration = Date.now() - start;
      totalLatency += res.metrics?.latencyMs || duration;
      
      if (content.includes('2')) {
        capabilities.reasoning.rating = content.length < 5 ? 'excellent' : 'good';
        capabilities.reasoning.reason = content.length < 5 ? 'Perfect deduction' : 'Correct but overly verbose';
      } else {
        capabilities.reasoning.rating = 'unsupported';
        capabilities.reasoning.reason = 'Incorrect logic';
      }
      capabilities.reasoning.durationMs = duration;
    } catch (e: any) {
      if (e.message?.includes('AbortError')) throw e;
      capabilities.reasoning.rating = 'test_failed';
      capabilities.reasoning.error = e.message;
    }

    // TEST 5 & 6: Vision and OCR (Only if model family supports it, or if it isn't explicitly unsupported)
    if (capabilities.vision.rating !== 'unsupported') {
      let b64 = '';
      try { b64 = await this.getBase64Image(testImage); } catch (e) {}

      if (b64) {
        // VISION TEST
        try {
          const start = Date.now();
          const res = await OllamaClient.chat(modelName, [
            { role: 'user', content: 'What is visible in this image? Describe briefly.', images: [b64] }
          ], undefined, undefined, abortSignal, 0);
          
          const content = res.content.toLowerCase();
          const duration = Date.now() - start;
          totalLatency += res.metrics?.latencyMs || duration;
          
          if (content.includes('kiseki') || content.includes('text') || content.includes('123') || content.includes('word') || content.includes('number')) {
            capabilities.vision.rating = 'excellent';
          } else {
            capabilities.vision.rating = 'limited';
            capabilities.vision.reason = 'Responded but failed to identify the contents properly';
          }
          capabilities.vision.durationMs = duration;
        } catch (e: any) {
          if (e.message?.includes('AbortError')) throw e;
          capabilities.vision.rating = 'test_failed';
          capabilities.vision.error = e.message;
        }

        // OCR TEST
        try {
          const start = Date.now();
          const res = await OllamaClient.chat(modelName, [
            { role: 'user', content: 'What exact text is visible in this image? Reply with only the text.', images: [b64] }
          ], undefined, undefined, abortSignal, 0);
          
          const content = res.content.toUpperCase();
          const duration = Date.now() - start;
          totalLatency += res.metrics?.latencyMs || duration;
          
          if (content.includes('KISEKI TEST 123')) {
            capabilities.ocr.rating = 'excellent';
          } else if (content.includes('KISEKI') || content.includes('TEST') || content.includes('123')) {
            capabilities.ocr.rating = 'good';
            capabilities.ocr.reason = 'Partially recognized text';
          } else {
            capabilities.ocr.rating = 'limited';
            capabilities.ocr.reason = 'Failed to extract text accurately';
          }
          capabilities.ocr.durationMs = duration;
        } catch (e: any) {
          if (e.message?.includes('AbortError')) throw e;
          capabilities.ocr.rating = 'test_failed';
          capabilities.ocr.error = e.message;
        }
      } else {
        capabilities.vision.rating = 'test_failed';
        capabilities.vision.error = 'Failed to load test image internally';
        capabilities.ocr.rating = 'test_failed';
      }
    }

    const testDurationMs = Date.now() - startTime;
    const avgLatency = totalLatency / 4; // approximate
    
    // Check if the model failed too many fundamental tests to be considered healthy
    if (capabilities.chat.rating === 'test_failed' && 
        capabilities.json.rating === 'test_failed' && 
        capabilities.agent.rating === 'test_failed') {
      health = 'failed';
    }

    const recommendedRoles = this.calculateRoles(capabilities);
    const tags = this.generateTags(capabilities);

    return {
      health,
      capabilities,
      testDurationMs,
      recommendedRoles,
      testVersion: ModelRegistry.TEST_VERSION,
      lastTestedAt: Date.now(),
      performance: {
        latencyMs: avgLatency,
        tokensPerSecond: 0
      },
      tags
    };
  }

  private static calculateRoles(caps: AIModelInfo['capabilities']): RecommendedRole[] {
    const roles: RecommendedRole[] = [];
    
    if (['excellent', 'good'].includes(caps.agent.rating) && 
        ['excellent', 'good'].includes(caps.json.rating)) {
      roles.push('Primary Agent');
    }
    
    if (['excellent', 'good'].includes(caps.chat.rating)) {
      roles.push('General Chat');
    }
    
    if (['excellent', 'good'].includes(caps.vision.rating)) {
      roles.push('Vision AI');
    }
    
    if (roles.length === 0) {
      roles.push('Not Recommended');
    }
    
    return roles;
  }

  private static generateTags(caps: AIModelInfo['capabilities']): string[] {
    const tags: string[] = ['TEXT'];
    if (['excellent', 'good'].includes(caps.chat.rating)) tags.push('CHAT');
    if (['excellent', 'good', 'limited'].includes(caps.vision.rating)) tags.push('IMAGE', 'VISION');
    if (['excellent', 'good'].includes(caps.ocr.rating)) tags.push('OCR');
    if (['excellent', 'good'].includes(caps.agent.rating)) tags.push('AGENT', 'TOOLS');
    if (['excellent', 'good'].includes(caps.json.rating)) tags.push('JSON');
    if (['excellent', 'good'].includes(caps.reasoning.rating)) tags.push('REASONING');
    return [...new Set(tags)];
  }
}
