// Vehicles for LUMEN BAY: the player's arcade car physics, the Comet GT hero
// car, 12 AI traffic cars on road loops, police cruisers that chase and ram,
// and the police helicopter that circles at 3+ stars with a spotlight. Cars
// are built from boxes (body, cabin, wheels, lights) so they read clearly at
// chase-cam distance and cost almost nothing to render.
//
// Driving model: forward speed with acceleration/braking, steering that
// scales down at speed, a handbrake that cuts grip for sharp turns, and
// simple circle collision against buildings (via city.resolveCollisions) and
// against other cars (soft push-apart). Traffic follows the road grid: each
// car picks an avenue, drives straight, turns at a random intersection, and
// wraps around the map edge.

import * as THREE from '../vendor/three/three.module.min.js';
import { CAR } from './config.js';
import { createRandom, pick, randRange } from './random.js';
import { resolveCollisions, nearestRoad } from './city.js';

const TRAFFIC_COLOURS = [0xd43d2a, 0x2e6f8e, 0xe8c33a, 0x7a7a8a, 0x2f7a3a, 0xf2f2f2, 0x1a1a2e, 0xff8fa3];

// Build a low-poly car mesh. `police` adds a light bar and a black-and-white
// paint job; `hero` makes the Comet GT a sunset-orange sports car.
export function makeCarMesh(colour, opts = {}) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: opts.police ? 0xf2f2f2 : colour });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x14141c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, opts.hero ? 4.9 : 4.4), bodyMat);
  body.position.y = 0.62; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, opts.hero ? 2.1 : 2.3),
    new THREE.MeshLambertMaterial({ color: opts.police ? 0x1a1a2e : 0x223344 }));
  cabin.position.set(0, 1.18, opts.hero ? -0.25 : -0.15); cabin.castShadow = true; g.add(cabin);
  if (opts.police) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.4, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x1a1a2e }));
    door.position.y = 0.62; g.add(door);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x222233 }));
    bar.position.set(0, 1.58, -0.15); g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.32, 1.72, -0.15); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    blue.position.set(0.32, 1.72, -0.15); g.add(blue);
    g.userData.lights = [red, blue];
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    g.add(w); wheels.push(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const hx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    h.position.set(hx, 0.66, opts.hero ? 2.46 : 2.21); g.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const hx of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    t.position.set(hx, 0.66, opts.hero ? -2.46 : -2.21); g.add(t);
  }
  g.userData.wheels = wheels;
  return g;
}

export function createCarState(mesh, x, z, heading, opts = {}) {
  return {
    mesh, x, z, heading, speed: 0, steer: 0,
    police: !!opts.police, hero: !!opts.hero, traffic: !!opts.traffic,
    health: 100, wanted: false, route: null, turnAt: 0,
  };
}

// One fixed step of arcade driving. `drive` is {forward, back, left, right,
// handbrake} in -1..1. Returns the distance travelled, for the speedometer.
export function driveCar(car, drive, dt, colliders) {
  const target = drive.forward ? CAR.accel : drive.back ? -CAR.reverse : 0;
  if (drive.forward) car.speed += CAR.accel * dt;
  else if (drive.back) car.speed -= (car.speed > 0 ? CAR.brake : CAR.reverse) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
  if (drive.handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 22 * dt);
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  void target;
  const steerTarget = (drive.left ? 1 : 0) - (drive.right ? 1 : 0);
  const grip = drive.handbrake ? CAR.handbrakeTurn : CAR.turn;
  // Steering stays useful at speed so a fast car can still make a city turn.
  const steerRate = grip * (1 - Math.min(Math.abs(car.speed) / CAR.maxSpeed, 0.75) * 0.45);
  car.steer += (steerTarget - car.steer) * Math.min(1, 10 * dt);
  car.heading += car.steer * steerRate * dt * Math.sign(car.speed || 1) * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const pos = { x: nx, z: nz };
  const hitWall = resolveCollisions(pos, 2.1, colliders);
  if (hitWall) car.speed *= 0.55;
  car.x = pos.x; car.z = pos.z;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  const spin = car.speed * dt * 2.6;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  return Math.abs(car.speed) * dt;
}

