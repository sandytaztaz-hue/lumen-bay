// LUMEN BAY — main.js
// The game itself: boot, the game state object, the main loop, player
// movement and driving, traffic and pedestrian updates, police chase and
// helicopter, combat, entering and exiting cars, NOS, missions, pause,
// map, radio, save and load, title-to-play, BUSTED and WASTED, the
// staged-shot mode, and the debug/probe API on the window.

import * as THREE from 'three';
import {
  WORLD, AVENUES, JOBS, SAVE_KEY, START_CASH, POLICE_UNITS, POLICE_EXTRA,
  TRAFFIC_COLORS, WEAPONS, weaponOwned, CREW_ABILITIES,
  streetNameAt, gearForSpeed,
} from './config.js';
import { makeRng, seedFromQuery } from './random.js';
import { makeTextures } from './textures.js';
import { buildCity } from './city.js';
import { makeComet, makeCruiser, makeSedan, makeBike, makeHeli, makeNosFlames } from './vehicles.js';
import { makePerson, makeMara, makeOfficer } from './people.js';
import { AudioSys } from './audio.js';
import { Hud } from './hud.js';
import { RenderSys } from './render.js';
import { Input, axis } from './input.js';
import { currentJob, startJob, completeCurrentJob, completeAllJobs, checkArrival } from './missions.js';
import { buyEngine as garageBuyEngine, engineBonusKmh } from './garage.js';
import { Race } from './race.js';
import { districtAt } from './turf.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = seedFromQuery();
const shotNum = parseInt(params.get('shot') || '0', 10) || 0;

const canvas = document.getElementById('gameCanvas');
const render = new RenderSys(canvas);
const scene = render.scene;
const rng = makeRng(seed);
const textures = makeTextures(rng);
const city = buildCity(scene, rng, textures);
const hud = new Hud();
const audio = new AudioSys();
const input = new Input(canvas);
const race = new Race(scene);
const runtimeRng = rng.fork('runtime');

// ---- game state ------------------------------------------------------------
const state = {
  started: false,
  paused: false,
  mapOpen: false,
  frozen: false,
  shotActive: false,
  shotFrames: 0,
  cash: START_CASH,
  rep: 0,
  kills: 0,
  health: 100,
  armour: 0,
  nos: 100,
  wanted: 0,
  weapon: 'pistol',
  smgMag: 30,
  smgReserve: 120,
  shotgunMag: 6,
  shotgunReserve: 18,
  rifleMag: 30,
  rifleReserve: 60,
  jobIndex: 0,
  jobStage: 1,
  jobTimeLeft: null,
  jobTimeTotal: null,
  crewCd: { tio: 0, dario: 0, lena: 0 },
  completed: [],
  turf: [],
  garageOwned: false,
  engineLevel: 0,
  storyComplete: false,
  clockMin: 18 * 60 + 40,
  frames: 0,
  guardsDown: 0,
  radioOn: true,
  player: { x: 20, z: 250, heading: Math.PI / 2, speed: 0, inCar: false },
  car: { x: 24, z: 250, heading: Math.PI / 2, speed: 0 },
  hiddenTimer: 0,
  bustedTimer: 0,
  walkBob: 0,
};

// ---- world actors -----------------------------------------------------------
const heroCar = makeComet(textures);
heroCar.position.set(24, 0, 250);
heroCar.rotation.y = Math.PI / 2;
scene.add(heroCar);
const nosFlames = makeNosFlames(textures);
heroCar.add(nosFlames);

const maraMesh = makeMara(textures);
maraMesh.position.set(20, 0, 250);
maraMesh.rotation.y = Math.PI / 2;
scene.add(maraMesh);

const heli = makeHeli(textures);
heli.visible = false;
scene.add(heli);

// Traffic: 8 on the boulevard, 4 on the avenues.
const traffic = [];
function addTrafficCar(lane, axisName, dir, speed, pos) {
  const color = rng.pick(TRAFFIC_COLORS);
  const group = makeSedan(color, textures);
  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = axisName === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
  scene.add(group);
  const car = { group, axis: axisName, dir, speed, x: pos.x, z: pos.z, stolen: false };
  traffic.push(car);
  return car;
}
for (let i = 0; i < 4; i++) {
  addTrafficCar(211.5, 'x', 1, 7 + i * 1.2, { x: -40 + i * 95, z: 211.5 });
  addTrafficCar(218.5, 'x', -1, 8 + i * 1.1, { x: 350 - i * 90, z: 218.5 });
}
for (let i = 0; i < 4; i++) {
  const ax = AVENUES[(i * 2 + 1) % AVENUES.length];
  addTrafficCar(ax, 'z', i % 2 === 0 ? 1 : -1, 7 + i, { x: ax, z: 20 + i * 70 });
}

