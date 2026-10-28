// Procedural pixel art: no image assets, everything is fillRect + an outline pass.

export const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;

/** Seeded PRNG (mulberry32). The seed is scrambled first: raw FNV hashes of similar titles gave correlated early rolls. */
export const rng = (seed: number) => {
  seed = Math.imul(seed ^ (seed >>> 16), 0x85ebca6b);
  seed = Math.imul(seed ^ (seed >>> 13), 0xc2b2ae35);
  seed ^= seed >>> 16;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Darken (k<0) or lighten (k>0) a #rrggbb colour. */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k))));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(c => f(c).toString(16).padStart(2, '0')).join('');
}

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

/** Stardew-style dark outline around every opaque shape (alpha > 128 counts as solid). */
export function outline(c: HTMLCanvasElement, col = [43, 26, 18]) {
  const g = c.getContext('2d')!, { width: w, height: h } = c;
  const src = g.getImageData(0, 0, w, h), out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src.data[(y * w + x) * 4 + 3] > 128;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (solid(x, y) || !(solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) continue;
    const i = (y * w + x) * 4;
    out.data.set([col[0], col[1], col[2], 255], i);
  }
  g.putImageData(out, 0, 0);
  return c;
}

// ---- character looks: every trait is an index into a table, so a look is just a short int array

const SKIN = ['#ffe3cc', '#f6cfa9', '#e8b48a', '#d39a6c', '#b07650', '#8a5636', '#61391f'];
const HAIRC = ['#2b1d14', '#4a2f1e', '#7a4b2a', '#b0743c', '#d9a441', '#f1d27a', '#e8e4da', '#9a9a9a', '#b5462f', '#e0607e', '#4f7fc0', '#5fae4f'];
const EYEC = ['#2b1d14', '#3d6fb5', '#4a8f3c', '#7a4b2a', '#6a4a9a', '#2a7a7a'];
const CLOTH = ['#d9534f', '#e67e22', '#f1c40f', '#5cb85c', '#2e8b57', '#4f86c6', '#2c3e70', '#8e44ad', '#e07fb0', '#f5f0e6', '#3a3a3a', '#8b5a2b', '#7fb8c9'];
const PANTSC = ['#3a4a6b', '#2c3e70', '#4a3a2b', '#2b2b2b', '#5a6b3a', '#8b5a2b', '#6b6b6b', '#7a2e3a', '#c9b48a'];
const SHOEC = ['#3b2a1e', '#1e1e1e', '#7a4b2a', '#8a2a2a', '#e8e4da'];

// hair: short spiky long bob ponytail bald mohawk afro bun swoop
// shirt: tee stripes overalls hoodie vest tank · pants: long shorts skirt · eyes: dot big happy sleepy · mouth: line smile o
// beard: none mustache goatee full stubble · acc: none glasses shades cap strawhat beanie flower headphones earrings headband bow
const COUNTS = { skin: 7, hair: 10, hairColor: 12, eyes: 4, eyeColor: 6, mouth: 3, blush: 2, beard: 5, shirt: 6, shirtColor: 13, pants: 3, pantsColor: 9, shoes: 5, acc: 11, accColor: 13 };
export type Look = Record<keyof typeof COUNTS, number>;
const KEYS = Object.keys(COUNTS) as (keyof Look)[];

export const lookToArr = (l: Look) => KEYS.map(k => l[k]);
/** Also the validator for looks coming off the network: anything odd becomes a valid index. */
export const arrToLook = (a: unknown): Look =>
  Object.fromEntries(KEYS.map((k, i) => [k, Math.abs(Math.floor(Number(Array.isArray(a) ? a[i] : 0) || 0)) % COUNTS[k]])) as Look;

export function randomLook(r = Math.random): Look {
  const l = arrToLook(KEYS.map(k => Math.floor(r() * COUNTS[k])));
  if (r() < 0.55) l.beard = 0;
  if (r() < 0.35) l.acc = 0;
  return l;
}

function colors(l: Look) {
  const skin = SKIN[l.skin], hc = HAIRC[l.hairColor], shirt = CLOTH[l.shirtColor], pants = PANTSC[l.pantsColor], acc = CLOTH[l.accColor];
  return {
    skin, skinD: shade(skin, -0.15), hc, hd: shade(hc, -0.3), eye: EYEC[l.eyeColor], shirt, shirtD: shade(shirt, -0.2),
    pants, pantsD: shade(pants, -0.25), shoe: SHOEC[l.shoes], acc, accD: shade(acc, -0.25),
    stripe: l.shirtColor === 9 ? '#c9c2b0' : '#f5f0e6', mouth: shade(skin, -0.45),
  };
}
type Px = (x: number, y: number, w: number, h: number, col: string) => void;
const DARK = '#2b1d14', LENS = '#cfe8ff', BLACK = '#1e1e1e', FRAME = '#2a2a2a', GOLD = '#f4d03f', PINK = '#e85d75';

