// LUMEN BAY — vehicles.js
// The hero Veloz Comet RS, the LCPD cruiser, traffic sedans, the police
// bike, helicopter AIR-1, the speedboat and the NOS flames. Local space
// for every vehicle: +z is the nose, +y is up, +x is across.

import * as THREE from 'three';

const RED = 0xd2001a;

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.5,
    metalness: opts.metalness ?? 0.2,
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

function wheel(radius, width, scale) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 20),
    std(0x0c0c0e, { roughness: 0.95 }),
  );
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  g.add(tyre);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width + 0.02, 12),
    std(0x2c2f36, { roughness: 0.35, metalness: 0.8 }),
  );
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.58, 0.03, 8, 20),
    std(0xd8dce2, { roughness: 0.2, metalness: 0.9 }),
  );
  ring.rotation.y = Math.PI / 2;
  g.add(ring);
  const caliper = box(0.1, radius * 0.5, radius * 0.28, std(0xc22a1e, { roughness: 0.4 }));
  caliper.position.set(width / 2 + 0.02, 0, radius * 0.3);
  g.add(caliper);
  g.scale.setScalar(scale);
  g.userData.spin = tyre;
  return g;
}

function glowSprite(textures, color, scale) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glowHeadlight, color, transparent: true, opacity: 0.85, depthWrite: false,
  }));
  s.scale.set(scale, scale, 1);
  return s;
}

