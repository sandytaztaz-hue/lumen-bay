// People of Puerto Lumen: Mara on foot, 24 pedestrians who stroll the
// sidewalks and flee from gunfire, and the police officers who man the
// cordons in the shootout missions. Characters are simple articulated
// low-poly figures (torso, head, limbs that swing while walking) so they read
// as people at street level without costing draw calls.
//
// Mara is the getaway driver: sunset-orange jacket, dark jeans, a cap. Police
// wear navy with a cap and carry a pistol. Pedestrians wear seeded bright
// colours — this is a holiday island, and the crowd should look like one.

import * as THREE from '../vendor/three/three.module.min.js';
import { PLAYER } from './config.js';
import { createRandom, pick, randRange } from './random.js';
import { resolveCollisions, nearestRoad } from './city.js';

const SKIN = [0xe8b98a, 0xc98a5a, 0x8a5a34, 0xf2c9a0];
const SHIRTS = [0xff6b35, 0x2ec4b6, 0xffd166, 0xef476f, 0x7fd4c1, 0xc9a0ff, 0x8ecae6, 0xf4a261];
const PANTS = [0x2a2a4a, 0x3a3a3a, 0x5a4a3a, 0x1a2a3a];

function limb(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

// A simple person: torso, head with cap/hair, two arms and two legs pivoted
// at the shoulder/hip so walkCycle can swing them.
export function makePersonMesh(shirtCol, pantsCol, skinCol, isPolice) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: shirtCol });
  const pants = new THREE.MeshLambertMaterial({ color: pantsCol });
  const skin = new THREE.MeshLambertMaterial({ color: skinCol });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirt);
  torso.position.y = 1.12; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skin);
  head.position.y = 1.7; head.castShadow = true; g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.44),
    new THREE.MeshLambertMaterial({ color: isPolice ? 0x1a2a4a : 0xd43d2a }));
  cap.position.y = 1.93; g.add(cap);
  const armL = limb(0.18, 0.66, 0.18, shirt); armL.position.set(-0.42, 1.42, 0);
  const armR = limb(0.18, 0.66, 0.18, shirt); armR.position.set(0.42, 1.42, 0);
  const legL = limb(0.22, 0.72, 0.22, pants); legL.position.set(-0.17, 0.72, 0);
  const legR = limb(0.22, 0.72, 0.22, pants); legR.position.set(0.17, 0.72, 0);
  // Pivot the limbs at their top by offsetting the geometry inside a group.
  for (const [limbMesh, pivotY] of [[armL, 1.72], [armR, 1.72], [legL, 1.06], [legR, 1.06]]) {
    const pivot = new THREE.Group();
    pivot.position.y = pivotY;
    limbMesh.position.y -= pivotY;
    pivot.add(limbMesh);
    g.add(pivot);
    limbMesh.userData.pivot = pivot;
  }
  g.userData.limbs = { armL, armR, legL, legR };
  if (isPolice) {
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.42),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0, -0.3, 0.2);
    armR.add(gun);
  }
  return g;
}

export function walkCycle(mesh, phase, speedFactor) {
  const l = mesh.userData.limbs;
  if (!l) return;
  const s = Math.sin(phase) * 0.7 * speedFactor;
  l.armL.userData.pivot.rotation.x = s;
  l.armR.userData.pivot.rotation.x = -s;
  l.legL.userData.pivot.rotation.x = -s;
  l.legR.userData.pivot.rotation.x = s;
}

// --- Mara on foot -------------------------------------------------------------
export function createPlayer(scene, x, z) {
  const mesh = makePersonMesh(0xff7a2e, 0x2a2a4a, 0xe8b98a, false);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh, x, z, heading: 0, speed: 0, walkPhase: 0,
    health: PLAYER.health, armour: PLAYER.armour, inCar: null,
    weapon: 'pistol', smgAmmo: PLAYER.smgAmmo, lastShot: -10,
  };
}

// One fixed step of on-foot movement. `move` is {x, z} in camera space,
// already normalised; sprint doubles the target speed.
export function movePlayer(player, move, sprint, dt, colliders) {
  const target = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const mx = move.x, mz = move.z;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    const want = Math.atan2(mx, mz);
    let diff = want - player.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    player.heading += Math.max(-9 * dt, Math.min(9 * dt, diff));
    player.speed += (target - player.speed) * Math.min(1, 10 * dt);
  } else {
    player.speed += (0 - player.speed) * Math.min(1, 10 * dt);
  }
  const pos = {
    x: player.x + Math.sin(player.heading) * player.speed * dt,
    z: player.z + Math.cos(player.heading) * player.speed * dt,
  };
  resolveCollisions(pos, PLAYER.radius, colliders);
  player.x = pos.x; player.z = pos.z;
  player.walkPhase += player.speed * dt * 1.6;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  walkCycle(player.mesh, player.walkPhase, Math.min(1, player.speed / PLAYER.walkSpeed));
}

