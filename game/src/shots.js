// Lumen Bay staged screenshots.
//
// Each shot pins the camera, the hero, the police, the helicopter, the
// pedestrians and the HUD to one fixed scene, freezes the AI, and lets the
// main loop count six frames before marking the shot ready. The HUD values
// come straight from the game's shot-pin table in config, so they can never
// drift from the pinned values. All positions are in metres: east is +x,
// south is +z, the chase boulevard runs east-west at z = 215.
import * as THREE from 'three';
import { SHOT_PINS } from './config.js';
import { makeCruiser, makeSedan, makeBoat, makeHeli } from './vehicles.js';
import { makePerson, makeMara, makeDownedOfficer, makeCashBurst } from './people.js';
import { makePoliceBike, makeTank } from './police-bike-tank.js';

const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;

// The standing-person builder dresses everyone in a pink shirt by
// default; the torso and arms carry that colour, so a new shirt is a
// recolour of every pink part.
const DEFAULT_SHIRT = 0xff5a8a;

// Hide every live-world object, stop any race, drop any previously staged
// objects, and put the hero car, Mara, the helicopter and the map marker
// away. Each shot then shows only what it stages.
function hideLiveWorld(game) {
  const hideEntry = (entry) => {
    const obj = entry && (entry.group || entry);
    if (obj && obj.visible !== undefined) obj.visible = false;
  };
  game.traffic.forEach(hideEntry);
  game.peds.forEach(hideEntry);
  (game.police || []).forEach(hideEntry);
  (game.officers || []).forEach(hideEntry);
  game.heli.visible = false;
  game.maraMesh.visible = false;
  game.heroCar.visible = false;
  game.marker.visible = false;
  if (game.nosFlames) game.nosFlames.visible = false;
  if (game.race) {
    game.race.active = false;
    if (game.race.ring) game.race.ring.visible = false;
  }
  for (const obj of game.staged) game.scene.remove(obj);
  game.staged.length = 0;
}

function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}

// Shared opening for every shot: clear the world, freeze the AI, mark the
// game started and the shot active, clear the ready flag, apply the shot's
// lighting preset, reset the shadows, pin the player position and job so
// the minimap draws the right diamond and target, close the map overlay
// (except shot 3, where the pin opens it), hide the pause screen, and pin
// the HUD. Shot 4 shows the title screen instead of hiding it.
function beginShot(game, n, player) {
  hideLiveWorld(game);
  const pin = SHOT_PINS[n];
  const state = game.state;
  state.started = true;
  state.frozen = true;
  state.shotActive = true;
  state.shotFrames = 0;
  window.__shotReady = false;
  state.player.x = player.x;
  state.player.z = player.z;
  state.player.heading = player.heading;
  state.jobIndex = player.job;
  game.render.setPreset(pin.preset);
  game.render.resetShadow();
  game.hud.setPin(pin);
  game.hud.setMapOpen(pin.mapOpen === true);
  hideElement('pauseScreen');
  if (n === 4) showElement('titleScreen');
  else hideElement('titleScreen');
  return pin;
}

// Put a staged group on the ground at a spot, facing a heading, and track
// it so the next shot can remove it.
function place(game, obj, x, z, heading) {
  obj.position.set(x, 0, z);
  obj.rotation.y = heading;
  game.scene.add(obj);
  game.staged.push(obj);
  return obj;
}

// Build a standing person in a shirt colour. With brightShirt the shirt
// parts are swapped to an unlit material, so the colour reads at full
// brightness on a night street instead of going dark in the shade; without
// it the shirt is recoloured in place, exactly as the live game dresses
// its pedestrians.
function dressPerson(game, shirtHex, x, z, heading, brightShirt) {
  const person = makePerson();
  person.children.forEach((child) => {
    if (!child.material || !child.material.color) return;
    if (child.material.color.getHex() !== DEFAULT_SHIRT) return;
    if (brightShirt) {
      child.material = new THREE.MeshBasicMaterial({ color: shirtHex });
    } else {
      child.material.color.set(shirtHex);
    }
  });
  return place(game, person, x, z, heading);
}

