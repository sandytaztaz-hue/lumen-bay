// LUMEN BAY r8 — people: pedestrians who stroll the sidewalks and flee gunfire,
// and armed enemies (police cordon officers, Tiburones crew) who shoot back.
// Crowds are denser at golden hour: 60+ pedestrians in bright beach colours,
// half strolling the Playa Dorada front, plus dense festival crowds at
// Festival Square. Collision/avoidance unchanged.
import * as THREE from 'three';
import { clamp, dist2, PED_COUNT } from './config.js';
import { resolveCollisions } from './city.js';
import { shirtTexture } from './textures.js';

const SHIRT_COLOURS = ['#ff2a5e', '#19b8c4', '#ffd23f', '#37c978', '#ff7a1a', '#c78bff', '#ffffff', '#3fa7ff', '#ff9a56', '#58c93c', '#e8124a', '#00c2a8'];
const SKIN_COLOURS = [0xd9a066, 0x8a5a34, 0xf2c9a0, 0x6b4226, 0xe8b88a, 0x5a3018];
const PANTS_COLOURS = [0x2a3040, 0xffffff, 0xffd23f, 0x19b8c4, 0x333333, 0x8a6f4d, 0x7a2a3a, 0x2a6b3a, 0xc78bff];
const HAIR_COLOURS = [0x1a1210, 0x3a2410, 0x6b4a1a, 0xd8b25e, 0x8a8a8a, 0x7a1a1a];
const HAT_COLOURS = [0xff2a5e, 0xffd23f, 0x19b8c4, 0xffffff, 0x222226, 0x37c978, 0xff7a1a];
/** One fully varied pedestrian: patterned shirt (stripes/checks/dots/print/
 solid, seeded so it never re-rolls), coloured pants or shorts, varied skin,
 hair, a cap/hat on ~1 in 3, a backpack on ~1 in 5, and a build that is tall,
 short, stocky or thin — no two figures in the crowd look alike. `rng` is
 the seeded stream; when absent, Math.random fills in (shot staging). */
function makePersonMesh(shirt, pants, skin, rng) {
  const r = rng || Math.random;
  const group = new THREE.Group();
  const pattern = Math.floor(r() * 5); // 0 solid, 1 stripes, 2 checks, 3 dots, 4 print
  const shirtMat = new THREE.MeshStandardMaterial({
    map: shirtTexture(r, shirt, pattern), roughness: 0.9,
  });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
  const shorts = r() < 0.3; // shorts: bare lower legs, coloured top half
  const legH = shorts ? 0.45 : 0.8;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, legH, 0.3), shorts ? skinMat : pantsMat);
  legs.position.y = legH / 2;
  group.add(legs);
  if (shorts) {
    const shortsBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.34), pantsMat);
    shortsBox.position.y = 0.62;
    group.add(shortsBox);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.4), shirtMat);
  torso.position.y = 1.2; torso.castShadow = true;
  group.add(torso);
  // Arms at the sides (shirt sleeves + skin hands) — posture reads, not a
  // flat slab. One arm sometimes raised (waving / on the phone).
  const armMat = shirtMat;
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), armMat);
    arm.position.set(s * 0.44, 1.18, 0);
    if (s === 1 && r() < 0.18) { arm.position.set(0.44, 1.45, 0.15); arm.rotation.x = -0.9; }
    group.add(arm);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.16), skinMat);
    hand.position.set(arm.position.x, arm.position.y - 0.36, arm.position.z);
    group.add(hand);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), skinMat);
  head.position.y = 1.85; head.castShadow = true;
  group.add(head);
  // Hair: a cap of hair in varied colours on most figures (not a bare ball).
  if (r() < 0.8) {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: HAIR_COLOURS[Math.floor(r() * HAIR_COLOURS.length)], roughness: 0.9 }));
    hair.position.y = 1.88;
    group.add(hair);
  }
  // Hat or cap on ~1 in 3: a brimmed cap, or a wide sun hat.
  const hatRoll = r();
  if (hatRoll < 0.22) {
    const hatMat = new THREE.MeshStandardMaterial({ color: HAT_COLOURS[Math.floor(r() * HAT_COLOURS.length)], roughness: 0.85 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.14, 10), hatMat);
    cap.position.y = 2.08;
    group.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.3), hatMat);
    brim.position.set(0, 2.03, 0.3);
    group.add(brim);
  } else if (hatRoll < 0.34) {
    const hatMat = new THREE.MeshStandardMaterial({ color: HAT_COLOURS[Math.floor(r() * HAT_COLOURS.length)], roughness: 0.85 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.18, 10), hatMat);
    crown.position.y = 2.1;
    group.add(crown);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 12), hatMat);
    brim.position.y = 2.02;
    group.add(brim);
  }
  // Backpack on ~1 in 5 — a coloured box on the back, visible from behind.
  if (r() < 0.2) {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.2),
      new THREE.MeshStandardMaterial({ color: HAT_COLOURS[Math.floor(r() * HAT_COLOURS.length)], roughness: 0.9 }));
    pack.position.set(0, 1.25, -0.3);
    group.add(pack);
  }
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 }));
  gun.position.set(0.4, 1.2, 0.3); gun.visible = false;
  group.add(gun);
  // Build: tall / short / stocky / thin — scale the whole figure.
  const h = 0.86 + r() * 0.28;
  const w = 0.82 + r() * 0.42;
  group.scale.set(w, h, w);
  return { group, gun };
}
/** Pick a fully varied outfit from the seeded stream (stable across runs). */
function pickOutfit(rng, i) {
  return {
    shirt: SHIRT_COLOURS[Math.floor(rng() * SHIRT_COLOURS.length)],
    pants: PANTS_COLOURS[Math.floor(rng() * PANTS_COLOURS.length)],
    skin: SKIN_COLOURS[Math.floor(rng() * SKIN_COLOURS.length)],
  };
}
/** Spawn 60+ pedestrians wandering the sidewalks and the beach front. */
export function spawnPedestrians(scene, rng) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    // Half the crowd strolls the beach front (Playa Drive), half the city.
    // Beach strollers wear the brightest colours (sunset beach crowd).
    const beach = i % 2 === 0;
    const x = beach ? -220 + rng() * 440 : -220 + rng() * 440;
    const z = beach ? 150 + rng() * 70 : -220 + rng() * 440;
    const outfit = pickOutfit(rng, i);
    const m = makePersonMesh(outfit.shirt, outfit.pants, outfit.skin, rng);
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
    const outfit = pickOutfit(rng, i);
    const m = makePersonMesh(outfit.shirt, outfit.pants, outfit.skin, rng);
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
/** Spawn an armed enemy (police officer or Tiburones shark) at a point —
 detailed, not flat: police get a dark cap + navy vest, sharks a red bandana
 + dark vest, so the two crews read apart at a glance. */
