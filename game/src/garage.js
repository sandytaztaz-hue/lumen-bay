// LUMEN BAY r12 — garage upgrades at Taller Lumen (Engine / Armour / NOS)
// and the NOS tank the hero car burns. Prices and caps live in config.js.
import { UPGRADES } from './config.js';

export class Garage {
  constructor(save) {
    this.levels = (save && save.upgrades) || { engine: 0, armour: 0, nos: 0 };
    this.nos = (save && typeof save.nos === 'number') ? save.nos : 60;
  }
  topSpeed() { return UPGRADES.engine.topSpeed[this.levels.engine] || 30; }
  resist() { return UPGRADES.armour.resist[this.levels.armour] || 0; }
  nosCapacity() { return UPGRADES.nos.capacity[this.levels.nos] || 60; }
  nosPercent() { return Math.round((this.nos / this.nosCapacity()) * 100); }
  nosFull() { return this.nos >= this.nosCapacity(); }
  price(kind) {
    const lvl = this.levels[kind];
    if (lvl >= 3) return 0;
    return UPGRADES[kind].prices[lvl];
  }
  buy(kind, cash) {
    const lvl = this.levels[kind];
    if (lvl >= 3) return { ok: false, msg: `${UPGRADES[kind].name} is already MAX.` };
    const price = UPGRADES[kind].prices[lvl];
    if (cash < price) return { ok: false, msg: `Need $${price} for ${UPGRADES[kind].name} Lv ${lvl + 1}.` };
    this.levels[kind] += 1;
    return { ok: true, price, msg: `${UPGRADES[kind].name} upgraded to Lv ${this.levels[kind]}!` };
  }
  /** Burn NOS while the driver holds Shift; returns the speed bonus. */
  burn(dt, wantBurn, driving) {
    if (!wantBurn || !driving || this.nos <= 0) {
      this.nos = Math.min(this.nosCapacity(), this.nos + dt * 2.5);
      return 0;
    }
    this.nos = Math.max(0, this.nos - dt * 22);
    return 9;
  }
  repair() { this.nos = this.nosCapacity(); }
  applyToCar(car) {
    if (!car) return;
    car.topSpeed = this.topSpeed();
    car.resist = this.resist();
  }
  summary() {
    return `Engine Lv ${this.levels.engine} · Armour Lv ${this.levels.armour} · NOS Lv ${this.levels.nos} (${this.nosPercent()}%)`;
  }
}
export const GARAGE_MENU = [
  { key: '1', kind: 'engine', label: 'ENGINE — top speed' },
  { key: '2', kind: 'armour', label: 'ARMOUR — damage resistance + plates' },
  { key: '3', kind: 'nos', label: 'NOS TANK — bigger boost' },
];
export const REPAIR_PRICE = 150;
