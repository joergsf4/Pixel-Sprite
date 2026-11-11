// Büroobjekte als Beispiel: Katalog aus Grundformen, Rendern je Objekt, Sprite-Sheet.

import { IDENT, rotY, rotZ, mmul, mv, capsule, ellipsoid } from './rig.js';
import { scene, hit } from './render.js';

export const VIEW = { w: 320, h: 200, cx: 160, cy: 78, f: 380 };
export const EYE = [0, 70, 420];
const LIGHT = (() => { const l = [-0.4, 0.75, 0.5], n = Math.hypot(...l); return l.map((v) => v / n); })();
const BAND_LIGHT = 0.6, BAND_DARK = 0.0;

// --- Materialien: [dunkel, mittel, hell] -------------------------------------

export const MATERIALS = {
  wood: ['#6b4226', '#96623a', '#c08a52'],
  woodLight: ['#96623a', '#b98350', '#dcae78'],
  woodDark: ['#3f2a1c', '#5c3d28', '#7d573a'],
  metal: ['#59616e', '#8791a0', '#b4bdc8'],
  metalDark: ['#2e333c', '#454c58', '#5f6877'],
  black: ['#16161d', '#2a2a35', '#44444f'],
  screen: ['#1d3b4a', '#3f9aa0', '#8fe0d4'],
  fabric: ['#7a2f2f', '#b04a3f', '#d4705a'],
  pot: ['#7d3f26', '#b0603a', '#d08a58'],
  leaf: ['#1f4d2b', '#2f7a3a', '#58a84a'],
  cactus: ['#2a5a3a', '#3f8a52', '#74bc6c'],
  paper: ['#9aa0a8', '#d0d4d8', '#f2f2ee'],
  water: ['#3a6ea0', '#5fa0d0', '#a8dcf0'],
  glass: ['#4a7fb0', '#7fb4dc', '#c4e4f4'],
  brass: ['#a07a2a', '#e0b84a', '#f8e89a'],
  rug: ['#5a2440', '#8a3c5e', '#b05c80'],
  rugIn: ['#8a6a3a', '#c09a58', '#dcc088'],
  bookR: ['#7a2430', '#b0343c', '#d05a54'],
  bookB: ['#27406e', '#3c62a0', '#6088c4'],
  bookG: ['#2f5a34', '#4a8a4a', '#74b068'],
  bookY: ['#a07a2a', '#d4a83c', '#ecd070'],
  cardboard: ['#8a6a42', '#b89060', '#d8b888'],
};
const MAT_NAMES = Object.keys(MATERIALS);
const MAT = Object.fromEntries(MAT_NAMES.map((n, i) => [n, i]));
const pack = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
};
const MAT_RGB = MAT_NAMES.map((n) => MATERIALS[n].map(pack));

// --- Katalog -----------------------------------------------------------------
// Formen in lokalen Koordinaten: Ursprung am Boden in der Mitte, +Z ist die Vorderseite.

const box = (c, h, mat, o = {}) => ({ k: 'box', c, h, mat, ...o });
const cyl = (c, R, hh, mat, o = {}) => ({ k: 'cyl', c, R, hh, mat, ...o });
const ell = (c, r, mat, o = {}) => ({ k: 'ell', c, r, mat, ...o });
const cap = (a, b, ra, rb, mat, o = {}) => ({ k: 'cap', a, b, ra, rb, mat, ...o });

function books() {
  const out = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const mats = ['bookR', 'bookB', 'bookG', 'bookY', 'paper', 'bookB', 'bookR'];
  for (const y0 of [1.8, 13.3, 24.8, 36.3]) {
    let x = -10.4;
    while (x < 8.5) {
      const w = 1.2 + rnd() * 1.6, h = 3.2 + rnd() * 1.4;
      if (rnd() < 0.82) out.push(box([x + w, y0 + h, -0.2], [w, h, 2.8], mats[Math.floor(rnd() * mats.length)], { r: 0.1 }));
      x += w * 2 + 0.15;
    }
  }
  return out;
}

function leaves() {
  const out = [];
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4, tier = i % 2, tilt = 0.45 + 0.4 * tier, L = 6.2 - tier * 1.2;
    const c = [Math.cos(a) * L * Math.cos(tilt) * 0.9, 17 + L * Math.sin(tilt) * 0.9 + tier * 3.5, Math.sin(a) * L * Math.cos(tilt) * 0.9];
    out.push(ell(c, [L, 0.95, 2.3], 'leaf', { m: mmul(rotY(-a), rotZ(tilt)) }));
  }
  out.push(ell([0, 25, 0], [2.4, 3.6, 2.4], 'leaf'));
  return out;
}

