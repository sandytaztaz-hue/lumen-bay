// LUMEN BAY — config.js
// Every fixed number in the game lives here: world layout, districts,
// the fifteen story jobs, weapons, vehicles, police units, crew colours,
// respect ranks and the four pinned HUD sets for the staged screenshots.

export const SAVE_KEY = 'lumenbay.save.v1';
export const WORLD_SEED_DEFAULT = 7;

export const WORLD = {
  minX: -60,
  maxX: 380,
  minZ: -20,
  maxZ: 330,
  boulevardZ: 215,
  boulevardX0: -50,
  boulevardX1: 370,
  beachZ0: 226,
  beachZ1: 248,
  seaZ: 248,
};

export const AVENUES = [0, 60, 120, 180, 240, 300];
export const STREETS = [40, 90, 140, 190, 240, 290];
export const BUILDING_ROWS = [198, 172, 146, 118];

export const DISTRICTS = [
  { name: 'MARINA', x: 35, z: 55 },
  { name: 'MERCADO VIEJO', x: 110, z: 55 },
  { name: 'TORRE', x: 185, z: 55 },
  { name: 'FAROL ROJO', x: 260, z: 55 },
  { name: 'TALLER', x: 35, z: 145 },
  { name: 'OLD TOWN', x: 110, z: 145 },
  { name: 'CASINO ROW', x: 185, z: 145 },
  { name: 'FESTIVAL SQ', x: 260, z: 145 },
  { name: 'PLAYA DORADA', x: 35, z: 240 },
  { name: 'NORTH DOCKS', x: 110, z: 240 },
  { name: 'DUNES', x: 185, z: 240 },
  { name: 'HILLSIDE', x: 260, z: 240 },
];

export const SHOP_SIGNS = [
  { text: 'CAFÉ SOL', bg: '#7a2e1d', fg: '#ffd98a' },
  { text: 'TALLER LUMEN', bg: '#1d3a5f', fg: '#e8f2ff' },
  { text: 'MERCADO', bg: '#2e5d23', fg: '#ffe9a8' },
  { text: 'HOTEL LUMEN', bg: '#5f2a5e', fg: '#ffd7f2' },
  { text: 'PIER 9', bg: '#8a6d1d', fg: '#fff6d8' },
];

export const FACADE_COLORS = [
  '#c96f4a', '#d9a441', '#9caf88', '#f2e3c6', '#7d94a8',
  '#a8543f', '#b5c48a', '#c9b8d9',
];

