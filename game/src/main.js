// LUMEN BAY — boot, game loop and the wiring between every system.
//
// The game moves between five screens: title, play, paused, busted/wasted
// (a respawn interstitial) and the all-missions-done celebration. The loop is
// fixed-step (1/60 s): input is read every frame, the world advances in whole
// steps, and the renderer paints what is there. A ?shot=1..4 URL parameter
// stages a fixed scene instead of the loop and sets window.__shotReady.
//
// What lives where:
//   config.js    tuning, landmarks, the 12 missions, radio stations
//   city.js      the island, colliders, beacon, pickups
//   vehicles.js  car physics, traffic, police, helicopter
//   people.js    Mara, pedestrians, cordon officers
//   missions.js  the mission state machine
//   audio.js     synth engine, sirens, radio
//   hud.js       DOM overlay, minimap, screens
//   render.js    WebGL renderer, camera rig, tracers, damage numbers
//   input.js     keyboard/mouse, one-shot actions
//   shots.js     the four staged screenshot scenes

import * as THREE from '../vendor/three/three.module.min.js';
import { STEP, WORLD, LANDMARKS, MISSIONS, SAVE_KEY, CAR, WANTED, PLAYER } from './config.js';
import { createRandom, clamp } from './random.js';
import { buildCity, resolveCollisions, onRoad } from './city.js';
import {
  makeCarMesh, createCarState, driveCar, createTraffic, updateTraffic,
  createPolice, updatePolice, createHelicopter, updateHelicopter,
} from './vehicles.js';
import {
  createPlayer, movePlayer, createPedestrians, updatePedestrians,
  createCordon, updateCordon, hitOfficer,
} from './people.js';
import {
  createMissionState, currentMission, currentStage, stageText,
  startMission, updateMissions, registerKill, missionSave, missionListText,
} from './missions.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { createRenderer, createEffects, createCameraRig } from './render.js';
import {
  createInput, ACTION_MISSION, ACTION_ENTER, ACTION_PAUSE,
  ACTION_WEAPON1, ACTION_WEAPON2, ACTION_RADIO, ACTION_CONFIRM,
} from './input.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) && seedParam > 0 ? seedParam : 20261118;
const MAX_FRAME = 0.25;

const canvas = document.getElementById('game');
const { renderer, scene, camera } = createRenderer(canvas);
const effects = createEffects(scene);
const rig = createCameraRig(camera);
const hud = createHud();
const audio = createAudio();
const input = createInput(canvas);
const city = buildCity(scene, seed);

// --- World state -------------------------------------------------------------
const G = {
  screen: 'title',
  time: 0,
  seed,
  cash: 250,
  wanted: 0,
  wantedTimer: 0,
  lastCrimeAt: -100,
  health: PLAYER.health,
  armour: PLAYER.armour,
  player: null,
  heroCar: null,
  traffic: [],
  police: createPolice(scene),
  heli: createHelicopter(scene),
  cordon: [],
  cordonTarget: null,
  missions: null,
  stageKills: 0,
  lastStageKey: '',
  stoleMissionCar: false,
  stolePoliceCar: false,
  gunfirePos: null,
  gunfireAt: -100,
  damagedAt: 0,
  bustedTimer: 0,
  dialogue: null,
  dialogueUntil: 0,
  saveTimer: 0,
  repairCooldown: 0,
  killFeed: [],
  heroStolen: false,
  allDoneShown: false,
};

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSave() {
  try {
    const p = G.player;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: G.cash,
      missionIndex: G.missions.index,
      missionsDone: G.missions.done,
      px: p ? p.x : 0, pz: p ? p.z : 0,
      health: G.health, armour: G.armour,
      savedAt: new Date().toISOString(),
    }));
  } catch { /* storage can be off; the session still plays */ }
}

function loadSaveIntoGame(save) {
  if (!save) return;
  if (Number.isFinite(save.cash)) G.cash = Math.max(0, save.cash);
  if (Number.isFinite(save.health)) G.health = save.health;
  if (Number.isFinite(save.armour)) G.armour = save.armour;
}

// --- Build the actors ----------------------------------------------------------
const save = readSave();
G.missions = createMissionState(save);
loadSaveIntoGame(save);

G.player = createPlayer(scene, city.spawn.x, city.spawn.z);
G.player.health = G.health;
G.player.armour = G.armour;
if (save && Number.isFinite(save.px) && Number.isFinite(save.pz)) {
  G.player.x = save.px; G.player.z = save.pz;
  G.player.mesh.position.set(save.px, 0, save.pz);
}