// --- Traffic -----------------------------------------------------------------
// Twelve AI cars looping the avenues. Each car drives along one road, and at a
// random intersection it turns onto the crossing road. Speeds vary so the
// stream looks alive rather than synchronised.
export function createTraffic(scene, seed, colliders) {
  const rng = createRandom(seed + 77);
  const cars = [];
  const roads = [-208, -156, -104, -52, 0, 52, 104, 156, 208];
  for (let i = 0; i < 12; i += 1) {
    const along = pick(rng, roads);
    const cross = pick(rng, roads);
    const vertical = i % 2 === 0;
    const mesh = makeCarMesh(pick(rng, TRAFFIC_COLOURS));
    scene.add(mesh);
    const car = createCarState(mesh, vertical ? along : cross, vertical ? cross : along,
      vertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      { traffic: true });
    car.speed = randRange(rng, 9, 15);
    car.cruise = car.speed;
    car.vertical = vertical;
    car.nextTurn = randRange(rng, 40, 140);
    cars.push(car);
  }
  void colliders;
  return cars;
}

export function updateTraffic(cars, dt, time) {
  for (const car of cars) {
    // Gentle speed wobble so cars bunch and spread naturally.
    const cruise = car.cruise * (1 + 0.12 * Math.sin(time * 0.4 + car.x * 0.01));
    car.speed += (cruise - car.speed) * Math.min(1, 2 * dt);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    car.nextTurn -= Math.abs(car.speed) * dt;
    if (car.nextTurn <= 0) {
      // Turn onto the crossing road at the nearest intersection.
      const road = nearestRoad(car.vertical ? car.z : car.x);
      if (car.vertical) car.z = road; else car.x = road;
      const turn = (car.x * 7 + car.z * 13) % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
      car.heading += turn;
      car.vertical = !car.vertical;
      car.nextTurn = 50 + ((car.x * 31 + car.z * 17) % 110 + 110) % 110;
    }
    // Wrap around the map edge so the stream never runs dry.
    if (car.x > 255) car.x = -255; if (car.x < -255) car.x = 255;
    if (car.z > 255) car.z = -255; if (car.z < -255) car.z = 255;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    const spin = car.speed * dt * 2.6;
    for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  }
}

// --- Police ------------------------------------------------------------------
// Cruisers spawn at the map edge, chase the player with a simple pursuit
// steer, and ram (a soft push that also dents the player's car). Their light
// bars flash red/blue. The count scales with wanted stars.
export function createPolice(scene) {
  return { cars: [], spawnTimer: 0 };
}

export function spawnPoliceCar(scene, x, z) {
  const mesh = makeCarMesh(0xf2f2f2, { police: true });
  scene.add(mesh);
  const car = createCarState(mesh, x, z, 0, { police: true });
  car.speed = 20;
  return car;
}

