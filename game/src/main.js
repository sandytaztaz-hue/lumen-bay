// LUMEN BAY — boot, the one loop and the glue between every system.
// Fixed 1/60 s steps, several in a slow frame, none in a fast one. Screens:
// title, play, paused, busted/wasted. ?seed=N fixes the world; ?shot=1..4
// stages a fixed scene for screenshots and sets window.__shotReady.
import * as THREE from 'three';
import { CAR, CLOCK, PALETTE, PLAYER, SAVE_KEY, SEED_DEFAULT, STEP, WANTED, WEAPONS } from './config.js';
import { createRandom } from './random.js';
import { makeTextures } from './textures.js';
import { buildCity, clampWorld, collideCircle } from './city.js';
import { createTraffic, makeCruiser, makeHelicopter, makeCarMesh, updateCruiser, updateHelicopter, updatePlayerCar, updateTraffic } from './vehicles.js';
import { createPedestrians, createPickups, makeCrewMember, makeFootCop, updateFootCop, updatePedestrians, updatePickups } from './people.js';
import { MissionManager } from './missions.js';
import { AudioEngine } from './audio.js';
import { HUD } from './hud.js';
import { createScene, makeBeacon, MuzzleFlash, resize, Tracers, updateBeacon, updateCamera } from './render.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_FIRE, ACTION_MISSION, ACTION_PAUSE, ACTION_RADIO, ACTION_WEAPON1, ACTION_WEAPON2, createInput } from './input.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotParam = Number.parseInt(params.get('shot') ?? '', 10);
const shot = Number.isInteger(shotParam) && shotParam >= 1 && shotParam <= 4 ? shotParam : 0;
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : SEED_DEFAULT;

const canvas = document.getElementById('game');
const rng = createRandom(seed);
const tex = makeTextures(rng);
const { renderer, scene, camera } = createScene(canvas);
const city = buildCity(scene, rng, tex);
const hud = new HUD();
const audio = new AudioEngine();
const input = createInput(canvas);
const tracers = new Tracers(scene);
const muzzle = new MuzzleFlash(scene);
const beacon = makeBeacon(scene);

const traffic = createTraffic(scene, rng, 12);
const peds = createPedestrians(scene, rng, 24);
const pickups = createPickups(scene, rng);
const heli = makeHelicopter(scene);

// --- Player and world state -------------------------------------------------
const player = {
  pos: new THREE.Vector3(-65, 0, 185),
  angle: Math.PI, health: PLAYER.maxHealth, armour: 0, cash: PLAYER.startCash,
  weapon: 'pistol', ammo: null, smgUnlocked: false,
  inCar: false, car: null, fireCooldown: 0, lastHurt: -99, bustedTimer: 0,
  mesh: null, walkPhase: 0,
};
const state = {
  screen: 'title', wanted: 0, time: 0, lastSave: 0,
  cruisers: [], footCops: [], parked: [], crew: [], van: null,
  gunfireAt: null, gunfireTimer: 0, lastShotWanted: -99,
  copSpawnTimer: 0, missionBanner: '',
};
let camYaw = Math.PI, camPitch = 0.28, camDist = 9;

// The player figure: driver Mara Solis, sunset-orange jacket.
function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xe86a2a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a2a33 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a077 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.05, 8), jacket);
  body.position.y = 1.05; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
  head.position.y = 1.85; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.31, 10, 8), new THREE.MeshLambertMaterial({ color: 0x241a12 }));
  hair.position.set(0, 1.92, -0.06); hair.scale.set(1, 0.85, 1); g.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), pants);
  legL.position.set(-0.14, 0.28, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.14; g.add(legR);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), jacket);
  armR.position.set(0.48, 1.3, 0.2); armR.rotation.x = -0.9; g.add(armR);
  g.userData.legs = [legL, legR];
  g.userData.arm = armR;
  return g;
}
player.mesh = makePlayerMesh();
scene.add(player.mesh);

