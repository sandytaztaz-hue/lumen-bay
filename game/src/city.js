// LUMEN BAY r6 — the city itself: ground, sea, road grid, buildings, palms,
// street furniture, landmarks and the festival. Returns the colliders (AABBs)
// the player, cars and line-of-sight checks all share.
import * as THREE from 'three';
import { WORLD, DISTRICTS, LANDMARKS, ROB_TARGETS, PROPERTIES } from './config.js';
import { buildingTexture, roadTexture, sandTexture, waterTexture, palmTexture, neonSignTexture, makeLanternMaterial } from './textures.js';
import { hash2 } from './random.js';

const ROAD_Y = 0.02;
const BLOCK = 60;

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Build the whole city into `scene`. `rng` is the seeded stream. */
export function createCity(scene, rng) {
  const colliders = [];
  const landmarks = {};
  const group = new THREE.Group();
  scene.add(group);

  // --- ground: grass base, sand beach on the south + west edges, sea beyond.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size * 2.4, WORLD.size * 2.4),
    new THREE.MeshStandardMaterial({ color: 0x4d7a3a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  const sandTex = sandTexture(rng);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, 60),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.01, WORLD.half - 30);
  sand.receiveShadow = true;
  group.add(sand);
  const sandW = sand.clone();
  sandW.rotation.z = Math.PI / 2;
  sandW.position.set(-WORLD.half + 30, 0.01, 0);
  group.add(sandW);
  const waterTex = waterTexture(rng);
  const seaMat = new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.35, metalness: 0.1 });
  const seaS = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size * 2.4, 300), seaMat);
  seaS.rotation.x = -Math.PI / 2;
  seaS.position.set(0, WORLD.seaLevel, WORLD.half + 150);
  group.add(seaS);
  const seaW = new THREE.Mesh(new THREE.PlaneGeometry(300, WORLD.size * 2.4), seaMat);
  seaW.rotation.x = -Math.PI / 2;
  seaW.position.set(-WORLD.half - 150, WORLD.seaLevel, 0);
  group.add(seaW);

  // --- road grid: asphalt strips every 60 units, both directions.
  const roadTex = roadTexture(rng);
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });
  for (let i = -4; i <= 4; i += 1) {
    const c = i * BLOCK;
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(12, WORLD.size), roadMat.clone());
    ns.material.map = roadTex.clone();
    ns.material.map.repeat.set(1, 8);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(c, ROAD_Y, 0);
    ns.receiveShadow = true;
    group.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, 12), roadMat.clone());
    ew.material.map = roadTex.clone();
    ew.material.map.repeat.set(8, 1);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, ROAD_Y, c);
    ew.receiveShadow = true;
    group.add(ew);
  }

  // --- buildings: one or two per block, pastel facades, varied rooflines.
  const hues = [18, 32, 45, 180, 200, 280, 340, 90];
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.9 });
  const winMat = new THREE.MeshStandardMaterial({ color: 0x2c3550, roughness: 0.2, metalness: 0.4 });
  for (let bx = -4; bx <= 3; bx += 1) {
    for (let bz = -4; bz <= 3; bz += 1) {
      const cx = bx * BLOCK + 30;
      const cz = bz * BLOCK + 30;
      // Skip the festival square and the beach strip so they stay open.
      if (cx > 120 && cz > -60 && cz < 60) continue;
      if (cz > 200) continue;
      const h1 = hash2(bx, bz, 7);
      const h2 = hash2(bx, bz, 13);
      const tall = 8 + h1 * 16;
      const mat = new THREE.MeshStandardMaterial({ map: buildingTexture(rng, hues[Math.floor(h1 * hues.length)]), roughness: 0.85 });
      mat.map.repeat.set(1, Math.max(1, Math.round(tall / 10)));
      const b = box(26 + h2 * 10, tall, 24 + h1 * 8, mat);
      b.position.set(cx - 6, tall / 2, cz - 4);
      group.add(b);
      const roof = box(28 + h2 * 10, 1.2, 26 + h1 * 8, roofMat);
      roof.position.set(cx - 6, tall + 0.6, cz - 4);
      group.add(roof);
      colliders.push({ x0: cx - 20, z0: cz - 17, x1: cx + 8, z1: cz + 9 });
      if (h2 > 0.55) {
        const tall2 = 6 + h2 * 8;
        const b2 = box(14, tall2, 14, mat);
        b2.position.set(cx + 16, tall2 / 2, cz + 14);
        group.add(b2);
        colliders.push({ x0: cx + 9, z0: cz + 7, x1: cx + 23, z1: cz + 21 });
      }
      // Awnings / shop fronts on some blocks.
      if (h1 > 0.6) {
        const awn = box(12, 0.6, 6, new THREE.MeshStandardMaterial({ color: 0xff4d8d, roughness: 0.7 }));
        awn.position.set(cx - 6, 3.4, cz - 18);
        group.add(awn);
      }
    }
  }

  // --- Torre Lumen clock tower (landmark, tallest in the city).
  const towerMat = new THREE.MeshStandardMaterial({ map: buildingTexture(rng, 45), roughness: 0.8 });
  const tower = box(18, 46, 18, towerMat);
  tower.position.set(LANDMARKS.tower.pos[0], 23, LANDMARKS.tower.pos[1]);
  group.add(tower);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(5, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
  clockFace.position.set(LANDMARKS.tower.pos[0], 40, LANDMARKS.tower.pos[1] + 9.2);
  group.add(clockFace);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(6, 10, 4),
    new THREE.MeshStandardMaterial({ color: 0x3a5a8a, roughness: 0.6 }));
  spire.position.set(LANDMARKS.tower.pos[0], 51, LANDMARKS.tower.pos[1]);
  spire.rotation.y = Math.PI / 4;
  group.add(spire);
  landmarks.tower = tower;
  colliders.push({ x0: 51, z0: -189, x1: 69, z1: -171 });

  // --- Farol Rojo lighthouse: striped tower + rotating light cone.
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.7 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd23b3b, roughness: 0.7 });
  let ly = 0;
  for (let i = 0; i < 5; i += 1) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(3.4 - i * 0.3, 3.8 - i * 0.3, 6, 12), i % 2 ? redMat : lightMat);
    seg.position.set(LANDMARKS.lighthouse.pos[0], 3 + i * 6, LANDMARKS.lighthouse.pos[1]);
    seg.castShadow = true;
    group.add(seg);
    ly = 3 + i * 6;
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
  lamp.position.set(LANDMARKS.lighthouse.pos[0], ly + 4, LANDMARKS.lighthouse.pos[1]);
  group.add(lamp);
  landmarks.lighthouseLamp = lamp;
  const beam = new THREE.Mesh(new THREE.ConeGeometry(9, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2;
  beam.position.set(LANDMARKS.lighthouse.pos[0] + 20, ly + 4, LANDMARKS.lighthouse.pos[1]);
  group.add(beam);
  landmarks.beam = beam;
  colliders.push({ x0: 175, z0: -185, x1: 185, z1: -175 });

  addPalmsAndProps(scene, group, rng, colliders);
  addNeonAndFestival(scene, group, rng, landmarks);
  return { colliders, landmarks, group };
}
// ---- palms, props, neon, festival, markers --------------------------------

function addPalmsAndProps(scene, group, rng, colliders) {
  const palmTex = palmTexture(rng);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a34, roughness: 1 });
  const frondMat = new THREE.MeshBasicMaterial({ map: palmTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.2 });
  const palmSpots = [];
  for (let i = 0; i < 70; i += 1) {
    const x = -230 + rng() * 460;
    const z = -230 + rng() * 460;
    if (Math.abs(x % 60) < 9 || Math.abs(z % 60) < 9) continue;
    palmSpots.push([x, z]);
  }
  for (const [x, z] of palmSpots) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    trunk.castShadow = true;
    group.add(trunk);
    const fronds = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), frondMat);
    fronds.position.set(x, 8.2, z);
    fronds.rotation.y = rng() * Math.PI;
    group.add(fronds);
    colliders.push({ x0: x - 0.6, z0: z - 0.6, x1: x + 0.6, z1: z + 0.6 });
  }
  // Street furniture: benches, hydrants, market stalls, parked-car rows.
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
  const hydMat = new THREE.MeshStandardMaterial({ color: 0xd23b3b, roughness: 0.5 });
  for (let i = 0; i < 26; i += 1) {
    const x = -210 + rng() * 420;
    const z = -210 + rng() * 420;
    if (Math.abs(x % 60) < 9 || Math.abs(z % 60) < 9) continue;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.4), benchMat);
    bench.position.set(x, 0.8, z);
    bench.rotation.y = rng() * Math.PI;
    group.add(bench);
  }
  for (let i = 0; i < 14; i += 1) {
    const x = -200 + rng() * 400;
    const z = -200 + rng() * 400;
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.4, 8), hydMat);
    hyd.position.set(x, 0.7, z);
    group.add(hyd);
  }
  // Market stalls around Mercado Viejo.
  const stallMat = new THREE.MeshStandardMaterial({ color: 0xff8c42, roughness: 0.8 });
  for (let i = 0; i < 8; i += 1) {
    const x = -90 + (i % 4) * 20;
    const z = -160 + Math.floor(i / 4) * 18;
    const stall = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 4), stallMat);
    stall.position.set(x, 1.2, z);
    stall.castShadow = true;
    group.add(stall);
    const top = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 5),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xffd23f : 0x37c978, roughness: 0.8 }));
    top.position.set(x, 2.8, z);
    group.add(top);
    colliders.push({ x0: x - 3.5, z0: z - 2.5, x1: x + 3.5, z1: z + 2.5 });
  }
}

