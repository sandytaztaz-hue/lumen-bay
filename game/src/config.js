// LUMEN BAY r8c — bright daytime rebuild. Every tuning number, district,
// mission and price in one place. Puerto Lumen is a 480 x 480 island city:
// roads every 60, turquoise sea west + south, BRIGHT MIDDAY at 12:30 — high
// white sun overhead, clear blue sky, short crisp shadows, bright facades.
// Positions are [x, z] on the ground plane; y is up. Nothing here comes
// from any commercial game.
export const WORLD = { size: 480, half: 240, roadGap: 60, seaLevel: -0.4 };
export const STEP = 1 / 60;
export const SAVE_KEY = 'lumenbay.r6.save.v1';
export const CLOCK = '12:30';
export const TRAFFIC_COUNT = 28;
export const PED_COUNT = 60;
// Ferris wheel on the Playa Dorada horizon, visible from the beach avenue.
export const FERRIS = { pos: [0, 222], radius: 26, height: 34, gondolas: 12 };
// Search-zone radius (world units) the police sweep while the player is
// wanted — drawn as the dashed red ring on the minimap.
export const SEARCH_ZONE_RADIUS = 68;
// The high midday sun sits ahead-east over the sea, so the chase camera
// (looking east down Playa Drive) catches a bright white disc HIGH in the
// blue sky — above the rooftops and the road's vanishing point, never hidden
// behind the left-side buildings (r8 lesson: at z=120 a low sun sat behind
// the north row). Elevation ~20° from the hero: high in the frame's upper
// sky, but still inside the chase camera's view (a disc at 49° elevation
// sat above the frame entirely — the r8c first pass proved it). High sun =
// short shadows straight down, bright and airy, no long dusk shadows.
export const DAYLIGHT = {
  sunPos: [420, 210, 175], sunColour: 0xfff6e0, sunIntensity: 3.2,
  rimColour: 0x9fc8ff, skyTop: 0x2f7fd0, skyHorizon: 0xcfe8f5, fog: 0xa8cfe0,
};
export const DISTRICTS = [
  { id: 'marina', name: 'Marina', rect: [-240, -240, -120, -80], owner: 'shark', colour: '#e5484d' },
  { id: 'mercado', name: 'Mercado Viejo', rect: [-120, -240, 0, -80], owner: 'shark', colour: '#e5484d' },
  { id: 'torre', name: 'Torre', rect: [0, -240, 120, -80], owner: 'shark', colour: '#e5484d' },
  { id: 'farol', name: 'Farol Rojo', rect: [120, -240, 240, -80], owner: 'shark', colour: '#e5484d' },
  { id: 'taller', name: 'Taller', rect: [-240, -80, -120, 80], owner: 'crew', colour: '#37c978' },
  { id: 'oldtown', name: 'Old Town', rect: [-120, -80, 0, 80], owner: 'shark', colour: '#e5484d' },
  { id: 'casino', name: 'Casino Row', rect: [0, -80, 120, 80], owner: 'shark', colour: '#e5484d' },
  { id: 'festival', name: 'Festival Sq.', rect: [120, -80, 240, 80], owner: 'shark', colour: '#e5484d' },
  { id: 'playa', name: 'Playa Dorada', rect: [-240, 80, -120, 240], owner: 'shark', colour: '#e5484d' },
  { id: 'docks', name: 'North Docks', rect: [-120, 80, 0, 240], owner: 'shark', colour: '#e5484d' },
  { id: 'dunes', name: 'Dunes', rect: [0, 80, 120, 240], owner: 'shark', colour: '#e5484d' },
  { id: 'hillside', name: 'Hillside', rect: [120, 80, 240, 240], owner: 'shark', colour: '#e5484d' },
];
export const LANDMARKS = {
  safehouse: { pos: [-180, 20], label: 'Safehouse' },
  garage: { pos: [-180, -40], label: 'Taller Lumen' },
  tower: { pos: [60, -180], label: 'Torre Lumen' },
  marina: { pos: [-180, -180], label: 'Marina Lumen' },
  mercado: { pos: [-60, -180], label: 'Mercado Viejo' },
  playa: { pos: [-180, 180], label: 'Playa Dorada' },
  lighthouse: { pos: [180, -180], label: 'Farol Rojo' },
  casino: { pos: [60, 0], label: 'Casino Row' },
  festival: { pos: [180, 0], label: 'Festival Square' },
  docks: { pos: [-60, 180], label: 'North Docks' },
  dunes: { pos: [60, 180], label: 'Dunes' },
  hillside: { pos: [180, 180], label: 'Hillside' },
};
// Named avenues for the HUD street label + the detailed minimap.
export const STREETS = [
  { name: 'Ocean Boulevard', axis: 'x', at: -180 }, { name: 'Palma Avenue', axis: 'x', at: -120 },
  { name: 'Mercado Street', axis: 'x', at: -60 }, { name: 'Casino Avenue', axis: 'x', at: 0 },
  { name: 'Torre Boulevard', axis: 'x', at: 60 }, { name: 'Festival Avenue', axis: 'x', at: 120 },
  { name: 'Farol Way', axis: 'x', at: 180 }, { name: 'Playa Drive', axis: 'z', at: 180 },
  { name: 'Miramar Strip', axis: 'z', at: 120 }, { name: 'Marina Road', axis: 'z', at: -180 },
];
export function streetNameAt(x, z) {
  let best = STREETS[0]; let bd = 1e9;
  for (const s of STREETS) {
    const d = Math.abs((s.axis === 'x' ? x : z) - s.at);
    if (d < bd) { bd = d; best = s; }
  }
  return best.name;
}
export const ROB_TARGETS = [
  { id: 'shop-mercado', kind: 'shop', name: 'Mercado Shop', pos: [-60, -150], payout: 450, district: 'mercado' },
  { id: 'shop-casino', kind: 'shop', name: 'Casino Kiosk', pos: [90, 30], payout: 700, district: 'casino' },
  { id: 'shop-playa', kind: 'shop', name: 'Beach Bar', pos: [-150, 150], payout: 500, district: 'playa' },
  { id: 'stash-docks', kind: 'stash', name: 'Tiburones Stash', pos: [-60, 150], payout: 2200, district: 'docks' },
  { id: 'stash-fest', kind: 'stash', name: 'Festival Stash', pos: [150, 30], payout: 2600, district: 'festival' },
  { id: 'stash-torre', kind: 'stash', name: 'Tower Vault', pos: [60, -150], payout: 4000, district: 'torre' },
];
export const PROPERTIES = [
  { id: 'prop-garage', name: 'Bay Garage', pos: [-210, -40], price: 2500, income: 120, district: 'taller' },
  { id: 'prop-shop', name: 'Mercado Shop', pos: [-90, -210], price: 4000, income: 220, district: 'mercado' },
  { id: 'prop-house', name: 'Hillside Safehouse', pos: [210, 210], price: 6000, income: 350, district: 'hillside' },
];
export const UPGRADES = {
  engine: { name: 'Engine', max: 3, prices: [800, 1500, 2600], topSpeed: [30, 36, 43, 51] },
  armour: { name: 'Armour', max: 3, prices: [600, 1200, 2200], resist: [0, 0.25, 0.45, 0.6] },
  nos: { name: 'NOS Tank', max: 3, prices: [700, 1300, 2400], capacity: [60, 90, 120, 160] },
};
// r8b: the hero Comet RS is the reference's glossy hot pink-red (HALCYON's
// pink sports car), not flat racing red; cruisers are black-and-white.
export const CARS = {
  comet: { name: 'Veloz Comet RS', colour: 0xe8124a, top: 34, accel: 16 },
  sedan: { name: 'Solmar Sedan', colour: 0x3fa7ff, top: 26, accel: 12 },
  pickup: { name: 'Dune Pickup', colour: 0x8a6f4d, top: 28, accel: 13 },
  taxi: { name: 'Lumen Taxi', colour: 0xffd23f, top: 26, accel: 12 },
  shark: { name: 'Tiburon Coupe', colour: 0x222226, top: 32, accel: 15 },
  police: { name: 'LCPD Cruiser', colour: 0xf2f2f2, top: 33, accel: 16 },
};
// Police call-sign roster for the LCPD response list (top-3 style: unit names,
// distances, statuses like RAMMING / SPOTLIGHT / ROADBLOCK / FIRING).
export const POLICE_ROSTER = ['PELICAN-11', 'GECKO-25', 'BARRACUDA-18', 'TAC-45', 'COBRA-07'];
export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, rate: 0.45, range: 3, auto: false },
  pistol: { name: 'Pistol', damage: 34, rate: 0.28, range: 70, auto: false },
  smg: { name: 'SMG', damage: 18, rate: 0.09, range: 60, auto: true },
};
// Bright midday palette: blue sky, pale horizon, white sun, bright turquoise
// sea and sand, lighter asphalt, sunlit grass. The sky dome gradient
// (textures.js) carries the blue → pale-horizon blend; these are the flat
// fallbacks.
export const PALETTE = {
  skyTop: 0x2f7fd0, skyHorizon: 0xcfe8f5, sun: 0xfff6e0,
  sea: 0x1e9bb5, sand: 0xf0d49a, road: 0x55565e, sidewalk: 0xc8b89a,
  grass: 0x5da244, building: 0xf6e8c8, neon: 0xff4d8d,
  crew: '#37c978', shark: '#e5484d', police: '#4d8dff',
};
export const MISSIONS = [
  { id: 1, title: 'First Keys', reward: 500, flip: null,
    brief: 'Steal the Comet RS from the marina docks and drive it to the safehouse.',
    dialogue: ['TIO REYES: "Mara. The Comet RS is sitting at the marina. Take it. Quietly."', 'MARA: "Quietly is my middle name, Tio."'],
    stages: [
      { t: 'goto', pos: [-180, -180], radius: 10, label: 'Reach the marina docks' },
      { t: 'enterCar', label: 'Steal the Comet RS (press E)' },
      { t: 'drive', pos: [-180, 20], radius: 12, label: 'Drive the Comet to the safehouse' },
    ] },
  { id: 2, title: 'The Drop', reward: 700, flip: null,
    brief: 'Deliver a package to Mercado Viejo within 90 seconds.',
    dialogue: ['LENA CRUZ: "Package in the trunk. Mercado Viejo, ninety seconds. Don\'t dawdle."'],
    stages: [{ t: 'timed', pos: [-60, -180], radius: 12, seconds: 90, label: 'Deliver the package to Mercado Viejo' }] },
  { id: 3, title: 'Hot Wheels', reward: 800, flip: null,
    brief: 'Lose a 2-star police tail. Break line of sight until the heat drops to zero.',
    dialogue: ['TIO REYES: "Cops are on you. Duck behind buildings — if they can\'t see you, they lose you."'],
    stages: [{ t: 'evade', seconds: 0, label: 'Lose the police — break line of sight until wanted is 0' }], wanted: 2 },
  { id: 4, title: 'The Marina Job', reward: 900, flip: null,
    brief: 'Pick up Lena\'s cargo crate at the docks and deliver it to Taller Lumen.',
    dialogue: ['LENA CRUZ: "Crate\'s at the docks. Patrols are circling — keep it moving."'],
    stages: [
      { t: 'pickup', pos: [-180, -180], radius: 8, label: 'Pick up the cargo crate at the docks' },
      { t: 'drive', pos: [-180, -40], radius: 12, label: 'Deliver the crate to Taller Lumen' },
    ], patrols: 2 },
  { id: 5, title: 'Payday', reward: 1400, flip: null,
    brief: 'Ambush the courier van on the coast road: shoot out its escort, grab the cash, escape.',
    dialogue: ['BIG DARIO: "Courier van, coast road, two guards. Hit it hard, grab the bag, run."'],
    stages: [
      { t: 'combat', count: 2, at: [-150, 120], label: 'Take out the courier escort (2 guards)' },
      { t: 'pickup', pos: [-150, 120], radius: 8, label: 'Grab the cash bag' },
      { t: 'drive', pos: [-180, 20], radius: 12, label: 'Escape to the safehouse' },
    ] },
  { id: 6, title: 'The Informant', reward: 1600, flip: null,
    brief: 'Rescue Dario from a police cordon in the market square. Shoot the cordon, reach him, drive out.',
    dialogue: ['LENA CRUZ: "Dario\'s pinned in the market square. Cordon of four. Get him out, Mara."'],
    stages: [
      { t: 'combat', count: 4, at: [-60, -180], label: 'Break the police cordon (4 officers)' },
      { t: 'goto', pos: [-60, -180], radius: 8, label: 'Reach Dario' },
      { t: 'drive', pos: [-180, 20], radius: 12, label: 'Drive Dario to the safehouse' },
    ] },
  { id: 7, title: 'Night Shift', reward: 1800, flip: null,
    brief: 'Drive Lena to 3 hack checkpoints across the city. Wait at each until her hack completes.',
    dialogue: ['LENA CRUZ: "Three terminals. I hack, you watch the street. Thirty seconds a terminal."'],
    stages: [
      { t: 'wait', pos: [60, -180], seconds: 12, label: 'Hack checkpoint 1 — Torre Lumen' },
      { t: 'wait', pos: [60, 0], seconds: 12, label: 'Hack checkpoint 2 — Casino Row' },
      { t: 'wait', pos: [180, 0], seconds: 12, label: 'Hack checkpoint 3 — Festival Square' },
    ], patrols: 2 },
  { id: 8, title: 'The Swap', reward: 2000, flip: null,
    brief: 'Steal a police cruiser and deliver it to Taller Lumen. High heat — expect company.',
    dialogue: ['TIO REYES: "We need a cruiser for the next job. Take one. Yes, a real one."'],
    stages: [
      { t: 'enterCar', police: true, label: 'Steal a police cruiser (press E near one)' },
      { t: 'drive', pos: [-180, -40], radius: 12, label: 'Deliver the cruiser to Taller Lumen' },
    ], wanted: 2 },
  { id: 9, title: 'Beach Run', reward: 2200, flip: 'playa',
    brief: 'Smuggle crates along Playa Dorada: drive the coast road to the lighthouse in 120 seconds.',
    dialogue: ['BIG DARIO: "Crates to the lighthouse, two minutes. Beach patrols are out — keep moving."'],
    stages: [{ t: 'timed', pos: [180, -180], radius: 14, seconds: 120, label: 'Reach the Farol Rojo lighthouse in 120s' }], patrols: 2 },
  { id: 10, title: 'High Tide', reward: 2600, flip: 'dunes',
    brief: 'Reach the Farol Rojo lighthouse with a helicopter on you at 4 stars, then lose the heat in the dunes.',
    dialogue: ['LENA CRUZ: "Heli up, four stars. Get to the lighthouse, then vanish into the dunes."'],
    stages: [
      { t: 'drive', pos: [180, -180], radius: 14, label: 'Reach the Farol Rojo lighthouse' },
      { t: 'evade', seconds: 0, label: 'Lose the heat in the dunes' },
    ], wanted: 4 },
  { id: 11, title: 'The Getaway', reward: 3200, flip: 'casino',
    brief: 'Rob the casino vault: fight through the guards on foot, grab the cash, escape by car to the marina boat.',
    dialogue: ['TIO REYES: "The casino vault. Guards inside. Take the cash, take the boat at the marina."'],
    stages: [
      { t: 'combat', count: 3, at: [60, 0], label: 'Fight through the casino guards (3)' },
      { t: 'rob', target: 'shop-casino', label: 'Rob the casino vault (hold E)' },
      { t: 'drive', pos: [-180, -180], radius: 12, label: 'Escape to the marina boat' },
    ] },
  { id: 12, title: 'Street King', reward: 3600, flip: 'mercado',
    brief: 'Beat the Tiburones driver through 8 checkpoints. Tio fitted your first NOS tank — burn it on the final straight.',
    dialogue: ['TIO REYES: "Race night. Eight checkpoints, one shark driver. I fitted NOS — hold Shift on the straight."'],
    stages: [
      { t: 'race', checkpoints: [[-120, -120], [-60, -60], [0, -120], [60, -60], [120, -120], [120, 0], [60, 60], [-60, -180]], label: 'Win the street race — 8 checkpoints' },
    ] },
  { id: 13, title: 'Festival de las Luces', reward: 4200, flip: 'festival',
    brief: 'During the Festival Square day festival: rob the rival stash warehouse, then escape through the festival streets with a 3-star tail.',
    dialogue: ['LENA CRUZ: "Lanterns, music, crowds — perfect cover. Hit the stash, then run the festival streets."'],
    stages: [
      { t: 'rob', target: 'stash-fest', label: 'Rob the Tiburones stash at Festival Square (hold E)' },
      { t: 'evade', seconds: 0, label: 'Escape the 3-star tail through the festival streets' },
    ], wanted: 3 },
  { id: 14, title: 'Turf War', reward: 5000, flip: 'docks',
    brief: 'Rob the North Docks stash house, buy your first property (Bay Garage, $2,500), then defend it from a Tiburones counter-attack.',
    dialogue: ['TIO REYES: "Take the docks stash, buy the garage with the take, and hold it when they come back."'],
    stages: [
      { t: 'rob', target: 'stash-docks', label: 'Rob the North Docks stash house (hold E)' },
      { t: 'buy', prop: 'prop-garage', label: 'Buy the Bay Garage ($2,500) — press E at the garage' },
      { t: 'defend', count: 4, at: [-210, -40], seconds: 45, label: 'Defend your garage from the counter-attack (4 sharks)' },
    ] },
  { id: 15, title: 'El Puerto Es Nuestro', reward: 8000, flip: 'torre',
    brief: 'Finale: vault heist at Torre Lumen, then a NOS chase down the coast road with roadblocks and the helicopter at 5 stars. Beach escape at Playa Dorada.',
    dialogue: ['TIO REYES: "The tower vault. Then run — five stars, roadblocks, the heli. End it on the beach, Mara."', 'MARA: "El puerto es nuestro."'],
    stages: [
      { t: 'combat', count: 4, at: [60, -180], label: 'Storm the Torre Lumen vault guards (4)' },
      { t: 'rob', target: 'stash-torre', label: 'Crack the tower vault (hold E)' },
      { t: 'drive', pos: [-180, 180], radius: 14, label: 'NOS chase — escape to Playa Dorada' },
    ], wanted: 5 },
];
export const RACE_POINTS = [
  [-120, -120], [-60, -60], [0, -120], [60, -60], [120, -120], [120, 0], [60, 60], [-60, -180],
];
export const STATIONS = [
  { name: 'RADIO LUMEN 88.1 — Daylight FM', root: 220, steps: [0, 3, 5, 7, 10, 12, 15, 17] },
  { name: 'RADIO TIBURON 94.5 — Shark Rock', root: 164.8, steps: [0, 2, 3, 5, 7, 8, 10, 12] },
  { name: 'RADIO SOL 101.9 — Sol Hits', root: 196, steps: [0, 2, 4, 7, 9, 12, 14, 16] },
];
export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.rect[0] && x < d.rect[2] && z >= d.rect[1] && z < d.rect[3]) return d;
  return null;
}
export function clamp(v, lo, hi) {
  if (!Number.isFinite(v)) return lo;
  return v < lo ? lo : v > hi ? hi : v;
}
export function dist2(a, b) {
  const dx = a[0] - b[0]; const dz = a[1] - b[1];
  return Math.sqrt(dx * dx + dz * dz);
}
/** Respect: the street-rep number the HUD shows under the minimap. */
export function respectFor(missionIdx, turfHeld, ownedCount) {
  return Math.min(550, 290 + missionIdx * 20 + turfHeld * 10 + ownedCount * 15);
}
export function freshSave() {
  return {
    cash: 1200, mission: 0, completed: [],
    upgrades: { engine: 0, armour: 0, nos: 0 },
    nos: 60, owned: [], turf: DISTRICTS.map((d) => d.owner),
    px: -180, pz: 60, health: 100, armour: 0,
  };
}