/** One 16x28 frame, facing down (0), left (1) or up (3). Feet at the bottom. */
function drawFrame(p: Px, l: Look, dir: number, step: number) {
  const c = colors(l), side = dir === 1, back = dir === 3, b = step ? 1 : 0, T0 = 16 + b, H = b;

  // legs + shoes
  const leg = (x: number, w: number, lift: number) => {
    const h = 3 - lift;
    if (l.pants === 0) p(x, 23, w, h, c.pants);
    else { p(x, 23, w, h, c.skin); if (l.pants === 1) p(x, 23, w, 1, c.pants); }
    p(side ? x - 1 : x, 26 - lift, side ? w + 1 : w, 1, c.shoe);
  };
  if (side) {
    if (!step) leg(6, 4, 0); else { leg(5, 3, step === 2 ? 1 : 0); leg(8, 3, step === 1 ? 1 : 0); }
  } else { leg(5, 3, step === 1 ? 1 : 0); leg(8, 3, step === 2 ? 1 : 0); }
  p(side ? 5 : 4, 22, side ? 6 : 8, 1, c.pants);
  if (l.pants === 2) { p(side ? 4 : 3, 23, side ? 8 : 10, 2, c.pants); p(side ? 4 : 3, 24, side ? 8 : 10, 1, c.pantsD); }

  // torso + arms
  const white = '#f0ece0', vest = l.shirt === 4;
  const sleeve = l.shirt === 5 ? c.skin : vest ? white : c.shirt;
  const lower = l.shirt === 3 ? c.shirt : c.skin;
  if (side) {
    p(5, T0, 6, 6, vest ? white : c.shirt);
    if (vest) p(8, T0, 3, 6, c.shirt);
    if (l.shirt === 1) for (const y of [2, 4]) p(5, T0 + y, 6, 1, c.stripe);
    if (l.shirt === 2) { p(5, T0 + 2, 4, 4, c.pants); p(6, T0, 1, 2, c.pants); }
    if (l.shirt === 3) p(8, T0, 3, 1, c.shirtD);
    const a = step === 1 ? -1 : step === 2 ? 1 : 0;
    p(7 + a, T0, 2, 3, sleeve); p(7 + a, T0 + 3, 2, 2, lower); p(7 + a, T0 + 5, 2, 1, c.skin);
  } else {
    p(4, T0, 8, 6, vest ? white : c.shirt);
    if (vest) { p(4, T0, 3, 6, c.shirt); p(9, T0, 3, 6, c.shirt); }
    if (l.shirt === 1) for (const y of [2, 4]) p(4, T0 + y, 8, 1, c.stripe);
    if (l.shirt === 2) {
      p(5, T0 + 2, 6, 4, c.pants); p(5, T0, 1, 2, c.pants); p(10, T0, 1, 2, c.pants);
      if (!back) { p(5, T0 + 2, 1, 1, GOLD); p(10, T0 + 2, 1, 1, GOLD); }
    }
    if (l.shirt === 3) back ? p(5, T0, 6, 2, c.shirtD) : (p(5, T0, 6, 1, c.shirtD), p(5, T0 + 3, 6, 2, c.shirtD));
    if (l.shirt === 5) { p(4, T0, 1, 1, c.skin); p(11, T0, 1, 1, c.skin); }
    if (l.shirt === 0 && !back) p(7, T0, 2, 1, c.skin);
    if (l.shirt !== 2 && l.pants !== 2) p(4, T0 + 5, 8, 1, c.pantsD);
    for (const x of [2, 12]) { p(x, T0, 2, 3, sleeve); p(x, T0 + 3, 2, 2, lower); p(x, T0 + 5, 2, 1, c.skin); }
  }

  // head
  p(6, 15 + H, 4, 1, c.skinD);
  p(4, 4 + H, 8, 11, c.skin); p(3, 6 + H, 10, 7, c.skin);
  if (side) { p(2, 10 + H, 1, 1, c.skin); p(9, 9 + H, 1, 2, c.skinD); }
  else { p(2, 9 + H, 1, 2, c.skin); p(13, 9 + H, 1, 2, c.skin); }

  // face
  if (!back) {
    const ex = side ? [4] : [5, 10];
    for (const x of ex) {
      if (l.eyes === 0) { p(x, 9 + H, 1, 1, DARK); p(x, 10 + H, 1, 1, c.eye); }
      else if (l.eyes === 1) { const w = x < 8 ? x - 1 : x; p(w, 9 + H, 2, 2, '#fff'); p(x, 9 + H, 1, 2, c.eye); }
      else if (l.eyes === 2) { p(x - 1, 10 + H, 1, 1, DARK); p(x, 9 + H, 1, 1, DARK); p(x + 1, 10 + H, 1, 1, DARK); }
      else p(x - (x < 8 ? 1 : 0), 10 + H, 2, 1, DARK);
    }
    if (l.blush) side ? p(4, 11 + H, 1, 1, '#f2a0a0') : (p(4, 11 + H, 1, 1, '#f2a0a0'), p(11, 11 + H, 1, 1, '#f2a0a0'));
    const mx = side ? 3 : 7;
    const mouth = () => {
      if (l.mouth === 1 && !side) { p(6, 12 + H, 1, 1, c.mouth); p(7, 13 + H, 2, 1, c.mouth); p(9, 12 + H, 1, 1, c.mouth); }
      else p(mx, 12 + H, 2, 1, l.mouth === 2 ? '#8a3030' : c.mouth);
    };
    mouth();
    if (l.beard === 1) p(side ? 3 : 6, 12 + H, side ? 3 : 4, 1, c.hc);
    if (l.beard === 2) p(side ? 3 : 7, 13 + H, 2, 2, c.hc);
    if (l.beard === 3) {
      if (side) p(3, 11 + H, 6, 4, c.hc); else { p(3, 10 + H, 1, 3, c.hc); p(12, 10 + H, 1, 3, c.hc); p(4, 12 + H, 8, 3, c.hc); }
      p(mx, 12 + H, 2, 1, c.mouth);
    }
    if (l.beard === 4) for (let x = 4; x < (side ? 9 : 12); x++) p(x, 13 + ((x + H) % 2) + H, 1, 1, c.skinD);
  }

  // hair
  const hc = c.hc, top = () => { p(3, 3 + H, 10, 3, hc); p(4, 2 + H, 8, 1, hc); };
  const hs = l.hair;
  if (hs === 5) p(5, 3 + H, 6, 1, c.skin);
  else if (hs === 6) { p(5, 3 + H, 6, 1, c.skin); side ? p(4, 1 + H, 8, 2, hc) : back ? p(7, 1 + H, 2, 10, hc) : p(7, 1 + H, 2, 5, hc); }
  else if (hs === 7) { p(2, 1 + H, 12, 5, hc); p(1, 3 + H, 14, 3, hc); back ? p(1, 6 + H, 14, 6, hc) : side ? p(7, 6 + H, 7, 6, hc) : (p(2, 6 + H, 1, 4, hc), p(13, 6 + H, 1, 4, hc)); }
  else if (back) {
    if (hs === 2 || hs === 3) p(2, 3 + H, 12, hs === 2 ? 13 : 10, hc); else { top(); p(3, 6 + H, 10, 7, hc); }
    if (hs === 1) for (const x of [4, 7, 10]) p(x, 1 + H, 2, 1, hc);
    if (hs === 4) p(7, 13 + H, 2, 5, hc);
    if (hs === 8) p(6, 1 + H, 4, 2, hc);
  } else if (side) {
    top(); p(hs === 3 ? 7 : 8, 6 + H, hs === 3 ? 6 : 5, 7, hc); p(3, 6 + H, hs === 3 ? 4 : 3, 1, hc);
    if (hs === 1) for (const x of [5, 8, 11]) p(x, 1 + H, 1, 1, hc);
    if (hs === 2) p(9, 6 + H, 4, 10, hc);
    if (hs === 4) p(13, 6 + H, 2, 5, hc);
    if (hs === 8) p(10, 1 + H, 3, 2, hc);
    if (hs === 9) p(2, 6 + H, 4, 2, hc);
  } else {
    if (hs === 3) { p(2, 3 + H, 12, 3, hc); p(2, 6 + H, 2, 6, hc); p(12, 6 + H, 2, 6, hc); p(4, 6 + H, 8, 1, hc); }
    else { top(); p(3, 6 + H, 1, 3, hc); p(12, 6 + H, 1, 3, hc); p(4, 6 + H, 3, 1, hc); }
    if (hs === 1) for (const x of [4, 7, 10]) p(x, 1 + H, 1, 1, hc);
    if (hs === 2) { p(2, 6 + H, 2, 10, hc); p(12, 6 + H, 2, 10, hc); }
    if (hs === 4) p(13, 5 + H, 1, 3, hc);
    if (hs === 8) p(6, 1 + H, 4, 2, hc);
    if (hs === 9) { p(3, 6 + H, 6, 1, hc); p(3, 7 + H, 3, 1, hc); }
  }

  // accessory
  const a = l.acc, ac = c.acc, ad = c.accD;
  if (a === 1 || a === 2) {
    const lens = a === 1 ? LENS : BLACK, fr = a === 1 ? FRAME : BLACK;
    if (side) { p(3, 9 + H, 2, 2, lens); p(3, 8 + H, 6, 1, fr); if (a === 1) p(4, 9 + H, 1, 2, DARK); }
    else if (!back) {
      p(4, 9 + H, 3, 2, lens); p(9, 9 + H, 3, 2, lens); p(4, 8 + H, 8, 1, fr); p(7, 9 + H, 2, 1, fr);
      if (a === 1) { p(5, 9 + H, 1, 2, DARK); p(10, 9 + H, 1, 2, DARK); } else p(4, 9 + H, 1, 1, '#555');
    }
  }
  if (a === 3) { p(3, 2 + H, 10, 4, ac); side ? p(1, 5 + H, 4, 1, ad) : back ? p(6, 5 + H, 4, 1, ad) : p(3, 5 + H, 10, 1, ad); p(7, 1 + H, 2, 1, ad); }
  if (a === 4) { p(4, 2 + H, 8, 3, '#e2c46a'); p(4, 4 + H, 8, 1, '#b5462f'); p(1, 5 + H, 14, 1, '#c9a84c'); }
  if (a === 5) { p(3, 2 + H, 10, 4, ac); p(3, 5 + H, 10, 1, ad); p(7, 1 + H, 2, 1, '#f5f0e6'); }
  if (a === 6) { const x = side ? 9 : back ? 3 : 11; p(x, 3 + H, 2, 2, PINK); p(x, 3 + H, 1, 1, '#f4e04d'); }
  if (a === 7) { if (side) { p(9, 2 + H, 1, 6, '#333'); p(8, 8 + H, 3, 3, '#333'); } else { p(3, 2 + H, 10, 1, '#333'); p(2, 8 + H, 2, 3, '#333'); p(12, 8 + H, 2, 3, '#333'); } }
  if (a === 8) side ? p(9, 11 + H, 1, 1, GOLD) : (p(2, 11 + H, 1, 1, GOLD), p(13, 11 + H, 1, 1, GOLD));
  if (a === 9) p(3, 5 + H, 10, 1, ac);
  if (a === 10) { const x = side ? 9 : back ? 3 : 10; p(x, 2 + H, 3, 2, ac); p(x + 1, 2 + H, 1, 2, ad); }
}

