// LUMEN BAY — race.js
// The street race (job 12): eight glowing gold checkpoints down the
// boulevard, shown one at a time in order, 90 seconds on the clock.

import * as THREE from 'three';
import { WORLD } from './config.js';

export const RACE_CHECKPOINTS = [];
for (let i = 0; i < 8; i++) {
  RACE_CHECKPOINTS.push({ x: 30 + i * 42, z: WORLD.boulevardZ });
}
export const RACE_TIME_LIMIT = 90;

export class Race {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.index = 0;
    this.timeLeft = RACE_TIME_LIMIT;
    this.ring = null;
    this.onCheckpoint = null;
    this.onWin = null;
    this.onLose = null;
  }

  start() {
    this.active = true;
    this.index = 0;
    this.timeLeft = RACE_TIME_LIMIT;
    this.showRing();
  }

  stop() {
    this.active = false;
    this.hideRing();
  }

  showRing() {
    this.hideRing();
    if (this.index >= RACE_CHECKPOINTS.length) return;
    const cp = RACE_CHECKPOINTS[this.index];
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.28, 10, 28),
      new THREE.MeshStandardMaterial({
        color: 0xffd21c, emissive: 0xffb800, emissiveIntensity: 1.4, roughness: 0.4,
      }),
    );
    ring.position.set(cp.x, 2.6, cp.z);
    ring.rotation.y = Math.PI / 2;
    this.scene.add(ring);
    this.ring = ring;
  }

  hideRing() {
    if (this.ring) {
      this.scene.remove(this.ring);
      this.ring = null;
    }
  }

  update(dt, pos) {
    if (!this.active) return;
    this.timeLeft -= dt;
    // Pulse the ring instead of spinning it: a torus is symmetric, so a
    // rotation is invisible and a tumble would look broken.
    if (this.ring) {
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.06;
      this.ring.scale.setScalar(pulse);
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.stop();
      if (this.onLose) this.onLose();
      return;
    }
    if (this.index >= RACE_CHECKPOINTS.length) return;
    const cp = RACE_CHECKPOINTS[this.index];
    const dx = pos.x - cp.x;
    const dz = pos.z - cp.z;
    if (dx * dx + dz * dz < 6 * 6) {
      this.index++;
      if (this.onCheckpoint) this.onCheckpoint(this.index);
      if (this.index >= RACE_CHECKPOINTS.length) {
        this.stop();
        if (this.onWin) this.onWin();
      } else {
        this.showRing();
      }
    }
  }
}
