// LUMEN BAY — shot staging (?shot=1..4). Each shot pins the camera, the
// hero, the police, the heli, the pedestrians and the HUD to one fixed
// scene, then freezes the AI so the render is identical every time.
// Ped cleanup (Sand 15:44 WIT): the north-sidewalk spawn that drifted onto
// the road is DELETED. The 3 right-sidewalk people stay.
import * as THREE from 'three';
import { WORLD, SHOT_PINS } from './config.js';
import { makeComet, makePolice, makeTraffic, makeBike, makeHeli, makeBoat, makeNosFlames } from './vehicles.js';
import { makeMara, makeOfficer, makeDownedCop, makeCashBurst, makePerson } from './people.js';
import { applyPreset, chaseCam } from './render.js';
import { drawCityMap } from './hud.js';

function place(group, x, z, yaw) {
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  return group;
}

// Police cruiser pack ahead on the boulevard, facing the camera (west).
// All vehicles face +z by default, so west is yaw -PI/2.
function cruiserPack(G, list) {
  for (const [x, z] of list) {
    const c = makePolice();
    place(c, x, z, -Math.PI / 2); // nose west, headlights toward the camera
    G.scene.add(c);
    G.shotProps.push(c);
  }
}

function trafficAhead(G, list) {
  for (const [x, z, color] of list) {
    const t = makeTraffic(color);
    place(t, x, z, -Math.PI / 2); // oncoming, headlights toward the camera
    G.scene.add(t);
    G.shotProps.push(t);
  }
}

export function stageShot(G, n) {
  G.shotMode = n;
  G.shotProps = [];
  const pin = SHOT_PINS[n];
  G.state.cash = pin.cash;
  G.state.wanted = pin.wanted;
  G.state.clock = pin.clock;
  G.state.mission = pin.mission;
  G.state.street = pin.street;
  G.state.rep = pin.respect;
  // hide the free-play actors; the shot builds its own cast
  G.player.mesh.visible = false;
  G.player.car.visible = false;
  for (const t of G.traffic) t.mesh.visible = false;
  for (const p of G.peds) p.mesh.visible = false;
  for (const c of G.police) c.mesh.visible = false;
  G.heli.mesh.visible = false;
  G.missions.marker.visible = false;
  G.race.group.visible = false;

  if (n === 1) stageShot1(G);
  else if (n === 2) stageShot2(G);
  else if (n === 3) stageShot3(G);
  else if (n === 4) stageShot4(G);

  // pinned HUD content
  document.getElementById('toasts').innerHTML = '';
  for (const t of pin.toasts) G.toast(t.kind, t.title, t.text);
  G.hud.logLines = [];
  for (const l of pin.log) G.log(l);
  G.setDialogue(pin.dialogue.who, pin.dialogue.colour, pin.dialogue.text);
  document.getElementById('titleScreen').style.display = 'none';
  document.getElementById('mapWrap').style.display = n === 3 ? 'block' : 'none';
  if (n === 3) drawCityMap(G);
  window.__shotReady = false;
  G.shotFrames = 0;
}