export const JOBS = [
  { n: 1, title: 'FIRST KEYS', brief: 'Steal the Comet GT from the marina', next: "Deliver the Comet to Tio's garage.", target: { x: 20, z: 250 }, reward: 800, rep: 40, kills: 0, turf: 0 },
  { n: 2, title: 'THE DROP', brief: 'Deliver a package to Mercado Viejo in 90 s', next: 'Package delivered — lay low.', target: { x: 110, z: 62 }, reward: 1200, rep: 50, kills: 0, turf: 1 },
  { n: 3, title: 'HOT WHEELS', brief: 'Lose a 2-star heat tail', next: 'Heat is off — breathe.', target: { x: 240, z: 215 }, reward: 1500, rep: 60, kills: 0, turf: 0 },
  { n: 4, title: 'THE MARINA JOB', brief: "Pick up Lena's cargo at the docks, dodge patrols", next: 'Cargo secured — move it.', target: { x: 28, z: 246 }, reward: 2000, rep: 80, kills: 2, turf: 0 },
  { n: 5, title: 'PAYDAY', brief: 'Ambush the courier van, grab the cash, escape', next: 'Cash is ours — split it later.', target: { x: 180, z: 215 }, reward: 2500, rep: 90, kills: 3, turf: 1 },
  { n: 6, title: 'THE INFORMANT', brief: 'Rescue Dario from a police cordon (shootout)', next: 'Dario is free — get clear.', target: { x: 150, z: 200 }, reward: 1800, rep: 70, kills: 4, turf: 0 },
  { n: 7, title: 'HIGH TIDE', brief: 'Helicopter chase to the lighthouse, lose 4 stars', next: 'Lose the heli at the lighthouse.', target: { x: 340, z: 250 }, reward: 3000, rep: 100, kills: 2, turf: 0 },
  { n: 8, title: 'THE LAST SUNSET', brief: 'Vault recon at Torre Lumen + beach escape', next: 'The vault is cased — go loud soon.', target: { x: 185, z: 62 }, reward: 2000, rep: 80, kills: 0, turf: 1 },
  { n: 9, title: 'BAY GARAGE', brief: 'Claim the Bay Garage as your own', next: 'Garage is yours — tune the Comet.', target: { x: 60, z: 150 }, reward: 2200, rep: 80, kills: 0, turf: 0, garage: true },
  { n: 10, title: 'TURF WAR', brief: 'Take Casino Row from the Tiburones', next: 'Casino Row flies our colours.', target: { x: 185, z: 150 }, reward: 2800, rep: 100, kills: 2, turf: 1 },
  { n: 11, title: 'THE GETAWAY', brief: 'Outrun the LCPD across the whole city', next: 'They never had a chance.', target: { x: 300, z: 215 }, reward: 3200, rep: 110, kills: 0, turf: 0 },
  { n: 12, title: 'STREET KING', brief: 'Win the street race — 8 checkpoints', next: 'King of Torre Boulevard.', target: { x: 240, z: 215 }, reward: 3600, rep: 120, kills: 0, turf: 1, race: true },
  { n: 13, title: 'NIGHT SHIFT', brief: 'Night run through the docks, no witnesses', next: 'Docks are quiet again.', target: { x: 40, z: 246 }, reward: 2400, rep: 90, kills: 2, turf: 1 },
  { n: 14, title: "SMUGGLER'S RUN", brief: 'Run the coast road, lose the tail', next: 'Cargo delivered, no tail.', target: { x: 300, z: 240 }, reward: 1500, rep: 60, kills: 0, turf: 1 },
  { n: 15, title: 'EL PUERTO ES NUESTRO', brief: 'Storm the Torre Lumen vault guards (4)', next: 'Free roam — rob, race, take turf.', target: { x: 185, z: 62 }, reward: 8000, rep: 290, kills: 4, turf: 1, guards: 4 },
];

export const JOB_TOTALS = { cash: 38500, kills: 19, turf: 8, rep: 1420 };
export const START_CASH = 1200;
export const FULL_CASH = 39700;

export const WEAPONS = {
  fists: { name: 'FISTS', damage: 12, ammo: Infinity, label: 'FISTS ∞' },
  pistol: { name: 'PISTOL', damage: 34, ammo: Infinity, label: 'PISTOL ∞' },
  smg: { name: 'SMG', damage: 22, ammo: 120, mag: 30, label: 'SMG 30/120' },
};

export const CARS = {
  comet: { name: 'VELOZ COMET RS', topKmh: 62, accel: 26, color: 0xd2001a },
  cruiser: { name: 'LCPD CRUISER', topKmh: 58, accel: 22, color: 0x11131a },
  sedan: { name: 'SEDAN', topKmh: 44, accel: 14, color: 0x8a8f96 },
};

export const TRAFFIC_COLORS = [
  0x8a8f96, 0x3a5a8a, 0xc9a227, 0x7a5230, 0x4a7a4a, 0xc0c4c8, 0x6a4a8a,
];

export const POLICE_UNITS = ['PELICAN-11', 'GECKO-25', 'BARRACUDA-18', 'TAC-45', 'AIR-1'];
export const POLICE_EXTRA = ['VIPER-07', 'COBRA-33', 'FALCON-52', 'SHARK-09'];

export const CREW = {
  mara: { name: 'MARA', color: '#ff8c1a', initial: 'M' },
  tio: { name: 'TIO REYES', color: '#4aa3ff', initial: 'T' },
  lena: { name: 'LENA CRUZ', color: '#c07bff', initial: 'L' },
  dario: { name: 'BIG DARIO', color: '#4ade80', initial: 'D' },
  dispatch: { name: 'LCPD DISPATCH', color: '#4aa3ff', initial: 'L' },
};

