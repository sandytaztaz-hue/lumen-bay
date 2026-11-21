// LUMEN BAY — vehicles: the Ferrari hero car, LCPD cruisers, traffic,
// police bikes, the helicopter and the speedboat.
// Local space: +z is the nose, y is up, x is across. The hero car is built
// to the Ferrari spec: rosso corsa red, one sloped hood, dark-glass cabin
// with a thin red roof rail, shield emblem, visible driver, big rectangular
// headlights — no bubbles, no dome, no stacked boxes on the nose.
import * as THREE from 'three';
import { CARS } from './config.js';
import { glowTexture } from './textures.js';

const paint = (color) => new THREE.MeshStandardMaterial({
  color, metalness: 0.85, roughness: 0.28,
});
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x0c1218, metalness: 0.9, roughness: 0.12,
});
const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.4, roughness: 0.5 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 1, roughness: 0.15 });

function part(parent, geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// --- wheels -------------------------------------------------------------------
function makeWheel(scale = 1) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14),
    new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.9 }));
  tyre.rotation.z = Math.PI / 2; tyre.castShadow = true; g.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a2e33, metalness: 0.9, roughness: 0.3 }));
  hub.rotation.z = Math.PI / 2; g.add(hub);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 16), chromeMat);
  ring.rotation.y = Math.PI / 2; ring.position.x = 0.16; g.add(ring);
  const ring2 = ring.clone(); ring2.position.x = -0.16; g.add(ring2);
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xd2001a, roughness: 0.4 }));
  caliper.position.set(0, 0.1, 0.3); g.add(caliper);
  g.scale.setScalar(scale);
  return g;
}

