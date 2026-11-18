// LUMEN BAY — seeded random number generation.
// One deterministic stream per world seed, so the same seed always builds the
// same Puerto Lumen: same buildings, same palms, same traffic colours.
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(p) {
      return next() < p;
    },
    // Fisher-Yates shuffle that returns a new array, leaving the input alone.
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
  };
}

// A tiny hash of a string, used to seed per-building variation from coordinates.
export function hashCoords(x, z) {
  let h = (Math.floor(x * 13.7) * 374761393 + Math.floor(z * 7.3) * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Extra helpers on the seeded stream: gaussian-ish jitter and weighted picks,
// so building heights and palm clusters feel organic instead of uniform.
export function jittered(random, base, spread) {
  return base + (random.next() + random.next() + random.next() - 1.5) * spread;
}

export function weightedPick(random, entries) {
  let total = 0;
  for (const entry of entries) total += entry.weight;
  let roll = random.next() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

// Deterministic colour variation: the same seed always paints the same street.
export function shadeColor(hex, random, amount) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  const f = 1 + (random.next() - 0.5) * amount;
  const cr = Math.max(0, Math.min(255, Math.round(r * f)));
  const cg = Math.max(0, Math.min(255, Math.round(g * f)));
  const cb = Math.max(0, Math.min(255, Math.round(b * f)));
  return (cr << 16) | (cg << 8) | cb;
}