// Parked cars the player can steal, including the Comet GT for Job 1.
function addParked(kind, color, x, z, angle, name) {
  const mesh = makeCarMesh(color, kind);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = angle;
  scene.add(mesh);
  const car = { mesh, pos: new THREE.Vector3(x, 0, z), angle, speed: 0, kind, health: 100, name, parked: true };
  state.parked.push(car);
  return car;
}
addParked('gt', 0xff5a2a, 8, -258, Math.PI / 2, 'Comet GT');
addParked('sedan', 0x3a7ad9, -40, -190, 0, 'Vento');
addParked('sedan', 0xe8c23a, 70, 60, Math.PI, 'Taxi Libre');
addParked('sedan', 0x2a9e6a, -150, 150, Math.PI / 2, 'Brisa');
addParked('van', 0xe8e0d0, 150, 90, -Math.PI / 2, 'Courier Van');
addParked('sedan', 0x8a4ad9, -90, -60, 0, 'Lumen S');
addParked('sedan', 0xd84040, 40, 230, Math.PI, 'Solara');

// --- Save / load ------------------------------------------------------------
function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: player.cash, nextMission: missions.nextIndex, jobsDone: missions.completedCount,
      totalEarned: missions.totalEarned, health: player.health, armour: player.armour,
      x: player.pos.x, z: player.pos.z, smg: player.smgUnlocked,
    }));
  } catch { /* storage unavailable — the game still plays */ }
}

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// --- Wanted level -----------------------------------------------------------
function setWanted(n) {
  state.wanted = Math.max(0, Math.min(WANTED.max, n));
  syncCruisers();
}

function addWanted(n) {
  setWanted(state.wanted + n);
  syncCruisers();
}

function nearestRoadPoint(p) {
  // Snap a point to the nearest road centreline for police spawns.
  const roads = [-195, -130, -65, 0, 65, 130, 195];
  let bx = roads[0], bz = roads[0];
  for (const r of roads) { if (Math.abs(p.x - r) < Math.abs(p.x - bx)) bx = r; if (Math.abs(p.z - r) < Math.abs(p.z - bz)) bz = r; }
  return Math.abs(p.x - bx) < Math.abs(p.z - bz) ? { x: bx, z: p.z } : { x: p.x, z: bz };
}

function syncCruisers() {
  const want = state.wanted > 0 ? Math.min(state.wanted, 3) : 0;
  while (state.cruisers.length < want) {
    const p = nearestRoadPoint(player.pos);
    const dx = p.x - player.pos.x, dz = p.z - player.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const spawn = { x: p.x + (dx / d) * 40, z: p.z + (dz / d) * 40 };
    state.cruisers.push(makeCruiser(scene, spawn.x, spawn.z));
  }
  while (state.cruisers.length > want) {
    const c = state.cruisers.pop();
    scene.remove(c.mesh);
  }
}

function spawnFootCops(x, z, count) {
  for (let i = 0; i < count; i += 1) {
    const cop = makeFootCop(scene, x + (i - count / 2) * 4, z + (i % 2) * 5);
    state.footCops.push(cop);
  }
}

function clearFootCops() {
  for (const cop of state.footCops) scene.remove(cop.mesh);
  state.footCops = [];
}

function spawnParkedPoliceNear() {
  const p = nearestRoadPoint(player.pos);
  const car = addParked('police', 0x1c4fd6, p.x + 6, p.z + 4, 0, 'Police Cruiser');
  hud.log('A police cruiser is parked nearby — take it.');
  return car;
}

