// LUMEN BAY r12 — turf war, robberies and ownable properties. Twelve
// districts start held by Los Tiburones; robberies and races flip them to
// the crew, properties pay passive income and shield their district's heat.
import { DISTRICTS, ROB_TARGETS, PROPERTIES, dist2 } from './config.js';

export class Turf {
  constructor(save) {
    this.owners = (save && save.turf && save.turf.length === 12) ? save.turf.slice() : DISTRICTS.map((d) => d.owner);
    this.owned = (save && save.owned) ? save.owned.slice() : [];
    this.robbery = null;
    this.incomeT = 0;
    this.cooldowns = {};
  }
  held() { return this.owners.filter((o) => o === 'crew').length; }
  flip(id) {
    const i = DISTRICTS.findIndex((d) => d.id === id);
    if (i < 0 || this.owners[i] === 'crew') return false;
    this.owners[i] = 'crew';
    return true;
  }
  isOwned(id) { return this.owned.includes(id); }
  buyProperty(id) {
    if (this.isOwned(id)) return false;
    this.owned.push(id);
    return true;
  }
  /** Heat multiplier: owned districts are cooler, shark districts hotter. */
  heatFactorAt(x, z) {
    for (let i = 0; i < DISTRICTS.length; i += 1) {
      const d = DISTRICTS[i];
      if (x >= d.rect[0] && x < d.rect[2] && z >= d.rect[1] && z < d.rect[3]) {
        return this.owners[i] === 'crew' ? 0.7 : 1.0;
      }
    }
    return 1.0;
  }
  nearestRobTarget(x, z) {
    let best = null; let bd = 9;
    for (const t of ROB_TARGETS) {
      const d = dist2([x, z], t.pos);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  startRobbery(target) {
    if (this.robbery) return false;
    if ((this.cooldowns[target.id] || 0) > 0) return false;
    this.robbery = { target, t: 0 };
    return true;
  }
  /** Returns the finished target once the 5 s channel completes, else null. */
  updateRobbery(dt) {
    if (!this.robbery) return null;
    this.robbery.t += dt;
    if (this.robbery.t >= 5) {
      const done = this.robbery.target;
      this.cooldowns[done.id] = 60;
      this.robbery = null;
      return done;
    }
    return null;
  }
  cancelRobbery() { this.robbery = null; }
  tickCooldowns(dt) {
    for (const k of Object.keys(this.cooldowns)) {
      this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    }
  }
  /** Passive income: owned properties pay per hour of play, ticked in slices. */
  update(dt, addCash, log) {
    this.incomeT += dt;
    if (this.incomeT < 60) return;
    this.incomeT = 0;
    let total = 0;
    for (const id of this.owned) {
      const p = PROPERTIES.find((x) => x.id === id);
      if (p) total += p.income;
    }
    if (total > 0) {
      addCash(total);
      if (log) log(`PROPERTY INCOME +$${total} — your businesses paid out.`);
    }
  }
}
export function nearestProperty(turf, x, z) {
  let best = null; let bd = 10;
  for (const p of PROPERTIES) {
    if (turf.isOwned(p.id)) continue;
    const d = dist2([x, z], p.pos);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
export function turfLabel(turf) {
  return `TURF ${turf.held()}/12`;
}
