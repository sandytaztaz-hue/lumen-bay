// LUMEN BAY — people: Mara on foot, pedestrians, police on foot.
// Characters are simple articulated box figures with a walk swing; pedestrians
// stroll the sidewalks and flee from gunfire; cordon police shoot back.
import * as THREE from 'three';

const SHIRT_COLORS = [0xff6b35, 0x2ee6ff, 0xffe14d, 0x39d353, 0xff2e88, 0xf2f2f2, 0x9fc5c9];

// A low-poly person: head, torso, legs, arms. `uniform` colours the torso.
export function makePerson(shirtColor, skinColor, uniform) {
  const group = new THREE.Group();
  const shirt = uniform ? 0x1a2a4a : shirtColor;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.34), new THREE.MeshLambertMaterial({ color: shirt }));
  torso.position.y = 1.18;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshLambertMaterial({ color: skinColor }));
  head.position.y = 1.78;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.46), new THREE.MeshLambertMaterial({ color: uniform ? 0x111111 : 0x3a2415 }));
  hair.position.y = 2.02;
  group.add(hair);
  const legMat = new THREE.MeshLambertMaterial({ color: uniform ? 0x222233 : 0x2c3550 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.26), legMat);
  legL.position.set(-0.17, 0.4, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.26), legMat);
  legR.position.set(0.17, 0.4, 0);
  group.add(legR);
  const armMat = new THREE.MeshLambertMaterial({ color: skinColor });
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.2), armMat);
  armL.position.set(-0.42, 1.2, 0);
  group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.2), armMat);
  armR.position.set(0.42, 1.2, 0);
  group.add(armR);
  group.userData = { legL, legR, armL, armR };
  return group;
}

// Mara Solis: sunset-orange jacket, dark hair, the getaway driver.
export function makeMara() {
  const mara = makePerson(0xff6b35, 0xc98a5e, false);
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.5, 0.4), new THREE.MeshLambertMaterial({ color: 0xff8c42 }));
  jacket.position.y = 1.3;
  mara.add(jacket);
  return mara;
}

function walkSwing(person, phase) {
  const u = person.userData;
  if (!u.legL) return;
  u.legL.rotation.x = Math.sin(phase) * 0.6;
  u.legR.rotation.x = -Math.sin(phase) * 0.6;
  u.armL.rotation.x = -Math.sin(phase) * 0.45;
  u.armR.rotation.x = Math.sin(phase) * 0.45;
}

// 24 pedestrians strolling the sidewalks.
export function createPedestrians(random, scene) {
  const peds = [];
  for (let i = 0; i < 24; i += 1) {
    const mesh = makePerson(SHIRT_COLORS[i % SHIRT_COLORS.length], [0xc98a5e, 0x8a5a3a, 0xe8b48a][i % 3], false);
    const x = random.range(-200, 200);
    const z = random.range(-200, 200);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh, x, z, yaw: random.range(0, Math.PI * 2),
      speed: random.range(1.2, 2.4), targetX: x, targetZ: z,
      fleeing: false, phase: random.range(0, 6),
    });
  }
  return peds;
}

// Pedestrians wander to a nearby sidewalk point; gunfire within 25 m makes
// them sprint away from it for a few seconds.
export function updatePedestrians(peds, dt, gunfirePos) {
  for (const ped of peds) {
    ped.phase += dt * 6;
    if (gunfirePos) {
      const dx = ped.x - gunfirePos.x;
      const dz = ped.z - gunfirePos.z;
      if (Math.hypot(dx, dz) < 25) {
        ped.fleeing = true;
        ped.targetX = ped.x + dx * 2;
        ped.targetZ = ped.z + dz * 2;
      }
    }
    const dx = ped.targetX - ped.x;
    const dz = ped.targetZ - ped.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.5) {
      ped.fleeing = false;
      ped.targetX = Math.max(-220, Math.min(220, ped.x + (Math.random() - 0.5) * 90));
      ped.targetZ = Math.max(-220, Math.min(220, ped.z + (Math.random() - 0.5) * 90));
    } else {
      const speed = ped.fleeing ? ped.speed * 3.2 : ped.speed;
      ped.x += (dx / dist) * speed * dt;
      ped.z += (dz / dist) * speed * dt;
      ped.yaw = Math.atan2(dx, dz);
    }
    ped.mesh.position.set(ped.x, 0, ped.z);
    ped.mesh.rotation.y = ped.yaw;
    walkSwing(ped.mesh, ped.phase);
  }
}

// Cordon police on foot: spawn around a point, advance on the player, shoot back.
export function spawnEnemies(scene, x, z, count) {
  const enemies = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const mesh = makePerson(0x1a2a4a, 0xc98a5e, true);
    const ex = x + Math.cos(angle) * 12;
    const ez = z + Math.sin(angle) * 12;
    mesh.position.set(ex, 0, ez);
    scene.add(mesh);
    enemies.push({ mesh, x: ex, z: ez, yaw: angle, health: 60, shootTimer: 1 + i * 0.4, phase: 0, alive: true });
  }
  return enemies;
}

// Enemies walk toward the player and fire inaccurate shots; returns damage dealt.
export function updateEnemies(enemies, playerPos, dt, onEnemyShot) {
  let damage = 0;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.phase += dt * 6;
    const dx = playerPos.x - enemy.x;
    const dz = playerPos.z - enemy.z;
    const dist = Math.hypot(dx, dz);
    enemy.yaw = Math.atan2(dx, dz);
    if (dist > 8) {
      enemy.x += (dx / dist) * 3.2 * dt;
      enemy.z += (dz / dist) * 3.2 * dt;
    }
    enemy.mesh.position.set(enemy.x, 0, enemy.z);
    enemy.mesh.rotation.y = enemy.yaw;
    walkSwing(enemy.mesh, enemy.phase);
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0 && dist < 42) {
      enemy.shootTimer = 1.4 + Math.random() * 0.8;
      if (Math.random() < 0.45) {
        damage += 6;
        if (onEnemyShot) onEnemyShot(enemy);
      }
    }
  }
  return damage;
}

export function removeEnemies(scene, enemies) {
  for (const enemy of enemies) scene.remove(enemy.mesh);
}
