// LUMEN BAY — main loop. Boots the renderer, the city, the cars, the
// people and the story; runs a fixed-step simulation; owns the game states
// (title / play / pause / busted / wasted / done), the save, the combat,
// the wanted system and the ?shot= staging hook the screenshots use.
import * as THREE from 'three';
import { WORLD, PLAYER_TUNING, WEAPONS, SAVE_KEY, LANDMARKS, CREW, RADIO, PICKUPS, COP_TUNING } from './config.js';
import { makeRng, clamp, dist2d } from './random.js';
import { buildCity } from './city.js';
import { CAR_MODELS, POLICE_MODEL, spawnCar, drivePlayerCar, stepTrafficCar, stepPoliceCar, parkedCarSpots } from './vehicles.js';
import { makePlayer, stepPlayerOnFoot, makePedestrian, stepPedestrian, makeHelicopter, stepHelicopter, makeWantedState, addWanted, stepWantedState, makeFootCop, stepFootCop } from './people.js';
import { MISSIONS, makeMissionState, startMission, updateMission, markerPos, objectiveText, currentStage } from './missions.js';
import { makeAudio, ensureAudio, setStation, setEngineSound, setSirenSound, playSfx } from './audio.js';
import { makeHud, updateHud, logEvent, showDialogue, showBanner, showScreen, hideScreen, titleHtml } from './hud.js';
import { initRenderer, createScene, makeCamera, updateCamera, makeBeacon, updateBeacon, makeTracers, fireTracer, stepTracers, makeMuzzle, flashMuzzle, stepMuzzle, stepClouds, onResize } from './render.js';
import { makeInput, wasPressed, clearPressed } from './input.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const HELI_STARS = 3;

