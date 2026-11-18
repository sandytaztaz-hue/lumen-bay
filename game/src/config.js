// LUMEN BAY: Sunset Getaway — configuration, tuning and the 12 story missions.
// Puerto Lumen is an original sun-soaked island city. Nothing here is taken from
// any existing game: Mara Solis, Tio Reyes, Lena Cruz and Big Dario are original
// characters, and every street, landmark and mission below was written for this game.
// The playfield is a fixed-size island (metres) with a road grid, a marina on the
// south edge, a beach and lighthouse on the west edge, and ocean on two sides.
// The clock is fixed at golden hour, 18:40, so every frame keeps the sunset look.

export const STEP = 1 / 60;
export const WORLD = { half: 260, roadGap: 52, beachX: -236, seaLevel: -0.4 };
export const SAVE_KEY = 'lumen-bay.save.v5b';

// Golden-hour palette. Warm orange sky, pink haze on the horizon, long shadows.
export const PALETTE = {
  skyTop: 0x2e4a7a, skyMid: 0xff9a52, skyLow: 0xff5e7a, sun: 0xffd27a,
  fog: 0xf2a06b, sea: 0x1e6f8e, seaDeep: 0x0f4a6b, sand: 0xe8c98a,
  asphalt: 0x3a3a40, sidewalk: 0x9a8f7a, grass: 0x5d8a4a,
  building: [0xffb26b, 0xff8fa3, 0x7fd4c1, 0xffd166, 0xc9a0ff, 0x8ecae6, 0xf4a261, 0xe07a5f],
  neon: [0xff2e88, 0x00e5ff, 0xffe14d, 0x7cff6b, 0xff6b35],
};

export const PLAYER = {
  walkSpeed: 7.5, sprintSpeed: 12.5, accel: 42, radius: 0.9,
  health: 100, armour: 50, pistolDamage: 34, smgDamage: 18,
  pistolRate: 0.32, smgRate: 0.09, smgAmmo: 120,
};

export const CAR = {
  accel: 26, brake: 42, reverse: 12, maxSpeed: 46, maxReverse: 14,
  turn: 2.2, grip: 6.5, handbrakeTurn: 3.1, repairFee: 150,
};

export const WANTED = {
  decayDelay: 6, decayRate: 0.35, stealHeat: 1.2, shootHeat: 0.9,
  speedHeat: 0.25, killHeat: 1.5, maxStars: 5,
};

// Every landmark is a named place on the map with a fixed position. Missions,
// the minimap, the HUD compass and the shot staging all read these coordinates,
// so a mission target never drifts between sessions.
export const LANDMARKS = {
  safehouse:   { x: 30,  z: 120,  name: 'Safehouse',        blurb: 'Mara\u2019s flat above the bakery' },
  torre:       { x: -40, z: -150, name: 'Torre Lumen',      blurb: 'Clock tower on the marina' },
  marina:      { x: -180, z: -180, name: 'Marina Lumen',    blurb: 'Docks, boats and the Comet GT' },
  mercado:     { x: 90,  z: -60,  name: 'Mercado Viejo',    blurb: 'Market square, fruit stalls' },
  playa:       { x: -225, z: 40,  name: 'Playa Dorada',     blurb: 'Golden beach, surf shacks' },
  farol:       { x: -232, z: 190, name: 'Farol Rojo',       blurb: 'Red lighthouse at the point' },
  taller:      { x: 150, z: 90,   name: 'Taller Lumen',     blurb: 'Dario\u2019s garage, repairs here' },
  casino:      { x: -90, z: 60,   name: 'Casino Miramar',   blurb: 'Vault job, top floor' },
  boat:        { x: -205, z: -205, name: 'Escape Boat',     blurb: 'The boat out of Puerto Lumen' },
  coastRoad:   { x: -200, z: -40, name: 'Coast Road',       blurb: 'Cliff road above the surf' },
};

