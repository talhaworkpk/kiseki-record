import './index.css' // Import Tailwind
import 'leaflet/dist/leaflet.css' // Import Leaflet CSS

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { mockApi } from './lib/mockApi'

if (!window.api) {
  console.log('No Electron API detected. Injecting Web Demo Mock API...');
  (window as any).api = mockApi;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