// A long translucent searchlight beam from the helicopter down to a point
// on the street: a pale cone, narrow at the helicopter end and wide where
// it lands, tilted along the line between the two points.
function addBeam(game, from, to) {
  const start = new THREE.Vector3(from.x, from.y, from.z);
  const end = new THREE.Vector3(to.x, to.y, to.z);
  const delta = new THREE.Vector3().subVectors(start, end);
  const length = delta.length();
  const geo = new THREE.CylinderGeometry(0.25, 2.4, length, 16, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfff2c8, transparent: true, opacity: 0.15,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const beam = new THREE.Mesh(geo, mat);
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  game.scene.add(beam);
  game.staged.push(beam);
  return beam;
}

// The bright pool of light the searchlight leaves on the hero's roof.
function addRoofPool(game, x, y, z) {
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.9, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfff2c8, transparent: true, opacity: 0.4,
      side: THREE.DoubleSide, depthWrite: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(x, y, z);
  game.scene.add(pool);
  game.staged.push(pool);
  return pool;
}

// The helicopter's navy fuselage vanishes against the night sky, so give
// it a pale side panel that catches the eye and enlarge its red and green
// navigation lights. Done once per page load; the panel rides with the
// helicopter wherever staging puts it.
function addHeliLightPanel(game) {
  const heli = game.heli;
  if (heli.userData.shotLightPanel) return;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.6, 2.2),
    new THREE.MeshBasicMaterial({ color: 0xdfe6ee })
  );
  panel.position.set(-1.66, 0.1, 0.2);
  heli.add(panel);
  heli.children.forEach((child) => {
    if (!child.material || !child.material.color) return;
    const hex = child.material.color.getHex();
    if (hex === 0xd21c1c || hex === 0x1cae4e) child.scale.setScalar(1.8);
  });
  heli.userData.shotLightPanel = true;
}

// Hide every beach umbrella within a radius of a point.
function clearUmbrellas(game, cx, cz, radius) {
  if (!game.city || !game.city.umbrellas) return;
  const r2 = radius * radius;
  for (const umbrella of game.city.umbrellas) {
    const dx = umbrella.position.x - cx;
    const dz = umbrella.position.z - cz;
    if (dx * dx + dz * dz < r2) umbrella.visible = false;
  }
}

