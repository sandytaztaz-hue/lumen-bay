// LUMEN BAY — Bay Garage. Upgrades are bought with job cash and apply to
// the hero car immediately. Owning the garage is a story beat (it opens
// after Vault Prep, mission 8); buying any upgrade also marks it owned.

import { GARAGE_UPGRADES } from './config.js';

export class Garage {
  constructor(game) {
    this.game = game;
    this.owned = false;
    this.bought = new Set();
  }

  list() {
    return GARAGE_UPGRADES.map((u) => ({
      ...u, owned: this.bought.has(u.id),
      locked: u.needs ? !this.bought.has(u.needs) : false,
    }));
  }

  buy(id) {
    const up = GARAGE_UPGRADES.find((u) => u.id === id);
    if (!up) return { ok: false, why: 'no such upgrade' };
    if (this.bought.has(id)) return { ok: false, why: 'already owned' };
    if (up.needs && !this.bought.has(up.needs)) return { ok: false, why: 'needs ' + up.needs };
    if (this.game.cash < up.cost) return { ok: false, why: 'not enough cash' };
    this.game.cash -= up.cost;
    this.bought.add(id);
    this.owned = true;
    const car = this.game.heroCar;
    if (car) {
      if (up.topSpeed) car.userData.def = { ...car.userData.def, topSpeed: car.userData.def.topSpeed + up.topSpeed };
      if (up.armour) this.game.player.armourMax += up.armour;
      if (up.nos) this.game.player.nosMax += up.nos;
    }
    this.game.hud.toast('GARAGE — ' + up.name, up.desc + ' installed on the Comet RS.', 'good');
    this.game.log('Garage: bought ' + up.name + ' for $' + up.cost);
    this.game.save();
    return { ok: true, name: up.name, cost: up.cost };
  }
}