/** Build every world object and return the game state object. */
function bootGame() {
  const canvas = document.getElementById('game');
  const renderer = initRenderer(canvas);
  const { scene, clouds } = createScene();
  const { colliders, roadLoops } = buildCity(scene);
  const cam = makeCamera();
  const beacon = makeBeacon(scene);
  const tracers = makeTracers(scene);
  const muzzle = makeMuzzle(scene);
  const hud = makeHud();
  const audio = makeAudio();
  const input = makeInput();
  const rng = makeRng(WORLD.seed);

  const player = makePlayer(LANDMARKS.safehouse.x, LANDMARKS.safehouse.z);
  scene.add(player.mesh.group);

  const parked = parkedCarSpots().map((s) => {
    const car = spawnCar(CAR_MODELS[s.model], s.x, s.z, s.heading, false);
    car.parked = true;
    scene.add(car.mesh.group);
    return car;
  });

  const traffic = [];
  for (let i = 0; i < 12; i++) {
    const loop = roadLoops[Math.floor(rng() * roadLoops.length)];
    const wp = loop[Math.floor(rng() * loop.length)];
    const car = spawnCar(CAR_MODELS[Math.floor(rng() * CAR_MODELS.length)], wp[0], wp[1], 0, false);
    car.loop = loop;
    car.loopIndex = Math.floor(rng() * loop.length);
    scene.add(car.mesh.group);
    traffic.push(car);
  }

  // The courier van for Job 5 — drives its own loop until Mara rams it.
  const van = spawnCar(CAR_MODELS[5], 105, -35, Math.PI / 2, false);
  van.isVan = true;
  van.health = 3;
  van.loop = roadLoops[24];
  van.loopIndex = 0;
  scene.add(van.mesh.group);

  const peds = [];
  for (let i = 0; i < 24; i++) {
    const ped = makePedestrian(rng, -260 + rng() * 520, -260 + rng() * 520);
    scene.add(ped.mesh.group);
    peds.push(ped);
  }

  const heli = makeHelicopter();
  scene.add(heli.group);
  const police = [];
  const cops = [];
  const pickups = buildPickups(scene);

  const wanted = makeWantedState();
  const missions = makeMissionState();

  const game = {
    state: 'title',
    cash: 0,
    elapsed: 0,
    player, parked, traffic, van, peds, heli, police, cops, pickups,
    wanted, missions, colliders, roadLoops, scene, cam, beacon,
    tracers, muzzle, hud, audio, input, renderer, clouds,
    radioName: RADIO[0].name,
    vanHitCooldown: 0, bustedTimer: 0, defeated: 0,
    spawnFlip: false, vanHitReported: 3,
    save: null,
  };

  // --- collision: circle vs building boxes + world bounds ---
  game.collide = (x, z, r) => {
    let hit = false;
    let cx = clamp(x, -WORLD.half + 2, WORLD.half - 2);
    let cz = clamp(z, -WORLD.half + 2, WORLD.half - 2);
    if (cx !== x || cz !== z) hit = true;
    for (const b of colliders) {
      const nx = clamp(cx, b.minX, b.maxX);
      const nz = clamp(cz, b.minZ, b.maxZ);
      const dx = cx - nx;
      const dz = cz - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          cx = nx + (dx / d) * r;
          cz = nz + (dz / d) * r;
        } else {
          cx = b.maxX + r; // centre inside the box: push out east
        }
      }
    }
    return { x: cx, z: cz, hit };
  };

  // --- helpers the shot stager and the loop share ---
  game.resetWorld = () => {
    player.x = LANDMARKS.safehouse.x;
    player.z = LANDMARKS.safehouse.z;
    player.heading = 0;
    player.health = PLAYER_TUNING.maxHealth;
    player.armour = 0;
    player.inCar = null;
    player.mesh.group.visible = true;
    wanted.stars = 0;
    wanted.hiddenTimer = 0;
    game.cash = 0;
    missions.index = 0;
    missions.active = null;
    missions.done = [];
    for (const c of police) scene.remove(c.mesh.group);
    police.length = 0;
    for (const c of cops) scene.remove(c.mesh.group);
    cops.length = 0;
    game.defeated = 0;
    heli.active = false;
    for (const p of pickups) {
      p.taken = false;
      p.mesh.visible = true;
    }
    hud.logLines = [];
    document.getElementById('eventlog').innerHTML = '';
  };
  game.hideScreens = () => hideScreen();
  game.teleportPlayer = (x, z, heading) => {
    player.x = x;
    player.z = z;
    player.heading = heading;
    player.mesh.group.position.set(x, 0, z);
    player.mesh.group.rotation.y = heading;
    cam.yaw = 0;
    cam.smooth.set(x - Math.sin(heading) * 10, 4, z - Math.cos(heading) * 10);
  };
  game.setWeapon = (w) => { player.weapon = w; };
  game.setWanted = (n) => {
    wanted.stars = n;
    wanted.elapsed = 0;
    wanted.hiddenTimer = 0;
  };
  game.spawnPolice = (n, x, z) => spawnPoliceCars(game, n, x, z);
  game.fleePeds = (x, z) => {
    for (const p of peds) if (dist2d(p.x, p.z, x, z) < 40) p.flee = 3;
  };
  game.startMission = (i) => beginMission(game, i);
  game.say = (who, text, s) => showDialogue(hud, who, text, s);
  game.log = (t) => logEvent(hud, t);
  game.showBanner = (t, s, d) => showBanner(hud, t, s, d);
  game.heliOn = () => {
    heli.active = true;
    heli.angle = -0.9;
  };
  game.moveParked = (idx, x, z, heading) => {
    const car = parked[idx];
    car.x = x;
    car.z = z;
    car.heading = heading;
    car.mesh.group.position.set(x, 0, z);
    car.mesh.group.rotation.y = heading;
  };
  game.stageTraffic = (i, x, z, heading, loop) => {
    const car = traffic[i % traffic.length];
    car.x = x;
    car.z = z;
    car.heading = heading;
    car.speed = 9;
    car.loop = loop;
    car.loopIndex = 0;
    car.mesh.group.position.set(x, 0, z);
    car.mesh.group.rotation.y = heading;
  };
  game.putPlayerInCar = (idx) => {
    const car = parked[idx];
    player.inCar = car;
    car.parked = false;
    player.mesh.group.visible = false;
    player.x = car.x;
    player.z = car.z;
    player.heading = car.heading;
  };
  game.completeJobForShot = (idx, pay) => {
    const m = MISSIONS[idx];
    missions.done.push(m.id);
    missions.index = m.id;
    game.cash += pay;
  };

  return game;
}

