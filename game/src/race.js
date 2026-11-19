// LUMEN BAY r8 — street races: checkpoint races against a Tiburones rival.
// The rival drives the checkpoint line with NOS bursts on the straights; the
// player wins by passing every checkpoint first. A win flips a district.
// NEW in r8: progress() for the HUD (checkpoint x/y in the mission panel),
// and the checkpoint rings are sunset gold, glowing against the dusk.
import * as THREE from 'three';
import { dist2, clamp } from './config.js';
import { makeCar, driveCar } from './vehicles.js';
import { resolveCollisions as _rc } from './city.js';

export class Race {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.checkpoints = [];
    this.index = 0;
    this.rivalIndex = 0;
    this.rival = null;
    this.markers = [];
    this.won = false;
    this.lost = false;
    this.raceT = 0;
  }
  /** Race progress for the HUD: { done, total }. */
  progress() {
    return { done: Math.min(this.index, this.checkpoints.length), total: this.checkpoints.length };
  }
  /** Who is ahead: 'player', 'rival', or 'tied'. */
  leader() {
    if (this.index > this.rivalIndex) return 'player';
    if (this.rivalIndex > this.index) return 'rival';
    return 'tied';
  }
  start(points) {
    this.stop();
    this.active = true;
    this.checkpoints = points.slice();
    this.index = 0;
    this.rivalIndex = 0;
    this.won = false;
    this.lost = false;
    this.raceT = 0;
    // Rival shark car starts beside the player, at the first checkpoint line.
    const start = points[0];
    this.rival = makeCar('shark', start[0] + 6, start[1] + 6, 0, { kind: 'rival' });
    this.scene.add(this.rival.mesh.group);
    // Checkpoint beacons: glowing rings the driver passes through.
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    for (const [x, z] of points) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.5, 8, 24), mat.clone());
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 2, z);
      this.scene.add(ring);
      this.markers.push(ring);
    }
    this.updateMarkerColours();
  }
  updateMarkerColours() {
    for (let i = 0; i < this.markers.length; i += 1) {
      const m = this.markers[i];
      if (i < this.index) m.material.color.setHex(0x37c978);
      else if (i === this.index) m.material.color.setHex(0xffd23f);
      else m.material.color.setHex(0x888888);
    }
  }
  nextCheckpoint() {
    return this.index < this.checkpoints.length ? this.checkpoints[this.index] : null;
  }
  /** Advance the race: player + rival checkpoints, rival AI, win/lose. */
  update(dt, px, pz, colliders, onPlayerCheckpoint) {
    if (!this.active) return;
    this.raceT += dt;
    const cp = this.nextCheckpoint();
    if (cp && dist2([px, pz], cp) < 8) {
      this.index += 1;
      onPlayerCheckpoint(this.index, this.checkpoints.length);
      this.updateMarkerColours();
      if (this.index >= this.checkpoints.length && this.rivalIndex < this.checkpoints.length) {
        this.won = true;
        this.finish();
        return;
      }
    }
    // Rival AI: drive toward its next checkpoint, NOS on long straights.
    if (this.rival && this.rivalIndex < this.checkpoints.length) {
      const rp = this.checkpoints[this.rivalIndex];
      if (dist2([this.rival.x, this.rival.z], rp) < 8) {
        this.rivalIndex += 1;
      } else {
        const want = Math.atan2(rp[0] - this.rival.x, rp[1] - this.rival.z);
        let diff = want - this.rival.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const straight = Math.abs(diff) < 0.25;
        const top = straight ? 40 : 26;
        this.rival.heading += clamp(diff, -1.4 * dt, 1.4 * dt);
        this.rival.speed = Math.min(this.rival.speed + 15 * dt, top);
        const nx = this.rival.x + Math.sin(this.rival.heading) * this.rival.speed * dt;
        const nz = this.rival.z + Math.cos(this.rival.heading) * this.rival.speed * dt;
        const pos = { x: nx, z: nz };
        _rc(colliders, pos, 2.2);
        if (Math.abs(pos.x - nx) > 0.01 || Math.abs(pos.z - nz) > 0.01) this.rival.speed *= 0.5;
        this.rival.x = pos.x;
        this.rival.z = pos.z;
        this.rival.mesh.group.position.set(this.rival.x, 0, this.rival.z);
        this.rival.mesh.group.rotation.y = this.rival.heading;
        this.rival.mesh.flame.visible = straight && this.rival.speed > 30;
      }
      if (this.rivalIndex >= this.checkpoints.length && this.index < this.checkpoints.length) {
        this.lost = true;
        this.finish();
      }
    }
  }
  finish() {
    this.active = false;
    for (const m of this.markers) this.scene.remove(m);
    this.markers = [];
    if (this.rival) {
      this.scene.remove(this.rival.mesh.group);
      this.rival = null;
    }
  }
  stop() {
    if (this.active || this.markers.length || this.rival) this.finish();
    this.won = false;
    this.lost = false;
  }
}
// The collision resolver, bound lazily so the class stays import-cycle free.
Race.resolveCollisions = _rc;