export const CATALOG = {
  desk: {
    label: 'Schreibtisch', group: 'Möbel', top: { y: 19, hx: 20, hz: 10 },
    prims: [
      box([0, 18, 0], [20, 1, 10], 'woodLight'),
      box([-13, 8.5, 0], [6, 8.5, 9], 'wood'),
      box([18, 8.5, 0], [1, 8.5, 9], 'wood'),
      box([3, 11, -8.5], [15, 6, 0.5], 'woodDark'),
      box([-13, 11.4, 9.05], [5.6, 0.3, 0.25], 'woodDark', { r: 0 }),
      box([-13, 5.8, 9.05], [5.6, 0.3, 0.25], 'woodDark', { r: 0 }),
      box([-13, 14.2, 9.4], [1.6, 0.45, 0.4], 'brass', { r: 0.1 }),
      box([-13, 8.6, 9.4], [1.6, 0.45, 0.4], 'brass', { r: 0.1 }),
      box([-13, 3.0, 9.4], [1.6, 0.45, 0.4], 'brass', { r: 0.1 }),
    ],
  },
  chair: {
    label: 'Bürostuhl', group: 'Möbel', round: true,
    prims: [
      cyl([0, 1.0, 0], 5.2, 0.8, 'black'),
      cyl([0, 5.5, 0], 1.0, 4.5, 'metalDark'),
      box([0, 11, 0], [5, 1.3, 5], 'fabric', { r: 1 }),
      box([0, 19.5, -4.6], [5, 5.5, 1.1], 'fabric', { r: 1 }),
      box([0, 13.5, -4.6], [0.9, 2, 0.6], 'metalDark'),
    ],
  },
  cabinet: {
    label: 'Aktenschrank', group: 'Möbel', top: { y: 34, hx: 9, hz: 6 },
    prims: [
      box([0, 17, 0], [9, 17, 6], 'metal'),
      box([0, 11.5, 6.05], [8.4, 0.3, 0.25], 'metalDark', { r: 0 }),
      box([0, 22.5, 6.05], [8.4, 0.3, 0.25], 'metalDark', { r: 0 }),
      box([0, 6.5, 6.4], [2.6, 0.6, 0.4], 'metalDark', { r: 0.1 }),
      box([0, 17.5, 6.4], [2.6, 0.6, 0.4], 'metalDark', { r: 0.1 }),
      box([0, 28.5, 6.4], [2.6, 0.6, 0.4], 'metalDark', { r: 0.1 }),
    ],
  },
  shelf: {
    label: 'Bücherregal', group: 'Möbel', top: { y: 48, hx: 12, hz: 4 },
    prims: [
      box([0, 24, -3.5], [12, 24, 0.5], 'woodDark'),
      box([-11.2, 24, 0], [0.8, 24, 4], 'wood'),
      box([11.2, 24, 0], [0.8, 24, 4], 'wood'),
      ...[0.9, 12.4, 23.9, 35.4, 47.1].map((y) => box([0, y, 0], [12, 0.9, 4], 'woodLight')),
      ...books(),
    ],
  },
  cooler: {
    label: 'Wasserspender', group: 'Möbel',
    prims: [
      box([0, 11, 0], [4.5, 11, 4.5], 'paper', { r: 0.6 }),
      box([0, 15, 4.5], [3.2, 2.6, 0.3], 'metalDark', { r: 0 }),
      box([-1.4, 16.4, 5], [0.6, 0.6, 0.5], 'bookB', { r: 0.1 }),
      box([1.4, 16.4, 5], [0.6, 0.6, 0.5], 'bookR', { r: 0.1 }),
      cyl([0, 27, 0], 3.8, 5, 'water', { r: 1 }),
      cyl([0, 22.6, 0], 2, 0.8, 'water'),
    ],
  },
  carton: {
    label: 'Umzugskarton', group: 'Möbel', top: { y: 10, hx: 6, hz: 5 }, stack: true,
    prims: [box([0, 5, 0], [6, 5, 5], 'cardboard'), box([0, 9.95, 0], [1, 0.15, 5.05], 'paper', { r: 0 }), box([0, 7.5, 5], [1, 2.5, 0.12], 'paper', { r: 0 })],
  },
  rug: {
    label: 'Teppich', group: 'Möbel', shadow: false,
    prims: [box([0, 0.25, 0], [28, 0.25, 15], 'rug', { r: 0 }), box([0, 0.4, 0], [24, 0.2, 11], 'rugIn', { r: 0 }), box([0, 0.5, 0], [21, 0.2, 8], 'rug', { r: 0 })],
  },
  floorlamp: {
    label: 'Stehlampe', group: 'Möbel', round: true,
    prims: [cyl([0, 0.7, 0], 4, 0.7, 'metalDark'), cap([0, 1, 0], [0, 35, 0], 0.6, 0.6, 'metalDark'), cyl([0, 39, 0], 5, 4, 'brass', { r: 0.6 })],
  },
  monitor: {
    label: 'Monitor', group: 'Gegenstände', stack: true,
    prims: [
      box([0, 0.4, 0], [3, 0.4, 2], 'black'),
      box([0, 2.5, -0.6], [0.8, 2, 0.5], 'black'),
      box([0, 8, 0], [6.5, 4.5, 0.8], 'black', { r: 0.4 }),
      box([0, 8, 0.75], [5.6, 3.6, 0.25], 'screen', { r: 0 }),
    ],
  },
  printer: {
    label: 'Drucker', group: 'Gegenstände', stack: true, top: { y: 6.5, hx: 5.5, hz: 4.5 },
    prims: [
      box([0, 3, 0], [5.5, 3, 4.5], 'paper', { r: 0.5 }),
      box([0, 6.1, -0.6], [4.4, 0.3, 3], 'metalDark', { r: 0 }),
      box([0, 2.2, 4.5], [3.6, 0.5, 0.3], 'metalDark', { r: 0 }),
      box([0, 2.5, 5.4], [3, 0.15, 1.2], 'paper', { r: 0 }),
    ],
  },
  desklamp: {
    label: 'Schreibtischlampe', group: 'Gegenstände', stack: true, round: true,
    prims: [
      cyl([0, 0.5, 0], 2.4, 0.5, 'black'),
      cap([0, 1, 0], [-2, 7.5, 0], 0.5, 0.5, 'metalDark'),
      cap([-2, 7.5, 0], [1.5, 9.6, 0], 0.5, 0.5, 'metalDark'),
      ell([2.6, 9, 0], [2.6, 1.8, 2.6], 'brass'),
    ],
  },
  bin: {
    label: 'Papierkorb', group: 'Gegenstände', round: true, stack: true,
    prims: [cyl([0, 3.5, 0], 3.2, 3.5, 'metalDark'), ell([0.6, 7, 0.3], [2, 1.3, 1.8], 'paper'), ell([-1, 6.8, -0.6], [1.5, 1.2, 1.4], 'paper')],
  },
  papers: {
    label: 'Papierstapel', group: 'Gegenstände', stack: true, top: { y: 2, hx: 3, hz: 4 },
    prims: [box([0, 0.8, 0], [3, 0.8, 4], 'paper', { r: 0.1 }), box([0.4, 1.8, 0.3], [3, 0.25, 4], 'paper', { r: 0, yaw: 0.25 })],
  },
  plant: {
    label: 'Zimmerpflanze', group: 'Pflanzen', round: true,
    prims: [cyl([0, 4, 0], 4, 4, 'pot', { r: 0.5 }), cap([0, 8, 0], [0, 19, 0], 0.9, 0.7, 'woodDark'), ...leaves()],
  },
  ficus: {
    label: 'Bäumchen', group: 'Pflanzen', round: true,
    prims: [
      cyl([0, 3.5, 0], 4.5, 3.5, 'paper', { r: 0.5 }),
      cap([0, 7, 0], [0.5, 24, 0], 0.9, 0.7, 'woodDark'),
      ell([0, 30, 0], [7, 6.5, 7], 'leaf', { g: 9 }),
      ell([-5, 26, 2], [4.5, 4, 4.5], 'leaf', { g: 9 }),
      ell([5, 27, -1], [4.5, 4.5, 4.5], 'leaf', { g: 9 }),
      ell([1, 36, 1], [4.5, 4, 4.5], 'leaf', { g: 9 }),
    ],
  },
  cactus: {
    label: 'Kaktus', group: 'Pflanzen', round: true, stack: true,
    prims: [
      cyl([0, 2, 0], 2.6, 2, 'pot', { r: 0.3 }),
      cap([0, 4, 0], [0, 10, 0], 1.8, 1.6, 'cactus', { g: 9 }),
      cap([1.6, 6, 0], [3.6, 6.4, 0], 0.9, 0.9, 'cactus', { g: 9 }),
      cap([3.6, 6.4, 0], [3.7, 9, 0], 0.9, 0.8, 'cactus', { g: 9 }),
    ],
  },
  door: {
    label: 'Tür', group: 'Wand', wall: true, shadow: false,
    prims: [
      box([0, 26, 0.5], [12.5, 26, 0.6], 'woodDark', { r: 0 }),
      box([0, 25, 0.9], [10.5, 25, 0.5], 'wood', { r: 0 }),
      box([0, 37, 1.35], [7.5, 10, 0.15], 'woodLight', { r: 0 }),
      box([0, 12.5, 1.35], [7.5, 9.5, 0.15], 'woodLight', { r: 0 }),
      ell([8.6, 24.5, 1.9], [0.9, 0.9, 0.8], 'brass'),
    ],
  },
  window: {
    label: 'Fenster', group: 'Wand', wall: true, shadow: false,
    prims: [
      box([0, 14, 0.5], [14, 14, 0.7], 'paper', { r: 0 }),
      box([0, 14, 0.9], [12.5, 12.5, 0.5], 'glass', { r: 0 }),
      box([0, 14, 1.3], [0.6, 12.5, 0.3], 'paper', { r: 0 }),
      box([0, 14, 1.3], [12.5, 0.6, 0.3], 'paper', { r: 0 }),
      box([0, -0.6, 1.6], [15.5, 0.7, 1.6], 'paper', { r: 0.2 }),
    ],
  },
  picture: {
    label: 'Bild', group: 'Wand', wall: true, shadow: false,
    prims: [
      box([0, 7, 0.4], [9, 7, 0.5], 'woodDark', { r: 0 }),
      box([0, 7, 0.7], [7.8, 5.8, 0.4], 'glass', { r: 0 }),
      box([0, 3.6, 0.8], [7.8, 2.4, 0.42], 'leaf', { r: 0 }),
      ell([3.4, 9.6, 1.1], [1.7, 1.7, 0.3], 'brass'),
    ],
  },
  board: {
    label: 'Pinnwand', group: 'Wand', wall: true, shadow: false,
    prims: [
      box([0, 9, 0.4], [13, 9, 0.5], 'woodLight', { r: 0 }),
      box([0, 9, 0.7], [12, 8, 0.4], 'cardboard', { r: 0 }),
      box([-6, 11, 1.1], [3, 3.6, 0.15], 'paper', { r: 0, }),
      box([2, 12, 1.1], [2.6, 2.2, 0.15], 'bookY', { r: 0 }),
      box([7, 6.5, 1.1], [3, 3.4, 0.15], 'paper', { r: 0 }),
      box([-3, 4.5, 1.1], [2.2, 1.8, 0.15], 'bookR', { r: 0 }),
    ],
  },
};
// Lokale Ausdehnung je Katalogeintrag.
for (const def of Object.values(CATALOG)) {
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  const grow = (p, r) => p.forEach((v, i) => { min[i] = Math.min(min[i], v - r[i]); max[i] = Math.max(max[i], v + r[i]); });
  for (const s of def.prims) {
    if (s.k === 'box') { const d = s.yaw ? Math.hypot(s.h[0], s.h[2]) : 0; grow(s.c, s.yaw ? [d, s.h[1], d] : s.h); }
    else if (s.k === 'cyl') grow(s.c, [s.R, s.hh, s.R]);
    else if (s.k === 'ell') { const m = s.m ? Math.max(...s.r) : 0; grow(s.c, s.m ? [m, m, m] : s.r); }
    else { const r = Math.max(s.ra, s.rb); grow(s.a, [r, r, r]); grow(s.b, [r, r, r]); }
  }
  def.min = min; def.max = max;
}

