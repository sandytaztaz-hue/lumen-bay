// Vehicles: the Comet GT and the city's traffic. Cars are box-built with a cabin,
// wheels that spin and steer, brake lights and headlights; traffic follows loops
// around the road grid, police cruisers chase the player, and a helicopter circles
// at three stars and above. Driving is arcade: throttle, brake, handbrake drift.
import * as THREE from 'three';
import { CAR, ROADS, WANTED } from './config.js';
import { collideCircle } from './city.js';
import { int, pick, range } from './random.js';

const CAR_COLORS = [0xd84040, 0x3a7ad9, 0xe8c23a, 0x7a7a8a, 0x2a9e6a, 0xe8e0d0, 0x8a4ad9, 0x3a3a44];

export function makeCarMesh(color, kind = 'sedan') {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2430 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x14141a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.72, 4.6), paint);
  body.position.y = 0.62; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.62, 2.3), kind === 'police' ? paint : glass);
  cabin.position.set(0, 1.24, kind === 'gt' ? 0.25 : -0.15); g.add(cabin);
  if (kind === 'gt') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.5), dark);
    spoiler.position.set(0, 1.12, -2.2); g.add(spoiler);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 4.62), new THREE.MeshLambertMaterial({ color: 0xf6ead2 }));
    stripe.position.y = 0.99; g.add(stripe);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.4), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    bar.position.set(0, 1.62, -0.15); g.add(bar);
    const beaconL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.34), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    beaconL.position.set(-0.4, 1.72, -0.15); g.add(beaconL);
    const beaconR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.34), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    beaconR.position.set(0.4, 1.72, -0.15); g.add(beaconR);
    g.userData.beacons = [beaconL, beaconR];
  }
  if (kind === 'van') {
    const boxBack = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 2.6), paint);
    boxBack.position.set(0, 1.35, -1.0); g.add(boxBack);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.55], [1.0, 1.55], [-1.0, -1.55], [1.0, -1.55]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(wx, 0.42, wz); g.add(w); wheels.push(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const hx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.06), headMat);
    h.position.set(hx, 0.66, 2.32); g.add(h);
  }
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0x881111 });
  for (const bx of [-0.7, 0.7]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.06), brakeMat);
    b.position.set(bx, 0.66, -2.32); g.add(b);
  }
  g.userData.wheels = wheels;
  g.userData.brakeMat = brakeMat;
  return g;
}

/** A rectangular loop around one city block, on the road centrelines. */
function blockLoop(rng) {
  const bi = int(rng, 0, 5), bj = int(rng, 0, 5);
  const x0 = ROADS[bi], x1 = ROADS[bi + 1], z0 = ROADS[bj], z1 = ROADS[bj + 1];
  const pts = [
    new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 0, z0),
    new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x0, 0, z1),
  ];
  if (rng() > 0.5) pts.reverse();
  return pts;
}

export function createTraffic(scene, rng, count = 12) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makeCarMesh(pick(rng, CAR_COLORS));
    scene.add(mesh);
    const loop = blockLoop(rng);
    const start = loop[int(rng, 0, 3)];
    cars.push({
      mesh, loop, wp: 0, speed: range(rng, 11, 16),
      pos: new THREE.Vector3(start.x, 0, start.z), angle: 0,
      kind: 'traffic', health: 100, color: mesh,
    });
    mesh.position.copy(cars[i].pos);
  }
  return cars;
}

export function updateTraffic(cars, dt, colliders) {
  for (const car of cars) {
    const target = car.loop[(car.wp + 1) % car.loop.length];
    const dx = target.x - car.pos.x, dz = target.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) { car.wp = (car.wp + 1) % car.loop.length; continue; }
    const want = Math.atan2(dx, dz);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    car.pos.x += Math.sin(car.angle) * car.speed * dt;
    car.pos.z += Math.cos(car.angle) * car.speed * dt;
    const res = collideCircle(colliders, car.pos.x, car.pos.z, 2.2);
    car.pos.x = res.x; car.pos.z = res.z;
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.angle;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.4;
  }
}

