// LUMEN BAY r6 — the garage: upgrades at Taller Lumen and the NOS boost.
// Upgrades persist in the save and change the car: higher top speed, visible
// armour plates, a bigger NOS tank. NOS burns on Shift while driving.
import { UPGRADES, clamp } from './config.js';

export class Garage {
  constructor(save) {
    this.levels = save.upgrades || { engine: 0, armour: 0, nos: 0 };
    this.nos = save.nos !== undefined ? save.nos : UPGRADES.nos.capacity[0];
    this.burning = false;
  }

  topSpeed() {
    return UPGRADES.engine.topSpeed[this.levels.engine] || 30;
  }

  resist() {
    return UPGRADES.armour.resist[this.levels.armour] || 0;
  }

  nosCapacity() {
    return UPGRADES.nos.capacity[this.levels.nos] || 60;
  }

  price(kind) {
    const lvl = this.levels[kind];
    const def = UPGRADES[kind];
    if (lvl >= def.max) return null;
    return def.prices[lvl];
  }

  /** Buy the next level of `kind` if the player can afford it. Returns a message. */
  buy(kind, cash) {
    const def = UPGRADES[kind];
    const lvl = this.levels[kind];
    if (lvl >= def.max) return { ok: false, msg: `${def.name} already maxed (Lv ${def.max}).` };
    const price = def.prices[lvl];
    if (cash < price) return { ok: false, msg: `Need $${price} for ${def.name} Lv ${lvl + 1}.` };
    this.levels[kind] = lvl + 1;
    if (kind === 'nos') this.nos = this.nosCapacity();
    return { ok: true, price, msg: `${def.name} upgraded to Lv ${lvl + 1} — $${price}.` };
  }

  /** NOS burn: drains the tank, returns the extra speed while burning. */
  burn(dt, wantBurn, driving) {
    if (wantBurn && driving && this.nos > 0) {
      this.nos = Math.max(0, this.nos - 26 * dt);
      this.burning = true;
      return 14;
    }
    this.burning = false;
    // Slow refill while not burning; full refill at repair.
    this.nos = Math.min(this.nosCapacity(), this.nos + 2.2 * dt);
    return 0;
  }

  repair() {
    this.nos = this.nosCapacity();
  }

  /** Apply the upgrades to a car mesh (armour plates visible at Lv 1+). */
  applyToCar(car) {
    if (!car || !car.mesh) return;
    car.mesh.plates.visible = this.levels.armour > 0;
  }

  summary() {
    return `ENG Lv${this.levels.engine}  ARM Lv${this.levels.armour}  NOS Lv${this.levels.nos}`;
  }
}

// ---- garage menu state ------------------------------------------------------

/** The Taller Lumen upgrade menu: three rows, buy with keys 1/2/3, close with E. */
export const GARAGE_MENU = [
  { key: '1', kind: 'engine', label: 'Engine — top speed up' },
  { key: '2', kind: 'armour', label: 'Armour — damage resistance + plates' },
  { key: '3', kind: 'nos', label: 'NOS Tank — bigger boost tank' },
];

/** Repair cost at the garage: flat $150, restores car health + refills NOS. */
export const REPAIR_PRICE = 150;
