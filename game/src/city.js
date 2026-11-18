// Puerto Lumen itself: streets, blocks, buildings, palms, the Torre Lumen
// clock tower, the marina, the lighthouse and the beach. Everything is
// placed from the seeded RNG, so the city is identical on every run.
// Exports the collision boxes and the traffic loops other systems use.
import * as THREE from 'three';
import { WORLD, PALETTE, LANDMARKS, allStreets, streetCoord } from './config.js';
import { makeRng, choice, between } from './random.js';
import { paintFacade, paintRoad, paintPavement, paintSand, paintSign, paintOcean } from './textures.js';

// Story places kept clear of buildings, so the marina, market, safehouse,
// garage, park, tower plaza, beach and lighthouse are real open spaces.
const OPEN_PLOTS = [
  { x: -210, z: 175, why: 'marina' },
  { x: 175, z: 105, why: 'mercado' },
  { x: 105, z: -105, why: 'safehouse' },
  { x: -105, z: -175, why: 'taller' },
  { x: 35, z: 175, why: 'park' },
  { x: 35, z: -35, why: 'torre' },
  { x: 105, z: 245, why: 'playa' },
  { x: -245, z: -245, why: 'lighthouse' },
];
const OPEN_RADIUS = 55;

export function buildCity(scene) {
  const rng = makeRng(WORLD.seed);
  const colliders = [];
  const roadLoops = [];
  const group = new THREE.Group();
  group.name = 'PuertoLumen';
  scene.add(group);

  const addBox = (x, z, hw, hd) => {
    colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
  };
  const isOpenPlot = (x, z) => OPEN_PLOTS.some((p) => Math.hypot(p.x - x, p.z - z) < OPEN_RADIUS);

  // --- ground: pavement base, beach strip in the south, ocean west + south ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2, WORLD.half * 2),
    new THREE.MeshLambertMaterial({ map: paintPavement() }),
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 36),
    new THREE.MeshLambertMaterial({ map: paintSand(7) }),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.02, 262);
  group.add(beach);

  const oceanW = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshLambertMaterial({ map: paintOcean(11) }),
  );
  oceanW.rotation.x = -Math.PI / 2;
  oceanW.position.set(-330, -0.4, 120);
  group.add(oceanW);
  const oceanS = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 300),
    new THREE.MeshLambertMaterial({ map: paintOcean(12) }),
  );
  oceanS.rotation.x = -Math.PI / 2;
  oceanS.position.set(0, -0.4, 430);
  group.add(oceanS);

  // --- roads: one dark strip per street, both directions ---
  const roadMat = new THREE.MeshLambertMaterial({ map: paintRoad() });
  for (const s of allStreets()) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.half * 2), roadMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(s, 0.05, 0);
    group.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, WORLD.roadWidth), roadMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.05, s);
    group.add(ew);
  }

  // --- traffic loops: one rounded rectangle around each inner block ---
  for (let i = 0; i < WORLD.streetCount - 1; i++) {
    for (let j = 0; j < WORLD.streetCount - 1; j++) {
      const x0 = streetCoord(i);
      const x1 = streetCoord(i + 1);
      const z0 = streetCoord(j);
      const z1 = streetCoord(j + 1);
      roadLoops.push([
        [x0 + 3.5, z0 + 3.5], [x1 - 3.5, z0 + 3.5],
        [x1 - 3.5, z1 - 3.5], [x0 + 3.5, z1 - 3.5],
      ]);
    }
  }

  // --- buildings: one or two per block, varied heights, warm stucco ---
  const facadeMats = PALETTE.stucco.map((c, i) => new THREE.MeshLambertMaterial({ map: paintFacade(c, 100 + i) }));
  const roofMat = new THREE.MeshLambertMaterial({ color: '#4a3348' });
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < WORLD.streetCount - 1; i++) {
    for (let j = 0; j < WORLD.streetCount - 1; j++) {
      const cx = (streetCoord(i) + streetCoord(i + 1)) / 2;
      const cz = (streetCoord(j) + streetCoord(j + 1)) / 2;
      if (isOpenPlot(cx, cz)) continue;
      const count = rng() < 0.7 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const w = between(rng, 16, 24);
        const d = between(rng, 16, 24);
        const h = between(rng, 9, rng() < 0.18 ? 42 : 20);
        const x = count === 1 ? cx : cx + (k === 0 ? -4.4 : 4.4);
        const z = count === 1 ? cz : cz + (k === 0 ? -4.4 : 4.4);
        const tower = new THREE.Mesh(unitBox, choice(rng, facadeMats));
        tower.scale.set(w, h, d);
        tower.position.set(x, h / 2, z);
        group.add(tower);
        const roof = new THREE.Mesh(unitBox, roofMat);
        roof.scale.set(w + 0.6, 0.8, d + 0.6);
        roof.position.set(x, h + 0.4, z);
        group.add(roof);
        if (h > 24) {
          const ac = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: '#cfc4b8' }));
          ac.scale.set(3, 1.6, 3);
          ac.position.set(x + w * 0.2, h + 1.6, z);
          group.add(ac);
          // neon trim along the roof edge so tall towers glow at dusk
          const neon = new THREE.Mesh(
            unitBox,
            new THREE.MeshBasicMaterial({ color: PALETTE.neon[Math.floor(rng() * PALETTE.neon.length)] }),
          );
          neon.scale.set(w + 0.3, 0.35, 0.35);
          neon.position.set(x, h + 0.9, z + d / 2 + 0.1);
          group.add(neon);
        }
        addBox(x, z, w / 2 + 0.4, d / 2 + 0.4);
      }
    }
  }

  buildTorre(group, addBox);
  buildLighthouse(group, addBox);
  buildMarina(group, addBox, rng);
  buildMercado(group, addBox);
  buildPark(group);
  plantPalms(group, rng);
  plantLamps(group);

  return { colliders, roadLoops, group };
}

