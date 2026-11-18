// LUMEN BAY — the city of Puerto Lumen.
// A seeded island: ocean on the west and south, a street grid, colourful
// low-rise buildings, palms, and the landmarks of the story (Torre Lumen,
// Marina Lumen, Mercado Viejo, Playa Dorada, Farol Rojo, Taller Lumen,
// the safehouse and Casino del Sol). Colliders are simple AABBs so the
// player and cars can slide along walls without a physics engine.
import * as THREE from 'three';
import { LANDMARKS, PALETTE, PICKUPS, STREET_LINES, STREET_WIDTH, WORLD_HALF } from './config.js';
import { makeTextures } from './textures.js';
import { jittered } from './random.js';

function addCollider(colliders, cx, cz, hw, hd) {
  colliders.push({ x0: cx - hw, z0: cz - hd, x1: cx + hw, z1: cz + hd });
}

// Push a circle (player or car) out of every AABB it overlaps. Returns true on hit.
export function resolveCollisions(colliders, pos, radius) {
  let hit = false;
  for (const c of colliders) {
    const nx = Math.max(c.x0, Math.min(pos.x, c.x1));
    const nz = Math.max(c.z0, Math.min(pos.z, c.z1));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.000001) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius;
        pos.z = nz + (dz / d) * radius;
      } else {
        pos.x = c.x1 + radius;
      }
    }
  }
  return hit;
}

export function isOnRoad(x, z) {
  for (const line of STREET_LINES) {
    if (Math.abs(x - line) < STREET_WIDTH / 2 + 1.5) return true;
    if (Math.abs(z - line) < STREET_WIDTH / 2 + 1.5) return true;
  }
  return false;
}

// Rectangular traffic loops around city blocks, driven by the traffic AI.
export function makeRoadLoops() {
  const loops = [];
  const centres = [-135, -45, 45, 135];
  for (const cx of centres) {
    for (const cz of centres) {
      loops.push([
        { x: cx - 45, z: cz - 45 }, { x: cx + 45, z: cz - 45 },
        { x: cx + 45, z: cz + 45 }, { x: cx - 45, z: cz + 45 },
      ]);
    }
  }
  // The coast road loop, for beach patrols and the Beach Run.
  loops.push([
    { x: -210, z: -180 }, { x: -210, z: 210 }, { x: -180, z: 210 }, { x: -180, z: -180 },
  ]);
  return loops;
}

function makeBuilding(random, textures, x, z, w, h, d) {
  const group = new THREE.Group();
  const tex = random.pick(textures.buildings);
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  body.position.y = h / 2;
  group.add(body);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4),
    new THREE.MeshLambertMaterial({ color: 0x8a5a3a }),
  );
  roof.position.y = h + 0.25;
  group.add(roof);
  // Rooftop water tank or antenna on taller blocks.
  if (h > 16 && random.chance(0.6)) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 2.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x6b7a8a }),
    );
    tank.position.set(w * 0.25, h + 1.4, 0);
    group.add(tank);
  }
  group.position.set(x, 0, z);
  return group;
}

// A palm tree: curved trunk plus a billboarded frond crown.
function makePalm(random, textures, x, z) {
  const group = new THREE.Group();
  const lean = random.range(-0.12, 0.12);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.35, 7, 6),
    new THREE.MeshLambertMaterial({ color: PALETTE.trunk }),
  );
  trunk.position.y = 3.5;
  trunk.rotation.z = lean;
  group.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshLambertMaterial({ map: textures.palm, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 }),
  );
  crown.position.set(lean * 7, 7.4, 0);
  crown.rotation.x = -Math.PI / 2 + 0.35;
  group.add(crown);
  const crown2 = crown.clone();
  crown2.rotation.z = Math.PI / 2;
  group.add(crown2);
  group.position.set(x, 0, z);
  return group;
}

