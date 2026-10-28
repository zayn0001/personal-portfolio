import { arrToLook, lookToArr, type Look } from './sprites';

export interface Remote { id: number; name: string; look: number[]; x: number; y: number; dir: number; m: boolean }
export interface Shown { name: string; look: Look; x: number; y: number; gx: number; gy: number; dir: number; m: boolean; walkT: number }

const url = import.meta.env.VITE_WS_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/live`;

/**
 * Connects right away. `ready` resolves on the server's first hello, so the UI can wait for the backend.
 * Keeps a smoothed copy of everyone else and reports the live list via onState. Reconnects (and rejoins) on drop.
 */
export function connectLive(onState: (all: Remote[], me: number) => void) {
  const shown = new Map<number, Shown>();
  let ws: WebSocket, me = 0, last = 0, joinMsg = '';
  let markReady!: () => void;
  const ready = new Promise<void>(r => (markReady = r));

  const connect = () => {
    ws = new WebSocket(url);
    ws.onclose = () => setTimeout(connect, 2000);
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.t === 'hi') { me = msg.id; if (joinMsg) ws.send(joinMsg); markReady(); return; }
      if (!joinMsg) return;
      const all: Remote[] = msg.players;
      for (const p of all) {
        if (p.id === me) continue;
        const s = shown.get(p.id);
        if (s) Object.assign(s, { gx: p.x, gy: p.y, dir: p.dir, m: p.m });
        else shown.set(p.id, { name: p.name, look: arrToLook(p.look), x: p.x, y: p.y, gx: p.x, gy: p.y, dir: p.dir, m: p.m, walkT: 0 });
      }
      for (const id of shown.keys()) if (!all.some(p => p.id === id)) shown.delete(id);
      onState(all, me);
    };
  };
  connect();

  return {
    ready,
    join(name: string, look: Look) {
      joinMsg = JSON.stringify({ t: 'join', name, look: lookToArr(look) });
      if (ws.readyState === 1) ws.send(joinMsg); // otherwise sent on the next hello
    },
    others: () => shown.values(),
    /** Call every frame with our own state. */
    update(dt: number, x: number, y: number, dir: number, m: boolean) {
      const now = performance.now();
      if (joinMsg && ws.readyState === 1 && now - last > 66) { last = now; ws.send(JSON.stringify({ t: 'move', x, y, dir, m })); }
      const k = 1 - Math.exp(-12 * dt);
      for (const s of shown.values()) {
        s.x += (s.gx - s.x) * k; s.y += (s.gy - s.y) * k;
        s.walkT = s.m ? s.walkT + dt : 0;
      }
    },
  };
}
