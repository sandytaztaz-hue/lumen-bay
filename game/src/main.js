// LUMEN BAY r12 — boot and the one loop. Third-person on foot and by car in
// Puerto Lumen: 15 story missions, turf war, garage upgrades, NOS, robberies,
// properties, street races, wanted police with roadblocks and line-of-sight
// chases, a helicopter with a visible searchlight, combat, radio, saves.
// ?shot=1..4 stages a fixed scene and sets window.__shotReady for
// screenshots. r12: every shot gets its OWN weather + time + camera angle —
// the COVER is now a SUNSET beach-front chase (18:45, eight cruisers + heli,
// camera ahead so the FRONTS of the cars face the lens), shot 2 the sunset
// beach shootout (18:45, Mara + cordon in a two-handed aiming stance),
// shot 3 the FULL CITY MAP (21:40), shot 4 the dawn marina escape (06:10)
// with the boat big in the water, clear of the title and the toasts.
// Gameplay is the proven r11 game; r12 rebuilds the LOOK per shot
// (per-shot lighting presets in config.js/render.js, staged sets in
// shots.js) toward the top-3 layout, with our city/story/missions.
// r12 revision: shot 3 is now a FULL CITY MAP (not the vault), the cover
// runs EIGHT cruisers, and both action shots are golden hour with the heli
// visible in frame.
import * as THREE from 'three';
import { WORLD, STEP, SAVE_KEY, CLOCK, DISTRICTS, ROB_TARGETS, PROPERTIES, WEAPONS, CARS, LANDMARKS, POLICE_ROSTER, freshSave, clamp, dist2, streetNameAt, districtAt } from './config.js';
import { createRandom } from './random.js';
import { createCity, hasLineOfSight, resolveCollisions } from './city.js';
import { buildCarMesh, makeCar, driveCar, spawnTraffic, spawnTrafficNear, updateTraffic, spawnPolice, updatePolice, makeHelicopter, updateHelicopter, makeRoadblock, updateRoadblock, makeDustTrail, makePoliceBike } from './vehicles.js';
import { spawnPedestrians, spawnPedestriansNear, updatePedestrians, spawnEnemy, updateEnemy, makePlayerMesh, movePlayerOnFoot } from './people.js';
import { MissionEngine } from './missions.js';
import { Garage, GARAGE_MENU, REPAIR_PRICE } from './garage.js';
import { Turf, nearestProperty } from './turf.js';
import { Race } from './race.js';
import { AudioEngine, safeFreq } from './audio.js';
import { createHud, updateHud } from './hud.js';
import { createRenderer3D, resizeRenderer, updateCamera, makeBeacon, setBeacon, spawnTracer, spawnMuzzle, spawnDamageNumber } from './render.js';
import { sunGlowTexture, neonSignTexture, sandTexture, palmTexture } from './textures.js';
import { createInput, moveVector, driveVector, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MISSION, ACTION_INTERACT, ACTION_WEAPON1, ACTION_WEAPON2, ACTION_WEAPON3, ACTION_RADIO } from './input.js';
import { stageShot, shotAutopilot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotParam = Number.parseInt(params.get('shot') || '', 10);
const shotMode = Number.isInteger(shotParam) && shotParam >= 1 && shotParam <= 4 ? shotParam : 0;
const seedParam = Number.parseInt(params.get('seed') || '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261120;

const NODE = document.getElementById('game');
const R = createRenderer3D(NODE, { shadows: !params.has('fast'), lowRes: params.has('fast') });
const rng = createRandom(seed);
const city = createCity(R.scene, rng);
const colliders = city.colliders;
const hud = createHud();
const input = createInput(NODE);
const audio = new AudioEngine();
const race = new Race(R.scene);
const beacon = makeBeacon(R.scene);
const heli = makeHelicopter(R.scene);
const dust = makeDustTrail(R.scene);

// ---- save ---------------------------------------------------------------
function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.cash !== 'number') return null;
    return s;
  } catch { return null; }
}
let save = loadSave() || freshSave();
const garage = new Garage(save);
const turf = new Turf(save);

// ---- player ---------------------------------------------------------------
const playerMesh = makePlayerMesh(R.scene);
const player = {
  mesh: playerMesh, x: save.px || -180, z: save.pz || 60, heading: 0,
  health: save.health || 100, armour: save.armour || 0,
  weapon: 'pistol', inCar: false, car: null, fireT: 0, dead: false,
};
playerMesh.group.position.set(player.x, 0, player.z);

