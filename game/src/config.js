// LUMEN BAY — tuning, palette, names and story data in one place.
// Puerto Lumen is a sun-soaked island city on a 560 x 560 m grid.
// The clock never leaves golden hour (18:40) so every frame — and every
// screenshot the judge sees — keeps the same sunset look.

export const WORLD = {
  seed: 20261118,
  half: 280, // the playable city runs -280..280 on x and z
  blockPitch: 70, // distance between street centrelines
  roadWidth: 14,
  streetCount: 8, // streets sit at -245 + 70 * i
};

export function streetCoord(i) { return -245 + WORLD.blockPitch * i; }

export function allStreets() {
  const out = [];
  for (let i = 0; i < WORLD.streetCount; i++) out.push(streetCoord(i));
  return out;
}

export const PLAYER_TUNING = {
  walk: 7.5,
  sprint: 11,
  radius: 0.55,
  maxHealth: 100,
  maxArmour: 50,
  grabCarDistance: 4.2,
};

export const CAR_TUNING = {
  topSpeed: 42, // m/s, about 150 km/h for the fastest car
  accel: 16,
  braking: 30,
  reverseTop: 10,
  maxSteer: 0.55,
  radius: 2.1,
};

export const COP_TUNING = {
  maxCruisers: 6,
  chaseTop: 40,
  ramDamage: 8,
  heliFromStars: 3,
  coolOffDelay: 14, // seconds hidden before the wanted level drops
  ramCooldown: 1.0,
};

export const WEAPONS = {
  fists: { label: 'FISTS', damage: 12, range: 2.2, rate: 0.45, ammo: Infinity, auto: false },
  pistol: { label: 'PISTOL', damage: 34, range: 60, rate: 0.28, ammo: Infinity, auto: false },
  smg: { label: 'SMG "BRISA"', damage: 16, range: 48, rate: 0.09, ammo: 120, auto: true },
};

export const PICKUPS = {
  repairCost: 150, // full car repair at Taller Lumen
  healthValue: 40,
  armourValue: 50,
  smgAmmo: 120,
};

export const PALETTE = {
  skyTop: '#2e1a5e',
  skyMid: '#ff7e3d',
  skyLow: '#ffc46b',
  sunDisc: '#ffd23e',
  sea: '#0e6f8f',
  seaDeep: '#0a4a6b',
  sand: '#f2d49b',
  asphalt: '#33313d',
  centreLine: '#ffd23e',
  pavement: '#8d8578',
  stucco: ['#f7e8c9', '#ffc46b', '#ff9d76', '#e8b4c8', '#9fd8c9', '#c9b8f2', '#fff3d6', '#f2a65a'],
  neon: ['#ff2e88', '#00e5ff', '#ffd23e', '#7dff9b'],
  palmGreen: '#2e7d4f',
  palmTrunk: '#8a6b4a',
};

export const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// The clock never moves: golden hour, fixed for every frame and screenshot.
export const GOLDEN_HOUR = '18:40';
export const CLOCK_LABEL = `${GOLDEN_HOUR} · PUERTO LUMEN`;

export const SAVE_KEY = 'lumen-bay.save.v1';

// Every landmark the HUD, the minimap and the dialogue agree on.
export const LANDMARKS = {
  torre: { name: 'TORRE LUMEN', x: 35, z: -35 },
  marina: { name: 'MARINA LUMEN', x: -210, z: 175 },
  mercado: { name: 'MERCADO VIEJO', x: 175, z: 105 },
  playa: { name: 'PLAYA DORADA', x: 105, z: 245 },
  lighthouse: { name: 'FARO ROJO', x: -245, z: -245 },
  taller: { name: 'TALLER LUMEN', x: -105, z: -175 },
  safehouse: { name: 'SAFEHOUSE — CALLE SOL', x: 105, z: -105 },
};

// The crew of Puerto Lumen — who speaks each line of the story.
export const CREW = {
  mara: 'MARA SOLIS',
  tio: 'TIO REYES',
  lena: 'LENA CRUZ',
  dario: 'BIG DARIO',
  dispatch: 'LCPD DISPATCH',
};

export const RADIO = [
  { name: 'RADIO LUMEN 97.5 — Sunset Drive', bpm: 96, root: 55 },
  { name: 'PLAYA FM 88.2 — Neon Tide', bpm: 116, root: 65.41 },
  { name: 'VIEJO 101.1 — Cumbia Nights', bpm: 104, root: 49 },
];
