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
  (game.roadblocks || []).forEach(hideEntry);
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
  // No shot shows the title screen any more: shot 4 is a gameplay
  // moment now, like the other three.
  hideElement('titleScreen');
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

// Hide every city palm within a radius of a point. The city plants a
// palm row along the boulevard's south sidewalk (z 225.4, every 17 m),
// so a beach camera parked on the sand can sit a metre from a palm
// whose canopy fills the top of the frame — that is what the green
// triangle in the first gameplay shot 4 was. Palms live inside the city
// group, so they are found by position, not by name; only group
// children standing on the ground near the point are hidden.
function clearPalms(game, cx, cz, radius) {
  if (!game.city || !game.city.group) return;
  const r2 = radius * radius;
  for (const child of game.city.group.children) {
    if (child.type !== 'Group') continue;
    if (Math.abs(child.position.y) > 0.01) continue;
    const dx = child.position.x - cx;
    const dz = child.position.z - cz;
    if (dx * dx + dz * dz < r2) child.visible = false;
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
// Shot 1 — bright daylight boulevard chase (r31: the night preset became
// the day preset in the shot pin, clock 16:00). Hero Comet at (92, 215) facing east,
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
  // Parked 2 m further forward (x 92) so its rear bumper clears the
  // bottom dialogue bar with a visible margin.
  const hero = game.heroCar;
  hero.position.set(92, 0, 215);
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
  addBeam(game, { x: 140, y: 16, z: 214 }, { x: 92, y: 1.8, z: 215 });
  addRoofPool(game, 92, 1.8, 215);

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

  // Exactly ONE pedestrian in shot 1, slightly left in the frame and
  // clearly ON the north sidewalk: z 206.5 sits well north of the road
  // edge (the old four at z 209 read as standing in the middle of the
  // road), bright yellow shirt so the single figure reads at full-frame
  // size, clear of the police bike at (94, 208.5) and the hero car.
  dressPerson(game, 0xffd21c, 100, 206.5, WEST, true);

  // Armored tank in the middle of the road with a clear line of sight:
  // forward of the south sidewalk and its lamp posts, centred on the
  // boulevard between the two cruiser rows, angled so the camera sees
  // its long side, turret and barrel instead of looking straight down
  // its nose. The barrel still points west at the hero, and the tank
  // overlaps no cruiser and hides no hero car. Pulled well forward
  // toward the camera (122, 213.5) and a touch north of the road centre
  // so it stands clear of the helicopter beam's bright core and reads
  // at full size as one complete olive tank.
  place(game, makeTank(), 122, 213.5, -0.97);

  // Parked cars lining the north curb, filling the empty kerb between
  // the pedestrians and the cruiser pack — the boulevard reads as a
  // lived-in street, not an empty set. All three sit north of the
  // cruiser rows and clear of the tank, the beam and the hero.
  place(game, makeSedan(0xc9a227, game.textures), 135, 208, WEST);
  place(game, makeSedan(0x3a5a8a, game.textures), 155, 208, WEST);
  place(game, makeSedan(0x8a8f96, game.textures), 175, 208, WEST);

  // Three people on the south sidewalk, unchanged: pink, green, purple.
  dressPerson(game, 0xff5a8a, 108, 225, 0, false);
  dressPerson(game, 0x4ade80, 108, 228, 0, false);
  dressPerson(game, 0xc07bff, 104, 228, 0, false);

  // Five small beachgoers on the sand far east, unchanged.
  const beachgoers = [
    [168, 230, 0xffd21c], [171, 232, 0x4aa3ff], [174, 230, 0xff5a8a],
    [177, 232, 0x4ade80], [180, 230, 0xf2f2ee],
    [186, 231, 0xffd21c], [190, 230, 0x4aa3ff],
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

  // R5 fix round 3: the heli spotlights Mara, the hero in the red shirt.
  // The helicopter's own straight-down beam would land on the road, so
  // hide it and draw the aimed beam from the belly down to Mara instead,
  // the wide end landing on her.
  heli.userData.beam.visible = false;
  addBeam(game, { x: 122, y: 17, z: 208 }, { x: 100, y: 1.0, z: 229 });

  // Mara on foot, facing east, gun out with the muzzle flash showing.
  const mara = game.maraMesh;
  mara.position.set(100, 0, 229);
  mara.rotation.y = EAST;
  mara.visible = true;
  showMuzzleFlash(mara);

  // R5 fix round 3: the spotlight's landing pool on the sand at Mara's
  // feet, a flat pale disc so the beam visibly ends on the hero.
  const spotPool = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfff2c8, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false,
    })
  );
  spotPool.rotation.x = -Math.PI / 2;
  spotPool.position.set(100, 0.06, 229);
  game.scene.add(spotPool);
  game.staged.push(spotPool);

  // One downed officer flat in the open foreground centre, head east.
  place(game, makeDownedOfficer(), 94, 227, WEST);

  // Cash burst of green bills in the air over the scene.
  place(game, makeCashBurst(26, game.rng), 116, 220, 0);

  // Exactly two pedestrians on the road, bright yellow and bright cyan,
  // facing the camera. No formation, no cordon anywhere.
  dressPerson(game, 0xffd21c, 120, 215, WEST, true);
  // R5 fix round 3: the cyan pedestrian stood at (122, 217), where the
  // lamppost pole crossed his head and a cash bill covered his face.
  // The first move, (127, 218), hid him behind the (112, 223) cruiser,
  // and (122, 214) put him on the yellow pedestrian's sightline, so he
  // stands at (118, 213) instead: on the open road between the
  // (116, 209) cruiser and the yellow pedestrian, his face showing,
  // still facing the camera.
  dressPerson(game, 0x19c8e8, 118, 213, WEST, true);

  // Police cordon closing in around Mara (r30): cruisers on the road
  // ahead of her and one close on the sand edge beside her, the far
  // cruiser on the right as before, and two motorcycles flanking her
  // near — a ring the viewer can read at a glance. No unit covers Mara,
  // the body on the ground, or the two pedestrians on the road. The
  // second motorcycle sits in open sand to the right of Mara, clear of
  // the toast panels and any palm trunk, so it reads as its own shape
  // with its rider.
  place(game, makeCruiser(game.textures), 106, 206, WEST);
  place(game, makeCruiser(game.textures), 116, 209, WEST);
  place(game, makeCruiser(game.textures), 112, 223, WEST);
  place(game, makeCruiser(game.textures), 130, 230, WEST);
  place(game, makePoliceBike(), 106, 227, -1.25);
  place(game, makePoliceBike(), 106, 230, -2.36);

  // One more cruiser far east to close the ring on the open side, and a
  // second downed officer plus a smaller cash burst on the sand — the
  // shootout reads as a finished fight, not a single body. The officer
  // sits at (118,233) in open sand north of Mara's sightline: the first
  // spot tried, (124,226), lay directly behind Mara from this camera
  // and was invisible. All three sit clear of Mara, the first body, the
  // pedestrians and the cash burst.
  place(game, makeCruiser(game.textures), 138, 222, WEST);
  place(game, makeDownedOfficer(), 118, 233, WEST);
  place(game, makeCashBurst(12, game.rng), 108, 224, 0);

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

