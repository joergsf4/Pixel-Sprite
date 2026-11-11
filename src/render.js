// Rendert die Körperformen in Zielauflösung: je Pixel Material, Helligkeitsstufe, Körperteil, Tiefe.

const BLEND = 0.8; // Weichheit der Übergänge innerhalb eines Körperteils
const CAM_DIST = 60;
const hit = { pr: null };

function sdPrim(pr, x, y, z) {
  if (pr.t === 0) {
    const px = x - pr.ax, py = y - pr.ay, pz = z - pr.az;
    let h = (px * pr.bx + py * pr.by + pz * pr.bz) * pr.inv;
    h = h < 0 ? 0 : h > 1 ? 1 : h;
    const dx = px - pr.bx * h, dy = py - pr.by * h, dz = pz - pr.bz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - (pr.ra + (pr.rb - pr.ra) * h);
  }
  const px = x - pr.cx, py = y - pr.cy, pz = z - pr.cz;
  const lx = px * pr.xx + py * pr.xy + pz * pr.xz;
  const ly = px * pr.yx + py * pr.yy + pz * pr.yz;
  const lz = px * pr.zx + py * pr.zy + pz * pr.zz;
  const ax = lx / pr.rx, ay = ly / pr.ry, az = lz / pr.rz;
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = ax / pr.rx, by = ay / pr.ry, bz = az / pr.rz;
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  if (k1 < 1e-9) return -Math.min(pr.rx, pr.ry, pr.rz);
  return (k0 * (k0 - 1)) / k1;
}

// Abstand zur Figur; merkt sich die nächstgelegene Form in hit.pr.
function scene(prims, x, y, z) {
  let best = 1e9, bestPr = null;
  let part = -1, gd = 1e9, gmin = 1e9, gpr = null;
  for (let i = 0; i < prims.length; i++) {
    const pr = prims[i];
    if (pr.part !== part) {
      if (gd < best) { best = gd; bestPr = gpr; }
      part = pr.part; gd = 1e9; gmin = 1e9; gpr = null;
    }
    const d = sdPrim(pr, x, y, z);
    if (d < gmin) { gmin = d; gpr = pr; }
    const h = Math.max(BLEND - Math.abs(gd - d), 0) / BLEND;
    gd = Math.min(gd, d) - h * h * BLEND * 0.25;
  }
  if (gd < best) { best = gd; bestPr = gpr; }
  hit.pr = bestPr;
  return best;
}

// Kamera: yaw 0 = von vorn, -90° = Figur läuft nach rechts, 180° = von hinten.
export function camera(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const d = [-sy * cp, -sp, -cy * cp];
  const r = [cy, 0, -sy];
  const u = [r[1] * d[2] - r[2] * d[1], r[2] * d[0] - r[0] * d[2], r[0] * d[1] - r[1] * d[0]];
  return { d, r, u };
}

// Weltpunkt -> Pixel und Tiefe.
export function project(cam, cell, scale, p) {
  const sx = p[0] * cam.r[0] + p[1] * cam.r[1] + p[2] * cam.r[2];
  const sy = p[0] * cam.u[0] + p[1] * cam.u[1] + p[2] * cam.u[2];
  const depth = p[0] * cam.d[0] + p[1] * cam.d[1] + p[2] * cam.d[2] + CAM_DIST;
  return { x: Math.floor(sx * scale + cell.w / 2), y: Math.floor(cell.baseline - sy * scale), depth };
}

export function render(prims, cam, ch, opts = {}) {
  const scale = opts.scale || 1; // Pixel je Einheit
  const n = opts.samples || 3;
  const cell = opts.cell || ch.cell;
  const W = cell.w, H = cell.h;
  const { d, r, u } = cam;
  const L = ch.camera.light, ll = Math.hypot(L[0], L[1], L[2]);
  const lw = [0, 1, 2].map((i) => (r[i] * L[0] + u[i] * L[1] - d[i] * L[2]) / ll);
  const out = {
    w: W, h: H,
    mat: new Int8Array(W * H).fill(-1),
    band: new Uint8Array(W * H),
    part: new Uint8Array(W * H),
    depth: new Float32Array(W * H).fill(1e9),
  };
  const keys = new Int32Array(n * n), deps = new Float32Array(n * n);
  const e = 0.06;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let hits = 0;
      for (let s = 0; s < n * n; s++) {
        const sx = (px + ((s % n) + 0.5) / n - W / 2) / scale;
        const sy = (cell.baseline - (py + (Math.floor(s / n) + 0.5) / n)) / scale;
        const ox = r[0] * sx + u[0] * sy - d[0] * CAM_DIST;
        const oy = r[1] * sx + u[1] * sy - d[1] * CAM_DIST;
        const oz = r[2] * sx + u[2] * sy - d[2] * CAM_DIST;
        let t = 20, found = false;
        for (let i = 0; i < 72 && t < 100; i++) {
          const dist = scene(prims, ox + d[0] * t, oy + d[1] * t, oz + d[2] * t);
          if (dist < 0.03) { found = true; break; }
          t += dist * 0.85;
        }
        if (!found) continue;
        const x = ox + d[0] * t, y = oy + d[1] * t, z = oz + d[2] * t;
        const pr = hit.pr;
        const nx = scene(prims, x + e, y, z) - scene(prims, x - e, y, z);
        const ny = scene(prims, x, y + e, z) - scene(prims, x, y - e, z);
        const nz = scene(prims, x, y, z + e) - scene(prims, x, y, z - e);
        const nl = Math.hypot(nx, ny, nz) || 1;
        const I = (nx * lw[0] + ny * lw[1] + nz * lw[2]) / nl;
        const band = I > ch.shading.light ? 2 : I > ch.shading.dark ? 1 : 0;
        keys[hits] = pr.part * 256 + pr.mat * 4 + band;
        deps[hits] = t;
        hits++;
      }
      if (hits * 2 < n * n) continue;
      // Mehrheitsentscheid
      let bestKey = -1, bestCount = 0, bestDepth = 1e9;
      for (let a = 0; a < hits; a++) {
        let count = 0, dep = 1e9;
        for (let b2 = 0; b2 < hits; b2++)
          if (keys[b2] === keys[a]) { count++; if (deps[b2] < dep) dep = deps[b2]; }
        if (count > bestCount || (count === bestCount && dep < bestDepth)) {
          bestCount = count; bestKey = keys[a]; bestDepth = dep;
        }
      }
      const i = py * W + px;
      out.part[i] = bestKey >> 8;
      out.mat[i] = (bestKey & 255) >> 2;
      out.band[i] = bestKey & 3;
      out.depth[i] = bestDepth;
    }
  }
  return out;
}
