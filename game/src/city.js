// Puerto Lumen, built from a seed. The island is a road grid (avenues every
// 52 m) over a ground slab, ocean on the west and south edges, a golden beach
// strip, and the named landmarks from config.js: Torre Lumen clock tower,
// Marina Lumen docks, Mercado Viejo market, Playa Dorada, Farol Rojo
// lighthouse, Taller Lumen garage, the safehouse and Casino Miramar. Buildings
// are boxes with procedural facades; palms are crossed textured planes; the
// sky is a gradient dome with a low sun. Colliders are simple circles and
// axis-aligned boxes so cars and the player cannot drive through walls.
//
// The module returns the scene group plus the data the game loop needs:
// building colliders, road centre lines (for traffic), spawn points, the
// beacon mesh (mission marker) and the heli pad position.

import * as THREE from '../vendor/three/three.module.min.js';
import { LANDMARKS, PALETTE, WORLD } from './config.js';
import { createRandom, pick, randRange, clamp } from './random.js';
import {
  buildingTexture, roadTexture, sandTexture, waterTexture,
  sidewalkTexture, palmTexture, neonTexture, skyTexture, muralTexture,
} from './textures.js';

const ROADS = [-208, -156, -104, -52, 0, 52, 104, 156, 208];

function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function buildCity(scene, seed) {
  const rng = createRandom(seed);
  const group = new THREE.Group();
  group.name = 'puerto-lumen';
  scene.add(group);
  const colliders = []; // {x, z, r} circles and {x, z, hw, hd} boxes
  const roadPoints = [];

  // --- Sky dome, sun light, fog -------------------------------------------
  const skyGeo = new THREE.SphereGeometry(900, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTexture(), side: THREE.BackSide, fog: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.y = 0;
  group.add(sky);
  const sun = new THREE.DirectionalLight(0xffb36b, 2.6);
  sun.position.set(-320, 180, -260);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -280; sun.shadow.camera.right = 280;
  sun.shadow.camera.top = 280; sun.shadow.camera.bottom = -280;
  sun.shadow.camera.far = 1200;
  group.add(sun);
  group.add(new THREE.HemisphereLight(0xffd9a0, 0x3a5a7a, 0.9));
  scene.fog = new THREE.Fog(0xf2a06b, 240, 780);

  // --- Ground, ocean, beach -------------------------------------------------
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x8a7f68 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  group.add(ground);

  const waterMat = new THREE.MeshLambertMaterial({ map: waterTexture(7), color: 0x9fd4e8 });
  const seaWest = new THREE.Mesh(new THREE.PlaneGeometry(320, 560), waterMat);
  seaWest.rotation.x = -Math.PI / 2; seaWest.position.set(-420, WORLD.seaLevel, 0);
  group.add(seaWest);
  const seaSouth = new THREE.Mesh(new THREE.PlaneGeometry(560, 320), waterMat);
  seaSouth.rotation.x = -Math.PI / 2; seaSouth.position.set(0, WORLD.seaLevel, -420);
  group.add(seaSouth);

  const sandMat = new THREE.MeshLambertMaterial({ map: sandTexture(11) });
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(36, 520), sandMat);
  beach.rotation.x = -Math.PI / 2; beach.position.set(-244, 0.05, 0);
  beach.receiveShadow = true;
  group.add(beach);
  const beachSouth = new THREE.Mesh(new THREE.PlaneGeometry(520, 30), sandMat);
  beachSouth.rotation.x = -Math.PI / 2; beachSouth.position.set(0, 0.05, -244);
  group.add(beachSouth);

  // --- Roads -----------------------------------------------------------------
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture(3) });
  const walkMat = new THREE.MeshLambertMaterial({ map: sidewalkTexture(5) });
  for (const r of ROADS) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(10, 520), roadMat);
    ns.rotation.x = -Math.PI / 2; ns.position.set(r, 0.08, 0);
    ns.receiveShadow = true; group.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(520, 10), roadMat);
    ew.rotation.x = -Math.PI / 2; ew.position.set(0, 0.08, r);
    ew.receiveShadow = true; group.add(ew);
    for (let t = -240; t <= 240; t += 40) {
      roadPoints.push({ x: r, z: t, dir: 0 });
      roadPoints.push({ x: t, z: r, dir: 1 });
    }
  }
  // Sidewalk slabs along the main avenues.
  for (const r of ROADS) {
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 520), walkMat);
    s1.rotation.x = -Math.PI / 2; s1.position.set(r + 7, 0.06, 0); group.add(s1);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(520, 3), walkMat);
    s2.rotation.x = -Math.PI / 2; s2.position.set(0, 0.06, r + 7); group.add(s2);
  }

  // --- Buildings ---------------------------------------------------------------
  const facadeMats = PALETTE.building.map((col, i) => new THREE.MeshLambertMaterial({
    map: buildingTexture(100 + i * 17, '#' + col.toString(16).padStart(6, '0')),
  }));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a4a3a });
  const neonWords = ['TACOS', 'HOTEL', 'BAR', 'PIZZA', 'CLUB', 'CAFE', 'SURF', '24H'];
  const neonMats = PALETTE.neon.map((c) => new THREE.MeshBasicMaterial({
    map: neonTexture(pick(rng, neonWords), '#' + c.toString(16).padStart(6, '0')),
  }));
  let neonIdx = 0;
  for (let gx = 0; gx < ROADS.length - 1; gx += 1) {
    for (let gz = 0; gz < ROADS.length - 1; gz += 1) {
      const cx = (ROADS[gx] + ROADS[gx + 1]) / 2;
      const cz = (ROADS[gz] + ROADS[gz + 1]) / 2;
      // Keep the landmark plots and the market square clear of random blocks.
      if (Math.hypot(cx - LANDMARKS.mercado.x, cz - LANDMARKS.mercado.z) < 46) continue;
      if (Math.hypot(cx - LANDMARKS.torre.x, cz - LANDMARKS.torre.z) < 40) continue;
      if (Math.hypot(cx - LANDMARKS.casino.x, cz - LANDMARKS.casino.z) < 34) continue;
      if (Math.hypot(cx - LANDMARKS.safehouse.x, cz - LANDMARKS.safehouse.z) < 30) continue;
      if (Math.hypot(cx - LANDMARKS.taller.x, cz - LANDMARKS.taller.z) < 34) continue;
      // The marina, beach, lighthouse and boat plots stay open so the hero
      // car, the docks and the mission targets never sit inside a building.
      if (Math.hypot(cx - LANDMARKS.marina.x, cz - LANDMARKS.marina.z) < 44) continue;
      if (Math.hypot(cx - LANDMARKS.farol.x, cz - LANDMARKS.farol.z) < 30) continue;
      if (Math.hypot(cx - LANDMARKS.playa.x, cz - LANDMARKS.playa.z) < 30) continue;
      if (Math.hypot(cx - LANDMARKS.boat.x, cz - LANDMARKS.boat.z) < 30) continue;
      if (Math.hypot(cx - LANDMARKS.coastRoad.x, cz - LANDMARKS.coastRoad.z) < 26) continue;
      if (cx < -190 || cz < -190) continue;
      if (rng() < 0.08) continue; // a few empty lots with palms
      // City-block slab under each plot, so the ground never reads as one
      // flat empty plane from the chase camera.
      const slab = new THREE.Mesh(new THREE.PlaneGeometry(46, 46),
        new THREE.MeshLambertMaterial({ color: rng() < 0.5 ? 0x8f8471 : 0x7d8a5f }));
      slab.rotation.x = -Math.PI / 2; slab.position.set(cx, 0.04, cz);
      slab.receiveShadow = true; group.add(slab);
      const w = randRange(rng, 16, 30), d = randRange(rng, 16, 30);
      const h = randRange(rng, 10, 34);
      const mat = pick(rng, facadeMats);
      const b = box(w, h, d, mat, cx, h / 2, cz, group);
      box(w + 1, 1.2, d + 1, roofMat, cx, h + 0.6, cz, group);
      colliders.push({ x: cx, z: cz, hw: w / 2 + 1, hd: d / 2 + 1 });
      if (rng() < 0.4) {
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(10, 3.75),
          neonMats[neonIdx++ % neonMats.length],
        );
        sign.position.set(cx, Math.min(h - 2, 12), cz + d / 2 + 0.15);
        group.add(sign);
      }
      // Rooftop water tank on taller blocks.
      if (h > 22 && rng() < 0.5) {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(2.2, 2.2, 3.4, 10),
          new THREE.MeshLambertMaterial({ color: 0x7a6a55 }),
        );
        tank.position.set(cx + w * 0.2, h + 2.4, cz);
        tank.castShadow = true; group.add(tank);
      }
    }
  }

  // Paved plazas at the tower and the market square, so the open plots read
  // as designed public space instead of bare dirt.
  for (const [px, pz, pr] of [[LANDMARKS.torre.x, LANDMARKS.torre.z, 42], [LANDMARKS.mercado.x, LANDMARKS.mercado.z, 34]]) {
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(pr, 28),
      new THREE.MeshLambertMaterial({ map: sidewalkTexture(21) }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(px, 0.05, pz);
    plaza.receiveShadow = true; group.add(plaza);
  }

  // --- Landmarks ---------------------------------------------------------------
  // Torre Lumen: clock tower with a glowing clock face and a spire.
  const towerMat = new THREE.MeshLambertMaterial({ color: 0xf2d8a0 });
  const tower = box(14, 58, 14, towerMat, LANDMARKS.torre.x, 29, LANDMARKS.torre.z, group);
  void tower;
  const clockMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const [dx, dz] of [[0, 7.1], [0, -7.1], [7.1, 0], [-7.1, 0]]) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(4.4, 24), clockMat);
    face.position.set(LANDMARKS.torre.x + dx, 48, LANDMARKS.torre.z + dz);
    if (dx !== 0) face.rotation.y = Math.PI / 2;
    group.add(face);
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(5, 12, 4),
    new THREE.MeshLambertMaterial({ color: 0x2e6f8e }));
  spire.position.set(LANDMARKS.torre.x, 64, LANDMARKS.torre.z);
  spire.rotation.y = Math.PI / 4; spire.castShadow = true; group.add(spire);
  colliders.push({ x: LANDMARKS.torre.x, z: LANDMARKS.torre.z, hw: 8, hd: 8 });

  // Farol Rojo: red-and-white striped lighthouse with a rotating light beam.
  const stripeRed = new THREE.MeshLambertMaterial({ color: 0xd43d2a });
  const stripeWhite = new THREE.MeshLambertMaterial({ color: 0xfff3d6 });
  for (let i = 0; i < 5; i += 1) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(4.4 - i * 0.35, 4.8 - i * 0.35, 7, 12),
      i % 2 ? stripeWhite : stripeRed);
    seg.position.set(LANDMARKS.farol.x, 3.5 + i * 7, LANDMARKS.farol.z);
    seg.castShadow = true; group.add(seg);
  }
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 10), lampMat);
  lamp.position.set(LANDMARKS.farol.x, 40, LANDMARKS.farol.z); group.add(lamp);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff2a8, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(6, 46, 12, 1, true), beamMat);
  beam.rotation.z = Math.PI / 2; beam.position.set(LANDMARKS.farol.x + 24, 40, LANDMARKS.farol.z);
  beam.name = 'lighthouse-beam'; group.add(beam);
  colliders.push({ x: LANDMARKS.farol.x, z: LANDMARKS.farol.z, hw: 6, hd: 6 });

  // Marina Lumen: wooden docks, moored boats, crates.
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  for (let i = 0; i < 4; i += 1) {
    const dock = box(26, 1, 4, woodMat, -196 + i * 8, 0.6, -196 - i * 10, group);
    dock.rotation.y = 0.3;
  }
  const boatCols = [0xff5e7a, 0x7fd4c1, 0xffd166, 0x8ecae6];
  for (let i = 0; i < 6; i += 1) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 10),
      new THREE.MeshLambertMaterial({ color: boatCols[i % 4] }));
    hull.position.set(-205 + i * 9, 0.4, -215 - (i % 2) * 14);
    hull.rotation.y = 0.4 + i * 0.1; hull.castShadow = true; group.add(hull);
    const cabin = box(2.6, 1.6, 3, new THREE.MeshLambertMaterial({ color: 0xfff3d6 }),
      hull.position.x, 2, hull.position.z, group);
    cabin.rotation.y = hull.rotation.y;
  }
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xb98a4a });
  for (let i = 0; i < 10; i += 1) {
    box(2.2, 2.2, 2.2, crateMat, -188 + (i % 5) * 4, 1.1, -172 - Math.floor(i / 5) * 4, group);
  }

  // Mercado Viejo: market square with stalls, awnings and a mural wall.
  const stallCols = [0xff6b35, 0x2ec4b6, 0xffd166, 0xef476f];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const sx = LANDMARKS.mercado.x + Math.cos(a) * 18;
    const sz = LANDMARKS.mercado.z + Math.sin(a) * 18;
    box(5, 2.4, 4, new THREE.MeshLambertMaterial({ color: stallCols[i % 4] }), sx, 1.2, sz, group);
    const awn = new THREE.Mesh(new THREE.ConeGeometry(4.4, 2.2, 4),
      new THREE.MeshLambertMaterial({ color: 0xfff3d6 }));
    awn.position.set(sx, 3.6, sz); awn.rotation.y = Math.PI / 4; group.add(awn);
    colliders.push({ x: sx, z: sz, hw: 3, hd: 3 });
  }
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(30, 12),
    new THREE.MeshLambertMaterial({ map: muralTexture(42) }));
  mural.position.set(LANDMARKS.mercado.x, 6, LANDMARKS.mercado.z - 26);
  group.add(mural);

  // Taller Lumen garage: big open-front box with a sign and tyre stacks.
  const garageMat = new THREE.MeshLambertMaterial({ color: 0x4a6b8a });
  box(26, 10, 18, garageMat, LANDMARKS.taller.x, 5, LANDMARKS.taller.z, group);
  const garageSign = new THREE.Mesh(new THREE.PlaneGeometry(16, 6),
    new THREE.MeshBasicMaterial({ map: neonTexture('TALLER', '#00e5ff') }));
  garageSign.position.set(LANDMARKS.taller.x, 9, LANDMARKS.taller.z + 9.2);
  group.add(garageSign);
  colliders.push({ x: LANDMARKS.taller.x, z: LANDMARKS.taller.z, hw: 13, hd: 9 });
  const tyreMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  for (let i = 0; i < 6; i += 1) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.45, 8, 14), tyreMat);
    tyre.position.set(LANDMARKS.taller.x - 14, 0.6 + (i % 3) * 1.1, LANDMARKS.taller.z - 6 + Math.floor(i / 3) * 4);
    tyre.rotation.x = Math.PI / 2; group.add(tyre);
  }

  // Safehouse: small two-storey house with a warm porch light.
  const houseMat = new THREE.MeshLambertMaterial({ color: 0xffd166 });
  box(12, 8, 10, houseMat, LANDMARKS.safehouse.x, 4, LANDMARKS.safehouse.z, group);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 4.5, 4),
    new THREE.MeshLambertMaterial({ color: 0xd43d2a }));
  roof.position.set(LANDMARKS.safehouse.x, 10.2, LANDMARKS.safehouse.z);
  roof.rotation.y = Math.PI / 4; roof.castShadow = true; group.add(roof);
  const porch = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  porch.position.set(LANDMARKS.safehouse.x, 3.4, LANDMARKS.safehouse.z + 5.2);
  group.add(porch);
  colliders.push({ x: LANDMARKS.safehouse.x, z: LANDMARKS.safehouse.z, hw: 7, hd: 6 });

  // Casino Miramar: wide glass-front block with a gold sign band.
  const casinoMat = new THREE.MeshLambertMaterial({ color: 0x2a2a4a });
  box(30, 16, 20, casinoMat, LANDMARKS.casino.x, 8, LANDMARKS.casino.z, group);
  const goldBand = box(30.5, 2, 20.5, new THREE.MeshLambertMaterial({ color: 0xd4af37 }),
    LANDMARKS.casino.x, 14, LANDMARKS.casino.z, group);
  void goldBand;
  colliders.push({ x: LANDMARKS.casino.x, z: LANDMARKS.casino.z, hw: 16, hd: 11 });

  // --- Palms ------------------------------------------------------------------
  const palmTex = palmTexture(9);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
  const frondMat = new THREE.MeshBasicMaterial({
    map: palmTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.15,
  });
  const palmSpots = [];
  for (let i = 0; i < 90; i += 1) {
    const x = randRange(rng, -250, 250), z = randRange(rng, -250, 250);
    if (Math.abs(x) > 255 || Math.abs(z) > 255) continue;
    // Keep palms off the road centrelines and out of landmark plots.
    let onRoad = false;
    for (const r of ROADS) if (Math.abs(x - r) < 7 || Math.abs(z - r) < 7) { onRoad = true; break; }
    if (onRoad) continue;
    if (Math.hypot(x - LANDMARKS.mercado.x, z - LANDMARKS.mercado.z) < 30) continue;
    palmSpots.push({ x, z });
  }
  // Beach palms in a row along the sand.
  for (let z = -220; z <= 220; z += 34) palmSpots.push({ x: -238, z });
  for (const p of palmSpots) {
    const h = randRange(rng, 6, 9);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, h, 7), trunkMat);
    trunk.position.set(p.x, h / 2, p.z); trunk.castShadow = true; group.add(trunk);
    const fronds = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), frondMat);
    fronds.position.set(p.x, h + 0.6, p.z);
    // Crown planes lie almost flat (tilted ~25°) so a palm reads as a crown
    // from the chase camera instead of a green starburst.
    fronds.rotation.x = -Math.PI / 2 + 0.45;
    fronds.rotation.z = rng() * Math.PI;
    group.add(fronds);
    const fronds2 = fronds.clone();
    fronds2.rotation.z = fronds.rotation.z + Math.PI / 2;
    fronds2.position.y = h + 1.0;
    group.add(fronds2);
  }

  // --- Mission beacon: a tall pulsing column of light + a floating ring --------
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xffd24d, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 60, 16, 1, true), beaconMat);
  beacon.position.set(0, 30, 0); beacon.name = 'mission-beacon';
  group.add(beacon);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd24d, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.4, 32), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; ring.name = 'mission-ring';
  group.add(ring);

  // Health / armour pickups: glowing crosses scattered through the city.
  const pickups = [];
  const hpMat = new THREE.MeshBasicMaterial({ color: 0x4dff88 });
  const arMat = new THREE.MeshBasicMaterial({ color: 0x4dc3ff });
  for (let i = 0; i < 14; i += 1) {
    const x = randRange(rng, -220, 220), z = randRange(rng, -220, 220);
    const kind = i % 2 ? 'armour' : 'health';
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), kind === 'health' ? hpMat : arMat);
    m.position.set(x, 1.2, z); m.name = 'pickup-' + kind + '-' + i;
    group.add(m);
    pickups.push({ mesh: m, x, z, kind, taken: false, respawn: 0 });
  }

  return {
    group, colliders, roadPoints, beacon, ring, beam, pickups,
    spawn: { x: LANDMARKS.safehouse.x + 12, z: LANDMARKS.safehouse.z + 6 },
  };
}

