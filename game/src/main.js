// LUMEN BAY — boot and the one loop.
// The game owns one state object: Mara on foot or in a car, the wanted level,
// cash, the 12-mission story, traffic, pedestrians, police and the helicopter.
// Fixed 1/60 s steps, a smooth third-person / chase camera, a dense DOM HUD,
// WebAudio synth, and localStorage saves. ?shot=1..4 stages a fixed scene
// instead of the loop and sets window.__shotReady for screenshots.
import * as THREE from 'three';
import {
  CAR, COMET_GT, ECONOMY, GOLDEN_HOUR, LANDMARKS, MISSIONS, PICKUPS, PLAYER,
  RADIO_STATIONS, SAVE_KEY, SPAWN, STEP, WEAPONS, WORLD_HALF,
} from './config.js';
import { createRandom } from './random.js';
import { buildCity, isOnRoad, resolveCollisions } from './city.js';
import { createHeli, createPolice, createTraffic, driveCar, makeCar, updateHeli, updatePolice, updateTraffic } from './vehicles.js';
import { createPedestrians, makeMara, removeEnemies, spawnEnemies, updateEnemies, updatePedestrians } from './people.js';
import { createMissionManager, currentMission, currentStep, missionEvent, missionReward, missionTarget, objectiveText, startMission, updateMissions } from './missions.js';
import { createAudio } from './audio.js';
import { createHud, damageNumber, drawMinimap, hideBanner, hideEnd, hideTitle, logEvent, setCash, setObjective, setRadio, setSpeed, setVitals, setWanted, setWeapon, showBanner, showEnd, showPause, showTitle } from './hud.js';
import { addTracer, createRenderer, followShadows, resizeRenderer, updateCamera, updateEffects, worldToScreen } from './render.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MISSION, ACTION_PAUSE, ACTION_RADIO, createInput, readMove, takeActions, takeMouse, triggerLive, weaponKey } from './input.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shotParam = Number.parseInt(params.get('shot') ?? '', 10);
const shot = Number.isInteger(shotParam) && shotParam >= 1 && shotParam <= 4 ? shotParam : 0;
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const render = createRenderer(canvas);
const hud = createHud();
const input = createInput(canvas);
const audio = createAudio();
const random = createRandom(seed);
const city = buildCity(random);
render.scene.add(city.group);

function announce(message) {
  status.textContent = message;
}

// ---- game state ------------------------------------------------------------
const game = {
  screen: 'title',
  time: 0,
  seed,
  cash: ECONOMY.startCash,
  wanted: 0,
  wantedFloat: 0,
  health: PLAYER.maxHealth,
  armour: 0,
  weapon: 'pistol',
  hasSmg: false,
  fireCooldown: 0,
  kills: 0,
  bustedTimer: 0,
  repairTimer: 0,
  saveTimer: 0,
  radio: 0,
  camYaw: 0.6,
  camPitch: 0.22,
  simMove: null,
  shotTarget: null,
  _paidCount: 0,
  missions: createMissionManager(),
  player: { x: SPAWN.x, z: SPAWN.z, yaw: 0, phase: 0, moving: false },
  playerCar: null,
  cometCar: null,
  parkedCars: [],
  traffic: [],
  peds: [],
  enemies: [],
  police: null,
  heli: null,
  mara: null,
  gunfirePos: null,
  log: (msg) => logEvent(hud, msg),
};

function playerPos() {
  return game.playerCar ? { x: game.playerCar.x, z: game.playerCar.z } : { x: game.player.x, z: game.player.z };
}

function setWantedLevel(level) {
  game.wantedFloat = level;
  // Stars use ceil so a fresh 2-star heat still shows 2 stars while it cools.
  game.wanted = level <= 0 ? 0 : Math.min(5, Math.ceil(level - 0.001));
}
game.setWanted = setWantedLevel;