// --- Missions ---------------------------------------------------------------
const missions = new MissionManager({
  log: (t) => hud.log(t),
  setWanted,
  onMissionStart: (m) => { hud.log(`MARA: "${m.brief}"`); },
  onStageStart: (m, s) => {
    if (s.type === 'shoot' && s.count) spawnFootCops(s.pos.x, s.pos.z, s.count);
    if (s.patrols) { addWanted(1); }
    if (s.type === 'steal' && s.carKind === 'police') spawnParkedPoliceNear();
    if (m.id === 6 && s.type === 'goto') {
      const dario = makeCrewMember(scene, -126, 4, 0x39d5ff);
      state.crew.push({ ...dario, name: 'Big Dario' });
    }
    if (m.id === 7) {
      const lena = makeCrewMember(scene, s.pos.x + 3, s.pos.z + 3, 0xe84a6f);
      state.crew.push({ ...lena, name: 'Lena Cruz' });
    }
    if (m.id === 5 && s.type === 'goto') {
      const van = addParked('van', 0xd8d0c0, 195, 130, Math.PI / 2, 'Courier Van');
      state.van = van;
    }
  },
  onMissionComplete: (m, reward) => {
    player.cash += reward;
    hud.banner('JOB DONE', `${m.name} — +$${reward.toLocaleString('en-US')}`);
    hud.log(`JOB ${m.id} COMPLETE — ${m.name}: +$${reward.toLocaleString('en-US')}`);
    audio.stinger(true);
    saveGame();
  },
});

// --- Combat -----------------------------------------------------------------
const rayOrigin = new THREE.Vector3();
const rayDir = new THREE.Vector3();
const tmpV = new THREE.Vector3();

function fireWeapon() {
  if (player.inCar || player.fireCooldown > 0) return;
  const w = WEAPONS[player.weapon];
  if (player.weapon === 'smg') {
    if (player.ammo === null || player.ammo <= 0) { hud.log('SMG is empty — pick up ammo or press 1 for the pistol.'); return; }
    player.ammo -= 1;
  }
  player.fireCooldown = w.rate;
  audio.gunshot(player.weapon);
  camera.getWorldDirection(rayDir);
  rayOrigin.copy(player.pos); rayOrigin.y = 1.55;
  const spread = w.spread;
  rayDir.x += (Math.random() - 0.5) * spread;
  rayDir.y += (Math.random() - 0.5) * spread;
  rayDir.z += (Math.random() - 0.5) * spread;
  rayDir.normalize();
  // Nearest foot cop whose body comes within 1.4 of the ray.
  let best = null, bestT = w.range;
  for (const cop of state.footCops) {
    if (!cop.alive) continue;
    tmpV.copy(cop.pos); tmpV.y = 1.3; tmpV.sub(rayOrigin);
    const t = tmpV.dot(rayDir);
    if (t < 1 || t > bestT) continue;
    const perp = tmpV.clone().addScaledVector(rayDir, -t);
    if (perp.length() < 1.5) { best = cop; bestT = t; }
  }
  const end = rayOrigin.clone().addScaledVector(rayDir, best ? bestT : w.range);
  tracers.fire(rayOrigin.clone().addScaledVector(rayDir, 1.2), end);
  muzzle.fire(rayOrigin.clone().addScaledVector(rayDir, 1.4));
  state.gunfireAt = player.pos.clone();
  state.gunfireTimer = 0.4;
  if (state.time - state.lastShotWanted > 2) { addWanted(WANTED.shoot); state.lastShotWanted = state.time; }
  if (best) {
    best.health -= w.damage;
    hud.spawnDamage(best.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), `-${w.damage}`, camera);
    if (best.health <= 0) {
      best.alive = false;
      best.mesh.visible = false;
      hud.log(`Officer down.`);
      missions.noteKill();
      player.cash += 25;
    }
  }
}

function hurtPlayer(dmg) {
  if (player.armour > 0) {
    const absorbed = Math.min(player.armour, dmg * 0.6);
    player.armour -= absorbed;
    dmg -= absorbed;
  }
  player.health -= dmg;
  player.lastHurt = state.time;
  if (player.health <= 0) endRun('WASTED', 'Mara is down. The crew pulls her out and drops her at the safehouse.');
}

