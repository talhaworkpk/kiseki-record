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
        listBackups: () => electron.ipcRenderer.invoke("vault:listBackups"),
        getBackupLocation: () => electron.ipcRenderer.invoke("vault:getBackupLocation"),
        setBackupLocation: () => electron.ipcRenderer.invoke("vault:setBackupLocation")
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
        triggerTest: (type, modelName) => electron.ipcRenderer.invoke("notifications:triggerTest", type, modelName),
        triggerInApp: (type, title, message, sourceModule, targetPath) => electron.ipcRenderer.invoke("notifications:triggerInApp", type, title, message, sourceModule, targetPath),
        triggerDesktop: (type, title, message, targetPath) => electron.ipcRenderer.invoke("notifications:triggerDesktop", type, title, message, targetPath)
      },
      app: {
        restart: () => electron.ipcRenderer.invoke("app:restart")
      },
      window: {
        minimize: () => electron.ipcRenderer.invoke("window:minimize"),
        maximize: () => electron.ipcRenderer.invoke("window:maximize"),
        restore: () => electron.ipcRenderer.invoke("window:restore"),
        close: () => electron.ipcRenderer.invoke("window:close"),
        isMaximized: () => electron.ipcRenderer.invoke("window:isMaximized"),
        onMaximizedChanged: (callback) => {
          electron.ipcRenderer.on("window:maximizedChanged", (_event, isMaximized) => callback(isMaximized));
        },
        offMaximizedChanged: () => {
          electron.ipcRenderer.removeAllListeners("window:maximizedChanged");
        }
      },
      ai: {
        notifyModelLoaded: (modelName, success) => {
          console.log(`[NOTIF-2] Preload: ipcRenderer.invoke ai:notifyModelLoaded model=${modelName} success=${success} ✓`);
          return electron.ipcRenderer.invoke("ai:notifyModelLoaded", modelName, success);
        }
      },
      system: {
        getMemoryInfo: () => electron.ipcRenderer.invoke("system:getMemoryInfo")
      },
      storage: {
        getInfo: (mode) => electron.ipcRenderer.invoke("storage:getInfo", mode),
        clearCache: () => electron.ipcRenderer.invoke("storage:clearCache"),
        setMaxAppSize: (size) => electron.ipcRenderer.invoke("storage:setMaxAppSize", size),
        checkLimits: (expectedBytes) => electron.ipcRenderer.invoke("storage:checkLimits", expectedBytes),
        resetData: (mode) => electron.ipcRenderer.invoke("storage:resetData", mode)
      },
      settings: {
        get: (key, defaultValue) => electron.ipcRenderer.invoke("settings:get", key, defaultValue),
        set: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
        delete: (key) => electron.ipcRenderer.invoke("settings:delete", key),
        getAll: () => electron.ipcRenderer.invoke("settings:getAll")
      },
      clockAssets: {
        choose: (type) => electron.ipcRenderer.invoke("clockAssets:choose", type)
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
      listBackups: () => electron.ipcRenderer.invoke("vault:listBackups"),
      getBackupLocation: () => electron.ipcRenderer.invoke("vault:getBackupLocation"),
      setBackupLocation: () => electron.ipcRenderer.invoke("vault:setBackupLocation")
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
      triggerInApp: (type, title, message, sourceModule, targetPath) => electron.ipcRenderer.invoke("notifications:triggerInApp", type, title, message, sourceModule, targetPath),
      triggerDesktop: (type, title, message, targetPath) => electron.ipcRenderer.invoke("notifications:triggerDesktop", type, title, message, targetPath)
    },
    app: {
      restart: () => electron.ipcRenderer.invoke("app:restart")
    },
    window: {
      minimize: () => electron.ipcRenderer.invoke("window:minimize"),
      maximize: () => electron.ipcRenderer.invoke("window:maximize"),
      restore: () => electron.ipcRenderer.invoke("window:restore"),
      close: () => electron.ipcRenderer.invoke("window:close"),
      isMaximized: () => electron.ipcRenderer.invoke("window:isMaximized"),
      onMaximizedChanged: (callback) => {
        electron.ipcRenderer.on("window:maximizedChanged", (_event, isMaximized) => callback(isMaximized));
      },
      offMaximizedChanged: () => {
        electron.ipcRenderer.removeAllListeners("window:maximizedChanged");
      }
    },
    ai: {
      notifyModelLoaded: (modelName, success) => electron.ipcRenderer.invoke("ai:notifyModelLoaded", modelName, success)
    },
    system: {
      getMemoryInfo: () => electron.ipcRenderer.invoke("system:getMemoryInfo")
    },
    storage: {
      getInfo: (mode) => electron.ipcRenderer.invoke("storage:getInfo", mode),
      clearCache: () => electron.ipcRenderer.invoke("storage:clearCache"),
      setMaxAppSize: (size) => electron.ipcRenderer.invoke("storage:setMaxAppSize", size),
      checkLimits: (expectedBytes) => electron.ipcRenderer.invoke("storage:checkLimits", expectedBytes),
      resetData: (mode) => electron.ipcRenderer.invoke("storage:resetData", mode)
    },
    settings: {
      get: (key, defaultValue) => electron.ipcRenderer.invoke("settings:get", key, defaultValue),
      set: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
      delete: (key) => electron.ipcRenderer.invoke("settings:delete", key),
      getAll: () => electron.ipcRenderer.invoke("settings:getAll")
    },
    clockAssets: {
      choose: (type) => electron.ipcRenderer.invoke("clockAssets:choose", type)
    }
  };
}
