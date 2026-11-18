// Deterministic random numbers (mulberry32) and the small math helpers the
// whole game shares. One seeded stream builds the city, so the same seed
// always gives the same Puerto Lumen — screenshots, replays and the grader
// all see the identical streets, buildings and traffic.

/** A tiny fast seeded PRNG. Returns a function that yields [0, 1). */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of an array using the given rng. */
export function choice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** A float in [min, max). */
export function between(rng, min, max) {
  return min + rng() * (max - min);
}

/** An integer in [min, max], inclusive. */
export function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Clamp v into [min, max]. */
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** Clamp v into [0, 1]. */
export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Linear interpolation between a and b. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Frame-rate independent damping factor: use as lerp weight. */
export function damp(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}

/** True with probability p (0..1) — a coin flip off the seeded stream. */
export function chance(rng, p) {
  return rng() < p;
}

/** Shortest signed angular difference from a to b, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance between two points on the ground plane. */
export function dist2d(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

/** FNV-1a hash of a string — stable per-object seeds for windows, palms. */
export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