// ---- The hero car: Veloz Comet RS ---------------------------------------
// One clean low slab, one long raked hood, low dark-glass cabin with a
// thin red roof rail, a visible driver, a shield on the nose and big
// rectangular headlights. Never a stack of bubbles or boxes.
export function makeComet(textures) {
  const car = new THREE.Group();
  car.name = 'comet';
  const paint = std(RED, { roughness: 0.32, metalness: 0.55, emissive: 0x4a0000, emissiveIntensity: 0.6 });
  const darkGlass = std(0x0d1420, { roughness: 0.15, metalness: 0.6, transparent: true, opacity: 0.55 });
  const darkTrim = std(0x111318, { roughness: 0.6, metalness: 0.3 });
  const chrome = std(0xd8dce2, { roughness: 0.2, metalness: 0.9 });

  // One clean low slab for the body: top 0.765, bottom 0.275.
  const body = box(2.1, 0.49, 5.1, paint);
  body.position.y = 0.52;
  car.add(body);

  // One long raked hood panel, same red, front edge low.
  const hood = box(1.8, 0.06, 2.2, paint);
  hood.position.set(0, 0.85, 1.45);
  hood.rotation.x = 0.2;
  car.add(hood);
  // Subtle centre ridge down the hood centreline.
  const ridge = box(0.18, 0.03, 2.0, paint);
  ridge.position.set(0, 0.9, 1.45);
  ridge.rotation.x = 0.2;
  car.add(ridge);

  // Front face: wide low dark grille band, splitter lip, white plate.
  const grille = box(1.9, 0.2, 0.08, darkTrim);
  grille.position.set(0, 0.45, 2.56);
  car.add(grille);
  const splitter = box(2.0, 0.06, 0.3, darkTrim);
  splitter.position.set(0, 0.3, 2.55);
  car.add(splitter);
  const plate = box(0.5, 0.14, 0.04, std(0xf2f2ee, { roughness: 0.4 }));
  plate.position.set(0, 0.32, 2.6);
  car.add(plate);

  // Big detailed rectangular headlights: dark surrounds, bright lenses.
  for (const sx of [-1, 1]) {
    const surround = box(0.62, 0.28, 0.06, darkTrim);
    surround.position.set(sx * 0.68, 0.62, 2.56);
    car.add(surround);
    const lens = box(0.55, 0.22, 0.05,
      std(0xfff6dc, { roughness: 0.2, emissive: 0xfff2c8, emissiveIntensity: 1.4 }));
    lens.position.set(sx * 0.68, 0.62, 2.6);
    car.add(lens);
    const glow = glowSprite(textures, 0xfff2c8, 1.1);
    glow.position.set(sx * 0.68, 0.62, 2.85);
    car.add(glow);
  }

  // Ferrari shield on the nose: yellow plate, tiny green top strip.
  const shield = new THREE.Group();
  const shieldPlate = box(0.18, 0.22, 0.02, std(0xffd21c, { roughness: 0.4 }));
  shield.add(shieldPlate);
  const shieldTop = box(0.18, 0.05, 0.025, std(0x1d7a2e, { roughness: 0.4 }));
  shieldTop.position.y = 0.09;
  shield.add(shieldTop);
  shield.position.set(0, 0.72, 2.18);
  shield.rotation.x = 0.2;
  car.add(shield);

  // Cabin: LOW dark glass, not a dome.
  const cabin = box(1.5, 0.38, 1.7, darkGlass);
  cabin.position.set(0, 1.0, -0.35);
  car.add(cabin);
  // Raked windshield, tilted back.
  const windshield = box(1.5, 0.6, 0.04, darkGlass);
  windshield.position.set(0, 1.08, 0.42);
  windshield.rotation.x = -0.55;
  car.add(windshield);
  // Raked rear glass.
  const rearGlass = box(1.5, 0.55, 0.04, darkGlass);
  rearGlass.position.set(0, 1.06, -1.12);
  rearGlass.rotation.x = 0.5;
  car.add(rearGlass);
  // ONE THIN red roof rail across the glasshouse top.
  const roofRail = box(1.5, 0.05, 1.55, paint);
  roofRail.position.set(0, 1.21, -0.35);
  car.add(roofRail);
  // Thin bright glare strip on the windshield.
  const glare = box(1.3, 0.05, 0.02, std(0xffffff, { roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0.7 }));
  glare.position.set(0, 1.18, 0.52);
  glare.rotation.x = -0.55;
  car.add(glare);

  // Driver inside: orange jacket, warm face, dark hair, arms to the wheel.
  const driver = new THREE.Group();
  const torso = box(0.42, 0.5, 0.26, std(0xff7a1a, { roughness: 0.85 }));
  torso.position.y = 0.95;
  driver.add(torso);
  const head = box(0.26, 0.28, 0.26, std(0xe8b98a, { roughness: 0.8 }));
  head.position.y = 1.32;
  driver.add(head);
  const hair = box(0.28, 0.12, 0.28, std(0x1c1410, { roughness: 0.9 }));
  hair.position.y = 1.48;
  driver.add(hair);
  const armMat = std(0xff7a1a, { roughness: 0.85 });
  for (const sx of [-1, 1]) {
    const arm = box(0.11, 0.11, 0.42, armMat);
    arm.position.set(sx * 0.18, 1.02, 0.28);
    arm.rotation.x = -0.5;
    driver.add(arm);
  }
  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.03, 8, 16),
    std(0x1c1e24, { roughness: 0.5 }),
  );
  wheelRim.position.set(0, 1.05, 0.42);
  wheelRim.rotation.x = -0.5;
  driver.add(wheelRim);
  driver.position.set(0, 0, -0.35);
  car.add(driver);

  // Rear: raked decklid with twin ridges, spoiler on struts, tail panel.
  const decklid = box(1.9, 0.06, 1.1, paint);
  decklid.position.set(0, 0.82, -1.95);
  decklid.rotation.x = -0.18;
  car.add(decklid);
  for (const sx of [-1, 1]) {
    const ridgeR = box(0.12, 0.05, 1.0, paint);
    ridgeR.position.set(sx * 0.5, 0.87, -1.95);
    ridgeR.rotation.x = -0.18;
    car.add(ridgeR);
  }
  const tailPanel = box(1.9, 0.24, 0.06, darkTrim);
  tailPanel.position.set(0, 0.55, -2.56);
  car.add(tailPanel);
  for (const sx of [-1, 1]) {
    const strut = box(0.08, 0.22, 0.08, darkTrim);
    strut.position.set(sx * 0.6, 0.92, -2.35);
    car.add(strut);
    const endplate = box(0.04, 0.22, 0.4, darkTrim);
    endplate.position.set(sx * 0.85, 1.0, -2.4);
    car.add(endplate);
  }
  const spoiler = box(1.8, 0.05, 0.42, darkTrim);
  spoiler.position.set(0, 1.04, -2.4);
  car.add(spoiler);
  // Twin red tail-light clusters with small tight glow sprites.
  for (const sx of [-1, 1]) {
    const tail = box(0.55, 0.14, 0.05,
      std(0xd21c1c, { roughness: 0.3, emissive: 0xd21c1c, emissiveIntensity: 1.2 }));
    tail.position.set(sx * 0.62, 0.62, -2.6);
    car.add(tail);
    const glow = glowSprite(textures, 0xff3c3c, 0.55);
    glow.position.set(sx * 0.62, 0.62, -2.75);
    car.add(glow);
  }
  // Dark diffuser and twin chrome exhaust pipes.
  const diffuser = box(1.7, 0.14, 0.2, darkTrim);
  diffuser.position.set(0, 0.32, -2.58);
  car.add(diffuser);
  for (const sx of [-1, 1]) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10),
      chrome,
    );
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sx * 0.35, 0.36, -2.62);
    car.add(pipe);
  }

  // Sides: dark skirts, air-intake scoops, red mirrors, door lines.
  for (const sx of [-1, 1]) {
    const skirt = box(0.08, 0.14, 3.4, darkTrim);
    skirt.position.set(sx * 1.06, 0.34, -0.2);
    car.add(skirt);
    const scoop = box(0.1, 0.3, 0.7, darkTrim);
    scoop.position.set(sx * 1.05, 0.55, -0.9);
    car.add(scoop);
    const mirror = box(0.16, 0.1, 0.12, paint);
    mirror.position.set(sx * 1.12, 1.02, 0.35);
    car.add(mirror);
    const doorLine = box(0.02, 0.5, 0.02, darkTrim);
    doorLine.position.set(sx * 1.06, 0.6, -0.35);
    car.add(doorLine);
  }

  // Wheels: big, at x ±1, z ±1.45, y 0.42.
  const wheels = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = wheel(0.42, 0.32, 1.12);
      w.position.set(sx * 1.0, 0.42, sz * 1.45);
      car.add(w);
      wheels.push(w);
    }
  }
  car.userData.wheels = wheels;
  car.scale.setScalar(1.35);
  return car;
}

