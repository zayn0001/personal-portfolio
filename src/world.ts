import type { Project } from './projects';
import { canvas, hash, outline, rng, shade } from './sprites';

export const T = 16; // tile size in art pixels
const GRASS = 0, PATH = 1, WATER = 2;
const ROOFS = ['#c0504d', '#4f7fc0', '#5f9e54', '#a05cc0', '#d08a3a', '#3a9a9a'];
const WALLS = ['#b07a4a', '#d8c6a0', '#9c6b4e', '#c9a77a'];

export interface Building {
  project: Project;
  tx: number; // left tile column
  img: HTMLCanvasElement;
  door: { x: number; y: number };
  sign: { x: number; y: number };
}
/** Anything y-sorted with the characters: drawn bottom-centre at (x, y). */
export interface Prop { img: HTMLCanvasElement; x: number; y: number }

type Px = (col: string, x: number, y: number, w?: number, h?: number) => void;
function sprite(w: number, h: number, draw: (f: Px, g: CanvasRenderingContext2D) => void, lined = true) {
  const [c, g] = canvas(w, h);
  draw((col, x, y, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }, g);
  return lined ? outline(c) : c;
}
function ellipse(f: Px, cx: number, cy: number, rx: number, ry: number, col: string) {
  for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2)); f(col, cx - w, cy + y, w * 2, 1); }
}

const oak = () => sprite(48, 64, f => {
  f('#7a4b2a', 20, 40, 8, 22); f('#5c371d', 20, 40, 2, 22); f('#5c371d', 17, 59, 4, 3); f('#5c371d', 27, 59, 4, 3); f('#956039', 25, 42, 1, 16);
  ellipse(f, 24, 25, 21, 19, '#2e6b2e');
  ellipse(f, 18, 22, 14, 13, '#3d8a37'); ellipse(f, 31, 24, 12, 12, '#3d8a37');
  ellipse(f, 21, 15, 11, 8, '#56a845'); ellipse(f, 31, 16, 6, 5, '#56a845');
  ellipse(f, 17, 11, 3, 2, '#7cc45a'); ellipse(f, 28, 13, 2, 2, '#7cc45a');
  ellipse(f, 13, 33, 4, 3, '#24572a'); ellipse(f, 33, 35, 5, 3, '#24572a'); ellipse(f, 24, 38, 6, 2, '#24572a');
});
const pine = () => sprite(32, 60, f => {
  f('#6b4226', 14, 48, 5, 10); f('#4f2f1a', 14, 48, 1, 10);
  for (const [top, h, hw] of [[30, 20, 15], [16, 20, 12], [2, 18, 8]]) for (let y = 0; y < h; y++) {
    const w = Math.round(2 + (hw - 2) * (y / h));
    f('#2f6b3a', 16 - w, top + y, w * 2, 1); f('#3f8a4a', 16 - w, top + y, w, 1); f('#5aa860', 16 - w, top + y, Math.max(1, w / 3 | 0), 1);
  }
});
const bush = (berries: boolean) => sprite(26, 20, f => {
  ellipse(f, 13, 11, 12, 8, '#2e6b2e'); ellipse(f, 11, 9, 8, 6, '#3d8a37'); ellipse(f, 9, 7, 4, 3, '#56a845');
  if (berries) for (const [x, y] of [[6, 11], [12, 7], [17, 12], [19, 8], [10, 14]]) f('#d9534f', x, y, 2, 2);
});
const fence = () => sprite(16, 20, f => {
  f('#c08a50', 0, 7, 16, 2); f('#c08a50', 0, 12, 16, 2); f('#9c6b3a', 0, 9, 16, 1); f('#9c6b3a', 0, 14, 16, 1);
  f('#a8743f', 6, 3, 4, 15); f('#d4a066', 6, 3, 4, 1); f('#8a5a30', 9, 4, 1, 14);
});
const lamp = () => sprite(16, 40, f => {
  f('#3a3a3a', 7, 10, 2, 26); f('#2a2a2a', 5, 35, 6, 3);
  f('#2a2a2a', 4, 3, 8, 8); f('#ffe79a', 5, 4, 6, 6); f('#fff6d0', 6, 5, 2, 2); f('#2a2a2a', 3, 2, 10, 2); f('#2a2a2a', 7, 1, 2, 1);
});
const mailbox = (col: string) => sprite(16, 24, f => {
  f('#6b4226', 7, 12, 2, 11); f(col, 3, 5, 10, 7); f(col, 4, 4, 8, 1); f(shade(col, -0.25), 3, 10, 10, 2); f(DARKWOOD, 4, 7, 1, 3);
  f('#d9534f', 12, 2, 1, 6); f('#d9534f', 13, 2, 2, 2);
});
const DARKWOOD = '#4a2c14';
const signpost = () => sprite(18, 24, f => {
  f('#7a4b2a', 8, 11, 3, 12); f('#5c371d', 8, 11, 1, 12);
  f('#a8743f', 1, 2, 16, 10); f('#c08a50', 1, 2, 16, 1); f('#8a5a30', 1, 11, 16, 1);
  for (const [y, w] of [[4, 11], [6, 13], [8, 9]]) f('#6b4226', 3, y, w, 1);
  f('#e8c35a', 2, 3, 1, 1); f('#e8c35a', 15, 3, 1, 1);
});
const tuft = (v: number) => sprite(12, 10, f => {
  f('#3f7d2a', 2, 5, 8, 4); f('#4e8f32', 1, 6, 10, 2);
  for (const [x, h] of [[2, 3], [4, 5], [6, 4], [8, 5], [9, 3]].slice(v)) { f('#5a9c38', x, 8 - h, 2, h); f('#8fcf5a', x, 8 - h, 1, 1); }
});
const rock = () => sprite(9, 7, f => { f('#9a9a9a', 1, 2, 7, 4); f('#b5b5b5', 2, 1, 4, 2); f('#7a7a7a', 2, 5, 6, 1); });
const lily = () => sprite(9, 6, f => { f('#4e9f3d', 1, 1, 7, 4); f('#6cbf55', 2, 1, 3, 1); f('#3d8fd1', 4, 1, 1, 2); f('#f4a0c0', 5, 3, 2, 1); });

