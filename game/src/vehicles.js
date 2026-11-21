// LUMEN BAY — vehicles. The hero is a low, sleek rosso-corsa Ferrari-style
// sports car (long sloped hood, dark-glass cabin with a thin red roof rail,
// visible driver, shield emblem, big rectangular headlights). Police and
// traffic stay classic boxy sedans: black-dominant cruisers with white
// doors and roof and a bright lightbar. Plus the LCPD helicopter, the
// speedboat and the police motorcycles. Local space: +z = nose forward.

import { CAR_DEFS } from './config.js';
import { toTexture, glowTexture } from './textures.js';

function mesh(THREE, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function makeWheel(THREE, radius, darkHub) {
  const wheel = new THREE.Group();
  const tyre = mesh(THREE, new THREE.CylinderGeometry(radius, radius, 0.34, 18),
    new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.95 }), 0, 0, 0, 0, 0, Math.PI / 2);
  wheel.add(tyre);
  const hub = mesh(THREE, new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.36, 12),
    new THREE.MeshStandardMaterial({ color: darkHub ? 0x2a2d33 : 0xb8bec8, metalness: 0.9, roughness: 0.3 }),
    0, 0, 0, 0, 0, Math.PI / 2);
  wheel.add(hub);
  const ring = mesh(THREE, new THREE.TorusGeometry(radius * 0.82, 0.035, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.95, roughness: 0.2 }),
    0, 0, 0.18, 0, 0, 0);
  wheel.add(ring);
  const ring2 = ring.clone();
  ring2.position.z = -0.18;
  wheel.add(ring2);
  return wheel;
}

