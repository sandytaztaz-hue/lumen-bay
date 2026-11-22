// LUMEN BAY — city.js
// Builds Puerto Lumen: ground, beach, sea, roads, sidewalks, buildings,
// Torre Lumen, the lighthouse, the marina pier, palms, lamps, umbrellas
// and puddles. Everything draws from the seeded stream, so the same seed
// always builds the same city.

import * as THREE from 'three';
import { WORLD, AVENUES, STREETS, BUILDING_ROWS, FACADE_COLORS, SHOP_SIGNS } from './config.js';

function box(w, h, d, color, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
  if (opts.map) mat.map = opts.map;
  if (opts.emissiveMap) mat.emissiveMap = opts.emissiveMap;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = opts.castShadow ?? false;
  mesh.receiveShadow = opts.receiveShadow ?? false;
  return mesh;
}

function flatPlane(w, d, color, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.95,
    metalness: opts.metalness ?? 0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
  if (opts.map) {
    mat.map = opts.map;
    mat.map.wrapS = THREE.RepeatWrapping;
    mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.repeat.set(opts.repeatX ?? 1, opts.repeatY ?? 1);
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function makePalm(rng) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 6.5, 7), trunkMat);
  trunk.position.y = 3.25;
  trunk.rotation.z = rng.range(-0.06, 0.06);
  trunk.castShadow = true;
  palm.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.4, 8), leafMat);
  canopy.position.y = 7.2;
  canopy.castShadow = true;
  palm.add(canopy);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3d9142, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const frond = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.9), frondMat);
    const a = (i / 4) * Math.PI * 2 + rng.range(-0.2, 0.2);
    frond.position.set(Math.cos(a) * 1.4, 6.6, Math.sin(a) * 1.4);
    frond.rotation.set(0.5, -a + Math.PI / 2, 0);
    frond.rotation.order = 'YXZ';
    frond.rotation.y = -a;
    frond.rotation.x = 0.45;
    palm.add(frond);
  }
  return palm;
}

function makeLamp(glowTex) {
  const lamp = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.6, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 8), poleMat);
  pole.position.y = 2.7;
  pole.castShadow = true;
  lamp.add(pole);
  const globeMat = new THREE.MeshStandardMaterial({ color: 0xffe6a8, emissive: 0xffc861, emissiveIntensity: 1.6 });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), globeMat);
  globe.position.y = 5.55;
  lamp.add(globe);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffc861, transparent: true, opacity: 0.85, depthWrite: false,
  }));
  sprite.scale.set(2.2, 2.2, 1);
  sprite.position.y = 5.55;
  lamp.add(sprite);
  lamp.userData.globe = globe;
  lamp.userData.sprite = sprite;
  return lamp;
}