// Pedestrians: 24 strolling the boulevard sidewalks.
const peds = [];
const PED_SHIRTS = [0xff5a8a, 0x4ade80, 0xa55eea, 0xffd21c, 0x4aa3ff, 0xff3c3c, 0xffffff, 0x8ae8a0];
for (let i = 0; i < 24; i++) {
  const north = i % 2 === 0;
  const shirt = PED_SHIRTS[i % PED_SHIRTS.length];
  const g = makePerson({ shirt, trousers: 0x1c1e24 });
  const z = north ? 206.4 : 223.6;
  const x = -40 + i * 17;
  g.position.set(x, 0, z);
  scene.add(g);
  peds.push({
    group: g, x, z, dir: north ? 1 : -1,
    speed: 0.8 + runtimeRng.range(0, 0.8),
    fleeing: false, bob: runtimeRng.range(0, 6),
  });
}

// Police cruisers, street officers, vault guards.
const police = [];
const officers = [];
// Roadblock units: two cruisers parked across the boulevard ahead of
// Mara while the heat is 4-5 stars. They hold their ground (they never
// chase) and show up in the dispatch list as ROADBLOCK.
const roadblocks = [];
let roadblocksAnnounced = false;
let currentCar = null; // null = on foot; otherwise the driven car group

// Job marker: a floating gold octahedron over a tall translucent beam.
const marker = new THREE.Group();
const markerDiamond = new THREE.Mesh(
  new THREE.OctahedronGeometry(1.6),
  new THREE.MeshStandardMaterial({ color: 0xffd21c, emissive: 0xffb800, emissiveIntensity: 1.2, roughness: 0.3 }),
);
markerDiamond.position.y = 6;
marker.add(markerDiamond);
const markerBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.1, 30, 12, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0xffd21c, transparent: true, opacity: 0.22,
    depthWrite: false, side: THREE.DoubleSide,
  }),
);
markerBeam.position.y = 15;
marker.add(markerBeam);
marker.visible = false;
scene.add(marker);

// Tracer line for gunfire, shown 0.15 seconds.
const tracerGeo = new THREE.BufferGeometry();
tracerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffd21c }));
tracer.visible = false;
scene.add(tracer);
let tracerTimer = 0;