// The hero Ferrari. Footprint kept at 2.1 wide x 5.1 long, wheels at
// z +/-1.45, x +/-1.0 — the shot staging and cameras are tuned to it.
export function makeComet(THREE, glowTex) {
  const def = CAR_DEFS.comet;
  const car = new THREE.Group();
  car.name = 'comet';
  const paint = new THREE.MeshStandardMaterial({
    color: 0xc00018, metalness: 0.15, roughness: 0.55,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x2a3a48, metalness: 0.9, roughness: 0.12,
    transparent: true, opacity: 0.28,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.6, metalness: 0.4 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 1, roughness: 0.15 });

  // One clean low slab for the body — nothing stacked on it but the
  // parts below. 2.1 wide, 0.49 tall, 5.1 long.
  const body = mesh(THREE, new THREE.BoxGeometry(2.1, 0.85, 4.4), paint, 0, 0.52, 0);
  body.scale.set(1.0, 0.58, 1.16);
  car.add(body);

  // Hood: ONE long raked panel from the windshield base to the nose tip.
  // A touch darker than the body paint so the flat panel reads the same
  // red as the shaded body under the night lights.
  const hoodMat = new THREE.MeshStandardMaterial({
    color: 0xa80014, metalness: 0.15, roughness: 0.6,
  });
  const hood = mesh(THREE, new THREE.BoxGeometry(1.8, 0.06, 2.2), hoodMat, 0, 0.85, 1.45, 0.20, 0, 0);
  car.add(hood);
  // Subtle centre ridge down the hood — a sculpted line, not a bulge.
  car.add(mesh(THREE, new THREE.BoxGeometry(0.07, 0.05, 2.0), hoodMat, 0, 0.9, 1.45, 0.20, 0, 0));

  // Front face: wide low dark grille, big rectangular headlights with
  // dark surrounds, a thin dark splitter lip under the grille.
  car.add(mesh(THREE, new THREE.BoxGeometry(1.9, 0.2, 0.08), dark, 0, 0.52, 2.62));
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff2b0, emissiveIntensity: 2.4 });
  for (const sx of [-1, 1]) {
    car.add(mesh(THREE, new THREE.BoxGeometry(0.62, 0.26, 0.06), dark, sx * 0.68, 0.68, 2.62));
    car.add(mesh(THREE, new THREE.BoxGeometry(0.55, 0.2, 0.05), lensMat, sx * 0.68, 0.68, 2.65));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xfff2b0, transparent: true, opacity: 0.55, depthWrite: false }));
    glow.position.set(sx * 0.68, 0.68, 2.8);
    glow.scale.set(1.0, 1.0, 1);
    car.add(glow);
  }
  car.add(mesh(THREE, new THREE.BoxGeometry(1.9, 0.08, 0.35), dark, 0, 0.16, 2.5));
  // Front plate, dropped low so it clears the grille band.
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 });
  car.add(mesh(THREE, new THREE.BoxGeometry(0.5, 0.16, 0.03), plateMat, 0, 0.30, 2.60));

  // Ferrari-style shield on the nose: yellow plate, green top strip.
  const shield = mesh(THREE, new THREE.BoxGeometry(0.15, 0.18, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xf2c200, metalness: 0.6, roughness: 0.35, emissive: 0x664400, emissiveIntensity: 0.6 }), 0, 0.98, 2.0, 0.20, 0, 0);
  car.add(shield);
  car.add(mesh(THREE, new THREE.BoxGeometry(0.15, 0.04, 0.035),
    new THREE.MeshStandardMaterial({ color: 0x0a7a2a }), 0, 1.06, 1.96, 0.20, 0, 0));

  // Cabin: LOW dark glass + a THIN red roof rail. No dome, no bubble.
  car.add(mesh(THREE, new THREE.BoxGeometry(1.5, 0.38, 1.7), glass, 0, 1.0, -0.35));
  car.add(mesh(THREE, new THREE.BoxGeometry(1.5, 0.6, 0.06), glass, 0, 1.0, 0.62, -0.55, 0, 0));
  car.add(mesh(THREE, new THREE.BoxGeometry(1.5, 0.55, 0.06), glass, 0, 1.02, -1.28, 0.5, 0, 0));
  car.add(mesh(THREE, new THREE.BoxGeometry(1.5, 0.05, 1.55), paint, 0, 1.21, -0.35));
  // Glare streak across the windshield, kept to the left so it never
  // crosses the driver's face.
  car.add(mesh(THREE, new THREE.BoxGeometry(0.55, 0.05, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7 }),
    -0.45, 1.18, 0.58, -0.55, 0, 0));

  // Driver, visible through the semi-transparent windshield: warm face,
  // dark hair, orange jacket, seated low inside the cabin. The face and
  // jacket carry a faint warm emissive so they read at night.
  const skin = new THREE.MeshStandardMaterial({ color: 0xf2c89b, roughness: 0.7, emissive: 0x201008, emissiveIntensity: 0.7 });
  const jacket = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.8, emissive: 0x301505, emissiveIntensity: 0.7 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.9 });
  const torso = mesh(THREE, new THREE.BoxGeometry(0.5, 0.55, 0.3), jacket, 0, 0.85, -0.15);
  car.add(torso);
  const head = mesh(THREE, new THREE.SphereGeometry(0.21, 12, 10), skin, 0, 1.22, 0.0);
  car.add(head);
  car.add(mesh(THREE, new THREE.SphereGeometry(0.22, 12, 10), hair, 0, 1.28, -0.05));
  for (const sx of [-1, 1]) {
    const arm = mesh(THREE, new THREE.BoxGeometry(0.13, 0.13, 0.5), jacket, sx * 0.24, 0.92, 0.25, -0.5, 0, 0);
    car.add(arm);
  }

  // Rear: dark tail panel, twin red clusters + halos, diffuser, pipes,
  // spoiler with struts, endplates and gurney lip, raked rear deck.
  car.add(mesh(THREE, new THREE.BoxGeometry(1.9, 0.22, 0.08), dark, 0, 0.62, -2.58));
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff2010, emissiveIntensity: 1.8 });
  for (const sx of [-1, 1]) {
    car.add(mesh(THREE, new THREE.BoxGeometry(0.6, 0.14, 0.05), tailMat, sx * 0.6, 0.66, -2.62));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xff3020, transparent: true, opacity: 0.7, depthWrite: false }));
    glow.position.set(sx * 0.6, 0.66, -2.75);
    glow.scale.set(1.6, 1.6, 1);
    car.add(glow);
  }
  car.add(mesh(THREE, new THREE.BoxGeometry(1.9, 0.3, 0.3), dark, 0, 0.2, -2.45));
  for (const sx of [-1, 1]) {
    car.add(mesh(THREE, new THREE.CylinderGeometry(0.09, 0.09, 0.3, 10), chrome, sx * 0.45, 0.22, -2.55, Math.PI / 2, 0, 0));
  }
  car.add(mesh(THREE, new THREE.BoxGeometry(1.7, 0.05, 0.7), paint, 0, 0.82, -1.9, -0.18, 0, 0));
  for (const sx of [-1, 1]) {
    car.add(mesh(THREE, new THREE.BoxGeometry(0.06, 0.04, 0.6), paint, sx * 0.75, 0.88, -1.9, -0.18, 0, 0));
  }
  // Spoiler: blade + struts + endplates + gurney lip.
  car.add(mesh(THREE, new THREE.BoxGeometry(1.8, 0.05, 0.4), dark, 0, 1.02, -2.35));
  car.add(mesh(THREE, new THREE.BoxGeometry(1.8, 0.06, 0.05), dark, 0, 1.06, -2.55));
  for (const sx of [-1, 1]) {
    car.add(mesh(THREE, new THREE.BoxGeometry(0.06, 0.3, 0.1), dark, sx * 0.7, 0.9, -2.35));
    car.add(mesh(THREE, new THREE.BoxGeometry(0.05, 0.3, 0.42), dark, sx * 0.92, 1.0, -2.35));
  }

  // Dark side skirts + side air-intake scoops, mirrors, door lines.
  for (const sx of [-1, 1]) {
    car.add(mesh(THREE, new THREE.BoxGeometry(0.08, 0.16, 2.6), dark, sx * 1.06, 0.28, -0.2));
    car.add(mesh(THREE, new THREE.BoxGeometry(0.06, 0.3, 0.7), dark, sx * 1.06, 0.62, -0.9));
    car.add(mesh(THREE, new THREE.BoxGeometry(0.16, 0.1, 0.24), paint, sx * 1.12, 0.95, 0.45));
    car.add(mesh(THREE, new THREE.BoxGeometry(0.02, 0.3, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x8a0f14, roughness: 0.4 }), sx * 1.06, 0.6, 0.1));
  }

  // Wheels: big, with arches, dark-alloy hubs, chrome rings, red calipers.
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const wheel = makeWheel(THREE, 0.42, true);
    wheel.position.set(wx, 0.42, wz);
    car.add(wheel);
    wheels.push(wheel);
    const arch = mesh(THREE, new THREE.TorusGeometry(0.5, 0.09, 8, 14, Math.PI),
      paint, wx, 0.5, wz, 0, 0, 0);
    arch.rotation.y = Math.PI / 2;
    car.add(arch);
    const caliper = mesh(THREE, new THREE.BoxGeometry(0.1, 0.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xd2001a, emissive: 0x550000, emissiveIntensity: 0.5 }),
      wx * 0.98, 0.42, wz);
    car.add(caliper);
  }
  car.scale.set(1.35, 1.35, 1.35);
  car.userData = { type: 'comet', wheels, def, glowTex };
  return car;
}

