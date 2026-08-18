import Store from 'electron-store'

const store = new Store()

export interface AIConfig {
  provider: 'openai' | 'gemini' | 'ollama'
  apiKey: string
  model: string
}

export function getAIConfig(): AIConfig {
  return {
    provider: (store.get('ai.provider') as any) || 'gemini',
    apiKey: (store.get('ai.apiKey') as string) || '',
    model: (store.get('ai.model') as string) || 'gemini-1.5-flash',
  }
}

export function setAIConfig(config: AIConfig) {
  store.set('ai.provider', config.provider)
  store.set('ai.apiKey', config.apiKey)
  store.set('ai.model', config.model)
}

export async function generateInsight(prompt: string, contextData: any): Promise<string> {
  const config = getAIConfig()
  
  if (config.provider !== 'ollama' && !config.apiKey) {
    throw new Error('API Key is missing for ' + config.provider)
  }

  const systemPrompt = "You are Kiseki Record's AI assistant. You provide short, insightful analysis on the user's personal records, habits, and relationships. Keep answers concise, human-like, and directly address the user. Output ONLY the response text."
  
  const fullPrompt = `${systemPrompt}\n\nContext Data:\n${JSON.stringify(contextData)}\n\nUser Request: ${prompt}`

  try {
    if (config.provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.7 }
        })
      })
      if (!response.ok) {
        const err = await response.text()
        throw new Error('Gemini API Error: ' + err)
      }
      const data = await response.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No insight generated.'
    } 
    else if (config.provider === 'openai') {
      const url = 'https://api.openai.com/v1/chat/completions'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Context Data:\n${JSON.stringify(contextData)}\n\nUser Request: ${prompt}` }
          ],
          temperature: 0.7
        })
      })
      if (!response.ok) {
        const err = await response.text()
        throw new Error('OpenAI API Error: ' + err)
      }
      const data = await response.json()
      return data.choices?.[0]?.message?.content || 'No insight generated.'
    }
    else if (config.provider === 'ollama') {
      const url = 'http://127.0.0.1:11434/api/generate'
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model || 'llama3',
          prompt: fullPrompt,
          stream: false
        })
      })
      if (!response.ok) {
        const err = await response.text()
        throw new Error('Ollama API Error: ' + err)
      }
      const data = await response.json()
      return data.response || 'No insight generated.'
    }
  } catch (error: any) {
    console.error('AI Generation Error:', error)
    throw new Error(error.message)
  }
  
  return 'Provider not supported.'
}