const pick = <X>(r: () => number, a: X[]) => a[r() * a.length | 0];
const DOORS = ['#7a4a26', '#4f7fc0', '#b5462f', '#2e8b57', '#6a6a6a', '#8e44ad', '#d08a3a'];
const TRIMS = ['#4f7fc0', '#2e8b57', '#b5462f', '#f5f0e6', '#3a3a3a', '#d08a3a'];
const FLOWERS = ['#f4e04d', '#e85d75', '#ffffff', '#b48ef0', '#f39c4a'];

/**
 * 120x112 house, drawn at (tx*T - 4, 7*T - 16). Walls cover tile rows 10-12, door at column tx+3.
 * Footprint is fixed (collision/paths depend on it); everything inside is picked by `r`.
 */
function house(r: () => number, roof: string) {
  const material = r() * 4 | 0;                  // planks, vertical boards, brick, plaster + timber
  const wall = material === 2 ? pick(r, ['#b5553c', '#a0503a', '#9a6a52']) : material === 3 ? pick(r, ['#efe3c8', '#e8d8b0', '#f2e6d8']) : pick(r, WALLS);
  const windowKind = r() * 3 | 0;                // square, round, arched
  const shutters = r() < 0.5 ? pick(r, TRIMS) : '', flowerbox = r() < 0.65, awning = r() < 0.4 ? pick(r, TRIMS) : '';
  const arched = r() < 0.4, doorCol = pick(r, DOORS), chimney = r() * 3 | 0, slope = pick(r, [0.3, 0.4, 0.55]);
  const lanternLeft = r() < 0.5, ivy = r() < 0.3, barrel = r() < 0.4;

  return sprite(120, 112, f => {
    const wd = shade(wall, -0.2), wl = shade(wall, 0.15), dark = DARKWOOD;
    // chimney (roof covers its base)
    if (chimney) { const cx = chimney === 1 ? 84 : 26; f('#8c4636', cx, 2, 10, 22); f('#5e2e24', cx - 2, 0, 14, 3); f('#a85a48', cx + 2, 4, 2, 8); }

    // walls
    f(wall, 4, 64, 112, 48);
    if (material === 0) for (let y = 68, i = 0; y < 106; y += 6, i++) {
      f(wd, 4, y, 112, 1); f(wl, 4, y + 1, 112, 1);
      for (let x = 4 + (i % 2 ? 10 : 22); x < 116; x += 24) f(wd, x, y - 6, 1, 6);
    }
    if (material === 1) for (let x = 9; x < 116; x += 6) { f(wd, x, 64, 1, 42); f(wl, x + 1, 64, 1, 42); }
    if (material === 2) for (let y = 64, i = 0; y < 104; y += 4, i++) {
      f('#d8c8b0', 4, y + 3, 112, 1);
      for (let x = 4 + (i % 2 ? 4 : 0); x < 116; x += 8) f('#d8c8b0', x, y, 1, 3);
    }
    if (material === 3) { for (const x of [7, 38, 80, 110]) f('#5b3a1e', x, 64, 3, 42); f('#5b3a1e', 4, 92, 112, 3); }
    f('#6b4226', 4, 64, 3, 48); f('#6b4226', 113, 64, 3, 48);
    if (ivy) for (let i = 0; i < 40; i++) { const y = 64 + (r() * 40 | 0), x = r() < 0.5 ? 5 + (r() * 9 | 0) : 106 + (r() * 9 | 0); f(r() < 0.5 ? '#3d8a37' : '#56a845', x, y, 2, 2); }

    // foundation
    f('#8f8f8f', 2, 104, 116, 8); f('#a9a9a9', 2, 104, 116, 1);
    for (let x = 4; x < 116; x += 10) { f('#6e6e6e', x, 104, 1, 8); f('#6e6e6e', x + 5, 108, 1, 4); }
    f('#6e6e6e', 2, 108, 116, 1);

    // door + step
    if (arched) { ellipse(f, 60, 82, 9, 5, dark); ellipse(f, 60, 83, 7, 4, doorCol); }
    f(dark, 51, 80, 18, 26); f(doorCol, 53, 82, 14, 24);
    if (arched) { ellipse(f, 60, 80, 9, 4, dark); ellipse(f, 60, 81, 7, 3, doorCol); }
    f(shade(doorCol, -0.15), 55, 86, 10, 7); f(shade(doorCol, -0.15), 55, 96, 10, 7); f('#e8c35a', 64, 94, 2, 2);
    f('#b5b5b5', 48, 106, 24, 6); f('#d0d0d0', 48, 106, 24, 1);
    if (awning) for (let x = 44; x < 76; x += 4) { f(x % 8 ? awning : '#f5f0e6', x, 72, 4, 6); f(x % 8 ? awning : '#f5f0e6', x + 1, 78, 2, 1); }

    // lantern on one side of the door, pot or barrel on the other
    const lx = lanternLeft ? 42 : 72, ox = lanternLeft ? 72 : 40;
    f('#2a2a2a', lx, 84, 6, 8); f('#ffe79a', lx + 1, 85, 4, 5); f('#2a2a2a', lx + 2, 81, 2, 3);
    if (barrel) { f('#8a5a30', ox, 94, 8, 11); f('#5b3a1e', ox, 96, 8, 1); f('#5b3a1e', ox, 102, 8, 1); f('#a8743f', ox + 1, 94, 6, 1); }
    else { f('#b5553c', ox + 1, 99, 6, 6); f('#8a3a28', ox, 98, 8, 2); ellipse(f, ox + 4, 95, 4, 3, '#3d8a37'); f(pick(r, FLOWERS), ox + 3, 93, 2, 2); }

    // windows
    for (const wx of [16, 88]) {
      const cx = wx + 8;
      if (shutters) for (const sx of [wx - 5, wx + 17]) { f(shutters, sx, 73, 4, 15); for (let y = 75; y < 87; y += 3) f(shade(shutters, -0.25), sx, y, 4, 1); }
      if (windowKind === 1) {
        ellipse(f, cx, 80, 8, 8, dark); ellipse(f, cx, 80, 6, 6, '#a7dcef'); f('#e6f7ff', cx - 4, 76, 3, 2);
        f(dark, cx - 1, 74, 2, 12); f(dark, cx - 6, 79, 12, 2);
      } else {
        if (windowKind === 2) { ellipse(f, cx, 75, 8, 4, dark); ellipse(f, cx, 76, 6, 3, '#a7dcef'); }
        f(dark, wx, 75, 16, 13); f('#a7dcef', wx + 2, 77, 12, 9); f('#e6f7ff', wx + 3, 78, 3, 2); f('#86c3db', wx + 2, 84, 12, 2);
        f(dark, wx + 7, windowKind === 2 ? 72 : 77, 2, windowKind === 2 ? 14 : 9); f(dark, wx + 2, 81, 12, 1);
      }
      if (flowerbox) {
        f('#6b4226', wx - 1, 88, 18, 4); f('#8a5a30', wx - 1, 88, 18, 1);
        for (let k = 0; k < 4; k++) { f('#4e8f32', wx + 1 + k * 4, 86, 2, 2); f(pick(r, FLOWERS), wx + 1 + k * 4, 85, 2, 1); }
      }
    }

    // roof: slanted sides, shingle rows with highlights, ridge, dark eave
    for (let y = 0; y < 58; y++) {
      const inset = Math.max(0, Math.round((36 - y) * slope)), row = y % 6;
      const col = y >= 54 ? shade(roof, -0.4) : row === 5 ? shade(roof, -0.25) : row === 0 ? shade(roof, 0.18) : (y / 6 | 0) % 2 ? roof : shade(roof, 0.06);
      f(col, inset, 12 + y, 120 - inset * 2, 1);
      if (y < 54 && row === 0) for (let x = (y / 6) % 2 ? 6 : 10; x < 116; x += 8)
        if (x > inset + 1 && x < 119 - inset) f(shade(roof, -0.25), x, 12 + y, 1, 5);
    }
    const top = Math.round(36 * slope);
    f(shade(roof, 0.35), top, 12, 120 - top * 2, 2);
  });
}