// Classic boxy sedan — the police cruiser and all traffic. Flat hood and
// trunk, upright cabin, chrome bumpers, round headlights, grille.
export function makeSedan(THREE, glowTex, kind = 'sedan', colour = 0x8a94a6) {
  const isPolice = kind === 'police';
  const car = new THREE.Group();
  car.name = isPolice ? 'cruiser' : kind;
  const bodyColour = isPolice ? 0x111318 : colour;
  const paint = new THREE.MeshStandardMaterial({
    color: bodyColour, metalness: isPolice ? 0.4 : 0.7, roughness: isPolice ? 0.5 : 0.35 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.5, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x141c26, metalness: 0.8, roughness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 1, roughness: 0.15 });

  // Lower body + (police) white doors and roof.
  car.add(mesh(THREE, new THREE.BoxGeometry(1.9, 0.62, 4.4), paint, 0, 0.55, 0));
  if (isPolice) {
    car.add(mesh(THREE, new THREE.BoxGeometry(1.92, 0.34, 1.9), white, 0, 0.62, 0.1));
    car.add(mesh(THREE, new THREE.BoxGeometry(1.7, 0.06, 1.6), white, 0, 1.28, -0.2));
  }
  // Upright cabin with glass band.
  car.add(mesh(THREE, new THREE.BoxGeometry(1.7, 0.55, 2.1), paint, 0, 1.12, -0.2));
  car.add(mesh(THREE, new THREE.BoxGeometry(1.72, 0.3, 2.0), glass, 0, 1.14, -0.2));
  // Flat hood + trunk lines.
  car.add(mesh(THREE, new THREE.BoxGeometry(1.86, 0.06, 1.0), paint, 0, 0.9, 1.65));
  car.add(mesh(THREE, new THREE.BoxGeometry(1.86, 0.06, 0.9), paint, 0, 0.9, -1.7));
  // Chrome bumpers front and rear.
  car.add(mesh(THREE, new THREE.BoxGeometry(1.95, 0.16, 0.18), chrome, 0, 0.32, 2.24));
  car.add(mesh(THREE, new THREE.BoxGeometry(1.95, 0.16, 0.18), chrome, 0, 0.32, -2.24));
  // Grille + round headlights.
  car.add(mesh(THREE, new THREE.BoxGeometry(1.1, 0.22, 0.06), dark, 0, 0.62, 2.22));
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff2b0, emissiveIntensity: 1.8 });
  for (const sx of [-1, 1]) {
    car.add(mesh(THREE, new THREE.CylinderGeometry(0.17, 0.17, 0.06, 14), lensMat, sx * 0.68, 0.64, 2.22, Math.PI / 2, 0, 0));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xfff2b0, transparent: true, opacity: 0.7, depthWrite: false }));
    glow.position.set(sx * 0.68, 0.64, 2.35);
    glow.scale.set(1.5, 1.5, 1);
    car.add(glow);
    car.add(mesh(THREE, new THREE.BoxGeometry(0.4, 0.12, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff2010, emissiveIntensity: 1.4 }),
      sx * 0.68, 0.62, -2.24));
  }
  if (kind === 'taxi') {
    car.add(mesh(THREE, new THREE.BoxGeometry(0.9, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xf2b705, emissiveIntensity: 0.9 }),
      0, 1.48, -0.2));
  }
  // Police lightbar: big, bright, red left / blue right, with glow halos.
  let barRed = null, barBlue = null;
  if (isPolice) {
    car.add(mesh(THREE, new THREE.BoxGeometry(1.1, 0.14, 0.34), dark, 0, 1.46, -0.2));
    barRed = mesh(THREE, new THREE.BoxGeometry(0.48, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xff2010, emissive: 0xff2010, emissiveIntensity: 3 }),
      -0.28, 1.52, -0.2);
    barBlue = mesh(THREE, new THREE.BoxGeometry(0.48, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x2040ff, emissive: 0x2040ff, emissiveIntensity: 3 }),
      0.28, 1.52, -0.2);
    car.add(barRed); car.add(barBlue);
    for (const [sx, col] of [[-0.28, 0xff3020], [0.28, 0x3050ff]]) {
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: col, transparent: true, opacity: 0.85, depthWrite: false }));
      glow.position.set(sx, 1.56, -0.2);
      glow.scale.set(1.8, 1.8, 1);
      car.add(glow);
    }
    // LCPD door badge.
    car.add(mesh(THREE, new THREE.BoxGeometry(0.02, 0.4, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 }), -0.97, 0.62, 0.1));
  }

  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = makeWheel(THREE, 0.36, false);
    wheel.position.set(wx, 0.36, wz);
    car.add(wheel);
    wheels.push(wheel);
  }
  car.userData = { type: kind, wheels, def: CAR_DEFS[kind] || CAR_DEFS.sedan, barRed, barBlue };
  return car;
}