/** Torre Lumen — the 46 m clock tower on the plaza at (35, -35). */
function buildTorre(group, addBox) {
  const g = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: '#f7e8c9' });
  const trim = new THREE.MeshLambertMaterial({ color: '#c94f5e' });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(12, 46, 12), stone);
  shaft.position.y = 23;
  g.add(shaft);
  const band = new THREE.Mesh(new THREE.BoxGeometry(13, 2, 13), trim);
  band.position.y = 34;
  g.add(band);
  const faceMat = new THREE.MeshBasicMaterial({ color: '#fff3d6' });
  const handMat = new THREE.MeshBasicMaterial({ color: '#1a0f2e' });
  for (const [dx, dz, ry] of [[0, 6.1, 0], [0, -6.1, Math.PI], [6.1, 0, Math.PI / 2], [-6.1, 0, -Math.PI / 2]]) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), faceMat);
    face.position.set(dx, 40, dz);
    face.rotation.y = ry;
    g.add(face);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.1), handMat);
    hand.position.set(dx, 40.6, dz + (ry === 0 ? 0.15 : 0));
    hand.rotation.y = ry;
    g.add(hand);
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(4.5, 9, 4), trim);
  spire.position.y = 50.5;
  spire.rotation.y = Math.PI / 4;
  g.add(spire);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 5.5),
    new THREE.MeshBasicMaterial({ map: paintSign('TORRE LUMEN') }),
  );
  sign.position.set(0, 12, 6.4);
  g.add(sign);
  g.position.set(LANDMARKS.torre.x, 0, LANDMARKS.torre.z);
  group.add(g);
  addBox(LANDMARKS.torre.x, LANDMARKS.torre.z, 7, 7);
}

/** Farol Rojo — red-and-white striped lighthouse in the north-west corner. */
function buildLighthouse(group, addBox) {
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: '#c94f5e' });
  const white = new THREE.MeshLambertMaterial({ color: '#fff3d6' });
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4 - i * 0.3, 3.8 - i * 0.3, 6, 10),
      i % 2 ? white : red,
    );
    seg.position.y = 3 + i * 6;
    g.add(seg);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(2, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd76b' }));
  lamp.position.y = 32;
  g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(3, 3.5, 10), red);
  cap.position.y = 35;
  g.add(cap);
  g.position.set(LANDMARKS.lighthouse.x, 0, LANDMARKS.lighthouse.z);
  group.add(g);
  addBox(LANDMARKS.lighthouse.x, LANDMARKS.lighthouse.z, 4.5, 4.5);
}

/** Marina Lumen — wooden docks, moored boats, crates and a neon sign. */
function buildMarina(group, addBox, rng) {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: '#8a6b4a' });
  const dock = new THREE.Mesh(new THREE.BoxGeometry(70, 1, 8), wood);
  dock.position.set(-210, 0.5, 205);
  g.add(dock);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 40), wood);
  pier.position.set(-178, 0.5, 190);
  g.add(pier);
  const hullA = new THREE.MeshLambertMaterial({ color: '#e8e4da' });
  const hullB = new THREE.MeshLambertMaterial({ color: '#ff8c2e' });
  for (let i = 0; i < 4; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 9), i % 2 ? hullA : hullB);
    hull.position.y = 0.4;
    boat.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 3), new THREE.MeshLambertMaterial({ color: '#f2e9ff' }));
    cab.position.set(0, 1.8, -1);
    boat.add(cab);
    boat.position.set(-225 + i * 16, -0.2, 216 + (i % 2) * 6);
    boat.rotation.y = between(rng, -0.15, 0.15);
    g.add(boat);
  }
  const crateMat = new THREE.MeshLambertMaterial({ color: '#b08d4f' });
  for (let i = 0; i < 8; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), crateMat);
    crate.position.set(-232 + (i % 4) * 5, 1.1, 192 + Math.floor(i / 4) * 5);
    crate.rotation.y = between(rng, 0, 1);
    g.add(crate);
    addBox(crate.position.x, crate.position.z, 1.4, 1.4);
  }
  // Lena's cargo: blue crates on the far dock — the job's target.
  const cargoMat = new THREE.MeshLambertMaterial({ color: '#2e7dff' });
  for (const [cx, cz] of [[-222, 218], [-218, 219.5], [-214, 218], [-208, 219]]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), cargoMat);
    crate.position.set(cx, 1.2, cz);
    crate.rotation.y = between(rng, 0, 0.6);
    g.add(crate);
    addBox(cx, cz, 1.5, 1.5);
  }
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 6),
    new THREE.MeshBasicMaterial({ map: paintSign('MARINA LUMEN', '#00e5ff') }),
  );
  sign.position.set(-210, 9, 176);
  g.add(sign);
  group.add(g);
}