/** Health / armour / SMG pickups scattered at the landmarks. */
function buildPickups(scene) {
  const spots = [
    { kind: 'health', x: 100, z: -112, color: '#3ddc5f' },
    { kind: 'health', x: -200, z: 168, color: '#3ddc5f' },
    { kind: 'armour', x: 42, z: -28, color: '#2e7dff' },
    { kind: 'armour', x: 168, z: 112, color: '#2e7dff' },
    { kind: 'smg', x: -98, z: -168, color: '#ffd23e' },
    { kind: 'health', x: 112, z: 238, color: '#3ddc5f' },
  ];
  const out = [];
  for (const s of spots) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.MeshLambertMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.35 }),
    );
    mesh.position.set(s.x, 1.0, s.z);
    scene.add(mesh);
    out.push({ kind: s.kind, x: s.x, z: s.z, mesh, taken: false, bob: Math.random() * 6 });
  }
  return out;
}

function spawnPoliceCars(game, n, x, z) {
  for (let i = 0; i < n; i++) {
    const car = spawnCar(POLICE_MODEL, x + i * 9, z, Math.PI, true);
    game.scene.add(car.mesh.group);
    game.police.push(car);
  }
}

function beginMission(game, i) {
  const m = startMission(game.missions, i);
  if (!m) return;
  for (const [who, line] of m.lines) showDialogue(game.hud, who, line, 6);
  showBanner(game.hud, `JOB ${m.id}: ${m.name}`, m.brief, 3.2);
  logEvent(game.hud, `JOB ${m.id} STARTED: ${m.name} — $${m.pay}`);
  if (m.id === 3) game.setWanted(Math.max(game.wanted.stars, 2));
  if (m.id === 6) {
    for (let k = 0; k < 3; k++) {
      const cop = makeFootCop(-35 + (k - 1) * 8, 105 + (k % 2) * 6);
      game.scene.add(cop.mesh.group);
      game.cops.push(cop);
    }
  }
  if (m.id === 7) game.setWanted(Math.max(game.wanted.stars, 4));
}

/** Try to enter the nearest car, or leave the current one. */
function tryEnterCar(game) {
  const player = game.player;
  if (player.inCar) {
    const car = player.inCar;
    player.inCar = null;
    player.x = car.x - Math.sin(car.heading) * 3.2;
    player.z = car.z - Math.cos(car.heading) * 3.2;
    player.heading = car.heading;
    player.mesh.group.visible = true;
    logEvent(game.hud, `Left the ${car.model.name}.`);
    return;
  }
  const all = [...game.parked, ...game.traffic, game.van];
  let best = null;
  let bd = PLAYER_TUNING.grabCarDistance;
  for (const car of all) {
    if (car.isVan) continue;
    const d = dist2d(player.x, player.z, car.x, car.z);
    if (d < bd) {
      bd = d;
      best = car;
    }
  }
  if (!best) return;
  const wasTraffic = game.traffic.includes(best);
  player.inCar = best;
  best.parked = false;
  if (wasTraffic) {
    game.traffic.splice(game.traffic.indexOf(best), 1);
    addWanted(game.wanted, 1);
    logEvent(game.hud, `CAR STOLEN: ${best.model.name} — the LCPD noticed.`);
    playSfx(game.audio, 'siren-blip');
  } else {
    logEvent(game.hud, `Driving the ${best.model.name}.`);
  }
  player.mesh.group.visible = false;
  player.x = best.x;
  player.z = best.z;
  player.heading = best.heading;
}

/** Repair the car at Taller Lumen (E while driving, $150, full health). */
function tryRepair(game) {
  const player = game.player;
  if (!player.inCar) return false;
  const car = player.inCar;
  if (dist2d(car.x, car.z, LANDMARKS.taller.x, LANDMARKS.taller.z) > 12) return false;
  if (car.health >= 100) {
    logEvent(game.hud, 'Taller Lumen: this car is already mint, Mara.');
    return true;
  }
  if (game.cash < PICKUPS.repairCost) {
    logEvent(game.hud, `Taller Lumen: a full repair is $${PICKUPS.repairCost} — you are short.`);
    return true;
  }
  game.cash -= PICKUPS.repairCost;
  car.health = 100;
  playSfx(game.audio, 'pickup');
  logEvent(game.hud, `Taller Lumen repaired the ${car.model.name} — $${PICKUPS.repairCost}.`);
  return true;
}

