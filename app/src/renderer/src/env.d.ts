/// <reference types="vite/client" />

interface Window {
  api: {
    window: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      restore: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      onMaximizedChanged: (callback: (isMaximized: boolean) => void) => void;
      offMaximizedChanged: () => void;
    };
    [key: string]: any;
  };
}
