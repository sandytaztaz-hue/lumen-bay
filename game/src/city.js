// LUMEN BAY — the city, built fresh. Ground, turquoise sea, road grid,
// sunlit buildings with reflective blue-glass windows and neon signs, palm
// rows, Playa Dorada umbrella rows, a ferris wheel on the beach horizon, a
// lighthouse, white clouds, street furniture, landmarks and the festival.
// Returns the colliders (AABBs) the player, cars and line-of-sight checks
// all share. Midday 12:30 by default: lamps OFF, windows glass, sea bright.
import * as THREE from 'three';
import { WORLD, DISTRICTS, LANDMARKS, ROB_TARGETS, PROPERTIES, FERRIS } from './config.js';
import { buildingTexture, roadTexture, sandTexture, waterTexture, palmTexture, neonSignTexture, umbrellaTexture, cloudTexture, makeLanternMaterial, plazaTexture, sunGlowTexture } from './textures.js';
import { hash2 } from './random.js';

const ROAD_Y = 0.02;
const BLOCK = 60;

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createCity(scene, rng) {
  const colliders = [];
  const landmarks = {};
  const umbrellas = []; // every beach umbrella {x, z, meshes} — shot staging clears the ones in the way (see clearUmbrellasNear)
  const group = new THREE.Group();
  scene.add(group);
  // --- ground: grass base, wide sand beach south + west, sea beyond.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size * 2.4, WORLD.size * 2.4),
    new THREE.MeshStandardMaterial({ color: 0x5da244, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  const sandTex = sandTexture(rng);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, 60),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.01, WORLD.half - 30);
  sand.receiveShadow = true;
  group.add(sand);
  const sandW = sand.clone();
  sandW.rotation.z = Math.PI / 2;
  sandW.position.set(-WORLD.half + 30, 0.01, 0);
  group.add(sandW);
  const waterTex = waterTexture(rng);
  const seaMat = new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.15, metalness: 0.3 });
  const seaS = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size * 2.4, 300), seaMat);
  seaS.rotation.x = -Math.PI / 2;
  seaS.position.set(0, WORLD.seaLevel, WORLD.half + 150);
  group.add(seaS);
  const seaW = new THREE.Mesh(new THREE.PlaneGeometry(300, WORLD.size * 2.4), seaMat);
  seaW.rotation.x = -Math.PI / 2;
  seaW.position.set(-WORLD.half - 150, WORLD.seaLevel, 0);
  group.add(seaW);
  // Festival Square: paved terracotta plaza, not a lawn.
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(112, 112),
    new THREE.MeshStandardMaterial({ map: plazaTexture(rng), roughness: 0.95 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(180, 0.012, 0);
  plaza.receiveShadow = true;
  group.add(plaza);
  // --- road grid: asphalt strips every 60 units, both directions.
  const roadTex = roadTexture(rng);
  for (let i = -4; i <= 4; i += 1) {
    const c = i * BLOCK;
    const ns = new THREE.Mesh(
      new THREE.PlaneGeometry(12, WORLD.size),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 }),
    );
    ns.material.map = roadTex.clone();
    ns.material.map.repeat.set(1, 8);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(c, ROAD_Y, 0);
    ns.receiveShadow = true;
    group.add(ns);
    const ew = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.size, 12),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 }),
    );
    ew.material.map = roadTex.clone();
    ew.material.map.repeat.set(8, 1);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, ROAD_Y, c);
    ew.receiveShadow = true;
    group.add(ew);
  }
  // Sidewalks flanking every road.
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xb8a88e, roughness: 1 });
  for (let i = -4; i <= 4; i += 1) {
    const c = i * BLOCK;
    for (const off of [-8.5, 8.5]) {
      const ns = new THREE.Mesh(new THREE.PlaneGeometry(5, WORLD.size), walkMat);
      ns.rotation.x = -Math.PI / 2;
      ns.position.set(c + off, 0.015, 0);
      ns.receiveShadow = true;
      group.add(ns);
      const ew = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, 5), walkMat);
      ew.rotation.x = -Math.PI / 2;
      ew.position.set(0, 0.015, c + off);
      ew.receiveShadow = true;
      group.add(ew);
    }
  }
  // --- buildings: one per block quadrant, seeded heights + hues, with a
  // neon sign on every fourth shopfront. Colliders match the footprints.
  const NEON = [
    ['TACOS', '#ff7a1a'], ['BAR LUNA', '#c78bff'], ['CASH IN HAND', '#37c978'],
    ['HOTEL LUMEN', '#ff4d8d'], ['CASINO', '#ffd23f'], ['PIZZA', '#ff2a5e'],
    ['SURF SHOP', '#19b8c4'], ['RADIO LUMEN', '#9fd4ff'],
  ];
  let neonIdx = 0;
  for (let bx = -3; bx <= 3; bx += 1) {
    for (let bz = -3; bz <= 3; bz += 1) {
      const cx = bx * BLOCK;
      const cz = bz * BLOCK;
      // Festival Square (180, 0) stays open plaza; the beach corners stay open.
      if (cx === 180 && cz === 0) continue;
      if (Math.abs(cx) === 180 && Math.abs(cz) === 180) continue;
      const h = hash2(bx, bz, 7);
      const hgt = 10 + h * 22;
      const hue = [8, 32, 48, 150, 195, 285, 330][Math.floor(h * 7) % 7];
      const mat = new THREE.MeshStandardMaterial({ map: buildingTexture(rng, hue), roughness: 0.85 });
      const w = 26 + h * 12;
      const d = 26 + ((h * 7) % 1) * 10;
      const b = box(w, hgt, d, mat);
      b.position.set(cx, hgt / 2, cz);
      group.add(b);
      colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
      // Rooftop box on taller towers.
      if (hgt > 24) {
        const roof = box(8, 4, 8, new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.9 }));
        roof.position.set(cx + w / 4, hgt + 2, cz);
        group.add(roof);
      }
      // Neon sign on the south face, every fourth block.
      if ((bx + bz) % 4 === 0) {
        const [text, col] = NEON[neonIdx % NEON.length];
        neonIdx += 1;
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(14, 3.5),
          new THREE.MeshBasicMaterial({ map: neonSignTexture(text, col), transparent: true }),
        );
        sign.position.set(cx, 7.5, cz + d / 2 + 0.15);
        group.add(sign);
      }
    }
  }
  // Torre Lumen — the clock tower on the marina (tall, pale, clock face).
  const tower = box(16, 52, 16, new THREE.MeshStandardMaterial({ color: 0xf6e8c8, roughness: 0.8 }));
  tower.position.set(60, 26, -180);
  group.add(tower);
  colliders.push({ x0: 52, x1: 68, z0: -188, z1: -172 });
  const clockFace = new THREE.Mesh(
    new THREE.CircleGeometry(5, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8 }),
  );
  clockFace.position.set(60, 44, -171.8);
  group.add(clockFace);
  const clockHand = box(0.5, 4, 0.2, new THREE.MeshBasicMaterial({ color: 0x1a1210 }));
  clockHand.position.set(60, 44, -171.6);
  group.add(clockHand);
  const towerRoof = new THREE.Mesh(
    new THREE.ConeGeometry(10, 8, 4),
    new THREE.MeshStandardMaterial({ color: 0xc94a6a, roughness: 0.8 }),
  );
  towerRoof.position.set(60, 56, -180);
  towerRoof.rotation.y = Math.PI / 4;
  group.add(towerRoof);
  // Lighthouse at Farol Rojo.
  const light = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 6, 34, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }),
  );
  light.position.set(180, 17, -180);
  group.add(light);
  colliders.push({ x0: 174, x1: 186, z0: -186, z1: -174 });
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0 }),
  );
  lamp.position.set(180, 35, -180);
  group.add(lamp);
  landmarks.lighthouseLamp = lamp;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 60, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.set(210, 35, -180);
  group.add(beam);
  landmarks.beam = beam;
  // Ferris wheel over Playa Dorada.
  const ferris = new THREE.Group();
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0xff2a5e, roughness: 0.5, metalness: 0.4 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(FERRIS.radius, 1.1, 8, 32), wheelMat);
  ferris.add(rim);
  for (let i = 0; i < 6; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(1, FERRIS.radius * 2, 1), wheelMat);
    spoke.rotation.z = (i / 6) * Math.PI;
    ferris.add(spoke);
  }
  const gondolaMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5 });
  for (let i = 0; i < FERRIS.gondolas; i += 1) {
    const a = (i / FERRIS.gondolas) * Math.PI * 2;
    const g = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), gondolaMat);
    g.position.set(Math.cos(a) * FERRIS.radius, Math.sin(a) * FERRIS.radius, 0);
    ferris.add(g);
  }
  ferris.position.set(FERRIS.pos[0], FERRIS.height, FERRIS.pos[1]);
  group.add(ferris);
  landmarks.ferrisWheel = rim;
  const legMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.8 });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(2, FERRIS.height, 2), legMat);
    leg.position.set(FERRIS.pos[0] + s * 12, FERRIS.height / 2, FERRIS.pos[1]);
    leg.rotation.z = s * 0.35;
    group.add(leg);
  }
  addPalmsAndProps(scene, group, rng, colliders, landmarks, umbrellas);
  addNeonAndFestival(scene, group, rng, landmarks);
  return { colliders, landmarks, group, umbrellas };
}