// --- Entering / leaving cars ------------------------------------------------
function nearestCar(maxDist) {
  let best = null, bestD = maxDist;
  const all = [...state.parked, ...state.cruisers, ...traffic];
  for (const car of all) {
    const d = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

function tryEnterCar() {
  if (player.inCar) {
    // Repair at Taller Lumen instead of stepping out, when the car is hurt.
    const g = city.landmarks.garage;
    const nearGarage = Math.hypot(player.pos.x - g.x, player.pos.z - g.z) < 16;
    if (nearGarage && player.car.health < CAR.maxHealth && player.cash >= CAR.repairFee) {
      player.car.health = CAR.maxHealth;
      player.cash -= CAR.repairFee;
      hud.log(`Taller Lumen repaired the ${player.car.name} — $${CAR.repairFee}.`);
      audio.pickup();
      return;
    }
    player.inCar = false;
    player.pos.set(player.car.pos.x + 3.2, 0, player.car.pos.z + 1);
    player.mesh.visible = true;
    player.car = null;
    return;
  }
  const car = nearestCar(4.5);
  if (!car) { hud.log('No car close enough — walk up to one and press E.'); return; }
  if (car.kind === 'police' || car.kind === 'gt' || car.parked || car.kind === 'traffic') {
    addWanted(CAR.stealHeat);
    hud.log(`Stole the ${car.name}. The heat is on.`);
  }
  if (car.kind === 'traffic') {
    const i = traffic.indexOf(car);
    if (i >= 0) traffic.splice(i, 1);
  } else {
    const i = state.parked.indexOf(car);
    if (i >= 0) state.parked.splice(i, 1);
  }
  car.parked = false;
  player.car = car;
  player.inCar = true;
  player.mesh.visible = false;
  camYaw = car.angle + Math.PI;
  missions.noteSteal(car.kind);
  audio.ensure();
}

/** Put the player straight into a car without the steal flow (shot staging). */
function enterCarDirect(car) {
  const i = state.parked.indexOf(car);
  if (i >= 0) state.parked.splice(i, 1);
  const j = traffic.indexOf(car);
  if (j >= 0) traffic.splice(j, 1);
  car.parked = false;
  player.car = car;
  player.inCar = true;
  player.mesh.visible = false;
  camYaw = car.angle + Math.PI;
}

// --- Busted / wasted --------------------------------------------------------
function endRun(kind, text) {
  state.screen = 'over';
  document.getElementById('over-title').textContent = kind;
  document.getElementById('over-text').textContent = text;
  hud.showScreen('over');
  audio.stinger(false);
}

function respawn() {
  const penalty = Math.min(500, Math.floor(player.cash * 0.1));
  player.cash -= penalty;
  player.pos.copy(city.landmarks.safehouse); player.pos.z += 8;
  player.health = PLAYER.maxHealth;
  player.armour = 0;
  setWanted(0);
  syncCruisers();
  clearFootCops();
  if (player.inCar && player.car) { scene.remove(player.car.mesh); player.car = null; }
  player.inCar = false;
  player.mesh.visible = true;
  state.screen = 'play';
  hud.showScreen(null);
  hud.log(`Back at the safehouse. The crew took $${penalty} for the bail.`);
  saveGame();
}

// --- Per-frame update -------------------------------------------------------
function updatePlayer(dt, actions) {
  const orbit = input.takeOrbit();
  camYaw -= orbit.yaw;
  camPitch = Math.max(0.08, Math.min(1.1, camPitch + orbit.pitch));
  if (player.inCar && player.car) {
    const speed = updatePlayerCar(player.car, input, dt, city.colliders);
    player.pos.copy(player.car.pos);
    camYaw = player.car.angle + Math.PI;
    // Speeding past a cruiser draws heat.
    for (const c of state.cruisers) {
      if (Math.abs(speed) > 30 && Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) < 18) {
        if (state.time - state.lastShotWanted > 4) { addWanted(WANTED.speedPast); state.lastShotWanted = state.time; }
      }
    }
  } else {
    const speed = input.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    let mx = 0, mz = 0;
    if (input.forward) { mx += Math.sin(camYaw); mz += Math.cos(camYaw); }
    if (input.back) { mx -= Math.sin(camYaw); mz -= Math.cos(camYaw); }
    if (input.right) { mx += Math.cos(camYaw); mz -= Math.sin(camYaw); }
    if (input.left) { mx -= Math.cos(camYaw); mz += Math.sin(camYaw); }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len; mz /= len;
      player.pos.x += mx * speed * dt;
      player.pos.z += mz * speed * dt;
      player.angle = Math.atan2(mx, mz);
      player.walkPhase += dt * (input.sprint ? 13 : 8);
    }
    const clamped = clampWorld(player.pos.x, player.pos.z);
    player.pos.x = clamped.x; player.pos.z = clamped.z;
    const res = collideCircle(city.colliders, player.pos.x, player.pos.z, PLAYER.radius);
    player.pos.x = res.x; player.pos.z = res.z;
    player.mesh.position.copy(player.pos);
    player.mesh.rotation.y = player.angle;
    const swing = len > 0 ? Math.sin(player.walkPhase) * 0.55 : 0;
    player.mesh.userData.legs[0].rotation.x = swing;
    player.mesh.userData.legs[1].rotation.x = -swing;
    player.mesh.userData.arm.rotation.x = -0.9 + (input.firing ? -0.5 : 0);
  }
  player.fireCooldown -= dt;
  if (input.firing || (actions & ACTION_FIRE)) fireWeapon();
}