// --- Geometrie ---------------------------------------------------------------

const project = (p) => {
  const s = VIEW.f / (EYE[2] - p[2]);
  return { x: VIEW.cx + p[0] * s, y: VIEW.cy - (p[1] - EYE[1]) * s, s };
};
// Sehstrahl durch einen Bildpunkt, als Weg je Einheit Tiefe.
const rayAt = (px, py) => [(px - VIEW.cx) / VIEW.f, (VIEW.cy - py) / VIEW.f];
const toWorld = (o, M, p) => { const q = mv(M, p); return [q[0] + o.x, q[1] + o.y, q[2] + o.z]; };

function instantiate(def, o) {
  const a = (o.rot * Math.PI) / 180, M = rotY(a);
  const prims = def.prims.map((s, i) => {
    const part = s.g || i + 10, mat = MAT[s.mat];
    if (s.k === 'box') {
      const c = toWorld(o, M, s.c), r = s.r ?? 0.3, yaw = a + (s.yaw || 0);
      return { t: 2, cx: c[0], cy: c[1], cz: c[2], hx: Math.max(0.02, s.h[0] - r), hy: Math.max(0.02, s.h[1] - r), hz: Math.max(0.02, s.h[2] - r), r, c: Math.cos(yaw), s: Math.sin(yaw), mat, part };
    }
    if (s.k === 'cyl') {
      const c = toWorld(o, M, s.c), r = s.r ?? 0.25;
      return { t: 3, cx: c[0], cy: c[1], cz: c[2], R: s.R - r, hh: s.hh - r, r, mat, part };
    }
    if (s.k === 'ell') return ellipsoid(toWorld(o, M, s.c), s.m ? mmul(M, s.m) : M, s.r, mat, part);
    return capsule(toWorld(o, M, s.a), toWorld(o, M, s.b), s.ra, s.rb, mat, part);
  });
  prims.sort((p, q) => p.part - q.part);
  return prims;
}

