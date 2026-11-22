// LUMEN BAY — people.js
// Stylised blocky figures built from boxes so they read at screenshot
// size: Mara, LCPD officers, pedestrians, the downed officer and the
// cash burst. Guns carry a muzzle flash at the tip, hidden until fired.

import * as THREE from 'three';

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
}

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

// A gun with a muzzle flash at its tip: an 8-ray yellow starburst plus
// a white core plus a glow sprite. Hidden until fired.
export function makeGun(kind, textures, scale = 1) {
  const gun = new THREE.Group();
  gun.name = 'gun';
  const silver = std(0xc8ccd4, { roughness: 0.25, metalness: 0.85 });
  const dark = std(0x1c1e24, { roughness: 0.7 });
  if (kind === 'smg') {
    const body = box(0.09, 0.12, 0.62, silver);
    gun.add(body);
    const grip = box(0.08, 0.2, 0.1, dark);
    grip.position.set(0, -0.14, -0.12);
    gun.add(grip);
    const frontGrip = box(0.07, 0.16, 0.08, dark);
    frontGrip.position.set(0, -0.12, 0.2);
    gun.add(frontGrip);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.38);
    gun.add(barrel);
  } else {
    const slide = box(0.09, 0.1, 0.34, silver);
    gun.add(slide);
    const grip = box(0.08, 0.2, 0.1, dark);
    grip.position.set(0, -0.14, -0.1);
    gun.add(grip);
  }
  // Muzzle flash at the tip (+z end).
  const flash = new THREE.Group();
  flash.name = 'muzzle-flash';
  const tipZ = kind === 'smg' ? 0.48 : 0.22;
  const rayMat = std(0xffd21c, { emissive: 0xffc800, emissiveIntensity: 2.2 });
  for (let i = 0; i < 8; i++) {
    const ray = box(0.02, 0.34, 0.02, rayMat);
    ray.position.z = tipZ;
    ray.rotation.z = (i / 8) * Math.PI;
    flash.add(ray);
  }
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 2.5 }),
  );
  core.position.z = tipZ;
  flash.add(core);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glowHeadlight, color: 0xffd21c, transparent: true,
    opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  glow.scale.set(0.9, 0.9, 1);
  glow.position.z = tipZ;
  flash.add(glow);
  flash.visible = false;
  flash.position.z = 0;
  gun.add(flash);
  gun.userData.flash = flash;
  gun.scale.setScalar(scale);
  return gun;
}

// A standing person: two legs, torso, two arms, head with a hair cap,
// optional navy cap or white helmet, optional gun.
export function makePerson(opts = {}) {
  const {
    shirt = 0xff5a8a, trousers = 0x1c1e24, skin = 0xe8b98a,
    scale = 1, cap = false, helmet = false, gun = null, aim = false,
  } = opts;
  const person = new THREE.Group();
  person.name = 'person';
  const shirtMat = std(shirt);
  const trouserMat = std(trousers);
  const skinMat = std(skin);
  for (const sx of [-1, 1]) {
    const leg = box(0.16, 0.7, 0.18, trouserMat);
    leg.position.set(sx * 0.11, 0.35, 0);
    person.add(leg);
  }
  const torso = box(0.5, 0.62, 0.28, shirtMat);
  torso.position.y = 1.0;
  person.add(torso);
  const head = box(0.3, 0.3, 0.3, skinMat);
  head.position.y = 1.48;
  person.add(head);
  const hair = box(0.32, 0.12, 0.32, std(0x1c1410));
  hair.position.y = 1.66;
  person.add(hair);
  if (cap) {
    const capTop = box(0.34, 0.08, 0.34, std(0x1d2a5e));
    capTop.position.y = 1.68;
    person.add(capTop);
    const brim = box(0.34, 0.04, 0.16, std(0x1d2a5e));
    brim.position.set(0, 1.64, 0.2);
    person.add(brim);
  }
  if (helmet) {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), std(0xf2f2ee, { roughness: 0.35 }));
    helm.position.y = 1.56;
    helm.castShadow = true;
    person.add(helm);
  }
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = box(0.12, 0.55, 0.14, shirtMat);
    if (aim) {
      arm.position.set(sx * 0.16, 1.15, 0.28);
      arm.rotation.x = -Math.PI / 2 + 0.15;
    } else {
      arm.position.set(sx * 0.32, 1.0, 0);
    }
    person.add(arm);
    arms.push(arm);
  }
  if (gun) {
    gun.position.set(0, 1.15, 0.45);
    person.add(gun);
  }
  person.userData.arms = arms;
  person.scale.setScalar(scale);
  return person;
}

