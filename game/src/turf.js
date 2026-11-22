// LUMEN BAY — turf.js
// The twelve districts of Puerto Lumen. Jobs with a turf reward take the
// next unowned district in map order. A full playthrough takes 8 of 12.

import { DISTRICTS } from './config.js';

export const TURF_TOTAL = 12;

export function districtAt(x, z) {
  let best = DISTRICTS[0];
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dx = x - d.x;
    const dz = z - d.z;
    const dist = dx * dx + dz * dz;
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

// Take the next unowned district in map order. Returns its name or null
// when the whole map is already ours.
export function takeNextTurf(state) {
  for (const d of DISTRICTS) {
    if (!state.turf.includes(d.name)) {
      state.turf.push(d.name);
      return d.name;
    }
  }
  return null;
}

export function turfCount(state) {
  return state.turf.length;
}