/** One fixed simulation step. input is the live keyboard state. */
function stepGame(game, dt, input) {
  if (game.state !== 'play') return;
  const { player, wanted } = game;
  game.elapsed += dt;
  wanted.elapsed += dt;

  // Camera-relative movement heading for the on-foot controls.
  input.camHeading = player.heading + Math.PI + game.cam.yaw;

  if (wasPressed(input, 'KeyE')) {
    if (!tryRepair(game)) tryEnterCar(game);
  }

  if (player.inCar) {
    drivePlayerCar(player.inCar, input, dt, game.collide);
    player.x = player.inCar.x;
    player.z = player.inCar.z;
    player.heading = player.inCar.heading;
    // Ramming the courier van (Job 5).
    const stage = currentStage(game.missions);
    if (stage && stage.type === 'hit') {
      game.vanHitCooldown -= dt;
      if (dist2d(player.x, player.z, game.van.x, game.van.z) < 4.6
        && Math.abs(player.inCar.speed) > 4 && game.vanHitCooldown <= 0) {
        game.vanHitCooldown = COP_TUNING.ramCooldown;
        game.van.health--;
        addWanted(wanted, 1);
        playSfx(game.audio, 'crash');
        logEvent(game.hud, `Courier van hit! ${Math.max(0, game.van.health)} to go.`);
      }
    }
  } else {
    stepPlayerOnFoot(player, input, dt, game.collide);
  }

  // --- weapons ---
  player.fireCooldown -= dt;
  if (!player.inCar && input.fire && player.fireCooldown <= 0) fireWeapon(game);
  if (wasPressed(input, 'Digit1')) player.weapon = 'fists';
  if (wasPressed(input, 'Digit2')) player.weapon = 'pistol';
  if (wasPressed(input, 'Digit3') && player.ammo.smg > 0) player.weapon = 'smg';

  // --- traffic, van, peds, pickups ---
  const allCars = [...game.parked, ...game.traffic, game.van, ...game.police];
  for (const car of game.traffic) stepTrafficCar(car, allCars, dt, game.collide);
  stepTrafficCar(game.van, allCars, dt, game.collide);
  separateCars(allCars);
  const danger = player.fireCooldown > 0.15 ? { x: player.x, z: player.z } : null;
  for (const ped of game.peds) stepPedestrian(ped, dt, danger, game.collide);
  collectPickups(game);

  // --- wanted level + police ---
  const wantCount = wanted.stars === 0 ? 0 : Math.min(2 + wanted.stars, COP_TUNING.maxCruisers);
  while (game.police.length < wantCount) {
    game.spawnFlip = !game.spawnFlip;
    const side = game.spawnFlip ? -1 : 1;
    spawnPoliceCars(game, 1, player.x + side * 40, player.z - 40);
  }
  while (game.police.length > wantCount) {
    const c = game.police.pop();
    game.scene.remove(c.mesh.group);
  }
  let policeNear = false;
  for (const car of game.police) {
    const d = stepPoliceCar(car, player.x, player.z, dt, game.collide);
    if (d < 60) policeNear = true;
    if (d < 3.4) {
      if (player.inCar) {
        player.inCar.speed *= 0.6;
        player.inCar.health -= COP_TUNING.ramDamage;
        playSfx(game.audio, 'crash');
        logEvent(game.hud, 'LCPD rammed your car!');
      } else {
        game.bustedTimer += dt;
        if (game.bustedTimer > 1.2) {
          busted(game);
          return;
        }
      }
    }
  }
  if (wanted.stars === 0) game.bustedTimer = 0;
  stepWantedState(wanted, dt, policeNear);
  game.heli.active = wanted.stars >= HELI_STARS;
  stepHelicopter(game.heli, player.x, player.z, dt);

  // --- foot cops (Job 6 cordon) shoot at Mara ---
  for (const cop of game.cops) {
    if (!cop.alive) continue;
    if (stepFootCop(cop, player.x, player.z, dt)) {
      hurtPlayer(game, 5);
      fireTracer(game.tracers, new THREE.Vector3(cop.x, 1.5, cop.z), new THREE.Vector3(player.x, 1.2, player.z));
      playSfx(game.audio, 'shot');
    }
  }

  // --- missions ---
  const stage = currentStage(game.missions);
  if (stage) {
    updateMission(game.missions, {
      x: player.x, z: player.z, dt,
      inCar: !!player.inCar,
      carModel: player.inCar ? CAR_MODELS.indexOf(player.inCar.model) : -1,
      wanted: wanted.stars,
      hitVan: game.van.health < 3 && stage.type === 'hit' ? consumeVanHit(game) : false,
      defeated: game.defeated,
      onEvent: (kind, data) => missionEvent(game, kind, data),
    });
  }

  // --- audio follows the world ---
  setEngineSound(game.audio, player.inCar ? Math.abs(player.inCar.speed) / 42 : 0, !!player.inCar);
  setSirenSound(game.audio, wanted.stars);

  // --- effects + camera ---
  stepTracers(game.tracers, dt);
  stepMuzzle(game.muzzle, dt);
  stepClouds(game.clouds, dt);
  for (const p of game.pickups) {
    if (p.taken) continue;
    p.bob += dt;
    p.mesh.position.y = 1.0 + Math.sin(p.bob * 2) * 0.25;
    p.mesh.rotation.y += dt;
  }
  game.cam.yaw = input.camYaw || 0;
  game.cam.pitch = input.camPitch || 0.32;
  updateCamera(game.cam, player.inCar || player, !!player.inCar, dt);
  updateBeacon(game.beacon, markerPos(game.missions), game.elapsed);
}

