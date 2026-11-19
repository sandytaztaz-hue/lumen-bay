// LUMEN BAY r6 — turf war: the 12 districts, robberies and ownable properties.
// Los Tiburones hold the city at the start; Mara's crew takes it back one
// district at a time. Robberies and races flip districts; owned properties hold
// them and pay passive income per in-game hour.
import { DISTRICTS, ROB_TARGETS, PROPERTIES, dist2 } from './config.js';

export class Turf {
  constructor(save) {
    this.owners = (save.turf && save.turf.length === 12) ? save.turf.slice() : DISTRICTS.map((d) => d.owner);
    this.owned = (save.owned || []).slice();
    this.robCooldowns = {};
    this.robbery = null; // { target, t, total }
    this.incomeAcc = 0;
  }

  held() {
    return this.owners.filter((o) => o === 'crew').length;
  }

  districtIndexAt(x, z) {
    for (let i = 0; i < DISTRICTS.length; i += 1) {
      const r = DISTRICTS[i].rect;
      if (x >= r[0] && x < r[2] && z >= r[1] && z < r[3]) return i;
    }
    return -1;
  }

  flip(id) {
    const i = DISTRICTS.findIndex((d) => d.id === id);
    if (i >= 0 && this.owners[i] !== 'crew') {
      this.owners[i] = 'crew';
      return true;
    }
    return false;
  }

  isOwned(propId) {
    return this.owned.includes(propId);
  }

  buyProperty(propId) {
    const p = PROPERTIES.find((x) => x.id === propId);
    if (!p || this.isOwned(propId)) return null;
    this.owned.push(propId);
    this.flip(p.district);
    return p;
  }

  /** Passive income: every owned property pays per in-game hour (1 hour = 60 s). */
  update(dt, addCash, log) {
    this.incomeAcc += dt;
    if (this.incomeAcc >= 60) {
      this.incomeAcc -= 60;
      let total = 0;
      for (const id of this.owned) {
        const p = PROPERTIES.find((x) => x.id === id);
        if (p) total += p.income;
      }
      if (total > 0) {
        addCash(total);
        log(`Property income +$${total}.`);
      }
    }
  }

  /** Nearest robbable target within 8 units of the player, or null. */
  nearestRobTarget(x, z) {
    let best = null;
    let bd = 9;
    for (const t of ROB_TARGETS) {
      if (this.robCooldowns[t.id] > 0) continue;
      const d = dist2([x, z], t.pos);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  startRobbery(target) {
    this.robbery = { target, t: 0, total: 5 };
    return this.robbery;
  }

  /** Advance a robbery channel; returns 'done' when the 5 s channel completes. */
  updateRobbery(dt) {
    if (!this.robbery) return null;
    this.robbery.t += dt;
    if (this.robbery.t >= this.robbery.total) {
      const t = this.robbery.target;
      this.robbery = null;
      this.robCooldowns[t.id] = 120;
      return t;
    }
    return null;
  }

  cancelRobbery() {
    this.robbery = null;
  }

  tickCooldowns(dt) {
    for (const k of Object.keys(this.robCooldowns)) {
      this.robCooldowns[k] -= dt;
      if (this.robCooldowns[k] <= 0) delete this.robCooldowns[k];
    }
  }

  /** Heat shield: owned property in this district halves heat gain. */
  heatFactorAt(x, z) {
    const i = this.districtIndexAt(x, z);
    if (i < 0) return 1;
    const d = DISTRICTS[i];
    return PROPERTIES.some((p) => p.district === d.id && this.isOwned(p.id)) ? 0.5 : 1;
  }
}

// ---- property helpers -------------------------------------------------------

/** Nearest buyable property within 10 units of the player, or null. */
export function nearestProperty(turf, x, z) {
  let best = null;
  let bd = 11;
  for (const p of PROPERTIES) {
    if (turf.isOwned(p.id)) continue;
    const d = dist2([x, z], p.pos);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

/** One-line turf summary for the HUD: "TURF 4/12". */
export function turfLabel(turf) {
  return `TURF ${turf.held()}/12`;
}