// --- the hero car: Veloz Comet RS (Ferrari) ------------------------------------
export function makeComet() {
  const car = new THREE.Group();
  car.name = 'comet';
  const red = paint(CARS.comet.colour);
  // lower metalness + warm emissive so the rosso corsa body still reads red
  // at night and at dawn (a bare metalness-0.85 paint with no env map goes black)
  red.metalness = 0.45; red.roughness = 0.35;
  red.emissive = new THREE.Color(0x3a0600);
  const glass = glassMat.clone();
  // semi-transparent windshield glass so the driver reads through it
  const windGlass = glass.clone();
  windGlass.transparent = true; windGlass.opacity = 0.55;

  // one clean low slab: 2.1 wide, 0.49 tall, 5.1 long
  const body = part(car, B(2.1, 0.85, 4.4), red, 0, 0.52, 0);
  body.scale.set(1.0, 0.58, 1.16);

  // ONE long raked hood panel, windshield base to nose tip
  part(car, B(1.8, 0.06, 2.2), red, 0, 0.85, 1.45, 0.20);
  // subtle centre ridge down the hood, same red
  part(car, B(0.08, 0.03, 2.0), red, 0, 0.89, 1.45, 0.20);

  // front face: wide low dark grille + splitter lip
  part(car, B(1.9, 0.2, 0.08), darkMat, 0, 0.52, 2.62);
  part(car, B(1.9, 0.08, 0.35), darkMat, 0, 0.16, 2.5);
  // big detailed rectangular headlights: dark surround + bright lens
  for (const sx of [-1, 1]) {
    part(car, B(0.62, 0.28, 0.05), darkMat, sx * 0.68, 0.66, 2.62);
    part(car, B(0.55, 0.22, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff2b0, emissiveIntensity: 2.4 }),
      sx * 0.68, 0.66, 2.64);
  }
  // Ferrari shield on the nose: yellow plate + green top strip, on the hood rake
  part(car, B(0.18, 0.22, 0.03), new THREE.MeshStandardMaterial({ color: 0xffd23e, roughness: 0.4 }), 0, 0.92, 1.9, 0.20);
  part(car, B(0.18, 0.05, 0.032), new THREE.MeshStandardMaterial({ color: 0x0a7a2e, roughness: 0.4 }), 0, 1.0, 1.86, 0.20);

  // cabin: LOW dark glass + THIN red roof rail
  part(car, B(1.5, 0.38, 1.7), glass, 0, 1.0, -0.35);
  part(car, B(1.5, 0.6, 0.06), windGlass, 0, 1.0, 0.62, -0.55);
  part(car, B(1.5, 0.55, 0.06), glass, 0, 1.02, -1.28, 0.5);
  part(car, B(1.5, 0.05, 1.55), red, 0, 1.21, -0.35);
  // glare strip on the windshield
  part(car, B(1.1, 0.05, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7 }),
    0, 1.18, 0.58, -0.55);

  // driver, visible through the windshield: orange jacket, bright warm face
  const driver = new THREE.Group();
  part(driver, B(0.42, 0.42, 0.24), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.8 }), 0, 0.85, -0.3);
  const dHead = part(driver, B(0.26, 0.26, 0.26),
    new THREE.MeshStandardMaterial({ color: 0xf2c89a, roughness: 0.7 }), 0, 1.06, -0.3);
  dHead.castShadow = false;
  part(driver, B(0.28, 0.1, 0.28), new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.9 }), 0, 1.2, -0.3);
  // arms to the wheel
  part(driver, B(0.12, 0.12, 0.4), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.8 }), -0.2, 0.92, -0.05);
  part(driver, B(0.12, 0.12, 0.4), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.8 }), 0.2, 0.92, -0.05);
  car.add(driver);

  // rear: raked decklid + twin ridges, spoiler, tail panel, twin clusters
  part(car, B(1.8, 0.06, 1.1), red, 0, 0.82, -1.85, -0.18);
  part(car, B(0.07, 0.04, 1.0), red, -0.5, 0.86, -1.85, -0.18);
  part(car, B(0.07, 0.04, 1.0), red, 0.5, 0.86, -1.85, -0.18);
  part(car, B(1.9, 0.05, 0.35), darkMat, 0, 1.02, -2.3); // spoiler blade
  part(car, B(0.06, 0.22, 0.3), darkMat, -0.8, 0.9, -2.3); // struts
  part(car, B(0.06, 0.22, 0.3), darkMat, 0.8, 0.9, -2.3);
  part(car, B(0.05, 0.3, 0.35), darkMat, -0.95, 0.95, -2.3); // endplates
  part(car, B(0.05, 0.3, 0.35), darkMat, 0.95, 0.95, -2.3);
  part(car, B(1.9, 0.22, 0.06), darkMat, 0, 0.62, -2.56); // tail panel
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xd21000, emissiveIntensity: 1.8 });
  for (const sx of [-1, 1]) {
    part(car, B(0.5, 0.14, 0.05), tailMat, sx * 0.62, 0.64, -2.58);
  }
  // diffuser + twin pipes
  part(car, B(1.7, 0.12, 0.3), darkMat, 0, 0.2, -2.5);
  for (const sx of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.25, 8), chromeMat);
    pipe.rotation.x = Math.PI / 2; pipe.position.set(sx * 0.45, 0.3, -2.58); car.add(pipe);
  }
  // side skirts + air-intake scoops + mirrors + door lines
  for (const sx of [-1, 1]) {
    part(car, B(0.1, 0.14, 2.6), darkMat, sx * 1.02, 0.3, -0.2);
    part(car, B(0.08, 0.3, 0.7), darkMat, sx * 1.04, 0.62, -0.6);
    part(car, B(0.16, 0.1, 0.08), red, sx * 1.08, 0.95, 0.35);
    part(car, B(0.04, 0.02, 1.6), darkMat, sx * 1.06, 0.62, 0.2);
  }
  // front plate, moved clear of the grille
  part(car, B(0.5, 0.14, 0.03), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }), 0, 0.30, 2.60);

  // headlight glow sprites
  const glowTex = glowTexture('rgba(255,246,200,1)', 'rgba(255,246,200,0)');
  for (const sx of [-1, 1]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }));
    s.position.set(sx * 0.68, 0.66, 2.75); s.scale.setScalar(2.2); car.add(s);
  }
  // tail glow sprites: small, tight to the lamps (a big soft sprite reads
  // as a red smear over the road behind the car)
  const tailGlow = glowTexture('rgba(255,60,40,0.55)', 'rgba(255,60,40,0)');
  for (const sx of [-1, 1]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tailGlow, transparent: true, depthWrite: false }));
    s.position.set(sx * 0.62, 0.64, -2.7); s.scale.setScalar(0.85); car.add(s);
  }

  // big wheels, hero 1.12x
  car.userData.wheels = [];
  for (const [wx, wz] of [[-1, 1.45], [1, 1.45], [-1, -1.45], [1, -1.45]]) {
    const w = makeWheel(1.12);
    w.position.set(wx, 0.42, wz);
    car.add(w); car.userData.wheels.push(w);
  }
  car.scale.setScalar(1.35);
  return car;
}