/** Cheap circle push so cars do not overlap each other. */
function separateCars(allCars) {
  for (let i = 0; i < allCars.length; i++) {
    for (let j = i + 1; j < allCars.length; j++) {
      const a = allCars[i];
      const b = allCars[j];
      const d = dist2d(a.x, a.z, b.x, b.z);
      if (d < 4.2 && d > 0.01) {
        const push = (4.2 - d) / 2;
        const nx = (a.x - b.x) / d;
        const nz = (a.z - b.z) / d;
        a.x += nx * push;
        a.z += nz * push;
        b.x -= nx * push;
        b.z -= nz * push;
        a.mesh.group.position.set(a.x, 0, a.z);
        b.mesh.group.position.set(b.x, 0, b.z);
      }
    }
  }
}

/** Walk over a pickup on foot to collect it. */
function collectPickups(game) {
  const player = game.player;
  if (player.inCar) return;
  for (const p of game.pickups) {
    if (p.taken) continue;
    if (dist2d(player.x, player.z, p.x, p.z) > 2.2) continue;
    p.taken = true;
    p.mesh.visible = false;
    playSfx(game.audio, 'pickup');
    if (p.kind === 'health') {
      player.health = Math.min(PLAYER_TUNING.maxHealth, player.health + PICKUPS.healthValue);
      logEvent(game.hud, `Health +${PICKUPS.healthValue}.`);
    } else if (p.kind === 'armour') {
      player.armour = Math.min(PLAYER_TUNING.maxArmour, player.armour + PICKUPS.armourValue);
      logEvent(game.hud, `Armour +${PICKUPS.armourValue}.`);
    } else {
      player.ammo.smg += PICKUPS.smgAmmo;
      player.weapon = 'smg';
      logEvent(game.hud, `Picked up the SMG "BRISA" — +${PICKUPS.smgAmmo} rounds.`);
    }
  }
}

function consumeVanHit(game) {
  // van.health was decremented in the ram check; report once per hit.
  if (game.vanHitReported === game.van.health) return false;
  game.vanHitReported = game.van.health;
  return true;
}

function missionEvent(game, kind, data) {
  if (kind === 'complete') {
    const m = data.mission;
    game.cash += m.pay;
    showBanner(game.hud, 'JOB DONE', `+$${m.pay.toLocaleString('en-US')} — ${m.name}`, 3);
    logEvent(game.hud, `JOB DONE: ${m.name} — +$${m.pay}`);
    playSfx(game.audio, 'sting');
    saveGame(game);
    if (m.id === 8) {
      game.state = 'done';
      showScreen(`<h1>THE LAST SUNSET</h1><h2>STORY COMPLETE — PUERTO LUMEN IS YOURS</h2>
        <p>Mara walks the Playa Dorada boards with the Torre vault money and
        eight jobs behind her. Tio retires. Lena buys the marina. Dario finally
        learns to park. The sun sets on Puerto Lumen — and on Mara's old life.</p>
        <p>Final cash: <b>$${game.cash.toLocaleString('en-US')}</b> · Jobs done: <b>8 / 8</b></p>
        <button id="playbtn">FREE ROAM</button>`);
      document.getElementById('playbtn').addEventListener('click', () => {
        hideScreen();
        game.state = 'play';
      });
    }
  } else if (kind === 'failed') {
    showBanner(game.hud, 'JOB FAILED', data.reason, 3);
    logEvent(game.hud, `JOB FAILED: ${data.reason}`);
    playSfx(game.audio, 'busted');
  } else if (kind === 'stage') {
    showBanner(game.hud, 'NEXT STEP', data.stage.text, 2.4);
  } else if (kind === 'defeated') {
    logEvent(game.hud, `Officer down — ${data.n} / ${data.need}`);
  }
}