// ---- world population ------------------------------------------------------
function spawnParkedCars() {
  const spots = [
    { x: COMET_GT.x, z: COMET_GT.z, kind: 'sports', color: 0xff2e88, comet: true },
    { x: -40, z: 60, kind: 'sedan', color: 0x2e9bff },
    { x: 60, z: -120, kind: 'sedan', color: 0xffe14d },
    { x: 120, z: 40, kind: 'van', color: 0xf2f2f2 },
    { x: -150, z: -40, kind: 'sedan', color: 0x39d353 },
    { x: 40, z: 150, kind: 'sports', color: 0xe03a3a },
    { x: 150, z: 120, kind: 'sedan', color: 0x7a2e6e },
    { x: -120, z: 150, kind: 'truck', color: 0xff6b35 },
  ];
  for (const spot of spots) {
    const mesh = makeCar(spot.color, spot.kind);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = random.range(0, Math.PI * 2);
    render.scene.add(mesh);
    const state = { mesh, x: spot.x, z: spot.z, yaw: mesh.rotation.y, speed: 0, kind: spot.kind, health: 100, comet: !!spot.comet };
    game.parkedCars.push(state);
    if (spot.comet) game.cometCar = state;
  }
}

function buildWorld() {
  game.mara = makeMara();
  render.scene.add(game.mara);
  game.traffic = createTraffic(random, city.roadLoops, render.scene);
  game.peds = createPedestrians(random, render.scene);
  game.police = createPolice(render.scene);
  game.heli = createHeli(render.scene);
  spawnParkedCars();
  game.mara.position.set(game.player.x, 0, game.player.z);
}
buildWorld();