export function updatePolice(police, playerPos, playerSpeed, wanted, dt, time, scene, colliders) {
  const want = wanted >= 1 ? Math.min(4, 1 + Math.floor(wanted)) : 0;
  police.spawnTimer -= dt;
  if (police.cars.length < want && police.spawnTimer <= 0) {
    const a = Math.random() * Math.PI * 2;
    const x = playerPos.x + Math.sin(a) * 90;
    const z = playerPos.z + Math.cos(a) * 90;
    police.cars.push(spawnPoliceCar(scene, Math.max(-240, Math.min(240, x)), Math.max(-240, Math.min(240, z))));
    police.spawnTimer = 2.5;
  }
  for (let i = police.cars.length - 1; i >= 0; i -= 1) {
    const car = police.cars[i];
    if (wanted < 0.5) { // heat gone: cruiser peels off and despawns far away
      car.speed += (26 - car.speed) * dt;
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      if (Math.hypot(car.x - playerPos.x, car.z - playerPos.z) > 160) {
        scene.remove(car.mesh); police.cars.splice(i, 1);
      }
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      continue;
    }
    // Pursuit steering: aim at the player's predicted position.
    const px = playerPos.x + Math.sin(playerPos.heading || 0) * playerSpeed * 0.5;
    const pz = playerPos.z + Math.cos(playerPos.heading || 0) * playerSpeed * 0.5;
    const desired = Math.atan2(px - car.x, pz - car.z);
    let diff = desired - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const top = 24 + wanted * 2.5;
    car.speed += (top - car.speed) * Math.min(1, 1.4 * dt);
    const pos = { x: car.x + Math.sin(car.heading) * car.speed * dt, z: car.z + Math.cos(car.heading) * car.speed * dt };
    if (resolveCollisions(pos, 2.1, colliders)) car.speed *= 0.5;
    car.x = pos.x; car.z = pos.z;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    // Flashing light bar.
    if (car.mesh.userData.lights) {
      const on = Math.floor(time * 6) % 2 === 0;
      car.mesh.userData.lights[0].material.color.setHex(on ? 0xff2222 : 0x550000);
      car.mesh.userData.lights[1].material.color.setHex(on ? 0x002266 : 0x2266ff);
    }
  }
  return police.cars;
}

// --- Helicopter ---------------------------------------------------------------
// Appears at 3+ stars: circles the player at height, banks into its turns,
// and shines a spotlight cone on the player's position. Pure visual pressure
// plus a slow wanted-decay block while it has line of sight.
export function createHelicopter(scene) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 6.4),
    new THREE.MeshLambertMaterial({ color: 0x1a2a3a }));
  body.castShadow = true; g.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 1.8),
    new THREE.MeshLambertMaterial({ color: 0x9fd4e8 }));
  glass.position.set(0, 0.2, 2.4); g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 5.2),
    new THREE.MeshLambertMaterial({ color: 0x1a2a3a }));
  tail.position.set(0, 0.3, -5.4); g.add(tail);
  const rotorMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.55 });
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(13, 0.08, 0.7), rotorMat);
  rotor.position.y = 1.3; rotor.name = 'rotor'; g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.5), rotorMat);
  tailRotor.position.set(0.5, 0.5, -7.6); tailRotor.name = 'tail-rotor'; g.add(tailRotor);
  const spot = new THREE.SpotLight(0xfff2b0, 900, 120, 0.32, 0.45, 1.1);
  spot.position.set(0, -0.6, 0); g.add(spot);
  g.add(spot.target);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(7, 42, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -21; cone.name = 'spot-cone'; g.add(cone);
  g.visible = false;
  scene.add(g);
  return { mesh: g, angle: 0, spot, cone };
}

export function updateHelicopter(heli, playerPos, wanted, dt, time) {
  const active = wanted >= 3;
  heli.mesh.visible = active;
  if (!active) return false;
  heli.angle += dt * 0.45;
  const r = 34;
  const hx = playerPos.x + Math.cos(heli.angle) * r;
  const hz = playerPos.z + Math.sin(heli.angle) * r;
  heli.mesh.position.set(hx, 42 + Math.sin(time * 0.7) * 2, hz);
  heli.mesh.rotation.y = Math.atan2(playerPos.x - hx, playerPos.z - hz);
  heli.mesh.rotation.z = 0.22;
  heli.spot.target.position.set(playerPos.x - hx, -42, playerPos.z - hz);
  const rotor = heli.mesh.getObjectByName('rotor');
  if (rotor) rotor.rotation.y += dt * 22;
  const tail = heli.mesh.getObjectByName('tail-rotor');
  if (tail) tail.rotation.x += dt * 30;
  return true;
}