// ---- LCPD cruiser --------------------------------------------------------
export function makeCruiser(textures) {
  const car = new THREE.Group();
  car.name = 'cruiser';
  const black = std(0x11131a, { roughness: 0.45, metalness: 0.4 });
  const white = std(0xf2f2ee, { roughness: 0.4, metalness: 0.3 });
  const chrome = std(0xd8dce2, { roughness: 0.2, metalness: 0.9 });
  const darkGlass = std(0x0d1420, { roughness: 0.15, metalness: 0.6, transparent: true, opacity: 0.7 });

  const lower = box(1.9, 0.55, 4.6, black);
  lower.position.y = 0.55;
  car.add(lower);
  const doors = box(1.94, 0.5, 2.2, white);
  doors.position.set(0, 0.62, -0.2);
  car.add(doors);
  const roof = box(1.7, 0.42, 2.4, white);
  roof.position.set(0, 1.08, -0.25);
  car.add(roof);
  const glass = box(1.6, 0.34, 2.2, darkGlass);
  glass.position.set(0, 1.05, -0.25);
  car.add(glass);
  const hood = box(1.8, 0.1, 1.1, black);
  hood.position.set(0, 0.86, 1.7);
  car.add(hood);
  const grille = box(1.5, 0.18, 0.06, std(0x0a0a0c, { roughness: 0.6 }));
  grille.position.set(0, 0.55, 2.32);
  car.add(grille);
  for (const sx of [-1, 1]) {
    const bumper = box(0.5, 0.12, 0.1, chrome);
    bumper.position.set(sx * 0.6, 0.35, 2.36);
    car.add(bumper);
    const bumperR = box(0.5, 0.12, 0.1, chrome);
    bumperR.position.set(sx * 0.6, 0.35, -2.36);
    car.add(bumperR);
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.06, 14),
      std(0xfff6dc, { roughness: 0.2, emissive: 0xfff2c8, emissiveIntensity: 1.2 }),
    );
    head.rotation.x = Math.PI / 2;
    head.position.set(sx * 0.65, 0.68, 2.33);
    car.add(head);
    const tail = box(0.3, 0.12, 0.05,
      std(0xd21c1c, { roughness: 0.3, emissive: 0xd21c1c, emissiveIntensity: 1.0 }));
    tail.position.set(sx * 0.6, 0.68, -2.33);
    car.add(tail);
  }
  // Lightbar: dark base, bright red half, bright blue half, red glow.
  const base = box(1.1, 0.1, 0.4, std(0x0a0a0c, { roughness: 0.5 }));
  base.position.set(0, 1.34, -0.25);
  car.add(base);
  const redHalf = box(0.5, 0.16, 0.36,
    std(0xd21c1c, { roughness: 0.3, emissive: 0xff2020, emissiveIntensity: 1.6 }));
  redHalf.position.set(-0.27, 1.44, -0.25);
  car.add(redHalf);
  const blueHalf = box(0.5, 0.16, 0.36,
    std(0x1c4ad2, { roughness: 0.3, emissive: 0x2050ff, emissiveIntensity: 1.6 }));
  blueHalf.position.set(0.27, 1.44, -0.25);
  car.add(blueHalf);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glowRed, color: 0xff4040, transparent: true, opacity: 0.8, depthWrite: false,
  }));
  glow.scale.set(1.6, 1.6, 1);
  glow.position.set(-0.27, 1.5, -0.25);
  car.add(glow);

  const wheels = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = wheel(0.4, 0.3, 0.95);
      w.position.set(sx * 0.95, 0.4, sz * 1.4);
      car.add(w);
      wheels.push(w);
    }
  }
  car.userData.wheels = wheels;
  car.scale.setScalar(1.15);
  return car;
}

