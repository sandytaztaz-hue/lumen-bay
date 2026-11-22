// LUMEN BAY — random.js
// Seeded randomness. One generator backs the whole game so the same seed
// always builds the same Puerto Lumen: same buildings, same traffic
// colours, same pedestrians, same loot.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // One element picked from a list.
    pick(list) {
      if (!list.length) throw new Error('rng.pick: empty list');
      return list[Math.floor(next() * list.length)];
    },
    // True with probability p.
    chance(p) {
      return next() < p;
    },
    // A forked stream salted by a string, stable across runs.
    fork(salt) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < salt.length; i++) {
        h ^= salt.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return makeRng((h ^ (seed * 2654435761)) >>> 0);
    },
    // In-place deterministic shuffle (Fisher-Yates on this stream).
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    },
  };
}

// Stable 0-to-1 hash of a string, for picking a colour or a variant
// without spending stream state.
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function seedFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('seed');
    const n = raw === null ? NaN : parseInt(raw, 10);
    return Number.isFinite(n) ? n : 7;
  } catch (err) {
    return 7;
  }
}
