// LUMEN BAY r8c — vehicles: the car factory, traffic AI, police cruisers,
// the helicopter and police roadblocks. The hero is a RED CONVERTIBLE built
// to look REAL, not flat cartoon: MeshPhysicalMaterial paint (metalness 0.85,
// roughness 0.28, clearcoat 1.0) over the bright daytime PMREM environment
// map, so the body picks up blue-sky daylight reflections; glossy black glass
// cabin, detailed 5-spoke dark-alloy wheels with chrome rings and red
// calipers, glowing headlights + full-width red taillight strip, rear spoiler
// and splitter. Police light bars FLASH red/blue (emissive + glow sprites);
// the helicopter carries a visible additive searchlight cone; dust puffs
// trail the wheels at speed. Traffic is 28 cars in varied real colours.
import * as THREE from 'three';
import { CARS, TRAFFIC_COUNT, DAYLIGHT } from './config.js';
import { clamp, dist2 } from './config.js';
import { resolveCollisions } from './city.js';
import { daySkyTexture, sunGlowTexture, dustTexture, policeTextTexture } from './textures.js';

const ROAD_LANES = [-234, -174, -114, -54, 6, 66, 126, 186];
const TRAFFIC_PAINT = [0xffd23f, 0x19b8c4, 0xffffff, 0x1a1a1e, 0x37c978, 0xff7a1a, 0xc78bff, 0x3fa7ff, 0xff2a5e, 0xd8d8d8, 0xffd23f, 0x2a6b3a];
/** Real-car paint: metallic clearcoat over the bright daylight env map. */
function paintMaterial(colour, opts) {
  const o = opts || {};
  return new THREE.MeshPhysicalMaterial({
    color: colour,
    metalness: o.metalness !== undefined ? o.metalness : 0.85,
    roughness: o.roughness !== undefined ? o.roughness : 0.28,
    clearcoat: 1.0, clearcoatRoughness: 0.08,
    envMapIntensity: 1.3,
  });
}
/** A detailed wheel: dark tyre, 5-spoke dark-alloy hub, chrome ring, red
 caliper hint behind the spokes. r8b: bigger (0.62) so the arches fill. */