function updateWanted(dt) {
  // Heat cools when no police can see the player; the helicopter alone loses
  // the trail once the cruisers are gone.
  let seen = false;
  for (const c of state.cruisers) {
    if (Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) < WANTED.hideDistance) seen = true;
  }
  for (const cop of state.footCops) {
    if (cop.alive && Math.hypot(cop.pos.x - player.pos.x, cop.pos.z - player.pos.z) < 30) seen = true;
  }
  if (state.wanted > 0 && !seen) {
    state.wanted = Math.max(0, state.wanted - WANTED.hiddenDecayRate * dt);
    if (state.wanted < 0.5) { state.wanted = 0; syncCruisers(); }
  } else if (state.wanted > 0 && seen) {
    state.wanted = Math.max(0, state.wanted - WANTED.decayRate * dt * 0.2);
  }
  // Foot police join the hunt at three stars while the player is on foot.
  state.copSpawnTimer -= dt;
  if (state.wanted >= WANTED.footCopsAt && !player.inCar && state.footCops.filter((c) => c.alive).length < 2 && state.copSpawnTimer <= 0) {
    state.copSpawnTimer = 15;
    const p = nearestRoadPoint(player.pos);
    spawnFootCops(p.x + 8, p.z + 8, 1);
  }
  // Busted: a cruiser sits on the player while on foot.
  if (!player.inCar && state.wanted >= 2) {
    let close = false;
    for (const c of state.cruisers) {
      if (Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) < 4.5) close = true;
    }
    player.bustedTimer = close ? player.bustedTimer + dt : 0;
    if (player.bustedTimer > 1.5) {
      endRun('BUSTED', 'The police pulled Mara out of the street. The crew posts bail at the safehouse.');
      return;
    }
  } else {
    player.bustedTimer = 0;
  }
  // Health regenerates after a quiet spell.
  if (state.time - player.lastHurt > PLAYER.regenDelay && player.health > 0 && player.health < PLAYER.maxHealth) {
    player.health = Math.min(PLAYER.maxHealth, player.health + PLAYER.regenRate * dt);
  }
}

