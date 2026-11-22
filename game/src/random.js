// LUMEN BAY — seeded deterministic random numbers.
// Every random choice in the world (buildings, palms, traffic colours,
// pedestrians, loot) comes from here, so the same seed always builds the
// same Puerto Lumen. No Math.random() anywhere in the game.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small RNG toolkit built on one seeded stream.
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // float in [a, b)
    range(a, b) { return a + (b - a) * next(); },
    // integer in [a, b] inclusive
    int(a, b) { return a + Math.floor(next() * (b - a + 1)); },
    // one element of an array
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    // true with probability p
    chance(p) { return next() < p; },
    // a deterministic hash of a string, for per-object streams
    fork(salt) {
      let h = seed >>> 0;
      const s = String(salt);
      for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
      return makeRng(h);
    },
  };
}

// Stable 0..1 hash of a string (used for per-building colour picks).
export function hash01(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

// A deterministic in-place shuffle (Fisher-Yates on the seeded stream).
export function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