function makeWheel() {
  const group = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.44, 16),
    new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.95 }));
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  group.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.46, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.3, metalness: 0.9 }));
  hub.rotation.z = Math.PI / 2;
  group.add(hub);
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.25, metalness: 0.9 });
  for (let i = 0; i < 5; i += 1) {
    // Spokes sweep the wheel face (the y-z plane, axle = x): rotate about x.
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.7, 0.5), spokeMat);
    spoke.rotation.x = (i / 5) * Math.PI * 2;
    group.add(spoke);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.15, metalness: 1.0 }));
  ring.rotation.y = Math.PI / 2;
  ring.position.x = 0.22;
  group.add(ring);
  const ring2 = ring.clone();
  ring2.position.x = -0.22;
  group.add(ring2);
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xd90429 }));
  caliper.position.set(0, 0.18, 0.1);
  group.add(caliper);
  return group;
}
/** Build a car mesh for a car type. Returns { group, body, flame, wheels, plates, lightBar }. */
export function buildCarMesh(type, opts) {
  const def = CARS[type] || CARS.sedan;
  const o = opts || {};
  const group = new THREE.Group();
  const colour = o.colour !== undefined ? o.colour : def.colour;
  const paint = paintMaterial(colour);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), paint);
  body.position.y = 0.75; body.castShadow = true;
  group.add(body);
  let lightBar = null;
  if (type === 'comet') {
    // --- the hero Comet RS, rebuilt r8b: REAL sports-car proportions ------
    // Long hood, low roofline, tapered nose, sculpted flanks: a low-slung
    // GT, not a toy box. Body stretched to 4.9 long / 2.0 wide / 0.62 tall,
    // cabin set back and low, front grille + bumpers + mirrors + door lines
    // + wheel arches so it reads as a real car from the 3/4 chase angle.
    body.scale.set(0.95, 0.82, 1.11);
    body.position.y = 0.68;
    // Tapered nose + long hood panel.
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.7), paint);
    nose.position.set(0, 0.62, 2.25);
    group.add(nose);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 1.9), paint);
    hood.position.set(0, 1.0, 1.35);
    group.add(hood);
    // Front grille: dark mesh + 3 chrome bars, between slim LED headlights.
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.26, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.4, metalness: 0.6 }));
    grille.position.set(0, 0.62, 2.47);
    group.add(grille);
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.15, metalness: 1.0 });
    for (let i = -1; i <= 1; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.03), chromeMat);
      bar.position.set(0, 0.54 + i * 0.08, 2.53);
      group.add(bar);
    }
    for (const x of [-0.78, 0.78]) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
      led.position.set(x, 0.82, 2.48);
      group.add(led);
    }
    // Bumpers front + rear, rear diffuser, twin chrome exhausts.
    const bumpMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.6 });
    const bumpF = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.25), bumpMat);
    bumpF.position.set(0, 0.36, 2.42);
    group.add(bumpF);
    const bumpR = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.25), bumpMat);
    bumpR.position.set(0, 0.36, -2.42);
    group.add(bumpR);
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.3), bumpMat);
    diffuser.position.set(0, 0.3, -2.5);
    group.add(diffuser);
    for (const x of [-0.55, 0.55]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x, 0.42, -2.55);
      group.add(pipe);
    }
    // Full-width red taillight strip at the true rear face.
    const tailStrip = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xff1a1a }));
    tailStrip.position.set(0, 0.85, -2.47);
    group.add(tailStrip);
    // Glossy black glass cabin, set back + low: slanted windshield, low
    // glass roof, side windows with a bright glare band.
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x0a0a14, metalness: 0.9, roughness: 0.08, clearcoat: 1.0, envMapIntensity: 1.6,
    });
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.12), glass);
    shield.position.set(0, 1.28, 0.55); shield.rotation.x = -0.32;
    group.add(shield);
    const glassRoof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.0), glass);
    glassRoof.position.set(0, 1.3, -0.55);
    group.add(glassRoof);
    for (const s of [-1, 1]) {
      const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 1.25), glass);
      sideGlass.position.set(s * 0.96, 1.12, -0.5);
      group.add(sideGlass);
      // Windshield glare band: a pale diagonal stripe on the glass.
      const glareBand = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.35, depthWrite: false }));
      glareBand.rotation.y = s * Math.PI / 2;
      glareBand.rotation.z = 0.5;
      glareBand.position.set(s * 0.99, 1.14, -0.3);
      group.add(glareBand);
      // Side mirror on a stalk + door shut line + chrome handle.
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), bumpMat);
      stalk.position.set(s * 1.05, 1.12, 0.72);
      group.add(stalk);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.3, metalness: 0.8 }));
      mirror.position.set(s * 1.14, 1.14, 0.72);
      group.add(mirror);
      const doorLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.55, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }));
      doorLine.position.set(s * 1.01, 0.85, 0.15);
      group.add(doorLine);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.28), chromeMat);
      handle.position.set(s * 1.01, 1.02, 0.35);
      group.add(handle);
      // Side air intake behind the door.
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.7), bumpMat);
      intake.position.set(s * 1.0, 0.75, -0.95);
      group.add(intake);
    }
    // Wheel arches: dark half-torus trim over each wheel.
    const archMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.5, metalness: 0.5 });
    for (const [x, z] of [[-1.0, 1.55], [1.0, 1.55], [-1.0, -1.55], [1.0, -1.55]]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 8, 14, Math.PI), archMat);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(x, 0.62, z);
      group.add(arch);
    }
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 });
    for (const x of [-0.5, 0.5]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.62, 0.6), seatMat);
      seat.position.set(x, 1.08, -0.55);
      group.add(seat);
      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.25), seatMat);
      headrest.position.set(x, 1.45, -0.78);
      group.add(headrest);
    }
    // Mara at the wheel (left seat, orange jacket) — the visible driver the
    // top-3 convertibles all show. Reads from the 3/4 chase angle.
    const driverJacket = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.85 });
    const driverSkin = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 });
    const driverTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.35), driverJacket);
    driverTorso.position.set(-0.5, 1.28, -0.5);
    group.add(driverTorso);
    const driverHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), driverSkin);
    driverHead.position.set(-0.5, 1.62, -0.5);
    group.add(driverHead);
    const driverHair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
    driverHair.position.set(-0.5, 1.65, -0.5);
    group.add(driverHair);
    const armMat = driverJacket;
    for (const x of [-0.72, -0.28]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.7), armMat);
      arm.position.set(x, 1.22, -0.05);
      arm.rotation.x = -0.5;
      group.add(arm);
    }
    const rollbar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.35, metalness: 0.7 }));
    rollbar.position.set(0, 1.3, -1.3);
    group.add(rollbar);
    // Rear spoiler + struts + end plates in BODY PAINT (r8b: from the rear
    // the spoiler is the car's biggest top surface — black made the hero
    // read black; pink paint keeps it hot pink-red like the reference),
    // front splitter, side skirts.
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.55), paint);
    spoiler.position.set(0, 1.38, -2.2);
    group.add(spoiler);
    for (const x of [-0.95, 0.95]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.55), paint);
      plate.position.set(x, 1.3, -2.2);
      group.add(plate);
    }
    // Red tonneau deck behind the seats: a pink panel the chase camera
    // sees between the glass roof and the spoiler (rear-top red, not black).
    const tonneau = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.0), paint);
    tonneau.position.set(0, 1.28, -1.25);
    group.add(tonneau);
    for (const x of [-0.7, 0.7]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.7 }));
      strut.position.set(x, 1.22, -2.2);
      group.add(strut);
    }
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.12, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.6 }));
    splitter.position.set(0, 0.3, 2.35);
    group.add(splitter);
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.6 });
    for (const x of [-1.02, 1.02]) {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 3.4), skirtMat);
      skirt.position.set(x, 0.4, 0);
      group.add(skirt);
    }
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.35, metalness: 0.7 }));
    scoop.position.set(0, 1.06, 1.35);
    group.add(scoop);
    // Daylight glare stripe on the hood: a soft additive highlight that reads
    // as sun glare on the clearcoat (subtle, never a white blob).
    const glare = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9),
      new THREE.MeshBasicMaterial({
        color: 0xffd9a0, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
    glare.rotation.x = -Math.PI / 2;
    glare.rotation.z = 0.35;
    glare.position.set(0.2, 1.06, 1.2);
    group.add(glare);
  } else {
    // Traffic / police / shark: dark glass cabin, body-coloured paint.
    const cabinColour = (type === 'police' || type === 'shark') ? 0x0a0e1a
      : colour;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2),
      new THREE.MeshPhysicalMaterial({
        color: cabinColour, roughness: 0.15, metalness: 0.7, clearcoat: 0.8, envMapIntensity: 1.1,
      }));
    cabin.position.set(0, 1.4, -0.2); cabin.castShadow = true;
    group.add(cabin);
  }
  const wheels = [];
  for (const [x, z] of [[-1.0, 1.55], [1.0, 1.55], [-1.0, -1.55], [1.0, -1.55]]) {
    const w = makeWheel();
    w.position.set(x, 0.62, z);
    group.add(w); wheels.push(w);
  }
  // Glowing headlights (warm white, emissive) + full-width red taillight strip.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.08), headMat);
    h.position.set(x, 0.85, 2.22);
    group.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a });
  const tailStrip = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 0.08), tailMat);
  tailStrip.position.set(0, 0.9, -2.22);
  group.add(tailStrip);
  if (type === 'police') {
    // --- r8b cruiser: WHITE body + BLACK hood/trunk/doors, "POLICE" on the
    // doors, a steel push bar up front — a real black-and-white, readable
    // at a glance like the HALCYON cruisers behind the hero.
    const whitePaint = paintMaterial(0xf2f2f2, { metalness: 0.6, roughness: 0.35 });
    body.material = whitePaint;
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.45, metalness: 0.5 });
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 1.1), blackMat);
    hood.position.set(0, 1.14, 1.55);
    group.add(hood);
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.9), blackMat);
    trunk.position.set(0, 1.14, -1.65);
    group.add(trunk);
    const doorTex = policeTextTexture('POLICE');
    for (const s of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 2.0), blackMat);
      door.position.set(s * 1.06, 0.8, -0.2);
      group.add(door);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4),
        new THREE.MeshBasicMaterial({ map: doorTex, transparent: true }));
      label.rotation.y = s * Math.PI / 2;
      label.position.set(s * 1.09, 0.85, -0.2);
      group.add(label);
    }
    // Steel push bar: two uprights + a crossbar ahead of the grille.
    const pushMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.35, metalness: 0.85 });
    for (const x of [-0.6, 0.6]) {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), pushMat);
      upright.position.set(x, 0.7, 2.32);
      group.add(upright);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.1), pushMat);
    cross.position.set(0, 0.95, 2.32);
    group.add(cross);
    // Flashing light bar: red + blue emissive blocks with glow sprites that
    // alternate in updatePolice (red/blue flash, top-3 chase look).
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 }));
    barBase.position.set(0, 1.82, -0.2);
    group.add(barBase);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.26, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    red.position.set(-0.4, 1.95, -0.2);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.26, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2a6bff }));
    blue.position.set(0.4, 1.95, -0.2);
    group.add(blue);
    const glowTex = sunGlowTexture();
    const redGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xff2a2a, transparent: true, opacity: 0.7, depthWrite: false,
    }));
    redGlow.position.set(-0.4, 2.1, -0.2);
    redGlow.scale.set(3.0, 3.0, 1);
    group.add(redGlow);
    const blueGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0x2a6bff, transparent: true, opacity: 0.7, depthWrite: false,
    }));
    blueGlow.position.set(0.4, 2.1, -0.2);
    blueGlow.scale.set(3.0, 3.0, 1);
    group.add(blueGlow);
    lightBar = { red, blue, redGlow, blueGlow };
  }
  if (type === 'shark') {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
    fin.position.set(0, 2.1, -1.2); fin.rotation.x = -0.4;
    group.add(fin);
  }
  // NOS flame cone at the exhausts (hidden until NOS burns): points BACKWARD,
  // a small bright trail behind the car, not a blob under it. Kept short +
  // faint so it reads as a flame lick, not a flat triangle.
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 8),
    new THREE.MeshBasicMaterial({ color: 0x66c8ff, transparent: true, opacity: 0.55 }));
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0.7, 0.6, -2.7); flame.visible = false;
  group.add(flame);
  // Armour plates appear when the garage armour upgrade is fitted.
  const plates = new THREE.Group();
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.4, metalness: 0.8 });
  for (const x of [-1.12, 1.12]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 4.0), plateMat);
    p.position.set(x, 0.8, 0);
    plates.add(p);
  }
  plates.visible = false;
  group.add(plates);
  // r8b poster scale (visual only — handling/colliders unchanged): the hero
  // reads BIG in the chase frame, cruisers a touch bigger too.
  if (type === 'comet') group.scale.setScalar(1.35);
  else if (type === 'police') group.scale.setScalar(1.15);
  return { group, body, flame, wheels, plates, lightBar };
}
/** A drivable / stealable car in the world. */
export function makeCar(type, x, z, heading, opts) {
  const mesh = buildCarMesh(type, opts);
  mesh.group.position.set(x, 0, z);
  mesh.group.rotation.y = heading;
  return {
    type, mesh, x, z, heading, speed: 0,
    kind: (opts && opts.kind) || 'parked',
    health: 100, driver: (opts && opts.driver) || null,
  };
}
/** Drive a car forward with arcade handling; returns distance moved. */
export function driveCar(car, dt, throttle, steer, topSpeed, colliders) {
  car.speed += throttle * 16 * dt;
  car.speed = clamp(car.speed, -10, topSpeed);
  if (Math.abs(throttle) < 0.05) car.speed *= Math.max(0, 1 - 1.4 * dt);
  car.heading += steer * (0.9 + Math.abs(car.speed) * 0.02) * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const p = { x: nx, z: nz };
  resolveCollisions(colliders, p, 2.2);
  if (Math.abs(p.x - nx) > 0.01 || Math.abs(p.z - nz) > 0.01) car.speed *= 0.5;
  car.x = p.x; car.z = p.z;
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
  return Math.abs(car.speed) * dt;
}
// ---- traffic, police, helicopter, roadblocks --------------------------------
/** Spawn 28 traffic cars looping the road grid, varied real colours, so the
 streets read busy like real life at midday. */
