// LUMEN BAY — all static data: the city layout, the 15 story jobs, the
// police roster, the garage catalogue, turf spots and shot HUD pins.
// Nothing here moves; the game logic in main.js reads it.

export const SAVE_KEY = 'lumenbay.save.v1';
export const START_CASH = 1200;
export const START_REP = 0;

// World: x east, z south. Torre Boulevard (the chase road) runs east-west
// on z = 215. North sidewalk z ~206, beach-side sidewalk z ~225, sand
// z 228-244, sea z > 244. The road band peds must never enter is z 208-222.
export const WORLD = {
  minX: -60, maxX: 320, minZ: 110, maxZ: 300,
  roadZ: 215, roadHalf: 8,
  northWalkZ: 206, southWalkZ: 225,
  sandZ0: 228, sandZ1: 244, seaZ: 244,
  roadBandLo: 208, roadBandHi: 222,
  heroSpawn: { x: 90, z: 215, heading: -Math.PI / 2 }, // nose west, toward camera
};

export const DISTRICTS = [
  { name: 'MARINA', x: 20, z: 140 }, { name: 'MERCADO VIEJO', x: 105, z: 140 },
  { name: 'TORRE', x: 180, z: 140 }, { name: 'FAROL ROJO', x: 255, z: 140 },
  { name: 'TALLER', x: 20, z: 200 }, { name: 'OLD TOWN', x: 105, z: 200 },
  { name: 'CASINO ROW', x: 180, z: 200 }, { name: 'FESTIVAL SQ', x: 255, z: 200 },
  { name: 'PLAYA DORADA', x: 20, z: 262 }, { name: 'NORTH DOCKS', x: 105, z: 262 },
  { name: 'DUNES', x: 180, z: 262 }, { name: 'HILLSIDE', x: 255, z: 262 },
];

export const STREETS = [
  { name: 'MARINA RD', x1: 0, z1: 128, x2: 300, z2: 128 },
  { name: 'OCEAN BLVD', x1: 40, z1: 120, x2: 40, z2: 290 },
  { name: 'PALM AVE', x1: 120, z1: 120, x2: 120, z2: 290 },
  { name: 'MERCADO ST', x1: 175, z1: 120, x2: 175, z2: 290 },
  { name: 'CASINO AVE', x1: 225, z1: 120, x2: 225, z2: 290 },
  { name: 'TORRE BLVD', x1: 275, z1: 120, x2: 275, z2: 290 },
  { name: 'FESTIVAL AVE', x1: 0, z1: 185, x2: 300, z2: 185 },
  { name: 'MIRAMAR STRIP', x1: 0, z1: 250, x2: 300, z2: 250 },
  { name: 'PLAYA DR', x1: 0, z1: 215, x2: 300, z2: 215 },
];

export const STREET_LABELS = [
  { name: 'DUNES — Torre Boulevard', x: 90, z: 215 },
  { name: 'DUNES — Festival Avenue', x: 60, z: 220 },
  { name: 'PLAYA DORADA — Ocean Boulevard', x: -20, z: 244 },
  { name: 'MARINA — Marina Road', x: 30, z: 140 },
  { name: 'OLD TOWN — Mercado Street', x: 150, z: 185 },
];