// LCPD helicopter: rounded fuselage, glass cockpit, tail boom, main +
// tail rotors, skids, belly spotlight + a visible beam cone.
export function makeHelicopter(THREE, glowTex) {
  const heli = new THREE.Group();
  heli.name = 'heli';
  const navy = new THREE.MeshStandardMaterial({ color: 0x2e4a78, metalness: 0.6, roughness: 0.4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f5f8, metalness: 0.5, roughness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0e1a26, metalness: 0.9, roughness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.6 });

  const body = mesh(THREE, new THREE.SphereGeometry(1.5, 16, 12), navy, 0, 0, 0);
  body.scale.set(1.15, 0.95, 1.5);
  heli.add(body);
  const belly = mesh(THREE, new THREE.SphereGeometry(1.3, 16, 12), white, 0, -0.5, 0.2);
  belly.scale.set(1.12, 0.72, 1.4);
  heli.add(belly);
  // White cheatline stripes along the fuselage flanks so the dark body
  // reads against a black night sky.
  for (const sx of [-1, 1]) {
    heli.add(mesh(THREE, new THREE.BoxGeometry(0.06, 0.28, 2.2), white, sx * 1.62, 0.1, 0.1));
  }
  const cockpit = mesh(THREE, new THREE.SphereGeometry(1.05, 14, 10), glass, 0, 0.25, 1.15);
  cockpit.scale.set(1.0, 0.75, 0.7);
  heli.add(cockpit);
  // Tail boom + fin + tail rotor.
  const boom = mesh(THREE, new THREE.CylinderGeometry(0.28, 0.55, 3.6, 10), navy, 0, 0.15, -3.0, Math.PI / 2 - 0.12, 0, 0);
  heli.add(boom);
  heli.add(mesh(THREE, new THREE.BoxGeometry(0.16, 1.3, 0.9), navy, 0, 0.7, -4.6));
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.35, 0.5, -4.6);
  for (let i = 0; i < 2; i += 1) {
    tailRotor.add(mesh(THREE, new THREE.BoxGeometry(0.08, 1.4, 0.06), dark, 0, 0, 0, 0, 0, i * Math.PI / 2));
  }
  heli.add(tailRotor);
  // Main rotor: mast + 4 blades.
  const rotor = new THREE.Group();
  rotor.position.y = 1.55;
  rotor.add(mesh(THREE, new THREE.CylinderGeometry(0.14, 0.14, 0.5, 8), dark, 0, 0, 0));
  for (let i = 0; i < 4; i += 1) {
    const blade = mesh(THREE, new THREE.BoxGeometry(0.28, 0.05, 3.4), dark, 0, 0.25, 0, 0, (i * Math.PI) / 2, 0);
    blade.position.z = Math.cos((i * Math.PI) / 2) * 1.7;
    blade.position.x = Math.sin((i * Math.PI) / 2) * 1.7;
    rotor.add(blade);
  }
  heli.add(rotor);
  // Skids.
  for (const sx of [-1, 1]) {
    heli.add(mesh(THREE, new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), dark, sx * 0.85, -1.35, 0, Math.PI / 2, 0, 0));
    heli.add(mesh(THREE, new THREE.BoxGeometry(0.07, 0.5, 0.07), dark, sx * 0.85, -1.1, 0.7));
    heli.add(mesh(THREE, new THREE.BoxGeometry(0.07, 0.5, 0.07), dark, sx * 0.85, -1.1, -0.7));
  }
  // Belly spotlight lamp (the beam cone follows below).
  const lamp = mesh(THREE, new THREE.SphereGeometry(0.3, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff2b0, emissiveIntensity: 4 }), 0, -1.15, 0.6);
  heli.add(lamp);
  // Beam cone: narrow at the heli belly (apex up), wide where it lands.
  // ConeGeometry puts the apex at +y, so no flip is needed.
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0, transparent: true, opacity: 0.09, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.0, 12, 16, 1, true), beamMat);
  beam.position.set(0, -7, 0.6);
  beam.rotation.z = -0.35; // slant the foot of the beam toward the car
  beam.name = 'beam';
  heli.add(beam);
  // Bright pool where the beam lands (added by main.js at ground level).
  heli.userData = { rotor, tailRotor, beam, lamp };
  return heli;
}