/** Mercado Viejo — striped-awning stalls on the plaza. */
function buildMercado(group, addBox) {
  const g = new THREE.Group();
  const awnColors = ['#ff2e88', '#00e5ff', '#ffd23e', '#7dff9b'];
  for (let i = 0; i < 6; i++) {
    const x = 155 + (i % 3) * 18;
    const z = 88 + Math.floor(i / 3) * 16;
    const stall = new THREE.Mesh(new THREE.BoxGeometry(8, 2.6, 6), new THREE.MeshLambertMaterial({ color: '#6b4a2e' }));
    stall.position.set(x, 1.3, z);
    g.add(stall);
    const awn = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.2, 4), new THREE.MeshLambertMaterial({ color: awnColors[i % 4] }));
    awn.position.set(x, 3.8, z);
    awn.rotation.y = Math.PI / 4;
    g.add(awn);
    addBox(x, z, 4.4, 3.4);
  }
  group.add(g);
}

/** Central park — lawn, fountain and a jet. */
function buildPark(group) {
  const g = new THREE.Group();
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(20, 24), new THREE.MeshLambertMaterial({ color: '#3f9e5f' }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(35, 0.06, 175);
  g.add(lawn);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.6, 1.2, 16), new THREE.MeshLambertMaterial({ color: '#cfc4b8' }));
  basin.position.set(35, 0.6, 175);
  g.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(5.4, 16), new THREE.MeshLambertMaterial({ color: '#4fc3f7' }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(35, 1.25, 175);
  g.add(water);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1, 3, 8), new THREE.MeshLambertMaterial({ color: '#e8e4da' }));
  jet.position.set(35, 2.4, 175);
  g.add(jet);
  group.add(g);
}

/** Palms on street corners and a row along the beach. */
function plantPalms(group, rng) {
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 5, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk });
  const crownMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmGreen });
  const leafGeo = new THREE.ConeGeometry(1.7, 3.2, 5);
  const plant = (x, z) => {
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 2.5, z);
    trunk.rotation.z = between(rng, -0.1, 0.1);
    group.add(trunk);
    const crown = new THREE.Mesh(leafGeo, crownMat);
    crown.position.set(x, 6.2, z);
    crown.rotation.x = Math.PI;
    group.add(crown);
    const crown2 = new THREE.Mesh(leafGeo, crownMat);
    crown2.scale.set(0.7, 0.7, 0.7);
    crown2.position.set(x, 5.4, z);
    crown2.rotation.x = Math.PI;
    crown2.rotation.y = 1.2;
    group.add(crown2);
  };
  for (const s of allStreets()) {
    for (const t of allStreets()) {
      if (rng() < 0.45) continue;
      const x = s + (rng() < 0.5 ? -9 : 9);
      const z = t + (rng() < 0.5 ? -9 : 9);
      if (Math.abs(x) > 272 || Math.abs(z) > 272) continue;
      plant(x, z);
    }
  }
  for (let i = 0; i < 14; i++) {
    plant(-240 + i * 36 + between(rng, -6, 6), 248);
  }
}

/** Street lamps: pole + warm globe on every other corner. */
function plantLamps(group) {
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 6, 5);
  const poleMat = new THREE.MeshLambertMaterial({ color: '#2c2438' });
  const globeGeo = new THREE.SphereGeometry(0.5, 8, 6);
  const globeMat = new THREE.MeshBasicMaterial({ color: '#ffd76b' });
  for (const s of allStreets()) {
    for (const t of allStreets()) {
      if ((s + t) % 140 !== 0) continue;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(s + 8, 3, t + 8);
      group.add(pole);
      const globe = new THREE.Mesh(globeGeo, globeMat);
      globe.position.set(s + 8, 6.2, t + 8);
      group.add(globe);
    }
  }
}
