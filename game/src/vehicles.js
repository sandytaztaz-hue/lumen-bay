// Vehicles: the cars of Puerto Lumen. One mesh builder (body, cabin,
// wheels, lights, blob shadow) in many colours and names; arcade driving
// physics for the player's car; traffic AI that loops the blocks; police
// cruisers that chase and ram.
import * as THREE from 'three';
import { DRIVE, HEAT } from './config.js';
import { clampNum, turnDiff, flatDist } from './random.js';
import { blobTexture } from './textures.js';

export const FLEET = [
  { name: 'COMET GT', color: '#ff2e63', top: 44 },
  { name: 'BRISA SEDAN', color: '#4fc3f7', top: 34 },
  { name: 'SOL TAXI', color: '#ffd23e', top: 32 },
  { name: 'VIEJO PICKUP', color: '#8a6b4a', top: 30 },
  { name: 'NEON COUPE', color: '#00e5ff', top: 40 },
  { name: 'PLAYA VAN', color: '#f2e9ff', top: 28 },
  { name: 'MAMBO LOWRIDER', color: '#ff2e88', top: 36 },
  { name: 'CALLE HATCH', color: '#7dff9b', top: 31 },
];

export const CRUISER_MODEL = { name: 'LCPD CRUISER', color: '#1c2733', top: 40 };

let blobTex = null;
function blob() {
  if (!blobTex) blobTex = blobTexture();
  return blobTex;
}

