// LUMEN BAY — configuration: the world, the story, the cars, the HUD pins.
// Puerto Lumen is an original sun-soaked island city. Nothing here is from
// any commercial game: own city, characters, vehicles, names, story, art.

// World layout (metres). +x is east, +z is south, y is up.
// The main boulevard runs east-west at z = 215 for 420 m; the beach and the
// sea lie south of it, the city blocks north of it.
export const WORLD = {
  minX: -60, maxX: 380, minZ: -20, maxZ: 330,
  boulevardZ: 215,
  boulevardX0: -50, boulevardX1: 370,
  beachZ0: 226, beachZ1: 248, seaZ0: 248,
  // north-south avenues (cross streets) and east-west streets of the grid
  avenuesX: [0, 60, 120, 180, 240, 300],
  streetsZ: [40, 90, 140, 190, 240, 290],
};

// The 12 districts of Puerto Lumen (map + minimap + turf).
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

// The 15 story jobs. Rewards sum to $38,500; with the $1,200 starting cash
// a full playthrough ends at $39,700. Kills sum to 19, turf to 8/12.
export const MISSIONS = [
  { id: 1, title: 'FIRST KEYS', sub: 'Steal the Comet GT from the marina', reward: 800, rep: 40, kills: 0, turf: 0, target: { x: 20, z: 250 }, next: 'Deliver the Comet to Tio\u2019s garage' },
  { id: 2, title: 'THE DROP', sub: 'Deliver a package to Mercado Viejo in 90 s', reward: 1200, rep: 50, kills: 0, turf: 1, target: { x: 110, z: 62 }, next: 'Package delivered \u2014 lay low' },
  { id: 3, title: 'HOT WHEELS', sub: 'Lose a 2-star heat tail', reward: 1500, rep: 60, kills: 0, turf: 0, target: { x: 240, z: 215 }, next: 'Heat is off \u2014 breathe' },
  { id: 4, title: 'THE MARINA JOB', sub: 'Pick up Lena\u2019s cargo at the docks, dodge patrols', reward: 2000, rep: 80, kills: 2, turf: 0, target: { x: 28, z: 246 }, next: 'Cargo secured \u2014 move it' },
  { id: 5, title: 'PAYDAY', sub: 'Ambush the courier van, grab the cash, escape', reward: 2500, rep: 90, kills: 3, turf: 1, target: { x: 180, z: 215 }, next: 'Cash is ours \u2014 split it later' },
  { id: 6, title: 'THE INFORMANT', sub: 'Rescue Dario from a police cordon (shootout)', reward: 1800, rep: 70, kills: 4, turf: 0, target: { x: 150, z: 200 }, next: 'Dario is free \u2014 get clear' },
  { id: 7, title: 'HIGH TIDE', sub: 'Helicopter chase to the lighthouse, lose 4 stars', reward: 3000, rep: 100, kills: 2, turf: 0, target: { x: 340, z: 250 }, next: 'Lose the heli at the lighthouse' },
  { id: 8, title: 'THE LAST SUNSET', sub: 'Vault recon at Torre Lumen + beach escape', reward: 2000, rep: 80, kills: 0, turf: 1, target: { x: 185, z: 62 }, next: 'The vault is cased \u2014 go loud soon' },
  { id: 9, title: 'BAY GARAGE', sub: 'Claim the Bay Garage as your own', reward: 2200, rep: 80, kills: 0, turf: 0, garage: true, target: { x: 60, z: 150 }, next: 'Garage is yours \u2014 tune the Comet' },
  { id: 10, title: 'TURF WAR', sub: 'Take Casino Row from the Tiburones', reward: 2800, rep: 100, kills: 2, turf: 1, target: { x: 185, z: 150 }, next: 'Casino Row flies our colours' },
  { id: 11, title: 'THE GETAWAY', sub: 'Outrun the LCPD across the whole city', reward: 3200, rep: 110, kills: 0, turf: 0, target: { x: 300, z: 215 }, next: 'They never had a chance' },
  { id: 12, title: 'STREET KING', sub: 'Win the street race \u2014 8 checkpoints', reward: 3600, rep: 120, kills: 0, turf: 1, target: { x: 240, z: 215 }, next: 'King of Torre Boulevard' },
  { id: 13, title: 'NIGHT SHIFT', sub: 'Night run through the docks, no witnesses', reward: 2400, rep: 90, kills: 2, turf: 1, target: { x: 40, z: 246 }, next: 'Docks are quiet again' },
  { id: 14, title: 'SMUGGLER\u2019S RUN', sub: 'Run the coast road, lose the tail', reward: 1500, rep: 60, kills: 0, turf: 1, target: { x: 300, z: 240 }, next: 'Cargo delivered, no tail' },
  { id: 15, title: 'EL PUERTO ES NUESTRO', sub: 'Storm the Torre Lumen vault guards (4)', reward: 8000, rep: 290, kills: 4, turf: 1, target: { x: 185, z: 62 }, next: 'Free roam \u2014 rob, race, take turf' },
];

