import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, protocol } from 'electron'
import { join } from 'path'
import fs from 'fs'
import path from 'path'
import { db } from './database'
import { profileManager } from './ProfileManager'
import { powerMonitor } from 'electron'
import { setupVaultHandlers } from './vault'
import { setupMapManager } from './map-manager'
import { setupTileServer } from './tile-server'
import { notificationService } from './notification-service'
// @ts-ignore
import iconUrl from '../../icon.png?asset'

let tray: Tray | null = null
let isQuitting = false

const userDataPath = app.getPath('userData')
const attachmentsPath = path.join(userDataPath, 'data', 'attachments')

// Export logging
const exportLogs: string[] = []

function logExport(message: string, error?: any) {
  const timestamp = new Date().toISOString()
  const logEntry = error 
    ? `[${timestamp}] ${message}: ${error.message}\n${error.stack}`
    : `[${timestamp}] ${message}`
  
  exportLogs.push(logEntry)
  console.log('PDF Export:', logEntry)
  
  // Also send to main window for display
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    mainWindow.webContents.send('log-error', {
      source: 'PDF Export',
      message,
      stack: error?.stack
    })
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allow loading local files via file:// protocol
      plugins: true // enable PDF viewer
    }
  })

  mainWindow.on('ready-to-show', () => {
    // Check if we launched in background mode (hidden)
    if (!process.argv.includes('--hidden')) {
      mainWindow.show()
    }
  })

  // Hook into close event for background mode
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      const settings = notificationService.getSettings()
      if (settings.desktopNotificationsEnabled) {
        event.preventDefault()
        mainWindow.hide()
      }
    }
  })

  // Auto-lock when minimized or blurred (if in private mode)
  mainWindow.on('minimize', () => {
    profileManager.switchToPublic(mainWindow)
  })

  mainWindow.on('blur', () => {
    // Note: If you have modals or dialogs, blur might trigger.
    // For a strict lock, we can do it on blur. But to be safe and avoid annoying locks,
    // we can rely on minimize or powerMonitor. Let's just use minimize and power monitor for now,
    // or maybe a strict blur lock if configured.
    const settings = profileManager.getSettings()
    // if lock immediately on blur: (we can add a setting later, but for now just minimize/power)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}



protocol.registerSchemesAsPrivileged([
  { scheme: 'local-media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
])

app.whenReady().then(() => {
  protocol.registerFileProtocol('local-media', (request, callback) => {
    let url = request.url.replace(/^local-media:\/\//i, '')
    try {
      url = decodeURIComponent(url)
    } catch (e) {}
    callback({ path: url })
  })

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.kisekirecord.app')
  }

  // Setup specialized IPC handlers
  setupVaultHandlers()

  // Start notification background checks
  notificationService.markAppOpened()
  notificationService.startBackgroundChecks()
  
  // Setup System Tray
  try {
    const icon = nativeImage.createFromPath(iconUrl)
    
    if (icon.isEmpty()) {
      console.warn('Tray icon not found at', iconUrl, 'using empty image.')
      tray = new Tray(nativeImage.createEmpty())
    } else {
      tray = new Tray(icon.resize({ width: 16, height: 16 }))
    }
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Open Kiseki Record', 
        click: () => {
          const win = BrowserWindow.getAllWindows()[0]
          if (win) {
            win.show()
            if (win.isMinimized()) win.restore()
            win.focus()
          } else {
            createWindow()
          }
        }
      },
      { type: 'separator' },
      { 
        label: 'Quit', 
        click: () => {
          isQuitting = true
          app.quit()
        } 
      }
    ])
    tray.setToolTip('Kiseki Record')
    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.show()
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    })
  } catch (err) {
    console.error('Failed to create tray', err)
  }
  
  if (!fs.existsSync(attachmentsPath)) {
    fs.mkdirSync(attachmentsPath, { recursive: true })
  }

  // Attachments Handler
  ipcMain.handle('attachment:add', async (_event, options) => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: options?.title || 'Add Attachment',
        properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
        filters: options?.filters || []
      })
      if (filePaths && filePaths.length > 0) {
        const results: { filePath: string; filename: string }[] = []
        for (const sourcePath of filePaths) {
          const filename = `${Date.now()}_${path.basename(sourcePath)}`
          const destPath = path.join(attachmentsPath, filename)
          fs.copyFileSync(sourcePath, destPath)
          const fileUrl = 'file:///' + destPath.replace(/\\/g, '/')
          results.push({ filePath: fileUrl, filename: path.basename(sourcePath) })
        }
        return { success: true, files: results }
      }
      return { success: false, cancelled: true }
    } catch (err: any) {
      console.error(err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('attachment:save-base64', async (_, base64Data: string) => {
    try {
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
        return { success: false, error: 'Invalid base64 format' }
      }
      const buffer = Buffer.from(matches[2], 'base64')
      const extension = matches[1].split('/')[1] || 'png'
      const filename = `${Date.now()}_cropped.${extension}`
      const destPath = path.join(attachmentsPath, filename)
      fs.writeFileSync(destPath, buffer)
      const fileUrl = 'file:///' + destPath.replace(/\\/g, '/')
      return { success: true, filePath: fileUrl, filename }
    } catch (err: any) {
      console.error(err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('attachment:save-file', async (_, sourcePath: string) => {
    try {
      const filename = `${Date.now()}_${path.basename(sourcePath)}`
      const destPath = path.join(attachmentsPath, filename)
      fs.copyFileSync(sourcePath, destPath)
      const fileUrl = 'file:///' + destPath.replace(/\\/g, '/')
      return { success: true, filePath: fileUrl, filename }
    } catch (err: any) {
      console.error(err)
      return { success: false, error: err.message }
    }
  })

  // Database IPC Handlers - Intercepted for Profile Separation
  ipcMain.handle('db:find', async (_, collection, query = {}) => {
    query.profile = profileManager.currentProfile
    return new Promise((resolve, reject) => {
      db[collection].find(query, (err, docs) => {
        if (err) reject(err)
        else resolve(docs)
      })
    })
  })

  ipcMain.handle('db:insert', async (_, collection, doc) => {
    const profile = profileManager.currentProfile
    if (Array.isArray(doc)) {
      doc = doc.map(d => ({ ...d, profile }))
    } else {
      doc = { ...doc, profile }
    }
    return new Promise((resolve, reject) => {
      db[collection].insert(doc, (err, newDoc) => {
        if (err) reject(err)
        else resolve(newDoc)
      })
    })
  })

  ipcMain.handle('db:update', async (_, collection, query = {}, update, options) => {
    query.profile = profileManager.currentProfile
    return new Promise((resolve, reject) => {
      db[collection].update(query, update, options || {}, (err, numReplaced) => {
        if (err) reject(err)
        else resolve(numReplaced)
      })
    })
  })

  ipcMain.handle('db:remove', async (_, collection, query = {}, options) => {
    query.profile = profileManager.currentProfile
    return new Promise((resolve, reject) => {
      db[collection].remove(query, options || {}, (err, numRemoved) => {
        if (err) reject(err)
        else resolve(numRemoved)
      })
    })
  })

  // --- Profile IPC Handlers ---
  ipcMain.handle('profile:getCurrent', () => profileManager.currentProfile)
  ipcMain.handle('profile:hasPrivate', () => profileManager.hasPrivateProfile())
  ipcMain.handle('profile:getSettings', () => profileManager.getSettings())
  
  ipcMain.handle('profile:setupPrivate', (_, password, hint, name) => {
    return profileManager.setupPrivateProfile(password, hint, name)
  })
  
  ipcMain.handle('profile:switch', (_, password) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (password === null) {
      profileManager.switchToPublic(win)
      return true
    }
    return profileManager.switchToPrivate(password, win)
  })
  
  ipcMain.handle('profile:updateSettings', (_, updates) => {
    profileManager.updateSettings(updates)
    return true
  })

  ipcMain.handle('profile:updatePassword', (_, oldPassword, newPassword) => {
    return profileManager.updatePassword(oldPassword, newPassword)
  })

  ipcMain.handle('profile:delete', (_, password) => {
    const win = BrowserWindow.getAllWindows()[0]
    const success = profileManager.deletePrivateProfile(password)
    if (success) profileManager.switchToPublic(win)
    return success
  })

  ipcMain.handle('export-pdf', async (_, resumeData: any) => {
    exportLogs.length = 0 // Clear previous logs
    logExport('Export started')
    
    try {
      logExport('Creating hidden print window')
      
      // Create hidden window for PDF generation
      const hiddenWindow = new BrowserWindow({
        width: 1200,
        height: 1600,
        show: false,
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          sandbox: false,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      })

      logExport('Loading print template')
      
      // Load the print template HTML
      if (process.env['ELECTRON_RENDERER_URL']) {
        await hiddenWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/print-template.html`)
      } else {
        await hiddenWindow.loadFile(join(__dirname, '../renderer/print-template.html'))
      }

      logExport('Sending resume data to print window')
      
      // Send resume data to the print window
      hiddenWindow.webContents.send('resume-data', resumeData)

      logExport('Waiting for React render and resources to load')
      
      // Wait for the resume to be ready (fonts loaded, images loaded, React rendered)
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for resume to be ready'))
        }, 30000) // 30 second timeout

        const checkReady = () => {
          // @ts-ignore
          if (hiddenWindow.webContents.executeJavaScript('window.__resumeReady')) {
            clearTimeout(timeout)
            resolve()
          } else {
            setTimeout(checkReady, 100)
          }
        }

        // Start checking after a small delay to allow React to mount
        setTimeout(checkReady, 500)
      })

      logExport('Fonts loaded')
      logExport('Images loaded')
      logExport('React rendered')

      logExport('Generating PDF')
      
      // Generate PDF from the hidden window
      const pdf = await hiddenWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true
      })

      logExport(`PDF generated, size: ${pdf.length} bytes`)
      
      // Close the hidden window
      hiddenWindow.close()
      
      logExport('Export completed')
      
      return pdf
    } catch (error: any) {
      logExport('Export failed', error)
      throw error
    }
  })

  ipcMain.handle('export-journal-pdf', async (_, journalData: any) => {
    exportLogs.length = 0
    logExport('Journal Export started')
    
    try {
      logExport('Creating hidden print window for journal')
      
      const hiddenWindow = new BrowserWindow({
        width: 1000,
        height: 1414, // A4 ratio
        show: false,
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          sandbox: false,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      })

      logExport('Loading print journal template')
      
      if (process.env['ELECTRON_RENDERER_URL']) {
        await hiddenWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/print-journal-template.html`)
      } else {
        await hiddenWindow.loadFile(join(__dirname, '../renderer/print-journal-template.html'))
      }

      logExport('Sending journal data to print window')
      
      hiddenWindow.webContents.send('journal-data', journalData)

      logExport('Waiting for React render and resources to load')
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for journal to be ready'))
        }, 15000)

        const checkReady = () => {
          // @ts-ignore
          if (hiddenWindow.webContents.executeJavaScript('window.__journalReady')) {
            clearTimeout(timeout)
            resolve()
          } else {
            setTimeout(checkReady, 100)
          }
        }

        setTimeout(checkReady, 500)
      })

      logExport('React rendered journal')
      logExport('Generating PDF')
      
      const pdf = await hiddenWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      })

      logExport(`PDF generated, size: ${pdf.length} bytes`)
      hiddenWindow.close()
      logExport('Journal Export completed')
      
      return pdf
    } catch (error: any) {
      logExport('Journal Export failed', error)
      throw error
    }
  })

  ipcMain.handle('export-report-pdf', async (_, reportData: any) => {
    exportLogs.length = 0
    logExport('Report Export started')
    
    try {
      logExport('Creating hidden print window for report')
      
      const hiddenWindow = new BrowserWindow({
        width: 1200,
        height: 1600,
        show: false,
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          sandbox: false,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      })

      logExport('Loading print report template')
      
      if (process.env['ELECTRON_RENDERER_URL']) {
        await hiddenWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/print-report-template.html`)
      } else {
        await hiddenWindow.loadFile(join(__dirname, '../renderer/print-report-template.html'))
      }

      logExport('Sending report data to print window')
      hiddenWindow.webContents.send('report-data', reportData)

      logExport('Waiting for React render and resources to load')
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for report to be ready'))
        }, 30000)

        const checkReady = () => {
          hiddenWindow.webContents.send('report-data', reportData)
          hiddenWindow.webContents.executeJavaScript('window.__reportReady')
            .then((isReady) => {
              if (isReady) {
                clearTimeout(timeout)
                resolve()
              } else {
                setTimeout(checkReady, 100)
              }
            })
            .catch(() => {
              setTimeout(checkReady, 100)
            })
        }
        setTimeout(checkReady, 500)
      })

      logExport('React rendered report')
      logExport('Generating PDF')
      
      const pdf = await hiddenWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true
      })

      logExport(`PDF generated, size: ${pdf.length} bytes`)
      hiddenWindow.close()
      logExport('Report Export completed')
      
      return pdf
    } catch (error: any) {
      logExport('Report Export failed', error)
      throw error
    }
  })

  // Handler to get export logs for error display
  ipcMain.handle('get-export-logs', () => {
    return exportLogs.join('\n')
  })

  // --- Notification Service IPC Handlers ---
  ipcMain.handle('notifications:getSettings', () => {
    return notificationService.getSettings()
  })
  ipcMain.handle('notifications:updateSettings', (_, updates) => {
    notificationService.updateSettings(updates)
    return true
  })
  ipcMain.handle('notifications:triggerTest', (_, type) => {
    if (type === 'inactivity') {
      notificationService.showNotification('Inactivity Reminder (Test)', "You haven't checked in today. Your journey is waiting for you.", 'inactivity', '/')
    } else if (type === 'birthday') {
      notificationService.showNotification('🎂 Happy Birthday! (Test)', `Take a moment today to celebrate your journey and how far you've come.`, 'birthday', '/')
    } else if (type === 'memory') {
      notificationService.showNotification('💌 Memory Capsule (Test)', `A Memory Capsule from your past self is ready to open.`, 'memory', '/memory-capsules')
    }
  })
  ipcMain.handle('notifications:triggerInApp', (_, type, title, message, sourceModule, targetPath) => {
    // This allows renderer to tell main process to optionally show a desktop notification
    // for something that happened in-app, depending on settings
    const settings = notificationService.getSettings()
    
    if (settings.desktopNotificationsEnabled) {
      if (type === 'achievement' && settings.achievementsNotificationEnabled) {
        notificationService.showNotification(title, message, type, targetPath)
      } else if (type === 'milestone' && settings.achievementsNotificationEnabled) {
        notificationService.showNotification(title, message, type, targetPath)
      }
      // Note: birthday and memory capsules are handled by background polls mostly, 
      // but if unlocked manually they could flow through here too.
    }
  })

  // --- App Control Handlers ---
  ipcMain.handle('app:restart', () => {
    app.relaunch()
    app.exit(0)
  })

  createWindow()
  
  const window = BrowserWindow.getAllWindows()[0]
  if (window) {
    notificationService.setMainWindow(window)
  }

  // Setup Map Manager after window creation
  if (window) {
    setupMapManager(window);
  }
  setupTileServer();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  const settings = notificationService.getSettings()
  if (!settings.desktopNotificationsEnabled) {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  }
})

app.on('ready', () => {
  powerMonitor.on('lock-screen', () => {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) profileManager.switchToPublic(wins[0])
  })
  
  powerMonitor.on('suspend', () => {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) profileManager.switchToPublic(wins[0])
  })
})