// The 15 story jobs. Rewards sum to 38,500; with the 1,200 starting cash
// a full playthrough ends on $39,700. Shoot jobs set their kill counts so
// a full playthrough records 19 kills (4 + 5 + 4 + 6).
export const MISSIONS = [
  { id: 1, name: 'FIRST KEYS', title: 'First Keys', kind: 'steal', reward: 1200, rep: 20,
    brief: 'Steal the Veloz Comet RS from the marina.',
    target: { x: 30, z: 232, label: 'MARINA — steal the Comet RS' }, car: 'comet' },
  { id: 2, name: 'THE DROP', title: 'The Drop', kind: 'deliver', reward: 1400, rep: 25,
    brief: 'Deliver the package to Mercado Viejo in 90 seconds.',
    target: { x: 120, z: 185, label: 'MERCADO VIEJO — deliver the package' }, time: 90 },
  { id: 3, name: 'HOT WHEELS', title: 'Hot Wheels', kind: 'escape', reward: 1600, rep: 25,
    brief: 'Lose the 2-star heat tail on Torre Boulevard.',
    target: { x: 260, z: 215, label: 'TORRE BLVD — lose the tail' }, wanted: 2 },
  { id: 4, name: 'THE MARINA JOB', title: 'The Marina Job', kind: 'drive', reward: 1800, rep: 30,
    brief: "Pick up Lena's cargo at the docks, dodge the patrols.",
    target: { x: 20, z: 262, label: 'NORTH DOCKS — pick up the cargo' } },
  { id: 5, name: 'PAYDAY', title: 'Payday', kind: 'shoot', reward: 2200, rep: 35, kills: 0,
    brief: 'Ambush the courier van, grab the cash, escape.',
    target: { x: 175, z: 185, label: 'MERCADO ST — ambush the courier van' } },
  { id: 6, name: 'THE INFORMANT', title: 'The Informant', kind: 'shoot', reward: 2000, rep: 35, kills: 4,
    brief: 'Rescue Dario from the police cordon — shootout on the sand.',
    target: { x: 60, z: 220, label: 'PLAYA DORADA — rescue Dario' } },
  { id: 7, name: 'HIGH TIDE', title: 'High Tide', kind: 'escape', reward: 2400, rep: 40,
    brief: 'Helicopter chase to the lighthouse — lose 4 stars.',
    target: { x: 285, z: 250, label: 'FAROL ROJO — reach the lighthouse' }, wanted: 4 },
  { id: 8, name: 'VAULT PREP', title: 'Vault Prep', kind: 'drive', reward: 2000, rep: 30,
    brief: 'Case the Torre Lumen vault and bring the crew the plans.',
    target: { x: 180, z: 150, label: 'TORRE — case the vault' } },
  { id: 9, name: 'GOLD RUN', title: 'Gold Run', kind: 'shoot', reward: 2600, rep: 40, kills: 5,
    brief: 'Hit the gold convoy on Casino Avenue and take the bars.',
    target: { x: 225, z: 185, label: 'CASINO AVE — hit the gold convoy' } },
  { id: 10, name: 'STREET HEAT', title: 'Street Heat', kind: 'drive', reward: 2200, rep: 35,
    brief: 'Outrun the LCPD roadblock on Ocean Boulevard.',
    target: { x: 40, z: 130, label: 'OCEAN BLVD — break the roadblock' } },
  { id: 11, name: 'CASINO ROW', title: 'Casino Row', kind: 'shoot', reward: 2400, rep: 40, kills: 4,
    brief: 'Clear the casino guards and lift the night take.',
    target: { x: 225, z: 200, label: 'CASINO ROW — lift the night take' } },
  { id: 12, name: 'STREET KING', title: 'Street King', kind: 'race', reward: 3600, rep: 50,
    brief: 'Win the street race — 8 checkpoints.',
    target: { x: 90, z: 215, label: 'TORRE BLVD — win the street race' }, checkpoints: 8 },
  { id: 13, name: 'LIGHTHOUSE RUN', title: 'Lighthouse Run', kind: 'deliver', reward: 2800, rep: 45,
    brief: 'Run the ledger to the lighthouse before the tide turns.',
    target: { x: 285, z: 250, label: 'FAROL ROJO — deliver the ledger' }, time: 120 },
  { id: 14, name: 'THE LAST SUNSET', title: 'The Last Sunset', kind: 'drive', reward: 2300, rep: 45,
    brief: 'One last drive down the Playa — bring the crew home.',
    target: { x: 60, z: 215, label: 'PLAYA DR — bring the crew home' } },
  { id: 15, name: 'EL PUERTO ES NUESTRO', title: 'El Puerto Es Nuestro', kind: 'shoot', reward: 8000, rep: 100, kills: 6,
    brief: 'Storm the Torre Lumen vault guards (4), crack the vault, NOS chase to the boat.',
    target: { x: 180, z: 150, label: 'TORRE — storm the vault' },
    stages: ['Storm the Torre Lumen vault guards (4)', 'Crack the tower vault (hold E)', 'NOS chase — escape to Playa Dorada'] },
];

export const POLICE_UNITS = [
  { name: 'PELICAN-11', status: 'CHASING' }, { name: 'GECKO-25', status: 'CHASING' },
  { name: 'BARRACUDA-18', status: 'FLANKING' }, { name: 'TAC-45', status: 'FLANKING' },
  { name: 'AIR-1', status: 'SPOTLIGHT' },
];

export const CAR_DEFS = {
  comet: { name: 'Veloz Comet RS', colour: 0xd2001a, topSpeed: 62, accel: 26, grip: 2.6 },
  sedan: { name: 'Lumen Sedan', colour: 0x8a94a6, topSpeed: 42, accel: 18, grip: 2.0 },
  taxi: { name: 'Sol Taxi', colour: 0xf2b705, topSpeed: 44, accel: 19, grip: 2.0 },
  van: { name: 'Courier Van', colour: 0xe8e4da, topSpeed: 36, accel: 14, grip: 1.8 },
  police: { name: 'LCPD Cruiser', colour: 0x111318, topSpeed: 54, accel: 24, grip: 2.4 },
};

export const TRAFFIC_COLOURS = [0x8a94a6, 0x2e6f8e, 0xc75b39, 0x4a7c59, 0xd8d3c8, 0x6b4a8a, 0x3a3f4a];