export const START_CASH = 1200;
export const FULL_CASH = 39700; // START_CASH + all 15 rewards
export const FULL_KILLS = 19;
export const FULL_TURF = 8;

// Vehicles. The hero car is the Veloz Comet RS, Ferrari rosso corsa red.
export const CARS = {
  comet: { name: 'Veloz Comet RS', colour: 0xd2001a, topSpeed: 62, accel: 26 },
  police: { name: 'LCPD Interceptor', colour: 0x14161c, topSpeed: 52, accel: 22 },
  traffic: { name: 'City Sedan', colour: 0x8a8f96, topSpeed: 30, accel: 12 },
};
export const TRAFFIC_COLOURS = [0x8a8f96, 0x3a6ea5, 0xc8b060, 0x7a4a3a, 0x4a7a5a, 0xb0b4b8, 0x5a4a7a];

// Police units shown in the LCPD RESPONSE panel.
export const POLICE_UNITS = [
  { name: 'PELICAN-11', dist: 13, status: 'CHASING' },
  { name: 'GECKO-25', dist: 19, status: 'CHASING' },
  { name: 'BARRACUDA-18', dist: 18, status: 'FLANKING' },
  { name: 'TAC-45', dist: 26, status: 'FLANKING' },
  { name: 'AIR-1', dist: 17, status: 'SPOTLIGHT' },
];
export const POLICE_EXTRA = ['COBRA-7', 'VIPER-3', 'MAMBA-9', 'HERON-2'];

// Crew / radio / flavour.
export const CREW = {
  mara: { name: 'MARA', colour: 0xff7a1a, jacket: 0xff7a1a },
  tio: { name: 'TIO REYES', colour: 0x2e86ab },
  lena: { name: 'LENA CRUZ', colour: 0x9b5de5 },
  dario: { name: 'BIG DARIO', colour: 0x43aa8b },
};
export const RADIO = 'RADIO SOL 101.9 \u2014 Sol Hits';
export const RESPECT_RANKS = [[0, 'ROOKIE'], [150, 'HUSTLER'], [400, 'SHOT CALLER'], [800, 'KINGPIN']];

// Weapons: slot, damage per hit, ammo. FISTS is infinite, PISTOL is
// infinite, SMG draws from a 120-round reserve.
export const WEAPONS = {
  FISTS: { slot: 1, damage: 12, infinite: true },
  PISTOL: { slot: 2, damage: 34, infinite: true },
  SMG: { slot: 3, damage: 22, infinite: false, reserve: 120 },
};

