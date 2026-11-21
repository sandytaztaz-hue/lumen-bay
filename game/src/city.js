// LUMEN BAY — Puerto Lumen, the city. Ground, boulevard and side streets,
// the building rows that frame the chase road, palms, lamps, beach, sea,
// the Torre Lumen clock tower, the lighthouse and the marina. Everything
// is placed from the seeded RNG so the city is identical every run.

import { WORLD, DISTRICTS } from './config.js';
import { makeRng, range, intRange, pick, hash2 } from './random.js';
import { buildingTexture, roadTexture, sandTexture, grassTexture, clockTexture, toTexture } from './textures.js';

const PALETTE = ['#e8c9a0', '#d9a06b', '#b8c4c9', '#e07a5f', '#8fb8a8', '#d9d3c3', '#c9a86a', '#a8b8c8'];

function box(THREE, w, h, d, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

export function buildCity(THREE, seed) {
  const rng = makeRng(seed);
  const group = new THREE.Group();
  group.name = 'city';
  const colliders = [];
  const lamps = [];
  const palms = [];

  const grassTex = toTexture(THREE, grassTexture(seed + 11), 24, 24);
  const sandTex = toTexture(THREE, sandTexture(seed + 23), 18, 6);
  const roadTex = toTexture(THREE, roadTexture(seed + 37), 30, 2);
  const clockTex = toTexture(THREE, clockTexture(), 1, 1);

  // Ground: grass base, sand strip along the beach, sea plane.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.maxX - WORLD.minX + 120, WORLD.maxZ - WORLD.minZ + 120),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(130, 0, 205);
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(420, WORLD.sandZ1 - WORLD.sandZ0 + 2),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1, metalness: 0 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(130, 0.06, (WORLD.sandZ0 + WORLD.sandZ1) / 2);
  sand.receiveShadow = true;
  group.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 90),
    new THREE.MeshStandardMaterial({ color: 0x1e6f8e, roughness: 0.25, metalness: 0.35 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(130, 0.02, WORLD.seaZ + 45);
  sea.receiveShadow = true;
  sea.name = 'sea';
  group.add(sea);

  // Wet sand strip at the waterline.
  const wet = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 3),
    new THREE.MeshStandardMaterial({ color: 0xb98d5f, roughness: 0.5, metalness: 0.1 }));
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(130, 0.08, WORLD.seaZ - 1);
  group.add(wet);

  // Sidewalks: pale strips either side of the boulevard.
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x9a938a, roughness: 1 });
  for (const z of [WORLD.northWalkZ, WORLD.southWalkZ]) {
    const walk = box(THREE, 400, 0.12, 5, walkMat, 130, 0.06, z, false);
    walk.receiveShadow = true;
    group.add(walk);
  }

  // The boulevard itself + side streets, with lane paint.
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9, metalness: 0.05 });
  const road = box(THREE, 400, 0.1, 16, roadMat, 130, 0.05, WORLD.roadZ, false);
  road.receiveShadow = true;
  group.add(road);
  const crossMat = new THREE.MeshStandardMaterial({ color: 0x2f3238, roughness: 0.9 });
  for (const x of [40, 120, 175, 225, 275]) {
    const street = box(THREE, 10, 0.1, 180, crossMat, x, 0.05, 205, false);
    street.receiveShadow = true;
    group.add(street);
  }

  // Lane paint: double yellow centreline + white dashes, as thin boxes
  // sitting just above the asphalt so they never z-fight.
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xd8a920 });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  for (const dz of [-0.35, 0.35]) {
    const line = box(THREE, 400, 0.02, 0.28, yellowMat, 130, 0.12, WORLD.roadZ + dz, false);
    line.castShadow = false;
    group.add(line);
  }
  for (let x = -50; x < 320; x += 10) {
    for (const dz of [-5.5, 5.5]) {
      const dash = box(THREE, 4.5, 0.02, 0.3, whiteMat, x, 0.12, WORLD.roadZ + dz, false);
      dash.castShadow = false;
      group.add(dash);
    }
  }

  // Buildings: two rows north of the boulevard, plus a far row, with
  // seeded heights and facade textures. The chase road itself stays open.
  const facadeMats = [];
  for (let i = 0; i < 8; i += 1) {
    facadeMats.push(new THREE.MeshStandardMaterial({
      map: toTexture(THREE, buildingTexture(seed + 100 + i, PALETTE[i % PALETTE.length]), 1, 1),
      roughness: 0.85, metalness: 0.05,
    }));
  }
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 1 });

  function addBuilding(x, z, w, h, d, matIndex) {
    const b = box(THREE, w, h, d, facadeMats[matIndex % facadeMats.length], x, h / 2, z);
    group.add(b);
    const roof = box(THREE, w + 0.4, 0.5, d + 0.4, roofMat, x, h + 0.25, z);
    group.add(roof);
    // rooftop box (AC unit / stairwell) for silhouette variety
    if (hash2(Math.round(x), Math.round(z)) > 0.4) {
      group.add(box(THREE, w * 0.3, 1.6, d * 0.3, roofMat, x + w * 0.2, h + 1.1, z - d * 0.15));
    }
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return b;
  }

  // North row (frames the left of shot 1) and the row behind it.
  for (let x = -40; x < 310; x += 26) {
    const h = 12 + hash2(x, 1) * 16;
    addBuilding(x + range(rng, -3, 3), 186, 20, h, 16, intRange(rng, 0, 7));
  }
  for (let x = -30; x < 310; x += 30) {
    const h = 16 + hash2(x, 2) * 22;
    addBuilding(x + range(rng, -4, 4), 158, 22, h, 18, intRange(rng, 0, 7));
  }
  // Scattered blocks further north and along the cross streets.
  for (let x = -20; x < 300; x += 44) {
    addBuilding(x + range(rng, -5, 5), 132, 18, 10 + hash2(x, 3) * 14, 14, intRange(rng, 0, 7));
  }
  // The south side stays open beach — buildings there would block the
  // sea view down the boulevard, so nothing is built past the sidewalk.

  // Torre Lumen — the clock tower landmark, marina end of the map.
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 0.8 });
  const tower = box(THREE, 14, 46, 14, towerMat, 190, 23, 150);
  group.add(tower);
  const towerTop = box(THREE, 16, 3, 16, roofMat, 190, 47.5, 150);
  group.add(towerTop);
  const clockFace = new THREE.Mesh(new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({ map: clockTex }));
  clockFace.position.set(190, 40, 157.2);
  group.add(clockFace);
  const clockBack = clockFace.clone();
  clockBack.position.set(190, 40, 142.8);
  clockBack.rotation.y = Math.PI;
  group.add(clockBack);
  colliders.push({ minX: 183, maxX: 197, minZ: 143, maxZ: 157 });

  // Lighthouse at the far east end of the beach.
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.7 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.7 });
  const light = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 22, 12), lightMat);
  light.position.set(292, 11, 252);
  light.castShadow = true;
  group.add(light);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.6, 3, 12), stripeMat);
  stripe.position.set(292, 14, 252);
  group.add(stripe);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 3, 12),
    new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffd98a, emissiveIntensity: 1.6 }));
  lampRoom.position.set(292, 23.5, 252);
  group.add(lampRoom);
  colliders.push({ minX: 289, maxX: 295, minZ: 249, maxZ: 255 });

  // Marina docks, west end: wooden piers + moored boats (simple hulls).
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
  for (let i = 0; i < 3; i += 1) {
    const pier = box(THREE, 3, 0.5, 26, pierMat, -30 + i * 14, 0.4, 262, false);
    group.add(pier);
  }

  // Palms lining both sidewalks of the boulevard.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 1 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9, side: THREE.DoubleSide });
  function addPalm(x, z) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 7, 8), trunkMat);
    trunk.position.y = 3.5;
    trunk.castShadow = true;
    palm.add(trunk);
    for (let i = 0; i < 7; i += 1) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 4), frondMat);
      const a = (i / 7) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.3, 7.1, Math.sin(a) * 1.3);
      frond.rotation.z = Math.cos(a) * 1.1;
      frond.rotation.x = -Math.sin(a) * 1.1;
      frond.castShadow = true;
      palm.add(frond);
    }
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), frondMat);
    top.position.y = 7.2;
    palm.add(top);
    palm.position.set(x, 0, z);
    group.add(palm);
    palms.push(palm);
    return palm;
  }
  for (let x = -40; x <= 300; x += 22) {
    addPalm(x + range(rng, -2, 2), WORLD.northWalkZ - 2.5);
    if (x % 44 === 0) addPalm(x + range(rng, -2, 2), WORLD.southWalkZ + 2.5);
  }

  // Street lamps along the boulevard (emissive heads; only the nearest
  // few get real point lights, the rest glow via the emissive material).
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.6, metalness: 0.6 });
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 2.2 });
  for (let x = -30; x <= 300; x += 30) {
    for (const z of [WORLD.roadZ - 9.5, WORLD.roadZ + 9.5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 8), poleMat);
      pole.position.set(x, 3, z);
      pole.castShadow = true;
      group.add(pole);
      const arm = box(THREE, 1.6, 0.14, 0.14, poleMat, x + (z < WORLD.roadZ ? 0.7 : -0.7), 5.9, z, false);
      group.add(arm);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lampHeadMat);
      head.position.set(x + (z < WORLD.roadZ ? 1.4 : -1.4), 5.85, z);
      group.add(head);
      lamps.push({ x: head.position.x, y: 5.85, z, head });
    }
  }

  // Beach dressing: a few umbrellas and benches away from the shot
  // sightlines (umbrellas never sit near the hero in shot mode).
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
  for (const [x, z] of [[140, 232], [200, 232], [250, 232], [30, 232]]) {
    group.add(box(THREE, 3, 0.5, 1, benchMat, x, 0.5, z, false));
  }

  return { group, colliders, lamps, palms, sea, tower };
}
