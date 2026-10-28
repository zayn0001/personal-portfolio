import { WebSocketServer } from 'ws';

const MAX_PLAYERS = 50;
const num = (v, lim) => (Number.isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : undefined);

/** Live visitors over WebSocket at /live. In-memory; one process = one museum. */
export function attachLive(server) {
  // noServer + manual upgrade so other sockets on the same server (Vite HMR) are left alone
  const wss = new WebSocketServer({ noServer: true, maxPayload: 512 });
  server.on('upgrade', (req, socket, head) => {
    if (new URL(req.url, 'http://x').pathname === '/live') wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  const players = new Map();
  let next = 1;

  wss.on('connection', ws => {
    if (players.size >= MAX_PLAYERS) return ws.close();
    const p = { id: next++, name: '', look: [], x: 0, y: 0, dir: 0, m: false, joined: false };
    players.set(p.id, p);
    ws.send(JSON.stringify({ t: 'hi', id: p.id }));
    ws.on('message', raw => {
      let m;
      try { m = JSON.parse(raw); } catch { return; }
      if (m?.t === 'join') {
        p.name = String(m.name ?? '').trim().slice(0, 20) || 'visitor';
        // look = small ints picking each trait; the client maps them onto its tables
        p.look = Array.isArray(m.look) ? m.look.slice(0, 16).map(v => (Number.isInteger(v) && v >= 0 && v < 256 ? v : 0)) : [];
        p.joined = true;
      } else if (m?.t === 'move' && p.joined) {
        p.x = num(m.x, 1e5) ?? p.x; p.y = num(m.y, 1e5) ?? p.y;
        p.dir = [0, 1, 2, 3].includes(m.dir) ? m.dir : p.dir; p.m = !!m.m;
      }
    });
    ws.on('close', () => players.delete(p.id));
  });

  // ponytail: full snapshot to everyone at 10Hz, fine for ~50 players; switch to deltas beyond that
  setInterval(() => {
    const list = [...players.values()].filter(p => p.joined).map(({ id, name, look, x, y, dir, m }) => ({ id, name, look, x, y, dir, m }));
    const msg = JSON.stringify({ t: 'state', players: list });
    for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
  }, 100);
}
