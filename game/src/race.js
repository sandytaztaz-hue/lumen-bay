// LUMEN BAY — street races. A race is a loop of checkpoints down the
// boulevard and back; each one is a glowing ring on the road and a marker
// on the minimap. Mission 12 (Street King) is an 8-checkpoint race.

import { WORLD } from './config.js';
import { makeRng, range } from './random.js';

export class Race {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.checkpoints = [];
    this.index = 0;
    this.markers = [];
  }

  buildCheckpoints(count) {
    const rng = makeRng(900 + count);
    const pts = [];
    const legs = [
      { x: 260, z: 215 }, { x: 200, z: 215 }, { x: 120, z: 215 }, { x: 40, z: 215 },
      { x: 40, z: 185 }, { x: 120, z: 185 }, { x: 200, z: 185 }, { x: 260, z: 185 },
      { x: 260, z: 250 }, { x: 120, z: 250 },
    ];
    for (let i = 0; i < count; i += 1) {
      const base = legs[i % legs.length];
      pts.push({ x: base.x + range(rng, -3, 3), z: base.z + range(rng, -2, 2) });
    }
    return pts;
  }

  start(count = 8) {
    this.checkpoints = this.buildCheckpoints(count);
    this.index = 0;
    this.active = true;
    this.game.hud.toast('STREET RACE', count + ' checkpoints — first to the last one wins.', 'job');
    this.game.log('Race started: ' + count + ' checkpoints');
    return this.checkpoints;
  }

  update(player) {
    if (!this.active) return false;
    const cp = this.checkpoints[this.index];
    if (!cp) return false;
    if (Math.hypot(player.x - cp.x, player.z - cp.z) < 7) {
      this.index += 1;
      this.game.hud.toast('CHECKPOINT ' + this.index + '/' + this.checkpoints.length,
        'Next checkpoint marked.', 'good');
      if (this.index >= this.checkpoints.length) {
        this.active = false;
        this.game.hud.banner('RACE WON', 'Street King — +$3,600');
        return true;
      }
    }
    return false;
  }

  get next() {
    return this.active ? this.checkpoints[this.index] : null;
  }
}
