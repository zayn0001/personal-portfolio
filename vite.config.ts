import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
// @ts-expect-error plain JS module shared with the production server
import { attachLive } from './server/live.js';

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // two pages: the portfolio at / and the game at /valley/
  build: { rollupOptions: { input: { home: page('./index.html'), valley: page('./valley/index.html') } } },
  plugins: [{
    name: 'live',
    // `npm run dev` runs the live-visitors socket inside Vite's own server
    configureServer: s => {
      if (s.httpServer) attachLive(s.httpServer);
      s.middlewares.use((req, res, next) => (req.url === '/valley' ? res.writeHead(301, { location: '/valley/' }).end() : next()));
    },
  }],
});
