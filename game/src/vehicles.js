// LUMEN BAY r12 — vehicles: the car factory, traffic AI, police cruisers,
// the helicopter and police roadblocks. The hero is a REAL convertible built
// to look metallic, not flat cartoon: MeshPhysicalMaterial paint (metalness
// 0.85, roughness 0.28, clearcoat 1.0) over the PMREM environment map, so the
// body picks up sky reflections; glossy black glass cabin, detailed 5-spoke
// dark-alloy wheels with chrome rings and red calipers, glowing headlights +
// full-width red taillight strip, rear spoiler and splitter. Police light
// bars FLASH red/blue (emissive + glow sprites); the helicopter carries a
// visible additive searchlight cone; dust puffs trail the wheels at speed.
import * as THREE from 'three';
import { CARS, TRAFFIC_COUNT } from './config.js';
import { clamp, dist2 } from './config.js';
import { resolveCollisions } from './city.js';
import { sunGlowTexture, dustTexture, policeTextTexture } from './textures.js';

const ROAD_LANES = [-234, -174, -114, -54, 6, 66, 126, 186];
const TRAFFIC_PAINT = [0xffd23f, 0x19b8c4, 0xffffff, 0x1a1a1e, 0x37c978, 0xff7a1a, 0xc78bff, 0x3fa7ff, 0xff2a5e, 0xd8d8d8, 0xffd23f, 0x2a6b3a];
/** Real-car paint: metallic clearcoat over the environment map. */
function paintMaterial(colour, opts) {
  const o = opts || {};
  return new THREE.MeshPhysicalMaterial({
    color: colour,
    metalness: o.metalness !== undefined ? o.metalness : 0.85,
    roughness: o.roughness !== undefined ? o.roughness : 0.28,
    clearcoat: 1.0, clearcoatRoughness: 0.08,
    envMapIntensity: 1.3,
  });
}
/** A detailed wheel: dark tyre, 5-spoke dark-alloy hub, chrome ring, red caliper. */
function makeWheel() {
  const group = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.44, 16),
    new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.95 }));
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  group.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.46, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.3, metalness: 0.9 }));
  hub.rotation.z = Math.PI / 2;
  group.add(hub);
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.25, metalness: 0.9 });
  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.7, 0.5), spokeMat);
    spoke.rotation.x = (i / 5) * Math.PI * 2;
    group.add(spoke);
  }
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.15, metalness: 1.0 });
  for (const x of [0.22, -0.22]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 20), ringMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    group.add(ring);
  }
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xd90429 }));
  caliper.position.set(0, 0.18, 0.1);
  group.add(caliper);
  return group;
}
/** Build a car mesh for a car type. Returns { group, body, flame, wheels, plates, lightBar }. */
export function buildCarMesh(type, opts) {
  const def = CARS[type] || CARS.sedan;
  const o = opts || {};
  const group = new THREE.Group();
  const colour = o.colour !== undefined ? o.colour : def.colour;
  const paint = paintMaterial(colour);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), paint);
  body.position.y = 0.75; body.castShadow = true;
  group.add(body);
  let lightBar = null;
  if (type === 'comet') {
    // The hero Comet RS: REAL sports-car proportions. Long hood, low
    // roofline, tapered nose, sculpted flanks — a low-slung GT, not a toy
    // box. Body stretched 4.9 long / 2.0 wide / 0.62 tall, cabin set back
    // and low, front grille + bumpers + mirrors + door lines + wheel arches.
    body.scale.set(0.95, 0.82, 1.11);
    body.position.y = 0.68;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.7), paint);
    nose.position.set(0, 0.62, 2.25);
    group.add(nose);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 1.9), paint);
    hood.position.set(0, 1.0, 1.35);
    group.add(hood);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.26, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.4, metalness: 0.6 }));
    grille.position.set(0, 0.62, 2.47);
    group.add(grille);
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.15, metalness: 1.0 });
    for (let i = -1; i <= 1; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.03), chromeMat);
      bar.position.set(0, 0.54 + i * 0.08, 2.53);
      group.add(bar);
    }
    for (const x of [-0.78, 0.78]) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
      led.position.set(x, 0.82, 2.48);
      group.add(led);
    }
    const bumpMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.6 });
    const bumpF = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.25), bumpMat);
    bumpF.position.set(0, 0.36, 2.42);
    group.add(bumpF);
    const bumpR = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.25), bumpMat);
    bumpR.position.set(0, 0.36, -2.42);
    group.add(bumpR);
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.3), bumpMat);
    diffuser.position.set(0, 0.3, -2.5);
    group.add(diffuser);
    for (const x of [-0.55, 0.55]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x, 0.42, -2.55);
      group.add(pipe);
    }
    const tailStrip = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xff1a1a }));
    tailStrip.position.set(0, 0.85, -2.47);
    group.add(tailStrip);
    // Glossy black glass cabin, set back + low: slanted windshield, low
    // glass roof, side windows with a bright glare band.
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, metalness: 0.9, roughness: 0.08, clearcoat: 1 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
    cabin.position.set(0, 1.15, -0.35);
    group.add(cabin);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.5, 0.08), glassMat);
    windshield.position.set(0, 1.05, 0.85);
    windshield.rotation.x = -0.5;
    group.add(windshield);
    const glare = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xbfe8ff }));
    glare.position.set(0, 1.3, 0.78);
    glare.rotation.x = -0.5;
    group.add(glare);
    // Rear spoiler + side mirrors + door lines + wheel arches.
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.4), paint);
    spoiler.position.set(0, 1.15, -2.3);
    group.add(spoiler);
    for (const s of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), bumpMat);
      strut.position.set(s * 0.7, 1.02, -2.3);
      group.add(strut);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.3), paint);
      mirror.position.set(s * 1.05, 1.05, 0.75);
      group.add(mirror);
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9 }));
      line.position.set(s * 1.0, 0.75, 0.1);
      group.add(line);
    }
    // Visible driver: dark hair + orange jacket, hands on the wheel.
    const driverMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.9 });
    const driver = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.3), driverMat);
    driver.position.set(-0.35, 1.15, -0.2);
    group.add(driver);
    const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 }));
    dHead.position.set(-0.35, 1.5, -0.2);
    group.add(dHead);
    const dHair = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
    dHair.position.set(-0.35, 1.53, -0.2);
    group.add(dHair);
  } else {
    // Generic cars: glass cabin, headlights, taillights, bumpers.
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, metalness: 0.9, roughness: 0.12, clearcoat: 1 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.0), glassMat);
    cabin.position.set(0, 1.3, -0.2);
    group.add(cabin);
    for (const x of [-0.7, 0.7]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
      head.position.set(x, 0.8, 2.22);
      group.add(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xff1a1a }));
      tail.position.set(x, 0.8, -2.22);
      group.add(tail);
    }
    if (type === 'taxi') {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      sign.position.set(0, 1.75, -0.2);
      group.add(sign);
    }
    if (type === 'pickup') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 }));
      bed.position.set(0, 0.95, -1.2);
      group.add(bed);
    }
  }
  if (type === 'police') {
    // Black-and-white cruiser: white body, black hood + trunk, POLICE door
    // text, roof light bar (flashing red/blue), push bar, spotlight.
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.35, metalness: 0.7 });
    const hoodP = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 1.4), blackMat);
    hoodP.position.set(0, 1.13, 1.5);
    group.add(hoodP);
    const trunkP = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 1.0), blackMat);
    trunkP.position.set(0, 1.13, -1.7);
    group.add(trunkP);
    const textMat = new THREE.MeshBasicMaterial({ map: policeTextTexture('POLICE'), transparent: true });
    for (const s of [-1, 1]) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), textMat);
      decal.position.set(s * 1.06, 0.75, 0.1);
      decal.rotation.y = s * Math.PI / 2;
      group.add(decal);
    }
    lightBar = new THREE.Group();
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.4), blackMat);
    barBase.position.y = 0;
    lightBar.add(barBase);
    const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xff1a1a, emissive: 0xff1a1a, emissiveIntensity: 2 }));
    redLens.position.set(-0.36, 0.1, 0);
    lightBar.add(redLens);
    const blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x1a4dff, emissive: 0x1a4dff, emissiveIntensity: 2 }));
    blueLens.position.set(0.36, 0.1, 0);
    lightBar.add(blueLens);
    lightBar.position.set(0, 1.68, -0.2);
    group.add(lightBar);
    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 0.15), blackMat);
    pushBar.position.set(0, 0.5, 2.28);
    group.add(pushBar);
    // Headlight glow sprites so cruisers read at night from the front.
    for (const x of [-0.7, 0.7]) {
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: sunGlowTexture(), color: 0xfff6c8, transparent: true, opacity: 0.55, depthWrite: false,
      }));
      glow.position.set(x, 0.8, 2.4);
      glow.scale.set(1.6, 1.6, 1);
      group.add(glow);
    }
  }
  // Wheels at the four corners.
  const wheels = [];
  for (const [x, z] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = makeWheel();
    w.position.set(x, 0.62, z);
    group.add(w);
    wheels.push(w);
  }
  // Licence plates front + rear.
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 });
  const plates = [];
  for (const z of [2.5, -2.5]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.04), plateMat);
    p.position.set(0, 0.42, z);
    group.add(p);
    plates.push(p);
  }
  // NOS flame cone at the exhausts (hidden unless burning).
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 8),
    new THREE.MeshBasicMaterial({ color: 0x66c8ff, transparent: true, opacity: 0.9 }));
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 0.42, -3.1);
  flame.visible = false;
  group.add(flame);
  // Poster scale: the hero reads ~30% of frame width on the chase camera.
  if (type === 'comet') group.scale.setScalar(1.35);
  return { group, body, flame, wheels, plates, lightBar };
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
/** Spawn 28 traffic cars looping the road grid, varied real colours. */
export function spawnTraffic(scene, rng) {
  const cars = [];
  const types = ['sedan', 'taxi', 'pickup', 'sedan', 'taxi', 'sedan', 'pickup', 'taxi', 'sedan', 'taxi'];
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
    const car = makeCar(['sedan', 'taxi', 'pickup', 'taxi'][i % 4],
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
  const car = makeCar('police', x, z, a, { kind: 'patrol' });
  car.speed = 20;
  scene.add(car.mesh.group);
  return car;
}
/** Flash one cruiser's light bar: alternate red/blue glow each call. */
export function flashLightBar(car) {
  if (!car.mesh.lightBar) return;
  const t = performance.now() * 0.006;
  const on = Math.sin(t + (car.x || 0)) > 0;
  const red = car.mesh.lightBar.children[1];
  const blue = car.mesh.lightBar.children[2];
  if (red && red.material) red.material.emissiveIntensity = on ? 3.5 : 0.4;
  if (blue && blue.material) blue.material.emissiveIntensity = on ? 0.4 : 3.5;
}
/** A police cruiser chases the player, rams at close range, flashes its bar. */
export function updatePolice(car, dt, px, pz, colliders) {
  const d = dist2([car.x, car.z], [px, pz]);
  const want = Math.atan2(px - car.x, pz - car.z);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
  car.speed = d > 30 ? 34 : d > 8 ? 28 : 18;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const p = { x: nx, z: nz };
  resolveCollisions(colliders, p, 2.2);
  car.x = p.x; car.z = p.z;
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
  flashLightBar(car);
  return d;
}
/** The police helicopter: dark body, skids, tail, thin translucent rotor,
 a belly searchlight and a visible additive spotlight cone. */
export function makeHelicopter(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.4, metalness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 6.5), bodyMat);
  body.position.y = 0;
  group.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2.0),
    new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, metalness: 0.9, roughness: 0.1 }));
  glass.position.set(0, 0.2, 2.4);
  group.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 6.0), bodyMat);
  tail.position.set(0, 0.4, -6.0);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 1.4), bodyMat);
  fin.position.set(0, 1.2, -8.6);
  group.add(fin);
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.6, metalness: 0.6 });
  for (const s of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 5.5), skidMat);
    skid.position.set(s * 1.4, -1.4, 0);
    group.add(skid);
    for (const z of [-1.8, 1.8]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), skidMat);
      strut.position.set(s * 1.4, -0.9, z);
      group.add(strut);
    }
  }
  // Thin translucent rotor: two crossed blades, no dark bar. Brighter
  // than the old 0.35 — the dark-navy body vanishes against the night
  // sky, so the rotor disc + lamp + cone are what make the heli read.
  const rotorMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const rotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(13, 0.08, 0.5), rotorMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  rotor.position.y = 1.6;
  group.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.4, 0.3), rotorMat);
  tailRotor.position.set(1.0, 1.2, -8.6);
  group.add(tailRotor);
  // Searchlight: a bright belly lamp + a long additive cone to the ground.
  // The lamp is big and the cone strong (0.5): at night the cone is the
  // heli's main tell — the old 0.28 cone over the bright road was invisible.
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
  lamp.position.set(0, -1.2, 1.5);
  group.add(lamp);
  const coneGeo = new THREE.ConeGeometry(7, 26, 16, 1, true);
  const cone = new THREE.Mesh(coneGeo,
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  cone.rotation.x = Math.PI;
  cone.position.set(0, -14, 1.5);
  group.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.3, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, -26.5, 1.5);
  group.add(pool);
  group.visible = false;
  scene.add(group);
  return { group, rotor, tailRotor, cone, pool, active: false, hover: 14, angle: 0, speed: 0.35 };
}
/** Circle the player overhead while active; rotor spins, cone follows. */
export function updateHelicopter(heli, dt, px, pz) {
  if (!heli.active) { heli.group.visible = false; return; }
  heli.group.visible = true;
  heli.angle += dt * heli.speed;
  const r = 16;
  const x = px + Math.cos(heli.angle) * r;
  const z = pz + Math.sin(heli.angle) * r;
  heli.group.position.set(x, heli.hover + 8, z);
  heli.group.rotation.y = -heli.angle;
  heli.rotor.rotation.y += dt * 22;
  heli.tailRotor.rotation.x += dt * 30;
}
/** A police roadblock: two cruisers angled across the road + barrier stripes. */
export function makeRoadblock(scene, px, pz, heading) {
  const group = new THREE.Group();
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const bx = px + fx * 22, bz = pz + fz * 22;
  const cars = [];
  for (const off of [-4, 4]) {
    const car = makeCar('police', bx + rx * off, bz + rz * off, heading + Math.PI / 2, { kind: 'roadblock' });
    car.speed = 0;
    scene.add(car.mesh.group);
    cars.push(car);
  }
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.6 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 0.5), stripeMat);
  stripe.position.set(bx, 0.8, bz);
  stripe.rotation.y = heading + Math.PI / 2;
  group.add(stripe);
  group.position.set(0, 0, 0);
  scene.add(group);
  return { group, cars, x: bx, z: bz, t: 0 };
}
/** Roadblocks stand for 20 s, then clear (the police re-set them). */
export function updateRoadblock(rb, dt) {
  rb.t += dt;
  return rb.t < 20;
}
/** Dust puffs behind the wheels at speed (a small sprite pool). */
export function makeDustTrail(scene) {
  const sprites = [];
  const tex = dustTexture();
  for (let i = 0; i < 24; i += 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0xc8b89a, transparent: true, opacity: 0, depthWrite: false,
    }));
    s.position.set(0, -10, 0);
    scene.add(s);
    sprites.push({ sprite: s, life: 0 });
  }
  let idx = 0;
  return {
    update(dt, x, z, heading, speed) {
      for (const p of sprites) {
        if (p.life > 0) {
          p.life -= dt;
          p.sprite.material.opacity = Math.max(0, p.life * 0.5);
          p.sprite.scale.multiplyScalar(1 + dt * 1.5);
        }
      }
      if (speed > 12) {
        const p = sprites[idx % sprites.length];
        idx += 1;
        const bx = x - Math.sin(heading) * 2.5;
        const bz = z - Math.cos(heading) * 2.5;
        p.sprite.position.set(bx + (Math.random() - 0.5) * 2, 0.6, bz + (Math.random() - 0.5) * 2);
        p.sprite.scale.set(2, 2, 1);
        p.life = 0.9;
      }
    },
  };
}
