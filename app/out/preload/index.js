"use strict";
const electron = require("electron");
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("api", {
      db: {
        find: (collection, query) => electron.ipcRenderer.invoke("db:find", collection, query),
        insert: (collection, doc) => electron.ipcRenderer.invoke("db:insert", collection, doc),
        update: (collection, query, update, options) => electron.ipcRenderer.invoke("db:update", collection, query, update, options),
        remove: (collection, query, options) => electron.ipcRenderer.invoke("db:remove", collection, query, options)
      },
      vault: {
        export: (options) => electron.ipcRenderer.invoke("vault:export", options),
        import: (options) => electron.ipcRenderer.invoke("vault:import", options),
        delete: (options) => electron.ipcRenderer.invoke("vault:delete", options),
        rename: (options) => electron.ipcRenderer.invoke("vault:rename", options),
        download: (options) => electron.ipcRenderer.invoke("vault:download", options),
        listBackups: () => electron.ipcRenderer.invoke("vault:listBackups")
      },
      attachment: {
        add: (options) => electron.ipcRenderer.invoke("attachment:add", options),
        saveBase64: (base64) => electron.ipcRenderer.invoke("attachment:save-base64", base64),
        saveFile: (path) => electron.ipcRenderer.invoke("attachment:save-file", path)
      },
      export: {
        pdf: (data) => electron.ipcRenderer.invoke("export-pdf", data),
        reportPdf: (data) => electron.ipcRenderer.invoke("export-report-pdf", data),
        journalPdf: (data) => electron.ipcRenderer.invoke("export-journal-pdf", data),
        getLogs: () => electron.ipcRenderer.invoke("get-export-logs")
      },
      map: {
        getRegions: () => electron.ipcRenderer.invoke("map:getRegions"),
        startDownload: (regionId) => electron.ipcRenderer.invoke("map:startDownload", regionId),
        pauseDownload: (regionId) => electron.ipcRenderer.invoke("map:pauseDownload", regionId),
        resumeDownload: (regionId) => electron.ipcRenderer.invoke("map:resumeDownload", regionId),
        cancelDownload: (regionId) => electron.ipcRenderer.invoke("map:cancelDownload", regionId),
        deleteRegion: (regionId) => electron.ipcRenderer.invoke("map:deleteRegion", regionId),
        getStorageInfo: () => electron.ipcRenderer.invoke("map:getStorageInfo"),
        onDownloadProgress: (callback) => {
          electron.ipcRenderer.on("map:downloadProgress", (_event, data) => callback(data));
        },
        offDownloadProgress: () => {
          electron.ipcRenderer.removeAllListeners("map:downloadProgress");
        }
      },
      ipcRenderer: {
        on: (channel, listener) => electron.ipcRenderer.on(channel, listener),
        removeListener: (channel, listener) => electron.ipcRenderer.removeListener(channel, listener)
      },
      profile: {
        getCurrent: () => electron.ipcRenderer.invoke("profile:getCurrent"),
        hasPrivate: () => electron.ipcRenderer.invoke("profile:hasPrivate"),
        getSettings: () => electron.ipcRenderer.invoke("profile:getSettings"),
        setupPrivate: (password, hint, name) => electron.ipcRenderer.invoke("profile:setupPrivate", password, hint, name),
        switch: (password) => electron.ipcRenderer.invoke("profile:switch", password),
        updateSettings: (updates) => electron.ipcRenderer.invoke("profile:updateSettings", updates),
        updatePassword: (oldPw, newPw) => electron.ipcRenderer.invoke("profile:updatePassword", oldPw, newPw),
        delete: (password) => electron.ipcRenderer.invoke("profile:delete", password),
        activity: () => electron.ipcRenderer.invoke("profile:activity")
      },
      notifications: {
        getSettings: () => electron.ipcRenderer.invoke("notifications:getSettings"),
        updateSettings: (updates) => electron.ipcRenderer.invoke("notifications:updateSettings", updates),
        triggerTest: (type) => electron.ipcRenderer.invoke("notifications:triggerTest", type),
        triggerInApp: (type, title, message, sourceModule, targetPath) => electron.ipcRenderer.invoke("notifications:triggerInApp", type, title, message, sourceModule, targetPath)
      },
      app: {
        restart: () => electron.ipcRenderer.invoke("app:restart")
      }
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.api = {
    db: {
      find: (collection, query) => electron.ipcRenderer.invoke("db:find", collection, query),
      insert: (collection, doc) => electron.ipcRenderer.invoke("db:insert", collection, doc),
      update: (collection, query, update, options) => electron.ipcRenderer.invoke("db:update", collection, query, update, options),
      remove: (collection, query, options) => electron.ipcRenderer.invoke("db:remove", collection, query, options)
    },
    vault: {
      export: (options) => electron.ipcRenderer.invoke("vault:export", options),
      import: (options) => electron.ipcRenderer.invoke("vault:import", options),
      delete: (options) => electron.ipcRenderer.invoke("vault:delete", options),
      rename: (options) => electron.ipcRenderer.invoke("vault:rename", options),
      download: (options) => electron.ipcRenderer.invoke("vault:download", options),
      listBackups: () => electron.ipcRenderer.invoke("vault:listBackups")
    },
    attachment: {
      add: () => electron.ipcRenderer.invoke("attachment:add"),
      saveBase64: (base64) => electron.ipcRenderer.invoke("attachment:save-base64", base64),
      saveFile: (path) => electron.ipcRenderer.invoke("attachment:save-file", path)
    },
    export: {
      pdf: (data) => electron.ipcRenderer.invoke("export-pdf", data),
      reportPdf: (data) => electron.ipcRenderer.invoke("export-report-pdf", data),
      journalPdf: (data) => electron.ipcRenderer.invoke("export-journal-pdf", data),
      getLogs: () => electron.ipcRenderer.invoke("get-export-logs")
    },
    map: {
      getRegions: () => electron.ipcRenderer.invoke("map:getRegions"),
      startDownload: (regionId) => electron.ipcRenderer.invoke("map:startDownload", regionId),
      pauseDownload: (regionId) => electron.ipcRenderer.invoke("map:pauseDownload", regionId),
      resumeDownload: (regionId) => electron.ipcRenderer.invoke("map:resumeDownload", regionId),
      cancelDownload: (regionId) => electron.ipcRenderer.invoke("map:cancelDownload", regionId),
      deleteRegion: (regionId) => electron.ipcRenderer.invoke("map:deleteRegion", regionId),
      getStorageInfo: () => electron.ipcRenderer.invoke("map:getStorageInfo"),
      onDownloadProgress: (callback) => {
        electron.ipcRenderer.on("map:downloadProgress", (_event, data) => callback(data));
      },
      offDownloadProgress: () => {
        electron.ipcRenderer.removeAllListeners("map:downloadProgress");
      }
    },
    ipcRenderer: {
      on: (channel, listener) => electron.ipcRenderer.on(channel, listener),
      removeListener: (channel, listener) => electron.ipcRenderer.removeListener(channel, listener)
    },
    profile: {
      getCurrent: () => electron.ipcRenderer.invoke("profile:getCurrent"),
      hasPrivate: () => electron.ipcRenderer.invoke("profile:hasPrivate"),
      getSettings: () => electron.ipcRenderer.invoke("profile:getSettings"),
      setupPrivate: (password, hint, name) => electron.ipcRenderer.invoke("profile:setupPrivate", password, hint, name),
      switch: (password) => electron.ipcRenderer.invoke("profile:switch", password),
      updateSettings: (updates) => electron.ipcRenderer.invoke("profile:updateSettings", updates),
      updatePassword: (oldPw, newPw) => electron.ipcRenderer.invoke("profile:updatePassword", oldPw, newPw),
      delete: (password) => electron.ipcRenderer.invoke("profile:delete", password),
      activity: () => electron.ipcRenderer.invoke("profile:activity")
    },
    notifications: {
      getSettings: () => electron.ipcRenderer.invoke("notifications:getSettings"),
      updateSettings: (updates) => electron.ipcRenderer.invoke("notifications:updateSettings", updates),
      triggerTest: (type) => electron.ipcRenderer.invoke("notifications:triggerTest", type),
      triggerInApp: (type, title, message, sourceModule, targetPath) => electron.ipcRenderer.invoke("notifications:triggerInApp", type, title, message, sourceModule, targetPath)
    },
    app: {
      restart: () => electron.ipcRenderer.invoke("app:restart")
    }
  };
}