// --- Rendern eines Objekts in eine eigene Ebene ---------------------------------

export function renderObject(o, n = 3) {
  const def = CATALOG[o.type];
  const prims = instantiate(def, o);
  const a = (o.rot * Math.PI) / 180;
  const lc = [0, 1, 2].map((i) => (def.min[i] + def.max[i]) / 2);
  const C = toWorld(o, rotY(a), lc);
  const R = Math.hypot(...[0, 1, 2].map((i) => (def.max[i] - def.min[i]) / 2)) + 0.5;
  const pc = project(C), rad = R * pc.s * 1.12 + 2;
  const x0 = Math.max(0, Math.floor(pc.x - rad)), x1 = Math.min(VIEW.w, Math.ceil(pc.x + rad));
  const y0 = Math.max(0, Math.floor(pc.y - rad)), y1 = Math.min(VIEW.h, Math.ceil(pc.y + rad));
  const w = Math.max(0, x1 - x0), h = Math.max(0, y1 - y0);
  const L = { x0, y0, w, h, mat: new Int16Array(w * h).fill(-1), band: new Uint8Array(w * h), part: new Uint8Array(w * h), depth: new Float32Array(w * h) };
  const ex = C[0] - EYE[0], ey = C[1] - EYE[1], ez = C[2] - EYE[2];
  const dC2 = ex * ex + ey * ey + ez * ez, dC = Math.sqrt(dC2);
  const keys = new Int32Array(n * n), deps = new Float32Array(n * n);
  const e = 0.05;
  for (let py = 0; py < h; py++)
    for (let px = 0; px < w; px++) {
      let hits = 0;
      for (let s = 0; s < n * n; s++) {
        const [rx, ry] = rayAt(x0 + px + ((s % n) + 0.5) / n, y0 + py + (Math.floor(s / n) + 0.5) / n);
        const il = 1 / Math.sqrt(rx * rx + ry * ry + 1);
        const dx = rx * il, dy = ry * il, dz = -il;
        const b = ex * dx + ey * dy + ez * dz;
        if (dC2 - b * b > R * R) continue;
        let t = Math.max(1, dC - R - 1), found = false;
        const tEnd = dC + R + 1;
        for (let i = 0; i < 90 && t < tEnd; i++) {
          const dist = scene(prims, EYE[0] + dx * t, EYE[1] + dy * t, EYE[2] + dz * t);
          if (dist < 0.04) { found = true; break; }
          t += dist * 0.8;
        }
        if (!found) continue;
        const x = EYE[0] + dx * t, y = EYE[1] + dy * t, z = EYE[2] + dz * t;
        const pr = hit.pr;
        const nx = scene(prims, x + e, y, z) - scene(prims, x - e, y, z);
        const ny = scene(prims, x, y + e, z) - scene(prims, x, y - e, z);
        const nz = scene(prims, x, y, z + e) - scene(prims, x, y, z - e);
        const I = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / (Math.hypot(nx, ny, nz) || 1);
        keys[hits] = pr.part * 4096 + pr.mat * 4 + (I > BAND_LIGHT ? 2 : I > BAND_DARK ? 1 : 0);
        deps[hits] = EYE[2] - z;
        hits++;
      }
      if (hits * 2 < n * n) continue;
      let bestKey = -1, bestCount = 0, bestDepth = 1e9;
      for (let i = 0; i < hits; i++) {
        let count = 0, dep = 1e9;
        for (let k = 0; k < hits; k++) if (keys[k] === keys[i]) { count++; if (deps[k] < dep) dep = deps[k]; }
        if (count > bestCount || (count === bestCount && dep < bestDepth)) { bestCount = count; bestKey = keys[i]; bestDepth = dep; }
      }
      const i = py * w + px;
      L.part[i] = (bestKey >> 12) & 255;
      L.mat[i] = (bestKey & 4095) >> 2;
      L.band[i] = bestKey & 3;
      L.depth[i] = bestDepth;
    }
  return L;
}