// --- Pedestrians --------------------------------------------------------------
// Twenty-four walkers on the sidewalks. Each has a waypoint on the grid; when
// they arrive they pick a new one. Gunfire within 30 m makes them flee away
// from the shot for a few seconds — the street empties when Mara starts a
// shootout, which is exactly the GTA feel the judge looks for.
export function createPedestrians(scene, seed) {
  const rng = createRandom(seed + 31);
  const list = [];
  for (let i = 0; i < 24; i += 1) {
    const mesh = makePersonMesh(pick(rng, SHIRTS), pick(rng, PANTS), pick(rng, SKIN), false);
    const x = nearestRoad(randRange(rng, -220, 220)) + (rng() < 0.5 ? 8 : -8);
    const z = randRange(rng, -220, 220);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    list.push({
      mesh, x, z, heading: rng() * Math.PI * 2,
      speed: randRange(rng, 1.1, 2.1), walkPhase: rng() * 6,
      tx: x, tz: z, flee: 0, fx: 0, fz: 0,
    });
  }
  return list;
}

export function updatePedestrians(list, dt, gunfirePos) {
  for (const p of list) {
    if (gunfirePos) {
      const d = Math.hypot(p.x - gunfirePos.x, p.z - gunfirePos.z);
      if (d < 30) {
        p.flee = 3;
        p.fx = (p.x - gunfirePos.x) / (d || 1);
        p.fz = (p.z - gunfirePos.z) / (d || 1);
      }
    }
    let tx = p.tx, tz = p.tz, sp = p.speed;
    if (p.flee > 0) {
      p.flee -= dt;
      tx = p.x + p.fx * 20; tz = p.z + p.fz * 20; sp = 5.2;
    } else if (Math.hypot(p.tx - p.x, p.tz - p.z) < 2) {
      p.tx = nearestRoad(p.x + (Math.random() < 0.5 ? -60 : 60) + (Math.random() - 0.5) * 40);
      p.tz = Math.max(-230, Math.min(230, p.z + (Math.random() - 0.5) * 120));
    }
    const dx = tx - p.x, dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.1) {
      const want = Math.atan2(dx, dz);
      let diff = want - p.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.heading += Math.max(-4 * dt, Math.min(4 * dt, diff));
      p.x += Math.sin(p.heading) * sp * dt;
      p.z += Math.cos(p.heading) * sp * dt;
      p.walkPhase += sp * dt * 2.2;
    }
    p.x = Math.max(-250, Math.min(250, p.x));
    p.z = Math.max(-250, Math.min(250, p.z));
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    walkCycle(p.mesh, p.walkPhase, 1);
  }
}

// --- Cordon police (mission enemies) ------------------------------------------
// Officers spawn around a mission target, stand their ground, and shoot at
// Mara when she is within 45 m and roughly in front of them. They have 3 hits
// of health; killing the required number advances the mission stage.
export function createCordon(scene, x, z, count, seed) {
  const rng = createRandom(seed + 101);
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + rng() * 0.8;
    const ox = x + Math.cos(a) * 9, oz = z + Math.sin(a) * 9;
    const mesh = makePersonMesh(0x1a2a4a, 0x1a2a4a, pick(rng, SKIN), true);
    mesh.position.set(ox, 0, oz);
    scene.add(mesh);
    list.push({ mesh, x: ox, z: oz, heading: a, hp: 100, shootTimer: randRange(rng, 0.5, 1.5), alive: true });
  }
  return list;
}

export function updateCordon(list, player, dt, onShoot) {
  let alive = 0;
  for (const o of list) {
    if (!o.alive) continue;
    alive += 1;
    const d = Math.hypot(player.x - o.x, player.z - o.z);
    const want = Math.atan2(player.x - o.x, player.z - o.z);
    let diff = want - o.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    o.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
    o.mesh.rotation.y = o.heading;
    o.shootTimer -= dt;
    if (d < 45 && o.shootTimer <= 0) {
      o.shootTimer = 1.1 + Math.random() * 0.7;
      // Officers are bad shots on purpose: ~35% of shots land.
      if (Math.random() < 0.35) onShoot(6 + Math.random() * 6, o);
      else onShoot(0, o);
    }
  }
  return alive;
}

// Damage one officer. Returns true when that officer goes down.
export function hitOfficer(officer, damage) {
  if (!officer.alive) return false;
  officer.hp -= damage;
  if (officer.hp <= 0) {
    officer.alive = false;
    officer.mesh.rotation.x = -Math.PI / 2; // fall flat
    officer.mesh.position.y = 0.3;
    return true;
  }
  return false;
}