export function buildCity(scene, rng, textures) {
  const group = new THREE.Group();
  group.name = 'city';
  const umbrellas = [];
  const lamps = [];

  // Ground: grass-green plane under the whole world.
  const ground = flatPlane(460, 380, 0x5d8a4a);
  ground.position.set(160, 0, 155);
  group.add(ground);

  // Beach: sand strip along the south, wet sand at its south edge.
  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xe3c98f, roughness: 1, map: textures.sand,
    emissive: 0x8a5a2a, emissiveIntensity: 0,
  });
  sandMat.map.wrapS = THREE.RepeatWrapping;
  sandMat.map.wrapT = THREE.RepeatWrapping;
  sandMat.map.repeat.set(12, 1);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(440, 22), sandMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(160, 0.03, 237);
  beach.receiveShadow = true;
  group.add(beach);
  const wet = flatPlane(440, 4, 0xb89a68, { roughness: 0.35 });
  wet.position.set(160, 0.05, 246);
  group.add(wet);

  // Sea: deep teal, slightly glossy, south of the beach.
  const sea = flatPlane(460, 90, 0x0e5a6b, { roughness: 0.25, metalness: 0.35 });
  sea.position.set(160, 0.02, 293);
  group.add(sea);

  // Roads: boulevard, avenues, streets.
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.95, map: textures.road,
  });
  function roadPlane(w, d, x, z) {
    const mat = roadMat.clone();
    // Clone the texture per road: every road repeats it differently, and
    // sharing one texture would let the last road's repeat win for all.
    mat.map = textures.road.clone();
    mat.map.needsUpdate = true;
    mat.map.wrapS = THREE.RepeatWrapping;
    mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.repeat.set(Math.max(1, Math.round(w / 14)), Math.max(1, Math.round(d / 14)));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.06, z);
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  roadPlane(420, 14, 160, WORLD.boulevardZ);
  for (const ax of AVENUES) roadPlane(12, 330, ax, 155);
  for (const sz of STREETS) roadPlane(400, 11, 160, sz);

  // Boulevard markings: double yellow centreline, white dashed lanes.
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xd9b81c, roughness: 0.8 });
  for (const dz of [-0.35, 0.35]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(420, 0.18), yellowMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(160, 0.09, WORLD.boulevardZ + dz);
    group.add(line);
  }
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.8 });
  for (const dz of [-3.6, 3.6]) {
    for (let x = -46; x < 366; x += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.18), whiteMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.09, WORLD.boulevardZ + dz);
      group.add(dash);
    }
  }

  // Sidewalks along both sides of the boulevard.
  for (const zc of [206.5, 223.5]) {
    const walk = flatPlane(420, 3, 0xb9bcc2, { roughness: 0.95 });
    walk.position.set(160, 0.08, zc);
    group.add(walk);
  }

  // Buildings: four rows north of the boulevard.
  const facadeRng = rng.fork('buildings');
  for (const rowZ of BUILDING_ROWS) {
    const tallRow = rowZ === 146;
    for (let x = -34; x <= 360; x += 15) {
      let nearAvenue = false;
      for (const ax of AVENUES) if (Math.abs(x - ax) < 9) nearAvenue = true;
      if (nearAvenue) continue;
      if (facadeRng.chance(0.14)) continue;
      const w = facadeRng.range(10, 14);
      const d = facadeRng.range(9, 12);
      const h = tallRow ? facadeRng.range(10, 26) : facadeRng.range(8, 26);
      const color = facadeRng.pick(FACADE_COLORS);
      const facade = textures.facades[color];
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff, map: facade.map, emissiveMap: facade.emissive,
        emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.9,
      });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(x + facadeRng.range(-1.5, 1.5), h / 2, rowZ + facadeRng.range(-1, 1));
      b.castShadow = true;
      b.receiveShadow = true;
      group.add(b);
      // Roof furniture: AC box on ~70%, vent pipe on ~40%.
      if (facadeRng.chance(0.7)) {
        const ac = box(1.4, 0.8, 1.4, 0x9aa0a8, { castShadow: true });
        ac.position.set(b.position.x + facadeRng.range(-2, 2), h + 0.4, b.position.z + facadeRng.range(-2, 2));
        group.add(ac);
      }
      if (facadeRng.chance(0.4)) {
        const vent = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 1.6, 8),
          new THREE.MeshStandardMaterial({ color: 0x6a6e75, roughness: 0.7, metalness: 0.4 }),
        );
        vent.position.set(b.position.x + facadeRng.range(-3, 3), h + 0.8, b.position.z + facadeRng.range(-3, 3));
        vent.castShadow = true;
        group.add(vent);
      }
      // Shop signs on the boulevard row, facing the boulevard.
      if (rowZ === 198 && facadeRng.chance(0.4)) {
        const sign = facadeRng.pick(SHOP_SIGNS);
        const signMat = new THREE.MeshStandardMaterial({ map: textures.sign(sign.text, sign.bg, sign.fg), roughness: 0.8 });
        const board = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), signMat);
        board.position.set(b.position.x, Math.min(h - 1.2, 5.2), b.position.z + d / 2 + 0.06);
        group.add(board);
      }
    }
  }

  // Torre Lumen clock tower at (185, 128).
  const tower = new THREE.Group();
  tower.position.set(185, 0, 128);
  const shaft = box(10, 42, 10, 0xf2e3c6, { castShadow: true, receiveShadow: true });
  shaft.position.y = 21;
  tower.add(shaft);
  const cap = box(11, 2.4, 11, 0x8a6d4a, { castShadow: true });
  cap.position.y = 43.2;
  tower.add(cap);
  const clockMat = new THREE.MeshStandardMaterial({ map: textures.clock, roughness: 0.7 });
  for (const dz of [5.06, -5.06]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), clockMat);
    face.position.set(0, 36, dz);
    if (dz < 0) face.rotation.y = Math.PI;
    tower.add(face);
  }
  group.add(tower);

  // Lighthouse at the far east end of the beach.
  const light = new THREE.Group();
  light.position.set(345, 0, 252);
  const lhMat = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.8 });
  const lhTower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 22, 12), lhMat);
  lhTower.position.y = 11;
  lhTower.castShadow = true;
  light.add(lhTower);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(2.55, 2.75, 3, 12),
    new THREE.MeshStandardMaterial({ color: 0xc22a1e, roughness: 0.8 }),
  );
  band.position.y = 14;
  light.add(band);
  const lampRoom = box(3.4, 2.6, 3.4, 0x1c1e24, { castShadow: true });
  lampRoom.position.y = 23.2;
  light.add(lampRoom);
  const lampGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffe6a8, emissive: 0xffc861, emissiveIntensity: 2.2 }),
  );
  lampGlow.position.y = 23.2;
  light.add(lampGlow);
  const lampSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glowWarm, color: 0xffc861, transparent: true, opacity: 0.9, depthWrite: false,
  }));
  lampSprite.scale.set(7, 7, 1);
  lampSprite.position.y = 23.2;
  light.add(lampSprite);
  group.add(light);

  // Marina pier at the west end: wooden deck on posts, no shadows.
  const pier = new THREE.Group();
  pier.position.set(-18, 0, 256);
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x8a6d4a, roughness: 1 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(46, 0.5, 8), deckMat);
  deck.position.y = 1.1;
  pier.add(deck);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5d4630, roughness: 1 });
  for (let px = -21; px <= 21; px += 7) {
    for (const pz of [-3.4, 3.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.4, 8), postMat);
      post.position.set(px, 0.4, pz);
      pier.add(post);
    }
  }
  group.add(pier);

  // Palms along the boulevard, both sides, plus 10 scattered on the beach.
  const palmRng = rng.fork('palms');
  for (let x = -46; x <= 366; x += 17) {
    const north = makePalm(palmRng);
    north.position.set(x + palmRng.range(-1, 1), 0, 204.6);
    group.add(north);
    if (palmRng.chance(0.85)) {
      const south = makePalm(palmRng);
      south.position.set(x + palmRng.range(-1, 1), 0, 225.4);
      group.add(south);
    }
  }
  for (let i = 0; i < 10; i++) {
    const p = makePalm(palmRng);
    p.position.set(palmRng.range(-40, 360), 0, palmRng.range(228, 246));
    group.add(p);
  }

  // Street lamps along both boulevard sidewalks every 30 metres.
  for (let x = -40; x <= 360; x += 30) {
    for (const zc of [207.6, 222.4]) {
      const lamp = makeLamp(textures.glowWarm);
      lamp.position.set(x, 0, zc);
      group.add(lamp);
      lamps.push(lamp);
    }
  }

  // Beach umbrellas: 8, in red, blue, yellow and green.
  const umbrellaColors = [0xd23c2e, 0x2e6fd2, 0xe8c81c, 0x2fae4e];
  const umbrellaRng = rng.fork('umbrellas');
  for (let i = 0; i < 8; i++) {
    const um = new THREE.Group();
    const color = umbrellaColors[i % 4];
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6),
      new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.8 }),
    );
    pole.position.y = 1.3;
    um.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1.1, 10),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }),
    );
    top.position.y = 2.9;
    top.castShadow = true;
    um.add(top);
    um.position.set(umbrellaRng.range(-30, 350), 0, umbrellaRng.range(230, 244));
    group.add(um);
    umbrellas.push(um);
  }

  // Wet patches on the boulevard: dark glossy circles.
  const puddleRng = rng.fork('puddles');
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.15, metalness: 0.4 });
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(puddleRng.range(1.2, 2.6), 20), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(puddleRng.range(-40, 360), 0.1, puddleRng.range(209, 221));
    group.add(p);
  }

  scene.add(group);
  return { group, umbrellas, lamps, sandMat, tower };
}