/** Arcade driving for the car the player is in. Returns speed in m/s. */
export function updatePlayerCar(car, input, dt, colliders) {
  const maxSpeed = car.kind === 'gt' ? CAR.gtMaxSpeed : CAR.maxSpeed;
  const forward = input.forward ? 1 : 0;
  const back = input.back ? 1 : 0;
  if (forward) car.speed += CAR.accel * dt;
  else if (back) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.reverseAccel) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
  if (input.handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 22 * dt);
  car.speed = Math.max(-12, Math.min(maxSpeed, car.speed));
  const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const grip = input.handbrake ? CAR.handbrakeGrip : CAR.grip;
  const steerRate = CAR.steer * Math.min(1, Math.abs(car.speed) / 12) * (input.handbrake ? 1.7 : 1);
  car.angle += steerInput * steerRate * dt * Math.sign(car.speed || 1) * (grip / CAR.grip);
  car.pos.x += Math.sin(car.angle) * car.speed * dt;
  car.pos.z += Math.cos(car.angle) * car.speed * dt;
  const res = collideCircle(colliders, car.pos.x, car.pos.z, 2.3);
  if (res.hit) car.speed *= 0.55;
  car.pos.x = res.x; car.pos.z = res.z;
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.angle;
  const spin = car.speed * dt * 2.4;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  car.mesh.userData.brakeMat.color.setHex(back || input.handbrake ? 0xff2222 : 0x881111);
  return car.speed;
}

/** A police cruiser: spawns on a road, pursues the player, rams to stop them. */
export function makeCruiser(scene, x, z) {
  const mesh = makeCarMesh(0x1c4fd6, 'police');
  scene.add(mesh);
  return {
    mesh, pos: new THREE.Vector3(x, 0, z), angle: 0, speed: 0,
    kind: 'police', health: 100, sirenPhase: 0, ramCooldown: 0,
  };
}

export function updateCruiser(car, targetPos, dt, colliders, onRam) {
  const dx = targetPos.x - car.pos.x, dz = targetPos.z - car.pos.z;
  const dist = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
  car.angle += steer;
  const targetSpeed = dist > 26 ? WANTED.cruiserSpeed : WANTED.cruiserSpeed * 0.75;
  car.speed += (targetSpeed - car.speed) * Math.min(1, 1.6 * dt);
  car.pos.x += Math.sin(car.angle) * car.speed * dt;
  car.pos.z += Math.cos(car.angle) * car.speed * dt;
  const res = collideCircle(colliders, car.pos.x, car.pos.z, 2.3);
  car.pos.x = res.x; car.pos.z = res.z;
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.angle;
  car.sirenPhase += dt * 6;
  if (car.mesh.userData.beacons) {
    const on = Math.sin(car.sirenPhase) > 0;
    car.mesh.userData.beacons[0].material.color.setHex(on ? 0xff2222 : 0x441111);
    car.mesh.userData.beacons[1].material.color.setHex(on ? 0x111144 : 0x2244ff);
  }
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.4;
  car.ramCooldown -= dt;
  if (dist < 4.5 && car.ramCooldown <= 0) {
    car.ramCooldown = 1.2;
    car.speed *= 0.4;
    onRam(dist);
  }
  return dist;
}

/** The police helicopter: circles the player, spotlight cone tracking them. */
export function makeHelicopter(scene) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 5.2), new THREE.MeshLambertMaterial({ color: 0x1c4fd6 }));
  g.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 5), new THREE.MeshLambertMaterial({ color: 0x1c4fd6 }));
  tail.position.set(0, 0.3, -4.6); g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.5), new THREE.MeshLambertMaterial({ color: 0x14141a }));
  rotor.position.y = 1.1; g.add(rotor);
  const rotor2 = rotor.clone(); rotor2.rotation.y = Math.PI / 2; g.add(rotor2);
  const spot = new THREE.Mesh(
    new THREE.ConeGeometry(7, 52, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.13, side: THREE.DoubleSide }),
  );
  spot.position.y = -26; g.add(spot);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22 }),
  );
  pool.rotation.x = -Math.PI / 2; pool.position.y = -51.5; g.add(pool);
  g.visible = false;
  scene.add(g);
  return { group: g, rotors: [rotor, rotor2], angle: 0 };
}

export function updateHelicopter(heli, targetPos, dt, active) {
  heli.group.visible = active;
  if (!active) return;
  heli.angle += dt * 0.35;
  const r = 38;
  heli.group.position.set(
    targetPos.x + Math.cos(heli.angle) * r,
    54 + Math.sin(heli.angle * 0.7) * 2,
    targetPos.z + Math.sin(heli.angle) * r,
  );
  heli.group.rotation.y = Math.atan2(
    targetPos.x - heli.group.position.x, targetPos.z - heli.group.position.z,
  );
  for (const rotor of heli.rotors) rotor.rotation.y += dt * 22;
}
