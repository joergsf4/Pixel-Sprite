// Vektoren, Drehungen, inverse Kinematik und der Aufbau der Körperformen aus einer Pose.

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => mul(a, 1 / (len(a) || 1));

// 3×3-Matrizen, zeilenweise.
export const IDENT = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const rotX = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
export const rotY = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};
export const rotZ = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};
export function mmul(a, b) {
  const o = new Array(9);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
}
export const mv = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

// Zwei-Knochen-Kette: liefert das mittlere Gelenk (Knie, Ellbogen).
export function ik2(root, target, l1, l2, pole) {
  let d = sub(target, root);
  let dist = len(d);
  const max = l1 + l2 - 0.01;
  if (dist > max) dist = max;
  if (dist < 0.01) dist = 0.01;
  const dir = norm(d);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const pp = norm(sub(pole, mul(dir, dot(pole, dir))));
  return add(add(root, mul(dir, a)), mul(pp, h));
}

// --- Grundformen -----------------------------------------------------------

function capsule(a, b, ra, rb, mat, part) {
  const d = sub(b, a);
  const l2 = dot(d, d) || 1e-6;
  return { t: 0, ax: a[0], ay: a[1], az: a[2], bx: d[0], by: d[1], bz: d[2], inv: 1 / l2, ra, rb, mat, part };
}

function ellipsoid(c, m, r, mat, part) {
  return {
    t: 1, cx: c[0], cy: c[1], cz: c[2],
    // Spalten von m = lokale Achsen in Weltkoordinaten
    xx: m[0], xy: m[3], xz: m[6],
    yx: m[1], yy: m[4], yz: m[7],
    zx: m[2], zy: m[5], zz: m[8],
    rx: r[0], ry: r[1], rz: r[2], mat, part,
  };
}

export const PART = { torso: 1, head: 2, armL: 3, armR: 4, legL: 5, legR: 6 };

// Berechnet aus einer Pose alle Gelenkpunkte (Zweibeiner).
export function solve(ch, pose) {
  const b = ch.body;
  const P = pose.pelvis;
  const Mp = pose.pelvisM, Mc = pose.chestM, Mh = pose.headM;
  const chest = add(P, mv(Mc, [0, b.spine, 0]));
  const neck = add(chest, mv(Mc, [0, b.neck, 0]));
  const head = add(neck, mv(Mh, [0, b.headY, b.headZ]));
  const j = { P, chest, neck, head, Mp, Mc, Mh, legs: {}, arms: {}, eyes: [] };
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    const leg = pose.legs[side];
    const hip = add(P, mv(Mp, [sx * b.hipX, -b.hipDrop, 0]));
    const pole = mv(Mp, [sx * 0.12, 0, 1]);
    const knee = ik2(hip, leg.ankle, b.thigh, b.shin, pole);
    const Mf = mmul(rotY(leg.yaw || 0), rotX(-leg.pitch));
    const down = -(b.ankle - b.footR);
    const heel = add(leg.ankle, mv(Mf, [0, down, -0.7]));
    const toe = add(leg.ankle, mv(Mf, [0, down, b.footLen]));
    j.legs[side] = { hip, knee, ankle: leg.ankle, heel, toe };

    const arm = pose.arms[side];
    const shoulder = add(chest, mv(Mc, [sx * b.shoulderX, b.shoulderY, 0]));
    const spread = arm.spread ?? b.armSpread ?? 0.06;
    const Mu = mmul(Mc, mmul(rotZ(sx * spread), rotX(-arm.swing)));
    const elbow = add(shoulder, mv(Mu, [0, -b.upperArm, 0]));
    const Mf2 = mmul(Mu, rotX(-arm.bend));
    const hand = add(elbow, mv(Mf2, [0, -b.foreArm, 0]));
    j.arms[side] = { shoulder, elbow, hand };

    j.eyes.push({
      p: add(head, mv(Mh, [sx * b.head[0] * 0.43, 0.6, b.head[2] * 0.72])),
      out: mv(Mh, [sx * 0.42, 0.1, 0.9]),
    });
  }
  return j;
}

