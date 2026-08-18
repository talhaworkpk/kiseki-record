"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const Datastore = require("@seald-io/nedb");
const Store = require("electron-store");
const crypto = require("crypto");
const JSZip = require("jszip");
const userDataPath$2 = electron.app.getPath("userData");
const dataPath$1 = path.join(userDataPath$2, "data");
const settingsStore = new Store();
const db = {
  records: new Datastore({ filename: path.join(dataPath$1, "records.db"), autoload: true }),
  goals: new Datastore({ filename: path.join(dataPath$1, "goals.db"), autoload: true }),
  habits: new Datastore({ filename: path.join(dataPath$1, "habits.db"), autoload: true }),
  habitLogs: new Datastore({ filename: path.join(dataPath$1, "habitLogs.db"), autoload: true }),
  habitTimerSessions: new Datastore({ filename: path.join(dataPath$1, "habitTimerSessions.db"), autoload: true }),
  habitBreaks: new Datastore({ filename: path.join(dataPath$1, "habitBreaks.db"), autoload: true }),
  habitActivityLogs: new Datastore({ filename: path.join(dataPath$1, "habitActivityLogs.db"), autoload: true }),
  relationships: new Datastore({ filename: path.join(dataPath$1, "relationships.db"), autoload: true }),
  journal: new Datastore({ filename: path.join(dataPath$1, "journal.db"), autoload: true }),
  conversations: new Datastore({ filename: path.join(dataPath$1, "conversations.db"), autoload: true }),
  education: new Datastore({ filename: path.join(dataPath$1, "education.db"), autoload: true }),
  career: new Datastore({ filename: path.join(dataPath$1, "career.db"), autoload: true }),
  projects: new Datastore({ filename: path.join(dataPath$1, "projects.db"), autoload: true }),
  skills: new Datastore({ filename: path.join(dataPath$1, "skills.db"), autoload: true }),
  certificates: new Datastore({ filename: path.join(dataPath$1, "certificates.db"), autoload: true }),
  achievements: new Datastore({ filename: path.join(dataPath$1, "achievements.db"), autoload: true }),
  userProfile: new Datastore({ filename: path.join(dataPath$1, "userProfile.db"), autoload: true }),
  notifications: new Datastore({ filename: path.join(dataPath$1, "notifications.db"), autoload: true }),
  memoryCapsules: new Datastore({ filename: path.join(dataPath$1, "memoryCapsules.db"), autoload: true }),
  systemUnlocks: new Datastore({ filename: path.join(dataPath$1, "systemUnlocks.db"), autoload: true }),
  calendarMemories: new Datastore({ filename: path.join(dataPath$1, "calendarMemories.db"), autoload: true })
};
const dbAsync = {
  find: (collection, query) => {
    return new Promise((resolve, reject) => {
      db[collection].find(query, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  },
  insert: (collection, doc) => {
    return new Promise((resolve, reject) => {
      db[collection].insert(doc, (err, newDoc) => {
        if (err) reject(err);
        else resolve(newDoc);
      });
    });
  },
  update: (collection, query, update, options = {}) => {
    return new Promise((resolve, reject) => {
      db[collection].update(query, update, options, (err, numReplaced) => {
        if (err) reject(err);
        else resolve(numReplaced);
      });
    });
  }
};
class ProfileManager {
  store;
  _currentProfile = "public";
  lockTimeout = null;
  constructor() {
    this.store = new Store({
      name: "profile-settings",
      defaults: {
        privateProfile: {
          autoLockTimeout: 15,
          name: "Private User"
        }
      }
    });
  }
  get currentProfile() {
    return this._currentProfile;
  }
  // --- Crypto ---
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString("hex")}`;
  }
  verifyPassword(password, hash) {
    try {
      const [salt, key] = hash.split(":");
      const keyBuffer = Buffer.from(key, "hex");
      const derivedKey = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    } catch (e) {
      console.error("verifyPassword error:", e);
      return false;
    }
  }
  // --- Auth & Setup ---
  hasPrivateProfile() {
    const settings = this.store.get("privateProfile");
    return !!settings?.passwordHash;
  }
  setupPrivateProfile(password, hint, name) {
    try {
      const hash = this.hashPassword(password);
      const currentSettings = this.store.get("privateProfile");
      this.store.set("privateProfile", {
        ...currentSettings,
        passwordHash: hash,
        hint,
        name: name || currentSettings.name || "Private User"
      });
      return true;
    } catch (e) {
      console.error("Failed to setup private profile", e);
      return false;
    }
  }
  authenticate(password) {
    const settings = this.store.get("privateProfile");
    if (!settings?.passwordHash) return false;
    return this.verifyPassword(password, settings.passwordHash);
  }
  // --- State Switching ---
  switchToPrivate(password, mainWindow) {
    if (this.authenticate(password)) {
      this._currentProfile = "private";
      this.resetAutoLockTimer(mainWindow);
      this.notifyFrontend(mainWindow);
      return true;
    }
    return false;
  }
  switchToPublic(mainWindow) {
    if (this._currentProfile !== "public") {
      this._currentProfile = "public";
      this.clearAutoLockTimer();
      this.notifyFrontend(mainWindow);
    }
  }
  // --- Auto Lock ---
  resetAutoLockTimer(mainWindow) {
    this.clearAutoLockTimer();
    if (this._currentProfile === "private") {
      const settings = this.store.get("privateProfile");
      const timeoutMinutes = settings?.autoLockTimeout || 15;
      if (timeoutMinutes > 0) {
        this.lockTimeout = setTimeout(() => {
          this.switchToPublic(mainWindow);
        }, timeoutMinutes * 60 * 1e3);
      }
    }
  }
  clearAutoLockTimer() {
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
  }
  // --- Settings ---
  getSettings() {
    try {
      const settings = this.store.get("privateProfile");
      return {
        hasProfile: !!settings?.passwordHash,
        hint: settings?.hint,
        autoLockTimeout: settings?.autoLockTimeout,
        name: settings?.name,
        photoPath: settings?.photoPath
      };
    } catch (e) {
      console.error("getSettings error:", e);
      return { hasProfile: false };
    }
  }
  updateSettings(updates) {
    const current = this.store.get("privateProfile");
    if (updates.passwordHash && typeof updates.passwordHash === "string") ;
    this.store.set("privateProfile", { ...current, ...updates });
  }
  updatePassword(oldPassword, newPassword) {
    if (this.authenticate(oldPassword)) {
      const hash = this.hashPassword(newPassword);
      const current = this.store.get("privateProfile");
      this.store.set("privateProfile", { ...current, passwordHash: hash });
      return true;
    }
    return false;
  }
  deletePrivateProfile(password) {
    if (this.authenticate(password)) {
      const current = this.store.get("privateProfile");
      this.store.set("privateProfile", {
        autoLockTimeout: current.autoLockTimeout || 15,
        name: "Private User"
        // no passwordHash, so it's "deleted"
      });
      return true;
    }
    return false;
  }
  notifyFrontend(mainWindow) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("profile-changed", this._currentProfile);
    }
  }
}
const profileManager = new ProfileManager();
const userDataPath$1 = electron.app.getPath("userData");
const dataPath = path.join(userDataPath$1, "data");
function setupVaultHandlers() {
  electron.ipcMain.handle("vault:export", async (_event, _options) => {
    try {
      const zip = new JSZip();
      if (fs.existsSync(dataPath)) {
        const files = fs.readdirSync(dataPath);
        for (const file of files) {
          if (file.endsWith(".db")) {
            const filePath2 = path.join(dataPath, file);
            if (fs.statSync(filePath2).isFile()) {
              zip.file(`data/${file}`, fs.readFileSync(filePath2));
            }
          }
        }
      }
      const attachmentsPath2 = path.join(dataPath, "attachments");
      if (fs.existsSync(attachmentsPath2)) {
        const files = fs.readdirSync(attachmentsPath2);
        for (const file of files) {
          const fullPath = path.join(attachmentsPath2, file);
          if (fs.statSync(fullPath).isFile()) {
            zip.file(`data/attachments/${file}`, fs.readFileSync(fullPath));
          }
        }
      }
      const settingsPath = path.join(userDataPath$1, "config.json");
      if (fs.existsSync(settingsPath)) {
        zip.file("config.json", fs.readFileSync(settingsPath));
      }
      const backupsDir = path.join(userDataPath$1, "backups");
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const filePath = path.join(backupsDir, `kiseki_backup_${timestamp}.kvault`);
      return new Promise((resolve) => {
        zip.generateNodeStream({ type: "nodebuffer", streamFiles: true, compression: "DEFLATE" }).pipe(fs.createWriteStream(filePath)).on("finish", () => resolve({ success: true, filePath })).on("error", (err) => {
          console.error(err);
          resolve({ success: false, error: err.message });
        });
      });
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("vault:import", async (_event, options) => {
    try {
      let filePath = options.filePath;
      if (!filePath) {
        const { filePaths } = await electron.dialog.showOpenDialog({
          title: "Import Local Vault",
          filters: [{ name: "Kiseki Vault", extensions: ["kvault", "zip"] }],
          properties: ["openFile"]
        });
        if (filePaths && filePaths.length > 0) {
          filePath = filePaths[0];
        }
      }
      if (filePath) {
        const data = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(data);
        if (!fs.existsSync(dataPath)) {
          fs.mkdirSync(dataPath, { recursive: true });
        }
        const mode = options.mode || "replace";
        for (const [filename, fileData] of Object.entries(zip.files)) {
          if (!fileData.dir) {
            const buffer = await fileData.async("nodebuffer");
            if (filename === "config.json") {
              fs.writeFileSync(path.join(userDataPath$1, filename), buffer);
            } else if (filename.startsWith("data/")) {
              const destPath = path.join(userDataPath$1, filename);
              const destDir = path.dirname(destPath);
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
              }
              if (filename.startsWith("data/attachments/")) {
                fs.writeFileSync(destPath, buffer);
              } else {
                const patchLine = (line) => {
                  try {
                    const obj = JSON.parse(line);
                    if (obj && !obj.$$indexCreated) {
                      obj.profile = "private";
                    }
                    return JSON.stringify(obj);
                  } catch (e) {
                    return line;
                  }
                };
                if (mode === "replace" || !fs.existsSync(destPath)) {
                  const newLines = buffer.toString("utf8").split("\n").filter((l) => l.trim());
                  const patchedLines = newLines.map(patchLine);
                  fs.writeFileSync(destPath, patchedLines.join("\n") + "\n");
                } else {
                  const existingLines = fs.readFileSync(destPath, "utf8").split("\n").filter((l) => l.trim());
                  const newLines = buffer.toString("utf8").split("\n").filter((l) => l.trim());
                  const mergedMap = /* @__PURE__ */ new Map();
                  const processObj = (obj) => {
                    if (obj._id) {
                      const existing = mergedMap.get(obj._id);
                      if (!existing || obj.updatedAt && (!existing.updatedAt || obj.updatedAt > existing.updatedAt)) {
                        mergedMap.set(obj._id, obj);
                      }
                    } else if (obj.$$indexCreated) {
                      mergedMap.set(JSON.stringify(obj), obj);
                    }
                  };
                  existingLines.forEach((line) => {
                    try {
                      processObj(JSON.parse(line));
                    } catch (e) {
                    }
                  });
                  newLines.forEach((line) => {
                    try {
                      processObj(JSON.parse(patchLine(line)));
                    } catch (e) {
                    }
                  });
                  const outLines = Array.from(mergedMap.values()).map((obj) => JSON.stringify(obj)).join("\n");
                  fs.writeFileSync(destPath, outLines + "\n");
                }
              }
            }
          }
        }
        return { success: true, filePath };
      }
      return { success: false, cancelled: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("vault:delete", async (_event, options) => {
    try {
      if (options.filePath && fs.existsSync(options.filePath)) {
        fs.unlinkSync(options.filePath);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("vault:rename", async (_event, options) => {
    try {
      const { oldPath, newName } = options;
      if (!fs.existsSync(oldPath)) throw new Error("File not found");
      const dir = path.dirname(oldPath);
      let finalName = newName;
      if (!finalName.endsWith(".kvault")) finalName += ".kvault";
      const newPath = path.join(dir, finalName);
      fs.renameSync(oldPath, newPath);
      return { success: true, newPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("vault:download", async (_event, options) => {
    try {
      const { sourcePath } = options;
      if (!fs.existsSync(sourcePath)) throw new Error("Source file not found");
      const { filePath } = await electron.dialog.showSaveDialog({
        title: "Save Vault Copy As...",
        defaultPath: path.basename(sourcePath),
        filters: [{ name: "Kiseki Vault", extensions: ["kvault"] }]
      });
      if (filePath) {
        fs.copyFileSync(sourcePath, filePath);
        return { success: true, filePath };
      }
      return { success: false, cancelled: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("vault:listBackups", async () => {
    try {
      const backupsDir = path.join(userDataPath$1, "backups");
      if (!fs.existsSync(backupsDir)) return { success: true, backups: [] };
      const files = fs.readdirSync(backupsDir);
      const backups = files.filter((f) => f.endsWith(".kvault")).map((f) => {
        const fullPath = path.join(backupsDir, f);
        const stat = fs.statSync(fullPath);
        return {
          path: fullPath,
          name: f,
          date: stat.mtimeMs
        };
      }).sort((a, b) => b.date - a.date);
      return { success: true, backups };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
const AVAILABLE_REGIONS = [
  { id: "pakistan", name: "Pakistan", sizeMB: 450 },
  { id: "india", name: "India", sizeMB: 1200 },
  { id: "bangladesh", name: "Bangladesh", sizeMB: 300 },
  { id: "china", name: "China", sizeMB: 3500 },
  { id: "japan", name: "Japan", sizeMB: 850 },
  { id: "south-korea", name: "South Korea", sizeMB: 400 },
  { id: "saudi-arabia", name: "Saudi Arabia", sizeMB: 600 },
  { id: "uae", name: "UAE", sizeMB: 150 },
  { id: "europe", name: "Europe", sizeMB: 18e3 },
  { id: "north-america", name: "North America", sizeMB: 9e3 },
  { id: "south-america", name: "South America", sizeMB: 4500 },
  { id: "australia", name: "Australia", sizeMB: 1800 },
  { id: "africa", name: "Africa", sizeMB: 5e3 }
];
const activeDownloads = /* @__PURE__ */ new Map();
const MAPS_DIR = path.join(electron.app.getPath("userData"), "maps", "regions");
function setupMapManager(mainWindow) {
  if (!fs.existsSync(MAPS_DIR)) {
    fs.mkdirSync(MAPS_DIR, { recursive: true });
  }
  const emitProgress = (state) => {
    const { intervalId, ...safeState } = state;
    mainWindow.webContents.send("map:downloadProgress", safeState);
  };
  electron.ipcMain.handle("map:getRegions", async () => {
    const installedIds = fs.readdirSync(MAPS_DIR).filter((f) => f.endsWith(".region")).map((f) => f.replace(".region", ""));
    return AVAILABLE_REGIONS.map((r) => ({
      ...r,
      installed: installedIds.includes(r.id),
      downloading: activeDownloads.has(r.id),
      downloadState: activeDownloads.get(r.id) || null
    }));
  });
  electron.ipcMain.handle("map:startDownload", async (_, regionId) => {
    const region = AVAILABLE_REGIONS.find((r) => r.id === regionId);
    if (!region) return { success: false, error: "Region not found" };
    if (activeDownloads.has(regionId)) {
      return { success: false, error: "Download already in progress" };
    }
    const state = {
      id: regionId,
      progress: 0,
      status: "downloading",
      speedMBps: Math.random() * 5 + 2,
      // Simulate 2-7 MB/s
      remainingTimeSec: region.sizeMB / 5
    };
    activeDownloads.set(regionId, state);
    state.intervalId = setInterval(() => {
      const currentState = activeDownloads.get(regionId);
      if (!currentState || currentState.status !== "downloading") return;
      const increment = currentState.speedMBps / region.sizeMB * 100 * 0.5;
      currentState.progress += increment;
      currentState.remainingTimeSec = (region.sizeMB - currentState.progress / 100 * region.sizeMB) / currentState.speedMBps;
      currentState.speedMBps = Math.max(0.5, currentState.speedMBps + (Math.random() - 0.5));
      if (currentState.progress >= 100) {
        currentState.progress = 100;
        currentState.status = "completed";
        currentState.remainingTimeSec = 0;
        clearInterval(currentState.intervalId);
        fs.writeFileSync(path.join(MAPS_DIR, `${regionId}.region`), `Simulated Map Region: ${region.name}`);
        activeDownloads.delete(regionId);
        emitProgress(currentState);
      } else {
        emitProgress(currentState);
      }
    }, 500);
    return { success: true };
  });
  electron.ipcMain.handle("map:pauseDownload", async (_, regionId) => {
    const state = activeDownloads.get(regionId);
    if (state && state.status === "downloading") {
      state.status = "paused";
      if (state.intervalId) clearInterval(state.intervalId);
      emitProgress(state);
      return { success: true };
    }
    return { success: false, error: "Download not active" };
  });
  electron.ipcMain.handle("map:resumeDownload", async (_, regionId) => {
    const state = activeDownloads.get(regionId);
    const region = AVAILABLE_REGIONS.find((r) => r.id === regionId);
    if (state && state.status === "paused" && region) {
      state.status = "downloading";
      state.intervalId = setInterval(() => {
        const currentState = activeDownloads.get(regionId);
        if (!currentState || currentState.status !== "downloading") return;
        const increment = currentState.speedMBps / region.sizeMB * 100 * 0.5;
        currentState.progress += increment;
        currentState.remainingTimeSec = (region.sizeMB - currentState.progress / 100 * region.sizeMB) / currentState.speedMBps;
        currentState.speedMBps = Math.max(0.5, currentState.speedMBps + (Math.random() - 0.5));
        if (currentState.progress >= 100) {
          currentState.progress = 100;
          currentState.status = "completed";
          currentState.remainingTimeSec = 0;
          clearInterval(currentState.intervalId);
          fs.writeFileSync(path.join(MAPS_DIR, `${regionId}.region`), `Simulated Map Region: ${region.name}`);
          activeDownloads.delete(regionId);
          emitProgress(currentState);
        } else {
          emitProgress(currentState);
        }
      }, 500);
      return { success: true };
    }
    return { success: false, error: "Cannot resume" };
  });
  electron.ipcMain.handle("map:cancelDownload", async (_, regionId) => {
    const state = activeDownloads.get(regionId);
    if (state) {
      if (state.intervalId) clearInterval(state.intervalId);
      activeDownloads.delete(regionId);
      return { success: true };
    }
    return { success: false };
  });
  electron.ipcMain.handle("map:deleteRegion", async (_, regionId) => {
    const regionPath = path.join(MAPS_DIR, `${regionId}.region`);
    if (fs.existsSync(regionPath)) {
      fs.unlinkSync(regionPath);
      return { success: true };
    }
    return { success: false, error: "Region not found" };
  });
  electron.ipcMain.handle("map:getStorageInfo", async () => {
    const installedIds = fs.readdirSync(MAPS_DIR).filter((f) => f.endsWith(".region")).map((f) => f.replace(".region", ""));
    let totalUsedMB = 0;
    installedIds.forEach((id) => {
      const region = AVAILABLE_REGIONS.find((r) => r.id === id);
      if (region) totalUsedMB += region.sizeMB;
    });
    let cacheSizeMB = 0;
    const cacheDir = path.join(electron.app.getPath("userData"), "maps", "cache");
    const getDirSize = (dirPath) => {
      if (!fs.existsSync(dirPath)) return 0;
      const files = fs.readdirSync(dirPath);
      let size = 0;
      files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          size += getDirSize(filePath);
        } else {
          size += stats.size;
        }
      });
      return size;
    };
    cacheSizeMB = getDirSize(cacheDir) / (1024 * 1024);
    totalUsedMB += cacheSizeMB;
    return {
      totalUsedMB,
      cacheSizeMB,
      availableMB: 5e5
      // Just a placeholder 500GB
    };
  });
}
const CACHE_DIR = path.join(electron.app.getPath("userData"), "maps", "cache");
function setupTileServer() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  electron.protocol.handle("map-tile", async (request) => {
    try {
      const url = new URL(request.url);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 4 && parts[0] === "osm") {
        const z = parts[1];
        const x = parts[2];
        const y = parts[3];
        const zPath = path.join(CACHE_DIR, z);
        const xPath = path.join(zPath, x);
        const tilePath = path.join(xPath, y);
        if (fs.existsSync(tilePath)) {
          const buffer = await fs.promises.readFile(tilePath);
          return new Response(buffer, {
            headers: { "Content-Type": "image/png" }
          });
        }
        try {
          const remoteUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}`;
          const response = await electron.net.fetch(remoteUrl, {
            headers: {
              "User-Agent": "KisekiRecord/1.0 (LocalOfflineCache)"
            }
          });
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.promises.mkdir(xPath, { recursive: true }).then(() => {
              fs.promises.writeFile(tilePath, buffer).catch((err) => {
                console.error(`Failed to cache tile ${z}/${x}/${y}`, err);
              });
            }).catch(console.error);
            return new Response(buffer, {
              headers: { "Content-Type": "image/png" }
            });
          } else {
            console.warn(`Tile server responded with ${response.status} for ${remoteUrl}`);
          }
        } catch (fetchErr) {
          console.warn(`Failed to fetch tile (offline?): ${z}/${x}/${y}`, fetchErr);
        }
        const transparentPng = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
          "base64"
        );
        return new Response(transparentPng, {
          headers: { "Content-Type": "image/png" }
        });
      }
      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("Tile server error", err);
      return new Response("Internal error", { status: 500 });
    }
  });
}
const iconUrl = path.join(__dirname, "./chunks/icon-D82zEmZF.png");
class NotificationService {
  static instance;
  pollInterval = null;
  mainWindow = null;
  constructor() {
  }
  static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  setMainWindow(window) {
    this.mainWindow = window;
  }
  getSettings() {
    const defaults = {
      desktopNotificationsEnabled: false,
      inactivityReminderEnabled: true,
      birthdayNotificationEnabled: true,
      annualMemoryNotificationEnabled: true,
      memoryCapsuleNotificationEnabled: true,
      achievementsNotificationEnabled: true
    };
    return settingsStore.get("desktopNotifications") || defaults;
  }
  updateSettings(updates) {
    const current = this.getSettings();
    settingsStore.set("desktopNotifications", { ...current, ...updates });
    if (updates.desktopNotificationsEnabled) {
      this.startBackgroundChecks();
    } else if (updates.desktopNotificationsEnabled === false) {
      this.stopBackgroundChecks();
    }
  }
  markAppOpened() {
    settingsStore.set("lastAppOpenAt", Date.now());
  }
  startBackgroundChecks() {
    this.stopBackgroundChecks();
    const settings = this.getSettings();
    if (!settings.desktopNotificationsEnabled) return;
    this.runScheduledChecks();
    this.pollInterval = setInterval(() => {
      this.runScheduledChecks();
    }, 30 * 60 * 1e3);
  }
  stopBackgroundChecks() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
  showNotification(title, body, type, targetPath, metadata) {
    const settings = this.getSettings();
    if (!settings.desktopNotificationsEnabled) return;
    if (!electron.Notification.isSupported()) return;
    const notif = new electron.Notification({
      title: `Kiseki Record`,
      subtitle: title,
      body,
      icon: iconUrl
    });
    notif.on("click", () => {
      this.handleNotificationClick(type, targetPath, metadata);
    });
    notif.show();
  }
  handleNotificationClick(type, targetPath, metadata) {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
      if (targetPath) {
        this.mainWindow.webContents.send("desktop-notification-click", { type, targetPath, metadata });
      }
    }
  }
  async runScheduledChecks() {
    try {
      const settings = this.getSettings();
      if (!settings.desktopNotificationsEnabled) return;
      const now = /* @__PURE__ */ new Date();
      if (settings.inactivityReminderEnabled) {
        await this.checkInactivity(now);
      }
      if (settings.birthdayNotificationEnabled) {
        await this.checkBirthday(now);
      }
      if (settings.memoryCapsuleNotificationEnabled) {
        await this.checkMemoryCapsules(now);
      }
      if (settings.annualMemoryNotificationEnabled) {
        await this.checkAnnualMemories(now);
      }
    } catch (err) {
      console.error("[NotificationService] Background check error:", err);
    }
  }
  async checkInactivity(now) {
    if (now.getHours() < 10) return;
    const lastOpenAt = settingsStore.get("lastAppOpenAt");
    if (!lastOpenAt) return;
    const lastOpenDate = new Date(lastOpenAt);
    lastOpenDate.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastOpenDate.getTime()) / (1e3 * 60 * 60 * 24));
    if (diffDays >= 1) {
      const lastInactivityNotif = settingsStore.get("lastInactivityNotificationDate");
      const todayStr = today.toISOString().split("T")[0];
      if (lastInactivityNotif !== todayStr) {
        settingsStore.set("lastInactivityNotificationDate", todayStr);
        this.showNotification("Inactivity Reminder", "You haven't checked in today. Your journey is waiting for you.", "inactivity", "/");
        await this.pushInAppNotification("inactivity", "Reminder", "You haven't checked in today.", "System", "/");
      }
    }
  }
  async checkBirthday(now) {
    if (now.getHours() < 9) return;
    try {
      const profiles = await dbAsync.find("userProfile", {});
      if (profiles.length === 0) return;
      const profile = profiles[0];
      if (!profile.dateOfBirth) return;
      const parts = profile.dateOfBirth.split("-");
      if (parts.length < 3) return;
      const birthMonth = parseInt(parts[1], 10);
      const birthDay = parseInt(parts[2], 10);
      if (now.getMonth() + 1 === birthMonth && now.getDate() === birthDay) {
        const lastBirthdayNotifYear = settingsStore.get("lastBirthdayNotificationYear");
        if (lastBirthdayNotifYear !== now.getFullYear()) {
          settingsStore.set("lastBirthdayNotificationYear", now.getFullYear());
          this.showNotification("🎂 Happy Birthday!", `Take a moment today to celebrate your journey and how far you've come.`, "birthday", "/");
          await this.pushInAppNotification("birthday", "Happy Birthday!", `Wishing you a wonderful birthday, ${profile.fullName?.split(" ")[0] || "friend"}!`, "System", "/");
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
  async checkMemoryCapsules(now) {
    try {
      const capsules = await dbAsync.find("memoryCapsules", { status: "locked" });
      const nowMs = now.getTime();
      for (const cap of capsules) {
        if (cap.unlockDate <= nowMs) {
          await dbAsync.update("memoryCapsules", { _id: cap._id }, { $set: { status: "unlocked" } });
          this.showNotification("💌 Memory Capsule", `A Memory Capsule from your past self is ready to open.`, "memory", "/memory-capsules");
          await this.pushInAppNotification("memory", "Memory Capsule Unlocked", `A message from your past self is ready to open.`, "Memory", "/memory-capsules");
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
  async checkAnnualMemories(now) {
    if (now.getHours() < 9) return;
    try {
      const memories = await dbAsync.find("calendarMemories", {});
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();
      const isLeapYear = currentYear % 4 === 0 && currentYear % 100 !== 0 || currentYear % 400 === 0;
      const activeMemories = memories.filter((m) => {
        if (m.month === currentMonth && m.day === currentDay) return true;
        if (!isLeapYear && m.month === 2 && m.day === 29 && currentMonth === 2 && currentDay === 28) return true;
        return false;
      });
      if (activeMemories.length === 0) return;
      let notifiedCount = 0;
      for (const m of activeMemories) {
        const key = `annual_memory:${m._id}:${currentYear}`;
        const unlocks = await dbAsync.find("systemUnlocks", { key });
        if (unlocks.length === 0) {
          await dbAsync.insert("systemUnlocks", { key, unlockedAt: Date.now() });
          notifiedCount++;
        }
      }
      if (notifiedCount > 0) {
        const targetPath = `/?calendarMemoryMonth=${currentMonth}&calendarMemoryDay=${currentDay}`;
        if (notifiedCount === 1) {
          this.showNotification("📅 Annual Memory", `You saved a memory for this day. Click to revisit it.`, "annual_memory", targetPath);
          await this.pushInAppNotification("annual_memory", "Annual Memory", `You saved this memory for today.`, "Calendar", targetPath);
        } else {
          this.showNotification("📅 Annual Memories", `You have ${notifiedCount} memories associated with today.`, "annual_memory", targetPath);
          await this.pushInAppNotification("annual_memory", `${notifiedCount} Annual Memories`, `You have ${notifiedCount} memories associated with today.`, "Calendar", targetPath);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
  // Push an in-app notification directly to db from main process
  async pushInAppNotification(type, title, message, sourceModule, targetPath) {
    try {
      const notification = {
        title,
        message,
        type,
        sourceModule,
        targetPath,
        isRead: false,
        timestamp: Date.now()
      };
      const saved = await dbAsync.insert("notifications", notification);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send("app-notification", saved);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
const notificationService = NotificationService.getInstance();
let tray = null;
let isQuitting = false;
const userDataPath = electron.app.getPath("userData");
const attachmentsPath = path.join(userDataPath, "data", "attachments");
const exportLogs = [];
function logExport(message, error) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logEntry = error ? `[${timestamp}] ${message}: ${error.message}
${error.stack}` : `[${timestamp}] ${message}`;
  exportLogs.push(logEntry);
  console.log("PDF Export:", logEntry);
  const mainWindow = electron.BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send("log-error", {
      source: "PDF Export",
      message,
      stack: error?.stack
    });
  }
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      // allow loading local files via file:// protocol
      plugins: true
      // enable PDF viewer
    }
  });
  mainWindow.on("ready-to-show", () => {
    if (!process.argv.includes("--hidden")) {
      mainWindow.show();
    }
  });
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      const settings = notificationService.getSettings();
      if (settings.desktopNotificationsEnabled) {
        event.preventDefault();
        mainWindow.hide();
      }
    }
  });
  mainWindow.on("minimize", () => {
    profileManager.switchToPublic(mainWindow);
  });
  mainWindow.on("blur", () => {
    profileManager.getSettings();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.protocol.registerSchemesAsPrivileged([
  { scheme: "local-media", privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);
electron.app.whenReady().then(() => {
  electron.protocol.registerFileProtocol("local-media", (request, callback) => {
    let url = request.url.replace(/^local-media:\/\//i, "");
    try {
      url = decodeURIComponent(url);
    } catch (e) {
    }
    callback({ path: url });
  });
  if (process.platform === "win32") {
    electron.app.setAppUserModelId("com.kisekirecord.app");
  }
  setupVaultHandlers();
  notificationService.markAppOpened();
  notificationService.startBackgroundChecks();
  try {
    const icon = electron.nativeImage.createFromPath(iconUrl);
    if (icon.isEmpty()) {
      console.warn("Tray icon not found at", iconUrl, "using empty image.");
      tray = new electron.Tray(electron.nativeImage.createEmpty());
    } else {
      tray = new electron.Tray(icon.resize({ width: 16, height: 16 }));
    }
    const contextMenu = electron.Menu.buildFromTemplate([
      {
        label: "Open Kiseki Record",
        click: () => {
          const win = electron.BrowserWindow.getAllWindows()[0];
          if (win) {
            win.show();
            if (win.isMinimized()) win.restore();
            win.focus();
          } else {
            createWindow();
          }
        }
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          electron.app.quit();
        }
      }
    ]);
    tray.setToolTip("Kiseki Record");
    tray.setContextMenu(contextMenu);
    tray.on("click", () => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) {
        win.show();
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    });
  } catch (err) {
    console.error("Failed to create tray", err);
  }
  if (!fs.existsSync(attachmentsPath)) {
    fs.mkdirSync(attachmentsPath, { recursive: true });
  }
  electron.ipcMain.handle("attachment:add", async (_event, options) => {
    try {
      const { filePaths } = await electron.dialog.showOpenDialog({
        title: options?.title || "Add Attachment",
        properties: options?.multiple ? ["openFile", "multiSelections"] : ["openFile"],
        filters: options?.filters || []
      });
      if (filePaths && filePaths.length > 0) {
        const results = [];
        for (const sourcePath of filePaths) {
          const filename = `${Date.now()}_${path.basename(sourcePath)}`;
          const destPath = path.join(attachmentsPath, filename);
          fs.copyFileSync(sourcePath, destPath);
          const fileUrl = "file:///" + destPath.replace(/\\/g, "/");
          results.push({ filePath: fileUrl, filename: path.basename(sourcePath) });
        }
        return { success: true, files: results };
      }
      return { success: false, cancelled: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("attachment:save-base64", async (_, base64Data) => {
    try {
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return { success: false, error: "Invalid base64 format" };
      }
      const buffer = Buffer.from(matches[2], "base64");
      const extension = matches[1].split("/")[1] || "png";
      const filename = `${Date.now()}_cropped.${extension}`;
      const destPath = path.join(attachmentsPath, filename);
      fs.writeFileSync(destPath, buffer);
      const fileUrl = "file:///" + destPath.replace(/\\/g, "/");
      return { success: true, filePath: fileUrl, filename };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("attachment:save-file", async (_, sourcePath) => {
    try {
      const filename = `${Date.now()}_${path.basename(sourcePath)}`;
      const destPath = path.join(attachmentsPath, filename);
      fs.copyFileSync(sourcePath, destPath);
      const fileUrl = "file:///" + destPath.replace(/\\/g, "/");
      return { success: true, filePath: fileUrl, filename };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("db:find", async (_, collection, query = {}) => {
    query.profile = profileManager.currentProfile;
    return new Promise((resolve, reject) => {
      db[collection].find(query, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  });
  electron.ipcMain.handle("db:insert", async (_, collection, doc) => {
    const profile = profileManager.currentProfile;
    if (Array.isArray(doc)) {
      doc = doc.map((d) => ({ ...d, profile }));
    } else {
      doc = { ...doc, profile };
    }
    return new Promise((resolve, reject) => {
      db[collection].insert(doc, (err, newDoc) => {
        if (err) reject(err);
        else resolve(newDoc);
      });
    });
  });
  electron.ipcMain.handle("db:update", async (_, collection, query = {}, update, options) => {
    query.profile = profileManager.currentProfile;
    return new Promise((resolve, reject) => {
      db[collection].update(query, update, options || {}, (err, numReplaced) => {
        if (err) reject(err);
        else resolve(numReplaced);
      });
    });
  });
  electron.ipcMain.handle("db:remove", async (_, collection, query = {}, options) => {
    query.profile = profileManager.currentProfile;
    return new Promise((resolve, reject) => {
      db[collection].remove(query, options || {}, (err, numRemoved) => {
        if (err) reject(err);
        else resolve(numRemoved);
      });
    });
  });
  electron.ipcMain.handle("profile:getCurrent", () => profileManager.currentProfile);
  electron.ipcMain.handle("profile:hasPrivate", () => profileManager.hasPrivateProfile());
  electron.ipcMain.handle("profile:getSettings", () => profileManager.getSettings());
  electron.ipcMain.handle("profile:activity", () => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    if (win && profileManager.currentProfile === "private") {
      profileManager.resetAutoLockTimer(win);
    }
  });
  electron.ipcMain.handle("profile:setupPrivate", (_, password, hint, name) => {
    return profileManager.setupPrivateProfile(password, hint, name);
  });
  electron.ipcMain.handle("profile:switch", (_, password) => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    if (password === null) {
      profileManager.switchToPublic(win);
      return true;
    }
    return profileManager.switchToPrivate(password, win);
  });
  electron.ipcMain.handle("profile:updateSettings", (_, updates) => {
    profileManager.updateSettings(updates);
    return true;
  });
  electron.ipcMain.handle("profile:updatePassword", (_, oldPassword, newPassword) => {
    return profileManager.updatePassword(oldPassword, newPassword);
  });
  electron.ipcMain.handle("profile:delete", (_, password) => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    const success = profileManager.deletePrivateProfile(password);
    if (success) profileManager.switchToPublic(win);
    return success;
  });
  electron.ipcMain.handle("export-pdf", async (_, resumeData) => {
    exportLogs.length = 0;
    logExport("Export started");
    try {
      logExport("Creating hidden print window");
      const hiddenWindow = new electron.BrowserWindow({
        width: 1200,
        height: 1600,
        show: false,
        webPreferences: {
          preload: path.join(__dirname, "../preload/index.js"),
          sandbox: false,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      });
      logExport("Loading print template");
      if (process.env["ELECTRON_RENDERER_URL"]) {
        await hiddenWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/print-template.html`);
      } else {
        await hiddenWindow.loadFile(path.join(__dirname, "../renderer/print-template.html"));
      }
      logExport("Sending resume data to print window");
      hiddenWindow.webContents.send("resume-data", resumeData);
      logExport("Waiting for React render and resources to load");
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for resume to be ready"));
        }, 3e4);
        const checkReady = () => {
          if (hiddenWindow.webContents.executeJavaScript("window.__resumeReady")) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        setTimeout(checkReady, 500);
      });
      logExport("Fonts loaded");
      logExport("Images loaded");
      logExport("React rendered");
      logExport("Generating PDF");
      const pdf = await hiddenWindow.webContents.printToPDF({
        pageSize: "A4",
        printBackground: true
      });
      logExport(`PDF generated, size: ${pdf.length} bytes`);
      hiddenWindow.close();
      logExport("Export completed");
      return pdf;
    } catch (error) {
      logExport("Export failed", error);
      throw error;
    }
  });
  electron.ipcMain.handle("export-journal-pdf", async (_, journalData) => {
    exportLogs.length = 0;
    logExport("Journal Export started");
    try {
      logExport("Creating hidden print window for journal");
      const hiddenWindow = new electron.BrowserWindow({
        width: 1e3,
        height: 1414,
        // A4 ratio
        show: false,
        webPreferences: {
          preload: path.join(__dirname, "../preload/index.js"),
          sandbox: false,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      });
      logExport("Loading print journal template");
      if (process.env["ELECTRON_RENDERER_URL"]) {
        await hiddenWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/print-journal-template.html`);
      } else {
        await hiddenWindow.loadFile(path.join(__dirname, "../renderer/print-journal-template.html"));
      }
      logExport("Sending journal data to print window");
      hiddenWindow.webContents.send("journal-data", journalData);
      logExport("Waiting for React render and resources to load");
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for journal to be ready"));
        }, 15e3);
        const checkReady = () => {
          if (hiddenWindow.webContents.executeJavaScript("window.__journalReady")) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        setTimeout(checkReady, 500);
      });
      logExport("React rendered journal");
      logExport("Generating PDF");
      const pdf = await hiddenWindow.webContents.printToPDF({
        pageSize: "A4",
        printBackground: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      logExport(`PDF generated, size: ${pdf.length} bytes`);
      hiddenWindow.close();
      logExport("Journal Export completed");
      return pdf;
    } catch (error) {
      logExport("Journal Export failed", error);
      throw error;
    }
  });
  electron.ipcMain.handle("export-report-pdf", async (_, reportData) => {
    exportLogs.length = 0;
    logExport("Report Export started");
    try {
      logExport("Creating hidden print window for report");
      const hiddenWindow = new electron.BrowserWindow({
        width: 1200,
        height: 1600,
        show: false,
        webPreferences: {
          preload: path.join(__dirname, "../preload/index.js"),
          sandbox: false,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      });
      logExport("Loading print report template");
      if (process.env["ELECTRON_RENDERER_URL"]) {
        await hiddenWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/print-report-template.html`);
      } else {
        await hiddenWindow.loadFile(path.join(__dirname, "../renderer/print-report-template.html"));
      }
      logExport("Sending report data to print window");
      hiddenWindow.webContents.send("report-data", reportData);
      logExport("Waiting for React render and resources to load");
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for report to be ready"));
        }, 3e4);
        const checkReady = () => {
          hiddenWindow.webContents.send("report-data", reportData);
          hiddenWindow.webContents.executeJavaScript("window.__reportReady").then((isReady) => {
            if (isReady) {
              clearTimeout(timeout);
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          }).catch(() => {
            setTimeout(checkReady, 100);
          });
        };
        setTimeout(checkReady, 500);
      });
      logExport("React rendered report");
      logExport("Generating PDF");
      const pdf = await hiddenWindow.webContents.printToPDF({
        pageSize: "A4",
        printBackground: true
      });
      logExport(`PDF generated, size: ${pdf.length} bytes`);
      hiddenWindow.close();
      logExport("Report Export completed");
      return pdf;
    } catch (error) {
      logExport("Report Export failed", error);
      throw error;
    }
  });
  electron.ipcMain.handle("get-export-logs", () => {
    return exportLogs.join("\n");
  });
  electron.ipcMain.handle("notifications:getSettings", () => {
    return notificationService.getSettings();
  });
  electron.ipcMain.handle("notifications:updateSettings", (_, updates) => {
    notificationService.updateSettings(updates);
    return true;
  });
  electron.ipcMain.handle("notifications:triggerTest", (_, type) => {
    if (type === "inactivity") {
      notificationService.showNotification("Inactivity Reminder (Test)", "You haven't checked in today. Your journey is waiting for you.", "inactivity", "/");
    } else if (type === "birthday") {
      notificationService.showNotification("🎂 Happy Birthday! (Test)", `Take a moment today to celebrate your journey and how far you've come.`, "birthday", "/");
    } else if (type === "memory") {
      notificationService.showNotification("💌 Memory Capsule (Test)", `A Memory Capsule from your past self is ready to open.`, "memory", "/memory-capsules");
    }
  });
  electron.ipcMain.handle("notifications:triggerInApp", (_, type, title, message, sourceModule, targetPath) => {
    const settings = notificationService.getSettings();
    if (settings.desktopNotificationsEnabled) {
      if (type === "achievement" && settings.achievementsNotificationEnabled) {
        notificationService.showNotification(title, message, type, targetPath);
      } else if (type === "milestone" && settings.achievementsNotificationEnabled) {
        notificationService.showNotification(title, message, type, targetPath);
      }
    }
  });
  electron.ipcMain.handle("app:restart", () => {
    electron.app.relaunch();
    electron.app.exit(0);
  });
  createWindow();
  const window = electron.BrowserWindow.getAllWindows()[0];
  if (window) {
    notificationService.setMainWindow(window);
  }
  if (window) {
    setupMapManager(window);
  }
  setupTileServer();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  const settings = notificationService.getSettings();
  if (!settings.desktopNotificationsEnabled) {
    if (process.platform !== "darwin") {
      electron.app.quit();
    }
  }
});
electron.app.on("ready", () => {
  electron.powerMonitor.on("lock-screen", () => {
    const wins = electron.BrowserWindow.getAllWindows();
    if (wins.length > 0) profileManager.switchToPublic(wins[0]);
  });
  electron.powerMonitor.on("suspend", () => {
    const wins = electron.BrowserWindow.getAllWindows();
    if (wins.length > 0) profileManager.switchToPublic(wins[0]);
  });
});
