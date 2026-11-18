// People: 24 pedestrians strolling the sidewalks who flee from gunfire, police
// officers on foot who hold cordons and shoot back, and the crew members who show
// up in the story. Everyone is a simple two-part figure; behaviour lives here.
import * as THREE from 'three';
import { ROADS } from './config.js';
import { int, pick, range } from './random.js';

const SHIRT_COLORS = [0xe84a6f, 0x39d5ff, 0xffd24a, 0x7dff9a, 0xf6ead2, 0xd98a5f, 0x8a4ad9, 0x5a7a9e];

export function makePersonMesh(shirt, pants = 0x2a2a33, police = false) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd9a077 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.05, 8), shirtMat);
  body.position.y = 1.05; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skinMat);
  head.position.y = 1.85; g.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), pantsMat);
  legL.position.set(-0.14, 0.28, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.14; g.add(legR);
  if (police) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0x1c4fd6 }));
    cap.position.y = 2.08; g.add(cap);
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.5, 0.1), new THREE.MeshLambertMaterial({ color: 0x14141a }));
    vest.position.set(0, 1.2, 0.36); g.add(vest);
  }
  g.userData.legs = [legL, legR];
  return g;
}

export function createPedestrians(scene, rng, count = 24) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makePersonMesh(pick(rng, SHIRT_COLORS));
    scene.add(mesh);
    const road = pick(rng, ROADS);
    const along = range(rng, -280, 280);
    const side = rng() > 0.5 ? 1 : -1;
    const horizontal = rng() > 0.5;
    const pos = horizontal
      ? new THREE.Vector3(along, 0, road + side * 9)
      : new THREE.Vector3(road + side * 9, 0, along);
    peds.push({
      mesh, pos, angle: range(rng, 0, Math.PI * 2), speed: range(rng, 1.2, 2.2),
      flee: 0, horizontal, road, side, walkPhase: rng() * 6,
    });
    mesh.position.copy(pos);
  }
  return peds;
}

export function updatePedestrians(peds, dt, dangerPos, gunfire) {
  for (const p of peds) {
    if (gunfire && dangerPos && p.pos.distanceTo(dangerPos) < 45) p.flee = 6;
    if (p.flee > 0) {
      p.flee -= dt;
      const dx = p.pos.x - dangerPos.x, dz = p.pos.z - dangerPos.z;
      const d = Math.hypot(dx, dz) || 1;
      p.angle = Math.atan2(dx / d, dz / d);
      p.pos.x += Math.sin(p.angle) * 5.5 * dt;
      p.pos.z += Math.cos(p.angle) * 5.5 * dt;
    } else {
      // Stroll along the sidewalk; turn around at the city edge.
      p.pos.x += Math.sin(p.angle) * p.speed * dt;
      p.pos.z += Math.cos(p.angle) * p.speed * dt;
      if (Math.abs(p.pos.x) > 285 || Math.abs(p.pos.z) > 285) p.angle += Math.PI;
    }
    p.walkPhase += dt * (p.flee > 0 ? 11 : 6);
    p.mesh.position.copy(p.pos);
    p.mesh.rotation.y = p.angle;
    const swing = Math.sin(p.walkPhase) * 0.5;
    p.mesh.userData.legs[0].rotation.x = swing;
    p.mesh.userData.legs[1].rotation.x = -swing;
  }
}

/** A police officer on foot: holds a spot, shoots at the player when close. */
export function makeFootCop(scene, x, z) {
  const mesh = makePersonMesh(0x1c4fd6, 0x14141a, true);
  scene.add(mesh);
  mesh.position.set(x, 0, z);
  return {
    mesh, pos: new THREE.Vector3(x, 0, z), health: 100, alive: true,
    shootTimer: range(Math.random, 0.4, 1.2), angle: 0, kind: 'cop',
  };
}

export function updateFootCop(cop, playerPos, dt, onShoot) {
  if (!cop.alive) return;
  const dx = playerPos.x - cop.pos.x, dz = playerPos.z - cop.pos.z;
  const dist = Math.hypot(dx, dz);
  cop.angle = Math.atan2(dx, dz);
  cop.mesh.rotation.y = cop.angle;
  cop.shootTimer -= dt;
  if (dist < 55 && cop.shootTimer <= 0) {
    cop.shootTimer = range(Math.random, 0.9, 1.6);
    // Inaccurate at range: the further away, the more likely to miss.
    const hit = Math.random() > Math.min(0.75, dist / 70);
    onShoot(cop, hit ? int(Math.random, 6, 14) : 0);
  }
}

/** Health, armour and SMG pickups: glowing markers scattered around the city. */
export function createPickups(scene, rng) {
  const defs = [];
  const spots = [
    { x: -40, z: -180, kind: 'health' }, { x: 90, z: -40, kind: 'armour' },
    { x: -160, z: 90, kind: 'health' }, { x: 40, z: 160, kind: 'smg' },
    { x: 180, z: 220, kind: 'health' }, { x: -200, z: -140, kind: 'armour' },
    { x: 20, z: 40, kind: 'smg' }, { x: -90, z: 230, kind: 'health' },
    { x: 230, z: 60, kind: 'armour' }, { x: -20, z: -60, kind: 'health' },
  ];
  const colors = { health: 0x2ee66b, armour: 0x39d5ff, smg: 0xffd24a };
  for (const s of spots) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshBasicMaterial({ color: colors[s.kind] }),
    );
    mesh.position.set(s.x, 1.2, s.z);
    scene.add(mesh);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.8, 20),
      new THREE.MeshBasicMaterial({ color: colors[s.kind], transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2; ring.position.set(s.x, 0.1, s.z);
    scene.add(ring);
    defs.push({ ...s, mesh, ring, taken: false, spin: rng() * 6 });
  }
  return defs;
}

export function updatePickups(pickups, dt, playerPos, onCollect) {
  for (const p of pickups) {
    if (p.taken) continue;
    p.spin += dt * 2;
    p.mesh.rotation.y = p.spin;
    p.mesh.position.y = 1.2 + Math.sin(p.spin * 1.4) * 0.25;
    const dx = playerPos.x - p.mesh.position.x, dz = playerPos.z - p.mesh.position.z;
    if (dx * dx + dz * dz < 3.2) {
      p.taken = true;
      p.mesh.visible = false; p.ring.visible = false;
      onCollect(p.kind);
    }
  }
}

/** A crew member standing at a story spot (Lena, Dario, Tio). */
export function makeCrewMember(scene, x, z, shirt) {
  const mesh = makePersonMesh(shirt, 0x2a2a33, false);
  scene.add(mesh);
  mesh.position.set(x, 0, z);
  return { mesh, pos: new THREE.Vector3(x, 0, z) };
}
