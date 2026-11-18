// LUMEN BAY — configuration: world layout, landmarks, story missions, balance.
// Puerto Lumen is an original sun-soaked island city. Nothing here is copied
// from any commercial game: all names, characters and places are invented.
export const SAVE_KEY = 'lumenbay-save-r5';
export const STEP = 1 / 60;
export const WORLD_HALF = 240;
export const GOLDEN_HOUR = '18:40';
export const GAME_TITLE = 'LUMEN BAY: Sunset Getaway';

// Streets run on a grid; every street centre sits on one of these coordinates.
export const STREET_LINES = [-180, -90, 0, 90, 180];
export const STREET_WIDTH = 12;

// Landmark positions (x, z) on the island. The marina is north, the beach south-west.
export const LANDMARKS = {
  tower: { x: 30, z: -168, label: 'Torre Lumen' },
  marina: { x: -30, z: -205, label: 'Marina Lumen' },
  market: { x: 0, z: 0, label: 'Mercado Viejo' },
  beach: { x: -195, z: 165, label: 'Playa Dorada' },
  lighthouse: { x: -218, z: 218, label: 'Farol Rojo' },
  garage: { x: 96, z: 96, label: 'Taller Lumen' },
  safehouse: { x: -96, z: 96, label: 'Safehouse' },
  casino: { x: 168, z: -96, label: 'Casino del Sol' },
  docks: { x: -60, z: -205, label: 'Docks' },
  coast: { x: -195, z: -60, label: 'Coast Road' },
  dunes: { x: -160, z: 200, label: 'Dunes' },
  boat: { x: -150, z: -215, label: 'Escape Boat' },
};

export const SPAWN = { x: -96, z: 120 };
export const COMET_GT = { x: -30, z: -195 };

// Sunset palette: warm orange sky, pink haze, teal water, cream buildings.
export const PALETTE = {
  skyTop: 0x2e4a7a,
  skyHorizon: 0xff8c42,
  sun: 0xffd27a,
  fog: 0xf2a35e,
  water: 0x1e6f8e,
  sand: 0xe8c98a,
  asphalt: 0x3a3a44,
  building: [0xf2e3c6, 0xe8b4a0, 0xf7d774, 0x9fc5c9, 0xe07856, 0xc9d6a3, 0xf0a35e],
  neon: [0xff2e88, 0x2ee6ff, 0xffe14d, 0x7dff5e, 0xff6b35],
  palm: 0x2f7d4f,
  trunk: 0x8a6b4a,
};

// Player and vehicle tuning (arcade, forgiving, fast to feel good).
export const PLAYER = {
  walkSpeed: 7,
  sprintSpeed: 11,
  radius: 0.7,
  maxHealth: 100,
  maxArmour: 100,
};

export const CAR = {
  accel: 26,
  brake: 42,
  reverse: 12,
  maxSpeed: 46,
  maxReverse: 14,
  steer: 1.9,
  grip: 6,
  handbrakeGrip: 2.2,
};

export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, rate: 0.28, range: 90, spread: 0.012, auto: false },
  smg: { name: 'SMG', damage: 18, rate: 0.085, range: 70, spread: 0.035, auto: true },
};

export const WANTED = {
  decayPerSecond: 0.12,
  decayHiddenBonus: 0.35,
  stealHeat: 1,
  shootHeat: 1,
  killHeat: 1,
  speedHeatSpeed: 34,
};

export const ECONOMY = {
  repairFee: 150,
  bustPenalty: 200,
  startCash: 500,
};

export const RADIO_STATIONS = [
  { name: 'LUMEN FM 88.4 — Sunset Synth', bpm: 96, root: 110, mood: 'drive' },
  { name: 'MARINA WAVE 101.2 — Neon Nights', bpm: 118, root: 98, mood: 'night' },
  { name: 'PLAYA CHILL 94.7 — Golden Hour', bpm: 76, root: 130.8, mood: 'chill' },
];

// Health / armour / weapon pickups scattered around the city.
export const PICKUPS = [
  { kind: 'health', x: -60, z: 60 },
  { kind: 'health', x: 60, z: -60 },
  { kind: 'health', x: -150, z: -120 },
  { kind: 'armour', x: 30, z: 60 },
  { kind: 'armour', x: -120, z: -30 },
  { kind: 'armour', x: 150, z: 30 },
  { kind: 'smg', x: 0, z: -120 },
  { kind: 'smg', x: -180, z: 30 },
  { kind: 'health', x: 120, z: 150 },
  { kind: 'armour', x: -30, z: 180 },
];