export function spawnTraffic(scene, rng) {
  const cars = [];
  const types = ['sedan', 'taxi', 'pickup', 'sedan', 'taxi', 'sedan', 'pickup', 'taxi', 'sedan', 'taxi'];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const lane = ROAD_LANES[i % ROAD_LANES.length];
    const along = -200 + rng() * 400;
    const vertical = i % 2 === 0;
    const x = vertical ? lane : along;
    const z = vertical ? along : lane;
    const heading = vertical ? (i % 4 < 2 ? 0 : Math.PI) : (i % 4 < 2 ? Math.PI / 2 : -Math.PI / 2);
    const car = makeCar(types[i % types.length], x, z, heading, {
      kind: 'traffic', colour: TRAFFIC_PAINT[i % TRAFFIC_PAINT.length],
    });
    car.speed = 9 + rng() * 5;
    car.dir = vertical ? 'v' : 'h';
    car.lane = lane;
    car.forward = heading;
    scene.add(car.mesh.group);
    cars.push(car);
  }
  return cars;
}
/** Spawn extra traffic near a point (shot staging: pack the frame). */
export function spawnTrafficNear(scene, rng, x, z, n) {
  const cars = [];
  for (let i = 0; i < n; i += 1) {
    const car = makeCar(['sedan', 'taxi', 'pickup', 'taxi'][i % 4],
      x + (rng() - 0.5) * 60, z + (rng() - 0.5) * 14, (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      { kind: 'traffic', colour: TRAFFIC_PAINT[(i + 2) % TRAFFIC_PAINT.length] });
    car.speed = 8 + rng() * 5;
    scene.add(car.mesh.group);
    cars.push(car);
  }
  return cars;
}
/** Traffic cars drive their lane, turn at the city edge, never leave the roads. */
export function updateTraffic(cars, dt, colliders) {
  for (const car of cars) {
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    if (nx < -232 || nx > 232 || nz < -232 || nz > 232) {
      car.heading += Math.PI / 2;
      continue;
    }
    const p = { x: nx, z: nz };
    resolveCollisions(colliders, p, 2.2);
    if (Math.abs(p.x - nx) > 0.01 || Math.abs(p.z - nz) > 0.01) {
      car.heading += Math.PI / 2;
      continue;
    }
    car.x = p.x; car.z = p.z;
    car.mesh.group.position.set(car.x, 0, car.z);
    car.mesh.group.rotation.y = car.heading;
  }
}
/** Spawn a police cruiser near (but not on top of) the player. */
export function spawnPolice(scene, px, pz, rng) {
  const a = rng() * Math.PI * 2;
  const x = clamp(px + Math.cos(a) * 45, -220, 220);
  const z = clamp(pz + Math.sin(a) * 45, -220, 220);
  const car = makeCar('police', x, z, a, { kind: 'police' });
  car.speed = 0;
  scene.add(car.mesh.group);
  return car;
}
/** Flash a cruiser's light bar: red and blue alternate ~7x a second. */
export function flashLightBar(car) {
  const bar = car.mesh && car.mesh.lightBar;
  if (!bar) return;
  const phase = Math.floor(performance.now() / 140) % 2 === 0;
  bar.red.material.color.setHex(phase ? 0xff2a2a : 0x551111);
  bar.blue.material.color.setHex(phase ? 0x112255 : 0x2a6bff);
  bar.redGlow.material.opacity = phase ? 0.85 : 0.12;
  bar.blueGlow.material.opacity = phase ? 0.12 : 0.85;
}
/** A cruiser chases the player: steer toward them, ram on contact. */
export function updatePolice(car, dt, px, pz, colliders) {
  const dx = px - car.x, dz = pz - car.z;
  const want = Math.atan2(dx, dz);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += clamp(diff, -1.6 * dt, 1.6 * dt);
  car.speed = Math.min(car.speed + 14 * dt, 30);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const p = { x: nx, z: nz };
  resolveCollisions(colliders, p, 2.2);
  car.x = p.x; car.z = p.z;
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
  flashLightBar(car);
  return dist2([car.x, car.z], [px, pz]);
}
/** The police helicopter: circles above the player, spotlight cone below.
 r8b: 1.35x bigger body + stronger cone/pool so it reads in the still. */
export function makeHelicopter(scene) {
  const group = new THREE.Group();
  group.scale.setScalar(1.35);
  const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 7),
    new THREE.MeshStandardMaterial({ color: 0x1c4ed8, roughness: 0.4, metalness: 0.5 }));
  group.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x1c4ed8, roughness: 0.4 }));
  tail.position.set(0, 0.4, -6);
  group.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.12, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
  rotor.position.y = 1.2;
  group.add(rotor);
  const light = new THREE.SpotLight(0xfff2b0, 900, 90, 0.35, 0.5, 1.2);
  light.position.set(0, -1, 0);
  group.add(light);
  const target = new THREE.Object3D();
  target.position.set(0, -40, 0);
  group.add(target);
  light.target = target;
  // Visible searchlight cone (additive, transparent) + a bright pool of
  // light on the ground below — the top-3 heli look, readable in a still.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(8, 34, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.26,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  cone.position.set(0, -17, 0);
  group.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(9, 20),
    new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, -33.4, 0);
  group.add(pool);
  scene.add(group);
  return { group, rotor, light, cone, pool, active: false, angle: 0, hover: 34 };
}
export function updateHelicopter(heli, dt, px, pz) {
  if (!heli.active) { heli.group.visible = false; return; }
  heli.group.visible = true;
  heli.angle += dt * 0.5;
  heli.group.position.set(px + Math.cos(heli.angle) * 22, heli.hover || 34, pz + Math.sin(heli.angle) * 22);
  heli.group.lookAt(px, 0, pz);
  heli.rotor.rotation.y += dt * 18;
  // The light pool sits ON the ground under the heli, whatever the hover is.
  // Group is scaled 1.35 (r8b), so divide the hover by the scale.
  if (heli.pool) heli.pool.position.y = -(heli.hover || 34) / 1.35 + 0.12;
}
/** Roadblock: two cruisers parked across the road ahead of the player. */
export function makeRoadblock(scene, px, pz, heading) {
  const group = new THREE.Group();
  const cars = [];
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const ahead = 22;
  const cx = px + fx * ahead, cz = pz + fz * ahead;
  for (const off of [-4, 4]) {
    const car = makeCar('police', cx + rx * off, cz + rz * off, heading + Math.PI / 2, { kind: 'roadblock' });
    cars.push(car);
    group.add(car.mesh.group);
  }
  scene.add(group);
  return { group, cars, x: cx, z: cz, ttl: 25 };
}
export function updateRoadblock(rb, dt) {
  rb.ttl -= dt;
  for (const c of rb.cars) flashLightBar(c);
  return rb.ttl > 0;
}
// ---- dust puffs -------------------------------------------------------------
/** Dust/smoke puffs behind the wheels at speed: 8 soft sprites that cycle
 (rise, grow, fade) while the car is moving fast. Pale daylight dust. */
