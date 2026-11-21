// LUMEN BAY — street races: a checkpoint chain plus a Tiburones rival who
// drives the same points and burns NOS on the straights. First to the last
// checkpoint wins; the mission engine decides the reward.
import * as THREE from 'three';
import { dist2 } from './config.js';
import { makeCar } from './vehicles.js';

export class Race {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.checkpoints = [];
    this.next = 0;
    this.rival = null;
    this.rivalNext = 0;
    this.won = false;
    this.lost = false;
    this.markers = [];
  }

  start(points) {
    this.stop();
    this.active = true;
    this.checkpoints = points.slice();
    this.next = 0;
    this.rivalNext = 0;
    this.won = false;
    this.lost = false;
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd23f, transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, depthWrite: false,
    });
    for (const [x, z] of this.checkpoints) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.5, 8, 24), mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 1.2, z);
      this.scene.add(ring);
      this.markers.push(ring);
    }
    const [rx, rz] = this.checkpoints[0];
    this.rival = makeCar('shark', rx + 6, rz + 6, 0, { kind: 'rival' });
    this.rival.speed = 24;
    this.scene.add(this.rival.mesh.group);
  }

  stop() {
    for (const m of this.markers) this.scene.remove(m);
    this.markers = [];
    if (this.rival) {
      this.scene.remove(this.rival.mesh.group);
      this.rival = null;
    }
    this.active = false;
  }

  nextCheckpoint() {
    if (!this.active || this.next >= this.checkpoints.length) return null;
    return this.checkpoints[this.next];
  }

  update(dt, px, pz, colliders, onCheckpoint) {
    if (!this.active) return;
    if (this.next < this.checkpoints.length) {
      const [cx, cz] = this.checkpoints[this.next];
      if (dist2([px, pz], [cx, cz]) < 8) {
        this.next += 1;
        if (onCheckpoint) onCheckpoint(this.next, this.checkpoints.length);
        const done = this.markers[this.next - 1];
        if (done) done.material.color.setHex(0x37c978);
      }
    }
    if (this.rival && this.rivalNext < this.checkpoints.length) {
      const [tx, tz] = this.checkpoints[this.rivalNext];
      const dx = tx - this.rival.x;
      const dz = tz - this.rival.z;
      const d = Math.hypot(dx, dz);
      if (d < 8) {
        this.rivalNext += 1;
      } else {
        const want = Math.atan2(dx, dz);
        let diff = want - this.rival.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.rival.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
        this.rival.speed = d > 40 ? 30 : 22;
        this.rival.x += Math.sin(this.rival.heading) * this.rival.speed * dt;
        this.rival.z += Math.cos(this.rival.heading) * this.rival.speed * dt;
        this.rival.mesh.group.position.set(this.rival.x, 0, this.rival.z);
        this.rival.mesh.group.rotation.y = this.rival.heading;
      }
    }
    if (this.next >= this.checkpoints.length) {
      this.won = this.rivalNext < this.checkpoints.length || this.next <= this.rivalNext;
      this.active = false;
      this.stop();
    } else if (this.rival && this.rivalNext >= this.checkpoints.length) {
      this.lost = true;
      this.active = false;
      this.stop();
    }
  }
}