// The 12 story missions of Mara Solis, getaway driver of Puerto Lumen.
// Step kinds: goto (walk/drive to a marker), steal (enter a named car), pickup,
// deliver, wait (hold a spot while Lena hacks), evade (drop wanted to zero),
// shoot (defeat the cordon), escape (reach the marker with heat on).
// A mission's steps run in order; the last step completes it and pays cash.
export const MISSIONS = [
  {
    id: 1, title: 'First Keys', reward: 400,
    brief: 'Steal the Comet GT sports car from the marina docks and drive it to the safehouse.',
    dialogue: ["TIO REYES: Mara, the Comet GT is sitting at the marina. Keys in the sun visor. Bring her home.", "MARA: First job of the night. Easy money."],
    steps: [
      { kind: 'goto', x: -30, z: -195, label: 'Reach the Comet GT at Marina Lumen' },
      { kind: 'steal', x: -30, z: -195, label: 'Press E to steal the Comet GT' },
      { kind: 'deliver', x: -96, z: 96, label: 'Drive the Comet GT to the safehouse' },
    ],
  },
  {
    id: 2, title: 'The Drop', reward: 550,
    brief: 'Deliver a package to Mercado Viejo within 90 seconds. The clock is running.',
    dialogue: ["LENA CRUZ: Package is hot, Mara. Ninety seconds to Mercado Viejo. No sightseeing.", "MARA: Ninety seconds? I will do it in sixty."],
    steps: [
      { kind: 'deliver', x: 0, z: 0, label: 'Deliver the package to Mercado Viejo', seconds: 90 },
    ],
  },
  {
    id: 3, title: 'Hot Wheels', reward: 600,
    brief: 'Lose a 2-star police tail: stay out of police sight until the heat drops to zero.',
    dialogue: ["TIO REYES: You picked up a tail. Two stars. Break line of sight and let it cool off.", "MARA: They will be eating my dust by the beach."],
    steps: [
      { kind: 'evade', x: -195, z: 165, label: 'Lose the police — stay hidden until wanted hits 0' },
    ],
  },
  {
    id: 4, title: 'The Marina Job', reward: 750,
    brief: "Pick up Lena's cargo crate at the docks and deliver it to Taller Lumen, dodging patrol cars.",
    dialogue: ["LENA CRUZ: Crate is at the docks, bay four. Patrols are thick tonight — drive like you mean it.", "MARA: Cargo, garage, no scratches. Got it."],
    steps: [
      { kind: 'pickup', x: -60, z: -205, label: "Pick up Lena's crate at the docks" },
      { kind: 'deliver', x: 96, z: 96, label: 'Deliver the crate to Taller Lumen' },
    ],
  },
  {
    id: 5, title: 'Payday', reward: 1200,
    brief: 'Ambush the courier van on the coast road: shoot out its escort, grab the cash, escape to the safehouse.',
    dialogue: ["BIG DARIO: Courier van, coast road, one escort. Hit it hard, grab the bag, vanish.", "MARA: Payday. Let us make it a big one."],
    steps: [
      { kind: 'goto', x: -195, z: -60, label: 'Reach the courier van on the coast road' },
      { kind: 'shoot', x: -195, z: -60, label: 'Shoot out the escort and grab the cash', count: 3 },
      { kind: 'deliver', x: -96, z: 96, label: 'Escape with the cash to the safehouse' },
    ],
  },
  {
    id: 6, title: 'The Informant', reward: 900,
    brief: 'Rescue Dario from a police cordon in the market square: shoot the cordon police, reach Dario, drive him out.',
    dialogue: ["LENA CRUZ: Dario is pinned in Mercado Viejo — a full cordon. You are the only way out.", "MARA: Hold on, big man. I am coming through the front."],
    steps: [
      { kind: 'goto', x: 0, z: 0, label: 'Reach Mercado Viejo' },
      { kind: 'shoot', x: 0, z: 0, label: 'Break the cordon — take down the police', count: 4 },
      { kind: 'goto', x: 12, z: 6, label: 'Reach Dario' },
      { kind: 'deliver', x: -96, z: 96, label: 'Drive Dario out to the safehouse' },
    ],
  },
  {
    id: 7, title: 'Night Shift', reward: 1000,
    brief: 'Drive Lena to 3 hack checkpoints across the city while avoiding patrols; wait at each until her hack completes.',
    dialogue: ["LENA CRUZ: Three terminals, three hacks. Park me close, keep the engine running, keep the cops off.", "MARA: Taxi service with a hacker discount. Let us roll."],
    steps: [
      { kind: 'wait', x: 90, z: -90, label: 'Hack checkpoint 1 — hold position', seconds: 8 },
      { kind: 'wait', x: -90, z: -90, label: 'Hack checkpoint 2 — hold position', seconds: 8 },
      { kind: 'wait', x: 90, z: 150, label: 'Hack checkpoint 3 — hold position', seconds: 8 },
    ],
  },
  {
    id: 8, title: 'The Swap', reward: 1100,
    brief: 'Steal a police cruiser and deliver it to Taller Lumen for the crew. High heat guaranteed.',
    dialogue: ["TIO REYES: The crew needs a cruiser — a real one, with the light bar. Steal it, bring it to the garage.", "MARA: Stealing from the police. This is why I love this job."],
    steps: [
      { kind: 'stealPolice', x: 0, z: 90, label: 'Steal a police cruiser (press E near one)' },
      { kind: 'deliver', x: 96, z: 96, label: 'Deliver the cruiser to Taller Lumen' },
    ],
  },
  {
    id: 9, title: 'Beach Run', reward: 1300,
    brief: 'Smuggle crates along Playa Dorada: drive the coast road to the lighthouse within 120 seconds, avoiding beach patrols.',
    dialogue: ["BIG DARIO: Crates go to Farol Rojo, two minutes, beach patrols everywhere. Drive the sand line.", "MARA: Two minutes, one beach, zero witnesses."],
    steps: [
      { kind: 'deliver', x: -218, z: 218, label: 'Reach Farol Rojo lighthouse', seconds: 120 },
    ],
  },
  {
    id: 10, title: 'High Tide', reward: 1500,
    brief: 'Helicopter chase: reach the Farol Rojo lighthouse while a helicopter pursues at 4 stars, then lose the heat in the dunes.',
    dialogue: ["LENA CRUZ: Four stars, Mara — the helicopter is up. Lighthouse, then vanish into the dunes.", "MARA: Let them chase the sunset. I am already gone."],
    steps: [
      { kind: 'goto', x: -218, z: 218, label: 'Reach Farol Rojo with the helicopter on you' },
      { kind: 'evade', x: -160, z: 200, label: 'Lose the heat in the dunes' },
    ],
  },
  {
    id: 11, title: 'The Getaway', reward: 2500,
    brief: 'Rob the casino vault: fight through the guards on foot, grab the cash, escape by car to the marina boat.',
    dialogue: ["TIO REYES: Casino del Sol. Vault, guards, one boat waiting at the marina. This is the big one.", "MARA: Vault first, apologies later."],
    steps: [
      { kind: 'goto', x: 168, z: -84, label: 'Reach Casino del Sol' },
      { kind: 'shoot', x: 168, z: -96, label: 'Fight through the vault guards', count: 5 },
      { kind: 'pickup', x: 168, z: -84, label: 'Grab the vault cash' },
      { kind: 'deliver', x: -150, z: -215, label: 'Escape by car to the marina boat' },
    ],
  },
  {
    id: 12, title: 'The Last Sunset', reward: 5000,
    brief: 'Finale: vault heist at Torre Lumen, then a beach escape — drive the Comet GT down the coast road to the boat as the sun sets, with full police pursuit.',
    dialogue: ["TIO REYES: Torre Lumen. The last vault, the last sunset. Everything we ever wanted is in there.", "MARA: One last drive into the sunset. Let us finish this."],
    steps: [
      { kind: 'goto', x: 30, z: -168, label: 'Reach Torre Lumen' },
      { kind: 'shoot', x: 30, z: -168, label: 'Clear the tower guards', count: 5 },
      { kind: 'pickup', x: 30, z: -156, label: 'Grab the Torre Lumen vault cash' },
      { kind: 'deliver', x: -150, z: -215, label: 'Drive the Comet GT to the boat — final escape' },
    ],
  },
];

export const CREW = [
  { name: 'Mara Solis', role: 'Getaway driver — you' },
  { name: 'Tio Reyes', role: 'Fixer — plans the jobs' },
  { name: 'Lena Cruz', role: 'Hacker — cracks terminals' },
  { name: 'Big Dario', role: 'Wheelman — muscle and muscle cars' },
];