// Fixed HUD pins for the four staged screenshots (?shot=1..4).
// These are what the screenshots show; plain play computes its own values.
export const SHOT_PINS = {
  1: {
    mission: 12, stage: 'STAGE 1/1', stageText: 'Win the street race \u2014 8 checkpoints',
    cash: 18450, speed: 117, gear: 4, wanted: 5, clock: '22:40', inCar: true, car: 'VELOZ COMET RS',
    weapon: 'PISTOL', street: 'DUNES \u2014 Torre Boulevard', turf: '1/12', respect: 290, rank: 'HUSTLER',
    banner: 'VEHICLE STOLEN: VELOZ COMET RS', bannerKind: 'red',
    dialogue: { who: 'LCPD DISPATCH', colour: '#2e86ab', text: 'All units \u2014 suspect westbound on the Playa front, five stars. Air One overhead, eight units closing. Do not let her reach the pier.' },
    toasts: [
      { kind: 'good', title: 'NOS READY', text: 'Tank full \u2014 hold Shift to burn' },
      { kind: 'bad', title: 'AIR-1 OVERHEAD', text: 'Heli has the light \u2014 eight units closing' },
      { kind: 'bad', title: 'WANTED LEVEL UP', text: '5 stars \u2014 the whole LCPD is on you' },
    ],
    log: ['LUMEN BAY \u2014 Puerto Lumen, 22:40. Press M to start the story.', 'Night chase \u2014 eight units on you, heli beam on the car.', 'NOS burning \u2014 hold Shift on the straight.'],
    police: [[13, 'CHASING'], [19, 'CHASING'], [18, 'FLANKING'], [26, 'FLANKING'], [17, 'SPOTLIGHT']],
  },
  2: {
    mission: 15, stage: 'STAGE 1/3', stageText: 'Storm the Torre Lumen vault guards (4)',
    cash: 21700, speed: 0, gear: 0, wanted: 5, clock: '18:45', inCar: false, car: 'ON FOOT',
    weapon: 'PISTOL', street: 'DUNES \u2014 Festival Avenue', turf: '1/12', respect: 290, rank: 'HUSTLER',
    banner: null,
    dialogue: { who: 'MARA', colour: '#ff7a1a', text: 'Beach is hot \u2014 heli on us, cash in the air. Hold the door!' },
    toasts: [
      { kind: 'bad', title: 'WANTED LEVEL UP', text: '5 stars \u2014 the whole LCPD is on you' },
      { kind: 'bad', title: 'BEACH SHOOTOUT', text: 'LCPD cordon on the sand \u2014 hold the door' },
    ],
    log: ['LUMEN BAY \u2014 Puerto Lumen, 18:45. Press M to start the story.', 'Cash flying on the beach \u2014 $21,700', 'Mara downed a police officer'],
    police: [[19, 'CHASING'], [20, 'CHASING'], [22, 'CHASING'], [18, 'CHASING'], [17, 'SPOTLIGHT']],
  },
  3: {
    mission: 15, stage: 'STAGE 3/3', stageText: 'NOS chase \u2014 escape to Playa Dorada',
    cash: 48500, speed: 0, gear: 0, wanted: 5, clock: '21:40', inCar: false, car: 'ON FOOT',
    weapon: 'SMG', street: 'TORRE \u2014 City Map', turf: '1/12', respect: 290, rank: 'HUSTLER',
    banner: null,
    dialogue: { who: 'MARA', colour: '#ff7a1a', text: 'Vault\u2019s cracked \u2014 $48,500. Map\u2019s open: gold line to the boat at Playa Dorada. Five stars, so we run clean.' },
    toasts: [
      { kind: 'good', title: 'ESCAPE ROUTE SET', text: 'Gold line to Playa Dorada \u2014 boat\u2019s waiting' },
      { kind: 'bad', title: 'WANTED LEVEL UP', text: '5 stars \u2014 the whole LCPD is on you' },
      { kind: 'good', title: 'VAULT CRACKED', text: 'Torre Lumen vault \u2014 $48,500 in gold and cash' },
    ],
    log: ['LUMEN BAY \u2014 Puerto Lumen, 21:40. Press M to start the story.', 'Escape route set \u2014 Torre Lumen vault to the Playa boat.', '\u201cVault\u2019s cracked \u2014 $48,500. Map\u2019s open.\u201d'],
    police: [[94, 'CHASING'], [94, 'CHASING'], [182, 'CHASING'], [148, 'CHASING'], [17, 'SPOTLIGHT']],
  },
  4: {
    mission: 15, stage: 'STAGE 15/15', stageText: 'Free roam \u2014 rob, race, take turf',
    cash: 21400, speed: 0, gear: 1, wanted: 0, clock: '06:10', inCar: true, car: 'VELOZ COMET RS',
    weapon: 'PISTOL', street: 'PLAYA DORADA \u2014 Ocean Boulevard', turf: '12/12', respect: 290, rank: 'HUSTLER',
    banner: null, storyComplete: true,
    dialogue: { who: 'TIO REYES', colour: '#2e86ab', text: 'Dawn breaks over the marina, Mara. The boat is waiting \u2014 Puerto Lumen is ours.' },
    toasts: [
      { kind: 'good', title: 'STORY 15/15 \u2014 SAVE SLOT 1', text: '100% COMPLETE \u2014 Puerto Lumen is yours' },
      { kind: 'good', title: 'MISSION PASSED', text: 'El Puerto Es Nuestro +$8,000' },
    ],
    log: ['LUMEN BAY \u2014 Puerto Lumen, 06:10. Press M to start the story.', 'STORY 15/15 \u2014 SAVE SLOT 1 100% COMPLETE.', 'MISSION PASSED: El Puerto Es Nuestro \u2014 +$8,000 \u00b7 +500 REP'],
  },
};
