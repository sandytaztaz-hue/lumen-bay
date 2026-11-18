// LUMEN BAY — tuning numbers, colours and mission rewards in one place.
// The world is a sun-soaked island city, Puerto Lumen, laid out on a road grid
// with the marina to the north, the beach to the south and the ocean beyond both.
// Golden hour is fixed at 18:40, so the light never changes.
export const STEP = 1 / 60;
export const WORLD = { half: 300, roadGap: 65, roadWidth: 14 };
export const ROADS = [-195, -130, -65, 0, 65, 130, 195];
export const CLOCK = { hour: 18, minute: 40 };

export const PALETTE = {
  skyTop: 0x2b3a6e, skyMid: 0xff7e4a, skyLow: 0xffb36b,
  sun: 0xffd9a0, fog: 0xe88a5a,
  asphalt: 0x2e2e38, sidewalk: 0x9a8f80, sand: 0xe8c98a,
  water: 0x1f6f8e, waterDeep: 0x14506b,
  grass: 0x5d7a3a, neonPink: 0xff4fa3, neonCyan: 0x39d5ff,
  police: 0x1c4fd6, taxi: 0xf2c200,
};

export const PLAYER = {
  walkSpeed: 6, sprintSpeed: 10.5, radius: 0.9,
  maxHealth: 100, maxArmour: 100, startCash: 500,
  regenDelay: 8, regenRate: 6,
};

export const CAR = {
  accel: 20, brake: 34, reverseAccel: 12, maxSpeed: 40, gtMaxSpeed: 48,
  steer: 1.9, grip: 8, handbrakeGrip: 2.2, maxHealth: 100,
  repairFee: 150, stealHeat: 1,
};

export const WANTED = {
  decayRate: 0.12, hiddenDecayRate: 0.55, hideDistance: 55,
  steal: 1, shoot: 1, speedPast: 1, max: 5,
  heliAt: 3, footCopsAt: 3, cruiserSpeed: 34,
};

export const WEAPONS = {
  pistol: { name: 'PISTOL', damage: 34, rate: 0.22, range: 90, spread: 0.012, auto: false },
  smg: { name: 'SMG', damage: 17, rate: 0.085, range: 70, spread: 0.035, auto: true, ammo: 120 },
};

export const MISSION_REWARDS = [800, 1000, 1200, 1500, 2500, 2000, 2200, 1800, 2000, 3000, 5000, 8000];
/** Rewards climb with the job: the finale pays ten times the first job. */
export const PICKUPS = { health: 40, armour: 50, smgAmmo: 120 };
export const SAVE_KEY = 'lumenbay-save-v1';
export const SEED_DEFAULT = 20261118;
