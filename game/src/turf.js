// LUMEN BAY — turf: the 12 districts of Puerto Lumen.
// Jobs take districts from the Tiburones; the HUD shows TURF n/12 and the
// map colours owned turf green. The finale needs the whole city: 12/12.
import { DISTRICTS } from './config.js';

export function createTurf(G) {
  const owned = new Set();
  return {
    owned,
    count() { return owned.size; },
    isOwned(name) { return owned.has(name); },
    ownedNames() { return [...owned]; },
    // Take a district (called by mission completion). Returns true if new.
    take(name) {
      if (owned.has(name)) return false;
      owned.add(name);
      G.log(`Turf taken: ${name} \u2014 ${owned.size}/12`);
      return true;
    },
    // Take the next unowned district in map order (mission reward path).
    takeNext() {
      for (const d of DISTRICTS) {
        if (!owned.has(d.name)) { this.take(d.name); return d.name; }
      }
      return null;
    },
    // All 12 (story complete).
    takeAll() {
      for (const d of DISTRICTS) owned.add(d.name);
    },
  };
}
