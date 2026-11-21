// LUMEN BAY — seeded randomness. A single deterministic stream builds the
// whole island (building heights, palm rows, traffic paint, pedestrian
// routes, beach props), so one seed always rebuilds the same Puerto Lumen.

/** Mulberry32 generator: tiny, fast, fully deterministic per seed. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whole number in [min, max] inclusive, drawn from a stream. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Floating point in [min, max), drawn from a stream. */
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

/** True with probability p, drawn from a stream. */
export function randBool(rng, p) {
  return rng() < p;
}

/** One element of an array, drawn from a stream. */
export function randPick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Fisher-Yates shuffle of a copy, drawn from a stream. */
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

/** Deterministic 0..1 hash from two integer grid coordinates and a seed. */
export function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Bring an angle into [-PI, PI]. */
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** One hue from the bright-day palette, drawn from a stream. */
export function pastelPick(rng) {
  const hues = [8, 32, 48, 150, 175, 195, 285, 330];
  return hues[Math.floor(rng() * hues.length)];
}