function addNeonAndFestival(scene, group, rng, landmarks) {
  // Neon signs over the shops and the casino.
  const signs = [
    { text: 'MERCADO', pos: [-60, 6, -168], colour: '#ff4d8d' },
    { text: 'CASINO ROW', pos: [60, 8, -12], colour: '#ffd23f' },
    { text: 'TALLER LUMEN', pos: [-180, 6, -52], colour: '#37c978' },
    { text: 'PLAYA BAR', pos: [-150, 5, 138], colour: '#4dd8ff' },
  ];
  for (const s of signs) {
    const tex = neonSignTexture(s.text, s.colour);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    sign.position.set(s.pos[0], s.pos[1], s.pos[2]);
    group.add(sign);
  }
  // Festival Square: lantern strings, a stage, crowds of stalls.
  const fest = new THREE.Group();
  fest.position.set(180, 0, 0);
  const lanternMat = makeLanternMaterial();
  const lanterns = [];
  for (let i = 0; i < 40; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = 12 + rng() * 34;
    const l = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), lanternMat);
    l.position.set(Math.cos(a) * r, 5 + rng() * 4, Math.sin(a) * r);
    fest.add(l);
    lanterns.push(l);
  }
  const stage = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 10),
    new THREE.MeshStandardMaterial({ color: 0x8a2a5a, roughness: 0.7 }));
  stage.position.set(0, 1, -20);
  stage.castShadow = true;
  fest.add(stage);
  const stageTop = new THREE.Mesh(new THREE.BoxGeometry(17, 0.5, 11),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.6, emissive: 0x553300 }));
  stageTop.position.set(0, 2.2, -20);
  fest.add(stageTop);
  group.add(fest);
  landmarks.festivalLanterns = lanterns;
  landmarks.festival = fest;

  // Marina docks: wooden piers over the west sea edge.
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 1 });
  for (let i = 0; i < 3; i += 1) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(26, 1, 5), pierMat);
    pier.position.set(-252, 0.6, -200 + i * 26);
    group.add(pier);
  }
  // Safehouse + garage buildings (bigger, distinct).
  const houseMat = new THREE.MeshStandardMaterial({ color: 0xe8b04b, roughness: 0.85 });
  const house = new THREE.Mesh(new THREE.BoxGeometry(16, 9, 12), houseMat);
  house.position.set(-180, 4.5, 20);
  house.castShadow = true;
  group.add(house);
  const garageMat = new THREE.MeshStandardMaterial({ color: 0x4a6a8a, roughness: 0.8 });
  const garage = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 14), garageMat);
  garage.position.set(-180, 3.5, -40);
  garage.castShadow = true;
  group.add(garage);
  landmarks.safehouse = house;
  landmarks.garage = garage;
}

