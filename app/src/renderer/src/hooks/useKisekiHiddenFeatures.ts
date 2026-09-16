import { useState, useEffect } from 'react';

export function useKisekiHiddenFeatures() {
  const [showKiseki, setShowKiseki] = useState(() => {
    return sessionStorage.getItem('kisekiHiddenFeatures') === 'true';
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && (e.key === '#' || e.key === '3')) {
        setShowKiseki((prev) => {
          const next = !prev;
          sessionStorage.setItem('kisekiHiddenFeatures', String(next));
          // Dispatch a custom event so other components can sync
          window.dispatchEvent(new Event('kisekiHiddenFeaturesChanged'));
          return next;
        });
      }
    };

    const handleStorageChange = () => {
      setShowKiseki(sessionStorage.getItem('kisekiHiddenFeatures') === 'true');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('kisekiHiddenFeaturesChanged', handleStorageChange);
    // Also listen to storage events from other windows/tabs if any
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('kisekiHiddenFeaturesChanged', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return showKiseki;
}