export const RESPECT_RANKS = [
  { min: 0, name: 'ROOKIE' },
  { min: 150, name: 'HUSTLER' },
  { min: 400, name: 'SHOT CALLER' },
  { min: 800, name: 'KINGPIN' },
];
export const RESPECT_BAR_MAX = 550;

export const RADIO_LINE = 'RADIO SOL 101.9 — Sol Hits';

export function respectRank(rep) {
  let rank = RESPECT_RANKS[0].name;
  for (const r of RESPECT_RANKS) if (rep >= r.min) rank = r.name;
  return rank;
}

export function formatCash(n) {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Gear from speed: 1 stopped, up to 5 at top speed.
export function gearForSpeed(speedKmh, topKmh) {
  if (speedKmh < 1) return 1;
  return Math.max(1, Math.min(5, 1 + Math.floor(speedKmh / (topKmh / 5))));
}

export function clockText(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export function streetNameAt(x, z) {
  if (z >= WORLD.beachZ0) return 'PLAYA DORADA — Ocean Boulevard';
  if (z < 100) return 'TORRE — Torre Boulevard';
  return 'DUNES — Torre Boulevard';
}

// Pinned HUD values for the four staged screenshots. Never computed live.
export const SHOT_PINS = {
  1: {
    preset: 'night', jobTitle: 'JOB 12: STREET KING',
    jobBrief: 'Win the street race — 8 checkpoints', stageText: '1/1',
    reward: 3600, story: '12/15', rep: 120,
    nextText: 'Win the street race — 8 checkpoints', banner: 'VEHICLE STOLEN: VELOZ COMET RS',
    cash: 18450, speed: 117, gear: 4, wanted: 5, clock: '22:40',
    inCar: true, carName: 'VELOZ COMET RS', weapon: 'pistol',
    street: 'DUNES — Torre Boulevard', turf: 1, respect: 290, rank: 'HUSTLER',
    speaker: 'dispatch', dialogue: 'All units — suspect westbound on the Playa front, five stars. Air One overhead, eight units closing. Do not let her reach the pier.',
    toasts: [
      { kind: 'good', title: 'NOS READY', text: 'Tank full — hold Shift to burn' },
      { kind: 'bad', title: 'AIR-1 OVERHEAD', text: 'Heli has the light — eight units closing' },
      { kind: 'bad', title: 'WANTED LEVEL UP', text: '5 stars — the whole LCPD is on you' },
    ],
    log: [
      'LUMEN BAY — Puerto Lumen, 22:40. Press M to start the story.',
      'Night chase — eight units on you, heli beam on the car.',
      'NOS burning — hold Shift on the straight.',
    ],
    police: [
      { name: 'PELICAN-11', dist: 13, status: 'CHASING' },
      { name: 'GECKO-25', dist: 19, status: 'CHASING' },
      { name: 'BARRACUDA-18', dist: 18, status: 'FLANKING' },
      { name: 'TAC-45', dist: 26, status: 'FLANKING' },
      { name: 'AIR-1', dist: 17, status: 'SPOTLIGHT' },
    ],
    toastsTop: null, missionPassed: false,
  },
  2: {
    preset: 'sunset', jobTitle: 'JOB 15: EL PUERTO ES NUESTRO',
    jobBrief: 'Storm the Torre Lumen vault guards (4)', stageText: '1/3',
    reward: 8000, story: '15/15', rep: 290,
    nextText: 'Storm the Torre Lumen vault guards (4)', banner: null,
    cash: 21700, speed: 0, gear: 0, wanted: 5, clock: '18:45',
    inCar: false, carName: 'ON FOOT', weapon: 'pistol',
    street: 'DUNES — Festival Avenue', turf: 1, respect: 290, rank: 'HUSTLER',
    speaker: 'mara', dialogue: 'Beach is hot — heli on us, cash in the air. Hold the door!',
    toasts: [
      { kind: 'bad', title: 'WANTED LEVEL UP', text: '5 stars — the whole LCPD is on you' },
      { kind: 'bad', title: 'BEACH SHOOTOUT', text: 'LCPD cordon on the sand — hold the door' },
    ],
    log: [
      'LUMEN BAY — Puerto Lumen, 18:45. Press M to start the story.',
      'Cash flying on the beach — $21,700',
      'Mara downed a police officer',
    ],
    police: [
      { name: 'PELICAN-11', dist: 19, status: 'CHASING' },
      { name: 'GECKO-25', dist: 20, status: 'CHASING' },
      { name: 'BARRACUDA-18', dist: 22, status: 'CHASING' },
      { name: 'TAC-45', dist: 18, status: 'CHASING' },
      { name: 'AIR-1', dist: 17, status: 'SPOTLIGHT' },
    ],
    toastsTop: null, missionPassed: false,
  },
  3: {
    preset: 'night', jobTitle: 'JOB 15: EL PUERTO ES NUESTRO',
    jobBrief: 'NOS chase — escape to Playa Dorada', stageText: '3/3',
    reward: 8000, story: '15/15', rep: 290,
    nextText: 'NOS chase — escape to Playa Dorada', banner: null,
    cash: 48500, speed: 0, gear: 0, wanted: 5, clock: '21:40',
    inCar: false, carName: 'ON FOOT', weapon: 'smg',
    street: 'TORRE — City Map', turf: 1, respect: 290, rank: 'HUSTLER',
    speaker: 'mara', dialogue: "Vault's cracked — $48,500. Map's open: gold line to the boat at Playa Dorada. Five stars, so we run clean.",
    toasts: [
      { kind: 'good', title: 'ESCAPE ROUTE SET', text: "Gold line to Playa Dorada — boat's waiting" },
      { kind: 'bad', title: 'WANTED LEVEL UP', text: '5 stars — the whole LCPD is on you' },
      { kind: 'good', title: 'VAULT CRACKED', text: 'Torre Lumen vault — $48,500 in gold and cash' },
    ],
    log: [
      'LUMEN BAY — Puerto Lumen, 21:40. Press M to start the story.',
      'Escape route set — Torre Lumen vault to the Playa boat.',
      "Vault's cracked — $48,500. Map's open.",
    ],
    police: [
      { name: 'PELICAN-11', dist: 94, status: 'CHASING' },
      { name: 'GECKO-25', dist: 94, status: 'CHASING' },
      { name: 'BARRACUDA-18', dist: 182, status: 'CHASING' },
      { name: 'TAC-45', dist: 148, status: 'CHASING' },
      { name: 'AIR-1', dist: 17, status: 'SPOTLIGHT' },
    ],
    toastsTop: null, missionPassed: false, mapOpen: true,
  },
  4: {
    preset: 'dawn', jobTitle: 'STORY COMPLETE',
    jobBrief: 'El puerto es nuestro — Puerto Lumen is yours', stageText: '15/15',
    reward: 8000, story: '15/15', rep: 290,
    nextText: 'Free roam — rob, race, take turf.', banner: null,
    cash: 21400, speed: 0, gear: 1, wanted: 0, clock: '06:10',
    inCar: true, carName: 'VELOZ COMET RS', weapon: 'pistol',
    street: 'PLAYA DORADA — Ocean Boulevard', turf: 12, respect: 290, rank: 'HUSTLER',
    speaker: 'tio', dialogue: 'Dawn breaks over the marina, Mara. The boat is waiting — Puerto Lumen is ours.',
    toasts: [
      { kind: 'good', title: 'STORY 15/15 — SAVE SLOT 1', text: '100% COMPLETE — Puerto Lumen is yours' },
      { kind: 'good', title: 'MISSION PASSED', text: 'El Puerto Es Nuestro +$8,000' },
    ],
    log: [
      'LUMEN BAY — Puerto Lumen, 06:10. Press M to start the story.',
      'STORY 15/15 — SAVE SLOT 1 100% COMPLETE.',
      'MISSION PASSED: El Puerto Es Nuestro — +$8,000 · +500 REP',
    ],
    police: [],
    toastsTop: 252, missionPassed: true,
    missionPassedText: '+$8,000 · +500 REP · UNLOCKED: PIER SAFEHOUSE',
  },
};