// --- LCPD cruiser: classic boxy sedan, black-dominant, white doors/roof -----
export function makePolice() {
  const car = new THREE.Group();
  car.name = 'police';
  const black = paint(0x14161c);
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.4, roughness: 0.4 });
  part(car, B(1.9, 0.7, 4.4), black, 0, 0.55, 0);
  part(car, B(1.7, 0.55, 2.1), black, 0, 1.15, -0.2);
  part(car, B(1.72, 0.06, 2.0), white, 0, 1.44, -0.2); // white roof
  for (const sx of [-1, 1]) part(car, B(0.04, 0.4, 1.9), white, sx * 0.96, 0.6, 0.1); // white doors
  part(car, B(1.9, 0.12, 0.15), chromeMat, 0, 0.3, 2.24); // chrome bumpers
  part(car, B(1.9, 0.12, 0.15), chromeMat, 0, 0.3, -2.24);
  part(car, B(1.6, 0.18, 0.06), darkMat, 0, 0.55, 2.22); // grille
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff2b0, emissiveIntensity: 2.2 }));
    hl.rotation.x = Math.PI / 2; hl.position.set(sx * 0.62, 0.62, 2.24); car.add(hl);
    part(car, B(0.4, 0.12, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xd21000, emissiveIntensity: 1.6 }),
      sx * 0.62, 0.62, -2.24);
  }
  // lightbar: big, bright red/blue + glow
  part(car, B(1.1, 0.12, 0.3), darkMat, 0, 1.52, -0.2);
  part(car, B(0.5, 0.14, 0.32), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 3 }), -0.28, 1.56, -0.2);
  part(car, B(0.5, 0.14, 0.32), new THREE.MeshStandardMaterial({ color: 0x2040ff, emissive: 0x1030ff, emissiveIntensity: 3 }), 0.28, 1.56, -0.2);
  const glowTex = glowTexture('rgba(255,80,80,0.85)', 'rgba(255,80,80,0)');
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }));
  s.position.set(0, 1.7, -0.2); s.scale.setScalar(3.2); car.add(s);
  // windshield + side glass
  part(car, B(1.6, 0.5, 0.06), glassMat, 0, 1.12, 0.86, -0.28);
  car.userData.wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = makeWheel(0.95);
    w.position.set(wx, 0.4, wz);
    car.add(w); car.userData.wheels.push(w);
  }
  car.scale.setScalar(1.15);
  return car;
}

// --- traffic: classic sedans in city colours ----------------------------------
export function makeTraffic(color) {
  const car = new THREE.Group();
  car.name = 'traffic';
  const bodyMat = paint(color);
  part(car, B(1.85, 0.65, 4.2), bodyMat, 0, 0.55, 0);
  part(car, B(1.6, 0.5, 2.0), bodyMat, 0, 1.1, -0.2);
  part(car, B(1.5, 0.42, 0.06), glassMat, 0, 1.08, 0.82, -0.28);
  part(car, B(1.85, 0.1, 0.12), chromeMat, 0, 0.3, 2.14);
  part(car, B(1.85, 0.1, 0.12), chromeMat, 0, 0.3, -2.14);
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffeeb0, emissiveIntensity: 1.2 }));
    hl.rotation.x = Math.PI / 2; hl.position.set(sx * 0.6, 0.6, 2.14); car.add(hl);
  }
  car.userData.wheels = [];
  for (const [wx, wz] of [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]]) {
    const w = makeWheel(0.9);
    w.position.set(wx, 0.38, wz);
    car.add(w); car.userData.wheels.push(w);
  }
  car.scale.setScalar(1.1);
  return car;
}

// --- police bike + rider --------------------------------------------------------
export function makeBike() {
  const g = new THREE.Group();
  g.name = 'bike';
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.5, roughness: 0.35 });
  part(g, B(0.5, 0.4, 1.9), white, 0, 0.62, 0);
  part(g, B(0.34, 0.3, 0.5), darkMat, 0, 0.95, -0.45);
  for (const wz of [0.75, -0.75]) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 8, 14),
      new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.9 }));
    tyre.position.set(0, 0.34, wz); tyre.castShadow = true; g.add(tyre);
  }
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff2b0, emissiveIntensity: 2 }));
  hl.position.set(0, 0.72, 0.98); g.add(hl);
  // rider: navy uniform, white helmet
  const rider = new THREE.Group();
  part(rider, B(0.42, 0.5, 0.26), new THREE.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.8 }), 0, 1.15, -0.15);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), white);
  helm.position.set(0, 1.52, -0.15); rider.add(helm);
  part(rider, B(0.12, 0.12, 0.45), new THREE.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.8 }), -0.24, 1.2, 0.2);
  part(rider, B(0.12, 0.12, 0.45), new THREE.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.8 }), 0.24, 1.2, 0.2);
  g.add(rider);
  return g;
}