// The 12 story missions, in order. Each mission is a small state machine with
// stages: every stage has a verb (go / steal / deliver / wait / shoot / evade),
// a target position, a timer where the design needs one, and dialogue that plays
// when the stage starts. Rewards are cash paid on completion; the HUD banner and
// the event log both show the same stage text so the player is never lost.
export const MISSIONS = [
  {
    id: 1, name: 'First Keys', reward: 500, heat: 1,
    brief: 'Steal the Comet GT sports car from the marina docks and drive it home.',
    dialogue: [
      ['TIO REYES', 'Mara. The Comet GT is sitting at Marina Lumen, keys in it. Take it.'],
      ['MARA SOLIS', 'First job of the night. I\u2019ll bring her home in one piece.'],
    ],
    stages: [
      { verb: 'go',    text: 'Get to the Comet GT at Marina Lumen', x: -180, z: -180, radius: 6 },
      { verb: 'steal', text: 'Press E to steal the Comet GT', x: -180, z: -180, radius: 6 },
      { verb: 'drive', text: 'Drive the Comet GT to the safehouse', x: 30, z: 120, radius: 12 },
    ],
  },
  {
    id: 2, name: 'The Drop', reward: 750, heat: 0, timer: 90,
    brief: 'Deliver a package to Mercado Viejo within 90 seconds. No detours.',
    dialogue: [
      ['LENA CRUZ', 'Package is hot. Ninety seconds, Mara, or the buyer walks.'],
      ['MARA SOLIS', 'Ninety seconds across town? Hold on tight, package.'],
    ],
    stages: [
      { verb: 'drive', text: 'Deliver the package to Mercado Viejo — 90s!', x: 90, z: -60, radius: 10, timed: true },
    ],
  },
  {
    id: 3, name: 'Hot Wheels', reward: 900, heat: 2,
    brief: 'Lose a 2-star police tail. Stay out of police sight until the heat dies.',
    dialogue: [
      ['TIO REYES', 'Two cruisers on you. Break line of sight and let it cool off.'],
      ['MARA SOLIS', 'They can\u2019t catch what they can\u2019t see. Watch me vanish.'],
    ],
    stages: [
      { verb: 'evade', text: 'Lose the police — stay hidden until heat hits zero', x: 0, z: 0, radius: 999 },
    ],
  },
  {
    id: 4, name: 'The Marina Job', reward: 1100, heat: 1,
    brief: 'Pick up Lena\u2019s cargo crate at the docks and deliver it to Taller Lumen.',
    dialogue: [
      ['LENA CRUZ', 'My crate is at the docks. Patrol cars are circling — stay sharp.'],
      ['MARA SOLIS', 'Crate, garage, no scratches. Got it.'],
    ],
    stages: [
      { verb: 'go',     text: 'Pick up Lena\u2019s crate at Marina Lumen', x: -180, z: -180, radius: 6 },
      { verb: 'drive',  text: 'Deliver the crate to Taller Lumen', x: 150, z: 90, radius: 14 },
    ],
  },
  {
    id: 5, name: 'Payday', reward: 1500, heat: 2,
    brief: 'Ambush the courier van on the coast road, grab the cash, escape home.',
    dialogue: [
      ['BIG DARIO', 'Courier van, coast road, one escort. Hit it hard, grab the cash.'],
      ['MARA SOLIS', 'Payday. Let\u2019s make it a quick one.'],
    ],
    stages: [
      { verb: 'go',     text: 'Reach the courier van on the coast road', x: -200, z: -40, radius: 10 },
      { verb: 'shoot',  text: 'Shoot out the escort and grab the cash', x: -200, z: -40, radius: 14, kills: 2 },
      { verb: 'drive',  text: 'Escape with the cash to the safehouse', x: 30, z: 120, radius: 12 },
    ],
  },
  {
    id: 6, name: 'The Informant', reward: 1800, heat: 3,
    brief: 'Rescue Dario from a police cordon in the market square, then drive him out.',
    dialogue: [
      ['LENA CRUZ', 'Dario is pinned in Mercado Viejo. Cordon all around him.'],
      ['BIG DARIO', 'Mara! Get these cops off me and I owe you a lifetime of tacos.'],
    ],
    stages: [
      { verb: 'go',     text: 'Reach the cordon at Mercado Viejo', x: 90, z: -60, radius: 12 },
      { verb: 'shoot',  text: 'Clear the cordon police (3)', x: 90, z: -60, radius: 16, kills: 3 },
      { verb: 'go',     text: 'Reach Dario', x: 90, z: -60, radius: 5 },
      { verb: 'drive',  text: 'Drive Dario out to the safehouse', x: 30, z: 120, radius: 12 },
    ],
  },
  {
    id: 7, name: 'Night Shift', reward: 2000, heat: 1,
    brief: 'Drive Lena to 3 hack checkpoints across the city; wait at each until her hack completes.',
    dialogue: [
      ['LENA CRUZ', 'Three checkpoints, three hacks. Park on the mark and I do the rest.'],
      ['MARA SOLIS', 'Your chariot awaits, hacker. Try not to set off every alarm.'],
    ],
    stages: [
      { verb: 'wait', text: 'Hack checkpoint 1/3 — Torre Lumen (stay on the mark)', x: -40, z: -150, radius: 12, wait: 6 },
      { verb: 'wait', text: 'Hack checkpoint 2/3 — Playa Dorada (stay on the mark)', x: -225, z: 40, radius: 7, wait: 6 },
      { verb: 'wait', text: 'Hack checkpoint 3/3 — Taller Lumen (stay on the mark)', x: 150, z: 90, radius: 14, wait: 6 },
    ],
  },
  {
    id: 8, name: 'The Swap', reward: 2400, heat: 3,
    brief: 'Steal a police cruiser and deliver it to Taller Lumen for the crew.',
    dialogue: [
      ['TIO REYES', 'The crew needs a cruiser. Steal one and bring it to the garage.'],
      ['MARA SOLIS', 'Stealing a cop car. This is either genius or the end of me.'],
    ],
    stages: [
      { verb: 'stealPolice', text: 'Steal a police cruiser (press E near one)', x: 0, z: -20, radius: 999 },
      { verb: 'drive', text: 'Deliver the cruiser to Taller Lumen', x: 150, z: 90, radius: 14 },
    ],
  },
  {
    id: 9, name: 'Beach Run', reward: 2600, heat: 2, timer: 120,
    brief: 'Smuggle crates along Playa Dorada to the lighthouse within 120 seconds.',
    dialogue: [
      ['BIG DARIO', 'Crates on the coast road, lighthouse in two minutes. Beach patrols out.'],
      ['MARA SOLIS', 'Sand, surf and smuggling. My favourite kind of drive.'],
    ],
    stages: [
      { verb: 'drive', text: 'Reach Farol Rojo lighthouse — 120s!', x: -232, z: 190, radius: 12, timed: true },
    ],
  },
  {
    id: 10, name: 'High Tide', reward: 3200, heat: 4,
    brief: 'Reach the lighthouse while a helicopter pursues at 4 stars, then lose the heat.',
    dialogue: [
      ['LENA CRUZ', 'Helicopter up, four stars. Get to the lighthouse and go dark.'],
      ['MARA SOLIS', 'A helicopter? Fine. Let\u2019s see it follow me through the dunes.'],
    ],
    stages: [
      { verb: 'drive', text: 'Reach Farol Rojo with the helicopter on you', x: -232, z: 190, radius: 12 },
      { verb: 'evade', text: 'Lose the heat in the dunes', x: -232, z: 190, radius: 999 },
    ],
  },
  {
    id: 11, name: 'The Getaway', reward: 4500, heat: 3,
    brief: 'Rob the casino vault: fight the guards, grab the cash, escape to the marina boat.',
    dialogue: [
      ['TIO REYES', 'Casino Miramar vault. Guards first, cash second, boat third.'],
      ['MARA SOLIS', 'One vault, one boat, one sunset. Let\u2019s go.'],
    ],
    stages: [
      { verb: 'shoot', text: 'Fight through the casino guards (4)', x: -90, z: 60, radius: 16, kills: 4 },
      { verb: 'go',    text: 'Grab the vault cash', x: -90, z: 60, radius: 14 },
      { verb: 'drive', text: 'Escape by car to the marina boat', x: -205, z: -205, radius: 12 },
    ],
  },
  {
    id: 12, name: 'The Last Sunset', reward: 8000, heat: 5,
    brief: 'Finale: vault heist at Torre Lumen, then drive the Comet GT down the coast road to the boat.',
    dialogue: [
      ['TIO REYES', 'Last one, Mara. Torre Lumen vault, then the coast road to the boat.'],
      ['MARA SOLIS', 'Everything we worked for. One last sunset — and we\u2019re free.'],
      ['LENA CRUZ', 'Full pursuit out there. Drive like the sun is chasing you.'],
    ],
    stages: [
      { verb: 'shoot', text: 'Clear the Torre Lumen vault guards (4)', x: -40, z: -150, radius: 16, kills: 4 },
      { verb: 'go',    text: 'Take the vault cash', x: -40, z: -150, radius: 12 },
      { verb: 'drive', text: 'Drive the Comet GT down the coast road to the boat!', x: -205, z: -205, radius: 12 },
    ],
  },
];

