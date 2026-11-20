// LUMEN BAY r12 — vehicles: the car factory, traffic AI, police cruisers,
// the helicopter and police roadblocks. The hero is a REAL convertible built
// to look metallic, not flat cartoon: MeshPhysicalMaterial paint (metalness
// 0.85, roughness 0.28, clearcoat 1.0) over the PMREM environment map, so the
// body picks up sky reflections; glossy black glass cabin, detailed 5-spoke
// dark-alloy wheels with chrome rings and red calipers, glowing headlights +
// full-width red taillight strip, rear spoiler and splitter. Police light
// bars FLASH red/blue (emissive + glow sprites); the helicopter carries a
// visible additive searchlight cone; dust puffs trail the wheels at speed.
// r12 shot-1/2/4 revision: the hero's headlights get glow sprites too (the
// front-three-quarter chase camera lives on the headlights + grille), and
// the heli gets a white side stripe so its dark-navy body reads against a
// bright sunset sky instead of vanishing into a silhouette.
import * as THREE from 'three';
import { CARS, TRAFFIC_COUNT } from './config.js';
import { clamp, dist2 } from './config.js';
import { resolveCollisions } from './city.js';
import { sunGlowTexture, dustTexture, policeTextTexture } from './textures.js';

const ROAD_LANES = [-234, -174, -114, -54, 6, 66, 126, 186];
const TRAFFIC_PAINT = [0xffd23f, 0x19b8c4, 0xffffff, 0x1a1a1e, 0x37c978, 0xff7a1a, 0xc78bff, 0x3fa7ff, 0xff2a5e, 0xd8d8d8, 0xffd23f, 0x2a6b3a];
/** Real-car paint: metallic clearcoat over the environment map. */
function paintMaterial(colour, opts) {
  const o = opts || {};
  return new THREE.MeshPhysicalMaterial({
    color: colour,
    metalness: o.metalness !== undefined ? o.metalness : 0.85,
    roughness: o.roughness !== undefined ? o.roughness : 0.28,
    clearcoat: 1.0, clearcoatRoughness: 0.08,
    envMapIntensity: o.envMapIntensity !== undefined ? o.envMapIntensity : 1.3,
  });
}
/** A detailed wheel: dark tyre, 5-spoke dark-alloy hub, chrome ring, red caliper. */
function makeWheel() {
  const group = new THREE.Group();
  // r12 revision: the old 1.24 m tyre on a 4.6 m car was monster-truck
  // proportions (3.7 wheels long) and the single biggest "toy" read in the
  // chase shot. A 0.84 m tyre is 5.5 wheels long — a real sports-car stance.
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.36, 16),
    new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.95 }));
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  group.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.38, 12),
    new THREE.MeshStandardMaterial({ color: 0x4a4d55, roughness: 0.3, metalness: 0.9 }));
  hub.rotation.z = Math.PI / 2;
  group.add(hub);
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.25, metalness: 0.9 });
  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.48, 0.34), spokeMat);
    spoke.rotation.x = (i / 5) * Math.PI * 2;
    group.add(spoke);
  }
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.25, metalness: 0.9 });
  for (const x of [0.19, -0.19]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 20), ringMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    group.add(ring);
  }
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xd90429 }));
  caliper.position.set(0, 0.12, 0.08);
  group.add(caliper);
  return group;
}
/** Wheel arches: dark half-rings over each wheel on both flanks. The old
 cars had nothing between the flat slab side and the wheels, so the flank
 read as one blank pink wall. The arch breaks the slab and ties the wheel
 to the body — the top-1 Karimbu car reads by its arches + side line. */