// ---- cars: enter / exit / steal --------------------------------------------
function nearestParkedCar(maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of game.parkedCars) {
    if (car === game.playerCar) continue;
    const d = Math.hypot(car.x - game.player.x, car.z - game.player.z);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  for (const car of game.police.cars) {
    const d = Math.hypot(car.x - game.player.x, car.z - game.player.z);
    if (d < bestDist && Math.abs(car.speed) < 5) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

function enterCar(car) {
  game.playerCar = car;
  game.player.x = car.x;
  game.player.z = car.z;
  game.player.yaw = car.yaw;
  game.mara.visible = false;
  game.log(`In the ${car.comet ? 'Comet GT' : car.kind === 'cruiser' ? 'police cruiser' : car.kind}.`);
  if (car.kind === 'cruiser') {
    game.wantedFloat = Math.min(5, game.wantedFloat + 1);
    missionEvent(game.missions, 'stolePolice', game.log);
  } else if (!car.owned) {
    car.owned = true;
    game.wantedFloat = Math.min(5, game.wantedFloat + 1);
    missionEvent(game.missions, 'stole', game.log);
    game.log('Car stolen — the police noticed. +1 star.');
  }
}
game.enterCar = enterCar;

function exitCar() {
  if (!game.playerCar) return;
  const car = game.playerCar;
  game.player.x = car.x + Math.sin(car.yaw + Math.PI / 2) * 2.4;
  game.player.z = car.z + Math.cos(car.yaw + Math.PI / 2) * 2.4;
  game.player.yaw = car.yaw;
  game.playerCar = null;
  game.mara.visible = true;
  game.mara.position.set(game.player.x, 0, game.player.z);
}
game.exitCar = exitCar;

// ---- combat ----------------------------------------------------------------
function fireWeapon() {
  const def = WEAPONS[game.weapon];
  if (game.fireCooldown > 0 || game.screen !== 'play') return;
  game.fireCooldown = def.rate;
  audio.ensure();
  audio.shot();
  const from = new THREE.Vector3(game.player.x, 1.5, game.player.z);
  const dir = new THREE.Vector3();
  render.camera.getWorldDirection(dir);
  // Find the nearest hittable target inside a narrow cone of the aim.
  let best = null;
  let bestDist = def.range;
  const candidates = [];
  for (const enemy of game.enemies) {
    if (enemy.alive) candidates.push({ kind: 'enemy', ref: enemy, x: enemy.x, y: 1.2, z: enemy.z, radius: 1.2 });
  }
  for (const car of game.police.cars) {
    candidates.push({ kind: 'police', ref: car, x: car.x, y: 1, z: car.z, radius: 2 });
  }
  for (const cand of candidates) {
    const to = new THREE.Vector3(cand.x - from.x, cand.y - from.y, cand.z - from.z);
    const dist = to.length();
    if (dist > def.range) continue;
    to.normalize();
    const cos = to.dot(dir);
    if (cos < 0.985) continue;
    if (dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  }
  const spread = def.spread * (Math.random() - 0.5);
  const hitPoint = best
    ? new THREE.Vector3(best.x, best.y, best.z)
    : from.clone().add(dir.multiplyScalar(def.range)).add(new THREE.Vector3(spread * 20, spread * 10, 0));
  addTracer(render, from.clone(), hitPoint);
  game.gunfirePos = { x: game.player.x, z: game.player.z };
  game.wantedFloat = Math.min(5, game.wantedFloat + 0.4);
  if (best) {
    const damage = def.damage + Math.floor(Math.random() * 8);
    if (best.kind === 'enemy') {
      best.ref.health -= damage;
      const screen = worldToScreen(render, hitPoint);
      if (!screen.behind) damageNumber(hud, screen.x, screen.y, `-${damage}`, '#ffd27a');
      if (best.ref.health <= 0) {
        best.ref.alive = false;
        render.scene.remove(best.ref.mesh);
        game.kills += 1;
        game.log('Target down.');
        missionEvent(game.missions, 'killed', game.log);
      }
    } else {
      best.ref.speed *= 0.4;
      const screen = worldToScreen(render, hitPoint);
      if (!screen.behind) damageNumber(hud, screen.x, screen.y, `-${damage}`, '#ff8a7a');
      game.log('Police cruiser hit.');
    }
  }
}

function fireWeaponAt(target) {
  if (!target) return;
  const from = new THREE.Vector3(game.player.x, 1.5, game.player.z);
  const to = new THREE.Vector3(target.x, target.y ?? 1.2, target.z);
  addTracer(render, from, to);
  audio.ensure();
  audio.shot();
  const screen = worldToScreen(render, to);
  if (!screen.behind) damageNumber(hud, screen.x, screen.y, '-34', '#ffd27a');
  game.gunfirePos = { x: game.player.x, z: game.player.z };
}
game.fireWeaponAt = fireWeaponAt;

function nearestPoliceCar() {
  return game.police.cars.length > 0 ? game.police.cars[0] : null;
}
game.nearestPoliceCar = nearestPoliceCar;

function spawnCordon(x, z, count) {
  removeEnemies(render.scene, game.enemies);
  game.enemies = spawnEnemies(render.scene, x, z, count);
}
game.spawnCordon = spawnCordon;

// ---- missions glue -----------------------------------------------------------
function startMissionByIndex(index) {
  game.missions.index = index;
  game.missions.active = false;
  game.missions.step = 0;
  startMission(game.missions, game.log);
  const mission = currentMission(game.missions);
  if (mission) showBanner(hud, `JOB ${mission.id}: ${mission.title}`, mission.brief, 3200);
}
game.startMissionByIndex = startMissionByIndex;

function showJobDone(id, title, reward) {
  showBanner(hud, 'JOB DONE', `${title} — +$${reward}`, 3200);
  audio.ensure();
  audio.stinger(true);
}
game.showJobDone = showJobDone;

function setShotTarget(x, z, label) {
  game.shotTarget = { x, z, label };
}
game.setShotTarget = setShotTarget;

function currentTarget() {
  if (game.shotTarget) return game.shotTarget;
  return missionTarget(game.missions);
}

// ---- save / load -------------------------------------------------------------
function saveGame() {
  try {
    const pos = playerPos();
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      missionIndex: game.missions.index,
      completed: game.missions.completed,
      cash: game.cash,
      x: pos.x, z: pos.z,
      health: game.health,
      armour: game.armour,
    }));
  } catch {
    // Storage can be off: progress then lasts this visit only.
  }
}

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function applySave(data) {
  game.missions.index = data.missionIndex;
  game.missions.completed = data.completed || [];
  game.cash = data.cash ?? ECONOMY.startCash;
  game.player.x = data.x ?? SPAWN.x;
  game.player.z = data.z ?? SPAWN.z;
  game.health = data.health ?? PLAYER.maxHealth;
  game.armour = data.armour ?? 0;
  game.mara.position.set(game.player.x, 0, game.player.z);
}

