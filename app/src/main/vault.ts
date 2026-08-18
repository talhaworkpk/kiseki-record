import { ipcMain, dialog, app } from 'electron'
import JSZip from 'jszip'
import fs from 'fs'
import path from 'path'

const userDataPath = app.getPath('userData')
const dataPath = path.join(userDataPath, 'data')

export function setupVaultHandlers() {
  ipcMain.handle('vault:export', async (_event, _options) => {
    try {
      const zip = new JSZip()
      
      // Add DB files
      if (fs.existsSync(dataPath)) {
        const files = fs.readdirSync(dataPath)
        for (const file of files) {
          if (file.endsWith('.db')) {
            const filePath = path.join(dataPath, file)
            if (fs.statSync(filePath).isFile()) {
              zip.file(`data/${file}`, fs.readFileSync(filePath))
            }
          }
        }
      }

      // Add attachments
      const attachmentsPath = path.join(dataPath, 'attachments')
      if (fs.existsSync(attachmentsPath)) {
        const files = fs.readdirSync(attachmentsPath)
        for (const file of files) {
          const fullPath = path.join(attachmentsPath, file)
          if (fs.statSync(fullPath).isFile()) {
            zip.file(`data/attachments/${file}`, fs.readFileSync(fullPath))
          }
        }
      }

      // Add Settings
      const settingsPath = path.join(userDataPath, 'config.json')
      if (fs.existsSync(settingsPath)) {
        zip.file('config.json', fs.readFileSync(settingsPath))
      }

      const backupsDir = path.join(userDataPath, 'backups')
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true })
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filePath = path.join(backupsDir, `kiseki_backup_${timestamp}.kvault`)
      
      return new Promise((resolve) => {
        zip
          .generateNodeStream({ type: 'nodebuffer', streamFiles: true, compression: 'DEFLATE' })
          .pipe(fs.createWriteStream(filePath))
          .on('finish', () => resolve({ success: true, filePath }))
          .on('error', (err: any) => {
            console.error(err)
            resolve({ success: false, error: err.message })
          })
      })
    } catch (err: any) {
      console.error(err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('vault:import', async (_event, options) => {
    try {
      let filePath = options.filePath
      if (!filePath) {
        const { filePaths } = await dialog.showOpenDialog({
          title: 'Import Local Vault',
          filters: [{ name: 'Kiseki Vault', extensions: ['kvault', 'zip'] }],
          properties: ['openFile']
        })
        if (filePaths && filePaths.length > 0) {
          filePath = filePaths[0]
        }
      }

      if (filePath) {
        const data = fs.readFileSync(filePath)
        const zip = await JSZip.loadAsync(data)
        
        // Ensure data directory exists
        if (!fs.existsSync(dataPath)) {
          fs.mkdirSync(dataPath, { recursive: true })
        }

        const mode = options.mode || 'replace'

        for (const [filename, fileData] of Object.entries(zip.files)) {
          if (!fileData.dir) {
            const buffer = await fileData.async('nodebuffer')
            if (filename === 'config.json') {
              fs.writeFileSync(path.join(userDataPath, filename), buffer)
            } else if (filename.startsWith('data/')) {
              const destPath = path.join(userDataPath, filename)
              
              // Ensure directory exists
              const destDir = path.dirname(destPath)
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true })
              }

              if (filename.startsWith('data/attachments/')) {
                fs.writeFileSync(destPath, buffer)
              } else {
                const patchLine = (line: string) => {
                  try {
                    const obj = JSON.parse(line)
                    if (obj && !obj.$$indexCreated) {
                      // Force everything imported to go into the private profile
                      obj.profile = 'private'
                    }
                    return JSON.stringify(obj)
                  } catch (e) {
                    return line
                  }
                }

                if (mode === 'replace' || !fs.existsSync(destPath)) {
                  const newLines = buffer.toString('utf8').split('\n').filter(l => l.trim())
                  const patchedLines = newLines.map(patchLine)
                  fs.writeFileSync(destPath, patchedLines.join('\n') + '\n')
                } else {
                  // True merge for NeDB JSONL files
                  const existingLines = fs.readFileSync(destPath, 'utf8').split('\n').filter(l => l.trim())
                  const newLines = buffer.toString('utf8').split('\n').filter(l => l.trim())
                  
                  const mergedMap = new Map()
                  
                  const processObj = (obj: any) => {
                    if (obj._id) {
                      const existing = mergedMap.get(obj._id)
                      if (!existing || (obj.updatedAt && (!existing.updatedAt || obj.updatedAt > existing.updatedAt))) {
                        mergedMap.set(obj._id, obj)
                      }
                    } else if (obj.$$indexCreated) {
                      mergedMap.set(JSON.stringify(obj), obj) // Keep index defs uniquely
                    }
                  }
                  
                  existingLines.forEach(line => {
                    try { processObj(JSON.parse(line)) } catch(e) {}
                  })
                  
                  newLines.forEach(line => {
                    try { processObj(JSON.parse(patchLine(line))) } catch(e) {}
                  })
                  
                  const outLines = Array.from(mergedMap.values()).map(obj => JSON.stringify(obj)).join('\n')
                  fs.writeFileSync(destPath, outLines + '\n')
                }
              }
            }
          }
        }
        
        // Force app relaunch or reload to load new DB state
        // For simplicity, we just return success and tell the user to restart
        return { success: true, filePath }
      }
      return { success: false, cancelled: true }
    } catch (err: any) {
      console.error(err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('vault:delete', async (_event, options) => {
    try {
      if (options.filePath && fs.existsSync(options.filePath)) {
        fs.unlinkSync(options.filePath)
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('vault:rename', async (_event, options) => {
    try {
      const { oldPath, newName } = options
      if (!fs.existsSync(oldPath)) throw new Error('File not found')
      
      const dir = path.dirname(oldPath)
      // ensure new name ends with .kvault
      let finalName = newName
      if (!finalName.endsWith('.kvault')) finalName += '.kvault'
      
      const newPath = path.join(dir, finalName)
      fs.renameSync(oldPath, newPath)
      
      return { success: true, newPath }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('vault:download', async (_event, options) => {
    try {
      const { sourcePath } = options
      if (!fs.existsSync(sourcePath)) throw new Error('Source file not found')
      
      const { filePath } = await dialog.showSaveDialog({
        title: 'Save Vault Copy As...',
        defaultPath: path.basename(sourcePath),
        filters: [{ name: 'Kiseki Vault', extensions: ['kvault'] }]
      })
      
      if (filePath) {
        fs.copyFileSync(sourcePath, filePath)
        return { success: true, filePath }
      }
      return { success: false, cancelled: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('vault:listBackups', async () => {
    try {
      const backupsDir = path.join(userDataPath, 'backups')
      if (!fs.existsSync(backupsDir)) return { success: true, backups: [] }
      
      const files = fs.readdirSync(backupsDir)
      const backups = files
        .filter(f => f.endsWith('.kvault'))
        .map(f => {
          const fullPath = path.join(backupsDir, f)
          const stat = fs.statSync(fullPath)
          return {
            path: fullPath,
            name: f,
            date: stat.mtimeMs
          }
        })
        .sort((a, b) => b.date - a.date)
        
      return { success: true, backups }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