function addPalmsAndProps(scene, group, rng, colliders, landmarks, umbrellas) {
  // Palm rows along the beach avenues + scattered through the city.
  const palmTex = palmTexture(rng);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 1 });
  const frondMat = new THREE.MeshBasicMaterial({ map: palmTex, transparent: true, side: THREE.DoubleSide });
  const palmSpots = [];
  for (let x = -210; x <= 210; x += 15) {
    palmSpots.push([x, 170]);
    palmSpots.push([x, 190]);
  }
  for (let x = -210; x <= 210; x += 30) {
    palmSpots.push([x, -170]);
    palmSpots.push([x, -190]);
  }
  for (const [x, z] of palmSpots) {
    if (hash2(Math.round(x), Math.round(z), 3) < 0.25) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 9, 8), trunkMat);
    trunk.position.set(x, 4.5, z);
    trunk.rotation.z = (rng() - 0.5) * 0.12;
    group.add(trunk);
    const fronds = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), frondMat);
    fronds.position.set(x, 9.5, z);
    fronds.rotation.x = -Math.PI / 2;
    group.add(fronds);
  }
  // Beach umbrellas in two rows on the south sand.
  const umbTex = umbrellaTexture(rng);
  const umbMat = new THREE.MeshBasicMaterial({ map: umbTex, transparent: true, side: THREE.DoubleSide });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.8 });
  for (let x = -210; x <= 210; x += 14) {
    for (const z of [204, 224]) {
      if (hash2(Math.round(x), z, 5) < 0.3) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 6), poleMat);
      pole.position.set(x, 1.5, z);
      group.add(pole);
      const top = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 8), umbMat);
      top.position.set(x, 3.4, z);
      group.add(top);
      umbrellas.push({ x, z, meshes: [pole, top] });
    }
  }
  // Street lamps along the main avenues (unlit meshes; shots light the ones
  // they need with point lights + glow halos).
  const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.6, metalness: 0.5 });
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xffe9a0, roughness: 0.4 });
  for (let i = -3; i <= 3; i += 1) {
    for (const [x, z] of [[i * 60 - 8, -180], [i * 60 + 8, 180], [-180, i * 60 - 8], [180, i * 60 + 8]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 7, 8), lampPostMat);
      post.position.set(x, 3.5, z);
      group.add(post);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), lampHeadMat);
      head.position.set(x, 7.1, z);
      group.add(head);
    }
  }
  // Food carts + benches near the beach and the market.
  const cartMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.8 });
  for (const [x, z] of [[-150, 150], [-60, -150], [90, 30], [150, 30]]) {
    const cart = box(3, 2, 2, cartMat);
    cart.position.set(x, 1, z);
    group.add(cart);
    colliders.push({ x0: x - 1.5, x1: x + 1.5, z0: z - 1, z1: z + 1 });
  }
  // Clouds: soft white sprites high up, drifting slowly (render.js moves them? no — static here, cheap).
  const cloudTex = cloudTexture(rng);
  for (let i = 0; i < 10; i += 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.85, depthWrite: false }));
    s.position.set(-300 + rng() * 600, 120 + rng() * 60, -300 + rng() * 600);
    s.scale.set(90 + rng() * 60, 30 + rng() * 16, 1);
    group.add(s);
  }
}