// A low-poly beach palm for the shot-4 backdrop, in the game's own
// blocky style: a leaning brown trunk, a cone crown, a ring of six
// drooping fronds and a small coconut cluster under the crown.
function makeBeachPalm(lean) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 5.6, 6), trunkMat);
  trunk.position.y = 2.8;
  trunk.rotation.z = lean;
  trunk.castShadow = true;
  palm.add(trunk);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.8, 7), crownMat);
  crown.position.y = 6.1;
  crown.rotation.z = lean;
  crown.castShadow = true;
  palm.add(crown);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.8), frondMat);
    frond.position.set(Math.cos(a) * 1.5, 5.7, Math.sin(a) * 1.5);
    frond.rotation.order = 'YXZ';
    frond.rotation.y = -a;
    frond.rotation.x = 0.85;
    palm.add(frond);
  }
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x6d4c2f, roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), nutMat);
    const a = (i / 3) * Math.PI * 2;
    nut.position.set(Math.cos(a) * 0.45, 5.3, Math.sin(a) * 0.45);
    palm.add(nut);
  }
  return palm;
}

// A flat pale foam rim around a moored boat, so the water reads as surf
// lapping the hull instead of a flat plane. The geometry is baked flat,
// so the mesh only needs its heading; it sits a hair above the water
// (y 0.06) so it never z-fights the sea, and the hull hides its middle.
function makeFoam(x, z, heading) {
  const geo = new THREE.CircleGeometry(1, 24);
  geo.rotateX(-Math.PI / 2);
  const foam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.28,
    side: THREE.DoubleSide, depthWrite: false,
  }));
  foam.position.set(x, 0.06, z);
  foam.rotation.y = heading;
  foam.scale.set(2.8, 1, 6.5);
  return foam;
}

// ---------------------------------------------------------------------------
// Shot 4 — dawn boat escape at Playa Dorada, a real gameplay moment (r31):
// Mara on foot on the sand by the dawn boat, the hero Comet parked at the
// beach edge, Tio Reyes and Lena Cruz flanking the car, palms, beachgoers,
// umbrellas and small boats behind. No title screen, the full gameplay
// HUD stays up (mission panel, wanted, money, police, toasts, event log,
// minimap, dialogue bar, speed panel). The pinned cash stays $21,400 so
// the capture tool's freshness check still passes. r32: the hero Comet
// sits 2 m further forward so its rear clears the dialogue bar.
// ---------------------------------------------------------------------------

