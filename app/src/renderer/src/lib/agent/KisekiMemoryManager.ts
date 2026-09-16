import { Message } from '../../types'

export type SafetyLevel = 'SAFE' | 'WARNING' | 'HIGH_RISK' | 'BLOCKED'

export interface MemorySafetyResult {
  estimatedChars: number
  level: SafetyLevel
  isVision: boolean
}

export class KisekiMemoryManager {
  // Base configuration limits (characters)
  private static readonly TEXT_WARNING = 16000
  private static readonly TEXT_BLOCKED = 32000
  
  private static readonly VISION_WARNING = 8000
  private static readonly VISION_BLOCKED = 16000

  /**
   * Evaluates the memory safety of the prompt that is about to be sent.
   */
  public static evaluateMemorySafety(
    messages: Message[], 
    isVision: boolean, 
    memoryMultiplier: number
  ): MemorySafetyResult {
    const estimatedChars = this.estimatePromptSize(messages)
    
    const maxWarning = (isVision ? this.VISION_WARNING : this.TEXT_WARNING) * memoryMultiplier
    const maxBlocked = (isVision ? this.VISION_BLOCKED : this.TEXT_BLOCKED) * memoryMultiplier
    
    let level: SafetyLevel = 'SAFE'
    
    if (estimatedChars >= maxBlocked) {
      level = 'BLOCKED'
    } else if (estimatedChars >= maxWarning * 1.5) {
      level = 'HIGH_RISK'
    } else if (estimatedChars >= maxWarning) {
      level = 'WARNING'
    }
    
    console.log(`[KisekiMemory] Messages: ${messages.length}, Chars: ${estimatedChars}, Vision: ${isVision}, Level: ${level}, Multiplier: ${memoryMultiplier}`)
    
    return {
      estimatedChars,
      level,
      isVision
    }
  }

  /**
   * Slices the conversation array to ensure it fits comfortably within the allowed limit.
   * Guarantees that the LAST user message is always preserved.
   */
  public static buildBoundedPrompt(
    messages: Message[],
    isVision: boolean,
    memoryMultiplier: number
  ): Message[] {
    const maxChars = (isVision ? this.VISION_BLOCKED : this.TEXT_BLOCKED) * memoryMultiplier
    
    // We must always keep the most recent message (the one the user just sent).
    const bounded: Message[] = []
    let currentChars = 0
    
    // Start from the newest message and work backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      const msgChars = this.estimateMessageSize(msg)
      
      // If adding this message exceeds the hard limit, and we already have at least 1 message, we stop.
      if (currentChars + msgChars > maxChars && bounded.length > 0) {
        console.log(`[KisekiMemory] Truncated conversation history at message index ${i} to fit within memory bounds.`)
        break
      }
      
      // Unshift to maintain chronological order
      bounded.unshift(msg)
      currentChars += msgChars
    }
    
    return bounded
  }

  /**
   * Helper to estimate character size of a single message, including hidden context.
   */
  private static estimateMessageSize(msg: Message): number {
    let chars = msg.content?.length || 0
    if (msg.dbContext) {
      chars += msg.dbContext.length
    }
    // Rough overhead for JSON/role formatting
    return chars + 50 
  }

  /**
   * Helper to estimate total character size of all messages.
   */
  private static estimatePromptSize(messages: Message[]): number {
    return messages.reduce((sum, msg) => sum + this.estimateMessageSize(msg), 0)
  }
}
