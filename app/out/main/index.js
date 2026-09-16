"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const Datastore = require("@seald-io/nedb");
const Store = require("electron-store");
const crypto = require("crypto");
const JSZip = require("jszip");
const userDataPath$3 = electron.app.getPath("userData");
const dataPath$2 = path.join(userDataPath$3, "data");
const settingsStore = new Store();
const db = {
  records: new Datastore({ filename: path.join(dataPath$2, "records.db"), autoload: true }),
  goals: new Datastore({ filename: path.join(dataPath$2, "goals.db"), autoload: true }),
  habits: new Datastore({ filename: path.join(dataPath$2, "habits.db"), autoload: true }),
  habitLogs: new Datastore({ filename: path.join(dataPath$2, "habitLogs.db"), autoload: true }),
  habitTimerSessions: new Datastore({ filename: path.join(dataPath$2, "habitTimerSessions.db"), autoload: true }),
  habitBreaks: new Datastore({ filename: path.join(dataPath$2, "habitBreaks.db"), autoload: true }),
  habitActivityLogs: new Datastore({ filename: path.join(dataPath$2, "habitActivityLogs.db"), autoload: true }),
  relationships: new Datastore({ filename: path.join(dataPath$2, "relationships.db"), autoload: true }),
  journal: new Datastore({ filename: path.join(dataPath$2, "journal.db"), autoload: true }),
  conversations: new Datastore({ filename: path.join(dataPath$2, "conversations.db"), autoload: true }),
  education: new Datastore({ filename: path.join(dataPath$2, "education.db"), autoload: true }),
  career: new Datastore({ filename: path.join(dataPath$2, "career.db"), autoload: true }),
  projects: new Datastore({ filename: path.join(dataPath$2, "projects.db"), autoload: true }),
  skills: new Datastore({ filename: path.join(dataPath$2, "skills.db"), autoload: true }),
  certificates: new Datastore({ filename: path.join(dataPath$2, "certificates.db"), autoload: true }),
  achievements: new Datastore({ filename: path.join(dataPath$2, "achievements.db"), autoload: true }),
  userProfile: new Datastore({ filename: path.join(dataPath$2, "userProfile.db"), autoload: true }),
  notifications: new Datastore({ filename: path.join(dataPath$2, "notifications.db"), autoload: true }),
  memoryCapsules: new Datastore({ filename: path.join(dataPath$2, "memoryCapsules.db"), autoload: true }),
  systemUnlocks: new Datastore({ filename: path.join(dataPath$2, "systemUnlocks.db"), autoload: true }),
  calendarMemories: new Datastore({ filename: path.join(dataPath$2, "calendarMemories.db"), autoload: true }),
  actionGroups: new Datastore({ filename: path.join(dataPath$2, "actionGroups.db"), autoload: true }),
  dreams: new Datastore({ filename: path.join(dataPath$2, "dreams.db"), autoload: true }),
  dream_goals: new Datastore({ filename: path.join(dataPath$2, "dream_goals.db"), autoload: true }),
  dream_projects: new Datastore({ filename: path.join(dataPath$2, "dream_projects.db"), autoload: true }),
  dream_skills: new Datastore({ filename: path.join(dataPath$2, "dream_skills.db"), autoload: true }),
  dream_certificates: new Datastore({ filename: path.join(dataPath$2, "dream_certificates.db"), autoload: true }),
  clockAppearance: new Datastore({ filename: path.join(dataPath$2, "clockAppearance.db"), autoload: true }),
  clockAssets: new Datastore({ filename: path.join(dataPath$2, "clockAssets.db"), autoload: true }),
  clockAlarms: new Datastore({ filename: path.join(dataPath$2, "clockAlarms.db"), autoload: true }),
  clockEvents: new Datastore({ filename: path.join(dataPath$2, "clockEvents.db"), autoload: true }),
  relationshipConversations: new Datastore({ filename: path.join(dataPath$2, "relationshipConversations.db"), autoload: true }),
  chronicle: new Datastore({ filename: path.join(dataPath$2, "chronicle.db"), autoload: true }),
  chronicleRecords: new Datastore({ filename: path.join(dataPath$2, "chronicleRecords.db"), autoload: true })
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
  },
  remove: (collection, query, options = {}) => {
    return new Promise((resolve, reject) => {
      db[collection].remove(query, options, (err, numRemoved) => {
        if (err) reject(err);
        else resolve(numRemoved);
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
class SettingsManager {
  store;
  constructor() {
    this.store = new Store({
      name: "global-settings"
    });
  }
  get(key, defaultValue) {
    return this.store.get(key, defaultValue);
  }
  set(key, value) {
    this.store.set(key, value);
  }
  delete(key) {
    this.store.delete(key);
  }
  getAll() {
    return this.store.store;
  }
}
const settingsManager = new SettingsManager();
const userDataPath$2 = electron.app.getPath("userData");
const dataPath$1 = path.join(userDataPath$2, "data");
function setupVaultHandlers() {
  electron.ipcMain.handle("vault:export", async (_event, _options) => {
    try {
      const zip = new JSZip();
      if (fs.existsSync(dataPath$1)) {
        const files = fs.readdirSync(dataPath$1);
        for (const file of files) {
          if (file.endsWith(".db")) {
            const filePath2 = path.join(dataPath$1, file);
            if (fs.statSync(filePath2).isFile()) {
              zip.file(`data/${file}`, fs.readFileSync(filePath2));
            }
          }
        }
      }
      const attachmentsPath2 = path.join(dataPath$1, "attachments");
      if (fs.existsSync(attachmentsPath2)) {
        const files = fs.readdirSync(attachmentsPath2);
        for (const file of files) {
          const fullPath = path.join(attachmentsPath2, file);
          if (fs.statSync(fullPath).isFile()) {
            zip.file(`data/attachments/${file}`, fs.readFileSync(fullPath));
          }
        }
      }
      const clockPath = path.join(userDataPath$2, "clock");
      if (fs.existsSync(clockPath)) {
        const checkAndAddDir = (subDir) => {
          const dirPath = path.join(clockPath, subDir);
          if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
              const fullPath = path.join(dirPath, file);
              if (fs.statSync(fullPath).isFile()) {
                zip.file(`clock/${subDir}/${file}`, fs.readFileSync(fullPath));
              }
            }
          }
        };
        checkAndAddDir("backgrounds");
        checkAndAddDir("cursors");
      }
      const settingsPath = path.join(userDataPath$2, "config.json");
      if (fs.existsSync(settingsPath)) {
        zip.file("config.json", fs.readFileSync(settingsPath));
      }
      let backupsDir = settingsStore.get("backupLocation");
      if (!backupsDir) {
        backupsDir = path.join(userDataPath$2, "backups");
      }
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
        if (!fs.existsSync(dataPath$1)) {
          fs.mkdirSync(dataPath$1, { recursive: true });
        }
        const mode = options.mode || "replace";
        let importedUserProfile = null;
        if (zip.files["data/userProfile.db"]) {
          const upBuffer = await zip.files["data/userProfile.db"].async("nodebuffer");
          const upLines = upBuffer.toString("utf8").split("\n").filter((l) => l.trim());
          if (upLines.length > 0) {
            try {
              importedUserProfile = JSON.parse(upLines[upLines.length - 1]);
            } catch (e) {
            }
          }
        }
        for (const [filename, fileData] of Object.entries(zip.files)) {
          if (!fileData.dir) {
            const buffer = await fileData.async("nodebuffer");
            if (filename === "config.json") {
              fs.writeFileSync(path.join(userDataPath$2, filename), buffer);
            } else if (filename.startsWith("data/") || filename.startsWith("clock/")) {
              const destPath = path.join(userDataPath$2, filename);
              const destDir = path.dirname(destPath);
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
              }
              if (filename.startsWith("data/attachments/") || filename.startsWith("clock/")) {
                fs.writeFileSync(destPath, buffer);
              } else {
                const patchLineObj = (obj) => {
                  if (filename === "data/relationships.db" && importedUserProfile && obj.relationshipType === "Myself") {
                    obj.name = importedUserProfile.fullName || "Myself";
                    obj.profilePicture = importedUserProfile.photoPath || "";
                    obj.gender = importedUserProfile.gender || "";
                    obj.birthday = importedUserProfile.dateOfBirth || "";
                    obj.phone = importedUserProfile.phone || "";
                    obj.email = importedUserProfile.email || "";
                    obj.address = importedUserProfile.address || "";
                  }
                  return obj;
                };
                const patchLine = (line) => {
                  try {
                    const obj = JSON.parse(line);
                    return JSON.stringify(patchLineObj(obj));
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
                  const myselfNotesMap = /* @__PURE__ */ new Map();
                  const myselfTags = /* @__PURE__ */ new Set();
                  const myselfAttachments = /* @__PURE__ */ new Set();
                  const myselfPhotos = /* @__PURE__ */ new Set();
                  const myselfVideo = /* @__PURE__ */ new Set();
                  const myselfAudio = /* @__PURE__ */ new Set();
                  const processObj = (obj) => {
                    if (filename === "data/relationships.db" && obj.relationshipType === "Myself") {
                      if (Array.isArray(obj.notes)) {
                        obj.notes.forEach((n) => {
                          if (n._id) {
                            const ex = myselfNotesMap.get(n._id);
                            if (!ex || n.createdAt && ex.createdAt && n.createdAt > ex.createdAt) myselfNotesMap.set(n._id, n);
                          }
                        });
                      }
                      if (Array.isArray(obj.tags)) obj.tags.forEach((t) => myselfTags.add(t));
                      if (Array.isArray(obj.attachments)) obj.attachments.forEach((a) => myselfAttachments.add(a));
                      if (Array.isArray(obj.photos)) obj.photos.forEach((p) => myselfPhotos.add(p));
                      if (Array.isArray(obj.video)) obj.video.forEach((v) => myselfVideo.add(v));
                      if (Array.isArray(obj.audio)) obj.audio.forEach((a) => myselfAudio.add(a));
                    }
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
                      const obj = JSON.parse(line);
                      processObj(patchLineObj(obj));
                    } catch (e) {
                    }
                  });
                  newLines.forEach((line) => {
                    try {
                      const obj = JSON.parse(line);
                      processObj(patchLineObj(obj));
                    } catch (e) {
                    }
                  });
                  if (filename === "data/relationships.db") {
                    for (const obj of mergedMap.values()) {
                      if (obj.relationshipType === "Myself") {
                        obj.notes = Array.from(myselfNotesMap.values());
                        obj.tags = Array.from(myselfTags);
                        obj.attachments = Array.from(myselfAttachments);
                        obj.photos = Array.from(myselfPhotos);
                        obj.video = Array.from(myselfVideo);
                        obj.audio = Array.from(myselfAudio);
                      }
                    }
                  }
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
      let backupsDir = settingsStore.get("backupLocation");
      if (!backupsDir) {
        backupsDir = path.join(userDataPath$2, "backups");
      }
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
  electron.ipcMain.handle("vault:getBackupLocation", async () => {
    const loc = settingsStore.get("backupLocation");
    return loc || path.join(userDataPath$2, "backups");
  });
  electron.ipcMain.handle("vault:setBackupLocation", async () => {
    try {
      const { filePaths } = await electron.dialog.showOpenDialog({
        title: "Select Backup Location",
        properties: ["openDirectory", "createDirectory"]
      });
      if (filePaths && filePaths.length > 0) {
        settingsStore.set("backupLocation", filePaths[0]);
        return { success: true, path: filePaths[0] };
      }
      return { success: false, cancelled: true };
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
  getSettings(profile) {
    const currentProfile = profile || profileManager.currentProfile;
    const defaults = {
      desktopNotificationsEnabled: false,
      inactivityReminderEnabled: true,
      birthdayNotificationEnabled: true,
      annualMemoryNotificationEnabled: true,
      memoryCapsuleNotificationEnabled: true,
      achievementsNotificationEnabled: true,
      launchAtStartupEnabled: false,
      dreamNotificationEnabled: true,
      alarmNotificationEnabled: true,
      aiResponseNotificationEnabled: true,
      onlineReminderNotificationEnabled: true,
      habitPreferredNotificationEnabled: true,
      habitDeadlineNotificationEnabled: true
    };
    return settingsStore.get(`desktopNotifications_${currentProfile}`) || defaults;
  }
  updateSettings(updates, profile) {
    const currentProfile = profile || profileManager.currentProfile;
    const current = this.getSettings(currentProfile);
    settingsStore.set(`desktopNotifications_${currentProfile}`, { ...current, ...updates });
    if (updates.desktopNotificationsEnabled) {
      this.startBackgroundChecks();
    } else if (updates.desktopNotificationsEnabled === false) {
      this.stopBackgroundChecks();
    }
    if (updates.launchAtStartupEnabled !== void 0) {
      const { app } = require("electron");
      if (app.isPackaged) {
        app.setLoginItemSettings({
          openAtLogin: updates.launchAtStartupEnabled,
          path: app.getPath("exe"),
          args: ["--hidden"]
        });
      }
    }
  }
  syncStartupSetting() {
    const pubSettings = this.getSettings("public");
    const { app } = require("electron");
    if (app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: pubSettings.launchAtStartupEnabled,
        path: app.getPath("exe"),
        args: ["--hidden"]
      });
    }
  }
  markAppOpened() {
    settingsStore.set("lastAppOpenAt", Date.now());
  }
  startBackgroundChecks() {
    this.stopBackgroundChecks();
    const pubSettings = this.getSettings("public");
    const privSettings = this.getSettings("private");
    if (!pubSettings.desktopNotificationsEnabled && !privSettings.desktopNotificationsEnabled) return;
    this.runScheduledChecks();
    this.pollInterval = setInterval(() => {
      this.runScheduledChecks();
    }, 60 * 1e3);
  }
  stopBackgroundChecks() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
  showNotification(title, body, type, targetPath, metadata, profile) {
    const settings = this.getSettings(profile);
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
  // Always shows the OS notification regardless of desktopNotificationsEnabled —
  // used for explicit user-triggered actions like AI model loading.
  showNotificationAlways(title, body, type, targetPath, metadata) {
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
      const pubSettings = this.getSettings("public");
      const privSettings = this.getSettings("private");
      if (!pubSettings.desktopNotificationsEnabled && !privSettings.desktopNotificationsEnabled) return;
      const now = /* @__PURE__ */ new Date();
      if (pubSettings.inactivityReminderEnabled) {
        await this.checkInactivity(now);
      }
      if (pubSettings.birthdayNotificationEnabled) {
        await this.checkBirthday(now);
      }
      if (pubSettings.memoryCapsuleNotificationEnabled || privSettings.memoryCapsuleNotificationEnabled) {
        await this.checkMemoryCapsules(now);
      }
      if (pubSettings.annualMemoryNotificationEnabled || privSettings.annualMemoryNotificationEnabled) {
        await this.checkAnnualMemories(now);
      }
      await this.checkPreferredTimes(now);
      await this.checkDeadlines(now);
      if (pubSettings.dreamNotificationEnabled || privSettings.dreamNotificationEnabled) {
        await this.checkDreams(now);
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
        const capProfile = cap.profile || "public";
        const capSettings = this.getSettings(capProfile);
        if (!capSettings.desktopNotificationsEnabled || !capSettings.memoryCapsuleNotificationEnabled) continue;
        if (cap.unlockDate <= nowMs) {
          await dbAsync.update("memoryCapsules", { _id: cap._id }, { $set: { status: "unlocked" } });
          this.showNotification("💌 Memory Capsule", `A Memory Capsule from your past self is ready to open.`, "memory", "/memory-capsules", void 0, capProfile);
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
        const memProfile = m.profile || "public";
        const memSettings = this.getSettings(memProfile);
        if (!memSettings.desktopNotificationsEnabled || !memSettings.annualMemoryNotificationEnabled) return false;
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
          this.showNotification("📅 Annual Memory", `You saved a memory for this day. Click to revisit it.`, "annual_memory", targetPath, void 0, "public");
          await this.pushInAppNotification("annual_memory", "Annual Memory", `You saved this memory for today.`, "Calendar", targetPath);
        } else {
          this.showNotification("📅 Annual Memories", `You have ${notifiedCount} memories associated with today.`, "annual_memory", targetPath, void 0, "public");
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
  async checkPreferredTimes(now) {
    try {
      const habits = await dbAsync.find("habits", { archived: { $ne: true } });
      if (habits.length === 0) return;
      const todayStr = now.toISOString().split("T")[0];
      const todayLogs = await dbAsync.find("habitLogs", { date: todayStr });
      const todayLogsMap = new Map(todayLogs.map((l) => [l.habitId, l]));
      for (const h of habits) {
        if (!h.preferredTime) continue;
        const habProfile = h.profile || "public";
        const habSettings = this.getSettings(habProfile);
        if (!habSettings.desktopNotificationsEnabled || habSettings.habitPreferredNotificationEnabled === false) continue;
        const statusLog = todayLogsMap.get(h._id);
        const status = statusLog ? statusLog.status : "pending";
        if (status !== "pending") continue;
        const [hh, mm] = h.preferredTime.split(":");
        const prefTime = new Date(now);
        prefTime.setHours(parseInt(hh), parseInt(mm), 0, 0);
        if (now.getTime() > prefTime.getTime()) {
          const notifiedKey = `prefNotified_${todayStr}_${h._id}`;
          const hasNotified = settingsStore.get(notifiedKey);
          if (!hasNotified) {
            settingsStore.set(notifiedKey, true);
            this.showNotification(
              "Preferred Time Missed",
              `You missed the preferred time for habit: ${h.title}`,
              "habit_preferred",
              "/habits",
              void 0,
              habProfile
            );
            await this.pushInAppNotification(
              "habit_preferred",
              "Preferred Time Missed",
              `You missed the preferred time for habit: ${h.title}`,
              "Habits",
              "/habits"
            );
          }
        }
      }
    } catch (e) {
      console.error("[NotificationService] checkPreferredTimes error:", e);
    }
  }
  async checkDeadlines(now) {
    try {
      const habits = await dbAsync.find("habits", { archived: { $ne: true } });
      if (habits.length === 0) return;
      const todayStr = now.toISOString().split("T")[0];
      const todayLogs = await dbAsync.find("habitLogs", { date: todayStr });
      const todayLogsMap = new Map(todayLogs.map((l) => [l.habitId, l]));
      for (const h of habits) {
        if (!h.deadlineTime) continue;
        const habProfile = h.profile || "public";
        const habSettings = this.getSettings(habProfile);
        if (!habSettings.desktopNotificationsEnabled || habSettings.habitDeadlineNotificationEnabled === false) continue;
        const statusLog = todayLogsMap.get(h._id);
        const status = statusLog ? statusLog.status : "pending";
        if (status !== "pending") continue;
        const [hh, mm] = h.deadlineTime.split(":");
        const deadlineTime = new Date(now);
        deadlineTime.setHours(parseInt(hh), parseInt(mm), 0, 0);
        if (now.getTime() > deadlineTime.getTime()) {
          const notifiedKey = `deadlineNotified_${todayStr}_${h._id}`;
          const hasNotified = settingsStore.get(notifiedKey);
          if (!hasNotified) {
            settingsStore.set(notifiedKey, true);
            this.showNotification(
              "Habit Deadline Missed",
              `You missed the deadline for habit: ${h.title}`,
              "habit_deadline",
              "/habits",
              void 0,
              habProfile
            );
            await this.pushInAppNotification(
              "habit_deadline",
              "Habit Deadline Missed",
              `You missed the deadline for habit: ${h.title}`,
              "Habits",
              "/habits"
            );
          }
        }
      }
    } catch (e) {
      console.error("[NotificationService] checkDeadlines error:", e);
    }
  }
  async checkDreams(now) {
    try {
      const dreams = await dbAsync.find("dreams", { status: "Active" });
      for (const d of dreams) {
        if (!d.targetDate) continue;
        const dProfile = d.profile || "public";
        const dSettings = this.getSettings(dProfile);
        if (!dSettings.desktopNotificationsEnabled || !dSettings.dreamNotificationEnabled) continue;
        let targetTime = 0;
        const parts = d.targetDate.split("-");
        if (parts.length >= 3) {
          targetTime = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999).getTime();
        } else {
          targetTime = new Date(d.targetDate).getTime();
        }
        if (now.getTime() > targetTime) {
          const key = `dream_missed_${d._id}`;
          const unlocks = await dbAsync.find("systemUnlocks", { key });
          if (unlocks.length === 0) {
            await dbAsync.insert("systemUnlocks", { key, unlockedAt: Date.now() });
            this.showNotification("Dream Target Missed", `You missed the target date for your dream: ${d.title}`, "dream", `/dreams/view/${d._id}`, void 0, dProfile);
            await this.pushInAppNotification("dream", "Dream Target Missed", `You missed the target date for your dream: ${d.title}`, "Dreams", `/dreams/view/${d._id}`);
          }
        }
      }
    } catch (e) {
      console.error("[NotificationService] checkDreams error:", e);
    }
  }
}
const notificationService = NotificationService.getInstance();
const userDataPath$1 = electron.app.getPath("userData");
const dataPath = path.join(userDataPath$1, "data");
const cachePath = electron.app.getPath("cache");
function getFileSizeSafe(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}
function getFolderSize(folderPath) {
  let size = 0;
  let count = 0;
  try {
    if (!fs.existsSync(folderPath)) return { size, count };
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        const sub = getFolderSize(fullPath);
        size += sub.size;
        count += sub.count;
      } else {
        size += stats.size;
        count++;
      }
    }
  } catch {
  }
  return { size, count };
}
function extractFilePathsFromDoc(doc) {
  let paths = [];
  if (doc.attachments && Array.isArray(doc.attachments)) {
    paths.push(...doc.attachments.filter((p) => p.startsWith("file:///")));
  }
  if (doc.photos && Array.isArray(doc.photos)) {
    paths.push(...doc.photos.filter((p) => p.startsWith("file:///")));
  }
  if (doc.audio && Array.isArray(doc.audio)) {
    paths.push(...doc.audio.filter((p) => p.startsWith("file:///")));
  }
  if (doc.videos && Array.isArray(doc.videos)) {
    paths.push(...doc.videos.filter((p) => p.startsWith("file:///")));
  }
  if (doc.documents && Array.isArray(doc.documents)) {
    paths.push(...doc.documents.filter((p) => p.startsWith("file:///")));
  }
  if (doc.coverImage && doc.coverImage.startsWith("file:///")) {
    paths.push(doc.coverImage);
  }
  return paths.map((p) => {
    let clean = p.replace(/^file:\/\/\//i, "");
    try {
      clean = decodeURIComponent(clean);
    } catch {
    }
    return clean;
  });
}
const SECTION_CONFIG = [
  { collection: "relationships", name: "Relationships" },
  { collection: "journal", name: "Journal" },
  { collection: "records", name: "Records" },
  { collection: "goals", name: "Goals" },
  { collection: "habits", name: "Habits" },
  { collection: "projects", name: "Projects" },
  { collection: "career", name: "Career" },
  { collection: "education", name: "Education" },
  { collection: "certificates", name: "Certificates" },
  { collection: "skills", name: "Skills" },
  { collection: "achievements", name: "Achievements" },
  { collection: "memoryCapsules", name: "Memory Capsules" },
  { collection: "calendarMemories", name: "Calendar" },
  { collection: "actionGroups", name: "AI Assistant Data" },
  { collection: "dreams", name: "Dreams" },
  { collection: "dream_goals", name: "Dream Goals" },
  { collection: "dream_projects", name: "Dream Projects" },
  { collection: "dream_skills", name: "Dream Skills" },
  { collection: "dream_certificates", name: "Dream Certificates" },
  { collection: "clockAppearance", name: "Clock Appearance" },
  { collection: "clockAssets", name: "Clock Assets" },
  { collection: "clockAlarms", name: "Clock Alarms" },
  { collection: "clockEvents", name: "Clock Events" },
  { collection: "relationshipConversations", name: "Relationship Conversations" }
];
const storageService = {
  async getStorageInfo(mode = "both") {
    const sections = [];
    let totalAppSize = 0;
    let totalFileCount = 0;
    const fileTypes = {
      Images: { type: "Images", size: 0, count: 0 },
      Videos: { type: "Videos", size: 0, count: 0 },
      Audio: { type: "Audio", size: 0, count: 0 },
      Documents: { type: "Documents", size: 0, count: 0 },
      Database: { type: "Database", size: 0, count: 0 },
      Other: { type: "Other", size: 0, count: 0 }
    };
    for (const config of SECTION_CONFIG) {
      const section = { name: config.name, size: 0, count: 0, items: [] };
      let dbPath = path.join(dataPath, `${config.collection}.db`);
      let dbSize = getFileSizeSafe(dbPath);
      section.size += dbSize;
      section.count += 1;
      fileTypes.Database.size += dbSize;
      fileTypes.Database.count += 1;
      try {
        const query = {};
        if (mode === "public") query.profile = "public";
        else if (mode === "private") query.profile = "private";
        const docs = await dbAsync.find(config.collection, query);
        for (const doc of docs) {
          const dbItemFootprint = Buffer.byteLength(JSON.stringify(doc), "utf8");
          let itemSize = dbItemFootprint;
          section.size += dbItemFootprint;
          section.count += 1;
          const paths = extractFilePathsFromDoc(doc);
          for (const p of paths) {
            const size = getFileSizeSafe(p);
            itemSize += size;
            section.size += size;
            section.count += 1;
            const ext = path.extname(p).toLowerCase();
            if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(ext)) {
              fileTypes.Images.size += size;
              fileTypes.Images.count += 1;
            } else if ([".mp4", ".mkv", ".avi", ".mov", ".webm"].includes(ext)) {
              fileTypes.Videos.size += size;
              fileTypes.Videos.count += 1;
            } else if ([".mp3", ".wav", ".ogg", ".m4a"].includes(ext)) {
              fileTypes.Audio.size += size;
              fileTypes.Audio.count += 1;
            } else if ([".pdf", ".doc", ".docx", ".txt", ".csv"].includes(ext)) {
              fileTypes.Documents.size += size;
              fileTypes.Documents.count += 1;
            } else {
              fileTypes.Other.size += size;
              fileTypes.Other.count += 1;
            }
          }
          if (itemSize > 0) {
            let itemName = doc.title || doc.name || doc.label || doc.company || doc.school || doc.degree;
            if (config.collection === "clockAssets") {
              itemName = `Asset: ${doc.originalName || doc.storedName || doc._id}`;
            } else if (config.collection === "clockEvents") {
              const eventType = doc.type ? doc.type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Event";
              itemName = `${eventType}${doc.label ? ` - ${doc.label}` : ""}`;
            } else if (config.collection === "clockAlarms") {
              itemName = `Alarm: ${doc.time || ""} ${doc.label ? `(${doc.label})` : ""}`.trim() || `Alarm (${doc._id})`;
            }
            if (!itemName) {
              if (config.collection === "journal") {
                const preview = doc.content ? doc.content.replace(/<[^>]*>?/gm, "").trim().substring(0, 25) : "";
                itemName = preview ? `"${preview}..."` : `Journal on ${doc.date || "Unknown"}`;
              } else if (config.collection === "actionGroups") {
                itemName = `Agent Task (${doc.actionGroupId ? doc.actionGroupId.replace("group_", "").substring(0, 6) : doc._id ? doc._id.substring(0, 6) : "Unknown"})`;
              } else if (config.collection === "relationshipConversations") {
                if (doc.personId === "self_p" || doc.personId?.startsWith("self_")) itemName = "Personal Notes Chat";
                else {
                  try {
                    const persons = await dbAsync.find("relationships", { _id: doc.personId });
                    if (persons && persons[0] && (persons[0].name || persons[0].title)) itemName = `Chat with ${persons[0].name || persons[0].title}`;
                  } catch (e) {
                  }
                  if (!itemName) itemName = `Chat (${doc.personId ? doc.personId.replace("rel_", "").substring(0, 6) : "Unknown"})`;
                }
              } else if (config.collection === "dream_goals") {
                try {
                  const goals = await dbAsync.find("goals", { _id: doc.goalId });
                  if (goals && goals[0] && (goals[0].title || goals[0].name)) itemName = `Goal: ${goals[0].title || goals[0].name}`;
                } catch (e) {
                }
              } else if (config.collection === "dream_projects") {
                try {
                  const projs = await dbAsync.find("projects", { _id: doc.projectId });
                  if (projs && projs[0] && (projs[0].title || projs[0].name)) itemName = `Project: ${projs[0].title || projs[0].name}`;
                } catch (e) {
                }
              } else if (config.collection === "dream_skills") {
                try {
                  const skills = await dbAsync.find("skills", { _id: doc.skillId });
                  if (skills && skills[0] && (skills[0].title || skills[0].name)) itemName = `Skill: ${skills[0].title || skills[0].name}`;
                } catch (e) {
                }
              } else if (config.collection === "dream_certificates") {
                try {
                  const certs = await dbAsync.find("certificates", { _id: doc.certificateId });
                  if (certs && certs[0] && (certs[0].title || certs[0].name)) itemName = `Cert: ${certs[0].title || certs[0].name}`;
                } catch (e) {
                }
              } else if (config.collection === "clockAppearance") {
                itemName = "Custom Clock Appearance";
              }
              if (!itemName) {
                itemName = `${config.name} Item (${doc._id ? doc._id.substring(0, 6) : "Unknown"})`;
              }
            }
            section.items.push({
              name: itemName,
              size: itemSize
            });
          }
        }
      } catch (err) {
        console.error(`Error calculating storage for ${config.name}:`, err);
      }
      section.items.sort((a, b) => b.size - a.size);
      sections.push(section);
      totalAppSize += section.size;
      totalFileCount += section.count;
    }
    const remainingDbs = ["habitLogs", "habitTimerSessions", "habitBreaks", "habitActivityLogs", "conversations", "userProfile", "notifications", "systemUnlocks"];
    let otherDbSize = 0;
    let otherDbCount = 0;
    for (const dbName of remainingDbs) {
      const dbPath = path.join(dataPath, `${dbName}.db`);
      const sz = getFileSizeSafe(dbPath);
      otherDbSize += sz;
      if (sz > 0) otherDbCount++;
    }
    if (otherDbSize > 0) {
      sections.push({ name: "System Data", size: otherDbSize, count: otherDbCount, items: [] });
      totalAppSize += otherDbSize;
      totalFileCount += otherDbCount;
      fileTypes.Database.size += otherDbSize;
      fileTypes.Database.count += otherDbCount;
    }
    sections.sort((a, b) => b.size - a.size);
    const cacheStats = getFolderSize(cachePath);
    const drivePath = process.platform === "win32" ? userDataPath$1.substring(0, 3).toUpperCase() : "/";
    let driveInfo = { path: drivePath, total: 0, free: 0, used: 0, percentUsed: 0 };
    try {
      const stat = fs.statfsSync(userDataPath$1);
      const total = stat.bsize * stat.blocks;
      const free = stat.bsize * stat.bfree;
      const used = total - free;
      driveInfo = {
        path: drivePath,
        total,
        free,
        used,
        percentUsed: total > 0 ? used / total * 100 : 0
      };
    } catch (e) {
      console.error("Failed to get drive info", e);
    }
    const maxAppSize = settingsStore.get("maxAppSize", null);
    return {
      totalAppSize,
      maxAppSize,
      fileCount: totalFileCount,
      sections,
      fileTypes: Object.values(fileTypes).filter((ft) => ft.size > 0).sort((a, b) => b.size - a.size),
      drive: driveInfo,
      cacheSize: cacheStats.size
    };
  },
  async clearCache() {
    const beforeStats = getFolderSize(cachePath);
    try {
      if (electron.session.defaultSession) {
        await electron.session.defaultSession.clearCache();
        await electron.session.defaultSession.clearStorageData({ storages: ["cache", "shadercache"] });
      }
    } catch (e) {
      console.error("Failed to clear electron cache", e);
    }
    try {
      if (fs.existsSync(cachePath)) {
        const files = fs.readdirSync(cachePath);
        for (const file of files) {
          try {
            fs.rmSync(path.join(cachePath, file), { recursive: true, force: true });
          } catch (e) {
          }
        }
      }
    } catch (e) {
      console.error("Failed to manually clear cache folder", e);
    }
    const afterStats = getFolderSize(cachePath);
    const freed = beforeStats.size - afterStats.size;
    return freed > 0 ? freed : 0;
  },
  async setMaxAppSize(sizeInBytes) {
    settingsStore.set("maxAppSize", sizeInBytes);
  },
  async checkLimitsBeforeWrite(expectedBytes) {
    const maxAppSize = settingsStore.get("maxAppSize", null);
    if (maxAppSize !== null) {
      const info = await this.getStorageInfo();
      if (info.totalAppSize + expectedBytes > maxAppSize) {
        return { allowed: false, reason: "APP_LIMIT_REACHED" };
      }
    }
    try {
      const stat = fs.statfsSync(userDataPath$1);
      const free = stat.bsize * stat.bfree;
      if (expectedBytes + 100 * 1024 * 1024 > free) {
        return { allowed: false, reason: "DRIVE_LIMIT_REACHED" };
      }
    } catch (e) {
    }
    return { allowed: true };
  },
  async resetData(mode) {
    try {
      for (const config of SECTION_CONFIG) {
        if (mode === "both") {
          await dbAsync.remove(config.collection, {}, { multi: true });
        } else {
          await dbAsync.remove(config.collection, { profile: mode }, { multi: true });
        }
      }
      return true;
    } catch (err) {
      console.error("Failed to reset data", err);
      return false;
    }
  }
};
function setupStorageHandlers() {
  electron.ipcMain.handle("storage:getInfo", (_, mode) => storageService.getStorageInfo(mode));
  electron.ipcMain.handle("storage:clearCache", () => storageService.clearCache());
  electron.ipcMain.handle("storage:setMaxAppSize", (_, size) => storageService.setMaxAppSize(size));
  electron.ipcMain.handle("storage:checkLimits", (_, size) => storageService.checkLimitsBeforeWrite(size));
  electron.ipcMain.handle("storage:resetData", (_, mode) => storageService.resetData(mode));
}
let tray = null;
let isQuitting = false;
const userDataPath = electron.app.getPath("userData");
const attachmentsPath = path.join(userDataPath, "data", "attachments");
const clockBackgroundsPath = path.join(userDataPath, "clock", "backgrounds");
const clockCursorsPath = path.join(userDataPath, "clock", "cursors");
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
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
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
  mainWindow.on("maximize", () => mainWindow.webContents.send("window:maximizedChanged", true));
  mainWindow.on("unmaximize", () => mainWindow.webContents.send("window:maximizedChanged", false));
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
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    const wins = electron.BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      if (wins[0].isMinimized()) wins[0].restore();
      wins[0].show();
      wins[0].focus();
    }
  });
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
    setupStorageHandlers();
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
    if (!fs.existsSync(clockBackgroundsPath)) fs.mkdirSync(clockBackgroundsPath, { recursive: true });
    if (!fs.existsSync(clockCursorsPath)) fs.mkdirSync(clockCursorsPath, { recursive: true });
    electron.ipcMain.handle("attachment:add", async (_event, options) => {
      try {
        const { filePaths } = await electron.dialog.showOpenDialog({
          title: options?.title || "Add Attachment",
          properties: options?.multiple ? ["openFile", "multiSelections"] : ["openFile"],
          filters: options?.filters || []
        });
        if (filePaths && filePaths.length > 0) {
          let totalSize = 0;
          for (const p of filePaths) {
            try {
              totalSize += fs.statSync(p).size;
            } catch {
            }
          }
          const limitCheck = await storageService.checkLimitsBeforeWrite(totalSize);
          if (!limitCheck.allowed) {
            electron.dialog.showErrorBox("Storage Limit Reached", limitCheck.reason === "APP_LIMIT_REACHED" ? "Kiseki Record has reached your configured storage limit. Free up space or increase the limit." : "Your drive is critically low on space. Kiseki Record cannot save more files.");
            return { success: false, error: limitCheck.reason };
          }
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
        const limitCheck = await storageService.checkLimitsBeforeWrite(buffer.length);
        if (!limitCheck.allowed) {
          electron.dialog.showErrorBox("Storage Limit Reached", limitCheck.reason === "APP_LIMIT_REACHED" ? "Kiseki Record has reached your configured storage limit. Free up space or increase the limit." : "Your drive is critically low on space. Kiseki Record cannot save more files.");
          return { success: false, error: limitCheck.reason };
        }
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
        let fileSize = 0;
        try {
          fileSize = fs.statSync(sourcePath).size;
        } catch {
        }
        const limitCheck = await storageService.checkLimitsBeforeWrite(fileSize);
        if (!limitCheck.allowed) {
          electron.dialog.showErrorBox("Storage Limit Reached", limitCheck.reason === "APP_LIMIT_REACHED" ? "Kiseki Record has reached your configured storage limit. Free up space or increase the limit." : "Your drive is critically low on space. Kiseki Record cannot save more files.");
          return { success: false, error: limitCheck.reason };
        }
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
    electron.ipcMain.handle("clockAssets:choose", async (_event, type) => {
      try {
        const filters = type === "background" ? [{ name: "Media", extensions: ["jpg", "jpeg", "png", "webp", "mp4", "webm"] }] : [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }];
        const { filePaths } = await electron.dialog.showOpenDialog({
          title: "Select Asset",
          filters,
          properties: ["openFile"]
        });
        if (!filePaths || filePaths.length === 0) return { success: false };
        const sourcePath = filePaths[0];
        const stat = fs.statSync(sourcePath);
        const maxSize = type === "background" ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
        if (stat.size > maxSize) {
          throw new Error(`File is too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
        }
        const ext = path.extname(sourcePath).toLowerCase();
        const isVideo = [".mp4", ".webm"].includes(ext);
        const mimeType = isVideo ? `video/${ext.substring(1)}` : `image/${ext.substring(1) === "jpg" ? "jpeg" : ext.substring(1)}`;
        const assetId = `asset-${Date.now()}`;
        const filename = `${assetId}${ext}`;
        const targetDir = type === "background" ? clockBackgroundsPath : clockCursorsPath;
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const destPath = path.join(targetDir, filename);
        if (type === "cursor" && !isVideo) {
          const image = electron.nativeImage.createFromPath(sourcePath);
          const resized = image.resize({ width: 32, height: 32, quality: "best" });
          fs.writeFileSync(destPath, resized.toPNG());
        } else {
          fs.copyFileSync(sourcePath, destPath);
        }
        return {
          success: true,
          asset: {
            id: assetId,
            type: type === "background" ? isVideo ? "video" : "image" : "cursor",
            originalName: path.basename(sourcePath),
            storedName: filename,
            relativePath: `local-media://${destPath.replace(/\\/g, "/")}`,
            mimeType,
            size: stat.size,
            createdAt: Date.now()
          }
        };
      } catch (error) {
        console.error("clockAssets:choose error:", error);
        electron.dialog.showErrorBox("Failed to Import Media", error?.message || "Unknown error occurred.");
        return { success: false, error: error?.message };
      }
    });
    electron.ipcMain.handle("db:find", async (_, collection, query = {}) => {
      if (!db[collection]) {
        console.error(`db:find error: Collection '${collection}' does not exist in database.`);
        return [];
      }
      query.profile = profileManager.currentProfile;
      return new Promise((resolve, reject) => {
        db[collection].find(query, (err, docs) => {
          if (err) reject(err);
          else resolve(docs);
        });
      });
    });
    electron.ipcMain.handle("db:insert", async (_, collection, doc) => {
      if (!db[collection]) {
        console.error(`db:insert error: Collection '${collection}' does not exist in database.`);
        throw new Error(`Collection '${collection}' does not exist in database.`);
      }
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
      if (!db[collection]) {
        console.error(`db:update error: Collection '${collection}' does not exist in database.`);
        return 0;
      }
      query.profile = profileManager.currentProfile;
      return new Promise((resolve, reject) => {
        db[collection].update(query, update, options || {}, (err, numReplaced) => {
          if (err) reject(err);
          else resolve(numReplaced);
        });
      });
    });
    electron.ipcMain.handle("db:remove", async (_, collection, query = {}, options) => {
      if (!db[collection]) {
        console.error(`db:remove error: Collection '${collection}' does not exist in database.`);
        return 0;
      }
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
    electron.ipcMain.handle("notifications:triggerInApp", (_, type, title, message, _sourceModule, targetPath) => {
      const settings = notificationService.getSettings();
      if (settings.desktopNotificationsEnabled) {
        if (type === "achievement" && settings.achievementsNotificationEnabled) {
          notificationService.showNotification(title, message, type, targetPath);
        } else if (type === "milestone" && settings.achievementsNotificationEnabled) {
          notificationService.showNotification(title, message, type, targetPath);
        } else if (type === "clock_alarm" && settings.alarmNotificationEnabled) {
          notificationService.showNotification(title, message, type, targetPath);
        } else if (type === "ai_response" && settings.aiResponseNotificationEnabled !== false) {
          notificationService.showNotification(title, message, type, targetPath);
        }
      }
    });
    electron.ipcMain.handle("app:restart", () => {
      electron.app.relaunch();
      electron.app.exit(0);
    });
    electron.ipcMain.handle("window:minimize", () => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) win.minimize();
    });
    electron.ipcMain.handle("window:maximize", () => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) {
        if (win.isMaximized()) win.restore();
        else win.maximize();
      }
    });
    electron.ipcMain.handle("window:restore", () => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) win.restore();
    });
    electron.ipcMain.handle("window:close", () => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) win.close();
    });
    electron.ipcMain.handle("window:isMaximized", () => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      return win ? win.isMaximized() : false;
    });
    electron.ipcMain.handle("settings:get", (_, key, defaultValue) => {
      return settingsManager.get(key, defaultValue);
    });
    electron.ipcMain.handle("settings:set", (_, key, value) => {
      settingsManager.set(key, value);
      return true;
    });
    electron.ipcMain.handle("settings:delete", (_, key) => {
      settingsManager.delete(key);
      return true;
    });
    electron.ipcMain.handle("settings:getAll", () => {
      return settingsManager.getAll();
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
}