function stageShot4(game) {
  beginShot(game, 4, { x: -28, z: 235, heading: 0, job: 14 });
  const camera = game.render.camera;
  // Low and close on the car and the crew, looking south to the dawn
  // boat: the old high pullback left the car small, Mara hidden behind
  // it, and a boulevard palm's canopy filling the top-right corner.
  // The camera sits south of the palm row now, and clearPalms hides any
  // palm still close to the lens. Kept far enough back (z 226) that the
  // whole car fits with a margin — at z 230 the car's front ran off the
  // bottom edge.
  camera.position.set(-28, 4.2, 226);
  camera.lookAt(-26, 1.0, 244);
  clearPalms(game, -28, 226, 10);

  // No big speedboat any more (r30): at 3.6x scale, seen stern-on, its
  // white hull, red stripe, cabin and dark outboard motor read as one
  // big beige building block with a red stripe and a dark block beside
  // it. It is removed rather than left as an ambiguous shape; the two
  // small boats below stay — they read clearly as boats.

  // Hero Comet in the foreground, rear to the camera, nose to the sea.
  // Parked 2 m further forward (z 237) so its rear bumper clears the
  // bottom dialogue bar with a visible margin.
  const hero = game.heroCar;
  hero.position.set(-28, 0, 237);
  hero.rotation.y = 0;
  hero.visible = true;

  // Mara on foot east of the car's rear corner, facing the camera, on
  // her way to the dawn boat — in front of the car, never behind it, so
  // she reads as her own figure at a glance.
  const mara = game.maraMesh;
  mara.position.set(-25.5, 0, 233);
  mara.rotation.y = Math.PI;
  mara.visible = true;

  // Two allies on the sand flanking the car, facing the camera, larger
  // than normal: Tio Reyes in teal on the east side, Lena Cruz in orange
  // on the west side. Tio stands a step east so Mara, behind him to the
  // south, is not hidden by him.
  const tio = dressPerson(game, 0x14b8a6, -22, 237, Math.PI, false);
  tio.scale.setScalar(1.3);
  const lena = dressPerson(game, 0xff7a1a, -30.5, 236, Math.PI, false);
  lena.scale.setScalar(1.3);

  // Warm fill light, clear sand around the boat, warm sand glow, and the
  // shadow camera re-centred on the shot area so the beach does not
  // render black.
  game.render.setFill(-28, 4, 229, 30);
  clearUmbrellas(game, -20, 240, 45);

  // Busy beach backdrop (r29): palms, beachgoers, umbrellas and extra
  // boats behind the car and the allies, all clear of the hero, both
  // allies and the big boat, so the start screen reads as a lived-in
  // beach instead of an empty stretch of sand.
  // Shot-4 fix: no palm may stand on or ahead of the dawn boat. Two palms
  // stood here before — one sprouting from the boat's deck in frame, one
  // blocking its bow — and both are removed, not moved.
  const beachPalms = [
    [-10, 258, 0.08, 1.15], [-46, 256, -0.07, 1.05],
  ];
  for (const [x, z, lean, s] of beachPalms) {
    const palm = makeBeachPalm(lean);
    palm.scale.setScalar(s);
    place(game, palm, x, z, 0);
  }
  const beachgoers = [
    [-18, 247, 0xffd21c], [-40, 246, 0x19c8e8], [-14, 262, 0xff5a8a],
    [-44, 262, 0x4ade80], [-24, 264, 0xc07bff], [-50, 250, 0xf2f2ee],
    [-8, 246, 0xff7a1a], [-42, 270, 0x4aa3ff],
    [-12, 250, 0xffd21c], [-48, 258, 0x19c8e8],
  ];
  for (const [x, z, shirt] of beachgoers) {
    dressPerson(game, shirt, x, z, Math.PI, true);
  }
  const beachUmbrellas = [[-16, 252], [-42, 254], [-20, 272], [-36, 272]];
  (game.city.umbrellas || []).slice(0, 4).forEach((um, i) => {
    const spot = beachUmbrellas[i];
    if (!spot) return;
    um.position.set(spot[0], 0, spot[1]);
    um.visible = true;
  });
  // Shot-4 fix: the yellow, green and blue umbrellas above read as
  // umbrellas standing on the dawn boat's deck — the yellow at the
  // boat's left edge, the green mid-boat, the blue at its right edge —
  // so hide those three for this shot only. The red umbrella on the
  // left beach stays. One small radius per spot, so no other umbrella
  // is touched.
  clearUmbrellas(game, -42, 254, 3);
  clearUmbrellas(game, -20, 272, 3);
  clearUmbrellas(game, -36, 272, 3);
  // Shot-4 fix: two small gulls in the dawn sky, one where each of the
  // two red marks sat above the boat, right of the sun. Simple dark
  // silhouettes — a shallow V of two thin wings and a tiny body — small
  // only, high above the boat and clear of the sun and every HUD label.
  // Unlit and fog-free so they stay dark against the bright sky.
  for (const [bx, by, bz, tilt] of [[-34, 17, 284, 0.35], [-40, 16, 284, -0.3]]) {
    const gull = new THREE.Group();
    const gullMat = new THREE.MeshBasicMaterial({ color: 0x1c222c, fog: false });
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.35), gullMat);
    leftWing.position.set(-0.7, 0.28, 0);
    leftWing.rotation.z = 0.5;
    gull.add(leftWing);
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.35), gullMat);
    rightWing.position.set(0.7, 0.28, 0);
    rightWing.rotation.z = -0.5;
    gull.add(rightWing);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.22), gullMat);
    gull.add(body);
    gull.position.set(bx, by, bz);
    gull.rotation.y = tilt;
    game.scene.add(gull);
    game.staged.push(gull);
  }
  // Extra boats sit in the visible band below the SAVE FILE panel, clear
  // of the orange ally and the beachgoers, so they read as boats on the
  // shore instead of hiding behind the big boat and the panel. Out in
  // the sea (z 252+) and near the centre line, so both sit fully in
  // frame instead of one running off the right edge.
  const beachBoats = [[-30, 252, 0.6, 1.5], [-38, 254, 0.4, 1.5], [-26, 258, 0.6, 1.5], [-34, 260, 0.4, 1.5]];
  for (const [x, z, heading, s] of beachBoats) {
    const boat = makeBoat();
    boat.scale.setScalar(s);
    place(game, boat, x, z, heading);
  }
  // Pale surf rims around the four moored boats, so the water reads as
  // lapping the hulls instead of a flat plane.
  for (const [x, z, heading] of [[-30, 252, 0.6], [-38, 254, 0.4], [-26, 258, 0.6], [-34, 260, 0.4]]) {
    const foam = makeFoam(x, z, heading);
    game.scene.add(foam);
    game.staged.push(foam);
  }

  // HERO DAWN BOAT (r32 fix 2): the sleek speedboat Mara boards, out in
  // the open water beyond the moored boats, side-on to the camera
  // (heading PI/2, bow east) so the pointed bow, the rising sheer, the
  // red sheer stripe, the open cockpit, the sloped windshield and the
  // twin outboards all read in profile at full-frame size. At (-30,
  // 276), scale 2.3, it sits a full water gap beyond the moored boats
  // instead of overlapping them in frame, and it clears the umbrellas
  // at (-20, 272)/(-36, 272), the beachgoers and the palms, and it
  // touches no HUD text.
  const heroBoat = makeBoat();
  heroBoat.scale.setScalar(2.3);
  place(game, heroBoat, -30, 276, Math.PI / 2);
  const heroFoam = makeFoam(-30, 276, Math.PI / 2);
  game.scene.add(heroFoam);
  game.staged.push(heroFoam);
  // Marina pier (r30): the long wooden deck reads as a wall-like band
  // across the middle of the frame, so hide it — the backdrop is beach
  // only now. It is found by its position in the city group, not by
  // name, so the live city itself is untouched.
  if (game.city && game.city.group) {
    for (const child of game.city.group.children) {
      if (child.type === 'Group'
        && Math.abs(child.position.x + 18) < 0.5
        && Math.abs(child.position.z - 256) < 0.5) {
        child.visible = false;
      }
    }
  }
  const sand = game.city && game.city.sandMat;
  if (sand && sand.emissive) {
    sand.emissive.set(0x8a6b42);
    sand.emissiveIntensity = 0.85;
  }
  if (typeof game.render.retargetShadow === 'function') {
    game.render.retargetShadow(-20, 240, 130);
  }

  // The dawn preset leaves the sky's sun direction and both sun sprites
  // as not-a-number, so no disc is drawn — rebuild them by hand from the
  // low-sun direction instead of aiming at the camera.
  const dawnDir = new THREE.Vector3(62, 57, 351).normalize();
  const skySun = game.render.skyUniforms && game.render.skyUniforms.sunDir;
  if (skySun && skySun.value) skySun.value.copy(dawnDir);
  const dawnSpot = dawnDir.clone().multiplyScalar(820);
  if (game.render.sunSprite) game.render.sunSprite.position.copy(dawnSpot);
  if (game.render.sunHalo) game.render.sunHalo.position.copy(dawnSpot);

  // Gameplay shot now: the title screen stays hidden (beginShot hides
  // it) and every HUD panel stays up, so this reads as a live moment —
  // Mara, the Comet, the crew and the dawn boat — not a menu.
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