function step(dt) {
  state.time += dt;
  const actions = input.takeActions();
  if (actions & ACTION_PAUSE) {
    if (state.screen === 'play') { state.screen = 'paused'; hud.showScreen('pause'); }
    else if (state.screen === 'paused') { state.screen = 'play'; hud.showScreen(null); }
  }
  if (state.screen !== 'play') return;
  if (actions & ACTION_ENTER) tryEnterCar();
  if (actions & ACTION_MISSION) {
    if (!missions.current) {
      if (missions.startNext()) audio.stinger(true);
      else hud.log('All 12 jobs done — Puerto Lumen is yours, Mara.');
    }
  }
  if (actions & ACTION_WEAPON1) { player.weapon = 'pistol'; player.ammo = null; hud.log('Pistol equipped.'); }
  if (actions & ACTION_WEAPON2) {
    if (player.smgUnlocked) { player.weapon = 'smg'; if (player.ammo === null) player.ammo = 120; hud.log('SMG equipped.'); }
    else hud.log('No SMG yet — find a yellow pickup in the city.');
  }
  if (actions & ACTION_RADIO) hud.log(`Radio: ${audio.cycleStation()}`);
  if (actions & ACTION_CONFIRM) audio.ensure();

  updatePlayer(dt, actions);
  updateTraffic(traffic, dt, city.colliders);
  updatePedestrians(peds, dt, state.gunfireAt, state.gunfireTimer > 0);
  if (state.gunfireTimer > 0) state.gunfireTimer -= dt;
  for (const cop of state.footCops) {
    updateFootCop(cop, player.pos, dt, (c, dmg) => {
      if (dmg > 0) {
        hud.spawnDamage(player.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), `-${dmg}`, camera, '#ff6a5a');
        hurtPlayer(dmg);
      }
      tracers.fire(c.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xff8a6a);
    });
  }
  for (const cruiser of state.cruisers) {
    updateCruiser(cruiser, player.pos, dt, city.colliders, () => {
      if (player.inCar && player.car) {
        player.car.health -= 6;
        if (player.car.health <= 0) {
          hud.log(`The ${player.car.name} is wrecked.`);
          const wreck = player.car;
          player.inCar = false; player.car = null;
          player.mesh.visible = true;
          player.pos.set(wreck.pos.x + 3.2, 0, wreck.pos.z + 1);
          scene.remove(wreck.mesh);
        }
      } else {
        hurtPlayer(8);
      }
    });
  }
  updateHelicopter(heli, player.pos, dt, state.wanted >= WANTED.heliAt);
  updateWanted(dt);
  missions.update(dt, { playerPos: player.pos, wanted: state.wanted });
  updatePickups(pickups, dt, player.pos, (kind) => {
    audio.pickup();
    if (kind === 'health') { player.health = Math.min(PLAYER.maxHealth, player.health + 40); hud.log('Health +40.'); }
    if (kind === 'armour') { player.armour = Math.min(PLAYER.maxArmour, player.armour + 50); hud.log('Armour +50.'); }
    if (kind === 'smg') { player.smgUnlocked = true; player.ammo = (player.ammo || 0) + 120; hud.log('SMG picked up — press 2 to equip.'); }
  });
  // Autosave at the safehouse.
  const sh = city.landmarks.safehouse;
  if (Math.hypot(player.pos.x - sh.x, player.pos.z - sh.z) < 14 && state.time - state.lastSave > 5) {
    state.lastSave = state.time;
    saveGame();
  }
  audio.setEngine(player.inCar && player.car ? player.car.speed : 0, player.inCar);
  audio.setSiren(state.wanted, state.time);
  audio.updateRadio();
  tracers.update(dt);
  muzzle.update(dt);
  hud.updateDamage(dt);
  city.beam.rotation.y = state.time * 0.5;
  updateBeacon(beacon, missions.markerPos(), state.time);
}

// --- Frame ------------------------------------------------------------------
function frame(dt) {
  const target = player.inCar && player.car ? player.car.pos : player.pos;
  const dist = player.inCar ? 13 : camDist;
  const yaw = player.inCar && player.car ? player.car.angle + Math.PI : camYaw;
  updateCamera(camera, target, yaw, player.inCar ? 0.32 : camPitch, dist, dt, player.inCar ? 5 : 8);
  hud.drawMinimap(player.pos, player.inCar && player.car ? player.car.angle : player.angle, missions.markerPos(), state.cruisers, state.wanted >= WANTED.heliAt ? heli.group.position : null, traffic);
  hud.update(dt, {
    wanted: Math.round(state.wanted), health: player.health, armour: player.armour,
    cash: player.cash, speed: player.inCar && player.car ? player.car.speed : 0,
    inCar: player.inCar, carName: player.car ? player.car.name : '',
    carHealth: player.car ? player.car.health : 0,
    weapon: WEAPONS[player.weapon].name, ammo: player.ammo,
    objective: missions.objectiveText(), radio: audio.stationName(),
    jobsDone: missions.completedCount, totalEarned: missions.totalEarned,
  });
  renderer.render(scene, camera);
}

