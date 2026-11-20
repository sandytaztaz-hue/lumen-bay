// LUMEN BAY r12 — people: pedestrians who stroll the sidewalks and flee
// gunfire, and armed enemies (police cordon officers, Tiburones crew) who
// shoot back. Crowds are dense: 60+ pedestrians in bright beach colours,
// half strolling the Playa Dorada front, plus festival crowds at Festival
// Square. Every figure looks different — striped, checked and printed
// shirts, hats, backpacks, tall, short, stocky and thin.
// r12 shot-1/2/4 revision: a shootout must READ — the old figures hung
// their arms and hid the gun at their side, so from any camera the "pistol"
// was invisible. makePersonMesh / makePlayerMesh now expose their arm +
// hand + gun meshes on group.userData.parts, and poseAim() puts a figure
// into a two-handed aiming stance: both arms forward, pistol out in front
// at chest height, so the gun + shooting pose read at a glance.
import * as THREE from 'three';
import { clamp, dist2, PED_COUNT } from './config.js';
import { resolveCollisions } from './city.js';
import { shirtTexture } from './textures.js';

const SHIRT_COLOURS = ['#ff2a5e', '#19b8c4', '#ffd23f', '#37c978', '#ff7a1a', '#c78bff', '#ffffff', '#3fa7ff', '#ff9a56', '#58c93c', '#e8124a', '#00c2a8'];
const SKIN_COLOURS = [0xd9a066, 0x8a5a34, 0xf2c9a0, 0x6b4226, 0xe8b88a, 0x5a3018];
const PANTS_COLOURS = [0x2a3040, 0xffffff, 0xffd23f, 0x19b8c4, 0x333333, 0x8a6f4d, 0x7a2a3a, 0x2a6b3a, 0xc78bff];
const HAIR_COLOURS = [0x1a1210, 0x3a2410, 0x6b4a1a, 0xd8b25e, 0x8a8a8a, 0x7a1a1a];
const HAT_COLOURS = [0xff2a5e, 0xffd23f, 0x19b8c4, 0xffffff, 0x222226, 0x37c978, 0xff7a1a];
/** Two-handed aiming stance: both arms forward, pistol out in front at
 chest height. The arms are boxes pivoted at their centre, so each arm is
 rotated forward (-x) and its hand + the gun are re-seated at the arm's
 forward end; the left arm angles across to support the grip. The pose is
 LOCAL (group space, forward = +z), so it survives the group's world
 rotation — an officer posed once keeps aiming at Mara while updateEnemy
 turns him to face her. Call it on a staged figure's group only; plain
 play never poses anyone. */
export function poseAim(group) {
  if (!group || !group.userData || !group.userData.parts) return false;
  const p = group.userData.parts;
  // Right (gun) arm: straight forward, slightly down.
  if (p.armR) { p.armR.rotation.set(-1.45, 0, 0); p.armR.position.set(0.44, 1.32, 0.18); }
  if (p.handR) p.handR.position.set(0.44, 1.32, 0.55);
  // Left arm: forward + angled across the chest to the grip.
  if (p.armL) { p.armL.rotation.set(-1.25, 0, 0.45); p.armL.position.set(0.12, 1.3, 0.28); }
  if (p.handL) p.handL.position.set(0.3, 1.3, 0.58);
  // Pistol out in front, past the right hand, barrel forward (+z local).
  if (p.gun) {
    p.gun.visible = true;
    p.gun.position.set(0.44, 1.32, 0.78);
    p.gun.rotation.set(0, 0, 0);
  }
  return true;
}
/** One fully varied pedestrian: patterned shirt, coloured pants or shorts,
 varied skin, hair, a cap/hat on ~1 in 3, a backpack on ~1 in 5, and a build
 that is tall, short, stocky or thin. `rng` is the seeded stream; when
 absent, Math.random fills in (shot staging). Returns { group, gun }. */
