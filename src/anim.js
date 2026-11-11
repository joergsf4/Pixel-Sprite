// Posen als Funktionen der Phase t (0..1). Nichts ist von Hand gesetzt.

import { rotX, rotY, mmul } from './rig.js';

const TAU = Math.PI * 2;
const frac = (x) => x - Math.floor(x);
const smooth = (x) => x * x * (3 - 2 * x);

// Fuß eines Beins bei lokaler Phase u: am Boden gleichmäßig nach hinten, in der Luft im Bogen nach vorn.
export function footPath(g, b, u) {
  const half = (g.stride * g.duty) / 2;
  let z, lift = 0, pitch = 0;
  if (u < g.duty) {
    const s = u / g.duty;
    z = half - 2 * half * s;
    if (s < 0.2) pitch = g.toeUp * (1 - s / 0.2);
    else if (s > 0.6) pitch = -g.toeDown * smooth((s - 0.6) / 0.4);
  } else {
    const v = (u - g.duty) / (1 - g.duty);
    z = -half + 2 * half * (0.5 - 0.5 * Math.cos(Math.PI * v));
    lift = g.lift * Math.sin(Math.PI * Math.pow(v, 0.8));
    pitch = -g.toeDown + (g.toeDown + g.toeUp) * smooth(v);
  }
  // Zehen bleiben am Boden, wenn die Ferse abhebt.
  const rise = pitch < 0 ? b.footLen * Math.sin(-pitch) : 0;
  return { z, y: b.ankle + lift + rise, pitch, stance: u < g.duty };
}

function bipedWalk(ch, t) {
  const g = ch.gait, b = ch.body;
  const c = Math.cos(TAU * t);
  const pelvis = [
    g.sway * Math.sin(TAU * (t - 0.05)),
    b.walkHip - g.bob * Math.cos(2 * TAU * (t - 0.05)),
    0,
  ];
  const legs = {}, arms = {};
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    const f = footPath(g, b, frac(t + (side === 'L' ? 0 : 0.5)));
    legs[side] = { ankle: [sx * g.stanceX, f.y, f.z], pitch: f.pitch, stance: f.stance };
    const swing = -sx * g.armSwing * c;
    arms[side] = { swing, bend: g.elbow + g.elbowSwing * Math.max(0, swing / g.armSwing) };
  }
  return {
    pelvis,
    pelvisM: rotY(-g.hipTwist * c),
    chestM: mmul(rotY(g.chestTwist * c), rotX(g.lean)),
    headM: rotX(g.lean * 0.3),
    legs, arms,
  };
}

function bipedStand(ch) {
  const b = ch.body;
  const legs = {}, arms = {};
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    legs[side] = { ankle: [sx * (b.hipX - 0.2), b.ankle, 0], pitch: 0, yaw: sx * 0.25, stance: true };
    arms[side] = { swing: 0.03, bend: 0.18 };
  }
  return {
    pelvis: [0, b.standHip, 0],
    pelvisM: rotY(0), chestM: rotX(0.02), headM: rotX(0),
    legs, arms,
  };
}

// Bezugsmaße des Fußes für footPath.
export const footRef = (ch) => (ch.kind === 'dog' ? { ankle: ch.dog.paw, footLen: 0 } : ch.body);

// Hund im Trab: diagonale Beinpaare bewegen sich gemeinsam.
const DOG_PHASE = { FL: 0, HR: 0, FR: 0.5, HL: 0.5 };
function dogFeet(ch, fn) {
  const d = ch.dog, feet = {};
  for (const key of Object.keys(DOG_PHASE)) {
    const front = key[0] === 'F', sx = key[1] === 'L' ? 1 : -1;
    const f = fn(key);
    feet[key] = [sx * d.legX, f.y, (front ? d.shoulderZ + 0.2 : d.hipZ - 0.2) + f.z];
  }
  return feet;
}
function dogWalk(ch, t) {
  const g = ch.gait;
  return {
    bodyY: -g.bob * Math.cos(2 * TAU * t),
    headBob: 0.3 * Math.cos(2 * TAU * t),
    tailX: g.wag * Math.sin(TAU * t),
    feet: dogFeet(ch, (key) => footPath(g, footRef(ch), frac(t + DOG_PHASE[key]))),
  };
}
function dogStand(ch) {
  return { bodyY: 0, headBob: 0, tailX: 0, feet: dogFeet(ch, () => ({ y: ch.dog.paw, z: 0 })) };
}

export const walk = (ch, t) => (ch.kind === 'dog' ? dogWalk(ch, t) : bipedWalk(ch, t));
export const stand = (ch) => (ch.kind === 'dog' ? dogStand(ch) : bipedStand(ch));
