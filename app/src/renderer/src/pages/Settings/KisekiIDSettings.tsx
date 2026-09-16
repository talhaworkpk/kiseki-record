import { useState, useEffect } from 'react';
import { Copy, Share2, Trash2 } from 'lucide-react';
import { AuthService } from '../../lib/messaging/AuthService';
import { NotificationEngine } from '../../lib/NotificationEngine';
import { Person } from '../../types';
import useOnlineWarning from '../../components/relationships/OnlineWarningModal';

export default function KisekiIDSettings() {
  const [kisekiId, setKisekiId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connections, setConnections] = useState<Person[]>([]);
  const [showConnections, setShowConnections] = useState(false);
  const { checkAndShow, WarningModal, showWarning } = useOnlineWarning();

  useEffect(() => {
    if (!checkAndShow()) {
      initId();
    }
  }, []);

  useEffect(() => {
    if (!showWarning && loading && !kisekiId) {
      initId();
    }
  }, [showWarning]);

  const initId = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const hasSession = await AuthService.initAnonymousSession();
      if (hasSession) {
        const id = await AuthService.getKisekiId();
        setKisekiId(id);
        if (!id) setErrorMsg('AuthService.getKisekiId() returned null.');
      } else {
        setErrorMsg('AuthService.initAnonymousSession() failed to get session.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || String(e));
    } finally {
      // Load local connections
      try {
        // @ts-ignore
        const persons = await window.api.db.find('relationships', { kisekiId: { $exists: true, $ne: null } });
        setConnections(persons || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (kisekiId) {
      navigator.clipboard.writeText(kisekiId);
      NotificationEngine.notify('success', 'Copied', 'Kiseki ID copied to clipboard.', 'Settings');
    }
  };

  const handleRemoveConnection = async (person: Person) => {
    if (!confirm("Remove Kiseki connection?\n\n" + person.name + " will no longer be connected to you through Kiseki.\n\nYour existing Relationship record will remain.")) return;
    
    try {
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $unset: { kisekiId: true } }, {});
      setConnections(connections.filter(p => p._id !== person._id));
      NotificationEngine.notify('success', 'Connection Removed', person.name + ' disconnected.');
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !showWarning) return <div className="p-6 animate-pulse">Loading your Kiseki ID...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {WarningModal}
      <div className="bg-card border border-border p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Your Kiseki ID</h2>
        {kisekiId ? (
          <div className="flex flex-col gap-4">
            <div className="bg-accent/50 p-4 rounded-xl text-center">
              <span className="text-2xl font-mono font-bold tracking-widest text-primary">{kisekiId}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 rounded-xl font-medium transition-colors"><Copy size={18}/> Copy ID</button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Share this ID with people you want to connect with. They do not need your phone number.</p>
          </div>
        ) : (
          <div className="text-destructive text-sm bg-destructive/10 p-4 rounded-xl border border-destructive/20">
            <p>Unable to retrieve Kiseki ID. Please check your internet connection.</p>
            {errorMsg && <p className="mt-2 text-xs font-mono opacity-80">Details: {errorMsg}</p>}
          </div>
        )}
      </div>

      <div className="bg-card border border-border p-6 rounded-2xl">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowConnections(!showConnections)}>
          <div>
            <h2 className="text-xl font-bold">Connected Relationships</h2>
            <p className="text-sm text-muted-foreground">People connected via Kiseki</p>
          </div>
          <div className="text-2xl font-bold text-primary">{connections.length}</div>
        </div>
        
        {showConnections && (
          <div className="mt-6 space-y-4">
            {connections.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No connections yet.</div>
            ) : (
              connections.map(person => (
                <div key={person._id} className="flex justify-between items-center p-4 bg-accent/30 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">{person.name[0]}</div>
                    <div>
                      <div className="font-bold">{person.name}</div>
                      <div className="text-xs text-green-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Connected</div>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveConnection(person)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors" title="Remove Connection">
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}