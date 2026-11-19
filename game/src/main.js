// LUMEN BAY r7 — boot and the one loop. Third-person on foot and by car in
// bright midday Puerto Lumen: 15 story missions, turf war, garage upgrades,
// NOS, robberies, properties, street races, wanted police with roadblocks and
// line-of-sight chases, a helicopter, combat, radio, saves. ?shot=1..4 stages
// a fixed scene and sets window.__shotReady for screenshots. Gameplay is the
// r6 game; r7 rebuilds only the LOOK (daylight, big red convertible, packed
// streets, dense HUD, detailed map, live events).
import * as THREE from 'three';
import { WORLD, STEP, SAVE_KEY, DISTRICTS, ROB_TARGETS, PROPERTIES, WEAPONS, CARS, LANDMARKS, freshSave, clamp, dist2, streetNameAt, districtAt } from './config.js';
import { createRandom } from './random.js';
import { createCity, hasLineOfSight, resolveCollisions } from './city.js';
import { buildCarMesh, makeCar, driveCar, spawnTraffic, spawnTrafficNear, updateTraffic, spawnPolice, updatePolice, makeHelicopter, updateHelicopter, makeRoadblock, updateRoadblock } from './vehicles.js';
import { spawnPedestrians, spawnPedestriansNear, updatePedestrians, spawnEnemy, updateEnemy, makePlayerMesh, movePlayerOnFoot } from './people.js';
import { MissionEngine } from './missions.js';
import { Garage, GARAGE_MENU, REPAIR_PRICE } from './garage.js';
import { Turf, nearestProperty } from './turf.js';
import { Race } from './race.js';
import { AudioEngine, safeFreq } from './audio.js';
import { createHud, updateHud } from './hud.js';
import { createRenderer3D, resizeRenderer, updateCamera, makeBeacon, setBeacon, spawnTracer, spawnMuzzle, spawnDamageNumber } from './render.js';
import { createInput, moveVector, driveVector, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MISSION, ACTION_INTERACT, ACTION_WEAPON1, ACTION_WEAPON2, ACTION_WEAPON3, ACTION_RADIO } from './input.js';
import { stageShot, shotAutopilot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotParam = Number.parseInt(params.get('shot') || '', 10);
const shotMode = Number.isInteger(shotParam) && shotParam >= 1 && shotParam <= 4 ? shotParam : 0;
const seedParam = Number.parseInt(params.get('seed') || '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261119;

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
  garageOpen: false, robberyPrompt: false, hour: 12,
};
let camYaw = 0;
let camPitch = 0.2;
let nosBurning = false;
let lastGunPos = null;
let enteredCarEvent = null;
let robbedTargetEvent = null;
let boughtPropEvent = null;
let raceWonEvent = false;
let raceLostEvent = false;
// Dialogue box state: { name, text, initial } — set by mission starts + shots.
let dialogue = null;
function setDialogue(name, text) {
  if (!name || !text) { dialogue = null; return; }
  dialogue = { name, text, initial: name.trim().charAt(0) || '?' };
}
/** Parse a mission dialogue line `NAME: "text"` into the dialogue box. */
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
}
function spawnPoliceNear(count) {
  for (let i = 0; i < count; i += 1) {
    if (police.length >= 5) break;
    const car = spawnPolice(R.scene, player.x, player.z, rng);
    policeSeq += 1;
    car.unit = `LCPD-${String(policeSeq).padStart(2, '0')}`;
    police.push(car);
  }
}
function spawnRoadblockAhead() {
  if (roadblocks.length >= 2) return;
  const heading = player.inCar && player.car ? player.car.heading : player.heading;
  roadblocks.push(makeRoadblock(R.scene, player.x, player.z, heading));
  hud.log('POLICE ROADBLOCK ahead — ram through or dodge around it.');
}
function updateWanted(dt) {
  let seen = false;
  for (const c of police) {
    if (hasLineOfSight(colliders, c.x, c.z, player.x, player.z)) { seen = true; break; }
  }
  if (state.wanted > 0) {
    state.heat = clamp(state.heat + (seen ? 1.5 : -9) * dt, 0, 100);
    const nw = starsForHeat(state.heat);
    if (nw !== state.wanted) {
      state.wanted = nw;
      if (nw === 0) hud.log('You lost them. Heat is clear.');
    }
  }
  const wantCount = Math.min(state.wanted, 4);
  while (police.length < wantCount) spawnPoliceNear(1);
  while (police.length > wantCount) {
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
  for (let i = 0; i < count; i += 1) {
    const ex = clamp(x + (rng() - 0.5) * 16, -230, 230);
    const ez = clamp(z + (rng() - 0.5) * 16, -230, 230);
    enemies.push(spawnEnemy(R.scene, ex, ez, kind));
  }
}
function spawnPatrols(count) {
  for (let i = 0; i < count; i += 1) {
    const car = makeCar('police', clamp(player.x + (rng() - 0.5) * 80, -220, 220), clamp(player.z + (rng() - 0.5) * 80, -220, 220), rng() * Math.PI * 2, { kind: 'patrol' });
    R.scene.add(car.mesh.group);
    policeSeq += 1;
    car.unit = `LCPD-${String(policeSeq).padStart(2, '0')}`;
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
  for (const c of [...parked, ...traffic]) {
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
  } else {
    hud.log(`Entered the ${CARS[car.type].name}.`);
  }
  const i = traffic.indexOf(car);
  if (i >= 0) traffic.splice(i, 1);
  const j = parked.indexOf(car);
  if (j >= 0) parked.splice(j, 1);
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
  get nosBurning() { return nosBurning; },
  set nosBurning(v) { nosBurning = v; },
  get camYaw() { return camYaw; },
  set camYaw(v) { camYaw = v; },
  get dialogue() { return dialogue; },
  player, state, missions, hud, turf, garage, parked, traffic, peds, heli, police, roadblocks,
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
  warpTo(x, z) {
    player.x = x; player.z = z;
    if (player.inCar && player.car) { player.car.x = x; player.car.z = z; player.car.mesh.group.position.set(x, 0, z); }
    playerMesh.group.position.set(x, 0, z);
  },
  enterCar,
  setWanted,
  spawnPoliceNear,
  spawnRoadblockAhead,
  spawnEnemiesAt,
  setFestival,
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
  // Movement.
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
    // Shot 1 cover: NOS burns the whole time for the screenshot, no input needed.
    if (shotMode === 1) { nosBurning = true; player.car.mesh.flame.visible = true; }
    if (input.held.brake) player.car.speed *= Math.max(0, 1 - 3 * dt);
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
  updateWanted(dt);
  race.update(dt, player.x, player.z, colliders, (done, total) => {
    hud.log(`Checkpoint ${done}/${total}`);
    if (done >= total) { /* win decided in race.update via rival comparison */ }
  });
  if (race.won) { raceWonEvent = true; race.won = false; hud.log('RACE WON — you beat the Tiburones driver!'); audio.missionSting(true); }
  if (race.lost) { raceLostEvent = true; race.lost = false; hud.log('Race lost — the shark driver beat you. Press M to retry.'); }
  // Robbery channel.
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
  // HUD snapshot: mission panel, police response, dialogue, street, gear.
  const tl = missions.stageTimeLeft();
  state.timerText = missions.hudTimerText || (tl !== null ? `⏱ ${Math.ceil(tl)}s` : '');
  const spd = Math.abs(state.speed);
  const gear = !player.inCar ? 1 : spd < 8 ? 1 : spd < 16 ? 2 : spd < 24 ? 3 : spd < 32 ? 4 : 5;
  const district = districtAt(player.x, player.z);
  const policeUnits = police.map((c) => {
    const d = Math.round(dist2([c.x, c.z], [player.x, player.z]));
    const status = d < 6 ? 'RAMMING' : 'CHASING';
    return { name: c.unit || 'LCPD', dist: d, status };
  });
  if (heli.active) policeUnits.push({ name: 'PELICAN-11', dist: 42, status: 'AIR' });
  if (roadblocks.length) policeUnits.push({ name: 'ROADBLOCK', dist: Math.round(dist2([roadblocks[0].x, roadblocks[0].z], [player.x, player.z])), status: 'ROADBLOCK' });
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
  });
  // Mission beacon.
  setBeacon(beacon, missions.stageTarget() || (race.active ? race.nextCheckpoint() : null));
  // Periodic save.
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
  } else if (state.screen === 'title') {
    // Slow orbit around the marina on the title screen.
    const t = now * 0.00005;
    R.camera.position.set(Math.sin(t) * 120 - 120, 40, Math.cos(t) * 120 - 120);
    R.camera.lookAt(-60, 0, -60);
  }
  if (state.screen !== 'title') {
    updateCamera(R.camera, player.x, player.z, player.heading, camYaw, camPitch, player.inCar, state.speed, nosBurning, dtMs / 1000);
  }
  R.renderer.render(R.scene, R.camera);
  frames += 1;
  window.__frames = frames;
  window.__fps = frames / ((now - window.__t0) / 1000);
  // The scene is fully staged before the first frame, HUD included, so the
  // first rendered frame is already the screenshot.
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
  // Complete the current stage by fair means: warp to the target, win the race,
  // rob the target, buy the property, clear the enemies, drop the heat.
  completeStage: () => {
    const s = missions.stage();
    if (!s) return 'no-stage';
    if (s.pos) G.warpTo(s.pos[0], s.pos[1]);
    if (s.at) G.warpTo(s.at[0], s.at[1]);
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
    if (s.t === 'enterCar') { const c = nearestCar(60); if (c) enterCar(c); }
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
hud.log('LUMEN BAY — Puerto Lumen, 12:30. Press M to start the story.');
requestAnimationFrame(frame);