// Mara Solis: orange jacket, dark trousers, two-handed aim pose, chunky
// silver pistol at scale 2.0 so it reads at 9 metres.
export function makeMara(textures) {
  const gun = makeGun('pistol', textures, 2.0);
  const mara = makePerson({
    shirt: 0xff7a1a, trousers: 0x1c1e24, scale: 1.3, gun, aim: true,
  });
  mara.name = 'mara';
  return mara;
}

// An LCPD officer: white shirt, dark vest, navy trousers, navy cap,
// aim pose, pistol at normal scale.
export function makeOfficer(textures) {
  const gun = makeGun('pistol', textures, 1);
  const officer = makePerson({
    shirt: 0xf2f2ee, trousers: 0x1d2a5e, scale: 1.25, cap: true, gun, aim: true,
  });
  officer.name = 'officer';
  const vest = box(0.52, 0.4, 0.3, std(0x14161c));
  vest.position.y = 1.02;
  officer.add(vest);
  return officer;
}

// One downed police officer, lying flat: a static prop, never a live
// enemy. Head toward the cordon, pistol hidden, blood pool of five
// overlapping dark-red flat circles and six radiating droplets.
export function makeDownedOfficer() {
  const downed = new THREE.Group();
  downed.name = 'downed-officer';
  const body = new THREE.Group();
  body.rotation.x = -Math.PI / 2;
  body.position.y = 0.22;
  const shirtMat = std(0xf2f2ee);
  const trouserMat = std(0x1d2a5e);
  const skinMat = std(0xe8b98a);
  const torso = box(0.5, 0.62, 0.28, shirtMat);
  torso.position.y = 0.4;
  body.add(torso);
  const vest = box(0.52, 0.4, 0.3, std(0x14161c));
  vest.position.y = 0.4;
  body.add(vest);
  for (const sx of [-1, 1]) {
    const leg = box(0.16, 0.7, 0.18, trouserMat);
    leg.position.set(sx * 0.11, -0.45, 0);
    body.add(leg);
    const arm = box(0.12, 0.55, 0.14, shirtMat);
    arm.position.set(sx * 0.32, 0.35, 0);
    body.add(arm);
  }
  const head = box(0.3, 0.3, 0.3, skinMat);
  head.position.y = 0.9;
  body.add(head);
  const capTop = box(0.34, 0.08, 0.34, std(0x1d2a5e));
  capTop.position.y = 1.06;
  body.add(capTop);
  downed.add(body);
  // Blood pool: five overlapping dark-red flat circles + six droplets.
  // Kept above the sand plane (y 0.03) so nothing z-fights with it.
  const bloodMat = std(0x6e0d0d, { roughness: 0.4 });
  const poolSpots = [
    [0, 0, 1.1], [0.5, 0, 0.5], [-0.5, 0, 0.6], [0.3, 0, -0.4], [-0.4, 0, -0.2],
  ];
  for (const [px, py, pz] of poolSpots) {
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), bloodMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(px, 0.06, pz);
    downed.add(spot);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const drop = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), bloodMat);
    drop.rotation.x = -Math.PI / 2;
    drop.position.set(Math.cos(a) * 1.5, 0.065, Math.sin(a) * 1.5);
    downed.add(drop);
  }
  return downed;
}

// Cash burst: small green bill planes flying in a ring, tilted at
// varied angles.
export function makeCashBurst(n, rng) {
  const burst = new THREE.Group();
  burst.name = 'cash-burst';
  const billMat = std(0x2fae4e, { roughness: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < n; i++) {
    const bill = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.28), billMat);
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const r = rng.range(0.5, 4.5);
    bill.position.set(Math.cos(a) * r, rng.range(0.8, 4.2), Math.sin(a) * r);
    bill.rotation.set(rng.range(-1.2, 1.2), rng.range(0, Math.PI * 2), rng.range(-1.2, 1.2));
    burst.add(bill);
  }
  return burst;
}