export function buildWorld(projects: Project[]) {
  const MW = Math.max(48, 10 + projects.length * 10), MH = 26;
  const tiles = new Uint8Array(MW * MH), solid = new Uint8Array(MW * MH);
  const at = (x: number, y: number) => y * MW + x;
  const r = rng(42);
  const props: Prop[] = [];
  const put = (img: HTMLCanvasElement, tx: number, ty: number, block = true, jitter = 0) => {
    props.push({ img, x: (tx + 0.5) * T + Math.round((r() - 0.5) * jitter), y: (ty + 1) * T });
    if (block) solid[at(tx, ty)] = 1;
  };

  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (x <= 0 || x >= MW - 1 || y <= 1 || y >= MH - 1) solid[at(x, y)] = 1;
  for (let x = 2; x < MW - 2; x++) tiles[at(x, 15)] = tiles[at(x, 16)] = PATH;
  const pcx = Math.floor(MW * 0.6);
  for (let y = 17; y < MH - 1; y++) for (let x = 2; x < MW - 2; x++)
    if (((x + 0.5 - pcx) / 4.5) ** 2 + ((y + 0.5 - 19.5) / 2.2) ** 2 < 1) { tiles[at(x, y)] = WATER; solid[at(x, y)] = 1; }

  // houses, each with a signpost, mailbox and a lamp to its right
  const lampImg = lamp(), fenceImg = fence(), signImg = signpost();
  const buildings: Building[] = projects.map((project, i) => {
    const tx = 6 + i * 10, h = hash(project.title);
    const roof = ROOFS[h % ROOFS.length];
    for (let y = 8; y <= 12; y++) for (let x = tx; x < tx + 7; x++) solid[at(x, y)] = 1;
    tiles[at(tx + 3, 13)] = tiles[at(tx + 3, 14)] = PATH;
    put(signImg, tx + 5, 13);
    put(mailbox(roof), tx + 1, 13);
    put(lampImg, tx + 8, 14);
    return {
      project, tx, img: house(rng(h), roof),
      door: { x: (tx + 3.5) * T, y: 13.9 * T },
      sign: { x: (tx + 5.5) * T, y: 14 * T },
    };
  });

  // fences: south edge of the path in runs, north edge between houses
  for (let x = 3; x < MW - 3; x++) if (tiles[at(x, 17)] === GRASS && (x * 7) % 11 < 7) put(fenceImg, x, 17);
  for (let x = 3; x < MW - 3; x++) if (!buildings.some(b => x >= b.tx - 1 && x <= b.tx + 8) && x > 4) put(fenceImg, x, 14);

  // trees: dense border, scattered inside
  const trees = [oak(), oak(), pine()], bushes = [bush(false), bush(true)];
  const tree = (x: number, y: number) => {
    if (x < 0 || x >= MW || y < 0 || y >= MH || tiles[at(x, y)] !== GRASS || (solid[at(x, y)] && y > 1 && y < MH - 1 && x > 0 && x < MW - 1)) return;
    put(trees[r() * 3 | 0], x, y, true, 6);
  };
  for (let x = 0; x < MW; x += 2) { tree(x, 1); tree(x + 1, 2); tree(x, MH - 1); tree(x + 1, MH - 2); }
  for (let y = 3; y < MH - 2; y += 2) { tree(0, y); tree(1, y + 1); tree(MW - 1, y); tree(MW - 2, y + 1); }
  const clear = (x: number, y: number, d: number) => !props.some(p => Math.hypot(p.x - (x + 0.5) * T, p.y - (y + 1) * T) < d * T);
  for (const y of [3, 4, 5, 6, 18, 19, 20, 21, 22, 23]) for (let x = 3; x < MW - 3; x++) {
    if (solid[at(x, y)] || tiles[at(x, y)] !== GRASS) continue;
    const roll = r();
    if (roll < 0.09 && clear(x, y, 2.5)) tree(x, y);
    else if (roll < 0.14 && clear(x, y, 1.5)) put(bushes[r() * 2 | 0], x, y);
  }

  // ground layer, pre-rendered once
  const [ground, g] = canvas(MW * T, MH * T);
  const kind = (x: number, y: number) => (x < 0 || y < 0 || x >= MW || y >= MH ? GRASS : tiles[at(x, y)]);
  const dot = (col: string, x: number, y: number, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const k = kind(x, y), px = x * T, py = y * T;
    if (k === GRASS) {
      dot(['#6cab3c', '#69a83a', '#70af40'][(x * 3 + y * 5) % 3], px, py, T, T);
      for (let i = 0; i < 6; i++) {
        const bx = px + (r() * 15 | 0), by = py + (r() * 13 | 0);
        dot('#56933a', bx, by + 1, 1, 2); if (r() < 0.5) dot('#56933a', bx + 1, by, 1, 2);
        if (r() < 0.3) dot('#8fcf5a', bx, by, 1, 1);
      }
    } else if (k === PATH) {
      dot('#d6a86a', px, py, T, T);
      for (let i = 0; i < 7; i++) dot(['#b98a4f', '#e6c08a', '#c49660'][r() * 3 | 0], px + (r() * 15 | 0), py + (r() * 15 | 0), r() < 0.3 ? 2 : 1, 1);
    } else {
      dot('#4a9fe0', px, py, T, T);
      if (r() < 0.6) dot('#8ccaf5', px + (r() * 11 | 0), py + (r() * 14 | 0), 4, 1);
    }
    // grassy overhang onto paths, sandy bank around water
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      if (kind(x + dx, y + dy) !== GRASS || k === GRASS) continue;
      for (let i = 0; i < T; i++) {
        const d = k === WATER ? 3 : r() * 3 | 0;
        const paint = (col: string, n: number) => {
          if (dy === -1) dot(col, px + i, py, 1, n); if (dy === 1) dot(col, px + i, py + T - n, 1, n);
          if (dx === -1) dot(col, px, py + i, n, 1); if (dx === 1) dot(col, px + T - n, py + i, n, 1);
        };
        if (k === WATER) { paint('#2f7cbf', d + 1); paint('#d9bf86', d); paint('#b89a62', 1); }
        else paint('#6cab3c', d);
      }
    }
  }
  // flat decorations baked into the ground
  const tufts = [tuft(0), tuft(1), tuft(2)], rockImg = rock(), lilyImg = lily();
  for (let y = 2; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const k = tiles[at(x, y)], px = x * T, py = y * T;
    if (k === WATER) { if (r() < 0.12) g.drawImage(lilyImg, px + (r() * 6 | 0), py + (r() * 9 | 0)); continue; }
    if (k !== GRASS || solid[at(x, y)]) continue;
    const roll = r();
    if (roll < 0.05) for (let i = 0; i < 3; i++) {
      const fx = px + 2 + (r() * 11 | 0), fy = py + 2 + (r() * 11 | 0), col = ['#f4e04d', '#e85d75', '#ffffff', '#b48ef0'][r() * 4 | 0];
      dot('#4e8f32', fx, fy + 2, 1, 2); dot(col, fx - 1, fy, 3, 2); dot('#fff6c0', fx, fy, 1, 1);
    }
    else if (roll < 0.12) g.drawImage(tufts[r() * 3 | 0], px + (r() * 6 | 0), py + (r() * 7 | 0));
    else if (roll < 0.135) g.drawImage(rockImg, px + (r() * 7 | 0), py + (r() * 9 | 0));
  }

  // minimap, 3px per tile
  const [mini, m] = canvas(MW * 3, MH * 3);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { m.fillStyle = ['#6cab3c', '#d6a86a', '#4a9fe0'][tiles[at(x, y)]]; m.fillRect(x * 3, y * 3, 3, 3); }
  m.fillStyle = '#2e6b2e';
  for (const p of props) if (p.img.height > 40) m.fillRect(Math.floor(p.x / T) * 3 - 1, (p.y / T - 1) * 3 - 1, 5, 5);
  for (const b of buildings) { m.fillStyle = ROOFS[hash(b.project.title) % ROOFS.length]; m.fillRect(b.tx * 3, 8 * 3, 21, 15); }

  return {
    MW, MH, ground, mini, props, buildings,
    isSolid: (px: number, py: number) => {
      const x = Math.floor(px / T), y = Math.floor(py / T);
      return x < 0 || y < 0 || x >= MW || y >= MH || !!solid[at(x, y)];
    },
  };
}