// ---- save / load ------------------------------------------------------------
function saveGame() {
  try {
    const data = {
      cash: state.cash, rep: state.rep, kills: state.kills,
      completed: state.completed, jobIndex: state.jobIndex,
      turf: state.turf, garageOwned: state.garageOwned,
      engineLevel: state.engineLevel,
      x: state.player.x, z: state.player.z,
      storyComplete: state.storyComplete,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    state.cash = data.cash;
    state.rep = data.rep;
    state.kills = data.kills;
    state.completed = data.completed || [];
    state.jobIndex = data.jobIndex || 0;
    state.turf = data.turf || [];
    state.garageOwned = !!data.garageOwned;
    state.engineLevel = data.engineLevel || 0;
    state.player.x = data.x ?? 20;
    state.player.z = data.z ?? 250;
    state.storyComplete = !!data.storyComplete;
    return true;
  } catch (err) {
    return false;
  }
}

function hasSave() {
  try {
    return !!window.localStorage.getItem(SAVE_KEY);
  } catch (err) {
    return false;
  }
}

// ---- missions context -------------------------------------------------------
const missionCtx = {
  state,
  hud,
  audio,
  race,
  setMarker(job) {
    marker.position.set(job.target.x, 0, job.target.z);
    marker.visible = true;
  },
  clearMarker() {
    marker.visible = false;
  },
  spawnVaultGuards() {
    for (const [gx, gz] of [[178, 56], [192, 56], [178, 66], [192, 66]]) {
      const g = makeOfficer(textures);
      g.position.set(gx, 0, gz);
      scene.add(g);
      officers.push({ group: g, alive: true, isGuard: true, speed: 1.6 });
    }
  },
  saveGame,
};

// ---- police ------------------------------------------------------------------
function ensurePolice() {
  const want = Math.min(state.wanted + 2, 6);
  while (police.length < want) {
    const a = runtimeRng.range(0, Math.PI * 2);
    const px = state.player.x + Math.cos(a) * 55;
    const pz = state.player.z + Math.sin(a) * 55;
    const group = makeCruiser(textures);
    group.position.set(px, 0, pz);
    scene.add(group);
    const name = POLICE_UNITS[police.length % 4];
    police.push({ group, name, speed: 0, busted: 0 });
  }
  while (police.length > want) {
    const p = police.pop();
    scene.remove(p.group);
  }
  heli.visible = state.wanted >= 3;
  audio.siren(state.wanted > 0);
}

function setWanted(n) {
  state.wanted = Math.max(0, Math.min(5, n));
  ensurePolice();
}

// Roadblocks live only at 4-5 stars: two cruisers side by side across
// the boulevard lanes, 70 m ahead of Mara in the direction she faces,
// re-aimed every frame as she moves. They drop when the heat falls.
function ensureRoadblocks() {
  if (state.wanted >= 4) {
    while (roadblocks.length < 2) {
      const group = makeCruiser(textures);
      scene.add(group);
      const name = POLICE_EXTRA[roadblocks.length % POLICE_EXTRA.length];
      roadblocks.push({ group, name });
    }
    const dir = Math.sin(state.player.heading) >= 0 ? 1 : -1;
    const bx = Math.max(-40, Math.min(360, state.player.x + dir * 70));
    const lanes = [211.5, 218.5];
    for (let i = 0; i < roadblocks.length; i++) {
      const rb = roadblocks[i];
      rb.group.position.set(bx, 0, lanes[i]);
      rb.group.rotation.y = Math.atan2(state.player.x - bx, state.player.z - lanes[i]);
    }
    if (!roadblocksAnnounced) {
      roadblocksAnnounced = true;
      hud.logLine('Roadblocks on the boulevard — LCPD sealed the road ahead.');
      hud.toast('ROADBLOCKS AHEAD', 'LCPD sealed the boulevard — find another way', 'bad');
    }
  } else {
    if (roadblocks.length) {
      for (const rb of roadblocks) scene.remove(rb.group);
      roadblocks.length = 0;
    }
    roadblocksAnnounced = false;
  }
}

function busted() {
  state.wanted = 0;
  state.cash = Math.round(state.cash * 0.95);
  state.bustedTimer = 0;
  ensurePolice();
  hud.toast('BUSTED', 'LCPD took you in', 'bad');
  hud.logLine('BUSTED — LCPD took you in.');
}

function wasted() {
  state.health = 100;
  state.cash = Math.round(state.cash * 0.9);
  state.player.x = 60;
  state.player.z = 215;
  state.player.inCar = false;
  currentCar = null;
  maraMesh.visible = true;
  hud.toast('WASTED', 'Mara woke up at the clinic', 'bad');
  hud.logLine('WASTED — Mara woke up at the clinic.');
}

// ---- combat ------------------------------------------------------------------
function shoot() {
  if (!state.started || state.paused || state.frozen) return;
  if (state.player.inCar) return;
  // Melee weapons: fists and the bat hit an officer within 2 metres.
  if (state.weapon === 'fists' || state.weapon === 'bat') {
    for (const o of officers) {
      if (!o.alive) continue;
      const dx = o.group.position.x - state.player.x;
      const dz = o.group.position.z - state.player.z;
      if (dx * dx + dz * dz < 4) {
        damageOfficer(o, WEAPONS[state.weapon].damage);
        return;
      }
    }
    return;
  }
  const weapon = state.weapon;
  // Magazine weapons reload from their reserve like the SMG does.
  const mags = {
    smg: ['smgMag', 'smgReserve', 30],
    shotgun: ['shotgunMag', 'shotgunReserve', 6],
    rifle: ['rifleMag', 'rifleReserve', 30],
  };
  const mag = mags[weapon];
  if (mag) {
    if (state[mag[0]] <= 0) {
      if (state[mag[1]] > 0) {
        const take = Math.min(mag[2], state[mag[1]]);
        state[mag[0]] = take;
        state[mag[1]] -= take;
      } else {
        return;
      }
    }
    state[mag[0]]--;
  }
  audio.shot();
  // Muzzle flash for 90 ms.
  const gun = maraMesh.children.find((c) => c.name === 'gun');
  if (gun && gun.userData.flash) {
    gun.userData.flash.visible = true;
    window.setTimeout(() => { gun.userData.flash.visible = false; }, 90);
  }
  // Hitscan: nearest officer or vault guard in front within 40 m,
  // inside a narrow forward cone.
  const fx = Math.sin(state.player.heading);
  const fz = Math.cos(state.player.heading);
  let best = null;
  let bestD = 40;
  for (const o of officers) {
    if (!o.alive) continue;
    const dx = o.group.position.x - state.player.x;
    const dz = o.group.position.z - state.player.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > 40 || d < 0.5) continue;
    const dot = (dx * fx + dz * fz) / d;
    if (dot < 0.9) continue;
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  // Tracer from Mara to the target (or 30 m ahead on a miss).
  const from = new THREE.Vector3(state.player.x, 1.4, state.player.z);
  const to = best
    ? new THREE.Vector3(best.group.position.x, 1.4, best.group.position.z)
    : new THREE.Vector3(state.player.x + fx * 30, 1.4, state.player.z + fz * 30);
  const pos = tracerGeo.attributes.position;
  pos.setXYZ(0, from.x, from.y, from.z);
  pos.setXYZ(1, to.x, to.y, to.z);
  pos.needsUpdate = true;
  tracer.visible = true;
  tracerTimer = 0.15;
  if (best) {
    const dmg = WEAPONS[weapon].damage;
    damageOfficer(best, dmg);
    // Floating red damage number over the hit.
    const v = new THREE.Vector3(best.group.position.x, 2.2, best.group.position.z).project(render.camera);
    const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
    hud.showDamageNumber(sx, sy, '-' + dmg);
  }
  // Pedestrians within 25 m of a gunshot flee.
  for (const p of peds) {
    const dx = p.x - state.player.x;
    const dz = p.z - state.player.z;
    if (dx * dx + dz * dz < 25 * 25) p.fleeing = true;
  }
}

function damageOfficer(o, dmg) {
  o.hp = (o.hp ?? 100) - dmg;
  if (o.hp > 0) return;
  o.alive = false;
  o.group.rotation.x = -Math.PI / 2;
  o.group.position.y = 0.25;
  state.cash += 150;
  state.kills += 1;
  setWanted(state.wanted + 1);
  hud.logLine('Officer down — +$150.');
  if (o.isGuard) {
    state.guardsDown++;
    hud.logLine('Vault guard down — ' + state.guardsDown + '/4');
  }
}

// ---- crew abilities ---------------------------------------------------------
// One key per crew member, each with a real effect and a cooldown. Tio
// cuts one wanted star, Dario refills NOS and patches Mara to full
// health, Lena's decoy jams the nearest cruiser for 8 seconds (it holds
// its ground instead of chasing).
function useCrewAbility(id) {
  if (!state.started || state.paused || state.frozen) return { ok: false, reason: 'Not playing.' };
  const ability = CREW_ABILITIES.find((a) => a.id === id);
  if (!ability) return { ok: false, reason: 'No such crew member.' };
  if (state.crewCd[id] > 0) return { ok: false, reason: ability.name + ' recharging — ' + Math.ceil(state.crewCd[id]) + 's.' };
  if (id === 'tio') {
    if (state.wanted <= 0) return { ok: false, reason: 'No heat to cut — you are clean.' };
    setWanted(state.wanted - 1);
    hud.toast('TIO · HEAT OFF', 'One star gone — Tio called in a favour', 'good');
    hud.logLine('Tio cut one wanted star — heat is ' + state.wanted + '.');
  } else if (id === 'dario') {
    state.nos = 100;
    state.health = 100;
    hud.toast('DARIO · PIT CREW', 'NOS full, Mara patched up', 'good');
    hud.logLine('Dario refilled the NOS tank and patched Mara up.');
  } else if (id === 'lena') {
    let best = null;
    let bestD = Infinity;
    for (const p of police) {
      const d = Math.hypot(p.group.position.x - state.player.x, p.group.position.z - state.player.z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best) return { ok: false, reason: 'No cruiser to jam — the street is clear.' };
    best.jammedUntil = performance.now() + 8000;
    hud.toast('LENA · DECOY', best.name + ' is chasing ghosts for 8s', 'good');
    hud.logLine('Lena jammed ' + best.name + ' — decoy out for 8s.');
  }
  state.crewCd[id] = ability.cooldown;
  return { ok: true, reason: ability.name + ' used.' };
}

// ---- weapon selection ---------------------------------------------------------
function selectWeapon(id) {
  if (!WEAPONS[id]) return { ok: false, reason: 'No such weapon.' };
  if (!weaponOwned(id, state)) {
    const w = WEAPONS[id];
    return { ok: false, reason: w.name + ' LOCKED — take ' + w.turf + ' turf to unlock ($' + w.price.toLocaleString('en-US') + ').' };
  }
  state.weapon = id;
  return { ok: true, reason: WEAPONS[id].name + ' ready.' };
}

// ---- entering and exiting cars ----------------------------------------------
function nearestCar() {
  let best = null;
  let bestD = 5;
  const candidates = [{ group: heroCar, isHero: true }];
  for (const t of traffic) candidates.push({ group: t.group, isHero: false, traffic: t });
  for (const c of candidates) {
    const dx = c.group.position.x - state.player.x;
    const dz = c.group.position.z - state.player.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function enterCar() {
  if (state.player.inCar) return false;
  const c = nearestCar();
  if (!c) return false;
  currentCar = c.group;
  state.player.inCar = true;
  state.car.x = c.group.position.x;
  state.car.z = c.group.position.z;
  state.car.heading = c.group.rotation.y;
  state.car.speed = 0;
  maraMesh.visible = false;
  if (c.isHero) {
    // Stealing the Comet IS job 1: "Steal the Comet GT from the marina".
    const job = currentJob(state);
    if (job && job.n === 1) completeCurrentJob(missionCtx);
  }
  if (!c.isHero) {
    if (c.traffic) {
      const idx = traffic.indexOf(c.traffic);
      if (idx >= 0) traffic.splice(idx, 1);
    }
    setWanted(state.wanted + 1);
    hud.toast('VEHICLE STOLEN', c.group.name === 'sedan' ? 'SEDAN' : 'VEHICLE', 'bad');
    hud.logLine('Vehicle stolen — the LCPD noticed.');
  }
  return true;
}

function exitCar() {
  if (!state.player.inCar) return false;
  state.player.inCar = false;
  state.player.x = state.car.x + Math.cos(state.car.heading) * 2.2;
  state.player.z = state.car.z - Math.sin(state.car.heading) * 2.2;
  state.player.heading = state.car.heading;
  currentCar = null;
  maraMesh.visible = true;
  maraMesh.position.set(state.player.x, 0, state.player.z);
  maraMesh.rotation.y = state.player.heading;
  return true;
}

// ---- game flow ----------------------------------------------------------------
function startGame() {
  if (state.started) return;
  state.started = true;
  const title = document.getElementById('titleScreen');
  if (title) title.style.display = 'none';
  audio.ensure();
  audio.radio(state.radioOn);
  if (state.jobIndex === 0 && state.completed.length === 0) {
    startJob(missionCtx, 1);
  } else if (currentJob(state)) {
    startJob(missionCtx, state.jobIndex + 1);
  }
  hud.dialogue('tio', "Comet's yours, Mara. Tio's garage is waiting — don't scratch her.");
}

function pauseGame() {
  if (!state.started || state.paused) return;
  state.paused = true;
  const pause = document.getElementById('pauseScreen');
  if (pause) pause.style.display = 'flex';
}

function resumeGame() {
  if (!state.paused) return;
  state.paused = false;
  const pause = document.getElementById('pauseScreen');
  if (pause) pause.style.display = 'none';
}

function toggleMap() {
  state.mapOpen = !state.mapOpen;
  hud.setMapOpen(state.mapOpen);
}

// ---- input wiring -------------------------------------------------------------
input.onShoot = shoot;
input.onKey = (code, down) => {
  if (!down) return;
  if (code === 'KeyE') {
    if (state.started && !state.paused && !state.frozen) {
      if (state.player.inCar) exitCar();
      else enterCar();
    }
  }
  if (code === 'KeyM') {
    if (state.started && !state.frozen) toggleMap();
  }
  if (code === 'KeyP' || code === 'Escape') {
    if (state.started && !state.frozen) {
      if (state.paused) resumeGame();
      else pauseGame();
    }
  }
  if (code === 'KeyR') {
    state.radioOn = !state.radioOn;
    audio.radio(state.radioOn);
  }
  if (code === 'Digit1') state.weapon = 'fists';
  if (code === 'Digit2') state.weapon = 'pistol';
  if (code === 'Digit3') state.weapon = 'smg';
  if (code === 'Digit4' || code === 'Digit5' || code === 'Digit6') {
    const id = code === 'Digit4' ? 'shotgun' : code === 'Digit5' ? 'rifle' : 'bat';
    if (state.started && !state.paused && !state.frozen) {
      const r = selectWeapon(id);
      if (!r.ok) hud.toast('LOCKED', r.reason, 'bad');
    }
  }
  if (code === 'KeyQ' || code === 'KeyZ' || code === 'KeyX') {
    const id = code === 'KeyQ' ? 'tio' : code === 'KeyZ' ? 'dario' : 'lena';
    const r = useCrewAbility(id);
    if (!r.ok) hud.toast('CREW', r.reason, 'bad');
  }
};

document.getElementById('playBtn').addEventListener('click', () => {
  audio.ensure();
  startGame();
});
const continueBtn = document.getElementById('continueBtn');
if (hasSave()) {
  continueBtn.style.display = 'block';
  continueBtn.addEventListener('click', () => {
    audio.ensure();
    loadGame();
    startGame();
  });
}
document.getElementById('resumeBtn').addEventListener('click', resumeGame);

// ---- per-frame updates ---------------------------------------------------------
const tmpV = new THREE.Vector3();

function updatePlayer(dt) {
  const p = state.player;
  if (p.inCar) {
    // Arcade driving.
    const topMps = (62 + engineBonusKmh(state.engineLevel)) / 3.6;
    const fwd = axis(input, 'KeyS', 'KeyW');
    const steer = axis(input, 'KeyA', 'KeyD');
    const handbrake = input.keys.has('Space');
    const nosBurning = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
    let accel = 0;
    if (fwd > 0) accel = 26;
    else if (fwd < 0) accel = state.car.speed > 0.5 ? -34 : -14;
    let top = topMps;
    if (nosBurning && fwd > 0 && state.nos > 0) {
      accel *= 1.6;
      top *= 1.5;
      state.nos = Math.max(0, state.nos - 22 * dt);
      nosFlames.visible = true;
    } else {
      nosFlames.visible = false;
    }
    state.car.speed += accel * dt;
    state.car.speed -= state.car.speed * 0.45 * dt;
    if (handbrake) state.car.speed -= state.car.speed * 2.6 * dt;
    if (state.car.speed > top) state.car.speed = top;
    if (state.car.speed < -8) state.car.speed = -8;
    const speedFactor = Math.max(-1, Math.min(1, state.car.speed / 8));
    const turnRate = 1.9 * speedFactor * (handbrake ? 1.5 : 1);
    state.car.heading -= steer * turnRate * dt;
    state.car.x += Math.sin(state.car.heading) * state.car.speed * dt;
    state.car.z += Math.cos(state.car.heading) * state.car.speed * dt;
    state.car.x = Math.max(-55, Math.min(375, state.car.x));
    state.car.z = Math.max(-15, Math.min(325, state.car.z));
    p.x = state.car.x;
    p.z = state.car.z;
    p.heading = state.car.heading;
    p.speed = Math.abs(state.car.speed);
    if (currentCar) {
      currentCar.position.set(state.car.x, 0, state.car.z);
      currentCar.rotation.y = state.car.heading;
      for (const w of currentCar.userData.wheels || []) {
        if (w.userData.spin) w.userData.spin.rotation.x += (state.car.speed * dt) / 0.42;
      }
    }
    audio.engine(Math.abs(state.car.speed) / topMps);
  } else {
    // On foot: WASD relative to the camera, mouse drag orbits.
    const fwd = axis(input, 'KeyS', 'KeyW');
    const strafe = axis(input, 'KeyA', 'KeyD');
    const yaw = input.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    let mx = fx * fwd + rx * strafe;
    let mz = fz * fwd + rz * strafe;
    const len = Math.sqrt(mx * mx + mz * mz);
    const running = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
    const speed = running ? 8 : 5;
    if (len > 0.01) {
      mx /= len;
      mz /= len;
      p.x += mx * speed * dt;
      p.z += mz * speed * dt;
      p.heading = Math.atan2(mx, mz);
      p.speed = speed;
      state.walkBob += dt * 10;
    } else {
      p.speed = 0;
    }
    p.x = Math.max(-55, Math.min(375, p.x));
    p.z = Math.max(-15, Math.min(325, p.z));
    maraMesh.position.set(p.x, Math.abs(Math.sin(state.walkBob)) * 0.06, p.z);
    maraMesh.rotation.y = p.heading;
    audio.engine(0);
  }
}

function updateTraffic(dt) {
  for (const t of traffic) {
    if (t.axis === 'x') {
      t.x += t.dir * t.speed * dt;
      if (t.x > 370) t.x = -50;
      if (t.x < -50) t.x = 370;
      t.group.position.x = t.x;
    } else {
      t.z += t.dir * t.speed * dt;
      if (t.z > 320) { t.z = 320; t.dir = -1; t.group.rotation.y = Math.PI; }
      if (t.z < -10) { t.z = -10; t.dir = 1; t.group.rotation.y = 0; }
      t.group.position.z = t.z;
    }
    for (const w of t.group.userData.wheels || []) {
      if (w.userData.spin) w.userData.spin.rotation.x += (t.speed * dt) / 0.38;
    }
  }
}

function updatePeds(dt) {
  for (const p of peds) {
    if (p.fleeing) {
      const dx = p.x - state.player.x;
      const dz = p.z - state.player.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      p.x += (dx / d) * 3.2 * dt;
      p.z += (dz / d) * 3.2 * dt;
      if (d > 45) p.fleeing = false;
    } else {
      p.x += p.dir * p.speed * dt;
      if (p.x > 365) p.dir = -1;
      if (p.x < -45) p.dir = 1;
    }
    p.bob += dt * 8;
    p.group.position.set(p.x, Math.abs(Math.sin(p.bob)) * 0.04, p.z);
    p.group.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

function updatePolice(dt) {
  ensurePolice();
  const px = state.player.x;
  const pz = state.player.z;
  let nearest = Infinity;
  for (const p of police) {
    const gx = p.group.position.x;
    const gz = p.group.position.z;
    const dx = px - gx;
    const dz = pz - gz;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    if (d < nearest) nearest = d;
    // Lena's decoy: a jammed cruiser holds its ground for 8 seconds
    // instead of chasing.
    if (p.jammedUntil && performance.now() < p.jammedUntil) continue;
    const maxSpeed = 16 + 2.4 * state.wanted;
    const heading = Math.atan2(dx, dz);
    p.group.rotation.y = heading;
    const speed = Math.min(maxSpeed, d * 0.8 + 4);
    p.group.position.x += Math.sin(heading) * speed * dt;
    p.group.position.z += Math.cos(heading) * speed * dt;
    for (const w of p.group.userData.wheels || []) {
      if (w.userData.spin) w.userData.spin.rotation.x += (speed * dt) / 0.4;
    }
    // Ramming: a hit shoves Mara and hurts her.
    if (d < 4) {
      if (state.player.inCar) {
        state.car.speed *= 0.55;
      } else {
        state.health -= 25 * dt;
        if (state.player.speed < 1 && d < 2.5) {
          p.busted += dt;
          if (p.busted > 3) busted();
        }
      }
    } else {
      p.busted = 0;
    }
  }
  // Street officers walk toward Mara.
  for (const o of officers) {
    if (!o.alive || o.isGuard) continue;
    const dx = px - o.group.position.x;
    const dz = pz - o.group.position.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    if (d > 3) {
      o.group.position.x += (dx / d) * o.speed * dt;
      o.group.position.z += (dz / d) * o.speed * dt;
      o.group.rotation.y = Math.atan2(dx, dz);
    }
  }
  // Heli circles 18 m out at 26 m up.
  if (heli.visible) {
    const t = performance.now() / 1000;
    heli.position.set(
      px + Math.cos(t * 0.4) * 18,
      26,
      pz + Math.sin(t * 0.4) * 18,
    );
    heli.rotation.y = Math.atan2(px - heli.position.x, pz - heli.position.z);
    if (heli.userData.rotor) heli.userData.rotor.rotation.y += dt * 22;
    if (heli.userData.tailRotor) heli.userData.tailRotor.rotation.z += dt * 30;
  }
  // Wanted decays one star after 8 seconds hidden.
  if (state.wanted > 0) {
    if (nearest > 45) {
      state.hiddenTimer += dt;
      if (state.hiddenTimer > 8) {
        state.hiddenTimer = 0;
        state.wanted--;
        hud.logLine('Heat cooling off — lay low');
        ensurePolice();
      }
    } else {
      state.hiddenTimer = 0;
    }
  }
  if (state.health <= 0) wasted();
}

function spawnStreetOfficers() {
  if (state.wanted < 2) return;
  let alive = 0;
  for (const o of officers) if (o.alive && !o.isGuard) alive++;
  while (alive < 3) {
    const a = runtimeRng.range(0, Math.PI * 2);
    const g = makeOfficer(textures);
    g.position.set(state.player.x + Math.cos(a) * 20, 0, state.player.z + Math.sin(a) * 20);
    scene.add(g);
    officers.push({ group: g, alive: true, isGuard: false, speed: 2.5 });
    alive++;
  }
}

function updateHudView() {
  const p = state.player;
  const job = currentJob(state);
  const speedKmh = p.inCar ? Math.abs(state.car.speed) * 3.6 : p.speed * 3.6;
  const gear = p.inCar ? gearForSpeed(speedKmh, 62 + engineBonusKmh(state.engineLevel)) : 0;
  const policeRows = [];
  for (let i = 0; i < Math.min(3, police.length); i++) {
    const pc = police[i];
    const d = Math.round(Math.hypot(pc.group.position.x - p.x, pc.group.position.z - p.z));
    policeRows.push({ name: pc.name, dist: d, status: i < 2 ? 'CHASING' : 'FLANKING' });
  }
  for (const rb of roadblocks) {
    const d = Math.round(Math.hypot(rb.group.position.x - p.x, rb.group.position.z - p.z));
    policeRows.push({ name: rb.name, dist: d, status: 'ROADBLOCK' });
  }
  if (heli.visible) {
    const d = Math.round(Math.hypot(heli.position.x - p.x, heli.position.z - p.z));
    policeRows.push({ name: 'AIR-1', dist: d, status: 'SPOTLIGHT' });
  }
  const minimap = {
    playerX: p.x,
    playerZ: p.z,
    target: job ? job.target : null,
    police: police.map((pc) => ({ x: pc.group.position.x, z: pc.group.position.z })),
    miniMap: state.mapOpen,
  };
  hud.update(state, {
    job,
    speedKmh,
    gear,
    inCar: p.inCar,
    carName: currentCar === heroCar ? 'VELOZ COMET RS' : 'SEDAN',
    street: streetNameAt(p.x, p.z),
    police: policeRows,
    policeExtra: 4,
    race: { active: race.active, index: race.index, timeLeft: race.timeLeft },
    minimap,
  });
}

// ---- main loop -----------------------------------------------------------------
const clock = new THREE.Clock();
let titleAngle = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  state.frames++;
  render.update(dt);

  if (state.shotActive) {
    // Frozen staging: advance 6 frames, then mark the shot ready.
    state.shotFrames++;
    if (state.shotFrames >= 6) window.__shotReady = true;
    if (marker.visible) {
      markerDiamond.rotation.y += dt;
    }
    render.render();
    return;
  }

  if (state.started && !state.paused) {
    state.clockMin += dt * 0.5;
    // Crew cooldowns tick down; the job timer counts down on timed
    // jobs (the race clock owns job 12's countdown).
    for (const k of Object.keys(state.crewCd)) {
      state.crewCd[k] = Math.max(0, state.crewCd[k] - dt);
    }
    if (race.active) {
      state.jobTimeLeft = race.timeLeft;
    } else if (state.jobTimeLeft != null && state.jobTimeLeft > 0) {
      state.jobTimeLeft = Math.max(0, state.jobTimeLeft - dt);
    }
    ensureRoadblocks();
    updatePlayer(dt);
    updateTraffic(dt);
    updatePeds(dt);
    if (state.wanted > 0) {
      updatePolice(dt);
      spawnStreetOfficers();
    } else if (police.length > 0) {
      ensurePolice();
    }
    if (race.active) race.update(dt, { x: state.player.x, z: state.player.z });
    checkArrival(missionCtx, { x: state.player.x, z: state.player.z });
    if (marker.visible) {
      markerDiamond.rotation.y += dt * 2;
      markerDiamond.position.y = 6 + Math.sin(performance.now() / 400) * 0.4;
    }
    if (tracer.visible) {
      tracerTimer -= dt;
      if (tracerTimer <= 0) tracer.visible = false;
    }
    // Hero fill light follows the player or the hero car.
    const fp = state.player.inCar ? state.car : state.player;
    render.setFill(fp.x - 6, 4, fp.z, 12);
    updateHudView();
    // Camera.
    if (state.player.inCar) {
      render.chaseCamera({ x: state.car.x, y: 0, z: state.car.z }, state.car.heading, 9, 3.4, 10);
    } else {
      render.orbitCamera({ x: state.player.x, y: 0, z: state.player.z }, input.yaw, input.pitch, 7);
    }
  } else {
    // Title / pause: slow orbit around the hero car.
    titleAngle += dt * 0.12;
    render.orbitCamera({ x: 24, y: 0, z: 250 }, titleAngle, 0.32, 16);
    if (!state.started) updateHudView();
  }
  render.render();
}

window.addEventListener('resize', () => render.resize());

// Race callbacks.
race.onCheckpoint = (n) => {
  audio.stinger();
  hud.logLine('Checkpoint ' + n + '/8');
};
race.onWin = () => {
  completeCurrentJob(missionCtx);
};
race.onLose = () => {
  hud.toast('RACE LOST', 'Out of time on the boulevard', 'bad');
  hud.logLine('RACE LOST — the street keeps its king.');
};

// ---- probe / debug API ----------------------------------------------------------
function snapshot() {
  return {
    cash: state.cash,
    rep: state.rep,
    kills: state.kills,
    turf: state.turf.length,
    garageOwned: state.garageOwned,
    engineLevel: state.engineLevel,
    job: state.jobIndex + 1,
    completed: [...state.completed],
    wanted: state.wanted,
    health: state.health,
    nos: state.nos,
    speedKmh: state.player.inCar ? Math.abs(state.car.speed) * 3.6 : state.player.speed * 3.6,
    inCar: state.player.inCar,
    frames: state.frames,
    started: state.started,
    paused: state.paused,
    storyComplete: state.storyComplete,
    smgMag: state.smgMag,
    smgReserve: state.smgReserve,
    shotgunMag: state.shotgunMag,
    shotgunReserve: state.shotgunReserve,
    rifleMag: state.rifleMag,
    rifleReserve: state.rifleReserve,
    policeActive: police.length,
    roadblocks: roadblocks.length,
    day: Math.floor(state.clockMin / 1440) + 1,
    jobTimeLeft: state.jobTimeLeft,
    crewCd: { ...state.crewCd },
    heliVisible: heli.visible,
  };
}

window.__lumen = {
  state,
  start: startGame,
  pause: pauseGame,
  resume: resumeGame,
  startMission(n) {
    startJob(missionCtx, n);
    return snapshot();
  },
  completeMission() {
    const done = completeCurrentJob(missionCtx);
    return { done: done ? done.n : null, snap: snapshot() };
  },
  completeAllMissions() {
    const done = completeAllJobs(missionCtx);
    return { done, snap: snapshot() };
  },
  enterCar,
  exitCar,
  setWanted,
  setWeapon(w) {
    if (WEAPONS[w]) return selectWeapon(w).ok ? state.weapon : state.weapon;
    return state.weapon;
  },
  selectWeapon,
  useCrew: useCrewAbility,
  burnNos() {
    state.nos = Math.max(0, state.nos - 30);
    return state.nos;
  },
  buyEngine() {
    return garageBuyEngine(state);
  },
  save: saveGame,
  load: loadGame,
  shoot,
  snapshot,
};

// ---- boot ------------------------------------------------------------------------
const G = {
  scene, state, hud, render, textures, rng, city,
  heroCar, maraMesh, heli, nosFlames, marker, race,
  traffic: traffic.map((t) => ({ group: t.group })),
  peds: peds.map((p) => ({ group: p.group })),
  police: police.map((p) => ({ group: p.group })),
  officers: officers.map((o) => ({ group: o.group })),
  roadblocks: roadblocks.map((r) => ({ group: r.group })),
  staged: [],
};
window.__lumenGame = G;

if (shotNum >= 1 && shotNum <= 4) {
  // Staged-shot mode: hide the title, start the game, pin the shot.
  const title = document.getElementById('titleScreen');
  if (title) title.style.display = 'none';
  state.started = true;
  // Live actor lists must be the real arrays for the shot stager.
  G.traffic = traffic;
  G.peds = peds;
  G.police = police;
  G.officers = officers;
  applyShot(shotNum, G);
  // Keep the minimap live for the pinned HUD.
  updateHudView();
} else {
  hud.dialogue('tio', "Comet's yours, Mara. Tio's garage is waiting — don't scratch her.");
  hud.logLine('LUMEN BAY — Puerto Lumen, 18:40. Press M to start the story.');
  updateHudView();
}

render.resize();
frame();
