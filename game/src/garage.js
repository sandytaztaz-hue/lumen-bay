// LUMEN BAY — garage.js
// The Bay Garage shop, claimed by job 9. Engine levels, armour plating,
// NOS tanks and repairs. Every purchase returns { ok, reason } so the
// HUD can refuse with a reason instead of failing silently.

export const ENGINE_LEVELS = [
  { level: 1, cost: 1500, bonusKmh: 8 },
  { level: 2, cost: 3500, bonusKmh: 16 },
  { level: 3, cost: 7000, bonusKmh: 24 },
];
export const ARMOUR_COST = 2000;
export const NOS_TANK_COST = 1200;
export const REPAIR_PER_HP = 4;

export function engineBonusKmh(level) {
  let bonus = 0;
  for (const e of ENGINE_LEVELS) if (level >= e.level) bonus = e.bonusKmh;
  return bonus;
}

function needGarage(state) {
  if (!state.garageOwned) return 'Claim the Bay Garage first (job 9).';
  return null;
}

export function buyEngine(state) {
  const blocked = needGarage(state);
  if (blocked) return { ok: false, reason: blocked };
  const next = state.engineLevel + 1;
  const tier = ENGINE_LEVELS.find((e) => e.level === next);
  if (!tier) return { ok: false, reason: 'Engine already maxed.' };
  if (state.cash < tier.cost) return { ok: false, reason: 'Not enough cash for Engine ' + next + '.' };
  state.cash -= tier.cost;
  state.engineLevel = next;
  return { ok: true, reason: 'Engine ' + next + ' fitted (+' + tier.bonusKmh + ' km/h).' };
}

export function buyArmour(state) {
  const blocked = needGarage(state);
  if (blocked) return { ok: false, reason: blocked };
  if (state.armour >= 100) return { ok: false, reason: 'Armour already maxed.' };
  if (state.cash < ARMOUR_COST) return { ok: false, reason: 'Not enough cash for armour plating.' };
  state.cash -= ARMOUR_COST;
  state.armour = 100;
  return { ok: true, reason: 'Armour plating fitted.' };
}

export function buyNos(state) {
  const blocked = needGarage(state);
  if (blocked) return { ok: false, reason: blocked };
  if (state.nos >= 100) return { ok: false, reason: 'NOS tank already full.' };
  if (state.cash < NOS_TANK_COST) return { ok: false, reason: 'Not enough cash for a NOS tank.' };
  state.cash -= NOS_TANK_COST;
  state.nos = 100;
  return { ok: true, reason: 'NOS tank refilled.' };
}

export function repair(state) {
  const blocked = needGarage(state);
  if (blocked) return { ok: false, reason: blocked };
  const missing = 100 - state.health;
  if (missing <= 0) return { ok: false, reason: 'Already at full health.' };
  const cost = missing * REPAIR_PER_HP;
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash for repairs.' };
  state.cash -= cost;
  state.health = 100;
  return { ok: true, reason: 'Repaired to full health.' };
}
