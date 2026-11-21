// LUMEN BAY — people. Blocky-but-readable figures with distinct clothes:
// Mara in orange, LCPD officers in white shirts + dark vests + caps,
// beachgoers in bright colours. Two-handed aim pose, a downed officer
// with a blood pool for the shootout shot, and ped wandering that can
// NEVER drift a sidewalk walker onto the road band.

import { WORLD } from './config.js';
import { makeRng, range, pick } from './random.js';

const SHIRTS = [0xff5a8a, 0x2ec4b6, 0x7a4a8a, 0xf2b705, 0x4a7c59, 0xe8e4da, 0xff7a1a, 0x2e6f8e];
const PANTS = [0x2a2d33, 0x3a3f4a, 0x5a4632, 0x1d2f52, 0x6b4a2f];
const SKINS = [0xf2c89b, 0xd9a06b, 0x8a5a3b, 0xe8b98a];

function part(THREE, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// A standing person, ~1.8 m tall. Returns a group whose userData holds
// the limbs so poses (aim, walk, downed) can move them.
export function makePerson(THREE, opts = {}) {
  const shirt = opts.shirt ?? 0x8a94a6;
  const pants = opts.pants ?? 0x2a2d33;
  const skin = opts.skin ?? 0xf2c89b;
  const hairC = opts.hair ?? 0x2a1a0e;
  const scale = opts.scale ?? 1;
  const g = new THREE.Group();
  g.name = opts.name || 'person';
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.9 });

  const legL = part(THREE, new THREE.BoxGeometry(0.22, 0.8, 0.24), pantsMat, -0.14, 0.4, 0);
  const legR = part(THREE, new THREE.BoxGeometry(0.22, 0.8, 0.24), pantsMat, 0.14, 0.4, 0);
  const torso = part(THREE, new THREE.BoxGeometry(0.62, 0.68, 0.34), shirtMat, 0, 1.14, 0);
  const armL = part(THREE, new THREE.BoxGeometry(0.16, 0.62, 0.18), shirtMat, -0.4, 1.12, 0);
  const armR = part(THREE, new THREE.BoxGeometry(0.16, 0.62, 0.18), shirtMat, 0.4, 1.12, 0);
  const handL = part(THREE, new THREE.BoxGeometry(0.15, 0.15, 0.15), skinMat, -0.4, 0.78, 0);
  const handR = part(THREE, new THREE.BoxGeometry(0.15, 0.15, 0.15), skinMat, 0.4, 0.78, 0);
  const head = part(THREE, new THREE.SphereGeometry(0.21, 12, 10), skinMat, 0, 1.66, 0);
  const hair = part(THREE, new THREE.SphereGeometry(0.22, 12, 10), hairMat, 0, 1.72, -0.03);
  hair.scale.set(1, 0.75, 1);
  g.add(legL, legR, torso, armL, armR, handL, handR, head, hair);

  if (opts.vest) {
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.7 });
    g.add(part(THREE, new THREE.BoxGeometry(0.66, 0.5, 0.4), vestMat, 0, 1.16, 0));
    g.add(part(THREE, new THREE.BoxGeometry(0.5, 0.1, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.4 }), 0, 1.28, 0));
  }
  if (opts.cap) {
    const capMat = new THREE.MeshStandardMaterial({ color: 0x1d2f52, roughness: 0.8 });
    g.add(part(THREE, new THREE.CylinderGeometry(0.23, 0.23, 0.09, 12), capMat, 0, 1.86, 0));
    g.add(part(THREE, new THREE.BoxGeometry(0.3, 0.04, 0.22), capMat, 0, 1.82, 0.2));
  }
  if (opts.hat) {
    const hatMat = new THREE.MeshStandardMaterial({ color: opts.hat, roughness: 0.9 });
    g.add(part(THREE, new THREE.CylinderGeometry(0.26, 0.28, 0.1, 12), hatMat, 0, 1.88, 0));
  }
  g.scale.setScalar(scale);
  g.userData = {
    kind: opts.kind || 'ped', legL, legR, torso, armL, armR, handL, handR, head,
    shirt, home: null, radius: 2, speed: 0.8, phase: 0, walkAmp: 0,
  };
  return g;
}

export function makeMara(THREE) {
  const mara = makePerson(THREE, {
    shirt: 0xff7a1a, pants: 0x2a2d33, skin: 0xf2c89b, hair: 0x3a2410,
    name: 'mara', kind: 'mara', scale: 1.05,
  });
  // Mara's dark jacket panels over the orange top.
  const jacket = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.85 });
  mara.add(part(THREE, new THREE.BoxGeometry(0.64, 0.3, 0.36), jacket, 0, 1.32, 0));
  return mara;
}