// --- Sprite-Sheet ----------------------------------------------------------------

// Rendert ein Objekt freigestellt: Pixel-Regeln anwenden, auf den belegten Bereich beschneiden.
function renderSprite(type, rot) {
  const o = { type, x: 0, y: 0, z: EYE[2] - VIEW.f, rot }; // in dieser Tiefe ist 1 Einheit = 1 Pixel
  const L = renderObject(o, 3);
  const { w, h } = L;
  const col = new Uint32Array(w * h);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (L.mat[i] < 0) continue;
      let b = L.band[i];
      const d = L.depth[i];
      const nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
      // Trennkante, wenn ein anderes Teil deutlich davor liegt
      for (const k of nb) if (k >= 0 && L.mat[k] >= 0 && L.part[k] !== L.part[i] && L.depth[k] < d - 1.5) { b = 0; break; }
      // Schattenkante rechts und unten am Umriss
      if (b > 0) for (const k of [nb[1], nb[3]]) if (k < 0 || L.mat[k] < 0) { b--; break; }
      col[i] = MAT_RGB[L.mat[i]][b];
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  const base = project([o.x, o.y, o.z]);
  return {
    w: x1 - x0 + 1, h: y1 - y0 + 1,
    anchor: { x: Math.round(base.x) - L.x0 - x0, y: Math.round(base.y) - L.y0 - y0 },
    get: (x, y) => col[(y0 + y) * w + x0 + x],
  };
}