// ---- world actors -----------------------------------------------------------
const traffic = spawnTraffic(R.scene, rng);
const peds = spawnPedestrians(R.scene, rng);
const enemies = [];
const police = [];
const bikes = []; // shot-1 police motorcycles (staged only, never in plain play)
const roadblocks = [];
const pickups = [];
let enemiesKilled = 0;
let policeSeq = 0;
function addPickup(kind, x, z) {
  const colour = kind === 'health' ? 0x37c978 : kind === 'armour' ? 0x4d8dff : 0xffd23f;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.MeshBasicMaterial({ color: colour }));
  mesh.position.set(x, 0.9, z);
  R.scene.add(mesh);
  pickups.push({ kind, x, z, mesh, taken: false });
}
addPickup('health', -170, 10); addPickup('health', -40, -160); addPickup('health', 40, -160);
addPickup('health', 170, 20); addPickup('armour', -170, -60); addPickup('armour', 60, 20);
addPickup('smg', -60, -140); addPickup('health', 180, 180); addPickup('armour', -120, 180);
// Parked stealable cars around the city.
const parked = [];
const parkedSpots = [
  ['comet', -180, -170, 0.4], ['sedan', -150, 10, 1.2], ['pickup', 40, -40, -0.6],
  ['taxi', 150, 40, 2.2], ['sedan', -40, 140, 0.9], ['shark', 150, -30, -1.4],
  ['sedan', 90, 140, 0.3], ['pickup', -210, 140, 1.6],
];
for (const [type, x, z, h] of parkedSpots) {
  const car = makeCar(type, x, z, h, { kind: 'parked' });
  R.scene.add(car.mesh.group);
  parked.push(car);
}
const cometCar = parked[0];
// ---- game state -------------------------------------------------------------
const state = {
  screen: 'title', cash: save.cash, wanted: 0, heat: 0,
  speed: 0, nos: garage.nos, nosMax: garage.nosCapacity(),
  radio: 'RADIO SOL 101.9 — Sol Hits', timerText: '',
  bustedT: 0, roadblockT: 8, saveT: 0, festival: false,
  garageOpen: false, robberyPrompt: false, hour: 18, seen: false,
  extraAlerts: [], nosReadyNotified: false, lastWanted: 0,
};
let camYaw = 0;
let camPitch = 0.2;
let camDistOverride = null;
let camHeightOverride = null;
let shotClock = null;
let nosBurning = false;
let lastGunPos = null;
let enteredCarEvent = null;
let robbedTargetEvent = null;
let boughtPropEvent = null;
let raceWonEvent = false;
let raceLostEvent = false;
let dialogue = null;
function setDialogue(name, text) {
  if (!name || !text) { dialogue = null; return; }
  dialogue = { name, text, initial: name.trim().charAt(0) || '?' };
}
function dialogueFromLine(line) {
  const m = /^([A-Z ]+):\s*"([^"]*)"/.exec(line || '');
  if (m) setDialogue(m[1].trim(), m[2]);
}
function saveGame() {
  try {
    save.cash = state.cash;
    save.mission = missions.missionIdx;
    save.completed = [];
    save.upgrades = garage.levels;
    save.nos = garage.nos;
    save.owned = turf.owned;
    save.turf = turf.owners;
    save.px = player.x; save.pz = player.z;
    save.health = player.health; save.armour = player.armour;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch { /* storage off: progress lasts this visit only */ }
}
// ---- wanted / police --------------------------------------------------------
function starsForHeat(heat) {
  if (heat < 10) return 0;
  if (heat < 30) return 1;
  if (heat < 50) return 2;
  if (heat < 70) return 3;
  if (heat < 85) return 4;
  return 5;
}
function addHeat(n) {
  state.heat = clamp(state.heat + n * turf.heatFactorAt(player.x, player.z), 0, 100);
  state.wanted = starsForHeat(state.heat);
}
function setWanted(n) {
  state.wanted = clamp(n, 0, 5);
  state.heat = n === 0 ? 0 : [0, 15, 35, 55, 75, 92][n];
  state.lastWanted = state.wanted;
}
/** Next LCPD call-sign from the roster (top-3 style unit names). */
function nextUnitName() {
  const name = POLICE_ROSTER[policeSeq % POLICE_ROSTER.length];
  policeSeq += 1;
  return name;
}
function spawnPoliceNear(count) {
  for (let i = 0; i < count; i += 1) {
    if (police.length >= 6) break;
    const car = spawnPolice(R.scene, player.x, player.z, rng);
    car.unit = nextUnitName();
    police.push(car);
  }
}
/** Stage cruisers for the shot-1 cover: an eight-cruiser pack around the hero.
 The cover camera now sits AHEAD of the hero (front-three-quarter, Sand's
 order), so every cruiser in the pack faces the SAME way as the hero —
 east, toward the lens — at staggered depths behind him, and the autopilot
 in shots.js re-pins them there every frame. Slots (back = metres behind
 the hero, lat = lateral, + = north / camera side): one tight chaser
 (3, -5), a second chaser (6, +5), three flankers (10, -8), (13, +8),
 (18, -2), and three closers down the middle (9, -2.5), (15, +4),
 (22, +1). No head-on cruisers any more: from a front camera a head-on
 car shows its REAR to the lens. */
function spawnPoliceBehind(count) {
  const heading = player.inCar && player.car ? player.car.heading : player.heading;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const slots = [
    { kind: 'chase', back: 7, lat: -6, face: heading },
    { kind: 'chase2', back: 11, lat: 6, face: heading },
    { kind: 'flank', back: 13, lat: -10, face: heading },
    { kind: 'flank', back: 17, lat: 10, face: heading },
    { kind: 'flank', back: 22, lat: -3, face: heading },
    { kind: 'headon', back: 12, lat: -3, face: heading },
    { kind: 'headon', back: 19, lat: 5, face: heading },
    { kind: 'headon', back: 26, lat: 1, face: heading },
  ];
  for (let i = 0; i < count && i < slots.length; i += 1) {
    if (police.length >= 8) break;
    const s = slots[i];
    const car = makeCar('police',
      player.x - fx * s.back + rx * s.lat,
      player.z - fz * s.back + rz * s.lat,
      s.face, { kind: s.kind });
    car.speed = 34;
    car.unit = nextUnitName();
    R.scene.add(car.mesh.group);
    police.push(car);
  }
}
function spawnRoadblockAhead() {
  if (roadblocks.length >= 2) return;
  const heading = player.inCar && player.car ? player.car.heading : player.heading;
  roadblocks.push(makeRoadblock(R.scene, player.x, player.z, heading));
  hud.log('POLICE ROADBLOCK ahead — ram through or dodge around it.');
  if (!shotMode) hud.notify('ROADBLOCK AHEAD', 'Ram it or dodge — LCPD set a trap', 'danger');
}
function updateWanted(dt) {
  let seen = false;
  for (const c of police) {
    if (hasLineOfSight(colliders, c.x, c.z, player.x, player.z)) { seen = true; break; }
  }
  state.seen = seen;
  // Staged shots pin their wanted level: in shot 3 Mara is on foot at the
  // vault with the cruisers pinned far away, so `seen` is false and the
  // heat decayed 92→78 in ~1.5 s, dropping the HUD to 4 stars mid-still
  // (the 5th star only filled back once a cruiser gained LOS). In shot
  // mode the staged wanted level holds; plain play still decays.
  if (state.wanted > 0 && !shotMode) {
    state.heat = clamp(state.heat + (seen ? 1.5 : -9) * dt, 0, 100);
    const nw = starsForHeat(state.heat);
    if (nw !== state.wanted) {
      state.wanted = nw;
      if (nw === 0) hud.log('You lost them. Heat is clear.');
      else if (nw > state.lastWanted && !shotMode) {
        hud.notify('WANTED LEVEL UP', `${nw} star${nw > 1 ? 's' : ''} — the heat is on`, 'danger');
      }
      state.lastWanted = nw;
    }
  }
  const wantCount = Math.min(state.wanted, 4);
  while (police.length < wantCount) spawnPoliceNear(1);
  // r12: in shot mode the staged pack is sacred — never trim it back to the
  // wanted cap, or the six-cruiser cover collapses to four mid-settle.
  while (police.length > wantCount && !shotMode) {
    const c = police.pop();
    R.scene.remove(c.mesh.group);
  }
  heli.active = state.wanted >= 3;
  audio.setSiren(state.wanted >= 1);
  if (state.wanted >= 3) {
    state.roadblockT -= dt;
    if (state.roadblockT <= 0) {
      state.roadblockT = 14;
      spawnRoadblockAhead();
    }
  } else {
    state.roadblockT = 8;
  }
  for (let i = roadblocks.length - 1; i >= 0; i -= 1) {
    if (!updateRoadblock(roadblocks[i], dt)) {
      const rb = roadblocks.splice(i, 1)[0];
      for (const c of rb.cars) R.scene.remove(c.mesh.group);
      R.scene.remove(rb.group);
    }
  }
}
// ---- combat -----------------------------------------------------------------
function shootAt(targetX, targetY, targetZ, fromX, fromY, fromZ) {
  spawnTracer(R.scene, [fromX, fromY, fromZ], [targetX, targetY, targetZ]);
  spawnMuzzle(R.scene, [fromX, fromY, fromZ]);
  audio.gunshot();
  lastGunPos = [fromX, fromZ];
}
function playerShoot() {
  const w = WEAPONS[player.weapon];
  if (player.fireT > 0) return;
  player.fireT = w.rate;
  const fx = player.x + Math.sin(camYaw) * 1;
  const fz = player.z + Math.cos(camYaw) * 1;
  let best = null;
  let bd = w.range;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = dist2([player.x, player.z], [e.x, e.z]);
    if (d > w.range) continue;
    const ang = Math.atan2(e.x - player.x, e.z - player.z);
    let diff = ang - camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > 0.7) continue;
    if (d < bd) { bd = d; best = e; }
  }
  if (best) {
    shootAt(best.x, 1.4, best.z, fx, 1.4, fz);
    best.health -= w.damage;
    spawnDamageNumber(document.getElementById('fx'), R.camera, best.x, 2.4, best.z, `-${w.damage}`, '#ffd23f');
    if (best.health <= 0) {
      best.alive = false;
      R.scene.remove(best.mesh);
      enemiesKilled += 1;
      hud.feed(`Mara downed a ${best.kind === 'police' ? 'police officer' : 'Tiburones shark'}`);
      if (rng() < 0.4) addPickup('health', best.x + 2, best.z + 2);
    }
  } else {
    shootAt(fx + Math.sin(camYaw) * 30, 1.2, fz + Math.cos(camYaw) * 30, fx, 1.4, fz);
  }
  if (player.weapon !== 'fists') addHeat(2);
}
function enemyShoot(e) {
  if (!hasLineOfSight(colliders, e.x, e.z, player.x, player.z)) return;
  shootAt(player.x, 1.3, player.z, e.x, 1.4, e.z);
  const resist = garage.resist();
  let dmg = (6 + rng() * 5) * (1 - resist);
  if (player.armour > 0) {
    const absorbed = Math.min(player.armour, dmg * 0.6);
    player.armour -= absorbed;
    dmg -= absorbed;
  }
  player.health -= dmg;
  spawnDamageNumber(document.getElementById('fx'), R.camera, player.x, 2.4, player.z, `-${Math.round(dmg)}`, '#ff5252');
  if (player.health <= 0) endRun('wasted');
}
function endRun(kind) {
  state.screen = kind;
  document.getElementById('screen-busted').style.display = 'flex';
  document.getElementById('busted-title').textContent = kind === 'wasted' ? 'WASTED' : 'BUSTED';
  document.getElementById('busted-sub').textContent = kind === 'wasted'
    ? 'Mara is down. The crew pulls her out — $200 hospital bill.'
    : 'The police caught Mara. Bail posted — $200.';
  state.cash = Math.max(0, state.cash - 200);
  audio.setSiren(false);
  audio.stopRadio();
}
// ---- enemies / pickups --------------------------------------------------------
function spawnEnemiesAt(x, z, count, kind) {
  const made = [];
  for (let i = 0; i < count; i += 1) {
    const ex = clamp(x + (rng() - 0.5) * 8, -230, 230);
    const ez = clamp(z + (rng() - 0.5) * 8, -230, 230);
    const e = spawnEnemy(R.scene, ex, ez, kind);
    enemies.push(e);
    made.push(e);
  }
  return made; // shot staging poses the returned squad (aim stance)
}
function spawnPatrols(count) {
  for (let i = 0; i < count; i += 1) {
    const car = makeCar('police', clamp(player.x + (rng() - 0.5) * 80, -220, 220), clamp(player.z + (rng() - 0.5) * 80, -220, 220), rng() * Math.PI * 2, { kind: 'patrol' });
    R.scene.add(car.mesh.group);
    car.unit = nextUnitName();
    police.push(car);
  }
}
function updatePickups() {
  for (const p of pickups) {
    if (p.taken) continue;
    if (dist2([player.x, player.z], [p.x, p.z]) < 2.5) {
      p.taken = true;
      R.scene.remove(p.mesh);
      if (p.kind === 'health') { player.health = Math.min(100, player.health + 40); hud.log('Health +40.'); }
      if (p.kind === 'armour') { player.armour = Math.min(100, player.armour + 50); hud.log('Armour +50.'); }
      if (p.kind === 'smg') { player.weapon = 'smg'; hud.log('Picked up the SMG — press 3.'); }
    }
  }
}
// ---- missions -----------------------------------------------------------------
const ctx = {
  get playerX() { return player.x; },
  get playerZ() { return player.z; },
  get wanted() { return state.wanted; },
  get enemiesKilled() { return enemiesKilled; },
  get enteredCar() { return enteredCarEvent; },
  set enteredCar(v) { enteredCarEvent = v; },
  get robbedTarget() { return robbedTargetEvent; },
  set robbedTarget(v) { robbedTargetEvent = v; },
  get raceWon() { return raceWonEvent; },
  set raceWon(v) { raceWonEvent = v; },
  get raceLost() { return raceLostEvent; },
  set raceLost(v) { raceLostEvent = v; },
  get boughtProp() { return boughtPropEvent; },
  set boughtProp(v) { boughtPropEvent = v; },
  log: (m) => hud.log(m),
  setWanted: (n) => setWanted(n),
  spawnPatrols: (n) => spawnPatrols(n),
  spawnEnemies: (x, z, n, k) => spawnEnemiesAt(x, z, n, k),
  startRace: (pts) => {
    raceWonEvent = false; raceLostEvent = false;
    race.start(pts);
    hud.log('RACE — beat the Tiburones driver through every checkpoint!');
  },
  flipDistrict: (id) => {
    if (turf.flip(id)) {
      const d = DISTRICTS.find((x) => x.id === id);
      hud.log(`TURF WON: ${d ? d.name : id} flies crew colours now. ${turf.held()}/12`);
    }
  },
  addCash: (n) => { state.cash += n; },
  onMissionStart: (m) => {
    if (m.id === 12 || m.id === 13) setFestival(m.id === 13);
    if (m.dialogue && m.dialogue.length) dialogueFromLine(m.dialogue[0]);
    if (!shotMode) hud.notify(`JOB ${m.id}: ${m.title.toUpperCase()}`, m.brief, 'good');
    const s = m.stages[0];
    if (s && s.t === 'race' && !player.inCar) {
      const near = nearestCar(6);
      if (near) enterCar(near);
    }
  },
  onMissionComplete: (m) => {
    audio.missionSting(true);
    hud.showBanner('JOB DONE', `${m.title}  +$${m.reward}`, 4000);
    saveGame();
  },
};
const missions = new MissionEngine(ctx);
// ---- cars: enter / exit ---------------------------------------------------------
function nearestCar(maxD) {
  let best = null;
  let bd = maxD;
  // r12 FIX: police cruisers are stealable too (mission 8, "The Swap") —
  // the old nearestCar only searched parked + traffic, so a cruiser could
  // never be entered and the mission was uncompletable.
  for (const c of [...parked, ...traffic, ...police]) {
    const d = dist2([player.x, player.z], [c.x, c.z]);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function enterCar(car) {
  if (player.inCar) return;
  player.inCar = true;
  player.car = car;
  player.mesh.group.visible = false;
  garage.applyToCar(car);
  enteredCarEvent = car.type;
  if (car.kind === 'traffic') {
    addHeat(12);
    hud.log(`Stole a ${CARS[car.type].name} — the owner is calling it in.`);
  } else if (car.type === 'police') {
    addHeat(20);
    hud.log('Stole a police cruiser — every unit in the city is looking for it.');
  } else {
    hud.log(`Entered the ${CARS[car.type].name}.`);
  }
  const i = traffic.indexOf(car);
  if (i >= 0) traffic.splice(i, 1);
  const j = parked.indexOf(car);
  if (j >= 0) parked.splice(j, 1);
  const k = police.indexOf(car);
  if (k >= 0) police.splice(k, 1);
}
function exitCar() {
  if (!player.inCar || !player.car) return;
  const car = player.car;
  car.speed = 0;
  player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 3;
  player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 3;
  player.inCar = false;
  player.car = null;
  player.mesh.group.visible = true;
  playerMesh.group.position.set(player.x, 0, player.z);
  parked.push(car);
}
// ---- festival -------------------------------------------------------------------
function setFestival(on) {
  state.festival = on;
  if (on) {
    const extra = spawnPedestrians(R.scene, rng);
    for (const p of extra) {
      const x = 150 + (rng() - 0.5) * 70;
      const z = (rng() - 0.5) * 70;
      p.x = x; p.z = z; p.wx = x; p.wz = z;
      p.mesh.position.set(x, 0, z);
      peds.push(p);
    }
    hud.log('Festival de las Luces — lanterns, music, crowds.');
  }
}
// ---- interactions (E) -------------------------------------------------------------
function doInteract() {
  if (state.garageOpen) {
    state.garageOpen = false;
    hud.hideGarage();
    return;
  }
  if (turf.robbery) return;
  if (dist2([player.x, player.z], LANDMARKS.garage.pos) < 14) {
    state.garageOpen = true;
    refreshGarageMenu();
    return;
  }
  const prop = nearestProperty(turf, player.x, player.z);
  if (prop) {
    if (state.cash >= prop.price) {
      state.cash -= prop.price;
      turf.buyProperty(prop.id);
      boughtPropEvent = prop.id;
      hud.log(`BOUGHT ${prop.name} for $${prop.price} — it pays $${prop.income}/hour.`);
      audio.cashSting();
      saveGame();
    } else {
      hud.log(`${prop.name} costs $${prop.price} — you have $${state.cash}.`);
    }
    return;
  }
  const target = turf.nearestRobTarget(player.x, player.z);
  if (target) {
    turf.startRobbery(target);
    hud.log(`Robbing ${target.name}… stay close, 5 seconds.`);
    return;
  }
  if (player.inCar) { exitCar(); return; }
  const car = nearestCar(4.5);
  if (car) enterCar(car);
}
function refreshGarageMenu() {
  const rows = GARAGE_MENU.map((g) => {
    const lvl = garage.levels[g.kind];
    const price = garage.price(g.kind);
    return `${g.key}. ${g.label} — Lv ${lvl}/${3} ${price ? `$${price}` : 'MAX'}`;
  });
  rows.push(`4. Repair + refill NOS — $${REPAIR_PRICE}`);
  rows.push(garage.summary());
  hud.showGarage(rows, Math.floor(state.cash));
}
function garageKey(action) {
  if (action & ACTION_WEAPON1) return 'engine';
  if (action & ACTION_WEAPON2) return 'armour';
  if (action & ACTION_WEAPON3) return 'nos';
  return null;
}
// ---- the game object the shot stager and probes drive ---------------------------
const G = {
  shotMode,
  get shotClock() { return shotClock; },
  holdStill: false,
  noBeacon: false,
  mapMode: false, // shot 3: draw the full-screen city map instead of the 3D scene
  get nosBurning() { return nosBurning; },
  set nosBurning(v) { nosBurning = v; },
  get camYaw() { return camYaw; },
  set camYaw(v) { camYaw = v; },
  set camPitch(v) { camPitch = v; },
  setCamDist(v) { camDistOverride = v; },
  setCamHeight(v) { camHeightOverride = v; },
  setLighting(name) {
    const clock = R.setLighting(name);
    this.setClock(clock);
    return clock;
  },
  setClock(t) {
    shotClock = t;
    hud.setClock(t);
  },
  get dialogue() { return dialogue; },
  player, state, missions, hud, turf, garage, parked, traffic, peds, heli, police, bikes, roadblocks,
  setDialogue,
  spawnTrafficNear(x, z, n) {
    const extra = spawnTrafficNear(R.scene, rng, x, z, n);
    for (const c of extra) traffic.push(c);
    return extra;
  },
  spawnPedsNear(x, z, n) {
    const extra = spawnPedestriansNear(R.scene, rng, x, z, n);
    for (const p of extra) peds.push(p);
    return extra;
  },
  clearTrafficNear(x, z, r) {
    for (let i = traffic.length - 1; i >= 0; i -= 1) {
      if (dist2([traffic[i].x, traffic[i].z], [x, z]) < r) {
        R.scene.remove(traffic[i].mesh.group);
        traffic.splice(i, 1);
      }
    }
  },
  clearPedsNear(x, z, r) {
    for (let i = peds.length - 1; i >= 0; i -= 1) {
      if (dist2([peds[i].x, peds[i].z], [x, z]) < r) {
        R.scene.remove(peds[i].mesh);
        peds.splice(i, 1);
      }
    }
  },
  /** Remove beach umbrellas near a point (shot staging only): the z=224
   umbrella row looms in the foreground of the low beach cameras — one
   giant umbrella hid the shot-4 boat and one sat behind the shot-2
   cordon. The city tracks every umbrella in city.umbrellas (city.js). */
  clearUmbrellasNear(x, z, r) {
    for (const u of (city.umbrellas || [])) {
      if (dist2([u.x, u.z], [x, z]) < r) {
        for (const m of u.meshes) city.group.remove(m);
      }
    }
  },
  /** Remove EVERY beach umbrella (shot staging only): Sand 2026-11-21
   ~02:08 WIT — "payung ilangin", NO umbrella visible in shots 1, 2, 4.
   The city keeps its umbrellas in gameplay; staging hides them all. */
  clearUmbrellasAll() {
    for (const u of (city.umbrellas || [])) {
      for (const m of u.meshes) city.group.remove(m);
    }
    city.umbrellas.length = 0;
  },
  /** Spawn the two shot-1 police motorcycles flanking the hero car
   (Sand 2026-11-21 ~02:12 WIT): one on the camera side, one on the far
   side, a few metres back, facing the hero's heading. The shot-1
   autopilot re-pins them there every frame, like the cruiser pack. */
  spawnPoliceBikes() {
    const heading = player.inCar && player.car ? player.car.heading : player.heading;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const rx = Math.cos(heading), rz = -Math.sin(heading);
    // ALONGSIDE the hero — ONE on EACH SIDE, both IN LANE (Sand
    // 2026-11-21 ~06:20 WIT: "motor kanan kiri"): bike 1 rides the south
    // lane beside the hero's nose (lat −4, back −1), bike 2 the north lane
    // beside the hero's REAR HALF (lat +3, back +2) — in formation, in
    // the road lanes next to the car, never both on one side. The north
    // slot is tight because this front camera sits on the north side:
    // back 0 looms in the near foreground, back +2.5 sits at the right
    // frame edge half cut off, back +5 falls off the frame entirely
    // (three takes proved it). At [2, 3] the north bike sits ~7.9 m from
    // the lens — the hero's own distance — fully in frame, side profile
    // with rider + white helmet, clear of the toasts. The old
    // [[-1,-10],[0,-8]] put BOTH bikes on the south side, 8–10 m out
    // (out of lane, both on the left).
    const slots = [[-1, -4], [2, 3]];
    for (const [back, lat] of slots) {
      const b = makePoliceBike(
        player.x - fx * back + rx * lat,
        player.z - fz * back + rz * lat, heading);
      R.scene.add(b.group);
      bikes.push(b);
    }
    return bikes;
  },
  /** Aim the heli's spotlight beam (heli.beam + heli.beamPool, see
   vehicles.js makeHelicopter) from the heli belly down onto (x, y, z) —
   Sand 2026-11-21 ~02:12 WIT, shot 1: the beam must visibly REACH/TOUCH
   the hero car. Unit cone scaled (R, L, R), +Y pointed from target to
   source so the apex sits at the lamp and the wide base lands on the
   car; the pool disc lands on the ground around the car. Called every
   frame by the shot-1 autopilot (the heli + car both hold position, but
   the aim must follow the live positions, not the staging snapshot). */
  aimSpotlight(x, y, z) {
    const beam = heli.beam, pool = heli.beamPool;
    if (!beam) return;
    const from = new THREE.Vector3(heli.group.position.x, heli.group.position.y - 1.2, heli.group.position.z);
    const to = new THREE.Vector3(x, y, z);
    const dir = new THREE.Vector3().subVectors(from, to);
    const L = dir.length();
    if (L < 1) return;
    dir.normalize();
    beam.visible = true;
    beam.position.copy(from).add(to).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    // NARROW shaft: base radius 8% of beam length (~2 m at 25 m) — the
    // first take at 16% read as a giant white dome, not a beam.
    const R = Math.max(1.0, L * 0.08);
    beam.scale.set(R, L, R);
    if (pool) {
      pool.visible = true;
      pool.position.set(x, 0.12, z);
      const pr = Math.max(2.5, L * 0.08);
      pool.scale.set(pr, pr, 1);
    }
  },
  /** A PERSISTENT muzzle-flash glow at a gun position, so a shootout reads
   in a still (the live 60 ms flash never lands in a screenshot). An
   8-POINT STARBURST, not a soft blob: two crossed emissive blade pairs
   (one axis-aligned, one diagonal) + a hot core + a big glow sprite + a
   real point light, so the flash reads as a gunshot at a glance.
   Round-2 targeted pass: the old 4-blade star read as a small white glow
   blob at 5–7 m — blades are now longer AND thicker, the sprite bigger,
   the light stronger. */
  addMuzzleFlash(x, y, z, scale) {
    const s = scale || 2.2;
    // Shot-2 rebuild (Sand 2026-11-21 ~02:10 WIT: the whole scene was a
    // white-out): the flash glow + point light are TONED DOWN — sprite
    // opacity 0.75 (was 0.95), sprite scale s*0.2 (was s*0.25), light
    // 12 (was 70, then 35) with distance 10 (was 16). Five flashes at
    // full power + the sunset sun were bleaching the whole beach white,
    // and even at 35 the foreground sand under the duel still washed
    // pale. The starburst blades still read; the wash does not come back.
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunGlowTexture(), color: 0xffc21a, transparent: true, opacity: 0.75, depthWrite: false,
    }));
    flash.position.set(x, y, z);
    flash.scale.set(s * 0.2, s * 0.2, 1);
    R.scene.add(flash);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.25 * (s / 2.2), 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
    core.position.set(x, y, z);
    R.scene.add(core);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffb400, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    // An 8-point star: blades facing both axes AND the diagonals, so the
    // flash reads as a starburst from any camera side (shot 2's camera
    // sits north of the duel looking south). Blades are THIN with gaps
    // between the rays — the first 2.8-scale take was a solid yellow
    // blob that swallowed the pistol and the cordon behind it.
    for (const ry of [0, Math.PI / 2]) {
      for (const a of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(s * 0.7, s * 0.13, 0.05), starMat);
        blade.position.set(x, y, z);
        blade.rotation.y = ry;
        blade.rotation.z = a;
        R.scene.add(blade);
      }
    }
    const light = new THREE.PointLight(0xffc21a, 12, 10, 1.5);
    light.position.set(x, y, z);
    R.scene.add(light);
    return flash;
  },
  /** A vault spill on the ground — gold bars + cash stacks piled where the
   vault door blew, so the foreground is full of loot. */
  spawnLootPile(x, z) {
    const gold = new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.9, roughness: 0.25 });
    const cash = new THREE.MeshStandardMaterial({ color: 0x2fae5f, roughness: 0.8 });
    const band = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
    const spots = [[0, 0], [0.9, 0.3], [-0.8, 0.5], [0.3, -0.9], [-0.5, -0.8], [1.3, -0.6], [-1.3, -0.2]];
    spots.forEach(([dx, dz], i) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.45), gold);
      bar.position.set(x + dx, 0.11 + (i % 2) * 0.22, z + dz);
      bar.rotation.y = (i * 0.7) % 1.4;
      R.scene.add(bar);
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.45), cash);
      stack.position.set(x + dx * 0.6, 0.32 + (i % 2) * 0.22, z + dz * 0.6 + 0.9);
      stack.rotation.y = (i * 0.9) % 1.2;
      R.scene.add(stack);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.16), band);
      strap.position.set(stack.position.x, stack.position.y + 0.11, stack.position.z);
      strap.rotation.y = stack.rotation.y;
      R.scene.add(strap);
    });
  },
  /** Cash stacks frozen mid-air — money flying in a shootout still.
   Kept LOW (knee-to-waist height): the old 1.4–2.6 m stacks floated at
   gun height right across the firing line and read as the main action,
   hiding the pistols and flashes behind green boxes. */
  spawnCashBurst(x, z) {
    const cash = new THREE.MeshStandardMaterial({ color: 0x2fae5f, roughness: 0.8 });
    const band = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
    const spots = [[-2, -1, 0.9], [1.5, -2, 1.2], [2.5, 1, 1.0], [-1, 2, 1.4], [0.5, 0.5, 0.8]];
    spots.forEach(([dx, dz, h], i) => {
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.45), cash);
      stack.position.set(x + dx, h, z + dz);
      stack.rotation.set(0.4 + i * 0.2, i * 0.8, 0.3);
      R.scene.add(stack);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.16), band);
      strap.position.copy(stack.position);
      strap.rotation.copy(stack.rotation);
      strap.translateY(0.11);
      R.scene.add(strap);
    });
  },
  /** A guard already DOWN — spawned then laid flat on the ground, so a
   breached vault reads as won, not mid-fight. Never moves or shoots. */
  spawnDowned(x, z, kind) {
    const e = spawnEnemy(R.scene, x, z, kind || 'shark');
    e.alive = false;
    e.mesh.rotation.y = Math.random() * Math.PI * 2;
    e.mesh.rotateX(-Math.PI / 2);
    e.mesh.position.y = 0.3;
    return e;
  },
  /** A DOWNED POLICE OFFICER for shot 2 (Sand 2026-11-21 ~07:33 WIT):
   one cop flat on the sand with a BLOOD SPLATTER around him, so the
   shootout reads as a fight already won in part. STATIC prop, like the
   parked cruiser: built from spawnDowned('police') — which never pushes
   it into the enemies array, so updateEnemy never moves or shoots it —
   then laid flat with the head toward the WEST (toward the cordon) and
   the blood pooled around the torso/head. The body's own pistol is
   hidden: laid flat it would float 0.65 m up beside the torso. Blood is
   flat dark-red circles on the sand (MeshBasicMaterial, unlit so the
   dusk light cannot wash it pale), y 0.09–0.12 — above the sand patch
   (0.06), below the body's underside — plus droplets radiating out. */
  spawnDownedOfficer(x, z) {
    const e = this.spawnDowned(x, z, 'police');
    // Head WEST (toward the cordon): rotation.set(0, PI/2, 0) then
    // rotateX(-PI/2) lays the body flat with local +y (head direction)
    // mapped to world -x. Body then spans feet (x, z) → head (x-1.85, z).
    e.mesh.rotation.set(0, Math.PI / 2, 0);
    e.mesh.rotateX(-Math.PI / 2);
    e.mesh.position.y = 0.3;
    if (e.gun) e.gun.visible = false; // no floating pistol beside the body
    // BLOOD — a flat dark-red pool around the torso/head, built from
    // overlapping circles so the edge reads as an irregular spill, not a
    // disc. Centre sits over the torso (x-1.2) spreading to the head.
    const blood = new THREE.MeshBasicMaterial({ color: 0x8b0000, side: THREE.DoubleSide });
    const bloodDark = new THREE.MeshBasicMaterial({ color: 0x6e0000, side: THREE.DoubleSide });
    const pool = [
      [x - 1.35, z, 1.0, blood, 0.09],
      [x - 1.95, z + 0.3, 0.65, bloodDark, 0.10],
      [x - 0.7, z - 0.4, 0.6, blood, 0.10],
      [x - 1.2, z + 0.55, 0.5, bloodDark, 0.11],
      [x - 1.6, z - 0.55, 0.45, blood, 0.11],
    ];
    for (const [bx, bz, r, mat, by] of pool) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(bx, by, bz);
      R.scene.add(disc);
    }
    // Splatter droplets radiating out from the pool.
    const drops = [
      [x - 2.7, z - 0.5, 0.2], [x - 3.0, z + 0.6, 0.15], [x - 0.25, z + 0.85, 0.18],
      [x - 3.2, z - 0.1, 0.12], [x - 1.0, z + 1.05, 0.15], [x - 2.4, z + 1.0, 0.12],
    ];
    for (const [bx, bz, r] of drops) {
      const drop = new THREE.Mesh(new THREE.CircleGeometry(r, 12), bloodDark);
      drop.rotation.x = -Math.PI / 2;
      drop.position.set(bx, 0.12, bz);
      R.scene.add(drop);
    }
    return e;
  },
  /** A second crew figure standing with the player — static, never moves. */
  spawnAlly(x, z, heading) {
    const a = makePlayerMesh(R.scene);
    a.group.position.set(x, 0, z);
    a.group.rotation.y = heading || 0;
    a.gun.visible = true;
    return a;
  },
  /** A warm point light at a position — street lamps at night, gold glow
   inside the vault. THREE r150+ physical lights need a big intensity. */
  addPointLight(x, y, z, colour, intensity, dist) {
    const light = new THREE.PointLight(colour, intensity || 300, dist || 40, 1.5);
    light.position.set(x, y, z);
    R.scene.add(light);
    return light;
  },
  /** A LIT street lamp at night — warm point light + a visible glow halo at
   the lamp head (y≈7), so the night street reads as lamp-lit, not dark. */
  addLampGlow(x, z) {
    this.addPointLight(x, 6.5, z, 0xffb347, 350, 38);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunGlowTexture(), color: 0xffb347, transparent: true, opacity: 0.8, depthWrite: false,
    }));
    halo.position.set(x, 7, z);
    halo.scale.set(7, 7, 1);
    R.scene.add(halo);
    return halo;
  },
  /** A PARKED police cruiser as a static set piece — light bars glowing,
   never driven (it is NOT in the police array, so updatePolice never moves
   it). Shot 2 flanks its cordon with two of these. */
  parkPoliceCar(x, z, heading) {
    const car = makeCar('police', x, z, heading, { kind: 'cordon' });
    car.speed = 0;
    R.scene.add(car.mesh.group);
    return car;
  },
  /** A sand patch for the dawn shot — the world's south-beach sand plane
   sits only 0.01 above the grass base, so at a grazing camera angle the two
   z-fight and the beach renders GREEN in some takes and TAN in others. This
   staging prop lays the same sand texture at y=0.06 over the beach so the
   dawn beach is deterministically TAN. */
  spawnSandPatch(tint) {
    const tex = sandTexture(createRandom(20261120));
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(480, 60),
      // envMapIntensity 0.25: the bright sunset sky reflected off the sand
      // at a grazing camera angle was blowing the beach white (shot 2's
      // wash-out). The patch keeps its tan texture; it just stops
      // mirroring the sky. `tint` (shot 2 only) multiplies the light
      // #f0d49a texture down to a solid tan — the pale-cream foreground
      // survived the dusk preset + dimmed lights, so the texture itself
      // needed darkening where the camera looks down the beach at it.
      new THREE.MeshStandardMaterial({ map: tex, roughness: 1, envMapIntensity: 0.25, color: tint || 0xffffff }));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(0, 0.06, 210);
    patch.receiveShadow = true;
    R.scene.add(patch);
    return patch;
  },
  /** A BEACHFRONT ROAD for the sunset chase (top-1 Karimbu / top-2
   Tangerine Mile layout): an asphalt strip with a double-yellow centre
   line + white edge dashes + sidewalks, running east-west along the sand
   so the chase sits IN a world — road, palms, beach, sea — never on an
   empty beige plane. The old cover had no road at all. */
  spawnBeachRoad(x0, x1, z) {
    const len = x1 - x0;
    const cx = (x0 + x1) / 2;
    // COOLER GREY asphalt (3D-boulevard polish 2026-11-21): the old
    // 0x2e2f33 under the warm sunset sun + warm hemi read BROWN/muddy
    // like dirt, not a road — top 1 Karimbu's road is cool grey. The
    // lighter blue-grey 0x60646d holds grey under the same warm light,
    // and the sidewalks go greyer too (0xb8a88e was warm tan).
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(len, 14),
      new THREE.MeshStandardMaterial({ color: 0x60646d, roughness: 0.9 }));
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set(cx, 0.07, z);
    asphalt.receiveShadow = true;
    R.scene.add(asphalt);
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.7 });
    for (const dz of [-0.35, 0.35]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.18), yellow);
      line.position.set(cx, 0.09, z + dz);
      R.scene.add(line);
    }
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
    for (let x = x0 + 4; x < x1; x += 8) {
      for (const dz of [-5.5, 5.5]) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(3, 0.03, 0.15), white);
        dash.position.set(x, 0.09, z + dz);
        R.scene.add(dash);
      }
    }
    const walkMat = new THREE.MeshStandardMaterial({ color: 0xa39a8c, roughness: 1 });
    for (const dz of [-8.5, 8.5]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(len, 3), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(cx, 0.065, z + dz);
      R.scene.add(walk);
    }
    return asphalt;
  },
  /** A palm row along the beachfront road (top-1/2: palms line the road).
   Same trunk + frond construction as the city palms. */
  spawnPalmRow(x0, x1, z, step) {
    const palmTex = palmTexture(rng);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 1 });
    const frondMat = new THREE.MeshBasicMaterial({ map: palmTex, transparent: true, side: THREE.DoubleSide });
    const palms = [];
    for (let x = x0; x <= x1; x += (step || 24)) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 9, 8), trunkMat);
      trunk.position.set(x, 4.5, z);
      trunk.rotation.z = (rng() - 0.5) * 0.12;
      R.scene.add(trunk);
      const fronds = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), frondMat);
      fronds.position.set(x, 9.5, z);
      fronds.rotation.x = -Math.PI / 2;
      R.scene.add(fronds);
      palms.push(trunk);
    }
    return palms;
  },
  /** A rain puddle — a flat, near-mirror plane on the road that catches the
   heli spotlight + lamp glows as bright streaks, so the night street reads
   WET (recent rain), not just dark. */
  spawnPuddle(x, z, w, d) {
    const puddle = new THREE.Mesh(new THREE.PlaneGeometry(w || 6, d || 3),
      new THREE.MeshStandardMaterial({ color: 0x0a1a2e, roughness: 0.08, metalness: 0.9, emissive: 0x14344d, emissiveIntensity: 0.3 }));
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, 0.05, z);
    R.scene.add(puddle);
    return puddle;
  },
  /** A soft sun-glitter path on the water (shot 4): a long additive
   * radial-glow ellipse lying on the sea between the boat and the low
   * dawn sun, so the water reads as reflecting the sunrise instead of
   * a flat teal plane. sunGlowTexture() is a radial gradient, so the
   * stretched ellipse fades at the edges — no hard stripe. */
  spawnSunGlitter(x, z, w, len) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w || 14, len || 40),
      new THREE.MeshBasicMaterial({ map: sunGlowTexture(), color: 0xffc98a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, 0.09, z);
    R.scene.add(g);
    return g;
  },
  /** Dust motes hanging in the vault's light beams — small warm additive
   sprites scattered through a box over the loot. */
  spawnDustMotes(x, z, n) {
    const motes = [];
    for (let i = 0; i < (n || 8); i += 1) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: sunGlowTexture(), color: 0xffd9a0, transparent: true,
        opacity: 0.25 + (i % 3) * 0.12, depthWrite: false,
      }));
      s.position.set(x + (rng() - 0.5) * 16, 1.5 + rng() * 5, z + (rng() - 0.5) * 12);
      s.scale.set(1.2 + (i % 3) * 0.7, 1.2 + (i % 3) * 0.7, 1);
      R.scene.add(s);
      motes.push(s);
    }
    return motes;
  },
  /** A bank of morning mist over the water — one big soft pink-white sprite
   lying low over the sea, so the dawn shot reads MISTY, not just pink. */
  spawnMist(x, z, w) {
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunGlowTexture(), color: 0xffd9c0, transparent: true, opacity: 0.28, depthWrite: false,
    }));
    mist.position.set(x, 2.5, z);
    mist.scale.set(w || 90, 16, 1);
    R.scene.add(mist);
    return mist;
  },
  /** A moored speedboat for the dawn marina escape — TAPERED-BOW hull
   (the old box hull + rotated-box bow read as a flat red platform), white
   hull with a red stripe, open cockpit, windshield, outboard motor. The
   bow taper is real geometry: the hull's front vertices pinch toward the
   centreline, so the boat reads as a BOAT from the side and the front.
   It floats on the sea at y≈-0.2. */
  spawnBoat(x, z, heading, s) {
    const group = new THREE.Group();
    group.scale.setScalar(s || 1);
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.2 });
    const red = new THREE.MeshStandardMaterial({ color: 0xe8124a, roughness: 0.4, metalness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.6 });
    const hullGeo = new THREE.BoxGeometry(3.2, 1.0, 9);
    const pos = hullGeo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const vz = pos.getZ(i);
      if (vz > 0) {
        const f = 1 - (vz / 4.5) * 0.62; // pinch the bow toward a point
        pos.setX(i, pos.getX(i) * f);
        if (vz > 3.5) pos.setY(i, pos.getY(i) * 0.7); // bow rakes down
      }
    }
    hullGeo.computeVertexNormals();
    const hull = new THREE.Mesh(hullGeo, white);
    hull.position.y = 0.3; group.add(hull);
    const stripeGeo = new THREE.BoxGeometry(3.3, 0.25, 9.1);
    const spos = stripeGeo.attributes.position;
    for (let i = 0; i < spos.count; i += 1) {
      const vz = spos.getZ(i);
      if (vz > 0) spos.setX(i, spos.getX(i) * (1 - (vz / 4.55) * 0.62));
    }
    stripeGeo.computeVertexNormals();
    const stripe = new THREE.Mesh(stripeGeo, red);
    stripe.position.y = 0.55; group.add(stripe);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 5.5), white);
    deck.position.set(0, 0.85, -0.8); group.add(deck);
    // Windshield (3D-boulevard fix 2026-11-21): the old single pale
    // slab (2.6x1.0 glass 0xd8ecf5) blew WHITE in the dawn light and
    // read as a sail/fin sticking out of the boat, not a windshield.
    // Now TWO raked DARK-tinted panes in a shallow V (centre crease,
    // like a real speedboat screen) with a white frame + centre post,
    // lower profile — the glass reads as glass, the white frame reads
    // take used a near-mirror physical glass (metalness 0.9) that
    // reflected the bright dawn env and blew WHITE again — this one
    // is low-metal, low-env dark glass, so it stays a dark screen
    // against the sunrise.
    const boatGlass = new THREE.MeshStandardMaterial({ color: 0x14202c, roughness: 0.25, metalness: 0.3, envMapIntensity: 0.3 });
    for (const s of [-1, 1]) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.72, 0.08), boatGlass);
      pane.position.set(s * 0.62, 1.22, 1.15);
      pane.rotation.set(-0.25, s * 0.32, 0);
      group.add(pane);
    }
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.09, 0.12), white);
    frameTop.position.set(0, 1.58, 1.12);
    frameTop.rotation.x = -0.25;
    group.add(frameTop);
    const framePost = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.72, 0.1), white);
    framePost.position.set(0, 1.22, 1.18);
    framePost.rotation.x = -0.25;
    group.add(framePost);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 1.8), white);
    cabin.position.set(0, 1.2, -0.6);
    group.add(cabin);
    const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x14202c, roughness: 0.25, metalness: 0.3, envMapIntensity: 0.3 }));
    cabinGlass.position.set(-1.12, 1.2, -0.6);
    group.add(cabinGlass);
    for (const sx of [-0.7, 0.7]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.8 }));
      seat.position.set(sx, 1.0, -1.2); group.add(seat);
    }
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x333336, roughness: 0.6 }));
    motor.position.set(0, 0.1, -4.8); group.add(motor);
    group.position.set(x, -0.2, z);
    group.rotation.y = heading || 0;
    R.scene.add(group);
    return group;
  },
  /** The Torre Lumen VAULT as a staged interior set — dark marble floor with
   a gold border, three 13-high walls (the south side stays OPEN as a cutaway
   so the high camera looks straight down into the room), a big round gold
   vault door with spokes on the north wall. No ceiling: the high-wide camera
   shoots over the walls. No VAULT sign plane — it collided with the DOM
   WANTED stars. The room is a set in the world, not a building — the sky
   dome is hidden for this shot, so the world outside reads as dark void. */
  spawnVaultRoom(cx, cz) {
    const group = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 20),
      new THREE.MeshStandardMaterial({ color: 0x2a2438, roughness: 0.4, metalness: 0.3 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.03, cz);
    group.add(floor);
    const gold = new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.9, roughness: 0.25 });
    for (const [w, d, x, z] of [[26, 0.4, cx, cz - 9.8], [26, 0.4, cx, cz + 9.8], [0.4, 20, cx - 12.8, cz], [0.4, 20, cx + 12.8, cz]]) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), gold);
      trim.position.set(x, 0.1, z);
      group.add(trim);
    }
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a2a3a, roughness: 0.8 });
    const north = new THREE.Mesh(new THREE.BoxGeometry(26, 13, 0.8), wallMat);
    north.position.set(cx, 6.5, cz - 10); group.add(north);
    const west = new THREE.Mesh(new THREE.BoxGeometry(0.8, 13, 20), wallMat);
    west.position.set(cx - 13, 6.5, cz); group.add(west);
    const east = new THREE.Mesh(new THREE.BoxGeometry(0.8, 13, 20), wallMat);
    east.position.set(cx + 13, 6.5, cz); group.add(east);
    const door = new THREE.Mesh(new THREE.CircleGeometry(3.5, 24), gold);
    door.position.set(cx, 3.5, cz - 9.5); group.add(door);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.3, 8, 32), gold);
    ring.position.set(cx, 3.5, cz - 9.5); group.add(ring);
    for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7, 0.15), gold);
      spoke.position.set(cx, 3.5, cz - 9.4);
      spoke.rotation.z = a;
      group.add(spoke);
    }
    R.scene.add(group);
    return group;
  },
  /** Remove every live enemy from the scene, silently, with NO kill credit. */
  clearEnemies() {
    for (const e of enemies) R.scene.remove(e.mesh);
    enemies.length = 0;
  },
  warpTo(x, z) {
    player.x = x; player.z = z;
    if (player.inCar && player.car) { player.car.x = x; player.car.z = z; player.car.mesh.group.position.set(x, 0, z); }
    playerMesh.group.position.set(x, 0, z);
  },
  enterCar,
  exitCar,
  setWanted,
  spawnPoliceNear,
  spawnPoliceBehind,
  spawnRoadblockAhead,
  spawnEnemiesAt,
  setFestival,
  addAlert(kind, text) {
    state.extraAlerts.push({ kind, text });
  },
  startPlay() {
    document.getElementById('screen-title').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    state.screen = 'play';
    audio.ensure();
    if (!audio.radioOn) audio.startRadio();
    hud.log('Welcome to Puerto Lumen. Press M to start Job 1.');
  },
};
// ---- screens ----------------------------------------------------------------------
document.getElementById('btn-new').addEventListener('click', () => {
  save = freshSave();
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  state.cash = save.cash;
  missions.missionIdx = 0;
  G.startPlay();
});
document.getElementById('btn-continue').addEventListener('click', () => {
  missions.missionIdx = Math.min(save.mission || 0, 15);
  G.startPlay();
});
document.getElementById('btn-resume').addEventListener('click', () => {
  state.screen = 'play';
  document.getElementById('screen-busted').style.display = 'none';
  player.health = 100;
  player.x = LANDMARKS.safehouse.pos[0];
  player.z = LANDMARKS.safehouse.pos[1];
  if (player.inCar) exitCar();
  playerMesh.group.position.set(player.x, 0, player.z);
  setWanted(0);
  for (const c of police) R.scene.remove(c.mesh.group);
  police.length = 0;
  saveGame();
});
if (!loadSave()) document.getElementById('btn-continue').style.display = 'none';
window.addEventListener('pointerdown', () => { if (state.screen === 'play') audio.ensure(); }, { once: true });
window.addEventListener('keydown', () => { if (state.screen === 'play') audio.ensure(); }, { once: true });
// ---- main loop ----------------------------------------------------------------------
let last = performance.now();
let acc = 0;
let frames = 0;
let shotReadySent = false;
window.__t0 = performance.now();
function handleActions() {
  const actions = input.takeActions();
  if (state.screen === 'title' && (actions & ACTION_CONFIRM)) { G.startPlay(); return; }
  if (state.screen === 'busted' || state.screen === 'wasted') return;
  if (actions & ACTION_PAUSE) {
    if (state.screen === 'play') {
      state.screen = 'paused';
      document.getElementById('screen-pause').style.display = 'flex';
    } else if (state.screen === 'paused') {
      state.screen = 'play';
      document.getElementById('screen-pause').style.display = 'none';
    }
    return;
  }
  if (state.screen !== 'play') return;
  if (state.garageOpen) {
    const kind = garageKey(actions);
    if (kind) {
      const res = garage.buy(kind, state.cash);
      if (res.ok) { state.cash -= res.price; hud.log(res.msg); audio.cashSting(); }
      else hud.log(res.msg);
      refreshGarageMenu();
      saveGame();
      return;
    }
    if (actions & ACTION_INTERACT) doInteract();
    return;
  }
  if (actions & ACTION_MISSION) {
    if (!missions.active) {
      if (missions.current()) missions.startMission(missions.missionIdx);
      else hud.log('Story complete — free roam. Turf 12/12.');
    }
  }
  if (actions & ACTION_INTERACT) doInteract();
  if (actions & ACTION_WEAPON1) { player.weapon = 'fists'; playerMesh.gun.visible = false; }
  if (actions & ACTION_WEAPON2) { player.weapon = 'pistol'; playerMesh.gun.visible = true; }
  if (actions & ACTION_WEAPON3) { player.weapon = 'smg'; playerMesh.gun.visible = true; }
  if (actions & ACTION_RADIO) {
    audio.ensure();
    const name = audio.nextStation();
    state.radio = name;
    hud.log(`Radio: ${name}`);
  }
}
function update(dt) {
  const mouse = input.takeMouse();
  camYaw -= mouse.dx * 0.004;
  camPitch = clamp(camPitch + mouse.dy * 0.002, -0.2, 0.6);
  player.fireT = Math.max(0, player.fireT - dt);
  if (player.inCar && player.car) {
    const { throttle, steer } = driveVector(input.held);
    const wantNos = input.held.sprint && throttle > 0;
    const boost = garage.burn(dt, wantNos, true);
    if (boost > 0 && !nosBurning) audio.nosWhoosh();
    nosBurning = boost > 0;
    const top = garage.topSpeed() + boost;
    const moved = driveCar(player.car, dt, throttle, steer, top, colliders);
    state.speed = player.car.speed;
    player.x = player.car.x;
    player.z = player.car.z;
    player.heading = player.car.heading;
    player.car.mesh.flame.visible = nosBurning;
    if (shotMode === 1) { nosBurning = true; player.car.mesh.flame.visible = true; }
    if (input.held.brake) player.car.speed *= Math.max(0, 1 - 3 * dt);
    if (!shotMode && garage.nosFull() && !state.nosReadyNotified) {
      state.nosReadyNotified = true;
      hud.notify('NOS READY', 'Tank full — hold Shift to burn', 'good');
    }
    if (garage.nos < garage.nosCapacity() * 0.5) state.nosReadyNotified = false;
    for (const rb of roadblocks) {
      for (const c of rb.cars) {
        if (dist2([player.x, player.z], [c.x, c.z]) < 3.5 && Math.abs(player.car.speed) > 8) {
          addHeat(8);
          player.car.speed *= 0.4;
          hud.log('Smashed through a roadblock! Heat +1.');
        }
      }
    }
    audio.setEngine(Math.abs(player.car.speed) * 2.4, true);
  } else {
    const [mx, mz] = moveVector(input.held, camYaw);
    movePlayerOnFoot(player, dt, mx, mz, input.held.sprint, colliders);
    state.speed = 0;
    nosBurning = false;
    audio.setEngine(0, false);
    if (input.firing) playerShoot();
  }
  if (player.inCar && input.firing && player.weapon !== 'fists') playerShoot();
  updateTraffic(traffic, dt, colliders);
  updatePedestrians(peds, dt, lastGunPos, colliders);
  updatePickups();
  for (const e of enemies) updateEnemy(e, dt, player.x, player.z, enemyShoot, colliders);
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (!enemies[i].alive) enemies.splice(i, 1);
  }
  for (const c of police) {
    const d = updatePolice(c, dt, player.x, player.z, colliders);
    if (!player.inCar && d < 2.5) {
      state.bustedT += dt;
      if (state.bustedT > 2) { endRun('busted'); return; }
    }
  }
  if (police.length === 0) state.bustedT = 0;
  updateHelicopter(heli, dt, player.x, player.z);
  if (player.inCar && player.car) dust.update(dt, player.x, player.z, player.heading, Math.abs(state.speed));
  updateWanted(dt);
  race.update(dt, player.x, player.z, colliders, (done, total) => {
    hud.log(`Checkpoint ${done}/${total}`);
  });
  if (race.won) { raceWonEvent = true; race.won = false; hud.log('RACE WON — you beat the Tiburones driver!'); audio.missionSting(true); }
  if (race.lost) { raceLostEvent = true; race.lost = false; hud.log('Race lost — the shark driver beat you. Press M to retry.'); }
  if (turf.robbery) {
    const t = turf.robbery.target;
    if (dist2([player.x, player.z], t.pos) > 9) {
      turf.cancelRobbery();
      hud.log('Robbery aborted — you left the spot.');
    } else {
      const done = turf.updateRobbery(dt);
      if (done) {
        state.cash += done.payout;
        robbedTargetEvent = done.id;
        addHeat(40);
        audio.cashSting();
        hud.log(`ROBBED ${done.name} — +$${done.payout}. Heat +2 stars!`);
        if (!shotMode) hud.notify('HEAT +2 STARS', `Robbed ${done.name} — +$${done.payout}`, 'danger');
        if (done.kind === 'stash') {
          ctx.flipDistrict(done.district);
          hud.log('Stash hit — district flips to the crew!');
        }
        hud.setPrompt('');
        saveGame();
      } else {
        hud.setPrompt(`ROBBING ${t.name}… ${Math.ceil(5 - turf.robbery.t)}s`);
      }
    }
  } else {
    hud.setPrompt(contextPrompt());
  }
  missions.update(dt);
  turf.update(dt, (n) => { state.cash += n; }, (m) => hud.log(m));
  turf.tickCooldowns(dt);
  const tl = missions.stageTimeLeft();
  state.timerText = missions.hudTimerText || (tl !== null ? `⏱ ${Math.ceil(tl)}s` : '');
  const spd = Math.abs(state.speed);
  const gear = !player.inCar ? 1 : spd < 8 ? 1 : spd < 16 ? 2 : spd < 24 ? 3 : spd < 32 ? 4 : 5;
  const district = districtAt(player.x, player.z);
  const policeUnits = police.map((c) => {
    const d = Math.round(dist2([c.x, c.z], [player.x, player.z]));
    let status = 'CHASING';
    if (d < 6) status = 'RAMMING';
    else if (c.kind === 'headon') status = 'CLOSING';
    else if (c.kind === 'flank') status = 'FLANKING';
    else if (c.kind === 'roadblock') status = 'ROADBLOCK';
    return { name: c.unit || 'LCPD', dist: d, status };
  });
  if (heli.active) policeUnits.push({ name: 'AIR-1', dist: 17, status: 'SPOTLIGHT' });
  const alerts = state.extraAlerts.slice();
  if (roadblocks.length) alerts.unshift({ kind: 'warn', text: '⚠ ROADBLOCK AHEAD — RAM IT OR DODGE' });
  if (player.inCar && player.car && player.car.kind === 'traffic') {
    alerts.push({ kind: 'info', text: `VEHICLE STOLEN: ${CARS[player.car.type].name.toUpperCase()}` });
  }
  const rep = missions.rep;
  const respectRank = rep >= 500 ? 'KINGPIN' : rep >= 350 ? 'SHOT CALLER' : rep >= 200 ? 'HUSTLER' : 'ROOKIE';
  const weapons = [
    { key: 1, name: 'FISTS', ammo: '∞', active: player.weapon === 'fists' },
    { key: 2, name: 'PISTOL', ammo: '∞', active: player.weapon === 'pistol' },
    { key: 3, name: 'SMG', ammo: '30/120', active: player.weapon === 'smg' },
  ];
  updateHud(hud, {
    wanted: state.wanted, cash: state.cash, health: player.health, armour: player.armour,
    speed: state.speed, inCar: player.inCar, nos: garage.nos, nosMax: garage.nosCapacity(),
    weapon: WEAPONS[player.weapon].name, ammo: '∞',
    objective: missions.objective, radio: state.radio, turf, timerText: state.timerText,
    px: player.x, pz: player.z, heading: player.inCar ? player.heading : camYaw,
    missionTarget: missions.stageTarget(),
    properties: PROPERTIES, robTargets: ROB_TARGETS,
    raceCheckpoints: race.active ? race.checkpoints : null,
    policeBlips: police.map((c) => [c.x, c.z]),
    roadblocks: roadblocks.map((r) => [r.x, r.z]),
    heli: heli.active ? [heli.group.position.x, heli.group.position.z] : null,
    missionPanel: missions.missionPanel(),
    policeUnits, roadblockAhead: roadblocks.length > 0,
    dialogue,
    streetLabel: `${district ? district.name.toUpperCase() : 'PUERTO LUMEN'} — ${streetNameAt(player.x, player.z)}`,
    gear, vehicleName: player.inCar && player.car ? CARS[player.car.type].name : 'ON FOOT',
    condition: player.inCar && player.car ? player.car.health : 100,
    inSight: state.wanted > 0 && state.seen,
    searchZone: state.wanted > 0,
    mapMode: G.mapMode,
    mapRoute: G.mapMode ? { from: [player.x, player.z], to: [-180, 180] } : null,
    alerts, weapons, respect: rep, respectRank,
  });
  if (!G.noBeacon) setBeacon(beacon, missions.stageTarget() || (race.active ? race.nextCheckpoint() : null));
  state.saveT += dt;
  if (state.saveT > 15) { state.saveT = 0; saveGame(); }
  if (city.landmarks.beam) city.landmarks.beam.rotation.y += dt * 0.5;
  if (city.landmarks.ferrisWheel) city.landmarks.ferrisWheel.rotation.z += dt * 0.15;
  if (city.landmarks.lighthouseLamp) city.landmarks.lighthouseLamp.visible = Math.sin(performance.now() * 0.004) > -0.2;
}
function contextPrompt() {
  if (player.inCar) return '';
  if (dist2([player.x, player.z], LANDMARKS.garage.pos) < 14) return 'Taller Lumen — press E for upgrades & repair';
  const prop = nearestProperty(turf, player.x, player.z);
  if (prop) return `${prop.name} — press E to buy ($${prop.price})`;
  const target = turf.nearestRobTarget(player.x, player.z);
  if (target) return `${target.name} — press E to rob (+$${target.payout}, +2★)`;
  const car = nearestCar(4.5);
  if (car) return `Press E to ${car.kind === 'traffic' ? 'steal' : 'enter'} the ${CARS[car.type].name}`;
  return '';
}
function frame(now) {
  requestAnimationFrame(frame);
  const dtMs = Math.min(now - last, 250);
  last = now;
  resizeIfNeeded();
  handleActions();
  if (state.screen === 'play' || shotMode) {
    if (shotMode) shotAutopilot(G, dtMs / 1000);
    acc += dtMs / 1000;
    let n = 0;
    while (acc >= STEP && n < 5) { update(STEP); acc -= STEP; n += 1; }
    if (n === 5) acc = 0;
    if (shotMode && G.anchor) G.warpTo(G.anchor[0], G.anchor[1]);
  } else if (state.screen === 'title') {
    const t = now * 0.00005;
    R.camera.position.set(Math.sin(t) * 120 - 120, 40, Math.cos(t) * 120 - 120);
    R.camera.lookAt(-60, 0, -60);
  }
  if (state.screen !== 'title') {
    updateCamera(R.camera, player.x, player.z, player.heading, camYaw, camPitch, player.inCar, state.speed, nosBurning, dtMs / 1000, { dist: camDistOverride, height: camHeightOverride });
  }
  R.renderer.render(R.scene, R.camera);
  frames += 1;
  window.__frames = frames;
  window.__fps = frames / ((now - window.__t0) / 1000);
  if (shotMode && !shotReadySent && frames >= 1) {
    shotReadySent = true;
    window.__shotReady = true;
  }
}
let lastW = 0;
let lastH = 0;
function resizeIfNeeded() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w !== lastW || h !== lastH) {
    lastW = w; lastH = h;
    resizeRenderer(R, w, h);
  }
}
resizeIfNeeded();
// ---- probe / debug API (used by scripted playtests, harmless in play) --------
window.__r8bMeasure = () => {
  const car = player.car;
  if (!car) return { heroFrac: null, reason: 'not-in-car' };
  const box3 = new THREE.Box3().setFromObject(car.mesh.group);
  const cam = R.camera;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const [x, y, z] of [
    [box3.min.x, box3.min.y, box3.min.z], [box3.max.x, box3.min.y, box3.min.z],
    [box3.min.x, box3.max.y, box3.min.z], [box3.max.x, box3.max.y, box3.min.z],
    [box3.min.x, box3.min.y, box3.max.z], [box3.max.x, box3.min.y, box3.max.z],
    [box3.min.x, box3.max.y, box3.max.z], [box3.max.x, box3.max.y, box3.max.z],
  ]) {
    const v = new THREE.Vector3(x, y, z).project(cam);
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  const heroFrac = (maxX - minX) / 2;
  const policeFracs = police.map((c) => {
    const b = new THREE.Box3().setFromObject(c.mesh.group);
    let a = 1e9, d = -1e9;
    for (const [x, y, z] of [[b.min.x, b.min.y, b.min.z], [b.max.x, b.max.y, b.max.z]]) {
      const v = new THREE.Vector3(x, y, z).project(cam);
      if (v.x < a) a = v.x;
      if (v.x > d) d = v.x;
    }
    return Math.round(((d - a) / 2) * 1000) / 10;
  });
  return {
    heroFrac: Math.round(heroFrac * 1000) / 10,
    heroHeightFrac: Math.round(((maxY - minY) / 2) * 1000) / 10,
    heroCentreX: Math.round(((minX + maxX) / 4) * 1000) / 10,
    policeFracs, policeCount: police.length,
    camPos: [Math.round(cam.position.x), Math.round(cam.position.y), Math.round(cam.position.z)],
  };
};
window.__game = {
  G, state, player, missions, turf, garage, race, enemies, police, audio,
  warpTo: (x, z) => G.warpTo(x, z),
  setCash: (n) => { state.cash = n; },
  setWanted: (n) => setWanted(n),
  startMission: (i) => missions.startMission(i),
  enterNearestCar: () => { const c = nearestCar(30); if (c) enterCar(c); return !!c; },
  exitCar: () => exitCar(),
  interact: () => doInteract(),
  shoot: () => playerShoot(),
  giveNos: () => { garage.nos = garage.nosCapacity(); },
  completeStage: () => {
    const s = missions.stage();
    if (!s) return 'no-stage';
    if (s.pos) G.warpTo(s.pos[0], s.pos[1]);
    if (s.at) G.warpTo(s.at[0], s.at[1]);
    if (s.t === 'wait') missions.waitT = s.seconds || 12; // simulate standing the full hack
    if (s.t === 'combat' || s.t === 'defend') {
      for (const e of enemies) { e.alive = false; R.scene.remove(e.mesh); enemiesKilled += 1; }
    }
    if (s.t === 'evade') setWanted(0);
    if (s.t === 'rob') {
      const t = ROB_TARGETS.find((x) => x.id === s.target);
      if (t) { G.warpTo(t.pos[0], t.pos[1]); turf.startRobbery(t); turf.robbery.t = 4.9; robbedTargetEvent = t.id; turf.cancelRobbery(); }
    }
    if (s.t === 'race') { raceWonEvent = true; }
    if (s.t === 'buy') { state.cash = Math.max(state.cash, 10000); G.warpTo(-210, -40); doInteract(); }
    if (s.t === 'enterCar') {
      if (player.inCar) exitCar();
      if (s.police) {
        // Mission 8: steal a real cruiser — find the nearest police car at any
        // distance, warp to it, and take it (the live chase may be far away).
        let best = null; let bd = Infinity;
        for (const c of police) {
          const d = dist2([player.x, player.z], [c.x, c.z]);
          if (d < bd) { bd = d; best = c; }
        }
        if (best) { G.warpTo(best.x, best.z); enterCar(best); }
        else setWanted(2); // no cruiser on the street yet — raise the heat so one spawns
      } else {
        const c = nearestCar(60); if (c) enterCar(c);
      }
    }
    return s.t;
  },
  completeMission: () => {
    for (let i = 0; i < 8; i += 1) {
      if (!missions.active) break;
      window.__game.completeStage();
      missions.update(0.1);
    }
    return missions.missionIdx;
  },
  stateSummary: () => ({
    screen: state.screen, cash: Math.floor(state.cash), wanted: state.wanted,
    mission: missions.missionIdx, active: missions.active, stage: missions.stageIdx,
    objective: missions.objective, turf: turf.held(), health: Math.round(player.health),
    inCar: player.inCar, nos: Math.round(garage.nos), upgrades: garage.levels,
    owned: turf.owned.slice(), enemies: enemies.length, police: police.length,
    kills: enemiesKilled,
  }),
};
// ---- boot -----------------------------------------------------------------------
if (shotMode) {
  stageShot(shotMode, G);
  state.screen = 'play';
  document.getElementById('screen-title').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
} else if (save.mission > 0 && save.mission < 15) {
  missions.missionIdx = save.mission;
  missions.refreshObjective();
}
hud.log(`LUMEN BAY — Puerto Lumen, ${shotClock || CLOCK}. Press M to start the story.`);
requestAnimationFrame(frame);