export function spawnEnemy(scene, x, z, kind) {
  const shirt = kind === 'police' ? '#1c4ed8' : '#222226';
  const m = makePersonMesh(shirt, kind === 'police' ? 0x1c2a4a : 0x333333, 0xd9a066);
  m.gun.visible = true;
  // Vest: a darker chest plate over the shirt.
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.55, 0.44),
    new THREE.MeshStandardMaterial({ color: kind === 'police' ? 0x0d1a3a : 0x3a0d0d, roughness: 0.9 }));
  vest.position.set(0, 1.25, 0);
  m.group.add(vest);
  if (kind === 'police') {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0x0d1a3a, roughness: 0.8 }));
    cap.position.y = 2.08;
    m.group.add(cap);
  } else {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.58),
      new THREE.MeshStandardMaterial({ color: 0xe8124a, roughness: 0.85 }));
    band.position.y = 1.98;
    m.group.add(band);
  }
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
/** Mara Solis, on foot: orange jacket with a dark collar + zipper stripe +
 belt, dark jeans, long dark hair down her back, boots — a readable close-up
 character (the night-reference brief: clothes, hair, posture visible). */
export function makePlayerMesh(scene) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.85 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.32), jeans);
  legs.position.y = 0.42;
  group.add(legs);
  // Boots: dark cuffs at the bottom of the jeans.
  for (const s of [-1, 1]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.7 }));
    boot.position.set(s * 0.14, 0.09, 0.03);
    group.add(boot);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.42), jacket);
  torso.position.y = 1.25; torso.castShadow = true;
  group.add(torso);
  // Jacket detail: dark collar, pale zipper stripe down the chest, belt.
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.44),
    new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
  collar.position.set(0, 1.68, 0);
  group.add(collar);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xffe9d0, roughness: 0.6 }));
  zip.position.set(0, 1.25, 0.22);
  group.add(zip);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.77, 0.1, 0.44),
    new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.8 }));
  belt.position.set(0, 0.86, 0);
  group.add(belt);
  // Arms with jacket sleeves, hands at her sides.
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.66, 0.2), jacket);
    arm.position.set(s * 0.47, 1.22, 0);
    group.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), skin);
  head.position.y = 1.92; head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
  hair.position.y = 1.95;
  group.add(hair);
  // Long hair down her back — the from-behind read from the night reference.
  const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
  backHair.position.set(0, 1.55, -0.24);
  group.add(backHair);
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