function buildBiped(ch, pose, M) {
  const b = ch.body;
  const j = solve(ch, pose);
  const armR = b.armR || [1.6, 1.35, 1.15], handR = b.handR || 1.3;
  const legR = b.legR || [2.3, 1.9, 1.5], bootR = b.bootR || [1.95, 1.7];
  const prims = [];
  // Rumpf
  prims.push(ellipsoid(add(j.P, mv(j.Mc, [0, b.torsoY ?? b.spine * 0.6, 0])), j.Mc, b.torso, M.jacket, PART.torso));
  prims.push(ellipsoid(j.P, j.Mp, b.pelvis, M.pants, PART.torso));
  // Kopf
  prims.push(capsule(add(j.chest, mv(j.Mc, [0, 1.5, 0])), j.head, b.neckR || 1.3, b.neckR || 1.3, M.skin, PART.head));
  if (M.scarf !== undefined)
    prims.push(ellipsoid(add(j.chest, mv(j.Mc, [0, 2.6, 0.2])), j.Mc, [2.5, 1.2, 2.4], M.scarf, PART.head));
  prims.push(ellipsoid(j.head, j.Mh, b.head, M.skin, PART.head));
  prims.push(ellipsoid(add(j.head, mv(j.Mh, [0, -0.4, b.head[2]])), j.Mh, [0.8, 0.8, 0.9], M.skin, PART.head)); // Nase
  if (M.hair !== undefined)
    prims.push(ellipsoid(add(j.head, mv(j.Mh, [0, 1.3, -0.8])), j.Mh, [b.head[0] + 0.3, b.head[1] - 0.5, b.head[2] + 0.1], M.hair, PART.head));
  if (ch.tuft)
    prims.push(ellipsoid(add(j.head, mv(j.Mh, [0.9, 3.0, 2.3])), j.Mh, [1.8, 1.3, 1.5], M.hair, PART.head)); // Tolle
  if (ch.ponytail) {
    // Pferdeschwanz: vom Hinterkopf nach hinten und dann nach unten
    const tail = ch.ponytail.map((p) => add(j.head, mv(j.Mh, p)));
    prims.push(capsule(tail[0], tail[1], 1.35, 1.15, M.hair, PART.head));
    prims.push(capsule(tail[1], tail[2], 1.15, 0.6, M.hair, PART.head));
  }
  // Zusätze wie Hut, Bauch, Schnurrbart
  for (const e of ch.extras || []) {
    const [o, m, part] = e.at === 'head' ? [j.head, j.Mh, PART.head] : e.at === 'chest' ? [j.chest, j.Mc, PART.torso] : [j.P, j.Mc, PART.torso];
    prims.push(ellipsoid(add(o, mv(m, e.pos)), m, e.r, M[e.mat], part));
  }
  // Arme und Beine
  for (const side of ['L', 'R']) {
    const a = j.arms[side], pa = PART['arm' + side];
    prims.push(capsule(a.shoulder, a.elbow, armR[0], armR[1], M.jacket, pa));
    prims.push(capsule(a.elbow, a.hand, armR[1], armR[2], M.jacket, pa));
    const dir = norm(sub(a.hand, a.elbow));
    prims.push(ellipsoid(add(a.hand, mul(dir, 0.9)), IDENT, [handR, handR, handR], M.skin, pa));
  }
  for (const side of ['L', 'R']) {
    const l = j.legs[side], pl = PART['leg' + side];
    prims.push(capsule(l.hip, l.knee, legR[0], legR[1], M.pants, pl));
    prims.push(capsule(l.knee, l.ankle, legR[1], legR[2], M.pants, pl));
    const shaft = add(l.ankle, mul(sub(l.knee, l.ankle), 0.42));
    prims.push(capsule(shaft, l.ankle, bootR[0], bootR[1], M.boots, pl));
    prims.push(capsule(l.heel, l.toe, b.footR + 0.1, b.footR, M.boots, pl));
  }
  return { prims, joints: j };
}

// Vierbeiner: Rumpf als Kapsel, vier Beine mit je zwei Knochen, Kopf mit Schnauze und Schlappohren.
function buildDog(ch, pose, M) {
  const d = ch.dog;
  const prims = [];
  const hip = [0, d.height + pose.bodyY, d.hipZ], sh = [0, d.height + pose.bodyY, d.shoulderZ];
  prims.push(capsule(hip, sh, d.rearR, d.chestR, M.fur, 1));
  prims.push(capsule(add(hip, [0, 1.5, -2.2]), add(hip, [pose.tailX, 5.5, -5.5]), 1.0, 0.5, M.fur, 1));
  const head = [0, d.headY + pose.bodyY * 0.5 + pose.headBob, d.headZ];
  const Mh = rotX(pose.headPitch || 0);
  const neck0 = add(sh, [0, 1, 0.5]);
  prims.push(capsule(neck0, head, 2.1, 1.8, M.fur, 2));
  if (M.collar !== undefined)
    prims.push(ellipsoid(add(neck0, mul(sub(head, neck0), 0.45)), rotX(0.85), [2.4, 0.9, 2.4], M.collar, 2));
  prims.push(ellipsoid(head, Mh, [2.4, 2.3, 2.7], M.fur, 2));
  prims.push(capsule(add(head, mv(Mh, [0, -0.7, 1.5])), add(head, mv(Mh, [0, -1.0, 4.6])), 1.5, 1.15, M.fur, 2));
  prims.push(ellipsoid(add(head, mv(Mh, [0, -0.6, 5.5])), Mh, [0.9, 0.9, 0.9], M.nose, 2));
  const eyes = [];
  for (const sx of [1, -1]) {
    prims.push(ellipsoid(add(head, mv(Mh, [sx * 2.1, 0.5, -0.9])), Mh, [0.8, 2.3, 1.5], M.ear, 2));
    eyes.push({ p: add(head, mv(Mh, [sx * 1.3, 0.7, 2.0])), out: mv(Mh, [sx * 0.5, 0.2, 0.85]) });
  }
  let part = 3;
  for (const key of ['FL', 'FR', 'HL', 'HR']) {
    const front = key[0] === 'F', sx = key[1] === 'L' ? 1 : -1;
    const joint = add(front ? sh : hip, [sx * d.legX, -1.8, front ? -0.3 : 0.3]);
    const foot = pose.feet[key];
    const mid = ik2(joint, foot, d.upper, d.lower, [0, 0, front ? 1 : -1]);
    prims.push(capsule(joint, mid, front ? 1.5 : 2.0, 1.15, M.fur, part));
    prims.push(capsule(mid, foot, 1.1, 0.9, M.fur, part));
    prims.push(ellipsoid(add(foot, [0, -0.1, 0.6]), IDENT, [1.1, 1.0, 1.5], M.fur, part));
    part++;
  }
  return { prims, joints: { head, Mh, eyes } };
}

// Baut aus einer Pose die Liste der Körperformen (nach Körperteil sortiert).
export function buildPrims(ch, pose, M) {
  const res = ch.kind === 'dog' ? buildDog(ch, pose, M) : buildBiped(ch, pose, M);
  res.prims.sort((p, q) => p.part - q.part);
  return res;
}