const frames = new Map<string, HTMLCanvasElement>();
/** Cached, outlined 16x28 sprite. dir: 0 down, 1 left, 2 right, 3 up. step: 0 idle, 1/2 walk. */
export function charFrame(l: Look, dir: number, step: number) {
  const key = lookToArr(l).join() + '|' + dir + step;
  let c = frames.get(key);
  if (!c) {
    const [f, g] = canvas(16, 28);
    drawFrame((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }, l, dir === 2 ? 1 : dir, step);
    outline(f);
    if (dir === 2) { [c] = canvas(16, 28); const m = c.getContext('2d')!; m.scale(-1, 1); m.drawImage(f, -16, 0); }
    else c = f;
    frames.set(key, c);
  }
  return c;
}

/** Feet at (fx, fy) in screen px. */
export function drawChar(g: CanvasRenderingContext2D, fx: number, fy: number, S: number, l: Look, dir: number, step: number) {
  g.fillStyle = 'rgba(0,0,0,.2)';
  g.fillRect(fx - 5 * S, fy - 2 * S, 10 * S, 2 * S); g.fillRect(fx - 4 * S, fy - 3 * S, 8 * S, 4 * S);
  g.drawImage(charFrame(l, dir, step), Math.round(fx - 8 * S), Math.round(fy - 27 * S), 16 * S, 28 * S);
}
