import React from 'react';
import { MapContainer, TileLayer, MapContainerProps } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export interface OfflineMapProps extends MapContainerProps {
  /**
   * Path to local map tiles. 
   * For Electron offline usage, this could be a custom protocol or a local relative path
   * if tiles are packaged in the app, e.g., './tiles/{z}/{x}/{y}.png'
   */
  tileUrl?: string;
  defaultPosition?: [number, number];
  defaultZoom?: number;
}

export const OfflineMap: React.FC<OfflineMapProps> = ({
  tileUrl = 'map-tile://osm/{z}/{x}/{y}.png', // Custom protocol for hybrid caching
  defaultPosition = [51.505, -0.09],
  defaultZoom = 13,
  children,
  ...props
}) => {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border shadow-sm relative">
      {isOffline && (
        <div className="absolute top-2 right-2 z-[1000] bg-orange-100 text-orange-800 text-xs px-3 py-1 rounded-full shadow-md font-medium border border-orange-200">
          Working Offline
        </div>
      )}
      <MapContainer
        center={defaultPosition}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        {...props}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; Offline Map Data'
        />
        {children}
      </MapContainer>
    </div>
  );
};
