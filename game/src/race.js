// LUMEN BAY — street race (Job 12: STREET KING).
// 8 checkpoints down Torre Boulevard; each one is a glowing ring in the
// world. Hit them in order, beat the clock, take the crown.
import * as THREE from 'three';
import { WORLD } from './config.js';

export function createRace(G) {
  const checkpoints = [];
  for (let i = 0; i < 8; i++) {
    checkpoints.push({ x: 30 + i * 42, z: WORLD.boulevardZ, done: false });
  }
  const group = new THREE.Group();
  group.name = 'race';
  const ringGeo = new THREE.TorusGeometry(3.2, 0.22, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23e });
  const rings = checkpoints.map((cp) => {
    const ring = new THREE.Mesh(ringGeo, ringMat.clone());
    ring.position.set(cp.x, 2.2, cp.z);
    ring.rotation.y = Math.PI / 2;
    ring.visible = false;
    group.add(ring);
    return ring;
  });
  G.scene.add(group);
  return {
    checkpoints,
    rings,
    group,
    active: false,
    index: 0,
    timeLeft: 90,
    // one-line HUD text for the race state
    hudText() {
      if (!this.active) return '';
      return `CHECKPOINT ${this.index}/8 \u2014 ${Math.ceil(this.timeLeft)}s`;
    },
    start() {
      this.active = true;
      this.index = 0;
      this.timeLeft = 90;
      this.checkpoints.forEach((c) => { c.done = false; });
      this.rings.forEach((r, i) => { r.visible = i === 0; });
      G.log('Street race started \u2014 8 checkpoints, 90 seconds');
    },
    update(dt) {
      if (!this.active) return;
      this.timeLeft -= dt;
      const cp = this.checkpoints[this.index];
      const ring = this.rings[this.index];
      if (ring) ring.rotation.x += dt * 1.5;
      if (!cp) return;
      const dx = G.player.pos.x - cp.x, dz = G.player.pos.z - cp.z;
      if (dx * dx + dz * dz < 36) {
        cp.done = true;
        if (ring) ring.visible = false;
        this.index++;
        G.audio.stinger();
        if (this.index >= this.checkpoints.length) {
          this.active = false;
          this.rings.forEach((r) => { r.visible = false; });
          G.completeMission(12);
        } else {
          this.rings[this.index].visible = true;
          G.log(`Checkpoint ${this.index}/8 \u2014 ${Math.ceil(this.timeLeft)}s left`);
        }
      }
      if (this.timeLeft <= 0) {
        this.active = false;
        this.rings.forEach((r) => { r.visible = false; });
        G.log('Race lost \u2014 the crown waits. Try again (M)');
        G.toast('bad', 'RACE LOST', 'Out of time \u2014 the crown waits');
      }
    },
  };
}