function addWheelArches(group) {
  const archMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.5, metalness: 0.5 });
  for (const [x, z] of [[-1.02, 1.45], [1.02, 1.45], [-1.02, -1.45], [1.02, -1.45]]) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.09, 8, 16, Math.PI), archMat);
    arch.rotation.y = Math.PI / 2;
    arch.position.set(x, 0.42, z);
    group.add(arch);
  }
}
/** Build a car mesh for a car type. Returns { group, body, flame, wheels, plates, lightBar }. */
export function buildCarMesh(type, opts) {
  const def = CARS[type] || CARS.sedan;
  const o = opts || {};
  const group = new THREE.Group();
  // Police cruisers are MOSTLY BLACK (Sand 2026-11-21 ~02:12 WIT: "item
  // lbh banyak" — black clearly dominant, white doors/roof accents only).
  // The CARS.police default colour is white — overridden here. MATTE
  // black, not metallic: the first glossy take (metalness 0.85, envMap
  // 1.3) mirrored the sunset sky and read PALE BLUE from the front, and
  // even the 0.4/0.5 matte take still read dark slate-blue — a black car
  // must read BLACK. Near-zero metalness + high roughness + low env.
  const colour = o.colour !== undefined ? o.colour
    : (type === 'police' ? 0x111114 : def.colour);
  const paint = type === 'police' && o.colour === undefined
    ? paintMaterial(colour, { metalness: 0.15, roughness: 0.7, envMapIntensity: 0.25 })
    : paintMaterial(colour);
  // Classic boxy body for every car: taller (0.85) flat-sided slab —
  // the low 0.75 slab + wedge nose were the modern-sports read.
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 4.4), paint);
  body.position.y = 0.8; body.castShadow = true;
  group.add(body);
  let lightBar = null;
  if (type === 'comet') {
    // The hero Comet RS — LOW SLEEK FERRARI-STYLE SPORTS CAR (Sand
    // 2026-11-21 ~06:20 WIT: "ganti jd mobil sport kya ferarri"). NOT a
    // classic Corolla sedan any more: a long low nose sloping down to a
    // front splitter, sculpted raked hood, LOW raked cabin set back, wide
    // haunches, big wheels, rear spoiler + diffuser, metallic hot-pink/red
    // paint with highlights, slim LED headlights. Copied from the top-1
    // madsrepo red sports car (low wedge, sloped hood, dark raked
    // windshield, big silver wheels, wide stance) and the afaba99
    // sports-car take the coordinator rated GOOD — pushed LOWER + WIDER +
    // LONGER here (body 0.72 tall, 5.1 long, roof 1.36). Police + traffic
    // stay classic boxy sedans (the else branch below); ONLY the hero
    // changes. Same hot-pink paint (0xe8124a), same poster scale.
    body.scale.set(0.98, 0.72, 1.16);
    body.position.y = 0.62;
    // Long low nose: a tapered wedge under the sloped hood.
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.34, 0.7), paint);
    nose.position.set(0, 0.58, 2.3);
    group.add(nose);
    // SLOPED hood (top-1 geometry): a long low panel raked down toward
    // the nose — the rake is what makes the front read as a sports car
    // instead of a box. Rake 0.26 (was 0.22 in afaba99): the front edge
    // drops to ~0.68, the Ferrari wedge line.
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 2.0), paint);
    hood.position.set(0, 0.94, 1.3);
    hood.rotation.x = 0.26;
    group.add(hood);
    const noseWedge = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.3, 0.55), paint);
    noseWedge.position.set(0, 0.52, 2.42);
    noseWedge.rotation.x = 0.18;
    group.add(noseWedge);
    // Front splitter: a low dark lip under the nose — the aggressive
    // Ferrari front. Dark, not chrome: a classic bumper would read sedan.
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.6 }));
    splitter.position.set(0, 0.28, 2.55);
    group.add(splitter);
    // Bright flank highlight: a thin lighter band along each side at
    // mid-height. The old flank was one blank pink slab; the band + the
    // dark side skirt below it give the side a waistline like the top-1 car.
    const flankMat = new THREE.MeshStandardMaterial({ color: 0xff6b9a, metalness: 0.8, roughness: 0.25 });
    for (const s of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 3.4), flankMat);
      band.position.set(s * 1.04, 0.78, 0);
      group.add(band);
      const skirtMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.6 });
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 3.4), skirtMat);
      skirt.position.set(s * 1.02, 0.3, 0);
      group.add(skirt);
      // Side air intake ahead of the rear wheel — the Ferrari side scoop.
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.4, metalness: 0.6 }));
      scoop.position.set(s * 1.04, 0.72, -0.9);
      group.add(scoop);
    }
    // Low dark grille + slim LED headlights on the sloped nose.
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.4, metalness: 0.6 }));
    grille.position.set(0, 0.55, 2.66);
    group.add(grille);
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.15, metalness: 1.0 });
    for (const x of [-0.75, 0.75]) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
      led.position.set(x, 0.72, 2.66);
      group.add(led);
      // Headlight glow sprites: the front-three-quarter chase camera lives
      // on the headlights — the bare LED boxes read flat, the halos read
      // as lights ON. Same treatment the cruisers already get.
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: sunGlowTexture(), color: 0xfff6c8, transparent: true, opacity: 0.9, depthWrite: false,
      }));
      glow.position.set(x, 0.72, 2.78);
      glow.scale.set(2.2, 2.2, 1);
      group.add(glow);
    }
    // Rear: dark panel + twin bright clusters + glow halos + dark
    // diffuser + twin pipes. 3D-BOULEVARD POLISH (2026-11-21): the old
    // single red strip on pink read as a flat red bar from the chase
    // cam. The dark surround makes the lights pop; the clusters +
    // halos read as lights ON, like the top-1/top-2 cars' rears.
    const tailPanel = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.3, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.6 }));
    tailPanel.position.set(0, 0.8, -2.57);
    group.add(tailPanel);
    for (const x of [-0.5, 0.5]) {
      const cluster = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.16, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xff1a1a, emissive: 0xff1a1a, emissiveIntensity: 3.0 }));
      cluster.position.set(x, 0.8, -2.61);
      group.add(cluster);
      const tGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: sunGlowTexture(), color: 0xff2a2a, transparent: true, opacity: 0.65, depthWrite: false,
      }));
      tGlow.position.set(x, 0.8, -2.68);
      tGlow.scale.set(1.3, 1.3, 1);
      group.add(tGlow);
    }
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.6 }));
    diffuser.position.set(0, 0.3, -2.55);
    group.add(diffuser);
    for (const x of [-0.55, 0.55]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x, 0.4, -2.6);
      group.add(pipe);
    }
    // Cabin (top-1 geometry, pushed LOWER): a PAINT-COLOURED roof slab
    // over a narrower glasshouse — the old single dark box was the "Lego
    // cabin". Slanted windshield up front, slanted rear glass, dark side
    // glass with a bright glare band, so the cabin reads as glass + roof,
    // not a black brick. Roof 1.36 (was 1.44 in afaba99) — the low
    // Ferrari roofline.
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, metalness: 0.9, roughness: 0.08, clearcoat: 1 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 1.4), paint);
    roof.position.set(0, 1.36, -0.35);
    group.add(roof);
    const glasshouse = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 1.8), glassMat);
    glasshouse.position.set(0, 1.1, -0.35);
    group.add(glasshouse);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.08), glassMat);
    windshield.position.set(0, 1.02, 0.68);
    windshield.rotation.x = -0.6;
    group.add(windshield);
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.08), glassMat);
    rearGlass.position.set(0, 1.04, -1.32);
    rearGlass.rotation.x = 0.5;
    group.add(rearGlass);
    const glare = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xbfe8ff }));
    glare.position.set(0, 1.24, 0.62);
    glare.rotation.x = -0.6;
    group.add(glare);
    // Rear decklid (3D-boulevard polish): a RAKED deck panel over the
    // rear deck between the rear glass and the tail — the old deck was
    // one broad flat pink plane from the chase cam. The raked panel +
    // twin raised deck ridges break it with highlight/shadow lines, so
    // the rear reads sculpted, not slab. Rear edge slightly lower.
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.15), paint);
    deck.position.set(0, 0.97, -1.95);
    deck.rotation.x = 0.14;
    group.add(deck);
    for (const x of [-0.55, 0.55]) {
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 1.0), paint);
      ridge.position.set(x, 1.01, -1.95);
      ridge.rotation.x = 0.14;
      group.add(ridge);
    }
    // Rear spoiler on struts + side mirrors + door lines.
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.07, 0.42), paint);
    spoiler.position.set(0, 1.12, -2.35);
    group.add(spoiler);
    const bumpMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.6 });
    for (const s of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.1), bumpMat);
      strut.position.set(s * 0.7, 0.98, -2.35);
      group.add(strut);
      // Spoiler readability (chase cam): the pink-on-pink blade vanished
      // against the deck. Dark endplates + a black gurney lip outline
      // the wing so it reads as a wing from the rear, not a pink shelf.
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.46), bumpMat);
      endplate.position.set(s * 0.98, 1.12, -2.35);
      group.add(endplate);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.3), paint);
      mirror.position.set(s * 1.06, 1.0, 0.7);
      group.add(mirror);
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9 }));
      line.position.set(s * 1.03, 0.7, 0.1);
      group.add(line);
    }
    // Black gurney lip on the spoiler's trailing edge — the dark top
    // edge is what the chase cam catches first; it draws the wing's
    // line against the sky instead of letting pink bleed into pink.
    const lip = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.14, 0.04), bumpMat);
    lip.position.set(0, 1.19, -2.56);
    group.add(lip);
    // Visible driver: dark hair + orange jacket, hands on the wheel.
    // Lowered into the LOW cabin (roof 1.36): torso y 0.9, head 1.12 —
    // the whole driver stays inside the glasshouse, never a blob on the roof.
    const driverMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.9 });
    const driver = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.3), driverMat);
    driver.position.set(-0.35, 0.9, -0.2);
    group.add(driver);
    const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 }));
    dHead.position.set(-0.35, 1.12, -0.2);
    group.add(dHead);
    const dHair = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
    dHair.position.set(-0.35, 1.14, -0.2);
    group.add(dHair);
  } else {
    // Generic cars (sedan / taxi / pickup / police): the SAME classic
    // boxy treatment as the hero — upright cabin, near-vertical
    // windshield, flat hood + trunk lids, chrome bumpers, ROUND
    // headlights, distinct grille. No sloped windshield, no LED slits.
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, metalness: 0.9, roughness: 0.12, clearcoat: 1 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 1.9), glassMat);
    cabin.position.set(0, 1.5, -0.2);
    group.add(cabin);
    const roofG = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 1.5), paint);
    roofG.position.set(0, 1.82, -0.2);
    group.add(roofG);
    const shieldG = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.62, 0.08), glassMat);
    shieldG.position.set(0, 1.52, 0.82);
    shieldG.rotation.x = -0.12;
    group.add(shieldG);
    const rearG = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.08), glassMat);
    rearG.position.set(0, 1.52, -1.22);
    rearG.rotation.x = 0.12;
    group.add(rearG);
    // Flat hood + trunk lids.
    const hoodG = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.2), paint);
    hoodG.position.set(0, 1.2, 1.5);
    group.add(hoodG);
    const trunkG = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.0), paint);
    trunkG.position.set(0, 1.2, -1.65);
    group.add(trunkG);
    // Grille + chrome bars on the flat nose.
    const chromeG = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.15, metalness: 1.0 });
    const grilleG = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.28, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.4, metalness: 0.6 }));
    grilleG.position.set(0, 0.78, 2.22);
    group.add(grilleG);
    for (let i = -1; i <= 1; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.03), chromeG);
      bar.position.set(0, 0.7 + i * 0.09, 2.28);
      group.add(bar);
    }
    // ROUND headlights + red taillight pair, chrome bumpers.
    for (const x of [-0.68, 0.68]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.04, 8, 18), chromeG);
      ring.position.set(x, 0.88, 2.24);
      group.add(ring);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 14),
        new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
      head.rotation.x = Math.PI / 2;
      head.position.set(x, 0.88, 2.24);
      group.add(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xff1a1a }));
      tail.position.set(x, 0.88, -2.24);
      group.add(tail);
    }
    const bumpG = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.24, 0.22), chromeG);
    bumpG.position.set(0, 0.42, 2.28);
    group.add(bumpG);
    const bumpRG = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.24, 0.22), chromeG);
    bumpRG.position.set(0, 0.42, -2.28);
    group.add(bumpRG);
    if (type === 'taxi') {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      sign.position.set(0, 2.0, -0.2);
      group.add(sign);
    }
    if (type === 'pickup') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 }));
      bed.position.set(0, 0.95, -1.2);
      group.add(bed);
    }
  }
  if (type === 'police') {
    // MOSTLY-BLACK cruiser (Sand 2026-11-21 ~02:12 WIT: "item lbh
    // banyak"): BLACK body (set at the top of buildCarMesh), WHITE DOORS
    // + white roof as the only white accents — not half-and-half, not
    // white-dominant. POLICE door text in dark navy on the white doors
    // (the texture ink is #0d1a3a, so it reads on white), a BIGGER +
    // BRIGHTER roof light bar with red/blue glow halos, push bar.
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.35, metalness: 0.7 });
    // White accents: low metalness so they read WHITE, not sky-blue
    // (the first take's 0.4-metal white doors reflected the sunset sky).
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6, metalness: 0.1 });
    // White door panels on both flanks (the white accent).
    for (const s of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 2.0), whiteMat);
      door.position.set(s * 1.04, 0.78, 0.1);
      group.add(door);
    }
    // White roof accent (thin panel over the black roof — a white cap
    // from above, a thin line from the low chase camera).
    const roofP = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.3), whiteMat);
    roofP.position.set(0, 1.88, -0.2);
    group.add(roofP);
    const textMat = new THREE.MeshBasicMaterial({ map: policeTextTexture('POLICE'), transparent: true });
    for (const s of [-1, 1]) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), textMat);
      decal.position.set(s * 1.08, 0.78, 0.1);
      decal.rotation.y = s * Math.PI / 2;
      group.add(decal);
    }
    // BIG light bar: wider + taller lenses, stronger emissive, red/blue
    // glow halos above — the siren must read at a glance, not as a
    // subtle strip. Children order is load-bearing: flashLightBar uses
    // children[1] (red) and [2] (blue); the halos are [3] + [4].
    lightBar = new THREE.Group();
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.5), blackMat);
    barBase.position.y = 0;
    lightBar.add(barBase);
    const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.32, 0.48),
      new THREE.MeshStandardMaterial({ color: 0xff1a1a, emissive: 0xff1a1a, emissiveIntensity: 3 }));
    redLens.position.set(-0.38, 0.14, 0);
    lightBar.add(redLens);
    const blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.32, 0.48),
      new THREE.MeshStandardMaterial({ color: 0x1a4dff, emissive: 0x1a4dff, emissiveIntensity: 3 }));
    blueLens.position.set(0.38, 0.14, 0);
    lightBar.add(blueLens);
    for (const [x, colour] of [[-0.38, 0xff1a1a], [0.38, 0x1a4dff]]) {
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: sunGlowTexture(), color: colour, transparent: true, opacity: 0.8, depthWrite: false,
      }));
      halo.position.set(x, 0.35, 0);
      halo.scale.set(2.0, 2.0, 1);
      lightBar.add(halo);
    }
    lightBar.position.set(0, 1.95, -0.2);
    group.add(lightBar);
    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 0.15), blackMat);
    pushBar.position.set(0, 0.5, 2.28);
    group.add(pushBar);
    // Headlight glow sprites so cruisers read at night from the front.
    for (const x of [-0.7, 0.7]) {
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: sunGlowTexture(), color: 0xfff6c8, transparent: true, opacity: 0.55, depthWrite: false,
      }));
      glow.position.set(x, 0.8, 2.4);
      glow.scale.set(1.6, 1.6, 1);
      group.add(glow);
    }
  }
  // Wheels at the four corners + arches tying them to the body.
  // The hero sports car wears BIGGER wheels (1.12x, y 0.42) — the
  // Ferrari stance; police + traffic keep the standard wheels.
  const wheels = [];
  for (const [x, z] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = makeWheel();
    if (type === 'comet') w.scale.setScalar(1.12);
    w.position.set(type === 'comet' ? x * 1.02 : x, type === 'comet' ? 0.42 : 0.38, z);
    group.add(w);
    wheels.push(w);
  }
  addWheelArches(group);
  // Licence plates front + rear.
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 });
  const plates = [];
  for (const z of [2.5, -2.5]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.04), plateMat);
    p.position.set(0, 0.42, z);
    group.add(p);
    plates.push(p);
  }
  // NOS flames at the twin exhaust pipes (hidden unless burning).
  // 3D-BOULEVARD FIX (2026-11-21): the old single cone (radius 0.35,
  // 1.6 long, solid pale blue, sticking ~1.9 m out behind the bumper)
  // read as a glitch triangle under the rear bumper. Twin SMALL flames,
  // one per pipe, additive + translucent so they read as exhaust fire,
  // angled slightly down-back so they hug the diffuser instead of
  // jutting out. A Group, not a Mesh: main.js only toggles .visible,
  // which a Group supports, and the twin cones stay one flame object.
  const flame = new THREE.Group();
  for (const x of [-0.55, 0.55]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 8),
      new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    f.rotation.x = -Math.PI / 2 + 0.35;
    f.position.set(x, 0.38, -2.85);
    flame.add(f);
  }
  flame.visible = false;
  group.add(flame);
  // Poster scale: the hero reads ~30% of frame width on the chase camera.
  if (type === 'comet') group.scale.setScalar(1.35);
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
/** Spawn 28 traffic cars looping the road grid, varied real colours. */
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
  const car = makeCar('police', x, z, a, { kind: 'patrol' });
  car.speed = 20;
  scene.add(car.mesh.group);
  return car;
}
/** A POLICE MOTORCYCLE with rider (Sand 2026-11-21 ~02:12 WIT, shot 1):
 1–2 bikes chase ALONGSIDE the hero car. Black bike, white tank + front
 fairing, red/blue mini light bar + headlight, and a rider in navy with
 a WHITE helmet — the white helmet + light bar are what read "police" at
 a glance. Scaled 1.3x so the bike reads next to the poster-scale cars.
 Local forward is +z, like the cars (heading = rotation.y). */