/** Hitscan shot from the player's weapon, with tracer + muzzle flash. */
function fireWeapon(game) {
  const player = game.player;
  const w = WEAPONS[player.weapon];
  if (!w) return;
  if (player.weapon === 'smg') {
    if (player.ammo.smg <= 0) {
      player.weapon = 'pistol';
      return;
    }
    player.ammo.smg--;
  }
  player.fireCooldown = w.rate;
  const from = new THREE.Vector3(player.x, 1.5, player.z);
  const dir = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  flashMuzzle(game.muzzle, from.clone().add(dir.clone().multiplyScalar(0.8)));
  const to = from.clone().add(dir.clone().multiplyScalar(w.range));
  fireTracer(game.tracers, from, to);
  playSfx(game.audio, 'shot');
  // Hitscan: the nearest foot cop inside a narrow cone takes the damage.
  let best = null;
  let bd = w.range;
  for (const cop of game.cops) {
    if (!cop.alive) continue;
    const d = dist2d(player.x, player.z, cop.x, cop.z);
    if (d > w.range) continue;
    const ang = Math.abs(Math.atan2(cop.x - player.x, cop.z - player.z) - player.heading);
    if (ang < 0.12 && d < bd) {
      bd = d;
      best = cop;
    }
  }
  if (best) {
    best.hp -= 1;
    logEvent(game.hud, `Hit! -${w.damage} — officer ${Math.max(0, best.hp)} HP left.`);
    if (best.hp <= 0) {
      best.alive = false;
      best.mesh.group.visible = false;
      game.defeated++;
      logEvent(game.hud, `Officer down — ${game.defeated} / 3`);
      addWanted(game.wanted, 1);
    }
  }
  for (const p of game.peds) {
    if (dist2d(p.x, p.z, player.x, player.z) < 30) p.flee = 3;
  }
}

/** Damage Mara: armour absorbs first, then health. */
function hurtPlayer(game, n) {
  const player = game.player;
  if (player.armour > 0) {
    const absorbed = Math.min(player.armour, n);
    player.armour -= absorbed;
    player.health -= (n - absorbed);
  } else {
    player.health -= n;
  }
  if (player.health <= 0) {
    player.health = 0;
    wasted(game);
  }
}

function busted(game) {
  game.state = 'busted';
  const fine = Math.min(300, game.cash);
  game.cash -= fine;
  playSfx(game.audio, 'busted');
  saveGame(game);
  showScreen(`<h1>BUSTED</h1><h2>THE LCPD CAUGHT UP WITH MARA</h2>
    <p>The cruisers box her in on Calle Sol. Bail is $${fine} — the crew
    springs her by dawn, but the heat is gone and so is the money.</p>
    <button id="playbtn">BACK TO THE SAFEHOUSE</button>`);
  document.getElementById('playbtn').addEventListener('click', () => respawn(game));
}

function wasted(game) {
  game.state = 'wasted';
  const fine = Math.min(200, game.cash);
  game.cash -= fine;
  playSfx(game.audio, 'busted');
  saveGame(game);
  showScreen(`<h1>WASTED</h1><h2>MARA GOES DOWN ON THE STREETS OF PUERTO LUMEN</h2>
    <p>Ambulance, hospital, a $200 bill. The crew patches her up at the
    safehouse — the city is still out there, and so are the jobs.</p>
    <button id="playbtn">BACK TO THE SAFEHOUSE</button>`);
  document.getElementById('playbtn').addEventListener('click', () => respawn(game));
}

function respawn(game) {
  const player = game.player;
  hideScreen();
  player.health = PLAYER_TUNING.maxHealth;
  player.armour = 0;
  player.x = LANDMARKS.safehouse.x;
  player.z = LANDMARKS.safehouse.z;
  player.heading = 0;
  if (player.inCar) {
    player.inCar = null;
    player.mesh.group.visible = true;
  }
  game.setWanted(0);
  game.state = 'play';
  logEvent(game.hud, 'Back at the safehouse. The city is still yours to take.');
}

