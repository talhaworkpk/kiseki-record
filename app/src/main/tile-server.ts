import { protocol, app, net } from 'electron';
import path from 'path';
import fs from 'fs';

const CACHE_DIR = path.join(app.getPath('userData'), 'maps', 'cache');

export function setupTileServer() {
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Register custom protocol for map tiles
  protocol.handle('map-tile', async (request) => {
    try {
      const url = new URL(request.url);
      
      // url.pathname could be something like /osm/13/423/123.png
      // or //osm/13/423/123.png depending on URL parsing
      const parts = url.pathname.split('/').filter(Boolean);
      
      // We expect [provider, z, x, y.png]
      if (parts.length >= 4 && parts[0] === 'osm') {
        const z = parts[1];
        const x = parts[2];
        const y = parts[3];

        const zPath = path.join(CACHE_DIR, z);
        const xPath = path.join(zPath, x);
        const tilePath = path.join(xPath, y);

        // Check if tile exists in local cache
        if (fs.existsSync(tilePath)) {
          const buffer = await fs.promises.readFile(tilePath);
          return new Response(buffer, {
            headers: { 'Content-Type': 'image/png' }
          });
        }

        // If not, fetch from internet
        try {
          const remoteUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}`;
          const response = await net.fetch(remoteUrl, {
            headers: {
              'User-Agent': 'KisekiRecord/1.0 (LocalOfflineCache)'
            }
          });

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Save to cache asynchronously
            fs.promises.mkdir(xPath, { recursive: true }).then(() => {
              fs.promises.writeFile(tilePath, buffer).catch(err => {
                console.error(`Failed to cache tile ${z}/${x}/${y}`, err);
              });
            }).catch(console.error);

            return new Response(buffer, {
              headers: { 'Content-Type': 'image/png' }
            });
          } else {
            console.warn(`Tile server responded with ${response.status} for ${remoteUrl}`);
          }
        } catch (fetchErr) {
          console.warn(`Failed to fetch tile (offline?): ${z}/${x}/${y}`, fetchErr);
        }

        // Return transparent PNG if offline and not cached
        const transparentPng = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
          'base64'
        );
        return new Response(transparentPng, {
          headers: { 'Content-Type': 'image/png' }
        });
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      console.error('Tile server error', err);
      return new Response('Internal error', { status: 500 });
    }
  });
}