export function makeDustTrail(scene) {
  const tex = dustTexture();
  const puffs = [];
  for (let i = 0; i < 8; i += 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0xcfc8b8, transparent: true, opacity: 0, depthWrite: false,
    }));
    s.scale.set(2, 2, 1);
    scene.add(s);
    puffs.push({ sprite: s, life: (i / 8) * 0.9, x: 0, z: 0 });
  }
  return {
    puffs,
    update(dt, x, z, heading, speed) {
      const active = speed > 12;
      for (const p of puffs) {
        p.life += dt * (active ? 1.4 : 0.4);
        if (p.life >= 1) {
          p.life = 0;
          const side = Math.random() < 0.5 ? -1 : 1;
          const bx = x - Math.sin(heading) * 2.4 + Math.cos(heading) * side * 0.9;
          const bz = z - Math.cos(heading) * 2.4 - Math.sin(heading) * side * 0.9;
          p.x = bx; p.z = bz;
        }
        const t = p.life;
        p.sprite.position.set(p.x, 0.5 + t * 1.6, p.z);
        const sc = 1.5 + t * 3.5;
        p.sprite.scale.set(sc, sc, 1);
        p.sprite.material.opacity = active ? Math.max(0, 0.42 * (1 - t)) : 0;
      }
    },
  };
}
