import React, { useState, useEffect } from 'react';
import { UserPlus, X, MessageSquareWarning } from 'lucide-react';
import { MessageReceiverService } from '../../lib/messaging/MessageReceiverService';

export function UnknownSenderModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [senderId, setSenderId] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const handleUnknownSender = (e: any) => {
      setSenderId(e.detail.senderId);
      setName('');
      setIsOpen(true);
    };
    window.addEventListener('kiseki:unknown-sender', handleUnknownSender);
    return () => window.removeEventListener('kiseki:unknown-sender', handleUnknownSender);
  }, []);

  const handleAdd = () => {
    const finalName = name.trim() || 'Unknown Contact';
    MessageReceiverService.resolveUnknownSender(finalName);
    setIsOpen(false);
  };

  const handleIgnore = () => {
    MessageReceiverService.resolveUnknownSender(null);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
          <div className="absolute -bottom-8 bg-card p-3 rounded-2xl shadow-lg border border-border">
            <MessageSquareWarning size={32} className="text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="pt-12 pb-6 px-6 text-center">
          <h2 className="text-xl font-bold mb-2">New Message Request</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Someone connected with you using your Kiseki ID and wants to communicate. 
            Would you like to add them to your relationships?
          </p>

          <div className="text-left mb-6">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
              Save Contact As
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe (Optional)"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleIgnore}
              className="flex-1 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
            >
              Ignore
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/20"
            >
              <UserPlus size={18} />
              Add Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
