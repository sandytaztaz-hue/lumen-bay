// LUMEN BAY — the 3D city of Puerto Lumen.
// A 420 m boulevard (z = 215) with lane markings, palms on both sides,
// city blocks north, beach + sea south, Torre Lumen, the lighthouse and
// the marina. Everything is seeded: same seed, same city.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { makeRng } from './random.js';
import { buildingTexture, roadTexture, sandTexture, signTexture, clockTexture } from './textures.js';

const FACADES = ['#c96f4a', '#d9a441', '#7fa8a0', '#e8dcc8', '#5d7d8c', '#b5654d', '#8fa98f', '#a89cc8'];
const SIGNS = [
  { text: 'CAFÉ SOL', bg: '#1d4e5f', fg: '#ffd98a' },
  { text: 'TALLER LUMEN', bg: '#5a1f1f', fg: '#ffffff' },
  { text: 'MERCADO', bg: '#2e5d3a', fg: '#ffe9a8' },
  { text: 'HOTEL LUMEN', bg: '#3a3a5e', fg: '#ffd98a' },
  { text: 'PIER 9', bg: '#123a4a', fg: '#bfe3ff' },
];

function box(w, h, d, mat, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function buildCity(G) {
  const rng = makeRng(G.seed);
  const city = new THREE.Group();
  city.name = 'city';
  G.scene.add(city);
  G.cityGroup = city;

  const mat = (color, rough = 0.85, metal = 0.0) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.9 });
  const sandMat = new THREE.MeshStandardMaterial({ map: sandTexture(G.seed + 5), roughness: 1, emissive: 0x181008, emissiveIntensity: 1 });
  G.sandMat = sandMat; // exposed so a shot can lift the beach (dawn) without touching other shots
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x14495e, roughness: 0.18, metalness: 0.35, emissive: 0x0a2432, emissiveIntensity: 1 });
  const sidewalkMat = mat(0x9aa0a3, 0.95);
  const groundMat = mat(0x6f7d5a, 1);

  // --- ground, beach, sea -------------------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(460, 380), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(160, -0.08, 155);
  ground.receiveShadow = true; city.add(ground);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(440, WORLD.beachZ1 - WORLD.beachZ0), sandMat);
  beach.rotation.x = -Math.PI / 2; beach.position.set(160, -0.02, (WORLD.beachZ0 + WORLD.beachZ1) / 2);
  beach.receiveShadow = true; city.add(beach);
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(440, 4), mat(0xb08d5e, 0.6));
  wet.rotation.x = -Math.PI / 2; wet.position.set(160, -0.01, WORLD.beachZ1 - 2);
  city.add(wet);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(460, 110), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.set(160, 0.05, WORLD.seaZ0 + 55);
  city.add(sea);

  // --- roads ----------------------------------------------------------------
  const road = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.0, z);
    m.receiveShadow = true; city.add(m); return m;
  };
  road(WORLD.boulevardX1 - WORLD.boulevardX0, 14, (WORLD.boulevardX0 + WORLD.boulevardX1) / 2, WORLD.boulevardZ);
  for (const ax of WORLD.avenuesX) road(12, 330, ax, 155);
  for (const sz of WORLD.streetsZ) road(360, 11, 150, sz);

  // --- lane markings --------------------------------------------------------
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xd8a920 });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  const mark = (w, d, x, z, m) => {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
    q.rotation.x = -Math.PI / 2; q.position.set(x, 0.02, z); city.add(q);
  };
  // boulevard double yellow centreline + white dashes
  for (let x = WORLD.boulevardX0; x < WORLD.boulevardX1; x += 2) {
    mark(1.9, 0.16, x, WORLD.boulevardZ - 0.35, yellowMat);
    mark(1.9, 0.16, x, WORLD.boulevardZ + 0.35, yellowMat);
  }
  for (let x = WORLD.boulevardX0 + 4; x < WORLD.boulevardX1; x += 7) {
    mark(2.6, 0.22, x, WORLD.boulevardZ - 4.6, whiteMat);
    mark(2.6, 0.22, x, WORLD.boulevardZ + 4.6, whiteMat);
  }
  // sidewalks along the boulevard
  const swN = new THREE.Mesh(new THREE.PlaneGeometry(420, 3), sidewalkMat);
  swN.rotation.x = -Math.PI / 2; swN.position.set(160, 0.04, WORLD.boulevardZ - 8.4); city.add(swN);
  const swS = new THREE.Mesh(new THREE.PlaneGeometry(420, 3), sidewalkMat);
  swS.rotation.x = -Math.PI / 2; swS.position.set(160, 0.04, WORLD.boulevardZ + 8.4); city.add(swS);

  // --- buildings ------------------------------------------------------------
  const facadeTex = FACADES.map((c, i) => buildingTexture(G.seed + 100 + i, c));
  const facadeMats = facadeTex.map((t) => new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissive, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.9 }));
  const nearStreet = (x) => WORLD.avenuesX.some((ax) => Math.abs(x - ax) < 9);
  let signIdx = 0;
  const rows = [
    { z: 198, hMin: 9, hMax: 20 },
    { z: 172, hMin: 8, hMax: 18 },
    { z: 146, hMin: 10, hMax: 26 },
    { z: 118, hMin: 8, hMax: 16 },
  ];
  for (const row of rows) {
    for (let x = -34; x < 360; x += 15) {
      if (nearStreet(x)) continue;
      if (rng.chance(0.14)) continue;
      const w = rng.range(10, 14), d = rng.range(9, 12), h = rng.range(row.hMin, row.hMax);
      const b = box(w, h, d, facadeMats[rng.int(0, facadeMats.length - 1)], x, h / 2, row.z, city);
      b.userData.isBuilding = true;
      // rooftop AC units + vents so flat roofs read as roofs, not slabs
      if (rng.chance(0.7)) {
        box(rng.range(1.5, 2.5), 0.8, rng.range(1.5, 2.5), mat(0x8a8f96, 0.9), x + rng.range(-2, 2), h + 0.4, row.z + rng.range(-2, 2), city);
      }
      if (rng.chance(0.4)) {
        box(0.9, 1.6, 0.9, mat(0x5a5e63, 0.9), x + w / 2 - 1, h + 0.8, row.z, city);
      }
      // shop sign on some ground floors facing the boulevard
      if (row.z === 198 && rng.chance(0.4)) {
        const s = SIGNS[signIdx++ % SIGNS.length];
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75),
          new THREE.MeshBasicMaterial({ map: signTexture(s.text, s.bg, s.fg) }));
        sign.position.set(x, 3.4, row.z + d / 2 + 0.06); city.add(sign);
      }
    }
  }

  // Torre Lumen — clock tower on the north side, the story landmark.
  const torre = new THREE.Group();
  torre.position.set(185, 0, 128);
  box(10, 42, 10, mat(0xd8c9a8, 0.8), 0, 21, 0, torre);
  box(12, 2, 12, mat(0x8a4a2a, 0.8), 0, 43, 0, torre);
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({ map: clockTexture() }));
  clock.position.set(0, 38, 5.06); torre.add(clock);
  const clock2 = clock.clone(); clock2.rotation.y = Math.PI; clock2.position.z = -5.06; torre.add(clock2);
  city.add(torre);
  G.torre = torre;

  // Lighthouse at the far east end of the beach.
  const light = new THREE.Group();
  light.position.set(345, 0, 252);
  const stripe = new THREE.MeshStandardMaterial({ color: 0xf2ede4, roughness: 0.7 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc22a1e, roughness: 0.7 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 22, 10), stripe);
  tower.position.y = 11; tower.castShadow = true; light.add(tower);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 3, 10), red);
  band.position.y = 15; light.add(band);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffe9a0, emissiveIntensity: 1.4 }));
  lampRoom.position.y = 23; light.add(lampRoom);
  city.add(light);

  // Marina pier, west end. No shadow: the low dawn sun throws the deck's
  // shadow right across the shot-4 beach and turns the sand black.
  const pierMat = mat(0x7a5c38, 0.95);
  box(46, 0.5, 8, pierMat, -18, 0.35, 256, city, false);
  for (let x = -38; x < 4; x += 7) box(0.5, 2.4, 0.5, pierMat, x, -0.6, 259.4, city, false);

  // --- palms ------------------------------------------------------------------
  G.palms = [];
  const trunkMat = mat(0x6e4a26, 1);
  const leafMat = mat(0x2e7d32, 0.9);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3a9e46, roughness: 0.9, side: THREE.DoubleSide });
  const makePalm = (x, z, s = 1) => {
    const p = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, 6.5 * s, 6), trunkMat);
    trunk.position.y = 3.25 * s; trunk.castShadow = true; p.add(trunk);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.1 * s, 1.6 * s, 7), leafMat);
    canopy.position.y = 7 * s; canopy.castShadow = true; p.add(canopy);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.6 * s, 0.55 * s), frondMat);
      f.position.y = 6.4 * s;
      f.rotation.y = (i / 4) * Math.PI * 2;
      f.rotation.z = 0.5;
      f.translateX(1.1 * s);
      p.add(f);
    }
    p.position.set(x, 0, z);
    p.rotation.y = rng.range(0, Math.PI * 2);
    city.add(p); G.palms.push(p);
    return p;
  };
  for (let x = -40; x < 366; x += 17) {
    makePalm(x + rng.range(-2, 2), WORLD.boulevardZ - 11.5, rng.range(0.9, 1.15));
    if (rng.chance(0.85)) makePalm(x + 8 + rng.range(-2, 2), WORLD.boulevardZ + 11.5, rng.range(0.9, 1.1));
  }
  for (let i = 0; i < 10; i++) makePalm(rng.range(-30, 350), rng.range(232, 244), rng.range(0.9, 1.2));

  // --- street lamps ------------------------------------------------------------
  const lampPoleMat = mat(0x22262c, 0.6, 0.6);
  const lampGlowMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 2.2 });
  G.lamps = [];
  for (let x = -30; x < 360; x += 30) {
    for (const z of [WORLD.boulevardZ - 9.5, WORLD.boulevardZ + 9.5]) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 6), lampPoleMat);
      pole.position.y = 2.7; g.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), lampGlowMat);
      head.position.y = 5.5; g.add(head);
      g.position.set(x, 0, z);
      city.add(g); G.lamps.push(g);
    }
  }

  // --- beach umbrellas (dressing; shots clear them where they block) -----------
  G.umbrellas = new THREE.Group(); G.umbrellas.name = 'umbrellas';
  const umbCols = [0xff5a5a, 0x3a9eef, 0xffd23e, 0x7ad07a];
  for (let i = 0; i < 8; i++) {
    const u = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), mat(0xdddddd, 0.6));
    pole.position.y = 1.2; u.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: umbCols[i % umbCols.length], roughness: 0.8 }));
    top.position.y = 2.6; u.add(top);
    u.position.set(rng.range(-20, 340), 0, rng.range(230, 244));
    G.umbrellas.add(u);
  }
  city.add(G.umbrellas);

  // --- wet patches on the boulevard (night reflections) -------------------------
  G.puddles = new THREE.Group();
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.08, metalness: 0.9 });
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(rng.range(1.2, 2.6), 12), puddleMat);
    p.rotation.x = -Math.PI / 2; p.position.set(rng.range(60, 320), 0.03, rng.range(206, 224));
    G.puddles.add(p);
  }
  city.add(G.puddles);
  return city;
}