// ---- the fixed step ----------------------------------------------------------
function stepFixed(dt) {
  game.time += dt;
  const move = game.simMove || readMove(input);
  const mouse = game.simMove ? { dx: 0, dy: 0 } : takeMouse(input);
  game.camYaw -= mouse.dx * 0.0032;
  game.camPitch = Math.max(-0.1, Math.min(0.9, game.camPitch + mouse.dy * 0.0022));

  // --- player on foot or in a car
  if (game.playerCar) {
    driveCar(game.playerCar, move, dt, city.colliders);
    game.player.x = game.playerCar.x;
    game.player.z = game.playerCar.z;
    game.player.yaw = game.playerCar.yaw;
    if (Math.abs(game.playerCar.speed) > CAR.speedHeatSpeed * 0.9 && game.wanted < 5) {
      game.wantedFloat = Math.min(5, game.wantedFloat + dt * 0.05);
    }
    // Repair at Taller Lumen: stop inside the garage zone and the crew fixes the car.
    const gd = Math.hypot(game.playerCar.x - LANDMARKS.garage.x, game.playerCar.z - LANDMARKS.garage.z);
    if (gd < 12 && Math.abs(game.playerCar.speed) < 1 && game.playerCar.health < 100) {
      game.repairTimer += dt;
      if (game.repairTimer > 2 && game.cash >= ECONOMY.repairFee) {
        game.cash -= ECONOMY.repairFee;
        game.playerCar.health = 100;
        game.repairTimer = 0;
        game.log(`Car repaired at Taller Lumen — $${ECONOMY.repairFee}.`);
      }
    } else {
      game.repairTimer = 0;
    }
  } else {
    const speed = move.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    let fx = 0;
    let fz = 0;
    if (move.forward) { fx += Math.sin(game.camYaw); fz += Math.cos(game.camYaw); }
    if (move.back) { fx -= Math.sin(game.camYaw); fz -= Math.cos(game.camYaw); }
    if (move.left) { fx -= Math.cos(game.camYaw); fz += Math.sin(game.camYaw); }
    if (move.right) { fx += Math.cos(game.camYaw); fz -= Math.sin(game.camYaw); }
    const len = Math.hypot(fx, fz);
    game.player.moving = len > 0;
    if (len > 0) {
      fx /= len;
      fz /= len;
      game.player.x += fx * speed * dt;
      game.player.z += fz * speed * dt;
      game.player.yaw = Math.atan2(fx, fz);
      game.player.phase += dt * 9;
    }
    game.player.x = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, game.player.x));
    game.player.z = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, game.player.z));
    resolveCollisions(city.colliders, game.player, PLAYER.radius);
    game.mara.position.set(game.player.x, 0, game.player.z);
    game.mara.rotation.y = game.player.yaw;
    const u = game.mara.userData;
    if (u.legL) {
      const swing = game.player.moving ? Math.sin(game.player.phase) * 0.6 : 0;
      u.legL.rotation.x = swing;
      u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.7;
      u.armR.rotation.x = swing * 0.7;
    }
  }
  game.simMove = null;

  // --- traffic, pedestrians, police, helicopter
  updateTraffic(game.traffic, dt);
  updatePedestrians(game.peds, dt, game.gunfirePos);
  game.gunfirePos = null;
  const pos = playerPos();
  pos.inCar = !!game.playerCar;
  const nearestPolice = updatePolice(game.police, game.wanted, pos, dt, render.scene, random);
  updateHeli(game.heli, game.wanted, pos, dt, game.time);
  if (game.enemies.length > 0) {
    const damage = updateEnemies(game.enemies, pos, dt, () => audio.shot());
    if (damage > 0) applyDamage(damage, 'police');
  }
  // Enemy cordons for shoot steps spawn when the step starts.
  const step = currentStep(game.missions);
  if (game.missions.active && step && step.kind === 'shoot' && game.enemies.length === 0 && game.missions.kills < (step.count || 1)) {
    spawnCordon(step.x, step.z, step.count || 3);
  }

  // --- wanted decay: hide from the police and the heat cools off.
  const hidden = nearestPolice === Infinity || nearestPolice > 70;
  const decay = (hidden ? 0.35 : 0.08) * dt;
  if (game.wantedFloat > 0) {
    game.wantedFloat = Math.max(0, game.wantedFloat - decay);
    game.wanted = game.wantedFloat <= 0 ? 0 : Math.min(5, Math.ceil(game.wantedFloat - 0.001));
  }
  // Busted: a cruiser sits on top of Mara on foot.
  if (!game.playerCar && game.wanted > 0 && nearestPolice < 3.2) {
    game.bustedTimer += dt;
    if (game.bustedTimer > 1.5) return endRun('BUSTED', 'The police caught Mara. The crew posts bail.');
  } else {
    game.bustedTimer = 0;
  }

  // --- pickups
  for (const pickup of city.pickupMeshes) {
    if (pickup.taken) continue;
    pickup.mesh.rotation.y += dt * 2;
    pickup.mesh.position.y = 1.6 + Math.sin(game.time * 2 + pickup.x) * 0.25;
    const d = Math.hypot(pickup.x - pos.x, pickup.z - pos.z);
    if (d < 2.6) {
      pickup.taken = true;
      pickup.mesh.visible = false;
      if (pickup.kind === 'health') {
        game.health = Math.min(PLAYER.maxHealth, game.health + 40);
        game.log('Health +40.');
      } else if (pickup.kind === 'armour') {
        game.armour = Math.min(PLAYER.maxArmour, game.armour + 50);
        game.log('Armour +50.');
      } else if (pickup.kind === 'smg') {
        game.hasSmg = true;
        game.weapon = 'smg';
        game.log('SMG picked up — press 2 to use it, 1 for the pistol.');
      }
    }
  }

  // --- missions
  const target = currentTarget();
  const world = {
    playerPos: pos,
    wanted: game.wanted,
    inCar: !!game.playerCar,
    nearTarget: target ? Math.hypot(target.x - pos.x, target.z - pos.z) : Infinity,
  };
  const beforeIndex = game.missions.index;
  const result = updateMissions(game.missions, world, dt, game.log);
  if (result === 'failed') audio.stinger(false);
  // Pay every newly completed mission, whether it finished on a timer, an
  // arrival, or a kill inside missionEvent during this same step.
  while (game._paidCount < game.missions.completed.length) {
    const id = game.missions.completed[game._paidCount];
    game._paidCount += 1;
    const finished = MISSIONS.find((m) => m.id === id);
    const reward = missionReward(game.missions, id);
    game.cash += reward;
    showJobDone(id, finished ? finished.title : `Job ${id}`, reward);
    saveGame();
  }
  // Mission pickup steps: standing on the crate grabs it (8 m, so the vault
  // cash just outside the casino/tower doors is reachable on foot).
  if (game.missions.active && step && step.kind === 'pickup' && world.nearTarget < 8) {
    missionEvent(game.missions, 'pickedUp', game.log);
  }
  // Beacon follows the current objective.
  if (target && game.missions.active) {
    city.beacon.visible = true;
    city.beacon.position.set(target.x, 30, target.z);
  } else {
    city.beacon.visible = false;
  }

  // --- weapons
  game.fireCooldown = Math.max(0, game.fireCooldown - dt);
  const switchTo = weaponKey(input);
  if (switchTo === 'smg' && game.hasSmg) game.weapon = 'smg';
  if (switchTo === 'pistol') game.weapon = 'pistol';
  if (game.screen === 'play' && triggerLive(input, WEAPONS[game.weapon])) fireWeapon();

  // --- audio + autosave
  audio.setEngine(game.playerCar ? Math.abs(game.playerCar.speed) / CAR.maxSpeed : 0);
  audio.setSiren(game.wanted >= 1, game.time);
  audio.radioTick(dt);
  game.saveTimer += dt;
  if (game.saveTimer > 12) {
    game.saveTimer = 0;
    if (game.screen === 'play') saveGame();
  }
  return null;
}
game.stepFixed = stepFixed;