// ---- Traffic sedan -------------------------------------------------------
export function makeSedan(color, textures) {
  const car = new THREE.Group();
  car.name = 'sedan';
  const paint = std(color, { roughness: 0.4, metalness: 0.35 });
  const chrome = std(0xd8dce2, { roughness: 0.2, metalness: 0.9 });
  const darkGlass = std(0x0d1420, { roughness: 0.15, metalness: 0.6, transparent: true, opacity: 0.7 });

  const body = box(1.85, 0.55, 4.4, paint);
  body.position.y = 0.55;
  car.add(body);
  const cabin = box(1.6, 0.42, 2.2, darkGlass);
  cabin.position.set(0, 1.02, -0.3);
  car.add(cabin);
  const roof = box(1.6, 0.08, 2.0, paint);
  roof.position.set(0, 1.24, -0.3);
  car.add(roof);
  const hood = box(1.75, 0.1, 1.0, paint);
  hood.position.set(0, 0.85, 1.65);
  car.add(hood);
  for (const sx of [-1, 1]) {
    const bumper = box(0.5, 0.12, 0.1, chrome);
    bumper.position.set(sx * 0.55, 0.35, 2.24);
    car.add(bumper);
    const bumperR = box(0.5, 0.12, 0.1, chrome);
    bumperR.position.set(sx * 0.55, 0.35, -2.24);
    car.add(bumperR);
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14),
      std(0xfff6dc, { roughness: 0.2, emissive: 0xfff2c8, emissiveIntensity: 1.0 }),
    );
    head.rotation.x = Math.PI / 2;
    head.position.set(sx * 0.6, 0.66, 2.22);
    car.add(head);
  }
  const wheels = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = wheel(0.38, 0.28, 0.9);
      w.position.set(sx * 0.9, 0.38, sz * 1.35);
      car.add(w);
      wheels.push(w);
    }
  }
  car.userData.wheels = wheels;
  car.scale.setScalar(1.1);
  return car;
}