export function makeOfficer(THREE) {
  return makePerson(THREE, {
    shirt: 0xe8e4da, pants: 0x1d2f52, skin: 0xd9a06b, hair: 0x1a1a1a,
    name: 'officer', kind: 'officer', vest: true, cap: true,
  });
}

// Two-handed pistol aim: both arms forward, pistol (two-tone: silver
// slide, dark grip) in the hands, head over the sights.
export function poseAim(THREE, person, pistolScale = 1) {
  const u = person.userData;
  u.armL.rotation.x = -Math.PI / 2 + 0.12;
  u.armR.rotation.x = -Math.PI / 2 - 0.12;
  u.armL.position.set(-0.22, 1.32, 0.28);
  u.armR.position.set(0.22, 1.32, 0.28);
  u.handL.position.set(-0.1, 1.32, 0.62);
  u.handR.position.set(0.12, 1.32, 0.62);
  const slideMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.95, roughness: 0.25 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.6 });
  const pistol = new THREE.Group();
  pistol.name = 'pistol';
  const slide = part(THREE, new THREE.BoxGeometry(0.09, 0.11, 0.42), slideMat, 0, 0, 0.1);
  const grip = part(THREE, new THREE.BoxGeometry(0.08, 0.2, 0.12), gripMat, 0, -0.12, -0.06);
  grip.rotation.x = 0.25;
  const barrel = part(THREE, new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), slideMat, 0, 0, 0.34);
  barrel.rotation.x = Math.PI / 2;
  pistol.add(slide, grip, barrel);
  pistol.position.set(0.02, 1.34, 0.72);
  pistol.scale.setScalar(2.0 * pistolScale);
  person.add(pistol);
  person.userData.pistol = pistol;
  return pistol;
}

// Big orange/yellow 8-ray starburst muzzle flash + a point light,
// placed just past the muzzle tip.
export function makeFlash(THREE, flashTex) {
  const flash = new THREE.Group();
  flash.name = 'flash';
  const mat = new THREE.SpriteMaterial({
    map: flashTex, color: 0xffd76a, transparent: true, opacity: 0.95, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.2, 2.2, 1);
  flash.add(sprite);
  const light = new THREE.PointLight(0xffc860, 60, 9, 1.8);
  flash.add(light);
  flash.visible = false;
  flash.userData = { sprite, light, t: 0 };
  return flash;
}

// One downed police officer, lying flat as a STATIC prop (never in the
// enemies array), with a big dark-red blood pool + droplets around him.
export function makeDownedCop(THREE) {
  const wrap = new THREE.Group();
  wrap.name = 'downed-cop';
  const cop = makeOfficer(THREE);
  cop.rotation.x = -Math.PI / 2; // lie flat, head toward -z of the wrap
  cop.position.y = 0.28;
  // Tuck the arms in so nothing floats.
  cop.userData.armL.rotation.x = 0.3;
  cop.userData.armR.rotation.x = -0.3;
  wrap.add(cop);
  const bloodMat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
  const bloodDark = new THREE.MeshBasicMaterial({ color: 0x6e0000 });
  const pool = new THREE.Group();
  pool.name = 'blood';
  const blobs = [
    [0, 0, 1.15, bloodMat], [0.5, 0.3, 0.8, bloodDark], [-0.5, -0.2, 0.75, bloodMat],
    [0.2, 0.7, 0.6, bloodDark], [-0.3, 0.6, 0.5, bloodMat], [0.9, -0.4, 0.45, bloodDark],
  ];
  for (const [bx, bz, r, m] of blobs) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 14), m);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(bx, 0.09 + Math.random() * 0.03, bz);
    pool.add(disc);
  }
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const drop = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), bloodDark);
    drop.rotation.x = -Math.PI / 2;
    drop.position.set(Math.cos(a) * 1.5, 0.1, Math.sin(a) * 1.5 + 0.2);
    pool.add(drop);
  }
  wrap.add(pool);
  wrap.userData = { cop, pool };
  return wrap;
}