// --- SHOT 1: night boulevard chase --------------------------------------------
// Low chase cam behind-and-above the hero looking EAST down the 420 m road.
// Hero Ferrari ~28% of frame, 8-cruiser pack + roadblock ahead, heli ahead
// with its beam slanting back onto the hero, one bike each side in lane.
function stageShot1(G) {
  applyPreset(G, 'night');
  const hero = makeComet();
  place(hero, 90, WORLD.boulevardZ, Math.PI / 2); // nose east, away from the camera
  G.scene.add(hero);
  G.shotProps.push(hero);
  G.shotHero = hero;
  // hero fill light moves to the camera side so the rear + flank read red
  // (higher + further west: a tight pool, no red wash merging with the car)
  G.lights.heroLight.position.set(82, 3.5, WORLD.boulevardZ);
  G.lights.heroLight.intensity = 38;
  // NOS flames stay OFF (the old pale-blue glitch triangle is gone)
  const flames = makeNosFlames();
  flames.position.set(90, 0.4, WORLD.boulevardZ - 2.6);
  flames.visible = false;
  G.scene.add(flames);
  G.shotProps.push(flames);

  // 8-cruiser pack ahead + roadblock
  cruiserPack(G, [
    [132, 211], [140, 219], [150, 210], [158, 219],
    [168, 212], [178, 218], [188, 211], [198, 218],
  ]);
  // roadblock pair, side by side across the road
  cruiserPack(G, [[208, 210.5], [208, 219.5]]);
  trafficAhead(G, [[180, 215, 0x8a8f96], [225, 212, 0x3a6ea5], [245, 218, 0xc8b060]]);

  // heli ahead-east, beam slanting back onto the hero
  const heli = makeHeli();
  place(heli, 115, 200, 0);
  heli.position.y = 20;
  heli.userData.beam.visible = true;
  heli.userData.beam.material.opacity = 0.22;
  // tilt the beam so its pool falls back toward the hero (west + south)
  heli.userData.beam.rotation.z = -0.35;
  heli.userData.beam.rotation.x = -0.2;
  G.scene.add(heli);
  G.shotProps.push(heli);
  G.shotHeli = heli;
  // bright beam pool on the hero's roof
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.28, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(90, 0.06, WORLD.boulevardZ);
  G.scene.add(pool);
  G.shotProps.push(pool);

  // police bikes: ONE LEFT (north lane) + ONE RIGHT (south lane), in lane
  const bikeL = makeBike();
  place(bikeL, 94, WORLD.boulevardZ - 6.5, Math.PI / 2);
  G.scene.add(bikeL); G.shotProps.push(bikeL);
  const bikeR = makeBike();
  place(bikeR, 96, WORLD.boulevardZ + 6.5, Math.PI / 2); // ahead enough to stay in frame
  G.scene.add(bikeR); G.shotProps.push(bikeR);

  // pedestrians: the 3 right-sidewalk people KEPT (pink / green / purple)
  const keep = [
    [108, 225, 0xff6fb5], [108, 228, 0x3fae5a], [104, 228, 0x9b5de5],
  ];
  for (const [x, z, shirt] of keep) {
    const p = makePerson({ shirt, pants: 0x22262e, scale: 1.05 });
    place(p, x, z, Math.PI / 2 + 0.3);
    G.scene.add(p); G.shotProps.push(p);
  }
  // beachgoers on the sand, far east (small in frame)
  for (let i = 0; i < 5; i++) {
    const p = makePerson({ shirt: [0xffd23e, 0x3a9eef, 0xff5a5a, 0x7ad07a, 0xf2f2f2][i], scale: 1 });
    place(p, 168 + i * 3, 230 + (i % 2) * 2, -Math.PI / 2);
    G.scene.add(p); G.shotProps.push(p);
  }
  // NOTE: no north-sidewalk spawn — that is the ped cleanup (Sand 15:44).
  G.clearPedsNear(90, WORLD.boulevardZ, 15);

  // camera: low chase, dist 7.0, behind-and-above the hero
  chaseCam(G, { x: 90, z: WORLD.boulevardZ }, 0, 7.0, 2.7, 10);
  G.shotCam = { pos: { x: 90, z: WORLD.boulevardZ }, heading: 0, dist: 7.0, height: 2.7 };
}

// --- SHOT 2: boulevard shootout -------------------------------------------------
// Mara pulled BACK (camera dist 9), two-handed aim, BIG silver pistol +
// small yellow starburst muzzle flash, 12-officer cordon returning fire,
// ONE downed officer flat in the foreground with a BIG blood pool.
function stageShot2(G) {
  applyPreset(G, 'sunset');
  // Mara, right of frame, aiming east at the cordon
  const mara = makeMara();
  place(mara, 100, 229, Math.PI / 2);
  G.scene.add(mara);
  G.shotProps.push(mara);
  G.shotHero = mara;

  // 12-officer cordon, two rows, all aiming west at Mara
  const cordon = [];
  for (let i = 0; i < 12; i++) {
    const row = i < 6 ? 0 : 1;
    const o = makeOfficer();
    place(o, 112 + row * 7 + (i % 6) * 1.5, 209 + (i % 6) * 4, -Math.PI / 2);
    G.scene.add(o); G.shotProps.push(o); cordon.push(o);
  }
  // two cruisers flanking the cordon
  cruiserPack(G, [[106, 206], [130, 230]]);
  // cash burst in the air over the cordon
  const cash = makeCashBurst(26);
  cash.position.set(116, 0, 220);
  G.scene.add(cash); G.shotProps.push(cash);

  // ONE downed officer, flat in the open foreground, blood pool + droplets
  const downed = makeDownedCop();
  place(downed, 94, 227, Math.PI / 2); // foreground centre, head east toward the cordon
  G.scene.add(downed); G.shotProps.push(downed);

  // heli overhead, beam down on the cordon
  const heli = makeHeli();
  place(heli, 122, 208, Math.PI * 0.6);
  heli.position.y = 18;
  G.scene.add(heli); G.shotProps.push(heli);
  G.shotHeli = heli;

  // pink Comet at the left edge as a foreground anchor
  const comet = makeComet();
  place(comet, 100, 212, Math.PI * 0.5);
  G.scene.add(comet); G.shotProps.push(comet);
  // no umbrella anywhere in this shot — clear the beach dressing near the duel
  G.clearUmbrellasNear(110, 222, 45);

  // camera: west on the beach, low, looking east-southeast across the sand
  // with a NARROWED fov (48 vs the default 62) so the cordon reads ~35px
  // tall like HEAD: cordon mid-frame, Mara large right, downed cop
  // foreground centre, heli top-centre. fov is set here only — the main
  // loop re-pins pos/lookAt every frame but never touches fov, and each
  // shot loads a fresh page, so shots 1/3/4 are unaffected.
  const cam = G.camera;
  cam.position.set(87, 2.6, 230);
  cam.lookAt(118, 2.0, 219);
  cam.fov = 48;
  cam.updateProjectionMatrix();
  G.shotCam = { fixed: true, pos: [87, 2.6, 230], look: [118, 2.0, 219] };
}

