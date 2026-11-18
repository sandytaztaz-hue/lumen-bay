// People: Mara on foot, pedestrians who stroll and flee, and the police
// helicopter. Plus the wanted system: stars rise on crime, fall when hidden.
import * as THREE from 'three';
import { PLAYER, POLICE } from './config.js';
import { clamp, angleDiff, dist2d, range, mulberry32 } from './random.js';
import { blobTexture } from './textures.js';

let blobTex = null;
function getBlob() { if (!blobTex) blobTex = blobTexture(); return blobTex; }

const SHIRTS = ['#ff2e63', '#4fc3f7', '#ffd23e', '#7dff9b', '#ff8c2e', '#c9b8f2', '#f2e9ff', '#00e5ff'];
const SKINS = ['#e8b88a', '#c98d5f', '#8a5a3b', '#f2c9a0'];

/** A stylised person: torso, head, legs that swing while walking. */
export function buildPersonMesh(shirt, skin, isMara = false) {
  const group = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const pantsMat = new THREE.MeshLambertMaterial({ color: isMara ? '#1c2733' : '#3a3a4a' });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), shirtMat);
  torso.position.y = 1.12; group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skinMat);
  head.position.y = 1.72; group.add(head);
  if (isMara) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshLambertMaterial({ color: '#1a0f2e' }));
    hair.position.y = 1.76; group.add(hair);
    const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.38), new THREE.MeshLambertMaterial({ color: '#ffd23e' }));
    jacket.position.y = 1.42; group.add(jacket);
  } else {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.08, 10), new THREE.MeshLambertMaterial({ color: '#f7e8c9' }));
    hat.position.y = 1.94; group.add(hat);
  }
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), pantsMat);
  legL.position.set(-0.16, 0.36, 0); group.add(legL);
  const legR = legL.clone(); legR.position.x = 0.16; group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), shirtMat);
  armL.position.set(-0.4, 1.12, 0); group.add(armL);
  const armR = armL.clone(); armR.position.x = 0.4; group.add(armR);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({ map: getBlob(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; group.add(shadow);
  return { group, legL, legR, armL, armR };
}

export function makePlayer(x, z) {
  const mesh = buildPersonMesh('#ff2e63', '#e8b88a', true);
  mesh.group.position.set(x, 0, z);
  return {
    mesh, x, z, heading: 0, speed: 0,
    health: PLAYER.health, walkPhase: 0,
    weapon: 'pistol', ammo: { smg: 120 },
    inCar: null, fireCooldown: 0,
  };
}

/** Walk the player on foot; returns true if a step was taken. */
export function stepPlayer(player, input, dt, collide) {
  const run = input.run;
  const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  let mx = 0, mz = 0;
  if (input.forward) mz += 1;
  if (input.back) mz -= 1;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= len; mz /= len;
    // movement is relative to the camera heading: forward is the direction
    // the camera faces (away from the camera, toward the player and beyond)
    const cam = input.camHeading || 0;
    const sin = Math.sin(cam), cos = Math.cos(cam);
    const wx = mx * cos - mz * sin;
    const wz = -mx * sin - mz * cos;
    const nx = player.x + wx * speed * dt;
    const nz = player.z + wz * speed * dt;
    const fixed = collide(nx, nz, PLAYER.radius);
    player.x = fixed.x; player.z = fixed.z;
    player.heading = Math.atan2(wx, wz);
    player.walkPhase += dt * speed * 1.6;
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  const m = player.mesh;
  m.group.position.set(player.x, 0, player.z);
  m.group.rotation.y = player.heading;
  const swing = player.speed > 0 ? Math.sin(player.walkPhase) * 0.55 : 0;
  m.legL.rotation.x = swing; m.legR.rotation.x = -swing;
  m.armL.rotation.x = -swing * 0.8; m.armR.rotation.x = swing * 0.8;
  return len > 0;
}

/** A pedestrian: strolls a sidewalk loop, flees from gunfire. */
export function makePed(random, x, z) {
  const shirt = SHIRTS[Math.floor(random() * SHIRTS.length)];
  const skin = SKINS[Math.floor(random() * SKINS.length)];
  const mesh = buildPersonMesh(shirt, skin, false);
  mesh.group.position.set(x, 0, z);
  return {
    mesh, x, z, heading: random() * Math.PI * 2,
    speed: 1.4 + random() * 0.8, walkPhase: random() * 6,
    flee: 0, panic: 0, targetX: x, targetZ: z,
    rng: mulberry32(Math.floor(random() * 1e9)),
  };
}

export function stepPed(ped, dt, danger, collide) {
  if (danger) { ped.flee = 3; ped.panic = 1; }
  let speed = ped.speed;
  if (ped.flee > 0) {
    ped.flee -= dt;
    speed = 5.5;
    if (danger) ped.heading = Math.atan2(ped.x - danger.x, ped.z - danger.z) + (ped.panic > 0 ? Math.sin(ped.walkPhase * 2) * 0.3 : 0);
  } else if (dist2d(ped.x, ped.z, ped.targetX, ped.targetZ) < 3) {
    // pick a new nearby sidewalk target (seeded — deterministic replays)
    ped.targetX = clamp(ped.x + range(ped.rng, -60, 60), -270, 270);
    ped.targetZ = clamp(ped.z + range(ped.rng, -60, 60), -270, 270);
    ped.heading = Math.atan2(ped.targetX - ped.x, ped.targetZ - ped.z);
  }
  const nx = ped.x + Math.sin(ped.heading) * speed * dt;
  const nz = ped.z + Math.cos(ped.heading) * speed * dt;
  const fixed = collide(nx, nz, 0.5);
  ped.x = fixed.x; ped.z = fixed.z;
  ped.walkPhase += dt * speed * 1.8;
  const m = ped.mesh;
  m.group.position.set(ped.x, 0, ped.z);
  m.group.rotation.y = ped.heading;
  const swing = Math.sin(ped.walkPhase) * 0.5;
  m.legL.rotation.x = swing; m.legR.rotation.x = -swing;
  m.armL.rotation.x = -swing * 0.8; m.armR.rotation.x = swing * 0.8;
}

/** The LCPD helicopter: circles the player, spotlight cone, rotor spin. */
export function makeHeli() {
  const group = new THREE.Group();
  group.name = 'LCPD HELICOPTER';
  const bodyMat = new THREE.MeshLambertMaterial({ color: '#1c2733' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 5.2), bodyMat);
  group.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.0, 1.6), new THREE.MeshLambertMaterial({ color: '#182030' }));
  glass.position.set(0, 0.3, 2.0); group.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4), bodyMat);
  tail.position.set(0, 0.3, -4.4); group.add(tail);
  const rotorMat = new THREE.MeshBasicMaterial({ color: '#22222c' });
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), rotorMat);
  rotor.position.y = 1.1; group.add(rotor);
  const rotor2 = rotor.clone(); rotor2.rotation.y = Math.PI / 2; group.add(rotor2);
  const skidMat = new THREE.MeshLambertMaterial({ color: '#444' });
  for (const x of [-0.9, 0.9]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.6), skidMat);
    skid.position.set(x, -1.0, 0); group.add(skid);
  }
  // spotlight cone under the belly
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(5, 20, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: '#fff3c9', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -10; cone.rotation.x = Math.PI; group.add(cone);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(4.5, 16), new THREE.MeshBasicMaterial({ color: '#fff3c9', transparent: true, opacity: 0.22, depthWrite: false }));
  spot.rotation.x = -Math.PI / 2; spot.position.y = -19.5; group.add(spot);
  return { group, rotor, rotor2, angle: 0, active: false };
}

