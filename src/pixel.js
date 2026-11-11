// Pixel-Regeln nach dem Rendern: Kanten zwischen Körperteilen, Gesicht, Aufräumen, Palette.

import { dot } from './rig.js';
import { project } from './render.js';

// Palette aus den Materialien: Index 0 ist durchsichtig.
export function buildPalette(ch) {
  const colors = ['transparent'];
  const idx = (hex) => {
    let i = colors.indexOf(hex);
    if (i < 0) { colors.push(hex); i = colors.length - 1; }
    return i;
  };
  const M = {}, shades = [];
  Object.entries(ch.materials).forEach(([name, s], i) => {
    M[name] = i;
    shades.push(s.map(idx));
  });
  return { colors, M, shades, outline: idx(ch.outline), eye: idx(ch.eye) };
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function finish(fr, pal, ch, cam, joints, opts = {}) {
  const { w, h } = fr;
  const scale = opts.scale || 1;
  const cell = opts.cell || ch.cell;
  const idx = new Uint8Array(w * h);

  // Einzelne verirrte Pixel entfernen.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (fr.mat[i] < 0) continue;
      let nb = 0;
      for (const [dx, dy] of N4) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && fr.mat[yy * w + xx] >= 0) nb++;
      }
      if (nb === 0) fr.mat[i] = -1;
    }

  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (fr.mat[i] < 0) continue;
      let band = fr.band[i];
      // Liegt ein anderes Körperteil deutlich davor, wird dieser Pixel dunkel (Trennkante).
      for (const [dx, dy] of N4) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx;
        if (fr.mat[k] >= 0 && fr.part[k] !== fr.part[i] && fr.depth[k] < fr.depth[i] - 1.6 / scale) band = 0;
      }
      idx[i] = pal.shades[fr.mat[i]][band];
    }

  // Augen als einzelne Pixel an den projizierten Punkten.
  const eyeMat = pal.M[ch.eyeOn || 'skin'];
  for (const e of joints.eyes || []) {
    if (-dot(e.out, cam.d) < 0.25) continue;
    const s = project(cam, cell, scale, e.p);
    if (s.x < 0 || s.y < 0 || s.x >= w || s.y >= h) continue;
    const i = s.y * w + s.x;
    if (fr.mat[i] !== eyeMat) continue;
    if (fr.depth[i] < s.depth - 2.0) continue;
    idx[i] = pal.eye;
  }
  return idx;
}