// The Comet GT: sunset-orange hero car, parked at the marina for Job 1.
const heroMesh = makeCarMesh(0xff7a2e, { hero: true });
scene.add(heroMesh);
G.heroCar = createCarState(heroMesh, LANDMARKS.marina.x + 6, LANDMARKS.marina.z + 4, Math.PI / 2, { hero: true });
G.heroCar.mesh.position.set(G.heroCar.x, 0, G.heroCar.z);
G.heroCar.mesh.rotation.y = G.heroCar.heading;

G.traffic = createTraffic(scene, seed, city.colliders);

// --- Mission events --------------------------------------------------------------
function emit(type, payload) {
  if (type === 'log') hud.pushLog(payload);
  else if (type === 'dialogue') {
    G.dialogue = payload;
    G.dialogueUntil = G.time + 7;
  } else if (type === 'banner') {
    // The banner is shown through the HUD state; it clears itself.
  } else if (type === 'cash') {
    G.cash += payload;
    audio.stinger('cash');
    writeSave();
  } else if (type === 'heat') {
    G.wanted = Math.max(G.wanted, payload);
    G.lastCrimeAt = G.time;
  } else if (type === 'cordon') {
    clearCordon();
    G.cordon = createCordon(scene, payload.x, payload.z, payload.count, seed + G.missions.index * 13);
    G.cordonTarget = { x: payload.x, z: payload.z };
    G.stageKills = 0;
  } else if (type === 'failed') {
    hud.pushLog(payload, true);
    audio.stinger('fail');
    G.wanted = Math.max(G.wanted, 1);
  }
}

function clearCordon() {
  for (const o of G.cordon) scene.remove(o.mesh);
  G.cordon = [];
  G.cordonTarget = null;
}

// --- Wanted, crime, damage ---------------------------------------------------------
function addHeat(amount) {
  G.wanted = clamp(G.wanted + amount, 0, WANTED.maxStars);
  G.lastCrimeAt = G.time;
}

function damagePlayer(amount) {
  if (G.screen !== 'play' || amount <= 0) return;
  let left = amount;
  if (G.armour > 0) {
    const absorbed = Math.min(G.armour, left * 0.6);
    G.armour -= absorbed;
    left -= absorbed;
  }
  G.health -= left;
  G.damagedAt = G.time;
  if (G.health <= 0) {
    G.health = 0;
    wasted();
  }
}

function respawn(reason) {
  const penalty = Math.min(G.cash, Math.max(50, Math.floor(G.cash * 0.1)));
  G.cash -= penalty;
  G.health = PLAYER.health;
  G.armour = Math.max(G.armour, 25);
  G.wanted = 0;
  G.bustedTimer = 0;
  clearCordon();
  if (G.player.inCar) exitCar();
  G.player.x = city.spawn.x; G.player.z = city.spawn.z;
  G.player.mesh.position.set(city.spawn.x, 0, city.spawn.z);
  G.player.mesh.visible = true;
  hud.pushLog(`${reason} — respawned at the safehouse (-$${penalty})`, true);
  writeSave();
  G.screen = 'play';
  hud.hideScreen();
}

function busted() {
  G.screen = 'busted';
  audio.stinger('fail');
  hud.showEnd('BUSTED', 'The Puerto Lumen police caught up with Mara.', () => respawn('BUSTED'));
}

function wasted() {
  G.screen = 'wasted';
  audio.stinger('fail');
  hud.showEnd('WASTED', 'Mara went down in the streets of Puerto Lumen.', () => respawn('WASTED'));
}

