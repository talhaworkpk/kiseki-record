import { ipcMain } from 'electron'
import { settingsStore } from './database'

export function setupAiHandlers() {
  ipcMain.handle('ai:models', async () => {
    try {
      const ollamaUrl = settingsStore.get('ollamaUrl', 'http://127.0.0.1:11434') as string
      const response = await fetch(`${ollamaUrl}/api/tags`)
      if (!response.ok) throw new Error(`Ollama responded with ${response.status}`)
      const data = await response.json()
      return { success: true, models: data.models }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // We are not streaming from backend to frontend to keep it simple,
  // alternatively the frontend can just hit localhost:11434 directly 
  // since it's a local REST API and context isolation doesn't block local fetch
  // if CSP is configured correctly (which we did in index.html).
  // 
  // Wait, actually, making direct fetch requests from the renderer to localhost
  // is perfectly fine in Electron if CSP allows it, and is much easier for streaming.
  // I will just add the `ai:models` helper here, but streaming will be done in the UI.
}