// Alle Objekte von vorn und schräg, zeilenweise gepackt. Liefert RGBA-Bild und Beschreibung.
export function buildObjectSheet(maxW = 320) {
  const sprites = [];
  for (const [type, def] of Object.entries(CATALOG))
    for (const [suffix, rot] of def.wall ? [['', 0]] : [['', 0], ['_schraeg', 330]])
      sprites.push({ name: type + suffix, label: def.label, ...renderSprite(type, rot) });
  sprites.sort((a, b) => b.h - a.h);
  let x = 1, y = 1, rowH = 0;
  for (const s of sprites) {
    if (x + s.w + 1 > maxW) { x = 1; y += rowH + 1; rowH = 0; }
    s.x = x; s.y = y; x += s.w + 1; rowH = Math.max(rowH, s.h);
  }
  const W = maxW, H = y + rowH + 1;
  const px = new Uint32Array(W * H);
  const meta = { image: 'office.png', note: 'anchor = Standpunkt am Boden bzw. an der Wand, relativ zur linken oberen Ecke des Sprites.', sprites: {} };
  for (const s of sprites) {
    for (let yy = 0; yy < s.h; yy++) for (let xx = 0; xx < s.w; xx++) px[(s.y + yy) * W + s.x + xx] = s.get(xx, yy);
    meta.sprites[s.name] = { label: s.label, x: s.x, y: s.y, w: s.w, h: s.h, anchor: s.anchor };
  }
  return { w: W, h: H, data: new Uint8Array(px.buffer), meta };
}