function makePersonMesh(shirt, pants, skin, rng) {
  const r = rng || Math.random;
  const group = new THREE.Group();
  const pattern = Math.floor(r() * 5);
  const shirtMat = new THREE.MeshStandardMaterial({
    map: shirtTexture(r, shirt, pattern), roughness: 0.9,
  });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
  const shorts = r() < 0.3;
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
  const armMat = shirtMat;
  let armL = null; let armR = null; let handL = null; let handR = null;
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), armMat);
    arm.position.set(s * 0.44, 1.18, 0);
    if (s === 1 && r() < 0.18) { arm.position.set(0.44, 1.45, 0.15); arm.rotation.x = -0.9; }
    group.add(arm);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.16), skinMat);
    hand.position.set(arm.position.x, arm.position.y - 0.36, arm.position.z);
    group.add(hand);
    if (s === 1) { armR = arm; handR = hand; } else { armL = arm; handL = hand; }
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), skinMat);
  head.position.y = 1.85; head.castShadow = true;
  group.add(head);
  if (r() < 0.8) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: HAIR_COLOURS[Math.floor(r() * HAIR_COLOURS.length)], roughness: 0.9 }));
    hair.position.y = 1.88;
    group.add(hair);
  }
  // Hat or cap on ~1 in 3.
  if (r() < 0.33) {
    const hatMat = new THREE.MeshStandardMaterial({ color: HAT_COLOURS[Math.floor(r() * HAT_COLOURS.length)], roughness: 0.85 });
    if (r() < 0.5) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.14, 10), hatMat);
      cap.position.y = 2.08;
      group.add(cap);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.3), hatMat);
      brim.position.set(0, 2.02, 0.28);
      group.add(brim);
    } else {
      const brimHat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.06, 12), hatMat);
      brimHat.position.y = 2.06;
      group.add(brimHat);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.22, 10), hatMat);
      top.position.y = 2.16;
      group.add(top);
    }
  }
  // Backpack on ~1 in 5.
  if (r() < 0.2) {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.18),
      new THREE.MeshStandardMaterial({ color: HAT_COLOURS[Math.floor(r() * HAT_COLOURS.length)], roughness: 0.9 }));
    pack.position.set(0, 1.25, -0.3);
    group.add(pack);
  }
  // Build variation: tall / short / stocky / thin.
  const build = r();
  if (build < 0.25) group.scale.set(0.92, 1.12, 0.92);
  else if (build < 0.5) group.scale.set(1.08, 0.92, 1.05);
  else if (build < 0.75) group.scale.set(0.9, 0.9, 0.9);
  else group.scale.set(1.05, 1.02, 1.0);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 }));
  gun.position.set(0.42, 1.3, 0.35);
  gun.visible = false;
  group.add(gun);
  group.userData.parts = { armL, armR, handL, handR, gun };
  return { group, gun };
}
export function spawnPedestrians(scene, rng) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    const shirt = SHIRT_COLOURS[Math.floor(rng() * SHIRT_COLOURS.length)];
    const pants = PANTS_COLOURS[Math.floor(rng() * PANTS_COLOURS.length)];
    const skin = SKIN_COLOURS[Math.floor(rng() * SKIN_COLOURS.length)];
    const m = makePersonMesh(shirt, pants, skin, rng);
    // Half the crowd strolls the Playa Dorada front; the rest spread out.
    let x, z;
    if (i % 2 === 0) { x = -220 + rng() * 440; z = 150 + rng() * 70; }
    else { x = -220 + rng() * 440; z = -220 + rng() * 440; }
    m.group.position.set(x, 0, z);
    scene.add(m.group);
    peds.push({ mesh: m.group, x, z, wx: x, wz: z, speed: 1.5 + rng() * 2, heading: rng() * Math.PI * 2, flee: false });
  }
  return peds;
}
export function spawnPedestriansNear(scene, rng, cx, cz, n) {
  const peds = [];
  for (let i = 0; i < n; i += 1) {
    const shirt = SHIRT_COLOURS[Math.floor(rng() * SHIRT_COLOURS.length)];
    const pants = PANTS_COLOURS[Math.floor(rng() * PANTS_COLOURS.length)];
    const skin = SKIN_COLOURS[Math.floor(rng() * SKIN_COLOURS.length)];
    const m = makePersonMesh(shirt, pants, skin, rng);
    const x = cx + (rng() - 0.5) * 40;
    const z = cz + (rng() - 0.5) * 40;
    m.group.position.set(x, 0, z);
    scene.add(m.group);
    peds.push({ mesh: m.group, x, z, wx: x, wz: z, speed: 1.5 + rng() * 2, heading: rng() * Math.PI * 2, flee: false });
  }
  return peds;
}
/** Pedestrians stroll to waypoints; gunfire makes them flee from the shots. */
export function updatePedestrians(peds, dt, gunPos, colliders) {
  for (const p of peds) {
    if (gunPos) {
      const d = dist2([p.x, p.z], gunPos);
      if (d < 30) p.flee = true;
    }
    if (p.flee) {
      const away = Math.atan2(p.x - (gunPos ? gunPos[0] : p.x), p.z - (gunPos ? gunPos[1] : p.z));
      p.x += Math.sin(away) * 6 * dt;
      p.z += Math.cos(away) * 6 * dt;
      p.heading = away;
      if (!gunPos || dist2([p.x, p.z], gunPos) > 60) p.flee = false;
    } else {
      const dx = p.wx - p.x, dz = p.wz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 2) {
        p.wx = clamp(p.x + (Math.random() - 0.5) * 80, -230, 230);
        p.wz = clamp(p.z + (Math.random() - 0.5) * 80, -230, 230);
      } else {
        const want = Math.atan2(dx, dz);
        p.heading = want;
        p.x += Math.sin(want) * p.speed * dt;
        p.z += Math.cos(want) * p.speed * dt;
      }
    }
    const pos = { x: p.x, z: p.z };
    resolveCollisions(colliders, pos, 0.5);
    p.x = pos.x; p.z = pos.z;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    p.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.008 + p.x)) * 0.05;
  }
}
/** An armed enemy: police officer or Tiburones shark, vest + cap/band. */
export function spawnEnemy(scene, x, z, kind) {
  const shirt = kind === 'police' ? '#1c4ed8' : '#222226';
  const m = makePersonMesh(shirt, kind === 'police' ? 0x1c2a4a : 0x333333, 0xd9a066);
  m.gun.visible = true;
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
 belt, dark jeans, long dark hair down her back, boots — a readable
 close-up character. */
export function makePlayerMesh(scene) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.85 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.32), jeans);
  legs.position.y = 0.42;
  group.add(legs);
  for (const s of [-1, 1]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.7 }));
    boot.position.set(s * 0.14, 0.09, 0.03);
    group.add(boot);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.42), jacket);
  torso.position.y = 1.25; torso.castShadow = true;
  group.add(torso);
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
  let armL = null; let armR = null; let handL = null; let handR = null;
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.66, 0.2), jacket);
    arm.position.set(s * 0.47, 1.22, 0);
    group.add(arm);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.17, 0.17), skin);
    hand.position.set(s * 0.47, 0.86, 0);
    group.add(hand);
    if (s === 1) { armR = arm; handR = hand; } else { armL = arm; handL = hand; }
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), skin);
  head.position.y = 1.92; head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
  hair.position.y = 1.95;
  group.add(hair);
  const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
  backHair.position.set(0, 1.55, -0.24);
  group.add(backHair);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 }));
  gun.position.set(0.42, 1.3, 0.35); gun.visible = false;
  group.add(gun);
  group.userData.parts = { armL, armR, handL, handR, gun };
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