function makeLandmark(THREE, kind, x, z, random) {
  const group = new THREE.Group();
  if (kind === 'tower') {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(10, 52, 10), new THREE.MeshLambertMaterial({ color: 0xf2e3c6 }));
    shaft.position.y = 26;
    group.add(shaft);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 2, 24), new THREE.MeshLambertMaterial({ color: 0xffd27a, emissive: 0x664411 }));
    face.rotation.x = Math.PI / 2;
    face.position.set(0, 44, 5.2);
    group.add(face);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(7, 8, 4), new THREE.MeshLambertMaterial({ color: 0xe07856 }));
    cap.position.y = 56;
    cap.rotation.y = Math.PI / 4;
    group.add(cap);
  } else if (kind === 'lighthouse') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6, 34, 12), new THREE.MeshLambertMaterial({ color: 0xf7f3e8 }));
    base.position.y = 17;
    group.add(base);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 4, 12), new THREE.MeshLambertMaterial({ color: 0xe03a3a }));
    band.position.y = 24;
    group.add(band);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 8), new THREE.MeshLambertMaterial({ color: 0xffe14d, emissive: 0xaa8800 }));
    lamp.position.y = 35.5;
    group.add(lamp);
  } else if (kind === 'garage') {
    const shed = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 12), new THREE.MeshLambertMaterial({ color: 0x4a6a8a }));
    shed.position.y = 3.5;
    group.add(shed);
    const door = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 0.4), new THREE.MeshLambertMaterial({ color: 0x2c3550 }));
    door.position.set(0, 2.5, 6.1);
    group.add(door);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 0.6), new THREE.MeshLambertMaterial({ color: 0xff2e88, emissive: 0x881144 }));
    sign.position.set(0, 7.6, 6);
    group.add(sign);
  } else if (kind === 'casino') {
    const hall = new THREE.Mesh(new THREE.BoxGeometry(26, 12, 18), new THREE.MeshLambertMaterial({ color: 0x7a2e6e }));
    hall.position.y = 6;
    group.add(hall);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 0.8), new THREE.MeshLambertMaterial({ color: 0xffe14d, emissive: 0x886600 }));
    sign.position.set(0, 13.5, 9.2);
    group.add(sign);
    for (let i = 0; i < 6; i += 1) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 10, 8), new THREE.MeshLambertMaterial({ color: 0xf2e3c6 }));
      pillar.position.set(-10 + i * 4, 5, 9.6);
      group.add(pillar);
    }
  } else if (kind === 'safehouse') {
    const house = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 10), new THREE.MeshLambertMaterial({ color: 0xf7d774 }));
    house.position.y = 3;
    group.add(house);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 4, 4), new THREE.MeshLambertMaterial({ color: 0xe07856 }));
    roof.position.y = 8;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
  } else if (kind === 'market') {
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.4, 24), new THREE.MeshLambertMaterial({ color: 0xc98a5e }));
    plaza.position.y = 0.2;
    group.add(plaza);
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2;
      const stall = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 3), new THREE.MeshLambertMaterial({ color: PALETTE.neon[i % PALETTE.neon.length] }));
      stall.position.set(Math.cos(angle) * 11, 1.2, Math.sin(angle) * 11);
      group.add(stall);
      const awning = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 4), new THREE.MeshLambertMaterial({ color: 0xfff2cc }));
      awning.position.set(Math.cos(angle) * 11, 3, Math.sin(angle) * 11);
      awning.rotation.y = Math.PI / 4;
      group.add(awning);
    }
  }
  group.position.set(x, 0, z);
  return group;
}