// --- SHOT 3: full city map --------------------------------------------------------
// The approved map overlay on a dimmed night street view. The map is drawn
// by hud.drawCityMap; the 3D camera sits on the boulevard looking east.
function stageShot3(G) {
  applyPreset(G, 'night');
  const cam = G.camera;
  cam.position.set(70, 4.5, 203);
  cam.lookAt(200, 2, 215);
  G.shotCam = { fixed: true, pos: [70, 4.5, 203], look: [200, 2, 215] };
  // a few cruisers in the dimmed street view, left of the map panel
  cruiserPack(G, [[96, 211], [104, 219]]);
}

// --- SHOT 4: dawn boat --------------------------------------------------------------
// Speedboat 3.6x, three-quarter heading, BIG and centre frame; banner at 12%
// clear of the boat; big sun + sea; Ferrari + allies in the foreground.
function stageShot4(G) {
  applyPreset(G, 'dawn');

  const boat = makeBoat();
  boat.scale.setScalar(3.6);
  place(boat, -29, 252, -1.12); // three-quarter: bow west, toward the camera-right; docked at the pier
  G.scene.add(boat);
  G.shotProps.push(boat);
  G.shotHero = boat;

  // Ferrari foreground, rear to the camera, nose toward the boat
  const hero = makeComet();
  place(hero, -28, 235, 0);
  G.scene.add(hero); G.shotProps.push(hero);
  // warm fill light on the camera side so the rosso corsa rear reads bright red
  G.lights.heroLight.position.set(-28, 4, 229);
  G.lights.heroLight.intensity = 30;
  // two allies on the sand, flanking the car, facing the camera
  // (facing south, east is screen-left: teal tio goes east/left, orange lena west/right)
  const tio = makePerson({ shirt: 0x2e86ab, pants: 0x22262e, scale: 1.1 });
  place(tio, -24.5, 236, Math.PI);
  G.scene.add(tio); G.shotProps.push(tio);
  const lena = makePerson({ shirt: 0xff7a1a, pants: 0x22262e, scale: 1.1 });
  place(lena, -29, 236, Math.PI);
  G.scene.add(lena); G.shotProps.push(lena);
  // no umbrella in this shot either — the boat is the focal point
  G.clearUmbrellasNear(-20, 240, 45);

  // camera low on the beach, 7 m behind the Ferrari, boat centre frame
  const cam = G.camera;
  cam.position.set(-28, 3.2, 228);
  cam.lookAt(-22, 1.5, 252);
  G.shotCam = { fixed: true, pos: [-28, 3.2, 228], look: [-22, 1.5, 252] };

  // big low sun over the sea, upper-left of frame — re-aim AFTER the camera
  // is set (applyPreset aims the disc at the default camera, not the shot cam).
  // The sky sphere is centred on the origin, so the glow direction must be
  // the CAMERA-to-sun vector or the glow lands on the wrong side of the sky.
  G.sky.sunGroup.position.set(62, 57, 351);
  G.sky.sunGroup.lookAt(cam.position);
  G.sky.uniforms.sunDir.value.set(62 - cam.position.x, 57 - cam.position.y, 351 - cam.position.z).normalize();
  // the low dawn sun leaves the beach half in shadow; lift the sand so the
  // whole foreground reads as bright tan like the reference (dawn shot only)
  if (G.sandMat) { G.sandMat.emissive.setHex(0x8a6a42); G.sandMat.emissiveIntensity = 0.85; }
  // the cash panel runs taller in this shot (clock at its foot), so the
  // toasts sit below it instead of at the fixed 196 px (which overlaps 06:10)
  document.getElementById('toasts').style.top = '252px';
  // the default shadow frustum (±90 m around the world centre) does not reach
  // this far-west beach — outside it the sand samples the shadow-map edge and
  // renders black. Re-centre the shadow camera on the shot area instead.
  G.lights.sun.target.position.set(-20, 0, 240);
  const sc = G.lights.sun.shadow.camera;
  sc.left = -130; sc.right = 130; sc.top = 130; sc.bottom = -130;
  sc.updateProjectionMatrix();
}