// Push a circle (player or car) out of every box/circle collider it overlaps.
// Returns true when a push happened, so the caller can kill velocity into walls.
export function resolveCollisions(pos, radius, colliders) {
  let hit = false;
  for (const c of colliders) {
    if (c.r !== undefined) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + radius;
      if (d < min && d > 0.0001) {
        pos.x = c.x + (dx / d) * min; pos.z = c.z + (dz / d) * min; hit = true;
      }
    } else {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const px = c.hw + radius - Math.abs(dx), pz = c.hd + radius - Math.abs(dz);
      if (px > 0 && pz > 0) {
        if (px < pz) pos.x = c.x + Math.sign(dx || 1) * (c.hw + radius);
        else pos.z = c.z + Math.sign(dz || 1) * (c.hd + radius);
        hit = true;
      }
    }
  }
  pos.x = clamp(pos.x, -252, 252);
  pos.z = clamp(pos.z, -252, 252);
  return hit;
}

// Is a point on a road (within 6 m of a road centreline)? Traffic and the
// wanted-speed rule both use this.
export function onRoad(x, z) {
  for (const r of ROADS) if (Math.abs(x - r) < 6 || Math.abs(z - r) < 6) return true;
  return false;
}

// Nearest road centreline coordinate for one axis, used to snap spawned
// traffic onto a lane instead of into a building.
export function nearestRoad(v) {
  let best = ROADS[0], bd = Infinity;
  for (const r of ROADS) { const d = Math.abs(v - r); if (d < bd) { bd = d; best = r; } }
  return best;
}
export { ROADS };

