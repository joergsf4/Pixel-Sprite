// Beschreibung der Figur. Alle Längen in Pixeln der Zielauflösung.
// Achsen: Y nach oben, Z = Blickrichtung der Figur, X = linke Seite der Figur.

const hero = {
  name: 'hero',
  kind: 'biped',
  tuft: true,

  // Zelle im Sprite-Sheet. baseline = Zeile, auf der der Boden liegt.
  cell: { w: 32, h: 48, baseline: 46 },

  // Kamera: Neigung von oben (Bogenmaß) und Licht im Kameraraum (links oben vorn).
  camera: { pitch: 0.1, light: [-0.45, 0.65, 0.6] },

  // Helligkeitsstufen: Grenzwerte für dunkel|mittel|hell.
  shading: { dark: -0.12, light: 0.42 },

  outline: '#1b1622',
  eye: '#1b1622',

  // Materialien: [dunkel, mittel, hell]
  materials: {
    skin: ['#a8644a', '#d9966c', '#f2c49a'],
    hair: ['#5a2a1c', '#8c4326', '#b8622f'],
    jacket: ['#1f4a4f', '#2f7373', '#4fa39a'],
    pants: ['#4a3528', '#7a5a3c', '#a07f55'],
    boots: ['#1b1622', '#45323a', '#45323a'],
    scarf: ['#8f2430', '#c8343c', '#c8343c'],
  },

  // Pferdeschwanz: Ansatz, Knick, Spitze (relativ zur Kopfmitte)
  ponytail: [[0, 1.4, -3.6], [0, 0.2, -5.8], [0, -4.2, -5.6]],

  body: {
    standHip: 23.1, // Höhe der Beckenmitte im Stand
    walkHip: 22.8, // mittlere Höhe beim Gehen
    hipX: 2.4, // halber Abstand der Hüftgelenke
    hipDrop: 1.2,
    thigh: 10,
    shin: 10,
    ankle: 2.2,
    footLen: 3.6,
    footR: 1.3,
    spine: 8.5,
    shoulderX: 5.0,
    shoulderY: 1.3,
    upperArm: 6.5,
    foreArm: 6.5,
    neck: 3.0,
    headY: 4.0,
    headZ: 0.5,
    head: [3.5, 4.1, 3.8],
    torso: [4.3, 6.3, 3.4],
    pelvis: [4.3, 3.0, 3.0],
  },

  gait: {
    frames: 6, // Phasen je Gehzyklus
    stride: 18, // Weg je Zyklus in Pixeln; stride/frames sollte ganzzahlig sein
    duty: 0.6, // Anteil des Zyklus, in dem ein Fuß am Boden ist
    stanceX: 1.8,
    lift: 3.0,
    toeUp: 0.35,
    toeDown: 0.6,
    bob: 0.5,
    sway: 0.6,
    hipTwist: 0.16,
    chestTwist: 0.2,
    lean: 0.05,
    armSwing: 0.42,
    elbow: 0.2,
    elbowSwing: 0.22,
  },
};

// Dicker Mann mit Hut: gleiches Skelett, andere Maße, Zusätze für Bauch, Hut und Schnurrbart.
const fatman = {
  name: 'fatman',
  kind: 'biped',
  cell: { w: 32, h: 48, baseline: 46 },
  camera: hero.camera,
  shading: hero.shading,
  outline: '#1b1622',
  eye: '#1b1622',
  materials: {
    skin: ['#a8644a', '#dc9a78', '#f4c9a6'],
    hair: ['#6b6660', '#a39d94', '#a39d94'],
    jacket: ['#6e2f4a', '#a04a66', '#c9708a'],
    pants: ['#2c3350', '#454f78', '#6672a0'],
    boots: ['#1b1622', '#3a2c30', '#3a2c30'],
    hat: ['#3d2a1e', '#6b4a2c', '#96703f'],
  },
  extras: [
    { at: 'pelvis', pos: [0, 3.4, 2.4], r: [5.6, 4.8, 4.6], mat: 'jacket' }, // Bauch
    { at: 'head', pos: [0, 2.7, 0.2], r: [5.4, 0.8, 5.6], mat: 'hat' }, // Krempe
    { at: 'head', pos: [0, 4.3, 0], r: [3.7, 2.6, 3.9], mat: 'hat' }, // Hutkopf
    { at: 'head', pos: [0, -1.6, 3.5], r: [2.0, 0.7, 0.8], mat: 'hair' }, // Schnurrbart
  ],
  body: {
    standHip: 19.3, walkHip: 18.8, hipX: 3.2, hipDrop: 1.2,
    thigh: 8, shin: 8, ankle: 2.2, footLen: 3.8, footR: 1.4,
    spine: 8, torsoY: 4.2, shoulderX: 6.6, shoulderY: 1.0, armSpread: 0.28,
    upperArm: 6, foreArm: 5.5, neck: 2.3, headY: 3.6, headZ: 0.5,
    head: [3.8, 3.9, 3.9], torso: [6.4, 6.6, 5.0], pelvis: [5.8, 3.6, 4.6],
    armR: [1.9, 1.6, 1.35], handR: 1.4, legR: [2.9, 2.3, 1.8], bootR: [2.2, 1.9], neckR: 1.8,
  },
  gait: {
    frames: 6, stride: 12, duty: 0.62, stanceX: 2.9, lift: 2.2, toeUp: 0.3, toeDown: 0.45,
    bob: 0.4, sway: 1.1, hipTwist: 0.1, chestTwist: 0.14, lean: -0.03,
    armSwing: 0.3, elbow: 0.25, elbowSwing: 0.15,
  },
};

// Hund: Vierbeiner im Trab.
const dog = {
  name: 'dog',
  kind: 'dog',
  cell: { w: 32, h: 24, baseline: 22 },
  camera: hero.camera,
  shading: hero.shading,
  outline: '#1b1622',
  eye: '#1b1622',
  eyeOn: 'fur',
  materials: {
    fur: ['#8a5a2b', '#c98a3e', '#e8b866'],
    ear: ['#4a2f1c', '#6e4526', '#6e4526'],
    nose: ['#1b1622', '#1b1622', '#1b1622'],
    collar: ['#8f2430', '#c8343c', '#c8343c'],
  },
  dog: {
    height: 12.5, hipZ: -7, shoulderZ: 4, rearR: 2.7, chestR: 3.3,
    headY: 17, headZ: 8, legX: 2.0, upper: 5.2, lower: 5.2, paw: 1.1,
  },
  gait: { frames: 6, stride: 12, duty: 0.55, lift: 2.4, toeUp: 0, toeDown: 0, bob: 0.35, wag: 1.8 },
};

export const characters = [hero, fatman, dog];