// Build the whole city into a THREE.Group and return everything the game needs:
// the group, colliders, pickup meshes, road loops and a mission beacon mesh.
export function buildCity(random) {
  const textures = makeTextures(random);
  const group = new THREE.Group();
  const colliders = [];
  const pickupMeshes = [];

  // Ocean: a big water plane under the island, visible on two sides.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    new THREE.MeshLambertMaterial({ map: textures.water, color: 0x9fd4e0 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.6;
  water.material.map.repeat.set(6, 6);
  group.add(water);

  // Island ground: sand base with a grass-green city centre.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2 + 40, WORLD_HALF * 2 + 40),
    new THREE.MeshLambertMaterial({ map: textures.sand }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.material.map.repeat.set(8, 8);
  group.add(ground);
  const centre = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshLambertMaterial({ color: 0x7fae6e }),
  );
  centre.rotation.x = -Math.PI / 2;
  centre.position.y = 0.05;
  group.add(centre);

  // Roads: dark strips along every street line, with a plaza at the market.
  for (const line of STREET_LINES) {
    for (const horizontal of [true, false]) {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(480, STREET_WIDTH),
        new THREE.MeshLambertMaterial({ map: textures.road }),
      );
      road.rotation.x = -Math.PI / 2;
      if (!horizontal) road.rotation.z = Math.PI / 2;
      road.material.map.repeat.set(8, 1);
      road.position.set(horizontal ? 0 : line, 0.1, horizontal ? line : 0);
      group.add(road);
    }
  }
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshLambertMaterial({ map: textures.plaza }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.material.map.repeat.set(3, 3);
  plaza.position.set(0, 0.12, 0);
  group.add(plaza);

  // Marina docks: wooden piers reaching into the northern water.
  for (let i = 0; i < 3; i += 1) {
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.6, 26),
      new THREE.MeshLambertMaterial({ color: 0x8a6b4a }),
    );
    pier.position.set(-60 + i * 30, 0.4, -222);
    group.add(pier);
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 10), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
    hull.position.y = 0.6;
    boat.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 4), new THREE.MeshLambertMaterial({ color: 0x2e6a8a }));
    cabin.position.y = 2;
    boat.add(cabin);
    boat.position.set(-60 + i * 30, -0.4, -236);
    group.add(boat);
  }

  // Buildings fill the blocks between streets, skipping landmark plots.
  const landmarkPlots = Object.values(LANDMARKS).map((lm) => ({ x: lm.x, z: lm.z, r: 26 }));
  const blockCentres = [];
  for (const bx of [-135, -45, 45, 135]) {
    for (const bz of [-135, -45, 45, 135]) blockCentres.push({ x: bx, z: bz });
  }
  for (const block of blockCentres) {
    for (let i = 0; i < 4; i += 1) {
      const ox = (i % 2 === 0 ? -1 : 1) * 20;
      const oz = (i < 2 ? -1 : 1) * 20;
      const x = block.x + ox + jittered(random, 0, 4);
      const z = block.z + oz + jittered(random, 0, 4);
      if (landmarkPlots.some((p) => Math.hypot(x - p.x, z - p.z) < p.r)) continue;
      if (Math.abs(x) < 24 && Math.abs(z) < 24) continue;
      const w = random.range(14, 22);
      const d = random.range(14, 22);
      const h = random.range(8, 30);
      group.add(makeBuilding(random, textures, x, z, w, h, d));
      addCollider(colliders, x, z, w / 2, d / 2);
    }
  }

  // Landmarks.
  const landmarkKinds = {
    tower: 'tower', lighthouse: 'lighthouse', garage: 'garage',
    casino: 'casino', safehouse: 'safehouse', market: 'market',
  };
  for (const [key, kind] of Object.entries(landmarkKinds)) {
    const lm = LANDMARKS[key];
    group.add(makeLandmark(THREE, kind, lm.x, lm.z, random));
    addCollider(colliders, lm.x, lm.z, kind === 'tower' ? 6 : kind === 'casino' ? 13 : 8, kind === 'casino' ? 9 : 7);
  }

  // Palm trees along the beach, the marina and scattered through the city.
  for (let i = 0; i < 90; i += 1) {
    let x;
    let z;
    if (i < 34) {
      x = random.range(-235, -150);
      z = random.range(120, 235);
    } else if (i < 52) {
      x = random.range(-140, 140);
      z = random.range(-235, -205);
    } else {
      x = random.range(-220, 220);
      z = random.range(-220, 220);
      if (isOnRoad(x, z)) continue;
      if (landmarkPlots.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + 4)) continue;
    }
    group.add(makePalm(random, textures, x, z));
  }

  // Pickups: floating, spinning, colour-coded.
  const pickupColors = { health: 0x39d353, armour: 0x2e9bff, smg: 0xffb020 };
  for (const p of PICKUPS) {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.1),
      new THREE.MeshLambertMaterial({ color: pickupColors[p.kind], emissive: pickupColors[p.kind] }),
    );
    mesh.position.set(p.x, 1.6, p.z);
    group.add(mesh);
    pickupMeshes.push({ kind: p.kind, x: p.x, z: p.z, mesh, taken: false });
  }

  // Mission beacon: a tall golden pillar of light at the current objective.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.position.y = 30;
  beacon.visible = false;
  group.add(beacon);

  return { group, colliders, pickupMeshes, roadLoops: makeRoadLoops(), beacon, textures };
}