// Radio stations: three original synthwave loops, each a bass line plus an
// arpeggio. The audio module guards every frequency, but the tables here are
// already safe: every arp step indexes a scale that is long enough for it.
export const RADIO = [
  { name: 'SUNSET FM 88.5', bpm: 112, root: 110.0, minor: true,  mood: 'Sunset synthwave' },
  { name: 'PALM DRIVE 97.1', bpm: 126, root: 98.0,  minor: false, mood: 'Night-drive pop' },
  { name: 'NEON BAY 104.3', bpm: 100, root: 123.47, minor: true, mood: 'Slow neon ballad' },
];

export const CONTROLS = [
  ['W A S D', 'Move / drive'],
  ['Mouse', 'Orbit camera — click to shoot'],
  ['Shift', 'Sprint'],
  ['E', 'Steal / enter car'],
  ['Space', 'Handbrake'],
  ['1 / 2', 'Pistol / SMG'],
  ['M', 'Start / advance mission'],
  ['R', 'Change radio station'],
  ['Esc', 'Pause'],
];

// HUD-facing helpers kept beside the data they describe, so the HUD, the
// minimap and the mission system all agree on what a star or a stage means.
export function starsText(wanted) {
  const n = Math.max(0, Math.min(5, Math.round(wanted)));
  return '\u2605'.repeat(n) + '\u2606'.repeat(5 - n);
}
export function cashText(cash) { return '$' + Math.floor(cash).toLocaleString('en-US'); }
export function clockText() { return '18:40'; }
export function missionById(id) { return MISSIONS.find((m) => m.id === id) || null; }
export function totalRewards() { return MISSIONS.reduce((s, m) => s + m.reward, 0); }

