import React, { useState, useEffect } from 'react';
import { LucideHardDrive, LucideDownload, LucidePause, LucidePlay, LucideX, LucideTrash2 } from 'lucide-react';
import { OfflineMap } from '../../components/OfflineMap';

interface Region {
  id: string;
  name: string;
  sizeMB: number;
  installed: boolean;
  downloading: boolean;
  downloadState: {
    progress: number;
    status: 'downloading' | 'paused' | 'completed' | 'error';
    speedMBps: number;
    remainingTimeSec: number;
  } | null;
}

interface StorageInfo {
  totalUsedMB: number;
  cacheSizeMB: number;
  availableMB: number;
}

export default function OfflineMaps() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [storage, setStorage] = useState<StorageInfo>({ totalUsedMB: 0, cacheSizeMB: 0, availableMB: 0 });

  const loadData = async () => {
    // @ts-ignore
    if (!window.api?.map) return;
    // @ts-ignore
    const r = await window.api.map.getRegions();
    setRegions(r);
    // @ts-ignore
    const s = await window.api.map.getStorageInfo();
    setStorage(s);
  };

  useEffect(() => {
    loadData();
    // @ts-ignore
    if (window.api?.map?.onDownloadProgress) {
      // @ts-ignore
      window.api.map.onDownloadProgress((state: any) => {
        setRegions(prev => prev.map(r => {
          if (r.id === state.id) {
            if (state.status === 'completed') {
              return { ...r, installed: true, downloading: false, downloadState: null };
            }
            return { ...r, downloading: true, downloadState: state };
          }
          return r;
        }));
        // If completed, update storage
        if (state.status === 'completed') {
          loadData();
        }
      });
    }

    return () => {
      // @ts-ignore
      if (window.api?.map?.offDownloadProgress) {
        // @ts-ignore
        window.api.map.offDownloadProgress();
      }
    };
  }, []);

  const handleDownload = async (id: string) => {
    // @ts-ignore
    await window.api.map.startDownload(id);
    loadData();
  };

  const handlePause = async (id: string) => {
    // @ts-ignore
    await window.api.map.pauseDownload(id);
    loadData();
  };

  const handleResume = async (id: string) => {
    // @ts-ignore
    await window.api.map.resumeDownload(id);
    loadData();
  };

  const handleCancel = async (id: string) => {
    // @ts-ignore
    await window.api.map.cancelDownload(id);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this offline region?')) {
      // @ts-ignore
      await window.api.map.deleteRegion(id);
      loadData();
    }
  };

  const formatMB = (mb: number) => {
    if (mb > 1000) return (mb / 1024).toFixed(2) + ' GB';
    return mb.toFixed(1) + ' MB';
  };

  const formatTime = (sec: number) => {
    if (sec < 60) return `${Math.round(sec)}s`;
    return `${Math.round(sec / 60)}m ${Math.round(sec % 60)}s`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Storage Section */}
      <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <LucideHardDrive className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Map Storage</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-accent/50 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Offline Maps</div>
            <div className="text-2xl font-semibold">{formatMB(storage.totalUsedMB - storage.cacheSizeMB)}</div>
          </div>
          <div className="p-4 bg-accent/50 rounded-lg">
            <div className="text-sm text-muted-foreground">Dynamic Cache (Viewed Areas)</div>
            <div className="text-2xl font-semibold">{formatMB(storage.cacheSizeMB)}</div>
          </div>
          <div className="p-4 bg-accent/50 rounded-lg">
            <div className="text-sm text-muted-foreground">Available Space</div>
            <div className="text-2xl font-semibold text-green-600">{formatMB(storage.availableMB)}</div>
          </div>
        </div>
      </section>

      {/* Regions Section */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Map Preview */}
        <div className="border border-border rounded-xl bg-card shadow-sm p-6 flex flex-col h-[600px]">
          <h2 className="text-xl font-semibold mb-4">Live Map Preview</h2>
          <div className="flex-1 rounded-lg overflow-hidden border border-border shadow-inner bg-muted">
            <OfflineMap defaultZoom={3} />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Pan and zoom to dynamically cache regions or preview downloaded areas.
          </p>
        </div>

        <div className="border border-border rounded-xl bg-card shadow-sm p-6 flex flex-col max-h-[600px]">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-xl font-semibold">Map Regions</h2>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-md hover:bg-secondary/90 transition-colors">
              Import Local Map
            </button>
          </div>

          <div className="overflow-y-auto pr-2 space-y-4">
            {regions.map(region => (
            <div key={region.id} className="border border-border rounded-lg p-4 flex flex-col justify-between bg-background">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{region.name}</h3>
                  <div className="text-sm text-muted-foreground">
                    {formatMB(region.sizeMB)}
                  </div>
                </div>
                {region.installed && !region.downloading && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-md border border-green-200">
                    Installed
                  </span>
                )}
              </div>

              {/* Action Buttons & Progress */}
              <div className="mt-auto">
                {region.downloading && region.downloadState ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>{region.downloadState.status === 'paused' ? 'Paused' : 'Downloading'} - {region.downloadState.progress.toFixed(1)}%</span>
                      {region.downloadState.status === 'downloading' && (
                        <span>{formatMB(region.downloadState.speedMBps)}/s • {formatTime(region.downloadState.remainingTimeSec)} left</span>
                      )}
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${region.downloadState.status === 'paused' ? 'bg-orange-400' : 'bg-primary'} transition-all duration-300`} 
                        style={{ width: `${region.downloadState.progress}%` }} 
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      {region.downloadState.status === 'downloading' ? (
                        <button onClick={() => handlePause(region.id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-md transition-colors" title="Pause">
                          <LucidePause className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => handleResume(region.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Resume">
                          <LucidePlay className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleCancel(region.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Cancel">
                        <LucideX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : region.installed ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDelete(region.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors border border-destructive/20 font-medium"
                    >
                      <LucideTrash2 className="w-4 h-4" />
                      Delete Region
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleDownload(region.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <LucideDownload className="w-4 h-4" />
                    Download Region
                  </button>
                )}
              </div>
            </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