export function stepHeli(heli, px, pz, dt) {
  if (!heli.active) return;
  heli.angle += dt * 0.25;
  const r = 30;
  heli.group.position.set(px + Math.cos(heli.angle) * r, 20, pz + Math.sin(heli.angle) * r);
  heli.group.rotation.y = -heli.angle;
  heli.rotor.rotation.y += dt * 22;
  heli.rotor2.rotation.y += dt * 22;
}

/** Wanted stars: 0–5. Crimes raise it; hiding lowers it after a delay. */
export function makeWanted() {
  return { stars: 0, hiddenTimer: 0, lastCrime: -999, elapsed: 0 };
}

export function addWanted(wanted, n, reason) {
  wanted.stars = clamp(wanted.stars + n, 0, 5);
  wanted.lastCrime = wanted.elapsed;
  wanted.hiddenTimer = 0;
  return reason;
}

export function stepWanted(wanted, dt, policeNear) {
  wanted.elapsed += dt;
  if (wanted.stars === 0) return;
  if (policeNear) { wanted.hiddenTimer = 0; return; }
  wanted.hiddenTimer += dt;
  if (wanted.hiddenTimer > POLICE.decayDelay) {
    wanted.stars = Math.max(0, wanted.stars - 1);
    wanted.hiddenTimer = 0;
  }
}

/** A foot cop for the cordon job: stands, aims, shoots slowly at Mara. */
export function makeFootCop(x, z) {
  const mesh = buildPersonMesh('#1c2733', '#c98d5f', false);
  mesh.group.position.set(x, 0, z);
  return { mesh, x, z, heading: 0, cooldown: 1.5, alive: true };
}

export function stepFootCop(cop, px, pz, dt) {
  if (!cop.alive) return false;
  const d = dist2d(cop.x, cop.z, px, pz);
  cop.heading = Math.atan2(px - cop.x, pz - cop.z);
  cop.mesh.group.rotation.y = cop.heading;
  cop.cooldown -= dt;
  if (d < 45 && cop.cooldown <= 0) {
    cop.cooldown = 1.6;
    return true; // fires
  }
  return false;
}
