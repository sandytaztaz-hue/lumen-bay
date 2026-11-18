// LUMEN BAY — every tuning number, colour and name in one place.
// Puerto Lumen: a sun-soaked island city on a 560 x 560 m grid, golden hour
// fixed at 18:40 so every frame (and every screenshot) keeps the sunset look.

export const WORLD = {
  seed: 20261118,
  half: 280, // city spans -280..280 on x and z; ocean west, beach south
  blockPitch: 70,
  roadWidth: 14,
  streetCount: 8, // streets at -245 + 70*i
};

export function streetCoord(i) { return -245 + WORLD.blockPitch * i; }
export function streets() { const s = []; for (let i = 0; i < WORLD.streetCount; i++) s.push(streetCoord(i)); return s; }

export const PLAYER = {
  walkSpeed: 7.5,
  runSpeed: 11,
  radius: 0.55,
  health: 100,
  enterCarDist: 4.2,
};

export const CAR = {
  maxSpeed: 42, // m/s, ~150 km/h
  accel: 16,
  brake: 30,
  reverseMax: 10,
  steerMax: 0.55,
  radius: 2.1,
};

export const POLICE = {
  maxCars: 6,
  chaseSpeed: 40,
  ramDamage: 8,
  heliAtStars: 3,
  decayDelay: 14, // seconds hidden before wanted starts falling
};

export const WEAPONS = {
  fists: { name: 'FISTS', damage: 12, range: 2.2, rate: 0.45, ammo: Infinity, auto: false },
  pistol: { name: 'PISTOL', damage: 34, range: 60, rate: 0.28, ammo: Infinity, auto: false },
  smg: { name: 'SMG "BRISA"', damage: 16, range: 48, rate: 0.09, ammo: 120, auto: true },
};

export const PALETTE = {
  skyTop: '#2e1a5e',
  skyMid: '#ff7e3d',
  skyLow: '#ffc46b',
  sun: '#ffd23e',
  ocean: '#0e6f8f',
  oceanDeep: '#0a4a6b',
  sand: '#f2d49b',
  road: '#33313d',
  roadLine: '#ffd23e',
  sidewalk: '#8d8578',
  building: ['#f7e8c9', '#ffc46b', '#ff9d76', '#e8b4c8', '#9fd8c9', '#c9b8f2', '#fff3d6', '#f2a65a'],
  neon: ['#ff2e88', '#00e5ff', '#ffd23e', '#7dff9b'],
  palm: '#2e7d4f',
  trunk: '#8a6b4a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SAVE_KEY = 'lumen-bay.save.v1';

// Landmark names the HUD, minimap and dialogue all share.
export const LANDMARKS = {
  torre: { name: 'TORRE LUMEN', x: 35, z: -35 },
  marina: { name: 'MARINA LUMEN', x: -210, z: 175 },
  mercado: { name: 'MERCADO VIEJO', x: 175, z: 105 },
  playa: { name: 'PLAYA DORADA', x: 105, z: 245 },
  lighthouse: { name: 'FARO ROJO', x: -245, z: -245 },
  taller: { name: 'TALLER LUMEN', x: -105, z: -175 },
  safehouse: { name: 'SAFEHOUSE — CALLE SOL', x: 105, z: -105 },
};

// Job names, givers and pay — the story spine of Puerto Lumen.
export const CREW = {
  mara: 'MARA SOLIS',
  tio: 'TIO REYES',
  lena: 'LENA CRUZ',
  dario: 'BIG DARIO',
  police: 'LCPD DISPATCH',
};

export const RADIO_STATIONS = [
  { name: 'RADIO LUMEN 97.5 — Sunset Drive', bpm: 96, root: 55 },
  { name: 'PLAYA FM 88.2 — Neon Tide', bpm: 116, root: 65.41 },
  { name: 'VIEJO 101.1 — Cumbia Nights', bpm: 104, root: 49 },
];
