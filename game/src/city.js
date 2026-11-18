// Puerto Lumen itself: a road-grid island city with a marina to the north, a beach
// to the south, ocean on both sides, palm-lined streets and seven named landmarks.
// Everything is placed from the seeded RNG, and every solid building registers an
// axis-aligned collider the player, cars and police all respect.
import * as THREE from 'three';
import { PALETTE, ROADS, WORLD } from './config.js';
import { int, pick, range } from './random.js';

const LANDMARK_CLEAR = [
  { x: 0, z: -200, r: 42 },    // Torre Lumen plaza
  { x: -130, z: 0, r: 40 },    // Mercado Viejo square
  { x: 130, z: 130, r: 30 },   // Taller Lumen garage
  { x: -65, z: 195, r: 26 },   // safehouse
  { x: 230, z: 265, r: 34 },   // Farol Rojo lighthouse
  { x: 0, z: -265, r: 46 },    // marina docks
];

function isClear(x, z) {
  return !LANDMARK_CLEAR.some((c) => Math.abs(x - c.x) < c.r && Math.abs(z - c.z) < c.r);
}

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

function makePalm(rng) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f3a });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 7, 6), trunkMat);
  trunk.position.y = 3.5;
  trunk.rotation.z = range(rng, -0.08, 0.08);
  g.add(trunk);
  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.4, 4), leafMat);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.6, 7.1, Math.sin(a) * 1.6);
    leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    leaf.scale.set(1, 1, 0.28);
    g.add(leaf);
  }
  return g;
}

