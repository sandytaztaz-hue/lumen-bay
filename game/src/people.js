// LUMEN BAY r7 — people: pedestrians who stroll the sidewalks and flee gunfire,
// and armed enemies (police cordon officers, Tiburones crew) who shoot back.
// Crowds are denser now: 40+ pedestrians in bright beach colours, plus dense
// festival crowds at Festival Square. Collision/avoidance unchanged.
import * as THREE from 'three';
import { clamp, dist2, PED_COUNT } from './config.js';
import { resolveCollisions } from './city.js';

const SHIRT_COLOURS = [0xff2a5e, 0x19b8c4, 0xffd23f, 0x37c978, 0xff7a1a, 0xc78bff, 0xffffff, 0x3fa7ff, 0xff9a56, 0x58c93c];
const SKIN_COLOURS = [0xd9a066, 0x8a5a34, 0xf2c9a0, 0x6b4226, 0xe8b88a];
const PANTS_COLOURS = [0x2a3040, 0xffffff, 0xffd23f, 0x19b8c4, 0x333333, 0x8a6f4d];
function makePersonMesh(shirt, pants, skin) {
  const group = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), pantsMat);
  legs.position.y = 0.4;
  group.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.4), shirtMat);
  torso.position.y = 1.2; torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), skinMat);
  head.position.y = 1.85; head.castShadow = true;
  group.add(head);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 }));
  gun.position.set(0.4, 1.2, 0.3); gun.visible = false;
  group.add(gun);
  return { group, gun };
}
/** Spawn 40+ pedestrians wandering the sidewalks and the beach front. */
export function spawnPedestrians(scene, rng) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    // Half the crowd strolls the beach front (Playa Drive), half the city.
    const beach = i % 2 === 0;
    const x = beach ? -220 + rng() * 440 : -220 + rng() * 440;
    const z = beach ? 150 + rng() * 70 : -220 + rng() * 440;
    const shirt = SHIRT_COLOURS[i % SHIRT_COLOURS.length];
    const m = makePersonMesh(shirt, PANTS_COLOURS[i % PANTS_COLOURS.length], SKIN_COLOURS[i % SKIN_COLOURS.length]);
    m.group.position.set(x, 0, z);
    scene.add(m.group);
    peds.push({
      mesh: m.group, x, z, heading: rng() * Math.PI * 2,
      speed: 1.2 + rng() * 1.2, fleeing: false, fleeT: 0, wx: x, wz: z,
    });
  }
  return peds;
}
/** Spawn extra pedestrians near a point (shot staging / festival crowds). */
export function spawnPedestriansNear(scene, rng, cx, cz, n) {
  const peds = [];
  for (let i = 0; i < n; i += 1) {
    const x = cx + (rng() - 0.5) * 70, z = cz + (rng() - 0.5) * 50;
    const m = makePersonMesh(SHIRT_COLOURS[i % SHIRT_COLOURS.length],
      PANTS_COLOURS[i % PANTS_COLOURS.length], SKIN_COLOURS[i % SKIN_COLOURS.length]);
    m.group.position.set(x, 0, z);
    scene.add(m.group);
    peds.push({
      mesh: m.group, x, z, heading: rng() * Math.PI * 2,
      speed: 1.2 + rng() * 1.2, fleeing: false, fleeT: 0, wx: x, wz: z,
    });
  }
  return peds;
}
/** Pedestrians stroll; gunfire nearby sends them running away from it. */
export function updatePedestrians(peds, dt, gunPos, colliders) {
  for (const p of peds) {
    if (gunPos && dist2([p.x, p.z], gunPos) < 40) { p.fleeing = true; p.fleeT = 3; }
    if (p.fleeT > 0) p.fleeT -= dt;
    else p.fleeing = false;
    const speed = p.fleeing ? 5 : p.speed;
    if (p.fleeing && gunPos) {
      p.heading = Math.atan2(p.x - gunPos[0], p.z - gunPos[1]);
    } else if (dist2([p.x, p.z], [p.wx, p.wz]) < 2) {
      p.wx = clamp(p.x + (Math.random() - 0.5) * 60, -225, 225);
      p.wz = clamp(p.z + (Math.random() - 0.5) * 60, -225, 225);
      p.heading = Math.atan2(p.wx - p.x, p.wz - p.z);
    }
    const nx = p.x + Math.sin(p.heading) * speed * dt;
    const nz = p.z + Math.cos(p.heading) * speed * dt;
    const pos = { x: nx, z: nz };
    resolveCollisions(colliders, pos, 0.5);
    p.x = pos.x; p.z = pos.z;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    p.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.006 + p.x)) * 0.06;
  }
}
/** Spawn an armed enemy (police officer or Tiburones shark) at a point. */
export function spawnEnemy(scene, x, z, kind) {
  const shirt = kind === 'police' ? 0x1c4ed8 : 0x222226;
  const m = makePersonMesh(shirt, kind === 'police' ? 0x1c2a4a : 0x333333, 0xd9a066);
  m.gun.visible = true;
  m.group.position.set(x, 0, z);
  scene.add(m.group);
  return {
    mesh: m.group, gun: m.gun, x, z, kind,
    health: 100, heading: 0, shootT: 1 + Math.random(), alive: true, speed: 3.2,
  };
}
/** Enemies close to ~18 units, strafe, and shoot at the player. */
export function updateEnemy(e, dt, px, pz, onShoot, colliders) {
  if (!e.alive) return;
  const d = dist2([e.x, e.z], [px, pz]);
  const want = Math.atan2(px - e.x, pz - e.z);
  e.heading = want;
  if (d > 20) {
    const nx = e.x + Math.sin(want) * e.speed * dt;
    const nz = e.z + Math.cos(want) * e.speed * dt;
    const pos = { x: nx, z: nz };
    resolveCollisions(colliders, pos, 0.5);
    e.x = pos.x; e.z = pos.z;
  }
  e.mesh.position.set(e.x, 0, e.z);
  e.mesh.rotation.y = e.heading;
  e.shootT -= dt;
  if (e.shootT <= 0 && d < 45) {
    e.shootT = 1.1 + Math.random() * 0.8;
    onShoot(e);
  }
}
// ---- player character -------------------------------------------------------
/** Mara Solis, on foot: orange jacket, dark jeans, third-person. */
export function makePlayerMesh(scene) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.85 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.32), jeans);
  legs.position.y = 0.42;
  group.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.42), jacket);
  torso.position.y = 1.25; torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), skin);
  head.position.y = 1.92; head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
  hair.position.y = 1.95;
  group.add(hair);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 }));
  gun.position.set(0.42, 1.3, 0.35); gun.visible = false;
  group.add(gun);
  scene.add(group);
  return { group, gun };
}
/** Move the on-foot player with WASD relative to the camera heading. */
export function movePlayerOnFoot(p, dt, mx, mz, sprint, colliders) {
  const speed = sprint ? 12 : 7.5;
  const nx = p.x + mx * speed * dt;
  const nz = p.z + mz * speed * dt;
  const pos = { x: nx, z: nz };
  resolveCollisions(colliders, pos, 0.6);
  p.x = pos.x; p.z = pos.z;
  if (Math.abs(mx) > 0.01 || Math.abs(mz) > 0.01) p.heading = Math.atan2(mx, mz);
  p.mesh.group.position.set(p.x, 0, p.z);
  p.mesh.group.rotation.y = p.heading;
  const moving = Math.abs(mx) > 0.01 || Math.abs(mz) > 0.01;
  p.mesh.group.position.y = moving ? Math.abs(Math.sin(performance.now() * 0.012)) * 0.08 : 0;
}
