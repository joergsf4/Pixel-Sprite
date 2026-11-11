#!/usr/bin/env node
// node cli.js build  -> je Figur out/<name>.png, .json, _preview.png; out/office.* (Büroobjekte); out/preview.html und docs/ (GitHub Pages)
// node cli.js ags    -> Ordner ags/ für Adventure Game Studio
// node cli.js check  -> prüft Gang und Sprite-Sheets

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { characters } from './character.js';
import { buildSheet, toRGBA } from './src/sheet.js';
import { encodePNG } from './src/png.js';
import { walk, footPath, footRef } from './src/anim.js';
import { solve } from './src/rig.js';
import { buildObjectSheet } from './src/objects.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'out');
const cmd = process.argv[2] || 'build';

function build() {
  fs.mkdirSync(out, { recursive: true });
  const data = [];
  for (const ch of characters) {
    const t0 = Date.now();
    const sheet = buildSheet(ch);
    const png = encodePNG(toRGBA(sheet));
    fs.writeFileSync(path.join(out, `${ch.name}.png`), png);
    fs.writeFileSync(path.join(out, `${ch.name}.json`), JSON.stringify(sheet.meta, null, 2));
    fs.writeFileSync(path.join(out, `${ch.name}_preview.png`), encodePNG(toRGBA(sheet, 5, '#6b7f8f')));
    data.push({ name: ch.name, meta: sheet.meta, png: png.toString('base64') });
    console.log(`${ch.name}: ${sheet.w}×${sheet.h} px, ${sheet.pal.colors.length - 1} Farben, ${Date.now() - t0} ms`);
  }
  const docs = path.join(root, 'docs');
  fs.mkdirSync(docs, { recursive: true });

  // Beispiel: Büroobjekte als Sprite-Sheet.
  const t0 = Date.now();
  const office = buildObjectSheet();
  const z = 3, big = new Uint8Array(office.w * z * office.h * z * 4);
  const bg = [0x6b, 0x7f, 0x8f, 255];
  for (let y = 0; y < office.h * z; y++)
    for (let x = 0; x < office.w * z; x++) {
      const i = (Math.floor(y / z) * office.w + Math.floor(x / z)) * 4;
      big.set(office.data[i + 3] ? office.data.subarray(i, i + 4) : bg, (y * office.w * z + x) * 4);
    }
  const files = {
    'office.png': encodePNG(office),
    'office.json': JSON.stringify(office.meta, null, 2),
    'office_preview.png': encodePNG({ w: office.w * z, h: office.h * z, data: big }),
  };
  for (const [f, data] of Object.entries(files)) {
    fs.writeFileSync(path.join(out, f), data);
    fs.writeFileSync(path.join(docs, f), data);
  }
  console.log(`office: ${office.w}×${office.h} px, ${Object.keys(office.meta.sprites).length} Sprites, ${Date.now() - t0} ms`);

  // Eigenständige Vorschau mit Bewegung (Doppelklick genügt, kein Server nötig).
  const html = fs.readFileSync(path.join(root, 'src', 'preview.html'), 'utf8').replace('__DATA__', () => JSON.stringify(data))
    .replace('__OFFICE__', () => JSON.stringify({ meta: office.meta, png: files['office.png'].toString('base64') }));
  fs.writeFileSync(path.join(out, 'preview.html'), html);
  // Kopie für GitHub Pages samt Übersichtsbildern für das README.
  fs.writeFileSync(path.join(docs, 'index.html'), html);
  for (const ch of characters)
    for (const f of [`${ch.name}.png`, `${ch.name}_preview.png`]) fs.copyFileSync(path.join(out, f), path.join(docs, f));
  console.log('Vorschau: out/preview.html (Kopie in docs/index.html)');
}

function check() {
  const problems = [];
  for (const ch of characters) {
    const g = ch.gait, n = g.frames;
    const ok = (cond, msg) => { if (!cond) problems.push(`${ch.name}: ${msg}`); };

    // Kein Fußrutschen: Standfuß bewegt sich je Phase genau um stride/frames nach hinten.
    const step = g.stride / n;
    for (let i = 0; i < n; i++)
      for (const off of [0, 0.5]) {
        const u0 = (i / n + off) % 1, u1 = ((i + 1) / n + off) % 1;
        if (u0 < g.duty && u1 < g.duty && u1 > u0) {
          const dz = footPath(g, footRef(ch), u1).z - footPath(g, footRef(ch), u0).z;
          ok(Math.abs(dz + step) < 1e-6, `Fuß rutscht in Phase ${i}: ${dz.toFixed(3)} statt ${-step}`);
        }
      }
    ok(Number.isInteger(step), `stride/frames = ${step} ist nicht ganzzahlig`);

    if (ch.kind === 'biped') {
      // Zyklus schließt sich.
      const a = solve(ch, walk(ch, 0)), b = solve(ch, walk(ch, 1));
      const diff = Math.max(...['L', 'R'].flatMap((s) => a.legs[s].knee.map((v, k) => Math.abs(v - b.legs[s].knee[k]))));
      ok(diff < 1e-6, `Zyklus schließt nicht (Abweichung ${diff})`);
      // Beine nie überstreckt.
      for (let i = 0; i < n; i++) {
        const j = solve(ch, walk(ch, i / n));
        for (const s of ['L', 'R']) {
          const l = j.legs[s];
          const d = Math.hypot(...l.hip.map((v, k) => v - l.ankle[k]));
          ok(d <= ch.body.thigh + ch.body.shin, `Bein ${s} überstreckt in Phase ${i} (${d.toFixed(2)})`);
        }
      }
    }

    // Sprite-Sheet: Farben, Grundlinie, Rand.
    const sheet = buildSheet(ch);
    const { w, h } = ch.cell;
    ok(sheet.pal.colors.length - 1 <= 16, `${sheet.pal.colors.length - 1} Farben (mehr als 16)`);
    for (const [name, an] of Object.entries(sheet.meta.animations))
      an.frames.forEach((f, k) => {
        let lowest = -1, edge = false;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++)
            if (sheet.idx[(f.y + y) * sheet.w + f.x + x]) {
              lowest = y;
              if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
            }
        ok(!edge, `${name}[${k}] berührt den Zellenrand`);
        ok(Math.abs(lowest - (ch.cell.baseline - 1)) <= 1, `${name}[${k}] unterste Zeile ${lowest}, erwartet ${ch.cell.baseline - 1}`);
      });
  }
  if (problems.length) { console.log(problems.join('\n')); process.exitCode = 1; }
  else console.log('Alle Prüfungen bestanden.');
}

