// LUMEN BAY — turf. Twelve named spots across Puerto Lumen, held by the
// Tiburones at the start. Story jobs hand them to Mara one by one; eight
// change hands across the 15 missions, the rest are taken in free roam by
// standing in the spot's ring.

import { TURF_SPOTS } from './config.js';

export class Turf {
  constructor(game) {
    this.game = game;
    this.spots = TURF_SPOTS.map((s) => ({ ...s, owner: 'tiburon' }));
    this.owned = 0;
    this.captureT = 0;
    this.captureSpot = null;
  }

  claimNext() {
    const next = this.spots.find((s) => s.owner === 'tiburon');
    if (!next) return null;
    next.owner = 'mara';
    this.owned += 1;
    this.game.hud.toast('TURF TAKEN', next.name + ' is yours now — ' + this.owned + '/12.', 'good');
    this.game.log('Turf taken: ' + next.name + ' (' + this.owned + '/12)');
    return next;
  }

  // Free-roam capture: stand inside a Tiburon spot's ring for 6 seconds.
  update(dt, player) {
    let inside = null;
    for (const s of this.spots) {
      if (s.owner === 'tiburon' && Math.hypot(player.x - s.x, player.z - s.z) < 9) {
        inside = s;
        break;
      }
    }
    if (inside) {
      if (this.captureSpot !== inside) { this.captureSpot = inside; this.captureT = 0; }
      this.captureT += dt;
      if (this.captureT > 6) {
        inside.owner = 'mara';
        this.owned += 1;
        this.captureT = 0;
        this.captureSpot = null;
        this.game.hud.toast('TURF TAKEN', inside.name + ' is yours now — ' + this.owned + '/12.', 'good');
        this.game.save();
      }
    } else {
      this.captureSpot = null;
      this.captureT = 0;
    }
  }
}
