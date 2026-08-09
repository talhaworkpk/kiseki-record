import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';

// Predefined available regions
const AVAILABLE_REGIONS = [
  { id: 'pakistan', name: 'Pakistan', sizeMB: 450 },
  { id: 'india', name: 'India', sizeMB: 1200 },
  { id: 'bangladesh', name: 'Bangladesh', sizeMB: 300 },
  { id: 'china', name: 'China', sizeMB: 3500 },
  { id: 'japan', name: 'Japan', sizeMB: 850 },
  { id: 'south-korea', name: 'South Korea', sizeMB: 400 },
  { id: 'saudi-arabia', name: 'Saudi Arabia', sizeMB: 600 },
  { id: 'uae', name: 'UAE', sizeMB: 150 },
  { id: 'europe', name: 'Europe', sizeMB: 18000 },
  { id: 'north-america', name: 'North America', sizeMB: 9000 },
  { id: 'south-america', name: 'South America', sizeMB: 4500 },
  { id: 'australia', name: 'Australia', sizeMB: 1800 },
  { id: 'africa', name: 'Africa', sizeMB: 5000 },
];

interface DownloadState {
  id: string;
  progress: number; // 0-100
  status: 'downloading' | 'paused' | 'completed' | 'error';
  speedMBps: number;
  remainingTimeSec: number;
  intervalId?: NodeJS.Timeout;
}

const activeDownloads = new Map<string, DownloadState>();
const MAPS_DIR = path.join(app.getPath('userData'), 'maps', 'regions');

export function setupMapManager(mainWindow: Electron.BrowserWindow) {
  if (!fs.existsSync(MAPS_DIR)) {
    fs.mkdirSync(MAPS_DIR, { recursive: true });
  }

  // Helper to emit events to renderer
  const emitProgress = (state: DownloadState) => {
    // Strip intervalId before sending
    const { intervalId, ...safeState } = state;
    mainWindow.webContents.send('map:downloadProgress', safeState);
  };

  // Setup IPC Handlers
  ipcMain.handle('map:getRegions', async () => {
    // Check which are installed
    const installedIds = fs.readdirSync(MAPS_DIR)
      .filter(f => f.endsWith('.region'))
      .map(f => f.replace('.region', ''));

    return AVAILABLE_REGIONS.map(r => ({
      ...r,
      installed: installedIds.includes(r.id),
      downloading: activeDownloads.has(r.id),
      downloadState: activeDownloads.get(r.id) || null
    }));
  });

  ipcMain.handle('map:startDownload', async (_, regionId: string) => {
    const region = AVAILABLE_REGIONS.find(r => r.id === regionId);
    if (!region) return { success: false, error: 'Region not found' };

    if (activeDownloads.has(regionId)) {
      return { success: false, error: 'Download already in progress' };
    }

    const state: DownloadState = {
      id: regionId,
      progress: 0,
      status: 'downloading',
      speedMBps: Math.random() * 5 + 2, // Simulate 2-7 MB/s
      remainingTimeSec: region.sizeMB / 5,
    };

    activeDownloads.set(regionId, state);

    // Simulate download loop
    state.intervalId = setInterval(() => {
      const currentState = activeDownloads.get(regionId);
      if (!currentState || currentState.status !== 'downloading') return;

      const increment = (currentState.speedMBps / region.sizeMB) * 100 * 0.5; // Update every 500ms
      currentState.progress += increment;
      currentState.remainingTimeSec = (region.sizeMB - (currentState.progress / 100 * region.sizeMB)) / currentState.speedMBps;
      
      // Jitter speed slightly
      currentState.speedMBps = Math.max(0.5, currentState.speedMBps + (Math.random() - 0.5));

      if (currentState.progress >= 100) {
        currentState.progress = 100;
        currentState.status = 'completed';
        currentState.remainingTimeSec = 0;
        clearInterval(currentState.intervalId);
        
        // Create a dummy region file to mark as installed
        fs.writeFileSync(path.join(MAPS_DIR, `${regionId}.region`), `Simulated Map Region: ${region.name}`);
        
        activeDownloads.delete(regionId);
        emitProgress(currentState);
      } else {
        emitProgress(currentState);
      }
    }, 500);

    return { success: true };
  });

  ipcMain.handle('map:pauseDownload', async (_, regionId: string) => {
    const state = activeDownloads.get(regionId);
    if (state && state.status === 'downloading') {
      state.status = 'paused';
      if (state.intervalId) clearInterval(state.intervalId);
      emitProgress(state);
      return { success: true };
    }
    return { success: false, error: 'Download not active' };
  });

  ipcMain.handle('map:resumeDownload', async (_, regionId: string) => {
    const state = activeDownloads.get(regionId);
    const region = AVAILABLE_REGIONS.find(r => r.id === regionId);
    if (state && state.status === 'paused' && region) {
      state.status = 'downloading';
      state.intervalId = setInterval(() => {
        // Reuse the logic from startDownload
        const currentState = activeDownloads.get(regionId);
        if (!currentState || currentState.status !== 'downloading') return;
  
        const increment = (currentState.speedMBps / region.sizeMB) * 100 * 0.5;
        currentState.progress += increment;
        currentState.remainingTimeSec = (region.sizeMB - (currentState.progress / 100 * region.sizeMB)) / currentState.speedMBps;
        currentState.speedMBps = Math.max(0.5, currentState.speedMBps + (Math.random() - 0.5));
  
        if (currentState.progress >= 100) {
          currentState.progress = 100;
          currentState.status = 'completed';
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
    return { success: false, error: 'Cannot resume' };
  });

  ipcMain.handle('map:cancelDownload', async (_, regionId: string) => {
    const state = activeDownloads.get(regionId);
    if (state) {
      if (state.intervalId) clearInterval(state.intervalId);
      activeDownloads.delete(regionId);
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('map:deleteRegion', async (_, regionId: string) => {
    const regionPath = path.join(MAPS_DIR, `${regionId}.region`);
    if (fs.existsSync(regionPath)) {
      fs.unlinkSync(regionPath);
      return { success: true };
    }
    return { success: false, error: 'Region not found' };
  });

  ipcMain.handle('map:getStorageInfo', async () => {
    // Return mock total size for now, sum of sizes of installed regions
    const installedIds = fs.readdirSync(MAPS_DIR)
      .filter(f => f.endsWith('.region'))
      .map(f => f.replace('.region', ''));
    
    let totalUsedMB = 0;
    installedIds.forEach(id => {
      const region = AVAILABLE_REGIONS.find(r => r.id === id);
      if (region) totalUsedMB += region.sizeMB;
    });

    // Also factor in cached map tiles
    let cacheSizeMB = 0;
    const cacheDir = path.join(app.getPath('userData'), 'maps', 'cache');
    
    // Quick recursion for cache size
    const getDirSize = (dirPath: string): number => {
      if (!fs.existsSync(dirPath)) return 0;
      const files = fs.readdirSync(dirPath);
      let size = 0;
      files.forEach(file => {
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
      availableMB: 500000 // Just a placeholder 500GB
    };
  });
}