export function makePoliceBike(x, z, heading) {
  const group = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.35, metalness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.4 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.15, metalness: 1.0 });
  // Wheels: dark tyres + alloy hubs.
  for (const wz of [0.75, -0.75]) {
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 14),
      new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.95 }));
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(0, 0.34, wz);
    group.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.25, metalness: 0.9 }));
    hub.rotation.z = Math.PI / 2;
    hub.position.set(0, 0.34, wz);
    group.add(hub);
  }
  // Frame + white tank + seat + white front fairing.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 1.5), black);
  frame.position.set(0, 0.62, 0);
  group.add(frame);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.7), white);
  tank.position.set(0, 0.82, 0.25);
  group.add(tank);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.6), black);
  seat.position.set(0, 0.78, -0.45);
  group.add(seat);
  const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.3), white);
  fairing.position.set(0, 0.85, 0.78);
  group.add(fairing);
  // Round headlight + glow on the fairing nose.
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(0, 0.85, 0.95);
  group.add(lamp);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTexture(), color: 0xfff6c8, transparent: true, opacity: 0.8, depthWrite: false,
  }));
  glow.position.set(0, 0.85, 1.05);
  glow.scale.set(1.4, 1.4, 1);
  group.add(glow);
  // Mini red/blue light bar on the rear + handlebars.
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.16), black);
  barBase.position.set(0, 1.02, -0.72);
  group.add(barBase);
  const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xff1a1a, emissive: 0xff1a1a, emissiveIntensity: 3 }));
  redLens.position.set(-0.13, 1.1, -0.72);
  group.add(redLens);
  const blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x1a4dff, emissive: 0x1a4dff, emissiveIntensity: 3 }));
  blueLens.position.set(0.13, 1.1, -0.72);
  group.add(blueLens);
  const bars = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), chrome);
  bars.rotation.z = Math.PI / 2;
  bars.position.set(0, 1.05, 0.55);
  group.add(bars);
  // RIDER: navy uniform, WHITE helmet (the police read), arms forward to
  // the bars, legs bent to the pegs.
  const navy = new THREE.MeshStandardMaterial({ color: 0x0d1a3a, roughness: 0.85 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.6, 0.32), navy);
  torso.position.set(0, 1.25, -0.35);
  torso.rotation.x = 0.25;
  group.add(torso);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3, metalness: 0.2 }));
  helmet.position.set(0, 1.68, -0.28);
  group.add(helmet);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.1, metalness: 0.9 }));
  visor.position.set(0, 1.66, -0.05);
  group.add(visor);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 4, 8), navy);
    arm.position.set(s * 0.3, 1.3, 0.15);
    arm.rotation.x = -0.9;
    group.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.4, 4, 8), black);
    leg.position.set(s * 0.24, 0.75, -0.05);
    leg.rotation.x = 0.7;
    group.add(leg);
  }
  group.scale.setScalar(1.3);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  return { group, x, z, heading };
}
/** Flash one cruiser's light bar: alternate red/blue glow each call. */
export function flashLightBar(car) {
  if (!car.mesh.lightBar) return;
  const t = performance.now() * 0.006;
  const on = Math.sin(t + (car.x || 0)) > 0;
  const red = car.mesh.lightBar.children[1];
  const blue = car.mesh.lightBar.children[2];
  if (red && red.material) red.material.emissiveIntensity = on ? 3.5 : 0.4;
  if (blue && blue.material) blue.material.emissiveIntensity = on ? 0.4 : 3.5;
}
/** A police cruiser chases the player, rams at close range, flashes its bar. */
export function updatePolice(car, dt, px, pz, colliders) {
  const d = dist2([car.x, car.z], [px, pz]);
  const want = Math.atan2(px - car.x, pz - car.z);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
  car.speed = d > 30 ? 34 : d > 8 ? 28 : 18;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const p = { x: nx, z: nz };
  resolveCollisions(colliders, p, 2.2);
  car.x = p.x; car.z = p.z;
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
  flashLightBar(car);
  return d;
}
/** The police helicopter: ROUNDED fuselage (scaled sphere, not a box —
 the old box body read as a dark plank against the sunset sky, the single
 biggest "toy" tell in shots 1-2), glass cockpit bubble, thin tail boom,
 tail fin + rotor, skids, white belly stripe, searchlight + cone. */
