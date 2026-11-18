// Seeded randomness for LUMEN BAY. The whole city — building colours, palm
// placement, traffic colours, pedestrian clothes — comes from one mulberry32
// stream, so the same seed always builds the same Puerto Lumen. That is what
// makes the screenshot scenes repeatable and the save file meaningful: a
// player who reloads sees the same streets they left behind.

export function createRandom(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Integer in [min, max] inclusive, from the same stream.
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Pick one element of an array.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// A value in [min, max).
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

// Fisher-Yates shuffle that returns a new array, leaving the input alone.
export function shuffled(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

// A deterministic 2D hash for ground variation: same (x, z) always gives the
// same value, without keeping any state around.
export function hash2(x, z) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296);
}

// Smoothstep helper used by the texture painters for soft-edged blobs.
export function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Clamp a number into [min, max]; used everywhere a game value must stay sane
// (health, heat, speed, camera pitch) no matter what input arrives.
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// Linear interpolation, the workhorse of camera smoothing and fades.
export function lerp(a, b, t) { return a + (b - a) * t; }