export function buildCity(scene, rng, tex) {
  const group = new THREE.Group();
  const colliders = [];
  const addCollider = (x, z, hw, hd) => colliders.push({ x, z, hw, hd });

  // Ground: city slab, then sand to the south and water on two sides.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2 + 60, WORLD.half * 2 + 60),
    new THREE.MeshLambertMaterial({ color: 0x8a7a68 }),
  );
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, 0);
  group.add(ground);

  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2 + 60, 46),
    new THREE.MeshLambertMaterial({ map: tex.sand }),
  );
  beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.02, WORLD.half + 8);
  group.add(beach);

  const seaMat = new THREE.MeshLambertMaterial({ map: tex.water });
  const seaNorth = new THREE.Mesh(new THREE.PlaneGeometry(900, 260), seaMat);
  seaNorth.rotation.x = -Math.PI / 2; seaNorth.position.set(0, -0.4, -WORLD.half - 160);
  group.add(seaNorth);
  const seaSouth = new THREE.Mesh(new THREE.PlaneGeometry(900, 260), seaMat.clone());
  seaSouth.rotation.x = -Math.PI / 2; seaSouth.position.set(0, -0.4, WORLD.half + 160);
  group.add(seaSouth);

  // Roads: asphalt strips on the grid, with a centre-line texture. The east-west
  // strips use the texture rotated 90 degrees so the centre line runs along
  // the road; the north-south strips use it as drawn.
  const roadTexX = tex.road.clone();
  roadTexX.rotation = Math.PI / 2; roadTexX.center.set(0.5, 0.5); roadTexX.needsUpdate = true;
  const roadMatX = new THREE.MeshLambertMaterial({ map: roadTexX });
  const roadMatZ = new THREE.MeshLambertMaterial({ map: tex.road });
  for (const r of ROADS) {
    const alongX = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, WORLD.roadWidth), roadMatX);
    alongX.rotation.x = -Math.PI / 2; alongX.position.set(0, 0.06, r);
    group.add(alongX);
    const alongZ = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.half * 2), roadMatZ);
    alongZ.rotation.x = -Math.PI / 2;
    alongZ.position.set(r, 0.06, 0);
    group.add(alongZ);
  }

  // Buildings fill the blocks between roads.
  const facadeMats = tex.facades.map((t) => new THREE.MeshLambertMaterial({ map: t }));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x8a5a40 });
  const roofMat2 = new THREE.MeshLambertMaterial({ color: 0x5a6a7a });
  for (let bx = -3; bx <= 2; bx += 1) {
    for (let bz = -3; bz <= 2; bz += 1) {
      const cx = ROADS[bx + 3] + WORLD.roadGap / 2;
      const cz = ROADS[bz + 3] + WORLD.roadGap / 2;
      if (!isClear(cx, cz)) continue;
      const n = int(rng, 1, 3);
      for (let i = 0; i < n; i += 1) {
        const w = range(rng, 16, 26), d = range(rng, 16, 26), h = range(rng, 12, 44);
        const x = cx + range(rng, -14, 14), z = cz + range(rng, -14, 14);
        if (!isClear(x, z)) continue;
        const mat = pick(rng, facadeMats);
        const b = box(w, h, d, mat, x, h / 2, z);
        group.add(b);
        const roof = box(w + 0.6, 0.8, d + 0.6, rng() > 0.5 ? roofMat : roofMat2, x, h + 0.4, z);
        group.add(roof);
        // Rooftop AC box or water tank for skyline variety.
        if (rng() > 0.5) group.add(box(3, 2.4, 3, roofMat2, x + w * 0.2, h + 1.6, z));
        addCollider(x, z, w / 2 + 0.4, d / 2 + 0.4);
      }
    }
  }

  // --- Landmarks -------------------------------------------------------------
  const plaster = new THREE.MeshLambertMaterial({ map: tex.plaster });

  // Torre Lumen: clock tower on the marina plaza, the city's compass point.
  const tower = new THREE.Group();
  const shaft = box(14, 58, 14, plaster, 0, 29, 0);
  tower.add(shaft);
  const clockMat = new THREE.MeshLambertMaterial({ map: tex.clock });
  for (const [rx, rz, ry] of [[0, -7.1, 0], [0, 7.1, Math.PI], [-7.1, 0, -Math.PI / 2], [7.1, 0, Math.PI / 2]]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), clockMat);
    face.position.set(rx, 50, rz); face.rotation.y = ry;
    tower.add(face);
  }
  tower.add(box(17, 3, 17, new THREE.MeshLambertMaterial({ color: 0x8a6a2f }), 0, 59.5, 0));
  tower.position.set(0, 0, -200);
  group.add(tower);
  addCollider(0, -200, 8.5, 8.5);

  // Marina Lumen: wooden piers reaching into the northern sea, with moored boats.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const boatMat = new THREE.MeshLambertMaterial({ color: 0xf6ead2 });
  const boatMat2 = new THREE.MeshLambertMaterial({ color: 0x3a7a9e });
  for (const px of [-60, -20, 20, 60]) {
    group.add(box(6, 1.2, 42, pierMat, px, 0.6, -282));
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.4, 12, 6), px % 40 === 0 ? boatMat : boatMat2);
    hull.rotation.x = Math.PI / 2; hull.rotation.z = Math.PI / 2;
    hull.position.set(px + 6, 0.4, -292);
    group.add(hull);
  }

  // Mercado Viejo: market square with striped stalls and a neon sign.
  const stallCols = [0xe84a6f, 0x39d5ff, 0xffd24a, 0x7dff9a];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const sx = -130 + Math.cos(a) * 22, sz = Math.sin(a) * 22;
    const stall = new THREE.Group();
    stall.add(box(6, 2.4, 5, plaster, 0, 1.2, 0));
    const awn = new THREE.Mesh(
      new THREE.ConeGeometry(4.4, 2, 4),
      new THREE.MeshLambertMaterial({ color: stallCols[i % 4] }),
    );
    awn.position.y = 3.4; awn.rotation.y = Math.PI / 4;
    stall.add(awn);
    stall.position.set(sx, 0, sz);
    group.add(stall);
    addCollider(sx, sz, 3.4, 3);
  }
  const signMat = new THREE.MeshBasicMaterial({ map: tex.signs.mercado });
  const mercadoSign = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), signMat);
  mercadoSign.position.set(-130, 12, -24); group.add(mercadoSign);

  // Taller Lumen garage: open-front workshop with a neon sign and a repair pad.
  const garage = new THREE.Group();
  garage.add(box(24, 9, 16, plaster, 0, 4.5, 0));
  garage.add(box(24, 1, 17, new THREE.MeshLambertMaterial({ color: 0x3a3a44 }), 0, 9.4, 0));
  const garageSign = new THREE.Mesh(new THREE.PlaneGeometry(20, 5), new THREE.MeshBasicMaterial({ map: tex.signs.taller }));
  garageSign.position.set(0, 11.5, 8.2); garage.add(garageSign);
  garage.position.set(130, 0, 130);
  group.add(garage);
  addCollider(130, 130, 12.5, 8.5);

  // Safehouse: small two-storey house with a terracotta roof.
  const house = new THREE.Group();
  house.add(box(12, 7, 10, plaster, 0, 3.5, 0));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 4, 4), new THREE.MeshLambertMaterial({ color: 0xb05a30 }));
  roof.position.y = 9; roof.rotation.y = Math.PI / 4; house.add(roof);
  house.add(box(2.4, 4.4, 0.4, new THREE.MeshLambertMaterial({ color: 0x4a2c14 }), 0, 2.2, 5.1));
  house.position.set(-65, 0, 195);
  group.add(house);
  addCollider(-65, 195, 6.5, 5.5);

  // Farol Rojo lighthouse on the south-east point, with a rotating beam.
  const lightMat = new THREE.MeshLambertMaterial({ map: tex.lighthouse });
  const light = new THREE.Mesh(new THREE.CylinderGeometry(4, 5.5, 34, 12), lightMat);
  light.position.set(230, 17, 265);
  group.add(light);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  );
  lamp.position.set(230, 35.5, 265);
  group.add(lamp);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(6, 60, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
  );
  beam.rotation.z = Math.PI / 2; beam.position.set(230, 35.5, 265);
  group.add(beam);
  addCollider(230, 265, 6, 6);

  // Casino Sol on the coast road, for the vault job.
  const casino = new THREE.Group();
  casino.add(box(30, 16, 20, new THREE.MeshLambertMaterial({ color: 0x7a2a4a }), 0, 8, 0));
  const casinoSign = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshBasicMaterial({ map: tex.signs.casino }));
  casinoSign.position.set(0, 18, 10.2); casino.add(casinoSign);
  casino.position.set(195, 0, -65);
  group.add(casino);
  addCollider(195, -65, 15.5, 10.5);

  // Palms: along the beach, the marina promenade and the market square.
  for (let i = 0; i < 46; i += 1) {
    const palm = makePalm(rng);
    if (i < 20) palm.position.set(-280 + i * 29, 0, 292 + range(rng, -4, 4));
    else if (i < 34) palm.position.set(-260 + (i - 20) * 38, 0, -258 + range(rng, -3, 3));
    else palm.position.set(pick(rng, ROADS) + range(rng, -24, 24), 0, pick(rng, ROADS) + range(rng, -24, 24));
    if (isClear(palm.position.x, palm.position.z)) group.add(palm);
  }

  scene.add(group);
  return {
    group, colliders, beam,
    landmarks: {
      tower: new THREE.Vector3(0, 0, -200),
      marina: new THREE.Vector3(0, 0, -265),
      mercado: new THREE.Vector3(-130, 0, 0),
      playa: new THREE.Vector3(-40, 0, 292),
      lighthouse: new THREE.Vector3(230, 0, 265),
      garage: new THREE.Vector3(130, 0, 130),
      safehouse: new THREE.Vector3(-65, 0, 195),
      casino: new THREE.Vector3(195, 0, -65),
      comet: new THREE.Vector3(8, 0, -258),
    },
  };
}

/** Push a circle out of every building AABB it overlaps. Returns true on a hit. */
export function collideCircle(colliders, x, z, radius) {
  let hit = false;
  for (const c of colliders) {
    const nx = Math.max(c.x - c.hw, Math.min(x, c.x + c.hw));
    const nz = Math.max(c.z - c.hd, Math.min(z, c.z + c.hd));
    const dx = x - nx, dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (radius - d) / d;
        x += dx * push; z += dz * push;
      } else {
        x += radius;
      }
    }
  }
  return { hit, x, z };
}

export function clampWorld(x, z, margin = 4) {
  const m = WORLD.half + 24 - margin;
  return { x: Math.max(-m, Math.min(m, x)), z: Math.max(-m, Math.min(m, z)) };
}