// Export für Adventure Game Studio: Einzelbilder und Raster je Figur, Objekte einzeln, leerer Testraum.
function ags() {
  const dir = path.join(root, 'ags');
  fs.rmSync(dir, { recursive: true, force: true });
  const write = (rel, img) => {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.isBuffer(img) || typeof img === 'string' ? img : encodePNG(img));
  };
  const blank = (w, h) => ({ w, h, data: new Uint8Array(w * h * 4) });
  // Kopiert einen Ausschnitt, auf Wunsch gespiegelt.
  const blit = (dst, dx, dy, src, sx, sy, w, h, flip = false) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = ((sy + y) * src.w + sx + (flip ? w - 1 - x : x)) * 4;
        dst.data.set(src.data.subarray(i, i + 4), ((dy + y) * dst.w + dx + x) * 4);
      }
  };
  const GAME_FPS = 40, lines = [];

  // AGS-Reihenfolge der Schleifen: 0 nach vorn, 1 links, 2 rechts, 3 nach hinten. Bild 0 ist das Standbild.
  const LOOPS = [['vorn', 'front', false], ['links', 'side', true], ['rechts', 'side', false], ['hinten', 'back', false]];
  for (const ch of characters) {
    const sheet = buildSheet(ch), src = toRGBA(sheet), A = sheet.meta.animations, cw = ch.cell.w;
    // Unten bündig beschneiden: AGS setzt die Figur mit der unteren Mitte des Sprites auf ihre Position.
    let bottom = 0;
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) if (src.data[(y * src.w + x) * 4 + 3]) bottom = Math.max(bottom, y % ch.cell.h);
    const hh = bottom + 1, n = ch.gait.frames + 1;
    const grid = blank(cw * n, hh * LOOPS.length);
    LOOPS.forEach(([label, view, flip], loop) => {
      const frames = [A['stand_' + view].frames[0], ...A['walk_' + view].frames];
      frames.forEach((f, k) => {
        const one = blank(cw, hh);
        blit(one, 0, 0, src, f.x, f.y, cw, hh, flip);
        write(`figuren/${ch.name}/${ch.name}_loop${loop}_${label}_${k}.png`, one);
        blit(grid, k * cw, loop * hh, src, f.x, f.y, cw, hh, flip);
      });
    });
    write(`figuren/${ch.name}/${ch.name}_raster.png`, grid);
    const step = sheet.meta.stepPx, delay = Math.round(GAME_FPS / A.walk_side.fps);
    lines.push(`| ${ch.name} | ${cw}×${hh} | ${n} | ${step} | 1 | ${delay} |`);
  }

  const office = buildObjectSheet(), olines = [];
  for (const [name, s] of Object.entries(office.meta.sprites)) {
    const one = blank(s.w, s.h);
    blit(one, 0, 0, office, s.x, s.y, s.w, s.h);
    write(`objekte/${name}.png`, one);
    olines.push(`| ${name}.png | ${s.label}${name.endsWith('_schraeg') ? ' (schräg)' : ''} | ${s.w}×${s.h} |`);
  }

  // Leerer Testraum in Spielauflösung als Raumhintergrund.
  const room = blank(320, 200);
  const rect = (hex, x, y, w, h) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) room.data.set([...c, 255], (yy * 320 + xx) * 4);
  };
  rect('#b5bfa8', 0, 0, 320, 112); rect('#7d9a94', 0, 84, 320, 28); rect('#5f7a78', 0, 83, 320, 1); rect('#544c44', 0, 108, 320, 4); rect('#8c6c4a', 0, 112, 320, 88);
  for (let y = 122; y < 200; y += 14) rect('#6a5038', 0, y, 320, 1);
  write('raum_leer.png', room);

  write('LIESMICH.md', fs.readFileSync(path.join(root, 'src', 'ags_liesmich.md'), 'utf8')
    .replace('__FIGUREN__', lines.join('\n')).replace('__OBJEKTE__', olines.join('\n')));
  console.log(`AGS-Export: ${characters.length} Figuren, ${olines.length} Objekte -> ags/`);
}

if (cmd === 'build') build();
else if (cmd === 'ags') ags();
else if (cmd === 'check') check();
else console.log('Aufruf: node cli.js build | check | ags');
