// LUMEN BAY — Bay Garage: car tuning you buy with job cash.
// Engine levels raise top speed; armour and NOS tank are one-off buys.
// Every purchase is a real state change the probe can verify.
export const GARAGE_UPGRADES = {
  engine: [
    { level: 1, name: 'Engine Lv1', cost: 1500, topSpeedBonus: 8 },
    { level: 2, name: 'Engine Lv2', cost: 3500, topSpeedBonus: 16 },
    { level: 3, name: 'Engine Lv3', cost: 7000, topSpeedBonus: 24 },
  ],
  armour: { level: 1, name: 'Armour Plating', cost: 2000, armour: 100 },
  nos: { level: 1, name: 'NOS Tank', cost: 1200, nos: 100 },
};

export function createGarage(G) {
  return {
    owned: false,
    engine: 0,
    armour: false,
    nosTank: false,
    // Buy the next engine level. Returns {ok, reason}.
    buyEngine() {
      const next = GARAGE_UPGRADES.engine[this.engine];
      if (!next) return { ok: false, reason: 'Engine already maxed' };
      if (G.state.cash < next.cost) return { ok: false, reason: 'Not enough cash' };
      G.state.cash -= next.cost;
      this.engine = next.level;
      G.state.topSpeedBonus = next.topSpeedBonus;
      G.log(`Garage: ${next.name} fitted \u2014 $${next.cost}`);
      return { ok: true, level: next.level };
    },
    buyArmour() {
      if (this.armour) return { ok: false, reason: 'Armour already fitted' };
      if (G.state.cash < GARAGE_UPGRADES.armour.cost) return { ok: false, reason: 'Not enough cash' };
      G.state.cash -= GARAGE_UPGRADES.armour.cost;
      this.armour = true;
      G.state.armour = 100;
      return { ok: true };
    },
    buyNos() {
      if (this.nosTank) return { ok: false, reason: 'NOS tank already fitted' };
      if (G.state.cash < GARAGE_UPGRADES.nos.cost) return { ok: false, reason: 'Not enough cash' };
      G.state.cash -= GARAGE_UPGRADES.nos.cost;
      this.nosTank = true;
      G.state.nos = 100;
      return { ok: true };
    },
    // Repair the Comet to full condition. Cost scales with damage.
    repair() {
      const missing = 100 - G.state.health;
      if (missing <= 0) return { ok: false, reason: 'Already at full condition' };
      const cost = Math.ceil(missing * 4);
      if (G.state.cash < cost) return { ok: false, reason: 'Not enough cash' };
      G.state.cash -= cost;
      G.state.health = 100;
      G.log(`Garage: Comet repaired to 100% \u2014 $${cost}`);
      return { ok: true, cost };
    },
  };
}