// ---- Police bike ---------------------------------------------------------
export function makeBike() {
  const bike = new THREE.Group();
  bike.name = 'bike';
  const white = std(0xf2f2ee, { roughness: 0.4, metalness: 0.3 });
  const dark = std(0x14161c, { roughness: 0.7 });
  const tyreMat = std(0x0c0c0e, { roughness: 0.95 });
  for (const sz of [0.85, -0.85]) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 10, 18), tyreMat);
    tyre.position.set(0, 0.34, sz);
    tyre.castShadow = true;
    bike.add(tyre);
  }
  const frame = box(0.16, 0.5, 1.7, white);
  frame.position.y = 0.62;
  bike.add(frame);
  const tank = box(0.34, 0.3, 0.6, white);
  tank.position.set(0, 0.85, 0.25);
  bike.add(tank);
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12),
    std(0xfff6dc, { roughness: 0.2, emissive: 0xfff2c8, emissiveIntensity: 1.2 }),
  );
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 0.8, 0.98);
  bike.add(head);
  // Rider: navy uniform, white helmet, arms to the bars.
  const rider = new THREE.Group();
  const torso = box(0.4, 0.55, 0.26, std(0x1d2a5e, { roughness: 0.85 }));
  torso.position.y = 1.15;
  rider.add(torso);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 12, 10),
    std(0xf2f2ee, { roughness: 0.35 }),
  );
  helmet.position.y = 1.58;
  rider.add(helmet);
  const headR = box(0.2, 0.2, 0.2, std(0xe8b98a, { roughness: 0.8 }));
  headR.position.y = 1.5;
  rider.add(headR);
  for (const sx of [-1, 1]) {
    const arm = box(0.1, 0.1, 0.45, std(0x1d2a5e, { roughness: 0.85 }));
    arm.position.set(sx * 0.17, 1.15, 0.45);
    arm.rotation.x = -0.7;
    rider.add(arm);
    const leg = box(0.13, 0.5, 0.13, dark);
    leg.position.set(sx * 0.14, 0.75, 0.05);
    rider.add(leg);
  }
  rider.position.z = -0.15;
  bike.add(rider);
  bike.userData.wheels = [];
  return bike;
}

// ---- Helicopter AIR-1 ----------------------------------------------------
export function makeHeli(textures) {
  const heli = new THREE.Group();
  heli.name = 'heli';
  const navy = std(0x1d2a5e, { roughness: 0.45, metalness: 0.35 });
  const white = std(0xf2f2ee, { roughness: 0.4, metalness: 0.3 });
  const glass = std(0x9fc4e8, { roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.75 });

  const fuselage = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), navy);
  fuselage.scale.set(1.1, 0.95, 1.6);
  fuselage.castShadow = true;
  heli.add(fuselage);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.45, 16, 12), white);
  belly.scale.set(1.05, 0.7, 1.55);
  belly.position.y = -0.45;
  heli.add(belly);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 10), glass);
  cockpit.scale.set(0.95, 0.75, 0.9);
  cockpit.position.set(0, 0.25, 1.35);
  heli.add(cockpit);
  const stripe = box(0.5, 0.12, 2.2, white);
  stripe.position.set(0, 0.95, 1.2);
  heli.add(stripe);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 4.2, 8), navy);
  boom.rotation.x = Math.PI / 2 - 0.12;
  boom.position.set(0, 0.35, -3.4);
  boom.castShadow = true;
  heli.add(boom);
  const fin = box(0.12, 1.2, 0.9, navy);
  fin.position.set(0, 1.0, -5.3);
  heli.add(fin);
  for (const sx of [-1, 1]) {
    const skid = box(0.08, 0.08, 3.2, std(0x2c2f36, { roughness: 0.4, metalness: 0.7 }));
    skid.position.set(sx * 0.9, -1.55, 0.2);
    heli.add(skid);
    const strut = box(0.08, 0.5, 0.08, std(0x2c2f36, { roughness: 0.4, metalness: 0.7 }));
    strut.position.set(sx * 0.9, -1.3, 0.2);
    heli.add(strut);
  }
  // Main rotor: two crossed blades.
  const rotor = new THREE.Group();
  rotor.position.y = 1.55;
  const bladeMat = std(0x14161c, { roughness: 0.5, metalness: 0.4 });
  for (const a of [0, Math.PI / 2]) {
    const blade = box(7.2, 0.06, 0.34, bladeMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  heli.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.35, 0.9, -5.2);
  for (const a of [0, Math.PI / 2]) {
    const blade = box(0.06, 1.6, 0.14, bladeMat);
    blade.rotation.x = a;
    tailRotor.add(blade);
  }
  heli.add(tailRotor);
  // Spotlight cone under the belly + bright lamp.
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c8, transparent: true, opacity: 0.16,
    depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 18, 20, 1, true), beamMat);
  beam.position.y = -10.2;
  heli.add(beam);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8),
    std(0xfff6dc, { roughness: 0.2, emissive: 0xfff2c8, emissiveIntensity: 2.0 }),
  );
  lamp.position.y = -1.4;
  heli.add(lamp);
  // Red port, green starboard navigation lights.
  const port = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    std(0xd21c1c, { emissive: 0xff2020, emissiveIntensity: 1.6 }),
  );
  port.position.set(-1.6, 0, 0.4);
  heli.add(port);
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    std(0x1cae4e, { emissive: 0x20ff60, emissiveIntensity: 1.6 }),
  );
  star.position.set(1.6, 0, 0.4);
  heli.add(star);
  heli.userData.rotor = rotor;
  heli.userData.tailRotor = tailRotor;
  heli.userData.beam = beam;
  heli.userData.beamMat = beamMat;
  return heli;
}