// The shot autopilot feeds synthetic input into the next fixed step.
game.simulateInput = function simulateInput(move) {
  game.simMove = move;
};

function applyDamage(amount, source) {
  if (game.armour > 0) {
    const absorbed = Math.min(game.armour, amount);
    game.armour -= absorbed;
    amount -= absorbed;
  }
  game.health -= amount;
  if (game.health <= 0) {
    game.health = 0;
    endRun('WASTED', `Mara went down to the ${source}. The crew drags her to the safehouse.`);
  }
}

function endRun(title, sub) {
  game.cash = Math.max(0, game.cash - ECONOMY.bustPenalty);
  game.health = PLAYER.maxHealth;
  game.armour = 0;
  game.wantedFloat = 0;
  game.wanted = 0;
  removeEnemies(render.scene, game.enemies);
  game.enemies = [];
  if (game.playerCar) exitCar();
  game.player.x = SPAWN.x;
  game.player.z = SPAWN.z;
  game.mara.position.set(game.player.x, 0, game.player.z);
  game.screen = 'busted';
  showEnd(hud, title, `${sub} -$${ECONOMY.bustPenalty}.`);
  announce(`${title}. Respawning at the safehouse.`);
  saveGame();
  return 'ended';
}

// ---- screens and the frame loop ---------------------------------------------
function startPlay(options) {
  const opts = options || {};
  hideTitle(hud);
  hideEnd(hud);
  showPause(hud, false);
  game.screen = 'play';
  game.missions.active = false;
  if (!opts.silent) {
    announce('Playing LUMEN BAY. Press M to start the next job.');
    game.log('Welcome to Puerto Lumen, Mara. Press M to start Job 1: First Keys.');
  }
}
game.startPlay = startPlay;

