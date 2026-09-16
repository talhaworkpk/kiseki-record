import { useState, useEffect } from 'react';

export default function useOnlineWarning() {
  const [showWarning, setShowWarning] = useState(false);

  const checkAndShow = () => {
    const hasSeen = localStorage.getItem('kiseki_online_warning_seen') === 'true';
    if (!hasSeen) {
      setShowWarning(true);
      return true;
    }
    return false;
  };

  const acknowledge = () => {
    localStorage.setItem('kiseki_online_warning_seen', 'true');
    setShowWarning(false);
  };

  const WarningModal = showWarning ? (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Kiseki is now Offline + Online</h2>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Kiseki remains fully usable offline.</p>
          <p>Your personal data and offline features continue to work locally on your device.</p>
          <p>Some features now require an internet connection, including Kiseki ID, connections, and messaging.</p>
          <p>You can continue using Kiseki offline at any time.</p>
        </div>
        <button 
          onClick={acknowledge} 
          className="w-full py-2 mt-6 bg-primary text-primary-foreground font-bold rounded-xl"
        >
          I Understand
        </button>
      </div>
    </div>
  ) : null;

  return { checkAndShow, WarningModal, showWarning };
}