// Speedboat: white hull with a red stripe, tapered bow, cabin with twin
// raked dark-glass windshield panes, seats, outboard.
export function makeBoat(THREE) {
  const boat = new THREE.Group();
  boat.name = 'boat';
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.35, metalness: 0.25 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd2001a, roughness: 0.4, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x10161f, metalness: 0.9, roughness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.6 });

  // Hull: main box + a wedge bow (rotated box) so the nose tapers.
  boat.add(mesh(THREE, new THREE.BoxGeometry(2.6, 0.9, 6.4), hullMat, 0, 0.55, 0));
  const bow = mesh(THREE, new THREE.BoxGeometry(2.6, 0.9, 2.2), hullMat, 0, 0.55, 4.1, -0.5, 0, 0);
  bow.scale.set(0.55, 0.9, 1);
  boat.add(bow);
  // Red stripe along the hull sides.
  for (const sx of [-1, 1]) {
    boat.add(mesh(THREE, new THREE.BoxGeometry(0.06, 0.3, 6.2), redMat, sx * 1.32, 0.55, 0));
  }
  boat.add(mesh(THREE, new THREE.BoxGeometry(2.62, 0.28, 0.5), redMat, 0, 0.55, 3.1));
  // Deck + gunwale rim.
  boat.add(mesh(THREE, new THREE.BoxGeometry(2.5, 0.14, 6.2), hullMat, 0, 1.02, 0));
  // Cabin block with a dark window band.
  boat.add(mesh(THREE, new THREE.BoxGeometry(2.0, 0.7, 2.2), hullMat, 0, 1.4, -0.6));
  boat.add(mesh(THREE, new THREE.BoxGeometry(2.02, 0.3, 2.0), glass, 0, 1.5, -0.6));
  // Twin raked windshield panes + white frame + centre post.
  for (const sx of [-1, 1]) {
    boat.add(mesh(THREE, new THREE.BoxGeometry(0.95, 0.7, 0.06), glass, sx * 0.5, 1.65, 0.55, -0.5, 0, 0));
  }
  boat.add(mesh(THREE, new THREE.BoxGeometry(0.08, 0.8, 0.08), hullMat, 0, 1.65, 0.55, -0.5, 0, 0));
  boat.add(mesh(THREE, new THREE.BoxGeometry(2.1, 0.08, 0.1), hullMat, 0, 2.0, 0.45, -0.5, 0, 0));
  // Seats + console.
  for (const sx of [-1, 1]) {
    boat.add(mesh(THREE, new THREE.BoxGeometry(0.6, 0.5, 0.6), dark, sx * 0.55, 1.3, 1.4));
  }
  boat.add(mesh(THREE, new THREE.BoxGeometry(1.2, 0.5, 0.4), dark, 0, 1.3, 0.9));
  // Outboard motor.
  boat.add(mesh(THREE, new THREE.BoxGeometry(0.7, 1.0, 0.5), dark, 0, 0.5, -3.4));
  boat.userData = { type: 'boat' };
  return boat;
}

