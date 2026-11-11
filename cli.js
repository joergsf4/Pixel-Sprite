#!/usr/bin/env node
// node cli.js build  -> je Figur out/<name>.png, .json, _preview.png; out/office.* (Büroobjekte); out/preview.html und docs/ (GitHub Pages)
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

if (cmd === 'build') build();
else if (cmd === 'check') check();
else console.log('Aufruf: node cli.js build | check');
