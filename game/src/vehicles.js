// LUMEN BAY r7 — vehicles: the car factory, traffic AI, police cruisers,
// the helicopter and police roadblocks. The hero is a RED CONVERTIBLE: open
// top, low windshield frame, no roof cabin — the same body footprint and
// handling as before (look only, gameplay unchanged). Traffic is 20 cars in
// bright colours, so the streets read busy.
import * as THREE from 'three';
import { CARS, TRAFFIC_COUNT } from './config.js';
import { clamp, dist2 } from './config.js';
import { resolveCollisions } from './city.js';

const ROAD_LANES = [-234, -174, -114, -54, 6, 66, 126, 186];
const TRAFFIC_PAINT = [0xff2a1e, 0xffd23f, 0x19b8c4, 0xffffff, 0x37c978, 0xff7a1a, 0xc78bff, 0x3fa7ff];
function makeWheel() {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
  w.rotation.z = Math.PI / 2;
  w.castShadow = true;
  return w;
}
/** Build a car mesh for a car type. Returns { group, body, flame, wheels }. */
export function buildCarMesh(type, opts) {
  const def = CARS[type] || CARS.sedan;
  const o = opts || {};
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color: o.colour !== undefined ? o.colour : def.colour,
    roughness: 0.3, metalness: 0.6,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), paint);
  body.position.y = 0.75; body.castShadow = true;
  group.add(body);
  // Convertible hero: NO roof cabin — open top, low windshield frame + seats.
  if (type === 'comet') {
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x9fd4ff, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.7 }));
    shield.position.set(0, 1.35, 0.9); shield.rotation.x = -0.25;
    group.add(shield);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    for (const x of [-0.5, 0.5]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.6), seatMat);
      seat.position.set(x, 1.15, -0.4);
      group.add(seat);
    }
    const rollbar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.7 }));
    rollbar.position.set(0, 1.35, -1.1);
    group.add(rollbar);
  } else {
    // Toy-bright traffic: the cabin wears the body paint, so cars read as
    // solid bright colour blocks from behind (no dark slab on the roof).
    const cabinColour = (type === 'police' || type === 'shark') ? 0x1a2436
      : (o.colour !== undefined ? o.colour : def.colour);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2),
      new THREE.MeshStandardMaterial({ color: cabinColour, roughness: 0.3, metalness: 0.5 }));
    cabin.position.set(0, 1.4, -0.2); cabin.castShadow = true;
    group.add(cabin);
  }
  const wheels = [];
  for (const [x, z] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = makeWheel();
    w.position.set(x, 0.55, z);
    group.add(w); wheels.push(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfffbe0 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), headMat);
    h.position.set(x, 0.8, 2.22);
    group.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), tailMat);
    t.position.set(x, 0.8, -2.22);
    group.add(t);
  }
  if (type === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    bar.position.set(0, 1.85, -0.2);
    group.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2a6bff }));
    bar2.position.set(0.7, 1.85, -0.2);
    group.add(bar2);
  }
  if (type === 'shark') {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
    fin.position.set(0, 2.1, -1.2); fin.rotation.x = -0.4;
    group.add(fin);
  }
  // NOS flame cone at the exhausts (hidden until NOS burns): points BACKWARD,
  // a small bright trail behind the car, not a blob under it.
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.1, 8),
    new THREE.MeshBasicMaterial({ color: 0x66c8ff, transparent: true, opacity: 0.9 }));
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0.7, 0.6, -2.9); flame.visible = false;
  group.add(flame);
  // Armour plates appear when the garage armour upgrade is fitted.
  const plates = new THREE.Group();
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.4, metalness: 0.8 });
  for (const x of [-1.12, 1.12]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 4.0), plateMat);
    p.position.set(x, 0.8, 0);
    plates.add(p);
  }
  plates.visible = false;
  group.add(plates);
  return { group, body, flame, wheels, plates };
}
/** A drivable / stealable car in the world. */
export function makeCar(type, x, z, heading, opts) {
  const mesh = buildCarMesh(type, opts);
  mesh.group.position.set(x, 0, z);
  mesh.group.rotation.y = heading;
  return {
    type, mesh, x, z, heading, speed: 0,
    kind: (opts && opts.kind) || 'parked',
    health: 100, driver: (opts && opts.driver) || null,
  };
}
/** Drive a car forward with arcade handling; returns distance moved. */
export function driveCar(car, dt, throttle, steer, topSpeed, colliders) {
  car.speed += throttle * 16 * dt;
  car.speed = clamp(car.speed, -10, topSpeed);
  if (Math.abs(throttle) < 0.05) car.speed *= Math.max(0, 1 - 1.4 * dt);
  car.heading += steer * (0.9 + Math.abs(car.speed) * 0.02) * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const p = { x: nx, z: nz };
  resolveCollisions(colliders, p, 2.2);
  if (Math.abs(p.x - nx) > 0.01 || Math.abs(p.z - nz) > 0.01) car.speed *= 0.5;
  car.x = p.x; car.z = p.z;
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
  return Math.abs(car.speed) * dt;
}
// ---- traffic, police, helicopter, roadblocks --------------------------------
/** Spawn 20 traffic cars looping the road grid, bright paint, denser lanes. */
export function spawnTraffic(scene, rng) {
  const cars = [];
  const types = ['sedan', 'taxi', 'pickup', 'sedan', 'taxi', 'sedan', 'pickup', 'taxi'];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const lane = ROAD_LANES[i % ROAD_LANES.length];
    const along = -200 + rng() * 400;
    const vertical = i % 2 === 0;
    const x = vertical ? lane : along;
    const z = vertical ? along : lane;
    const heading = vertical ? (i % 4 < 2 ? 0 : Math.PI) : (i % 4 < 2 ? Math.PI / 2 : -Math.PI / 2);
    const car = makeCar(types[i % types.length], x, z, heading, {
      kind: 'traffic', colour: TRAFFIC_PAINT[i % TRAFFIC_PAINT.length],
    });
    car.speed = 9 + rng() * 5;
    car.dir = vertical ? 'v' : 'h';
    car.lane = lane;
    car.forward = heading;
    scene.add(car.mesh.group);
    cars.push(car);
  }
  return cars;
}
/** Spawn extra traffic near a point (shot staging: pack the frame). */
export function spawnTrafficNear(scene, rng, x, z, n) {
  const cars = [];
  for (let i = 0; i < n; i += 1) {
    const car = makeCar(['sedan', 'taxi', 'pickup'][i % 3],
      x + (rng() - 0.5) * 60, z + (rng() - 0.5) * 14, (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      { kind: 'traffic', colour: TRAFFIC_PAINT[(i + 2) % TRAFFIC_PAINT.length] });
    car.speed = 8 + rng() * 5;
    scene.add(car.mesh.group);
    cars.push(car);
  }
  return cars;
}
/** Traffic cars drive their lane, turn at the city edge, never leave the roads. */
export function updateTraffic(cars, dt, colliders) {
  for (const car of cars) {
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    if (nx < -232 || nx > 232 || nz < -232 || nz > 232) {
      car.heading += Math.PI / 2;
      continue;
    }
    const p = { x: nx, z: nz };
    resolveCollisions(colliders, p, 2.2);
    if (Math.abs(p.x - nx) > 0.01 || Math.abs(p.z - nz) > 0.01) {
      car.heading += Math.PI / 2;
      continue;
    }
    car.x = p.x; car.z = p.z;
    car.mesh.group.position.set(car.x, 0, car.z);
    car.mesh.group.rotation.y = car.heading;
  }
}
/** Spawn a police cruiser near (but not on top of) the player. */
export function spawnPolice(scene, px, pz, rng) {
  const a = rng() * Math.PI * 2;
  const x = clamp(px + Math.cos(a) * 45, -220, 220);
  const z = clamp(pz + Math.sin(a) * 45, -220, 220);
  const car = makeCar('police', x, z, a, { kind: 'police' });
  car.speed = 0;
  scene.add(car.mesh.group);
  return car;
}
/** A cruiser chases the player: steer toward them, ram on contact. */
export function updatePolice(car, dt, px, pz, colliders) {
  const dx = px - car.x, dz = pz - car.z;
  const want = Math.atan2(dx, dz);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += clamp(diff, -1.6 * dt, 1.6 * dt);
  car.speed = Math.min(car.speed + 14 * dt, 30);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const p = { x: nx, z: nz };
  resolveCollisions(colliders, p, 2.2);
  car.x = p.x; car.z = p.z;
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
  return dist2([car.x, car.z], [px, pz]);
}
/** The police helicopter: circles above the player, spotlight cone below. */
export function makeHelicopter(scene) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 7),
    new THREE.MeshStandardMaterial({ color: 0x1c4ed8, roughness: 0.4, metalness: 0.5 }));
  group.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x1c4ed8, roughness: 0.4 }));
  tail.position.set(0, 0.4, -6);
  group.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.12, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
  rotor.position.y = 1.2;
  group.add(rotor);
  const light = new THREE.SpotLight(0xfff2b0, 900, 90, 0.35, 0.5, 1.2);
  light.position.set(0, -1, 0);
  group.add(light);
  const target = new THREE.Object3D();
  target.position.set(0, -40, 0);
  group.add(target);
  light.target = target;
  scene.add(group);
  return { group, rotor, light, active: false, angle: 0, hover: 34 };
}
export function updateHelicopter(heli, dt, px, pz) {
  if (!heli.active) { heli.group.visible = false; return; }
  heli.group.visible = true;
  heli.angle += dt * 0.5;
  heli.group.position.set(px + Math.cos(heli.angle) * 22, heli.hover || 34, pz + Math.sin(heli.angle) * 22);
  heli.group.lookAt(px, 0, pz);
  heli.rotor.rotation.y += dt * 18;
}
/** Roadblock: two cruisers parked across the road ahead of the player. */
export function makeRoadblock(scene, px, pz, heading) {
  const group = new THREE.Group();
  const cars = [];
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const ahead = 26;
  const cx = px + fx * ahead, cz = pz + fz * ahead;
  for (const off of [-4, 4]) {
    const car = makeCar('police', cx + rx * off, cz + rz * off, heading + Math.PI / 2, { kind: 'roadblock' });
    cars.push(car);
    group.add(car.mesh.group);
  }
  scene.add(group);
  return { group, cars, x: cx, z: cz, ttl: 25 };
}
export function updateRoadblock(rb, dt) {
  rb.ttl -= dt;
  return rb.ttl > 0;
}