function saveGame(game) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: game.cash, done: game.missions.done, index: game.missions.index,
      x: game.player.x, z: game.player.z,
    }));
  } catch (e) { /* private mode — play on without a save */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/** Build the per-frame HUD view from the live game state. */
function hudView(game) {
  const player = game.player;
  const w = WEAPONS[player.weapon];
  return {
    wanted: game.wanted,
    player,
    cash: game.cash,
    radioName: game.radioName,
    objective: objectiveText(game.missions),
    marker: markerPos(game.missions),
    policeBlips: game.police.map((c) => ({ x: c.x, z: c.z })),
    heliBlip: game.heli.active
      ? { x: game.heli.group.position.x, z: game.heli.group.position.z }
      : null,
    weaponName: w ? w.label : 'FISTS',
    ammoText: player.weapon === 'smg' ? `${player.ammo.smg} RDS` : '',
    aiming: !player.inCar && player.weapon !== 'fists',
  };
}

/** Start the next job (M key). */
function startNextJob(game) {
  if (game.missions.active) {
    logEvent(game.hud, 'Finish the current job first.');
    return;
  }
  if (game.missions.index >= MISSIONS.length) {
    logEvent(game.hud, 'All 8 jobs done — Puerto Lumen is yours.');
    return;
  }
  beginMission(game, game.missions.index);
}

function main() {
  const game = bootGame();
  const params = new URLSearchParams(location.search);
  const shotName = params.get('shot');
  void params.get('seed');

  game.step = (dt, input) => stepGame(game, dt, input);

  function renderFrame() {
    updateHud(game.hud, hudView(game), 1 / 60);
    game.renderer.render(game.scene, game.cam.camera);
  }
  game.render = renderFrame;

  const save = loadSave();
  if (shotName) {
    // Screenshot mode: skip the title, stage the scene, render, flag ready.
    game.state = 'play';
    hideScreen();
    stageShot(game, shotName);
    // Age the HUD timers so the job-start banner and the radio dialogue
    // have faded: the shot must show the HUD and the action, not the intro.
    for (let i = 0; i < 10; i++) updateHud(game.hud, hudView(game), 1.0);
    renderFrame();
    renderFrame();
    window.__shotReady = true;
    window.__game = game;
    return;
  }
  game.state = 'title';
  showScreen(titleHtml(!!save, save ? save.cash : 0, save ? save.done.length : 0));
  document.getElementById('playbtn').addEventListener('click', () => {
    ensureAudio(game.audio);
    hideScreen();
    game.state = 'play';
    if (save) {
      game.cash = save.cash;
      game.missions.done = save.done || [];
      game.missions.index = save.index || 0;
      game.player.x = save.x ?? LANDMARKS.safehouse.x;
      game.player.z = save.z ?? LANDMARKS.safehouse.z;
      logEvent(game.hud, `Welcome back, Mara. $${game.cash.toLocaleString('en-US')} in the pocket.`);
    } else {
      logEvent(game.hud, 'Puerto Lumen, 18:40. Press M for your first job.');
      showDialogue(game.hud, CREW.tio, 'Mara. The Comet GT is sitting at the marina, keys in the sun visor. Take it.', 6);
    }
  });

  window.addEventListener('resize', () => onResize(game.renderer, game.cam));

  // --- the loop: fixed-step sim, render every frame ---
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const input = game.input;
    if (game.state === 'play') {
      acc += dt;
      while (acc >= STEP) {
        if (wasPressed(input, 'KeyM')) startNextJob(game);
        if (wasPressed(input, 'KeyR')) {
          game.radioName = setStation(game.audio, game.audio.station + 1);
          logEvent(game.hud, `Radio: ${game.radioName}`);
        }
        if (wasPressed(input, 'KeyP')) {
          game.state = 'pause';
          showScreen('<h1>PAUSED</h1><p>The sun waits for no one — but it will wait for you.</p><button id="playbtn">RESUME</button>');
          document.getElementById('playbtn').addEventListener('click', () => {
            hideScreen();
            game.state = 'play';
          });
        }
        stepGame(game, STEP, input);
        clearPressed(input);
        acc -= STEP;
      }
      renderFrame();
    } else if (game.state === 'pause') {
      clearPressed(input);
    }
  }
  requestAnimationFrame(frame);
  window.__game = game;
}

main();
