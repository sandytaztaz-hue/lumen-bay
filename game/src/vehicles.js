// LUMEN BAY — vehicles: car factory, traffic AI, arcade driving, police.
// Cars are built from boxes and cylinders only, painted in bright sunset
// colours. Traffic follows the road loops; police cruisers chase the player;
// the helicopter circles overhead at 3+ stars with a visible spotlight.
import * as THREE from 'three';
import { CAR } from './config.js';
import { resolveCollisions } from './city.js';

const CAR_COLORS = [0xe03a3a, 0x2e9bff, 0xffb020, 0x39d353, 0xf2f2f2, 0x7a2e6e, 0xff6b35, 0x1a1a22, 0xffe14d, 0x2ee6ff];

// Build a car mesh. kind: sedan | sports | cruiser | van | truck.
export function makeCar(color, kind) {
  const group = new THREE.Group();
  const bodyColor = kind === 'cruiser' ? 0x1a2a4a : color;
  const bodyLen = kind === 'van' || kind === 'truck' ? 5.4 : 4.2;
  const bodyH = kind === 'van' ? 2.2 : 1.1;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, bodyH, bodyLen),
    new THREE.MeshLambertMaterial({ color: bodyColor }),
  );
  body.position.y = 0.85;
  group.add(body);
  if (kind !== 'van') {
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.75, kind === 'sports' ? 1.6 : 2.1),
      new THREE.MeshLambertMaterial({ color: 0x1a2436 }),
    );
    cabin.position.set(0, bodyH + 0.55, kind === 'sports' ? 0.2 : -0.2);
    group.add(cabin);
  }
  if (kind === 'sports') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    spoiler.position.set(0, 1.7, bodyLen / 2 - 0.2);
    group.add(spoiler);
  }
  if (kind === 'cruiser') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
    bar.position.set(0, bodyH + 1.1, -0.2);
    group.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x0000aa }));
    bar2.position.set(0, bodyH + 1.1, 0.3);
    group.add(bar2);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz * (bodyLen / 4.2));
    group.add(wheel);
  }
  // Headlights that glow at golden hour.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const sx of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
    lamp.position.set(sx, 0.9, -bodyLen / 2 - 0.05);
    group.add(lamp);
  }
  group.userData.kind = kind;
  return group;
}

export function createCarState(mesh, x, z, yaw, kind) {
  return { mesh, x, z, yaw, speed: 0, kind, health: 100 };
}

// Arcade driving: accelerate, steer by speed, handbrake cuts grip, collisions slow the car.
export function driveCar(car, input, dt, colliders) {
  const forward = input.forward ? 1 : 0;
  const back = input.back ? 1 : 0;
  const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  if (forward) car.speed += CAR.accel * dt;
  if (back) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.reverse) * dt;
  if (!forward && !back) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const grip = input.handbrake ? CAR.handbrakeGrip : CAR.grip;
  const turn = steerInput * CAR.steer * dt * Math.min(1, Math.abs(car.speed) / 8) * (car.speed >= 0 ? 1 : -1) * (input.handbrake ? 1.8 : 1);
  car.yaw += turn * (grip / CAR.grip);
  const nx = car.x + Math.sin(car.yaw) * car.speed * dt;
  const nz = car.z + Math.cos(car.yaw) * car.speed * dt;
  const probe = { x: nx, z: nz };
  if (resolveCollisions(colliders, probe, 1.6)) {
    car.speed *= 0.45;
    car.x = probe.x;
    car.z = probe.z;
  } else {
    car.x = nx;
    car.z = nz;
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.yaw;
  return car;
}

// Traffic: 12 AI cars looping the road network at steady speeds.
export function createTraffic(random, roadLoops, scene) {
  const cars = [];
  for (let i = 0; i < 12; i += 1) {
    const loop = roadLoops[i % roadLoops.length];
    const color = CAR_COLORS[i % CAR_COLORS.length];
    const mesh = makeCar(color, random.chance(0.2) ? 'van' : 'sedan');
    scene.add(mesh);
    cars.push({
      mesh, loop, seg: 0, t: random.next(), speed: random.range(9, 15),
      x: loop[0].x, z: loop[0].z, yaw: 0,
    });
  }
  return cars;
}