// Police motorcycle + rider with a white helmet.
export function makeBike(THREE) {
  const bike = new THREE.Group();
  bike.name = 'bike';
  const black = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.5, metalness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 1, roughness: 0.15 });
  // Frame + tank + seat.
  bike.add(mesh(THREE, new THREE.BoxGeometry(0.5, 0.4, 1.7), black, 0, 0.62, 0));
  bike.add(mesh(THREE, new THREE.BoxGeometry(0.46, 0.3, 0.6), white, 0, 0.85, 0.15));
  bike.add(mesh(THREE, new THREE.BoxGeometry(0.44, 0.12, 0.7), black, 0, 0.82, -0.6));
  // Front fairing + headlight + handlebars.
  bike.add(mesh(THREE, new THREE.BoxGeometry(0.5, 0.5, 0.3), white, 0, 0.85, 0.95));
  const head = mesh(THREE, new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff2b0, emissiveIntensity: 2.5 }), 0, 0.8, 1.1);
  bike.add(head);
  bike.add(mesh(THREE, new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), chrome, 0, 1.05, 0.75, 0, 0, Math.PI / 2));
  // Wheels.
  for (const wz of [0.75, -0.75]) {
    const wheel = makeWheel(THREE, 0.34, true);
    wheel.position.set(0, 0.34, wz);
    bike.add(wheel);
  }
  // Rider: navy uniform, white helmet, hands on the bars.
  const navy = new THREE.MeshStandardMaterial({ color: 0x1d2f52, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a06b, roughness: 0.7 });
  bike.add(mesh(THREE, new THREE.BoxGeometry(0.5, 0.6, 0.35), navy, 0, 1.15, -0.35));
  const helmet = mesh(THREE, new THREE.SphereGeometry(0.24, 12, 10), white, 0, 1.62, -0.3);
  bike.add(helmet);
  bike.add(mesh(THREE, new THREE.BoxGeometry(0.3, 0.1, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x141c26, metalness: 0.8, roughness: 0.2 }), 0, 1.6, -0.08));
  for (const sx of [-1, 1]) {
    bike.add(mesh(THREE, new THREE.BoxGeometry(0.12, 0.12, 0.5), navy, sx * 0.28, 1.1, 0.35, -0.6, 0, 0));
    bike.add(mesh(THREE, new THREE.BoxGeometry(0.14, 0.5, 0.14), navy, sx * 0.22, 0.85, -0.15, 0.5, 0, 0));
  }
  void skin;
  bike.userData = { type: 'bike' };
  return bike;
}

export function makeGlowTexture(THREE) {
  return toTexture(THREE, glowTexture(), 1, 1);
}
