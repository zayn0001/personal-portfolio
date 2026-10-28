import './style.css';
import { projects } from './projects';
import { buildWorld, T, type Building } from './world';
import { arrToLook, charFrame, drawChar, lookToArr, randomLook } from './sprites';
import { openBook, bookOpen, bookKey } from './book';
import { connectLive } from './live';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const cv = $<HTMLCanvasElement>('game'), g = cv.getContext('2d')!;
const mapCv = $<HTMLCanvasElement>('map'), mg = mapCv.getContext('2d')!;
const world = buildWorld(projects);
const SPEED = 80; // px/s in art pixels

let S = 3; // screen px per art px
function resize() {
  cv.width = innerWidth; cv.height = innerHeight;
  S = Math.max(2, Math.round(Math.min(innerWidth / (T * 36), innerHeight / (T * 20))));
  g.imageSmoothingEnabled = false;
}
resize();
addEventListener('resize', resize);
mapCv.width = world.mini.width; mapCv.height = world.mini.height;
mapCv.style.width = mapCv.width * 2 + 'px';

const saved = localStorage.getItem('look');
const me = { name: '', x: 4.5 * T, y: 15.9 * T, dir: 0, moving: false, walkT: 0, look: saved ? arrToLook(JSON.parse(saved)) : randomLook() };
const stepOf = (walkT: number) => (walkT ? [0, 1, 0, 2][Math.floor(walkT * 8) % 4] : 0);
let playing = false, near: Building | null = null;
const live = connectLive(all => { hud.textContent = `● ${all.length} in town`; });

// ---- loading screen until the backend says hello
const loader = $('loading'), lv = $<HTMLCanvasElement>('walker').getContext('2d')!, walkerLook = randomLook();
const walk = setInterval(() => {
  lv.clearRect(0, 0, 16, 28);
  lv.drawImage(charFrame(walkerLook, 2, [0, 1, 0, 2][Math.floor(performance.now() / 150) % 4]), 0, 0);
}, 50);
const slow = setTimeout(() => { $('lmsg').textContent = 'Waking up the town, this can take a moment'; }, 5000);
live.ready.then(() => {
  clearInterval(walk); clearTimeout(slow);
  loader.remove();
  $('intro').style.display = 'flex';
  $('name').focus();
});

// ---- join
const intro = $<HTMLFormElement>('intro'), nameBox = $<HTMLInputElement>('name'), hud = $('hud');
nameBox.value = localStorage.getItem('name') ?? '';

// character preview: spins through directions; Randomize rerolls every trait
const pv = $<HTMLCanvasElement>('preview').getContext('2d')!;
setInterval(() => {
  if (playing) return;
  pv.clearRect(0, 0, 16, 28);
  pv.drawImage(charFrame(me.look, [0, 2, 3, 1][Math.floor(performance.now() / 700) % 4], 0), 0, 0);
}, 100);
$('reroll').onclick = () => { me.look = randomLook(); };
intro.onsubmit = e => {
  e.preventDefault();
  me.name = nameBox.value.trim() || 'visitor';
  localStorage.setItem('name', me.name);
  localStorage.setItem('look', JSON.stringify(lookToArr(me.look)));
  live.join(me.name, me.look);
  intro.style.display = 'none';
  hud.style.display = mapCv.style.display = $('clock').style.display = $('homebtn').style.display = 'block';
  hud.textContent = '● 1 in town';
  playing = true;
};

