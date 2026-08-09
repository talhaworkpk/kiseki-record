import { contextBridge, ipcRenderer } from 'electron'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', {
      db: {
        find: (collection: string, query: any) => ipcRenderer.invoke('db:find', collection, query),
        insert: (collection: string, doc: any) => ipcRenderer.invoke('db:insert', collection, doc),
        update: (collection: string, query: any, update: any, options: any) => ipcRenderer.invoke('db:update', collection, query, update, options),
        remove: (collection: string, query: any, options: any) => ipcRenderer.invoke('db:remove', collection, query, options)
      },
      vault: {
        export: (options: any) => ipcRenderer.invoke('vault:export', options),
        import: (options: any) => ipcRenderer.invoke('vault:import', options),
        delete: (options: any) => ipcRenderer.invoke('vault:delete', options),
        rename: (options: any) => ipcRenderer.invoke('vault:rename', options),
        download: (options: any) => ipcRenderer.invoke('vault:download', options),
        listBackups: () => ipcRenderer.invoke('vault:listBackups')
      },
      attachment: {
        add: (options?: any) => ipcRenderer.invoke('attachment:add', options),
        saveBase64: (base64: string) => ipcRenderer.invoke('attachment:save-base64', base64),
        saveFile: (path: string) => ipcRenderer.invoke('attachment:save-file', path)
      },
      export: {
        pdf: (data: any) => ipcRenderer.invoke('export-pdf', data),
        reportPdf: (data: any) => ipcRenderer.invoke('export-report-pdf', data),
        journalPdf: (data: any) => ipcRenderer.invoke('export-journal-pdf', data),
        getLogs: () => ipcRenderer.invoke('get-export-logs')
      },
      map: {
        getRegions: () => ipcRenderer.invoke('map:getRegions'),
        startDownload: (regionId: string) => ipcRenderer.invoke('map:startDownload', regionId),
        pauseDownload: (regionId: string) => ipcRenderer.invoke('map:pauseDownload', regionId),
        resumeDownload: (regionId: string) => ipcRenderer.invoke('map:resumeDownload', regionId),
        cancelDownload: (regionId: string) => ipcRenderer.invoke('map:cancelDownload', regionId),
        deleteRegion: (regionId: string) => ipcRenderer.invoke('map:deleteRegion', regionId),
        getStorageInfo: () => ipcRenderer.invoke('map:getStorageInfo'),
        onDownloadProgress: (callback: (data: any) => void) => {
          ipcRenderer.on('map:downloadProgress', (_event, data) => callback(data))
        },
        offDownloadProgress: () => {
          ipcRenderer.removeAllListeners('map:downloadProgress')
        }
      },
      ipcRenderer: {
        on: (channel: string, listener: any) => ipcRenderer.on(channel, listener),
        removeListener: (channel: string, listener: any) => ipcRenderer.removeListener(channel, listener)
      },
      profile: {
        getCurrent: () => ipcRenderer.invoke('profile:getCurrent'),
        hasPrivate: () => ipcRenderer.invoke('profile:hasPrivate'),
        getSettings: () => ipcRenderer.invoke('profile:getSettings'),
        setupPrivate: (password: string, hint?: string, name?: string) => ipcRenderer.invoke('profile:setupPrivate', password, hint, name),
        switch: (password: string | null) => ipcRenderer.invoke('profile:switch', password),
        updateSettings: (updates: any) => ipcRenderer.invoke('profile:updateSettings', updates),
        updatePassword: (oldPw: string, newPw: string) => ipcRenderer.invoke('profile:updatePassword', oldPw, newPw),
        delete: (password: string) => ipcRenderer.invoke('profile:delete', password)
      },
      notifications: {
        getSettings: () => ipcRenderer.invoke('notifications:getSettings'),
        updateSettings: (updates: any) => ipcRenderer.invoke('notifications:updateSettings', updates),
        triggerTest: (type: string) => ipcRenderer.invoke('notifications:triggerTest', type),
        triggerInApp: (type: string, title: string, message: string, sourceModule?: string, targetPath?: string) => 
          ipcRenderer.invoke('notifications:triggerInApp', type, title, message, sourceModule, targetPath)
      },
      app: {
        restart: () => ipcRenderer.invoke('app:restart')
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = {
    db: {
      find: (collection: string, query: any) => ipcRenderer.invoke('db:find', collection, query),
      insert: (collection: string, doc: any) => ipcRenderer.invoke('db:insert', collection, doc),
      update: (collection: string, query: any, update: any, options: any) => ipcRenderer.invoke('db:update', collection, query, update, options),
      remove: (collection: string, query: any, options: any) => ipcRenderer.invoke('db:remove', collection, query, options)
    },
    vault: {
      export: (options: any) => ipcRenderer.invoke('vault:export', options),
      import: (options: any) => ipcRenderer.invoke('vault:import', options),
      delete: (options: any) => ipcRenderer.invoke('vault:delete', options),
      rename: (options: any) => ipcRenderer.invoke('vault:rename', options),
      download: (options: any) => ipcRenderer.invoke('vault:download', options),
      listBackups: () => ipcRenderer.invoke('vault:listBackups')
    },
    attachment: {
      add: () => ipcRenderer.invoke('attachment:add'),
      saveBase64: (base64: string) => ipcRenderer.invoke('attachment:save-base64', base64),
      saveFile: (path: string) => ipcRenderer.invoke('attachment:save-file', path)
    },
    export: {
      pdf: (data: any) => ipcRenderer.invoke('export-pdf', data),
      reportPdf: (data: any) => ipcRenderer.invoke('export-report-pdf', data),
      journalPdf: (data: any) => ipcRenderer.invoke('export-journal-pdf', data),
      getLogs: () => ipcRenderer.invoke('get-export-logs')
    },
    map: {
      getRegions: () => ipcRenderer.invoke('map:getRegions'),
      startDownload: (regionId: string) => ipcRenderer.invoke('map:startDownload', regionId),
      pauseDownload: (regionId: string) => ipcRenderer.invoke('map:pauseDownload', regionId),
      resumeDownload: (regionId: string) => ipcRenderer.invoke('map:resumeDownload', regionId),
      cancelDownload: (regionId: string) => ipcRenderer.invoke('map:cancelDownload', regionId),
      deleteRegion: (regionId: string) => ipcRenderer.invoke('map:deleteRegion', regionId),
      getStorageInfo: () => ipcRenderer.invoke('map:getStorageInfo'),
      onDownloadProgress: (callback: (data: any) => void) => {
        ipcRenderer.on('map:downloadProgress', (_event, data) => callback(data))
      },
      offDownloadProgress: () => {
        ipcRenderer.removeAllListeners('map:downloadProgress')
      }
    },
    ipcRenderer: {
      on: (channel: string, listener: any) => ipcRenderer.on(channel, listener),
      removeListener: (channel: string, listener: any) => ipcRenderer.removeListener(channel, listener)
    },
    profile: {
      getCurrent: () => ipcRenderer.invoke('profile:getCurrent'),
      hasPrivate: () => ipcRenderer.invoke('profile:hasPrivate'),
      getSettings: () => ipcRenderer.invoke('profile:getSettings'),
      setupPrivate: (password: string, hint?: string, name?: string) => ipcRenderer.invoke('profile:setupPrivate', password, hint, name),
      switch: (password: string | null) => ipcRenderer.invoke('profile:switch', password),
      updateSettings: (updates: any) => ipcRenderer.invoke('profile:updateSettings', updates),
      updatePassword: (oldPw: string, newPw: string) => ipcRenderer.invoke('profile:updatePassword', oldPw, newPw),
      delete: (password: string) => ipcRenderer.invoke('profile:delete', password)
    },
    notifications: {
      getSettings: () => ipcRenderer.invoke('notifications:getSettings'),
      updateSettings: (updates: any) => ipcRenderer.invoke('notifications:updateSettings', updates),
      triggerTest: (type: string) => ipcRenderer.invoke('notifications:triggerTest', type),
      triggerInApp: (type: string, title: string, message: string, sourceModule?: string, targetPath?: string) => 
        ipcRenderer.invoke('notifications:triggerInApp', type, title, message, sourceModule, targetPath)
    },
    app: {
      restart: () => ipcRenderer.invoke('app:restart')
    }
  }
}
