// LUMEN BAY — people: Mara, LCPD officers, pedestrians, the downed cop.
// Stylised blocky figures with distinct clothes and colours, built from
// boxes so they read at screenshot size. Pedestrians flee gunfire.
import * as THREE from 'three';
import { glowTexture } from './textures.js';

function part(parent, geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const skinMat = (c = 0xd9a066) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });

// A standing person. opts: shirt, pants, skin, hat ('cap'|'helmet'|null),
// scale, aim (two-handed pistol pose), gun (pistol | smg | null).
export function makePerson(opts = {}) {
  const {
    shirt = 0x3a6ea5, pants = 0x2a2a30, skin = 0xd9a066,
    hat = null, scale = 1, aim = false, gun = null,
  } = opts;
  const g = new THREE.Group();
  g.name = 'person';
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  // legs
  part(g, B(0.2, 0.75, 0.22), pantsMat, -0.13, 0.38, 0);
  part(g, B(0.2, 0.75, 0.22), pantsMat, 0.13, 0.38, 0);
  // torso
  part(g, B(0.55, 0.62, 0.3), shirtMat, 0, 1.06, 0);
  // arms
  if (aim) {
    // two-handed aim: both arms extended forward together
    part(g, B(0.16, 0.16, 0.55), shirtMat, -0.1, 1.22, 0.32, -0.35);
    part(g, B(0.16, 0.16, 0.55), skinMat(skin), 0.1, 1.22, 0.32, -0.35);
  } else {
    part(g, B(0.16, 0.6, 0.18), shirtMat, -0.36, 1.05, 0);
    part(g, B(0.16, 0.6, 0.18), shirtMat, 0.36, 1.05, 0);
  }
  // head + hair
  part(g, B(0.34, 0.34, 0.32), skinMat(skin), 0, 1.56, 0);
  part(g, B(0.36, 0.12, 0.34), new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.95 }), 0, 1.76, 0);
  if (hat === 'cap') {
    part(g, B(0.38, 0.1, 0.36), new THREE.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.8 }), 0, 1.78, 0);
    part(g, B(0.38, 0.04, 0.16), new THREE.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.8 }), 0, 1.74, 0.24);
  } else if (hat === 'helmet') {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.3, roughness: 0.35 }));
    helm.position.set(0, 1.58, 0); g.add(helm);
  }
  if (gun) g.add(makeGun(gun, aim ? 2.0 : 1.0));
  g.scale.setScalar(scale);
  g.userData.isPerson = true;
  return g;
}

// A two-tone pistol (silver slide, near-black grip) or an SMG.
// scale 2.0 is Mara's shot-2 pistol: chunky enough to read at 9 m.
export function makeGun(kind, scale = 1) {
  const g = new THREE.Group();
  g.name = 'gun';
  const silver = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.95, roughness: 0.25 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.7 });
  if (kind === 'smg') {
    part(g, B(0.09, 0.12, 0.62), silver, 0, 0, 0.1);
    part(g, B(0.08, 0.3, 0.1), gripMat, 0, -0.18, -0.05);
    part(g, B(0.07, 0.07, 0.3), gripMat, 0, -0.02, 0.45);
  } else {
    part(g, B(0.09, 0.11, 0.34), silver, 0, 0, 0.08); // slide + barrel
    part(g, B(0.08, 0.24, 0.1), gripMat, 0, -0.15, -0.06); // grip
  }
  // muzzle flash: small 8-ray yellow starburst + glow sprite, at the muzzle tip
  const flash = new THREE.Group();
  flash.name = 'muzzleFlash';
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.09), flashMat);
    ray.rotation.z = (i / 4) * Math.PI;
    flash.add(ray);
  }
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.11, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }));
  flash.add(core);
  const glowTex = glowTexture('rgba(255,225,77,0.95)', 'rgba(255,225,77,0)');
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }));
  spr.scale.setScalar(1.1); flash.add(spr);
  flash.position.set(0, 0, kind === 'smg' ? 0.62 : 0.5);
  g.add(flash);
  g.userData.flash = flash;
  g.scale.setScalar(scale);
  return g;
}

// Mara Solis, the protagonist: orange jacket, dark hair, pistol, aim pose.
export function makeMara() {
  const g = makePerson({
    shirt: 0xff7a1a, pants: 0x22262e, skin: 0xd9a066, scale: 1.3, aim: true, gun: 'pistol',
  });
  g.name = 'mara';
  // hold the pistol in both hands, forward
  const gun = g.children.find((c) => c.name === 'gun');
  if (gun) gun.position.set(0.02, 1.24, 0.62);
  return g;
}

// An LCPD officer: white shirt, dark vest, navy cap, pistol.
export function makeOfficer() {
  const g = makePerson({
    shirt: 0xf2f2f2, pants: 0x1c2a4a, skin: 0xd9a066, hat: 'cap', aim: true, gun: 'pistol',
  });
  // dark vest over the white shirt
  part(g, B(0.58, 0.4, 0.34), new THREE.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.85 }), 0, 1.1, 0);
  const gun = g.children.find((c) => c.name === 'gun');
  if (gun) { gun.position.set(0.02, 1.24, 0.6); gun.scale.setScalar(1.0); } // cordon flash stays small; only Mara's is the big hero starburst
  g.name = 'officer';
  return g;
}

// ONE downed police officer, lying flat — a static prop, never a live enemy.
// Head west toward the cordon, pistol hidden (it would float when flat).
// Blood: 5 overlapping dark-red flat circles + 6 radiating droplets.
export function makeDownedCop() {
  const g = new THREE.Group();
  g.name = 'downedCop';
  const body = makePerson({ shirt: 0xf2f2f2, pants: 0x1c2a4a, hat: 'cap' });
  part(body, B(0.58, 0.4, 0.34), new THREE.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.85 }), 0, 1.1, 0);
  body.rotation.x = -Math.PI / 2; // lie flat, head toward -z after the group yaw
  body.position.y = 0.22;
  g.add(body);
  const bloodMat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
  const bloodMat2 = new THREE.MeshBasicMaterial({ color: 0x6e0000 });
  // fixed y steps (0.09..0.12) so nothing z-fights; no Math.random here —
  // the blood must land in the exact same place on every render
  const pool = (x, z, r, m, y) => {
    const c = new THREE.Mesh(new THREE.CircleGeometry(r, 14), m);
    c.rotation.x = -Math.PI / 2; c.position.set(x, y, z);
    g.add(c);
  };
  // pool around the torso/head
  pool(0, 0.1, 0.85, bloodMat, 0.09);
  pool(0.35, -0.25, 0.55, bloodMat2, 0.10);
  pool(-0.3, 0.45, 0.5, bloodMat, 0.11);
  pool(0.1, 0.75, 0.42, bloodMat2, 0.10);
  pool(-0.45, -0.5, 0.36, bloodMat, 0.12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    pool(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0.12, i % 2 ? bloodMat : bloodMat2, 0.09 + i * 0.004);
  }
  return g;
}

// Cash burst: green bills flying (shot 2) / a loot pile.
export function makeCashBurst(n = 24) {
  const g = new THREE.Group();
  g.name = 'cashBurst';
  const billMat = new THREE.MeshBasicMaterial({ color: 0x3fae5a, side: THREE.DoubleSide });
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), billMat);
    const a = (i / n) * Math.PI * 2;
    b.position.set(Math.cos(a) * (0.4 + (i % 5) * 0.4), 0.8 + (i % 7) * 0.45, Math.sin(a) * (0.4 + (i % 4) * 0.35));
    b.rotation.set(a, a * 2, a * 0.7);
    g.add(b);
  }
  return g;
}