function syncHud() {
  setWanted(hud, game.wanted);
  setVitals(hud, game.health, game.armour);
  setCash(hud, game.cash);
  const speedKmh = game.playerCar ? Math.abs(game.playerCar.speed) * 3.6 : 0;
  setSpeed(hud, speedKmh);
  const weaponDef = WEAPONS[game.weapon];
  setWeapon(hud, weaponDef.name, game.weapon === 'pistol' ? '∞' : '30');
  setObjective(hud, objectiveText(game.missions));
  const target = currentTarget();
  drawMinimap(hud, {
    time: game.time,
    playerX: playerPos().x,
    playerZ: playerPos().z,
    playerYaw: game.player.yaw,
    missionTarget: game.missions.active ? target : null,
    traffic: game.traffic,
    policeCars: game.police.cars,
    heliActive: game.wanted >= 3,
  });
}

function handleActions() {
  const actions = takeActions(input);
  if (actions & ACTION_PAUSE) {
    if (game.screen === 'play') {
      game.screen = 'paused';
      showPause(hud, true);
      announce('Paused.');
    } else if (game.screen === 'paused') {
      game.screen = 'play';
      showPause(hud, false);
      announce('Playing.');
    }
  }
  if (actions & ACTION_MISSION && game.screen === 'play') {
    if (!game.missions.active) {
      const mission = currentMission(game.missions);
      if (mission) {
        startMissionByIndex(game.missions.index);
      } else if (game.missions.allDone) {
        game.log('All 12 jobs complete — Puerto Lumen is yours.');
      }
    }
  }
  if (actions & ACTION_RADIO && game.screen === 'play') {
    const name = audio.nextStation();
    setRadio(hud, name);
    game.log(`Radio: ${name}`);
  }
  if (actions & ACTION_ENTER && game.screen === 'play') {
    if (game.playerCar) {
      exitCar();
    } else {
      const car = nearestParkedCar(4.5);
      if (car) enterCar(car);
    }
  }
  if (actions & ACTION_CONFIRM && game.screen === 'busted') {
    hideEnd(hud);
    game.screen = 'play';
    announce('Back on the streets.');
  }
  if (actions & ACTION_CONFIRM && game.screen === 'title') {
    startPlay();
  }
}

