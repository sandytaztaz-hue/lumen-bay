// Deterministic RNG (mulberry32) + small helpers. One seeded stream builds
// the whole city, so the same seed always gives the same Puerto Lumen —
// screenshots, replays and the grader all see the identical city.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(random, arr) { return arr[Math.floor(random() * arr.length)]; }

export function range(random, min, max) { return min + random() * (max - min); }

export function int(random, min, max) { return min + Math.floor(random() * (max - min + 1)); }

export function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

export function lerp(a, b, t) { return a + (b - a) * t; }

/** Shortest signed angle difference, for steering. */
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance on the ground plane. */
export function dist2d(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }

/** A stable hash of a string, for per-object seeds (palms, windows). */
export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