export function makeHelicopter(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x274b8f, roughness: 0.35, metalness: 0.6 });
  // Rounded fuselage: a sphere squashed into a heli belly — the silhouette
  // the top-1/top-3 helis read by (round nose, tapering tail).
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.9, 18, 14), bodyMat);
  body.scale.set(1.0, 0.85, 1.9);
  body.position.y = 0;
  group.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.92, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.3 }));
  belly.scale.set(0.92, 0.5, 1.82);
  belly.position.y = -0.55;
  group.add(belly);
  // White side stripe: the dark-navy body vanishes against a bright sunset
  // sky, so a pale stripe + bright nose keep the heli a visible 3D model
  // instead of a dark blob (the top-3 helis all read by silhouette + stripe).
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.3 });
  for (const s of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 4.6), stripeMat);
    stripe.position.set(s * 1.78, 0.15, 0.3);
    group.add(stripe);
  }
  // Glass cockpit: a glossy bubble on the nose, not a flat dark slab.
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 12),
    new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, metalness: 0.9, roughness: 0.08, clearcoat: 1 }));
  glass.scale.set(1.0, 0.75, 1.0);
  glass.position.set(0, 0.25, 2.6);
  group.add(glass);
  const glareH = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xbfe8ff }));
  glareH.position.set(-0.5, 0.7, 3.3);
  group.add(glareH);
  // Tail boom: a THIN tapered cylinder, not a box — the old 1x1x6 box was
  // half the "plank" read.
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 6.0, 10), bodyMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.4, -6.0);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 1.2), bodyMat);
  fin.position.set(0, 1.2, -8.6);
  group.add(fin);
  const tailStripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 1.2), stripeMat);
  tailStripe.position.set(0.4, 0.4, -8.6);
  group.add(tailStripe);
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.6, metalness: 0.6 });
  for (const s of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 5.5), skidMat);
    skid.position.set(s * 1.4, -1.4, 0);
    group.add(skid);
    for (const z of [-1.8, 1.8]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), skidMat);
      strut.position.set(s * 1.4, -0.9, z);
      group.add(strut);
    }
  }
  // Thin translucent rotor: two crossed blades, no dark bar. Brighter
  // than the old 0.35 — the dark-navy body vanishes against the night
  // sky, so the rotor disc + lamp + cone are what make the heli read.
  const rotorMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const rotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(13, 0.08, 0.5), rotorMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  rotor.position.y = 1.6;
  group.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.4, 0.3), rotorMat);
  tailRotor.position.set(1.0, 1.2, -8.6);
  group.add(tailRotor);
  // Searchlight: a bright belly lamp + a long additive cone to the ground.
  // The lamp is big and the cone strong (0.5): at night the cone is the
  // heli's main tell — the old 0.28 cone over the bright road was invisible.
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
  lamp.position.set(0, -1.2, 1.5);
  group.add(lamp);
  const coneGeo = new THREE.ConeGeometry(7, 26, 16, 1, true);
  const cone = new THREE.Mesh(coneGeo,
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  cone.rotation.x = Math.PI;
  cone.position.set(0, -14, 1.5);
  group.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.3, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, -26.5, 1.5);
  group.add(pool);
  group.scale.setScalar(1.1); // bigger in frame — the old heli read small + flat
  group.visible = false;
  scene.add(group);
  // SPOTLIGHT BEAM (Sand 2026-11-21 ~02:12 WIT, shot 1): a tapered
  // translucent cone the heli shines DOWN onto the hero car, with a bright
  // pool where it lands. Scene-level (not a child of the heli group) so it
  // can be aimed in world space from the heli belly to the car; hidden by
  // default, aimed every frame by the shot-1 autopilot via G.aimSpotlight().
  // Unit cone (radius 1, height 1, apex at +0.5): aimSpotlight scales it
  // (R, L, R) and points +Y from target to source, so the apex sits at the
  // lamp and the wide base lands on the car. NOT the old vertical cone
  // (that one read as a white lampshade in daylight and never touched the
  // car — it stays hidden in shot 1).
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20, 1, true),
    // NARROW + DIM (first take was a giant pale dome at R=L*0.16 /
    // opacity 0.45 — the lampshade read Sand warned about): a spotlight
    // shaft is narrow, ~8% of its length at the base, translucent
    // (0.28) so the sky + road show through it and it reads as a BEAM.
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.visible = false;
  scene.add(beam);
  const beamPool = new THREE.Mesh(new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
  beamPool.rotation.x = -Math.PI / 2;
  beamPool.visible = false;
  scene.add(beamPool);
  return { group, rotor, tailRotor, cone, pool, beam, beamPool, active: false, hover: 14, angle: 0, speed: 0.35, orbit: 16 };
}
/** Circle the player overhead while active; rotor spins, cone follows. */
export function updateHelicopter(heli, dt, px, pz) {
  if (!heli.active) { heli.group.visible = false; return; }
  heli.group.visible = true;
  heli.angle += dt * heli.speed;
  const r = heli.orbit || 16; // shots stage the orbit wider so the 14 m rotor fits the frame
  const x = px + Math.cos(heli.angle) * r;
  const z = pz + Math.sin(heli.angle) * r;
  heli.group.position.set(x, heli.hover + 8, z);
  heli.group.rotation.y = -heli.angle;
  heli.rotor.rotation.y += dt * 22;
  heli.tailRotor.rotation.x += dt * 30;
}
/** A police roadblock: two cruisers angled across the road + barrier stripes. */
export function makeRoadblock(scene, px, pz, heading) {
  const group = new THREE.Group();
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const bx = px + fx * 22, bz = pz + fz * 22;
  const cars = [];
  for (const off of [-4, 4]) {
    const car = makeCar('police', bx + rx * off, bz + rz * off, heading + Math.PI / 2, { kind: 'roadblock' });
    car.speed = 0;
    scene.add(car.mesh.group);
    cars.push(car);
  }
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.6 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 0.5), stripeMat);
  stripe.position.set(bx, 0.8, bz);
  stripe.rotation.y = heading + Math.PI / 2;
  group.add(stripe);
  group.position.set(0, 0, 0);
  scene.add(group);
  return { group, cars, x: bx, z: bz, t: 0 };
}
/** Roadblocks stand for 20 s, then clear (the police re-set them). */
export function updateRoadblock(rb, dt) {
  rb.t += dt;
  return rb.t < 20;
}
/** Dust puffs behind the wheels at speed (a small sprite pool). */
export function makeDustTrail(scene) {
  const sprites = [];
  const tex = dustTexture();
  for (let i = 0; i < 24; i += 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0xc8b89a, transparent: true, opacity: 0, depthWrite: false,
    }));
    s.position.set(0, -10, 0);
    scene.add(s);
    sprites.push({ sprite: s, life: 0 });
  }
  let idx = 0;
  return {
    update(dt, x, z, heading, speed) {
      for (const p of sprites) {
        if (p.life > 0) {
          p.life -= dt;
          p.sprite.material.opacity = Math.max(0, p.life * 0.5);
          p.sprite.scale.multiplyScalar(1 + dt * 1.5);
        }
      }
      if (speed > 12) {
        const p = sprites[idx % sprites.length];
        idx += 1;
        const bx = x - Math.sin(heading) * 2.5;
        const bz = z - Math.cos(heading) * 2.5;
        p.sprite.position.set(bx + (Math.random() - 0.5) * 2, 0.6, bz + (Math.random() - 0.5) * 2);
        p.sprite.scale.set(2, 2, 1);
        p.life = 0.9;
      }
    },
  };
}
