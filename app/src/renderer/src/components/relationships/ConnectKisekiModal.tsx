import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificationEngine } from '../../lib/NotificationEngine';

export default function ConnectKisekiModal({ onClose, onConnect }: { onClose: () => void, onConnect: (kisekiId: string, name: string) => void }) {
  const [kisekiId, setKisekiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!kisekiId.trim()) return;
    if (!navigator.onLine) {
      setError('You are currently offline. Please connect to the internet to find Kiseki users.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('kiseki_users')
        .select('kiseki_id')
        .eq('kiseki_id', kisekiId.trim())
        .single();
      
      if (fetchError || !data) {
        setError('User not found. Please check the Kiseki ID and try again.');
        setLoading(false);
        return;
      }
      
      // Wait, we just verified they exist. The user didn't ask for a name exchange immediately,
      // but we need a name for the local person record.
      // Actually, we can prompt for their local name after connecting, or right here.
      const localName = prompt('User found! What is their name for your records?');
      if (!localName) {
        setLoading(false);
        return;
      }

      onConnect(data.kiseki_id, localName);
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 shadow-xl">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-xl font-bold">Connect on Kiseki</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">Enter your friend's Kiseki ID to connect and chat in real-time.</p>
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Kiseki ID</label>
            <input 
              type="text" 
              placeholder="KSK-XXXX-XXXX"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary uppercase font-mono"
              value={kisekiId}
              onChange={e => setKisekiId(e.target.value.toUpperCase())}
            />
          </div>
          
          {error && <div className="text-sm text-destructive">{error}</div>}
          
          <button 
            onClick={handleVerify}
            disabled={loading || !kisekiId.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-xl font-bold mt-4 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : <><Search size={18} /> Verify and Connect</>}
          </button>
        </div>
      </div>
    </div>
  );
}