function runGame() {
  const save = loadSave();
  showTitle(hud, !!save,
    () => { applySave(save); startPlay(); },
    () => { startPlay(); });
  announce('LUMEN BAY: Sunset Getaway. Press Enter or click Start to play.');
  let accumulator = 0;
  let last = performance.now();
  let minimapTimer = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (game.screen === 'play') {
      while (accumulator >= STEP) {
        stepFixed(STEP);
        accumulator -= STEP;
        if (game.screen !== 'play') break;
      }
    } else {
      accumulator = 0;
      // The title screen still shows the city alive behind it.
      if (game.screen === 'title') {
        updateTraffic(game.traffic, STEP);
        updatePedestrians(game.peds, STEP, null);
      }
    }
    const target = game.playerCar
      ? { x: game.playerCar.x, y: 0, z: game.playerCar.z }
      : { x: game.player.x, y: 0, z: game.player.z };
    updateCamera(render, game.playerCar ? 'car' : 'foot', target, game.playerCar ? game.playerCar.yaw : game.camYaw, game.camPitch, game.playerCar ? 10 : 8.5, 0.016);
    resolveCollisions(city.colliders, render.camera.position, 1.5);
    updateEffects(render, 0.016);
    followShadows(render, target.x, target.z);
    minimapTimer += 0.016;
    if (minimapTimer > 0.12) {
      minimapTimer = 0;
      syncHud();
    }
    render.renderer.render(render.scene, render.camera);
  }

  window.addEventListener('resize', () => resizeRenderer(render, window.innerWidth, window.innerHeight));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.screen === 'play') {
      game.screen = 'paused';
      showPause(hud, true);
    }
  });
  document.addEventListener('pointerdown', () => audio.ensure(), { once: false });
  window.addEventListener('keydown', () => audio.ensure(), { once: false });
  requestAnimationFrame(frame);
}

// ---- shot mode ----------------------------------------------------------------
function runShot(number) {
  const screen = stageShot(number, game);
  game.screen = 'play';
  // Only shot 4 keeps its banner; the others show the action unobstructed.
  // Shot 4 re-shows it here with a long timer so it survives the probe's wait.
  if (number !== 4) hideBanner(hud);
  else showBanner(hud, 'JOB DONE', 'Beach Run — +$1300', 10000);
  syncHud();
  let painted = 0;
  function paint() {
    const target = game.playerCar
      ? { x: game.playerCar.x, y: 0, z: game.playerCar.z }
      : { x: game.player.x, y: 0, z: game.player.z };
    // Snap the camera (dt 1 = lerp factor 1) so the shot frames the player at once.
    updateCamera(render, game.playerCar ? 'car' : 'foot', target, game.playerCar ? game.playerCar.yaw : game.camYaw, game.camPitch, game.playerCar ? 10 : 8.5, 1);
    resolveCollisions(city.colliders, render.camera.position, 1.5);
    updateEffects(render, 0.016);
    followShadows(render, target.x, target.z);
    render.renderer.render(render.scene, render.camera);
    painted += 1;
    if (painted < 5) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
  return screen;
}

// Expose a small probe handle for headless playtests (not part of the UI).
window.__lumen = game;
game.audio = audio;

if (shot) runShot(shot);
else runGame();
