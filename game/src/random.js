// A small seeded random number generator (mulberry32): the same seed builds the
// same city, so the screenshot scenes are repeatable from one run to the next.
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [min, max). */
export function range(rng, min, max) { return min + rng() * (max - min); }
/** Random integer in [min, max] inclusive. */
export function int(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
/** Pick one element of an array. */
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
/** Fisher-Yates shuffle, in place, driven by the seeded RNG. */
export function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