export const GARAGE_UPGRADES = [
  { id: 'engine1', name: 'Engine Lv1', cost: 800, desc: '+12 top speed', topSpeed: 12 },
  { id: 'engine2', name: 'Engine Lv2', cost: 1500, desc: '+10 top speed', topSpeed: 10, needs: 'engine1' },
  { id: 'armour1', name: 'Armour Plating', cost: 1000, desc: '+40 max armour', armour: 40 },
  { id: 'nos1', name: 'NOS Tank XL', cost: 900, desc: '+50 NOS capacity', nos: 50 },
  { id: 'paint1', name: 'Pearl Paint', cost: 600, desc: 'Pearl rosso paint', paint: true },
];

export const TURF_SPOTS = [
  { name: 'Marina', x: 30, z: 140 }, { name: 'Mercado', x: 105, z: 140 },
  { name: 'Torre', x: 180, z: 140 }, { name: 'Farol', x: 255, z: 140 },
  { name: 'Taller', x: 20, z: 200 }, { name: 'Old Town', x: 105, z: 200 },
  { name: 'Casino Row', x: 180, z: 200 }, { name: 'Festival Sq', x: 255, z: 200 },
  { name: 'Playa', x: 20, z: 262 }, { name: 'Docks', x: 105, z: 262 },
  { name: 'Dunes', x: 180, z: 262 }, { name: 'Hillside', x: 255, z: 262 },
];

// Which turf spots each mission hands to Mara (8 of 12 across the story).
export const MISSION_TURF = { 2: 1, 4: 1, 5: 1, 7: 1, 9: 1, 11: 1, 12: 1, 15: 1 };

export const WEAPONS = [
  { id: 'fists', name: 'FISTS', ammo: Infinity, damage: 12, range: 2.2 },
  { id: 'pistol', name: 'PISTOL', ammo: Infinity, damage: 34, range: 60 },
  { id: 'smg', name: 'SMG', ammo: 30, maxAmmo: 120, damage: 22, range: 55 },
];

export const RADIO = { station: 'RADIO SOL 101.9 — Sol Hits', track: 'Sol Hits' };

// Per-shot HUD pins: the exact numbers the four screenshots show.
export const SHOT_PINS = {
  1: { job: 12, cash: 18450, clock: '22:40', speed: 117, gear: 4, wanted: 5, weapon: 'pistol',
       street: 'DUNES — Torre Boulevard', turf: 1, title: 'JOB 12: STREET KING',
       objective: 'Win the street race — 8 checkpoints', stage: 'STAGE 1/1 · +$3600 · STORY 12/15 · REP 290',
       next: 'NEXT: Win the street race — 8 checkpoints', banner: 'VEHICLE STOLEN: VELOZ COMET RS' },
  2: { job: 15, cash: 21700, clock: '18:45', speed: 0, gear: 0, wanted: 5, weapon: 'pistol',
       street: 'DUNES — Festival Avenue', turf: 1, title: 'JOB 15: EL PUERTO ES NUESTRO',
       objective: 'Storm the Torre Lumen vault guards (4)', stage: 'STAGE 1/3 · +$8000 · STORY 15/15 · REP 290',
       next: 'NEXT: Storm the Torre Lumen vault guards (4)', banner: null },
  3: { job: 15, cash: 48500, clock: '21:40', speed: 0, gear: 0, wanted: 5, weapon: 'smg',
       street: 'TORRE — City Map', turf: 1, title: 'JOB 15: EL PUERTO ES NUESTRO',
       objective: 'NOS chase — escape to Playa Dorada', stage: 'STAGE 3/3 · +$8000 · STORY 15/15 · REP 290',
       next: 'NEXT: NOS chase — escape to Playa Dorada', banner: null, starsRed: true },
  4: { job: 15, cash: 21400, clock: '06:10', speed: 0, gear: 1, wanted: 0, weapon: 'pistol',
       street: 'PLAYA DORADA — Ocean Boulevard', turf: 12, title: 'STORY COMPLETE',
       objective: 'El puerto es nuestro — Puerto Lumen is yours', stage: 'STAGE 15/15 · +$8000 · STORY 15/15 · REP 290',
       next: 'NEXT: Free roam — rob, race, take turf', banner: null },
};

export const CREW = {
  mara: { name: 'MARA', colour: 0xff7a1a, line: 'Beach is hot — heli on us, cash in the air. Hold the door!' },
  tio: { name: 'TIO REYES', colour: 0x2e6f8e, line: 'Dawn breaks over the marina, Mara. The boat is waiting — Puerto Lumen is ours.' },
  lena: { name: 'LENA CRUZ', colour: 0x7a4a8a, line: 'Vault codes are in. Five stars means everybody — move.' },
  dario: { name: 'BIG DARIO', colour: 0x4a7c59, line: 'I drive, you shoot. Same as always, Mara.' },
};