/** 2D line-of-sight test against building colliders (for police chases). */
export function hasLineOfSight(colliders, ax, az, bx, bz) {
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 4);
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    for (const c of colliders) {
      if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return false;
    }
  }
  return true;
}

/** Push a circle (x, z, radius) out of every collider it overlaps. */
export function resolveCollisions(colliders, p, radius) {
  for (const c of colliders) {
    const nx = Math.max(c.x0, Math.min(p.x, c.x1));
    const nz = Math.max(c.z0, Math.min(p.z, c.z1));
    const dx = p.x - nx;
    const dz = p.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 < 0.0001) { p.x += radius; continue; }
      const d = Math.sqrt(d2);
      p.x = nx + (dx / d) * radius;
      p.z = nz + (dz / d) * radius;
    }
  }
  p.x = Math.max(-238, Math.min(238, p.x));
  p.z = Math.max(-238, Math.min(238, p.z));
}

/** District colour overlay: a flat tinted plane per district for the minimap turf. */
export function districtColourAt(districts, owners, x, z) {
  for (let i = 0; i < districts.length; i += 1) {
    const d = districts[i];
    if (x >= d.rect[0] && x < d.rect[2] && z >= d.rect[1] && z < d.rect[3]) {
      return owners[i] === 'crew' ? 0x37c978 : 0xe5484d;
    }
  }
  return 0x888888;
}