// Mara's pistol carries its muzzle flash as a hidden group inside the gun;
// showing it is what makes the shot read as a gunshot in progress.
function showMuzzleFlash(mara) {
  for (const child of mara.children) {
    if (child.type !== 'Group') continue;
    for (const part of child.children) {
      if (part.type === 'Group') part.visible = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Shot 1 — night boulevard chase. Hero Comet at (90, 215) facing east,
// camera low behind and above it, eight cruisers in two staggered rows
// ahead, a roadblock pair, three oncoming sedans, two police bikes, the
// helicopter overhead with its beam on the hero's roof, three people on
// the south sidewalk and five beachgoers far east on the sand. Fixes: two
// pedestrians with bright shirts on the open north sidewalk strip, the
// whole helicopter in open sky, and a tank on the south lane with a clear
// line of sight.
// ---------------------------------------------------------------------------
function stageShot1(game) {
  beginShot(game, 1, { x: 90, z: 215, heading: EAST, job: 11 });
  const camera = game.render.camera;
  camera.position.set(83, 2.7, 215);
  camera.lookAt(120, -0.9, 215);

  // Hero car, rear to the camera, with a warm fill light so the red reads.
  const hero = game.heroCar;
  hero.position.set(90, 0, 215);
  hero.rotation.y = EAST;
  hero.visible = true;
  game.render.setFill(82, 3.5, 215, 38);

  // Helicopter in open sky over the road, clear of the buildings and the
  // wanted panel, whole body in frame. It sits side-on to the camera
  // (nose south, tail north) so the fuselage, the tail boom, the red
  // navigation light and the pale side panel all read in profile instead
  // of end-on; its beam still tilts back down onto the hero's roof,
  // where the bright pool stays.
  const heli = game.heli;
  heli.position.set(140, 16, 214);
  heli.rotation.y = 0;
  heli.visible = true;
  addHeliLightPanel(game);
  addBeam(game, { x: 140, y: 16, z: 214 }, { x: 90, y: 1.8, z: 215 });
  addRoofPool(game, 90, 1.8, 215);

  // Eight-cruiser pack in two staggered rows, all facing west, plus the
  // roadblock pair side by side further east.
  const cruiserSpots = [
    [132, 211], [154, 211], [176, 211], [198, 211],
    [143, 218], [165, 218], [187, 218], [196, 218],
    [208, 210.5], [208, 219.5],
  ];
  for (const [x, z] of cruiserSpots) {
    place(game, makeCruiser(game.textures), x, z, WEST);
  }

  // Three oncoming traffic cars: grey, blue, gold, all facing west.
  place(game, makeSedan(0x8a8f96, game.textures), 180, 215, WEST);
  place(game, makeSedan(0x3a5a8a, game.textures), 225, 212, WEST);
  place(game, makeSedan(0xc9a227, game.textures), 245, 218, WEST);

  // One police motorcycle in each lane, facing east.
  place(game, makePoliceBike(), 94, 208.5, EAST);
  place(game, makePoliceBike(), 96, 221.5, EAST);

  // Two pedestrians on the open north sidewalk strip, mid-distance ahead
  // of the hero, in bright yellow and bright cyan shirts that read at
  // full-frame view, clear of the police panel and the motorcycle.
  dressPerson(game, 0xffd21c, 108, 209, WEST, true);
  dressPerson(game, 0x19c8e8, 116, 209.5, WEST, true);

  // Armored tank on the south lane with a clear line of sight: south of
  // the cruiser row, in its own open stretch of road, angled so the
  // camera sees its long side, turret and barrel instead of looking
  // straight down its nose. The barrel still points west at the hero,
  // and the tank overlaps no cruiser and hides no hero car.
  place(game, makeTank(), 150, 223, -0.97);

  // Three people on the south sidewalk, unchanged: pink, green, purple.
  dressPerson(game, 0xff5a8a, 108, 225, 0, false);
  dressPerson(game, 0x4ade80, 108, 228, 0, false);
  dressPerson(game, 0xc07bff, 104, 228, 0, false);

  // Five small beachgoers on the sand far east, unchanged.
  const beachgoers = [
    [168, 230, 0xffd21c], [171, 232, 0x4aa3ff], [174, 230, 0xff5a8a],
    [177, 232, 0x4ade80], [180, 230, 0xf2f2ee],
  ];
  for (const [x, z, shirt] of beachgoers) {
    dressPerson(game, shirt, x, z, Math.PI, false);
  }
}

// ---------------------------------------------------------------------------
// Shot 2 — beach shootout at sunset. Mara on foot at (100, 229) facing
// east, one downed officer flat in the open foreground, a cash burst over
// the scene, the helicopter overhead, the hero Comet at the left edge.
// Fixes: both rows of lined-up officers are gone; exactly two pedestrians
// stand on the road instead; police cars and motorcycles close in around
// Mara from the road side.
// ---------------------------------------------------------------------------
function stageShot2(game) {
  beginShot(game, 2, { x: 100, z: 229, heading: EAST, job: 14 });
  const camera = game.render.camera;
  camera.fov = 48;
  camera.updateProjectionMatrix();
  camera.position.set(87, 2.6, 230);
  camera.lookAt(118, 2.0, 219);

  // Helicopter overhead, beam down on the scene, already visible and good.
  const heli = game.heli;
  heli.position.set(122, 18, 208);
  heli.rotation.y = Math.PI;
  heli.visible = true;

  // Mara on foot, facing east, gun out with the muzzle flash showing.
  const mara = game.maraMesh;
  mara.position.set(100, 0, 229);
  mara.rotation.y = EAST;
  mara.visible = true;
  showMuzzleFlash(mara);

  // One downed officer flat in the open foreground centre, head east.
  place(game, makeDownedOfficer(), 94, 227, WEST);

  // Cash burst of green bills in the air over the scene.
  place(game, makeCashBurst(26, game.rng), 116, 220, 0);

  // Exactly two pedestrians on the road, bright yellow and bright cyan,
  // facing the camera. No formation, no cordon anywhere.
  dressPerson(game, 0xffd21c, 120, 215, WEST, true);
  dressPerson(game, 0x19c8e8, 122, 217, WEST, true);

  // Police closing in around Mara from the road side: a cruiser on the
  // near side angled south-east toward her, and two police motorcycles
  // beside it, also angled toward her. The flanking cruiser and the
  // cruiser on the right stay where they were.
  place(game, makeCruiser(game.textures), 106, 206, WEST);
  place(game, makeCruiser(game.textures), 130, 230, WEST);
  place(game, makeCruiser(game.textures), 99, 213, 0.15);
  place(game, makePoliceBike(), 104, 216, -0.3);
  place(game, makePoliceBike(), 107, 219, -0.6);

  // Hero Comet at the left edge as a foreground anchor, NOS flames off.
  const hero = game.heroCar;
  hero.position.set(100, 0, 212);
  hero.rotation.y = EAST;
  hero.visible = true;

  // Warm fill light and a clear patch of sand around the duel.
  game.render.setFill(95, 4, 220, 26);
  clearUmbrellas(game, 110, 222, 45);
}

// ---------------------------------------------------------------------------
// Shot 3 — full city map over a dimmed night street view. Reproduced
// exactly: two cruisers in the dimmed street view left of the map panel,
// Mara on foot, the map overlay open. The full city map drawing itself is
// an approved layout and is not touched here.
// ---------------------------------------------------------------------------
function stageShot3(game) {
  beginShot(game, 3, { x: 70, z: 203, heading: EAST, job: 14 });
  const camera = game.render.camera;
  camera.position.set(70, 4.5, 203);
  camera.lookAt(200, 2, 215);

  // Soft fill light so the dimmed street view still reads.
  game.render.setFill(88, 4, 208, 16);

  // Two cruisers in the dimmed street view, both facing east.
  place(game, makeCruiser(game.textures), 96, 211, EAST);
  place(game, makeCruiser(game.textures), 104, 219, EAST);

  // Mara on foot, facing east.
  const mara = game.maraMesh;
  mara.position.set(88, 0, 212);
  mara.rotation.y = EAST;
  mara.visible = true;
}

// ---------------------------------------------------------------------------
// Shot 4 — title / start screen over the dawn boat scene. The 3D backdrop
// is the dawn scene exactly as staged before: the big speedboat centre
// frame, the hero Comet in the foreground with its nose to the boat, two
// allies flanking the car, the low sun, the warm sand. The title screen
// itself is shown (with the completed-save state) and every gameplay HUD
// panel is hidden for the shot, while the money panel's cash text still
// holds the pinned $21,400 so the capture tool's freshness check passes.
// ---------------------------------------------------------------------------
const HUD_PANELS = [
  'missionPanel', 'wantedPanel', 'moneyPanel', 'policePanel', 'toasts',
  'eventlog', 'respectBox', 'streetText', 'minimap', 'turfText',
  'dialogueBar', 'speedPanel', 'missionPassed',
];

function stageShot4(game) {
  beginShot(game, 4, { x: -28, z: 235, heading: 0, job: 14 });
  const camera = game.render.camera;
  camera.position.set(-28, 3.2, 228);
  camera.lookAt(-22, 1.5, 252);

  // Speedboat, big and centre frame, turned slightly.
  const boat = makeBoat();
  boat.scale.setScalar(3.6);
  place(game, boat, -29, 252, -1.27);

  // Hero Comet in the foreground, rear to the camera, nose to the boat.
  const hero = game.heroCar;
  hero.position.set(-28, 0, 235);
  hero.rotation.y = 0;
  hero.visible = true;

  // Two allies on the sand flanking the car, facing the camera, larger
  // than normal: Tio Reyes in teal on the east side, Lena Cruz in orange
  // on the west side.
  const tio = dressPerson(game, 0x14b8a6, -24.5, 236, Math.PI, false);
  tio.scale.setScalar(1.3);
  const lena = dressPerson(game, 0xff7a1a, -29, 236, Math.PI, false);
  lena.scale.setScalar(1.3);

  // Warm fill light, clear sand around the boat, warm sand glow, and the
  // shadow camera re-centred on the shot area so the beach does not
  // render black.
  game.render.setFill(-28, 4, 229, 30);
  clearUmbrellas(game, -20, 240, 45);
  const sand = game.city && game.city.sandMat;
  if (sand && sand.emissive) {
    sand.emissive.set(0x8a6b42);
    sand.emissiveIntensity = 0.85;
  }
  if (typeof game.render.retargetShadow === 'function') {
    game.render.retargetShadow(-20, 240, 130);
  }

  // Aim the sun disc and the sky glow at the shot camera from the
  // low-sun direction. If the renderer's own aim call is unavailable,
  // put the disc and halo on the camera-to-sun line by hand.
  try {
    game.render.aimSunAtCamera(camera, game.render.preset);
  } catch (err) {
    const sunDir = new THREE.Vector3(62, 57, 351).sub(camera.position).normalize();
    const sunPos = camera.position.clone().addScaledVector(sunDir, 820);
    if (game.render.sunSprite) game.render.sunSprite.position.copy(sunPos);
    if (game.render.sunHalo) game.render.sunHalo.position.copy(sunPos);
  }

  // Title screen on top, gameplay HUD away. The pinned cash stays in the
  // hidden money panel, so the capture check still reads $21,400.
  showElement('titleScreen');
  for (const id of HUD_PANELS) hideElement(id);
}

// ---------------------------------------------------------------------------
// Entry point, called by the game with the shot number and the game object.
// The argument order is forgiven: a number is the shot, an object is the
// game, and when no game is passed the live game object is used.
// ---------------------------------------------------------------------------
export function applyShot(a, b) {
  let n;
  let game;
  if (typeof a === 'number') {
    n = a;
    game = b;
  } else {
    game = a;
    n = b;
  }
  if (!game) game = window.__lumenGame || window.__lumen;
  if (n === 1) stageShot1(game);
  else if (n === 2) stageShot2(game);
  else if (n === 3) stageShot3(game);
  else if (n === 4) stageShot4(game);
}

// Aliases, so any of the natural names for this entry point resolves.
export const stageShot = applyShot;
export const setupShot = applyShot;
export const prepareShot = applyShot;
export const runShot = applyShot;
export default applyShot;
