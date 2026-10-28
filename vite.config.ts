import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
// @ts-expect-error plain JS module shared with the production server
import { attachLive } from './server/live.js';
// @ts-expect-error plain JS module shared with the production server
import { handleApi } from './server/projects.js';

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  build: {
    target: 'es2022', // the valley awaits its project list at the top level
    // two pages: the portfolio at / and the game at /valley/
    rollupOptions: { input: { home: page('./index.html'), valley: page('./valley/index.html') } },
  },
  plugins: [{
    name: 'live',
    // `npm run dev` runs the live-visitors socket and the GitHub-backed /api routes inside Vite's own server
    configureServer: s => {
      if (s.httpServer) attachLive(s.httpServer);
      s.middlewares.use((req, res, next) => (req.url === '/valley' ? res.writeHead(301, { location: '/valley/' }).end() : next()));
      s.middlewares.use((req, res, next) => { handleApi(req, res).then((done: boolean) => done || next(), next); });
    },
  }],
});
