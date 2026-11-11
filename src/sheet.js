// Erzeugt alle Einzelbilder und setzt sie zum Sprite-Sheet zusammen (läuft in Node und im Browser).

import { buildPrims } from './rig.js';
import { camera, render } from './render.js';
import { buildPalette, finish } from './pixel.js';
import { walk, stand } from './anim.js';

export const VIEWS = { side: -Math.PI / 2, front: 0, back: Math.PI };

export function renderFrame(ch, pal, pose, view, opts = {}) {
  const cam = camera(VIEWS[view], ch.camera.pitch);
  const { prims, joints } = buildPrims(ch, pose, pal.M);
  const fr = render(prims, cam, ch, opts);
  return finish(fr, pal, ch, cam, joints, opts);
}

// Liste aller Animationen: Name, Ansicht, Posen.
export function animations(ch) {
  const n = ch.gait.frames;
  const list = [];
  for (const view of Object.keys(VIEWS)) {
    list.push({ name: `walk_${view}`, view, fps: 10, poses: Array.from({ length: n }, (_, i) => walk(ch, i / n)) });
    list.push({ name: `stand_${view}`, view, fps: 1, poses: [stand(ch)] });
  }
  return list;
}

export function buildSheet(ch, opts = {}) {
  const pal = buildPalette(ch);
  const { w, h, baseline } = ch.cell;
  const anims = animations(ch);
  const cols = Math.max(...anims.map((a) => a.poses.length));
  const W = cols * w, H = anims.length * h;
  const idx = new Uint8Array(W * H);
  const meta = {
    image: `${ch.name}.png`,
    cell: { w, h },
    anchor: { x: w / 2, y: baseline },
    stepPx: ch.gait.stride / ch.gait.frames,
    note: 'Links = side gespiegelt. stepPx = Weg der Figur je Geh-Phase.',
    animations: {},
  };
  anims.forEach((a, row) => {
    meta.animations[a.name] = { fps: a.fps, frames: [] };
    a.poses.forEach((pose, col) => {
      const f = renderFrame(ch, pal, pose, a.view, opts);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) idx[(row * h + y) * W + col * w + x] = f[y * w + x];
      meta.animations[a.name].frames.push({ x: col * w, y: row * h, w, h });
    });
  });
  return { w: W, h: H, idx, pal, meta, anims };
}

const hexRGB = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Palettenbild -> RGBA, optional vergrößert und auf Hintergrundfarbe.
export function toRGBA(sheet, zoom = 1, bg = null) {
  const { w, h, idx, pal } = sheet;
  const rgb = pal.colors.map((c) => (c === 'transparent' ? null : hexRGB(c)));
  const back = bg ? hexRGB(bg) : null;
  const out = new Uint8Array(w * zoom * h * zoom * 4);
  for (let y = 0; y < h * zoom; y++)
    for (let x = 0; x < w * zoom; x++) {
      const c = rgb[idx[Math.floor(y / zoom) * w + Math.floor(x / zoom)]] || back;
      const o = (y * w * zoom + x) * 4;
      if (c) { out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; }
    }
  return { w: w * zoom, h: h * zoom, data: out };
}