/** Build a stylised low-poly car mesh. Returns { group, wheels, body }. */
export function assembleCar(model, isPolice = false) {
  const group = new THREE.Group();
  group.name = model.name;
  const paint = new THREE.MeshLambertMaterial({ color: model.color });
  const glass = new THREE.MeshLambertMaterial({ color: '#182030' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glass);
  cabin.position.set(0, 1.1, -0.25);
  group.add(cabin);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 1.1), paint);
  hood.position.set(0, 0.92, 1.55);
  group.add(hood);
  const headMat = new THREE.MeshBasicMaterial({ color: '#fff3c9' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#ff2e3e' });
  for (const x of [-0.65, 0.65]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), headMat);
    hl.position.set(x, 0.62, 2.22);
    group.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), tailMat);
    tl.position.set(x, 0.62, -2.22);
    group.add(tl);
  }
  if (isPolice) {
    const barR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.4), new THREE.MeshBasicMaterial({ color: '#ff2e3e' }));
    barR.position.set(0, 1.48, -0.25);
    group.add(barR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.4), new THREE.MeshBasicMaterial({ color: '#2e7dff' }));
    barB.position.set(0, 1.48, 0.15);
    group.add(barB);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42), new THREE.MeshBasicMaterial({ color: '#f2f2f2' }));
    stripe.position.y = 0.42;
    group.add(stripe);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: '#14141a' });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    group.add(w);
    wheels.push(w);
  }
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 5.6),
    new THREE.MeshBasicMaterial({ map: blob(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);
  return { group, wheels, body };
}

/** A car in the world: position, heading, speed, steering, loop state. */
export function placeCar(model, x, z, heading, isPolice = false) {
  const mesh = assembleCar(model, isPolice);
  mesh.group.position.set(x, 0, z);
  mesh.group.rotation.y = heading;
  return {
    model, isPolice, mesh, x, z, heading,
    speed: 0, steer: 0, health: 100,
    loop: null, loopIndex: 0, stuck: 0,
    parked: false, isVan: false,
  };
}

function syncCar(car) {
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
}

/** Top speed of a model in m/s, scaled from its rated top. */
export function topOf(model) {
  return DRIVE.topSpeed * (model.top / 44);
}

/** Arcade driving step for the player's car. Mutates the car in place. */
export function driveCar(car, input, dt, collide) {
  const top = topOf(car.model);
  if (input.forward) car.speed += DRIVE.accel * dt;
  else if (input.back) car.speed -= (car.speed > 0.5 ? DRIVE.braking : DRIVE.accel * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  car.speed = clampNum(car.speed, -DRIVE.reverseTop, top);
  const steerIn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const grip = clampNum(Math.abs(car.speed) / 12, 0, 1);
  car.steer = clampNum(steerIn * DRIVE.maxSteer * grip, -DRIVE.maxSteer, DRIVE.maxSteer);
  car.heading += (car.speed >= 0 ? 1 : -1) * car.steer * (Math.abs(car.speed) / 6.5) * dt;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const fixed = collide(nx, nz, DRIVE.radius);
  car.x = fixed.x;
  car.z = fixed.z;
  if (fixed.hit) car.speed *= 0.55;
  syncCar(car);
  for (let i = 0; i < car.mesh.wheels.length; i++) {
    const w = car.mesh.wheels[i];
    w.rotation.x += car.speed * dt * 1.2;
    if (i < 2) w.rotation.y = car.steer * 0.5;
  }
}

/** Traffic AI: follow the assigned road loop, slow for the car ahead. */
export function cruiseTraffic(car, cars, dt, collide) {
  if (!car.loop) return;
  const wp = car.loop[car.loopIndex % car.loop.length];
  const dx = wp[0] - car.x;
  const dz = wp[1] - car.z;
  const d = Math.hypot(dx, dz);
  if (d < 4) {
    car.loopIndex++;
    return;
  }
  const want = Math.atan2(dx, dz);
  car.heading += clampNum(turnDiff(car.heading, want), -1.6 * dt, 1.6 * dt);
  let blocked = false;
  for (const other of cars) {
    if (other === car) continue;
    const od = flatDist(car.x, car.z, other.x, other.z);
    if (od < 7 && Math.abs(turnDiff(car.heading, Math.atan2(other.x - car.x, other.z - car.z))) < 0.5) {
      blocked = true;
      break;
    }
  }
  const target = blocked ? 0 : 9 + (car.model.top / 44) * 3;
  car.speed += clampNum(target - car.speed, -14 * dt, 7 * dt);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const fixed = collide(nx, nz, DRIVE.radius);
  car.x = fixed.x;
  car.z = fixed.z;
  if (fixed.hit) {
    car.speed = 0;
    car.stuck += dt;
    if (car.stuck > 2) {
      car.loopIndex++;
      car.stuck = 0;
    }
  } else {
    car.stuck = 0;
  }
  syncCar(car);
}

/** Police chase: steer at the target, ram it, keep up at high speed. */
export function huntPolice(car, tx, tz, dt, collide) {
  const dx = tx - car.x;
  const dz = tz - car.z;
  const d = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz);
  car.heading += clampNum(turnDiff(car.heading, want), -2.4 * dt, 2.4 * dt);
  const target = d > 30 ? HEAT.chaseTop : HEAT.chaseTop * 0.85;
  car.speed += clampNum(target - car.speed, -20 * dt, 12 * dt);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const fixed = collide(nx, nz, DRIVE.radius);
  car.x = fixed.x;
  car.z = fixed.z;
  if (fixed.hit) car.speed *= 0.5;
  syncCar(car);
  return d;
}

/** Parked cars the player can steal: on street edges near the landmarks. */
export function parkedSpots() {
  return [
    { model: 0, x: -196, z: 175, heading: Math.PI / 2 }, // Comet GT, marina straight, facing east
    { model: 4, x: 168, z: 98, heading: 0 }, // Neon Coupe at Mercado
    { model: 2, x: 28, z: -42, heading: Math.PI }, // Taxi by the Torre
    { model: 6, x: 98, z: -98, heading: -Math.PI / 2 }, // Lowrider at the safehouse
    { model: 3, x: -98, z: -168, heading: Math.PI / 2 }, // Pickup at Taller Lumen
    { model: 7, x: 112, z: 238, heading: 0 }, // Hatch at Playa Dorada
    { model: 1, x: -168, z: -28, heading: Math.PI }, // Sedan mid-city
    { model: 5, x: 238, z: 168, heading: -Math.PI / 2 }, // Van, east side
  ];
}