// ---- input
const keys: Record<string, boolean> = {};
addEventListener('keydown', e => {
  if (!playing) return;
  if (bookOpen()) { bookKey(e); return; }
  keys[e.code] = true;
  if (['KeyE', 'Space', 'Enter'].includes(e.code) && near && !e.repeat) { openBook(near.project); e.preventDefault(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// feet hitbox 10x4 art px
const blocked = (x: number, y: number) => [[-5, -4], [5, -4], [-5, -0.01], [5, -0.01]].some(([ox, oy]) => world.isSolid(x + ox, y + oy));

function update(dt: number) {
  let dx = 0, dy = 0;
  if (playing && !bookOpen()) {
    dx = +!!(keys.KeyD || keys.ArrowRight) - +!!(keys.KeyA || keys.ArrowLeft);
    dy = +!!(keys.KeyS || keys.ArrowDown) - +!!(keys.KeyW || keys.ArrowUp);
  }
  me.moving = !!(dx || dy);
  if (me.moving) {
    me.dir = dx && !dy ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0;
    const k = (SPEED * dt) / Math.hypot(dx, dy);
    if (!blocked(me.x + dx * k, me.y)) me.x += dx * k;
    if (!blocked(me.x, me.y + dy * k)) me.y += dy * k;
    me.walkT += dt;
  } else me.walkT = 0;
  near = world.buildings.find(b => Math.hypot(me.x - b.door.x, me.y - b.door.y) < 1.3 * T || Math.hypot(me.x - b.sign.x, me.y - b.sign.y) < 1.6 * T) ?? null;
  live.update(dt, me.x, me.y, me.dir, me.moving);
}

// ---- render: ground image, then everything y-sorted so you can walk behind trees and houses
function render(now: number) {
  const ww = world.MW * T * S, wh = world.MH * T * S;
  const cam = (p: number, view: number, size: number) => Math.round(size < view ? (size - view) / 2 : Math.max(0, Math.min(size - view, p * S - view / 2)));
  const cx = cam(me.x, cv.width, ww), cy = cam(me.y, cv.height, wh);
  const sx = (x: number) => Math.round(x * S - cx), sy = (y: number) => Math.round(y * S - cy);
  const img = (i: HTMLCanvasElement, x: number, y: number) => g.drawImage(i, sx(x), sy(y), i.width * S, i.height * S);

  g.fillStyle = '#24572a'; g.fillRect(0, 0, cv.width, cv.height);
  g.drawImage(world.ground, -cx, -cy, ww, wh);

  const draws: [number, () => void][] = [];
  const tags: [string, number, number][] = [];
  for (const p of world.props) draws.push([p.y - 2, () => img(p.img, p.x - p.img.width / 2, p.y - p.img.height)]);
  for (const b of world.buildings) {
    draws.push([13 * T, () => { img(b.img, b.tx * T - 4, 7 * T - 16); sign(b.project.title, sx(b.tx * T + 56), sy(7 * T + 34)); }]);
  }
  for (const o of live.others() ?? []) {
    draws.push([o.y, () => drawChar(g, sx(o.x), sy(o.y), S, o.look, o.dir, stepOf(o.walkT))]);
    tags.push([o.name, sx(o.x), sy(o.y - 31)]);
  }
  if (playing) {
    draws.push([me.y, () => drawChar(g, sx(me.x), sy(me.y), S, me.look, me.dir, stepOf(me.walkT))]);
    tags.push([me.name, sx(me.x), sy(me.y - 31)]);
  }
  draws.sort((a, b) => a[0] - b[0]).forEach(d => d[1]());

  g.font = `${4 * S}px VT323, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [name, x, y] of tags) {
    const w = g.measureText(name).width + 2 * S;
    g.fillStyle = '#0008'; g.fillRect(x - w / 2, y - 2.5 * S, w, 5 * S);
    g.fillStyle = '#fff'; g.fillText(name, x, y);
  }
  if (near && !bookOpen()) bubble(sx(near.sign.x), sy(near.sign.y - 26 + Math.sin(now / 150)));

  mg.drawImage(world.mini, 0, 0);
  for (const o of live.others() ?? []) { mg.fillStyle = '#e33'; mg.fillRect(o.x / T * 3 - 2, o.y / T * 3 - 3, 4, 4); }
  if (playing) { mg.fillStyle = '#000'; mg.fillRect(me.x / T * 3 - 3, me.y / T * 3 - 4, 6, 6); mg.fillStyle = '#fff'; mg.fillRect(me.x / T * 3 - 2, me.y / T * 3 - 3, 4, 4); }
}

function sign(text: string, x: number, y: number) {
  g.font = `${6 * S}px VT323, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + 6 * S, h = 8 * S;
  g.fillStyle = '#4a2c14'; g.fillRect(x - w / 2 - S, y - h / 2 - S, w + 2 * S, h + 2 * S);
  g.fillStyle = '#a8743f'; g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle = '#3b1f0e'; g.fillText(text, x + S / 2, y + S / 2);
  g.fillStyle = '#fff3d6'; g.fillText(text, x, y);
}

function bubble(x: number, y: number) {
  const s = 9 * S;
  g.fillStyle = '#3b1f0e'; g.fillRect(x - s / 2 - S, y - s - S, s + 2 * S, s + 2 * S);
  g.fillStyle = '#fff8e6'; g.fillRect(x - s / 2, y - s, s, s);
  g.fillStyle = '#fff8e6'; g.fillRect(x - S, y, 2 * S, 2 * S);
  g.font = `${8 * S}px VT323, monospace`; g.fillStyle = '#b5462f'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('E', x, y - s / 2 + S / 2);
}

// Stardew-style date/time box, real local time
const tick = () => {
  const d = new Date();
  $('cdate').textContent = d.toLocaleDateString('en-US', { weekday: 'short' }) + '. ' + d.getDate();
  $('ctime').textContent = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
};
tick(); setInterval(tick, 10000);

let last = performance.now();
requestAnimationFrame(function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  update(dt);
  render(now);
  requestAnimationFrame(frame);
});