// Pedestrian manager: spawn groups, wander with hard clamps, flee.
// THE ROAD RULE: a ped whose home is outside the road band (z 208-222)
// can never enter it — the wander clamp is applied on the home side.
// Shot mode freezes wandering entirely (walk-in-place bob only).
export function createPedSystem(THREE, scene) {
  const rng = makeRng(4242);
  const peds = [];
  const ROAD_LO = WORLD.roadBandLo, ROAD_HI = WORLD.roadBandHi;

  function clampToHomeSide(p, x, z) {
    const home = p.userData.home;
    const r = p.userData.radius;
    let nx = Math.max(home.x - r, Math.min(home.x + r, x));
    let nz = Math.max(home.z - r, Math.min(home.z + r, z));
    if (home.z < ROAD_LO) nz = Math.min(nz, ROAD_LO - 1);
    else if (home.z > ROAD_HI) nz = Math.max(nz, ROAD_HI + 1);
    else nz = Math.max(ROAD_LO, Math.min(ROAD_HI, nz));
    return [nx, nz];
  }

  function spawnPed(x, z, opts = {}) {
    const person = makePerson(THREE, {
      shirt: pick(rng, SHIRTS), pants: pick(rng, PANTS), skin: pick(rng, SKINS),
      hair: pick(rng, [0x2a1a0e, 0x1a1a1a, 0x6b4a2f, 0x8a8a8a]),
      hat: opts.hat ? pick(rng, [0xf2b705, 0x2ec4b6, 0xe8e4da]) : undefined,
      scale: range(rng, 0.95, 1.08), kind: 'ped',
    });
    person.position.set(x, 0, z);
    person.rotation.y = range(rng, 0, Math.PI * 2);
    person.userData.home = { x, z };
    person.userData.radius = opts.radius ?? 2.5;
    person.userData.speed = range(rng, 0.5, 1.1);
    person.userData.phase = rng() * Math.PI * 2;
    person.userData.heading = range(rng, 0, Math.PI * 2);
    scene.add(person);
    peds.push(person);
    return person;
  }

  function spawnPedsNear(cx, cz, count, opts = {}) {
    const made = [];
    for (let i = 0; i < count; i += 1) {
      const x = cx + range(rng, -4, 4);
      const z = cz + range(rng, -1.5, 1.5);
      made.push(spawnPed(x, z, opts));
    }
    return made;
  }

  // Remove every ped whose CURRENT position is inside the road band.
  // Used after staging: it can never touch the right-sidewalk group
  // (z 225-228) because the band ends at 222.
  function clearRoadPeds() {
    for (let i = peds.length - 1; i >= 0; i -= 1) {
      const p = peds[i];
      if (p.position.z > ROAD_LO && p.position.z < ROAD_HI) {
        scene.remove(p);
        peds.splice(i, 1);
      }
    }
  }

  function clearPedsNear(cx, cz, radius) {
    for (let i = peds.length - 1; i >= 0; i -= 1) {
      const p = peds[i];
      const dx = p.position.x - cx, dz = p.position.z - cz;
      if (dx * dx + dz * dz < radius * radius) {
        scene.remove(p);
        peds.splice(i, 1);
      }
    }
  }

  function update(dt, t, frozen, fleeFrom) {
    for (const p of peds) {
      const u = p.userData;
      if (fleeFrom && Math.hypot(p.position.x - fleeFrom.x, p.position.z - fleeFrom.z) < 14) {
        const dx = p.position.x - fleeFrom.x, dz = p.position.z - fleeFrom.z;
        const d = Math.hypot(dx, dz) || 1;
        const [nx, nz] = clampToHomeSide(p, p.position.x + (dx / d) * u.speed * 2.4 * dt,
          p.position.z + (dz / d) * u.speed * 2.4 * dt);
        p.position.x = nx; p.position.z = nz;
        p.rotation.y = Math.atan2(dx, dz);
      } else if (!frozen) {
        u.heading += (rng() - 0.5) * 1.4 * dt;
        const nx = p.position.x + Math.sin(u.heading) * u.speed * dt;
        const nz = p.position.z + Math.cos(u.heading) * u.speed * dt;
        const [cx, cz] = clampToHomeSide(p, nx, nz);
        p.position.x = cx; p.position.z = cz;
        p.rotation.y = u.heading;
      }
      // Walk bob: legs swing, body bobs — reads as walking even frozen.
      u.phase += dt * (frozen ? 2.2 : 6) * (frozen ? 0.4 : 1);
      const swing = Math.sin(u.phase) * 0.45;
      u.legL.rotation.x = swing;
      u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.7;
      u.armR.rotation.x = swing * 0.7;
      p.position.y = Math.abs(Math.sin(u.phase)) * 0.05;
    }
  }

  return { peds, spawnPed, spawnPedsNear, clearRoadPeds, clearPedsNear, update };
}