// --- Cars: enter / steal / exit ------------------------------------------------------
function nearestCar(maxDist) {
  const p = G.player;
  let best = null, bestD = maxDist;
  const candidates = [G.heroCar, ...G.traffic, ...G.police.cars];
  for (const c of candidates) {
    if (!c || !c.mesh.parent) continue;
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function enterCar(car) {
  const p = G.player;
  p.inCar = car;
  p.mesh.visible = false;
  car.mesh.position.y = 0;
  if (car === G.heroCar && !G.heroStolen) {
    G.heroStolen = true;
    if (G.missions.active) {
      const s = currentStage(G.missions);
      if (s && s.verb === 'steal') G.stoleMissionCar = true;
    }
    addHeat(WANTED.stealHeat);
    hud.pushLog('Stole the Comet GT! The heat is on.', true);
    audio.stinger('mission');
  } else if (car.police) {
    addHeat(WANTED.stealHeat + 1);
    hud.pushLog('Stole a police cruiser! Every cop in Puerto Lumen is coming.', true);
    if (G.missions.active) {
      const s = currentStage(G.missions);
      if (s && s.verb === 'stealPolice') G.stolePoliceCar = true;
    }
  } else if (car.traffic) {
    addHeat(WANTED.stealHeat);
    hud.pushLog('Carjacked a ride. Someone is calling the police.', true);
  }
  audio.start();
}

function exitCar() {
  const p = G.player;
  const car = p.inCar;
  if (!car) return;
  p.inCar = null;
  p.x = car.x - Math.sin(car.heading) * 3;
  p.z = car.z - Math.cos(car.heading) * 3;
  p.mesh.visible = true;
  p.mesh.position.set(p.x, 0, p.z);
  p.heading = car.heading;
}

// --- Shooting -------------------------------------------------------------------------
function shoot() {
  const p = G.player;
  const now = G.time;
  const rate = p.weapon === 'smg' ? PLAYER.smgRate : PLAYER.pistolRate;
  if (now - p.lastShot < rate) return;
  if (p.weapon === 'smg') {
    if (p.smgAmmo <= 0) { p.weapon = 'pistol'; hud.pushLog('SMG dry — back to the pistol.'); return; }
    p.smgAmmo -= 1;
  }
  p.lastShot = now;
  const dmg = p.weapon === 'smg' ? PLAYER.smgDamage : PLAYER.pistolDamage;
  const muzzle = { x: p.x + Math.sin(p.heading) * 1.2, y: 1.5, z: p.z + Math.cos(p.heading) * 1.2 };
  effects.muzzleFlash(muzzle);
  audio.gunshot();
  addHeat(WANTED.shootHeat * 0.4);
  G.gunfirePos = { x: p.x, z: p.z };
  G.gunfireAt = now;
  // Hitscan: the nearest living officer roughly in front of Mara, within 42 m.
  let best = null, bestScore = Infinity;
  for (const o of G.cordon) {
    if (!o.alive) continue;
    const dx = o.x - p.x, dz = o.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > 42) continue;
    const ang = Math.atan2(dx, dz);
    let diff = ang - p.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const score = d + Math.abs(diff) * 22;
    if (Math.abs(diff) < 0.42 && score < bestScore) { bestScore = score; best = o; }
  }
  if (best) {
    const hitPos = { x: best.x, y: 1.4, z: best.z };
    effects.tracer(muzzle, hitPos, 0xffe14d);
    effects.damageNumber(hitPos, String(dmg), '#ffd24d');
    if (hitOfficer(best, dmg)) {
      G.stageKills += 1;
      addHeat(WANTED.killHeat * 0.4);
      hud.pushLog('Officer down!', true);
      registerKill(G.missions, emit);
    }
  } else {
    const fwd = { x: p.x + Math.sin(p.heading) * 40, y: 1.3, z: p.z + Math.cos(p.heading) * 40 };
    effects.tracer(muzzle, fwd, 0xffe14d);
  }
}

// --- One fixed step -------------------------------------------------------------------
function missionContext() {
  const m = currentMission(G.missions);
  const s = currentStage(G.missions);
  return {
    px: G.player.x, pz: G.player.z,
    inCar: !!G.player.inCar,
    carSpeed: G.player.inCar ? Math.abs(G.player.inCar.speed) : 0,
    kills: G.stageKills,
    wanted: G.wanted,
    time: G.time,
    stoleMissionCar: G.stoleMissionCar,
    stolePoliceCar: G.stolePoliceCar,
    mission: m, stage: s,
  };
}

function step(dt) {
  G.time += dt;
  const p = G.player;

  // --- Input: one-shot actions -------------------------------------------------
  const actions = input.takeActions();
  const orbit = input.takeOrbit();
  if (orbit.x || orbit.y) rig.addOrbit(orbit.x, orbit.y);

  if (actions & ACTION_PAUSE) {
    if (G.screen === 'play') {
      G.screen = 'paused';
      hud.showPause(missionListText(G.missions), () => { G.screen = 'play'; });
    } else if (G.screen === 'paused') {
      G.screen = 'play';
      hud.hideScreen();
    }
  }
  if (G.screen !== 'play') return;

  if (actions & ACTION_MISSION) {
    if (!G.missions.active) {
      if (startMission(G.missions, emit)) {
        G.stoleMissionCar = false;
        G.stolePoliceCar = false;
        audio.stinger('mission');
      }
    }
  }
  if (actions & ACTION_ENTER) {
    if (p.inCar) exitCar();
    else {
      const car = nearestCar(4.5);
      if (car) enterCar(car);
    }
  }
  if (actions & ACTION_WEAPON1) { p.weapon = 'pistol'; hud.pushLog('Pistol equipped.'); }
  if (actions & ACTION_WEAPON2) {
    if (p.smgAmmo > 0) { p.weapon = 'smg'; hud.pushLog('SMG equipped.'); }
    else hud.pushLog('No SMG ammo — find a pickup.');
  }
  if (actions & ACTION_RADIO) {
    G.stationIdx = ((G.stationIdx || 0) + 1) % 3;
    const name = audio.setStation(G.stationIdx);
    audio.stationBlip();
    hud.pushLog(`Radio: ${name}`);
  }
  if (input.firing() || G.shotFire) { shoot(); G.shotFire = false; }

  // --- Movement ------------------------------------------------------------------
  const mv = input.move();
  if (p.inCar) {
    const car = p.inCar;
    const travelled = driveCar(car, {
      forward: mv.y > 0, back: mv.y < 0,
      left: mv.x < 0, right: mv.x > 0,
      handbrake: input.handbrake(),
    }, dt, city.colliders);
    void travelled;
    p.x = car.x; p.z = car.z; p.heading = car.heading;
    // Speeding past a nearby cruiser adds heat.
    for (const pc of G.police.cars) {
      if (Math.hypot(pc.x - car.x, pc.z - car.z) < 12 && Math.abs(car.speed) > 30) {
        addHeat(WANTED.speedHeat * dt * 4);
      }
    }
    // Garage repair: stopped at Taller Lumen with a dented car.
    G.repairCooldown -= dt;
    if (Math.hypot(car.x - LANDMARKS.taller.x, car.z - LANDMARKS.taller.z) < 12
      && car.health < 100 && G.cash >= CAR.repairFee && G.repairCooldown <= 0) {
      G.cash -= CAR.repairFee;
      car.health = 100;
      G.repairCooldown = 8;
      hud.pushLog(`Car repaired at Taller Lumen (-$${CAR.repairFee}).`, true);
      audio.stinger('pickup');
    }
    // Busted check: a cruiser sitting on a slow player.
    if (G.wanted >= 1) {
      let close = false;
      for (const pc of G.police.cars) {
        if (Math.hypot(pc.x - car.x, pc.z - car.z) < 4 && Math.abs(car.speed) < 2) close = true;
      }
      G.bustedTimer = close ? G.bustedTimer + dt : 0;
      if (G.bustedTimer > 2) { busted(); return; }
    }
  } else {
    const fwd = rig.forward();
    const right = { x: -fwd.z, z: fwd.x };
    const mx = fwd.x * mv.y + right.x * mv.x;
    const mz = fwd.z * mv.y + right.z * mv.x;
    const len = Math.hypot(mx, mz) || 1;
    movePlayer(p, { x: mx / len * Math.min(1, Math.hypot(mv.x, mv.y)), z: mz / len * Math.min(1, Math.hypot(mv.x, mv.y)) },
      input.sprint(), dt, city.colliders);
    // Busted on foot: a cruiser right on top of a slow Mara.
    if (G.wanted >= 1 && p.speed < 2) {
      let close = false;
      for (const pc of G.police.cars) {
        if (Math.hypot(pc.x - p.x, pc.z - p.z) < 3.5) close = true;
      }
      G.bustedTimer = close ? G.bustedTimer + dt : 0;
      if (G.bustedTimer > 1.5) { busted(); return; }
    } else G.bustedTimer = 0;
  }

  // --- World ---------------------------------------------------------------------
  updateTraffic(G.traffic, dt, G.time);
  updatePedestrians(G.pedestrians, dt, G.time - G.gunfireAt < 0.5 ? G.gunfirePos : null);
  const heliOn = updateHelicopter(G.heli, { x: p.x, z: p.z }, G.wanted, dt, G.time);
  updatePolice(G.police, { x: p.x, z: p.z, heading: p.heading },
    p.inCar ? Math.abs(p.inCar.speed) : Math.abs(p.speed), G.wanted, dt, G.time, scene, city.colliders);
  void heliOn;

  // Cordon officers shoot back; their hits land through damagePlayer.
  if (G.cordon.length) {
    updateCordon(G.cordon, p, dt, (dmg) => {
      if (dmg > 0) {
        damagePlayer(dmg);
        effects.tracer({ x: p.x, y: 1.4, z: p.z }, { x: p.x, y: 1.4, z: p.z }, 0xff5e7a);
      }
    });
  }

  // Wanted decay: heat only cools when no police can see Mara and no crime
  // happened recently; the helicopter overhead blocks the cooldown.
  const nearestCop = G.police.cars.reduce((m, c) =>
    Math.min(m, Math.hypot(c.x - p.x, c.z - p.z)), Infinity);
  const heliBlocking = G.wanted >= 3;
  if (G.time - G.lastCrimeAt > WANTED.decayDelay && nearestCop > 70 && !heliBlocking) {
    G.wanted = Math.max(0, G.wanted - WANTED.decayRate * dt);
  }

  // Pickups: health and armour crates scattered through the city.
  for (const pk of city.pickups) {
    if (pk.taken) {
      pk.respawn -= dt;
      if (pk.respawn <= 0) { pk.taken = false; pk.mesh.visible = true; }
      continue;
    }
    pk.mesh.rotation.y += dt * 1.5;
    pk.mesh.position.y = 1.2 + Math.sin(G.time * 2 + pk.x) * 0.25;
    if (Math.hypot(pk.x - p.x, pk.z - p.z) < 2.4) {
      pk.taken = true; pk.mesh.visible = false; pk.respawn = 25;
      if (pk.kind === 'health') { G.health = Math.min(100, G.health + 30); hud.pushLog('Health +30.', true); }
      else { G.armour = Math.min(100, G.armour + 30); hud.pushLog('Armour +30.', true); }
      audio.stinger('pickup');
    }
  }

  // --- Missions --------------------------------------------------------------------
  const stageKey = `${G.missions.index}:${G.missions.stage}`;
  if (stageKey !== G.lastStageKey) {
    G.lastStageKey = stageKey;
    const s = currentStage(G.missions);
    if (s && s.verb === 'shoot') G.stageKills = 0;
  }
  const ctx = missionContext();
  updateMissions(G.missions, ctx, dt, emit);
  G.stoleMissionCar = false;
  G.stolePoliceCar = false;

  // All missions done: celebrate once, then keep the city free-roamable.
  if (!G.missions.active && G.missions.index >= MISSIONS.length && !G.allDoneShown) {
    G.allDoneShown = true;
    hud.pushLog('ALL 12 JOBS DONE — Puerto Lumen is yours, Mara!', true);
    audio.stinger('mission');
    writeSave();
  }

  // Dialogue expires after its window.
  if (G.dialogue && G.time > G.dialogueUntil) G.dialogue = null;

  // --- Audio + beacon ---------------------------------------------------------------
  audio.setEngine(p.inCar ? Math.abs(p.inCar.speed) / CAR.maxSpeed : 0, !!p.inCar);
  audio.setSiren(G.wanted);
  const s = currentStage(G.missions);
  if (G.missions.active && s) {
    city.beacon.visible = true;
    city.beacon.position.set(s.x, 30, s.z);
    city.ring.visible = true;
    city.ring.position.set(s.x, 0.25, s.z);
    city.beacon.material.opacity = 0.4 + 0.2 * Math.sin(G.time * 4);
  } else {
    city.beacon.visible = false;
    city.ring.visible = false;
  }
  if (city.beam) city.beam.rotation.y += dt * 0.5;

  // Autosave every 5 seconds of play.
  G.saveTimer += dt;
  if (G.saveTimer > 5) { G.saveTimer = 0; writeSave(); }

  effects.update(dt);
}

// --- HUD state -------------------------------------------------------------------------
function hudState() {
  const p = G.player;
  const m = currentMission(G.missions);
  const s = currentStage(G.missions);
  return {
    px: p.x, pz: p.z, heading: p.heading,
    wanted: G.wanted, cash: G.cash,
    health: G.health, armour: G.armour,
    speed: p.inCar ? p.inCar.speed : p.speed,
    weapon: p.weapon, smgAmmo: p.smgAmmo,
    objective: stageText(G.missions),
    radio: audio.stationName(),
    banner: G.missions.banner,
    dialogue: G.dialogue,
    damagedAt: G.damagedAt,
    missionTarget: G.missions.active && s ? { x: s.x, z: s.z } : null,
    landmarks: Object.values(LANDMARKS),
    police: G.police.cars.map((c) => ({ x: c.x, z: c.z })),
    heli: G.wanted >= 3 ? { x: G.heli.mesh.position.x, z: G.heli.mesh.position.z } : null,
    missionName: m ? m.name : 'Complete',
  };
}

// --- Main loop ------------------------------------------------------------------------------
function frame(now) {
  requestAnimationFrame(frame);
  const dtMs = Math.min(now - (frame.last || now), MAX_FRAME * 1000);
  frame.last = now;
  const dt = dtMs / 1000;
  if (G.screen === 'play' || G.screen === 'title') {
    let acc = (frame.acc || 0) + dt;
    let n = 0;
    while (acc >= STEP && n < 8) {
      if (G.screen === 'play') step(STEP);
      acc -= STEP; n += 1;
    }
    frame.acc = acc;
  }
  const p = G.player;
  const target = p.inCar ? { x: p.inCar.x, y: 1.5, z: p.inCar.z } : { x: p.x, y: 1.5, z: p.z };
  rig.update(target, p.inCar ? 'car' : 'foot', p.inCar ? p.inCar.speed : p.speed, dt);
  renderer.render(scene, camera);
  if (G.screen === 'play' || G.screen === 'title') hud.update(hudState());
}

// Pedestrians are created after the first frame's definitions to keep the
// boot order simple: city first, actors second.
G.pedestrians = createPedestrians(scene, seed);

// --- Boot ----------------------------------------------------------------------------
function startGame() {
  audio.start();
  G.screen = 'play';
  hud.pushLog('Welcome to Puerto Lumen, Mara. Press M to start Job 1.', true);
  hud.pushLog('Steal cars with E. Outrun the police. Mind the helicopter.', true);
  rig.snap({ x: G.player.x, y: 1.5, z: G.player.z }, 'foot');
}

if (shotParam) {
  // Screenshot mode: stage the scene, warm it up, render, signal readiness.
  G.screen = 'play';
  hud.hideScreen();
  stageShot(G, shotParam, {
    emit, startMission, enterCar, hud, audio, scene, effects,
    rigYaw: (v) => { rig.yaw = v; },
  });
  rig.snap({ x: G.player.x, y: 1.5, z: G.player.z }, G.player.inCar ? 'car' : 'foot');
  let painted = 0;
  function paintShot() {
    // Let traffic, pedestrians and the helicopter settle for a few frames.
    for (let i = 0; i < 6; i += 1) step(STEP);
    // On the final paint, fire once more so a fresh tracer and muzzle flash
    // are in the frame for the shootout scene.
    if (painted === 2 && G.cordon.some((o) => o.alive)) {
      const o = G.cordon.find((c) => c.alive);
      if (o) {
        G.player.heading = Math.atan2(o.x - G.player.x, o.z - G.player.z);
        G.player.mesh.rotation.y = G.player.heading;
        G.shotFire = true;
        step(STEP);
      }
    }
    const p = G.player;
    const target = p.inCar ? { x: p.inCar.x, y: 1.5, z: p.inCar.z } : { x: p.x, y: 1.5, z: p.z };
    rig.update(target, p.inCar ? 'car' : 'foot', p.inCar ? p.inCar.speed : p.speed, STEP);
    renderer.render(scene, camera);
    hud.update(hudState());
    painted += 1;
    if (painted < 3) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintShot);
} else {
  hud.showTitle(save, startGame);
  // Title-screen backdrop: slow orbit around the marina while the menu shows.
  rig.yaw = Math.PI * 0.75;
  requestAnimationFrame(frame);
}

// Probe + debugging handle: the headless playtest drives the game through
// this object instead of synthesising DOM events for everything.
window.__lumen = {
  G, input, audio, hud,
  start: startGame,
  press: (code) => input.press(code),
  hold: (name, on) => input.hold(name, on),
  step: (n) => { for (let i = 0; i < n; i += 1) step(STEP); },
  state: () => ({
    screen: G.screen, cash: G.cash, wanted: G.wanted,
    health: G.health, armour: G.armour,
    mission: G.missions.index + 1, missionActive: G.missions.active,
    stage: G.missions.stage, stageText: stageText(G.missions),
    px: G.player.x, pz: G.player.z,
    inCar: !!G.player.inCar, carSpeed: G.player.inCar ? G.player.inCar.speed : 0,
    police: G.police.cars.length, heli: G.wanted >= 3,
    cordon: G.cordon.filter((o) => o.alive).length,
    banner: G.missions.banner, done: G.missions.done.slice(),
    audio: audio.state(),
  }),
};
