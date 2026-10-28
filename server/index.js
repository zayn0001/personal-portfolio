// Production server: serves dist/ and the live-visitors socket on one port.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { parseRange } from './range.js';
import { extname, join, resolve } from 'node:path';
import { attachLive } from './live.js';
import { getProjects, handleApi } from './projects.js';

const dist = join(import.meta.dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };

const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/healthz') return res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end('{"status":"ok"}'); // for host health checks
    if (await handleApi(req, res)) return;
    if (!extname(path) && !path.endsWith('/')) return res.writeHead(301, { location: path + '/' }).end(); // /valley -> /valley/
    const file = resolve(dist, '.' + (path.endsWith('/') ? path + 'index.html' : path));
    if (!file.startsWith(dist)) throw 0; // no escaping dist/
    const st = await stat(file);
    if (!st.isFile()) throw 0;
    // stream from disk; byte ranges let browsers seek videos (Safari won't play mp4 without them)
    const headers = { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'accept-ranges': 'bytes' };
    const range = parseRange(req.headers.range, st.size);
    if (range === 'invalid') return res.writeHead(416, { 'content-range': `bytes */${st.size}` }).end();
    if (!range) { res.writeHead(200, { ...headers, 'content-length': st.size }); return createReadStream(file).pipe(res); }
    const { start, end } = range;
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
  } catch {
    if (res.headersSent) res.destroy(); // failed mid-stream (e.g. a proxied video): just drop it
    else res.writeHead(404).end('not found');
  }
});
attachLive(server);
getProjects(); // warm the GitHub cache so the first visitor doesn't wait
server.listen(process.env.PORT ?? 8080, () => console.log('portfolio on :' + (process.env.PORT ?? 8080)));