function addNeonAndFestival(scene, group, rng, landmarks) {
  // Festival lanterns strung over Festival Square.
  const lanternMat = makeLanternMaterial();
  for (let i = 0; i < 14; i += 1) {
    const x = 140 + (i % 7) * 12;
    const z = -24 + Math.floor(i / 7) * 48;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), lanternMat);
    l.position.set(x, 6 + (i % 3), z);
    group.add(l);
  }
  // Robbery-target markers: a small glowing sign over each shop/stash so the
  // player can find them without the minimap.
  const signMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  for (const t of ROB_TARGETS) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.5), signMat);
    m.position.set(t.pos[0], 4.5, t.pos[1]);
    group.add(m);
  }
  for (const p of PROPERTIES) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x37c978 }),
    );
    m.position.set(p.pos[0], 4.5, p.pos[1]);
    group.add(m);
  }
  // Marina pier: wooden deck + posts jutting into the west sea.
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 1 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 40), pierMat);
  pier.position.set(-232, -0.1, -180);
  group.add(pier);
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
      if (d2 < 0.0001) {
        p.x += radius;
        continue;
      }
      const d = Math.sqrt(d2);
      p.x = nx + (dx / d) * radius;
      p.z = nz + (dz / d) * radius;
    }
  }
  p.x = Math.max(-238, Math.min(238, p.x));
  p.z = Math.max(-238, Math.min(238, p.z));
}

/** District colour overlay helper (kept for the minimap turf tint). */
export function districtColourAt(districts, owners, x, z) {
  for (let i = 0; i < districts.length; i += 1) {
    const d = districts[i];
    if (x >= d.rect[0] && x < d.rect[2] && z >= d.rect[1] && z < d.rect[3]) {
      return owners[i] === 'crew' ? 0x37c978 : 0xe5484d;
    }
  }
  return 0x888888;
}