// --- Screens ----------------------------------------------------------------
function startGame(fromSave) {
  if (fromSave) {
    const s = loadSave();
    if (s) {
      player.cash = s.cash; player.health = s.health; player.armour = s.armour;
      player.pos.set(s.x, 0, s.z);
      player.smgUnlocked = !!s.smg;
      missions.nextIndex = s.nextMission || 0;
      missions.completedCount = s.jobsDone || 0;
      missions.totalEarned = s.totalEarned || 0;
      hud.log(`Welcome back, Mara. $${Math.floor(player.cash).toLocaleString('en-US')} in the pocket.`);
    }
  } else {
    try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  }
  audio.ensure();
  state.screen = 'play';
  hud.showScreen(null);
  hud.log('LUMEN BAY — Puerto Lumen, 18:40. Press M to start Job 1: First Keys.');
}

document.getElementById('new-btn').addEventListener('click', () => startGame(false));
document.getElementById('continue-btn').addEventListener('click', () => startGame(true));
document.getElementById('resume-btn').addEventListener('click', () => { state.screen = 'play'; hud.showScreen(null); });
document.getElementById('restart-btn').addEventListener('click', () => { window.location.reload(); });
document.getElementById('respawn-btn').addEventListener('click', respawn);
window.addEventListener('keydown', () => audio.ensure(), { once: true });
window.addEventListener('pointerdown', () => audio.ensure(), { once: true });
window.addEventListener('resize', () => resize(renderer, camera));

// Title screen: slow orbit over the city while traffic drives.
let titleAngle = 0.6;
function titleFrame(dt) {
  titleAngle += dt * 0.03;
  camera.position.set(Math.sin(titleAngle) * 190, 70, Math.cos(titleAngle) * 190);
  camera.lookAt(0, 10, -40);
  updateTraffic(traffic, dt, city.colliders);
  updatePedestrians(peds, dt, null, false);
  renderer.render(scene, camera);
}

// --- Main loop --------------------------------------------------------------
let last = performance.now();
let acc = 0;
function loop(now) {
  const frameDt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (state.screen === 'title') {
    titleFrame(frameDt);
  } else if (state.screen === 'play' || state.screen === 'paused') {
    if (state.screen === 'play') {
      acc += frameDt;
      let n = 0;
      while (acc >= STEP && n < 5) { step(STEP); acc -= STEP; n += 1; }
      if (n === 5) acc = 0;
    }
    frame(frameDt);
  } else if (state.screen === 'over') {
    frame(frameDt);
  }
  requestAnimationFrame(loop);
}

// --- Shot staging -----------------------------------------------------------
if (shot) {
  state.screen = 'play';
  hud.showScreen(null);
  stageShot(shot, {
    player, state, city, missions, hud, audio, scene, input, fireWeapon,
    addParked, spawnFootCops, setWanted, syncCruisers, tryEnterCar, enterCarDirect,
    cam: { set yaw(v) { camYaw = v; }, set pitch(v) { camPitch = v; } },
    step: (n) => { for (let i = 0; i < n; i += 1) step(STEP); },
    frame: () => frame(STEP),
  });
} else {
  const save = loadSave();
  hud.setTitleSave(!!save, save ? save.cash : 0, save ? save.jobsDone : 0);
  hud.showScreen('title');
  requestAnimationFrame(loop);
}

// Probe hook: the live-gameplay checks read state through this, never by scraping.
window.__game = {
  player, state, missions, input, audio, city,
  startGame, respawn, fireWeapon, tryEnterCar,
  get screen() { return state.screen; },
  get wanted() { return state.wanted; },
  get cash() { return player.cash; },
};
window.__shotReady = false;
if (shot) window.__shotReady = true;