// --- LCPD helicopter AIR-1 ------------------------------------------------------
export function makeHeli() {
  const g = new THREE.Group();
  g.name = 'heli';
  const navy = new THREE.MeshStandardMaterial({ color: 0x1c2a4a, metalness: 0.6, roughness: 0.4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.4, roughness: 0.4 });
  const fus = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), navy);
  fus.scale.set(1.1, 0.85, 1.7); fus.castShadow = true; g.add(fus);
  part(g, B(1.9, 0.5, 2.4), white, 0, -0.9, 0.2); // white belly
  part(g, B(1.4, 0.9, 0.9), glassMat, 0, 0.1, 1.9, -0.35); // glass cockpit
  part(g, B(0.5, 0.35, 0.5), white, 0, 0.3, 1.6); // nose stripe
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 4.4, 8), navy);
  boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.2, -4.2); g.add(boom);
  part(g, B(0.12, 1.4, 0.9), navy, 0, 1.0, -6.2); // tail fin
  // skids
  for (const sx of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 6), chromeMat);
    skid.rotation.x = Math.PI / 2; skid.position.set(sx * 0.9, -1.5, 0.4); g.add(skid);
  }
  // main rotor (spins) + tail rotor
  const rotor = new THREE.Group();
  part(rotor, B(9.5, 0.08, 0.5), darkMat, 0, 0, 0);
  part(rotor, B(0.5, 0.08, 9.5), darkMat, 0, 0, 0);
  rotor.position.y = 1.5; g.add(rotor);
  g.userData.rotor = rotor;
  const tail = new THREE.Group();
  part(tail, B(0.08, 1.8, 0.3), darkMat, 0, 0, 0);
  tail.position.set(0.5, 0.3, -6.2); g.add(tail);
  g.userData.tailRotor = tail;
  // spotlight cone under the belly + the light itself
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(6, 22, 16, 1, true), coneMat);
  cone.position.y = -12; g.add(cone);
  g.userData.beam = cone;
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff2b0, emissiveIntensity: 3 }));
  spot.position.set(0, -1.2, 0.8); g.add(spot);
  // nav lights: red port + green starboard, so the heli reads at night
  for (const [sx, col] of [[-1, 0xff2020], [1, 0x20ff60]]) {
    const nav = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 3 }));
    nav.position.set(sx * 1.7, -0.6, 0.4); g.add(nav);
  }
  return g;
}

// --- speedboat --------------------------------------------------------------------
export function makeBoat() {
  const g = new THREE.Group();
  g.name = 'boat';
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, metalness: 0.3, roughness: 0.35, emissive: 0x8a8078, emissiveIntensity: 0.55 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd2001a, metalness: 0.4, roughness: 0.4 });
  // hull: main slab + tapered bow cone (the bow reads at a glance)
  part(g, B(2.2, 0.9, 4.6), white, 0, 0.45, -0.6);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 4), white);
  nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4;
  nose.scale.set(1, 1, 0.55); nose.position.set(0, 0.45, 3.6); nose.castShadow = true; g.add(nose);
  // red stripe along the hull
  part(g, B(2.26, 0.28, 4.4), red, 0, 0.55, -0.6);
  part(g, B(2.26, 0.28, 1.4), red, 0, 0.55, 2.2);
  // deck + cabin: low white block, one dark windshield strip on the FRONT
  // face (twin big raked panes read as a solid black box from the side)
  part(g, B(1.9, 0.25, 3.6), white, 0, 0.95, -0.4);
  part(g, B(1.5, 0.7, 1.8), white, 0, 1.45, -0.6);
  part(g, B(1.3, 0.3, 0.02), glassMat, 0, 1.5, 0.31); // windshield strip, flush on the cabin front
  // outboard motor (seats removed: they read as a black box on the cabin)
  part(g, B(0.5, 0.8, 0.4), darkMat, 0, 0.6, -3.1);
  g.userData.length = 6.4;
  return g;
}

// NOS flame: twin small additive flames at the exhaust pipes.
export function makeNosFlames() {
  const g = new THREE.Group();
  const tex = glowTexture('rgba(140,220,255,0.95)', 'rgba(140,220,255,0)');
  for (const sx of [-1, 1]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.position.set(sx * 0.45, 0.3, -2.8); s.scale.set(0.9, 0.5, 1);
    g.add(s);
  }
  g.visible = false;
  return g;
}