// ---- Speedboat -----------------------------------------------------------
export function makeBoat() {
  const boat = new THREE.Group();
  boat.name = 'boat';
  const white = std(0xf5f2ea, { roughness: 0.35, metalness: 0.25 });
  const red = std(0xd21c1c, { roughness: 0.4, metalness: 0.3 });
  const darkGlass = std(0x0d1420, { roughness: 0.15, metalness: 0.6 });

  // White hull with a red stripe, tapered bow cone. Length 6.4.
  const hull = box(2.2, 0.9, 4.6, white);
  hull.position.set(0, 0.55, -0.6);
  hull.castShadow = true;
  boat.add(hull);
  // Tapered bow cone, long and proud so the boat reads as a boat and
  // not a white box, with the red stripe carried onto it.
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.6, 4), white);
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.scale.set(1, 1, 0.55);
  bow.position.set(0, 0.55, 2.9);
  bow.castShadow = true;
  boat.add(bow);
  const bowStripe = new THREE.Mesh(new THREE.ConeGeometry(1.17, 0.9, 4), red);
  bowStripe.rotation.x = Math.PI / 2;
  bowStripe.rotation.y = Math.PI / 4;
  bowStripe.scale.set(1, 1, 0.55);
  bowStripe.position.set(0, 0.62, 2.35);
  boat.add(bowStripe);
  const stripe = box(2.26, 0.22, 4.6, red);
  stripe.position.set(0, 0.75, -0.6);
  boat.add(stripe);
  const deck = box(2.0, 0.18, 4.4, white);
  deck.position.set(0, 1.08, -0.6);
  boat.add(deck);
  // Low cabin with a dark roof so the top reads as a boat, not a crate.
  const cabin = box(1.6, 0.55, 1.6, white);
  cabin.position.set(0, 1.42, -1.2);
  cabin.castShadow = true;
  boat.add(cabin);
  const cabinRoof = box(1.7, 0.08, 1.7, std(0x14161c, { roughness: 0.5 }));
  cabinRoof.position.set(0, 1.73, -1.2);
  boat.add(cabinRoof);
  const windshield = box(1.5, 0.42, 0.06, darkGlass);
  windshield.position.set(0, 1.45, -0.38);
  boat.add(windshield);
  const motor = box(0.7, 1.0, 0.5, std(0x14161c, { roughness: 0.5, metalness: 0.5 }));
  motor.position.set(0, 0.7, -3.1);
  motor.castShadow = true;
  boat.add(motor);
  return boat;
}

// ---- NOS flames ----------------------------------------------------------
export function makeNosFlames(textures) {
  const flames = new THREE.Group();
  flames.name = 'nos-flames';
  const sprites = [];
  for (const sx of [-1, 1]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.glowHeadlight, color: 0x9fd8ff, transparent: true,
      opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    s.scale.set(0.9, 0.9, 1);
    s.position.set(sx * 0.35, 0.36, -2.8);
    flames.add(s);
    sprites.push(s);
  }
  flames.visible = false;
  flames.userData.sprites = sprites;
  return flames;
}