export function updateTraffic(cars, dt) {
  for (const car of cars) {
    const a = car.loop[car.seg];
    const b = car.loop[(car.seg + 1) % car.loop.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    car.t += (car.speed * dt) / len;
    if (car.t >= 1) {
      car.t -= 1;
      car.seg = (car.seg + 1) % car.loop.length;
    }
    const na = car.loop[car.seg];
    const nb = car.loop[(car.seg + 1) % car.loop.length];
    car.x = na.x + (nb.x - na.x) * car.t;
    car.z = na.z + (nb.z - na.z) * car.t;
    car.yaw = Math.atan2(nb.x - na.x, nb.z - na.z);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.yaw;
  }
}

// Police cruisers: spawn near the player, chase and ram, despawn when far.
export function createPolice(scene) {
  return { cars: [], spawnTimer: 0 };
}

export function updatePolice(police, wanted, playerPos, dt, scene, random) {
  const wantedCount = Math.min(4, wanted);
  police.spawnTimer -= dt;
  while (police.cars.length < wantedCount && police.spawnTimer <= 0) {
    const angle = random.range(0, Math.PI * 2);
    const dist = random.range(45, 70);
    const mesh = makeCar(0x1a2a4a, 'cruiser');
    scene.add(mesh);
    police.cars.push({
      mesh, x: playerPos.x + Math.sin(angle) * dist, z: playerPos.z + Math.cos(angle) * dist,
      yaw: angle, speed: 0, ramTimer: 0,
    });
    police.spawnTimer = 1.2;
  }
  let nearest = Infinity;
  for (let i = police.cars.length - 1; i >= 0; i -= 1) {
    const car = police.cars[i];
    const dx = playerPos.x - car.x;
    const dz = playerPos.z - car.z;
    const dist = Math.hypot(dx, dz);
    nearest = Math.min(nearest, dist);
    if (dist > 160 || wanted === 0) {
      scene.remove(car.mesh);
      police.cars.splice(i, 1);
      continue;
    }
    const targetYaw = Math.atan2(dx, dz);
    let dyaw = targetYaw - car.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    car.yaw += Math.max(-2.4 * dt, Math.min(2.4 * dt, dyaw));
    car.speed = Math.min(38, car.speed + 18 * dt);
    // Cruisers slow to a crawl when they close in on Mara on foot — that is
    // the moment a bold driver can steal one (Job 8: The Swap).
    if (dist < 7 && !playerPos.inCar) car.speed = Math.min(car.speed, 4);
    car.x += Math.sin(car.yaw) * car.speed * dt;
    car.z += Math.cos(car.yaw) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.yaw;
    // Ram: bump the player car when close.
    if (dist < 3.4) {
      car.ramTimer -= dt;
      if (car.ramTimer <= 0) {
        car.ramTimer = 1.1;
        car.speed *= 0.5;
      }
    }
  }
  return nearest;
}

// The police helicopter: circles overhead at 3+ stars, spotlight cone visible.
export function createHeli(scene) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 5), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
  group.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 5), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
  tail.position.set(0, 0.3, 4.5);
  group.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  rotor.position.y = 1.1;
  group.add(rotor);
  const spot = new THREE.Mesh(
    new THREE.ConeGeometry(6, 30, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  spot.position.y = -16;
  spot.rotation.x = Math.PI;
  group.add(spot);
  group.visible = false;
  scene.add(group);
  return { group, rotor, angle: 0, visible: false };
}

export function updateHeli(heli, wanted, playerPos, dt, time) {
  const active = wanted >= 3;
  heli.group.visible = active;
  if (!active) return;
  heli.angle += dt * 0.35;
  const r = 26;
  heli.group.position.set(
    playerPos.x + Math.cos(heli.angle) * r,
    34 + Math.sin(time * 0.5) * 2,
    playerPos.z + Math.sin(heli.angle) * r,
  );
  heli.group.rotation.y = -heli.angle;
  heli.rotor.rotation.y = time * 18;
}
