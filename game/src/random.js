// LUMEN BAY r6 — deterministic seeded RNG. One stream drives the whole world
// (building heights, palm placement, traffic colours, pedestrian routes), so the
// same seed always builds the same Puerto Lumen.

/** Mulberry32: small, fast, and deterministic for a fixed seed. */
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] from a random stream. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element of an array from a random stream. */
export function randPick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Shuffle a copy of an array (Fisher-Yates) from a random stream. */
export function shuffled(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// LUMEN BAY r6 — a second stream helper used by the city builder: a cheap
// hash of grid coordinates, so a building's look depends only on where it stands
// and never on the order the builder visits the blocks.

/** Deterministic 0..1 hash of two integer grid coordinates. */
export function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Wrap an angle to [-PI, PI]. */
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
