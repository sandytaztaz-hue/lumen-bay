// LUMEN BAY — main loop. Boots the renderer, the city, the cars, the
// people and the story; runs a fixed-step simulation; owns the game states
// (title / play / pause / busted / wasted / done), the save, the combat,
// the wanted system and the ?shot= staging hook the screenshots use.
import * as THREE from 'three';
import { CITY, WALKER, ARSENAL, SAVE_SLOT, PLACES, CAST, STATIONS, LOOT, HEAT } from './config.js';
import { seededStream, clampNum, flatDist } from './random.js';
import { raiseCity } from './city.js';
import { FLEET, CRUISER_MODEL, placeCar, driveCar, cruiseTraffic, huntPolice, parkedSpots } from './vehicles.js';
import { spawnMara, walkMara, spawnWalker, strollWalker, spawnChopper, orbitChopper, freshHeat, raiseHeat, coolHeat, spawnOfficer, officerFire } from './people.js';
import { JOBS, freshStory, openJob, advanceJob, beaconAt, objectiveLine, jobStep } from './missions.js';
import { freshAudio, startAudio, tuneStation, engineSound, sirenSound, playSfx } from './audio.js';
import { freshHud, refreshHud, noteEvent, sayLine, flashBanner, openScreen, closeScreen, titleMarkup } from './hud.js';
import { startRenderer, buildSky, freshCamera, trackCamera, freshBeacon, moveBeacon, freshTracers, shootTracer, fadeTracers, freshMuzzle, burstMuzzle, fadeMuzzle, driftClouds, handleResize } from './render.js';
import { freshInput, justPressed, clearEdges } from './input.js';
import { stageScene } from './shots.js';

const STEP = 1 / 60;
const HELI_STARS = 3;

/** Build every world object and return the game state object. */
function assembleGame() {
  const canvas = document.getElementById('game');
  const renderer = startRenderer(canvas);
  const { scene, clouds } = buildSky();
  const { colliders, roadLoops } = raiseCity(scene);
  const cam = freshCamera();
  const beacon = freshBeacon(scene);
  const tracers = freshTracers(scene);
  const muzzle = freshMuzzle(scene);
  const hud = freshHud();
  const audio = freshAudio();
  const input = freshInput();
  const rng = seededStream(CITY.seed);

  const player = spawnMara(PLACES.safehouse.x, PLACES.safehouse.z);
  scene.add(player.mesh.group);

  const parked = parkedSpots().map((s) => {
    const car = placeCar(FLEET[s.model], s.x, s.z, s.heading, false);
    car.parked = true;
    scene.add(car.mesh.group);
    return car;
  });

  const traffic = [];
  for (let i = 0; i < 12; i++) {
    const loop = roadLoops[Math.floor(rng() * roadLoops.length)];
    const wp = loop[Math.floor(rng() * loop.length)];
    const car = placeCar(FLEET[Math.floor(rng() * FLEET.length)], wp[0], wp[1], 0, false);
    car.loop = loop;
    car.loopIndex = Math.floor(rng() * loop.length);
    scene.add(car.mesh.group);
    traffic.push(car);
  }

  // The courier van for Job 5 — drives its own loop until Mara rams it.
  const van = placeCar(FLEET[5], 105, -35, Math.PI / 2, false);
  van.isVan = true;
  van.health = 3;
  van.loop = roadLoops[24];
  van.loopIndex = 0;
  scene.add(van.mesh.group);

  const peds = [];
  for (let i = 0; i < 24; i++) {
    const ped = spawnWalker(rng, -260 + rng() * 520, -260 + rng() * 520);
    scene.add(ped.mesh.group);
    peds.push(ped);
  }

  const heli = spawnChopper();
  scene.add(heli.group);
  const police = [];
  const cops = [];
  const pickups = scatterLoot(scene);

  const wanted = freshHeat();
  const missions = freshStory();

  const game = {
    state: 'title',
    cash: 0,
    elapsed: 0,
    player, parked, traffic, van, peds, heli, police, cops, pickups,
    wanted, missions, colliders, roadLoops, scene, cam, beacon,
    tracers, muzzle, hud, audio, input, renderer, clouds,
    radioName: STATIONS[0].name,
    vanHitCooldown: 0, bustedTimer: 0, defeated: 0,
    spawnFlip: false, vanHitReported: 3,
    save: null,
  };

  // --- collision: circle vs building boxes + world bounds ---
  game.collide = (x, z, r) => {
    let hit = false;
    let cx = clampNum(x, -CITY.half + 2, CITY.half - 2);
    let cz = clampNum(z, -CITY.half + 2, CITY.half - 2);
    if (cx !== x || cz !== z) hit = true;
    for (const b of colliders) {
      const nx = clampNum(cx, b.minX, b.maxX);
      const nz = clampNum(cz, b.minZ, b.maxZ);
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
    player.x = PLACES.safehouse.x;
    player.z = PLACES.safehouse.z;
    player.heading = 0;
    player.health = WALKER.maxHealth;
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
  game.hideScreens = () => closeScreen();
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
  game.spawnPolice = (n, x, z) => callCruisers(game, n, x, z);
  game.fleePeds = (x, z) => {
    for (const p of peds) if (flatDist(p.x, p.z, x, z) < 40) p.flee = 3;
  };
  game.startMission = (i) => openJobInGame(game, i);
  game.say = (who, text, s) => sayLine(hud, who, text, s);
  game.log = (t) => noteEvent(hud, t);
  game.showBanner = (t, s, d) => flashBanner(hud, t, s, d);
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
    const m = JOBS[idx];
    missions.done.push(m.id);
    missions.index = m.id;
    game.cash += pay;
  };

  return game;
}

/** Health / armour / SMG pickups scattered at the landmarks. */
function scatterLoot(scene) {
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

function callCruisers(game, n, x, z) {
  for (let i = 0; i < n; i++) {
    const car = placeCar(CRUISER_MODEL, x + i * 9, z, Math.PI, true);
    game.scene.add(car.mesh.group);
    game.police.push(car);
  }
}

function openJobInGame(game, i) {
  const m = openJob(game.missions, i);
  if (!m) return;
  for (const [who, line] of m.lines) sayLine(game.hud, who, line, 6);
  flashBanner(game.hud, `JOB ${m.id}: ${m.name}`, m.brief, 3.2);
  noteEvent(game.hud, `JOB ${m.id} STARTED: ${m.name} — $${m.pay}`);
  if (m.id === 3) game.setWanted(Math.max(game.wanted.stars, 2));
  if (m.id === 6) {
    for (let k = 0; k < 3; k++) {
      const cop = spawnOfficer(-35 + (k - 1) * 8, 105 + (k % 2) * 6);
      game.scene.add(cop.mesh.group);
      game.cops.push(cop);
    }
  }
  if (m.id === 7) game.setWanted(Math.max(game.wanted.stars, 4));
}

/** Try to enter the nearest car, or leave the current one. */
function enterOrExitCar(game) {
  const player = game.player;
  if (player.inCar) {
    const car = player.inCar;
    player.inCar = null;
    player.x = car.x - Math.sin(car.heading) * 3.2;
    player.z = car.z - Math.cos(car.heading) * 3.2;
    player.heading = car.heading;
    player.mesh.group.visible = true;
    noteEvent(game.hud, `Left the ${car.model.name}.`);
    return;
  }
  const all = [...game.parked, ...game.traffic, game.van];
  let best = null;
  let bd = WALKER.grabCarDistance;
  for (const car of all) {
    if (car.isVan) continue;
    const d = flatDist(player.x, player.z, car.x, car.z);
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
    raiseHeat(game.wanted, 1);
    noteEvent(game.hud, `CAR STOLEN: ${best.model.name} — the LCPD noticed.`);
    playSfx(game.audio, 'siren-blip');
  } else {
    noteEvent(game.hud, `Driving the ${best.model.name}.`);
  }
  player.mesh.group.visible = false;
  player.x = best.x;
  player.z = best.z;
  player.heading = best.heading;
}

/** Repair the car at Taller Lumen (E while driving, $150, full health). */
function repairAtGarage(game) {
  const player = game.player;
  if (!player.inCar) return false;
  const car = player.inCar;
  if (flatDist(car.x, car.z, PLACES.taller.x, PLACES.taller.z) > 12) return false;
  if (car.health >= 100) {
    noteEvent(game.hud, 'Taller Lumen: this car is already mint, Mara.');
    return true;
  }
  if (game.cash < LOOT.repairCost) {
    noteEvent(game.hud, `Taller Lumen: a full repair is $${LOOT.repairCost} — you are short.`);
    return true;
  }
  game.cash -= LOOT.repairCost;
  car.health = 100;
  playSfx(game.audio, 'pickup');
  noteEvent(game.hud, `Taller Lumen repaired the ${car.model.name} — $${LOOT.repairCost}.`);
  return true;
}

/** One fixed simulation step. input is the live keyboard state. */
function tickGame(game, dt, input) {
  if (game.state !== 'play') return;
  const { player, wanted } = game;
  game.elapsed += dt;
  wanted.elapsed += dt;

  // Camera-relative movement heading for the on-foot controls.
  input.camHeading = player.heading + Math.PI + game.cam.yaw;

  if (justPressed(input, 'KeyE')) {
    if (!repairAtGarage(game)) enterOrExitCar(game);
  }

  if (player.inCar) {
    driveCar(player.inCar, input, dt, game.collide);
    player.x = player.inCar.x;
    player.z = player.inCar.z;
    player.heading = player.inCar.heading;
    // Ramming the courier van (Job 5).
    const stage = jobStep(game.missions);
    if (stage && stage.type === 'hit') {
      game.vanHitCooldown -= dt;
      if (flatDist(player.x, player.z, game.van.x, game.van.z) < 4.6
        && Math.abs(player.inCar.speed) > 4 && game.vanHitCooldown <= 0) {
        game.vanHitCooldown = HEAT.ramCooldown;
        game.van.health--;
        raiseHeat(wanted, 1);
        playSfx(game.audio, 'crash');
        noteEvent(game.hud, `Courier van hit! ${Math.max(0, game.van.health)} to go.`);
      }
    }
  } else {
    walkMara(player, input, dt, game.collide);
  }

  // --- weapons ---
  player.fireCooldown -= dt;
  if (!player.inCar && input.fire && player.fireCooldown <= 0) shootWeapon(game);
  if (justPressed(input, 'Digit1')) player.weapon = 'fists';
  if (justPressed(input, 'Digit2')) player.weapon = 'pistol';
  if (justPressed(input, 'Digit3') && player.ammo.smg > 0) player.weapon = 'smg';

  // --- traffic, van, peds, pickups ---
  const allCars = [...game.parked, ...game.traffic, game.van, ...game.police];
  for (const car of game.traffic) cruiseTraffic(car, allCars, dt, game.collide);
  cruiseTraffic(game.van, allCars, dt, game.collide);
  pushCarsApart(allCars);
  const danger = player.fireCooldown > 0.15 ? { x: player.x, z: player.z } : null;
  for (const ped of game.peds) strollWalker(ped, dt, danger, game.collide);
  grabLoot(game);

  // --- wanted level + police ---
  const wantCount = wanted.stars === 0 ? 0 : Math.min(2 + wanted.stars, HEAT.maxCruisers);
  while (game.police.length < wantCount) {
    game.spawnFlip = !game.spawnFlip;
    const side = game.spawnFlip ? -1 : 1;
    callCruisers(game, 1, player.x + side * 40, player.z - 40);
  }
  while (game.police.length > wantCount) {
    const c = game.police.pop();
    game.scene.remove(c.mesh.group);
  }
  let policeNear = false;
  for (const car of game.police) {
    const d = huntPolice(car, player.x, player.z, dt, game.collide);
    if (d < 60) policeNear = true;
    if (d < 3.4) {
      if (player.inCar) {
        player.inCar.speed *= 0.6;
        player.inCar.health -= HEAT.ramDamage;
        playSfx(game.audio, 'crash');
        noteEvent(game.hud, 'LCPD rammed your car!');
      } else {
        game.bustedTimer += dt;
        if (game.bustedTimer > 1.2) {
          arrested(game);
          return;
        }
      }
    }
  }
  if (wanted.stars === 0) game.bustedTimer = 0;
  coolHeat(wanted, dt, policeNear);
  game.heli.active = wanted.stars >= HELI_STARS;
  orbitChopper(game.heli, player.x, player.z, dt);

  // --- foot cops (Job 6 cordon) shoot at Mara ---
  for (const cop of game.cops) {
    if (!cop.alive) continue;
    if (officerFire(cop, player.x, player.z, dt)) {
      harmMara(game, 5);
      shootTracer(game.tracers, new THREE.Vector3(cop.x, 1.5, cop.z), new THREE.Vector3(player.x, 1.2, player.z));
      playSfx(game.audio, 'shot');
    }
  }

  // --- missions ---
  const stage = jobStep(game.missions);
  if (stage) {
    advanceJob(game.missions, {
      x: player.x, z: player.z, dt,
      inCar: !!player.inCar,
      carModel: player.inCar ? FLEET.indexOf(player.inCar.model) : -1,
      wanted: wanted.stars,
      hitVan: game.van.health < 3 && stage.type === 'hit' ? noteVanHit(game) : false,
      defeated: game.defeated,
      onEvent: (kind, data) => jobEvent(game, kind, data),
    });
  }

  // --- audio follows the world ---
  engineSound(game.audio, player.inCar ? Math.abs(player.inCar.speed) / 42 : 0, !!player.inCar);
  sirenSound(game.audio, wanted.stars);

  // --- effects + camera ---
  fadeTracers(game.tracers, dt);
  fadeMuzzle(game.muzzle, dt);
  driftClouds(game.clouds, dt);
  for (const p of game.pickups) {
    if (p.taken) continue;
    p.bob += dt;
    p.mesh.position.y = 1.0 + Math.sin(p.bob * 2) * 0.25;
    p.mesh.rotation.y += dt;
  }
  game.cam.yaw = input.camYaw || 0;
  game.cam.pitch = input.camPitch || 0.32;
  trackCamera(game.cam, player.inCar || player, !!player.inCar, dt);
  moveBeacon(game.beacon, beaconAt(game.missions), game.elapsed);
}

/** Cheap circle push so cars do not overlap each other. */
function pushCarsApart(allCars) {
  for (let i = 0; i < allCars.length; i++) {
    for (let j = i + 1; j < allCars.length; j++) {
      const a = allCars[i];
      const b = allCars[j];
      const d = flatDist(a.x, a.z, b.x, b.z);
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
function grabLoot(game) {
  const player = game.player;
  if (player.inCar) return;
  for (const p of game.pickups) {
    if (p.taken) continue;
    if (flatDist(player.x, player.z, p.x, p.z) > 2.2) continue;
    p.taken = true;
    p.mesh.visible = false;
    playSfx(game.audio, 'pickup');
    if (p.kind === 'health') {
      player.health = Math.min(WALKER.maxHealth, player.health + LOOT.healthValue);
      noteEvent(game.hud, `Health +${LOOT.healthValue}.`);
    } else if (p.kind === 'armour') {
      player.armour = Math.min(WALKER.maxArmour, player.armour + LOOT.armourValue);
      noteEvent(game.hud, `Armour +${LOOT.armourValue}.`);
    } else {
      player.ammo.smg += LOOT.smgAmmo;
      player.weapon = 'smg';
      noteEvent(game.hud, `Picked up the SMG "BRISA" — +${LOOT.smgAmmo} rounds.`);
    }
  }
}

function noteVanHit(game) {
  // van.health was decremented in the ram check; report once per hit.
  if (game.vanHitReported === game.van.health) return false;
  game.vanHitReported = game.van.health;
  return true;
}

function jobEvent(game, kind, data) {
  if (kind === 'complete') {
    const m = data.mission;
    game.cash += m.pay;
    flashBanner(game.hud, 'JOB DONE', `+$${m.pay.toLocaleString('en-US')} — ${m.name}`, 3);
    noteEvent(game.hud, `JOB DONE: ${m.name} — +$${m.pay}`);
    playSfx(game.audio, 'sting');
    writeSave(game);
    if (m.id === 8) {
      game.state = 'done';
      openScreen(`<h1>THE LAST SUNSET</h1><h2>STORY COMPLETE — PUERTO LUMEN IS YOURS</h2>
        <p>Mara walks the Playa Dorada boards with the Torre vault money and
        eight jobs behind her. Tio retires. Lena buys the marina. Dario finally
        learns to park. The sun sets on Puerto Lumen — and on Mara's old life.</p>
        <p>Final cash: <b>$${game.cash.toLocaleString('en-US')}</b> · Jobs done: <b>8 / 8</b></p>
        <button id="playbtn">FREE ROAM</button>`);
      document.getElementById('playbtn').addEventListener('click', () => {
        closeScreen();
        game.state = 'play';
      });
    }
  } else if (kind === 'failed') {
    flashBanner(game.hud, 'JOB FAILED', data.reason, 3);
    noteEvent(game.hud, `JOB FAILED: ${data.reason}`);
    playSfx(game.audio, 'busted');
  } else if (kind === 'stage') {
    flashBanner(game.hud, 'NEXT STEP', data.stage.text, 2.4);
  } else if (kind === 'defeated') {
    noteEvent(game.hud, `Officer down — ${data.n} / ${data.need}`);
  }
}

/** Hitscan shot from the player's weapon, with tracer + muzzle flash. */
function shootWeapon(game) {
  const player = game.player;
  const w = ARSENAL[player.weapon];
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
  burstMuzzle(game.muzzle, from.clone().add(dir.clone().multiplyScalar(0.8)));
  const to = from.clone().add(dir.clone().multiplyScalar(w.range));
  shootTracer(game.tracers, from, to);
  playSfx(game.audio, 'shot');
  // Hitscan: the nearest foot cop inside a narrow cone takes the damage.
  let best = null;
  let bd = w.range;
  for (const cop of game.cops) {
    if (!cop.alive) continue;
    const d = flatDist(player.x, player.z, cop.x, cop.z);
    if (d > w.range) continue;
    const ang = Math.abs(Math.atan2(cop.x - player.x, cop.z - player.z) - player.heading);
    if (ang < 0.12 && d < bd) {
      bd = d;
      best = cop;
    }
  }
  if (best) {
    best.hp -= 1;
    noteEvent(game.hud, `Hit! -${w.damage} — officer ${Math.max(0, best.hp)} HP left.`);
    if (best.hp <= 0) {
      best.alive = false;
      best.mesh.group.visible = false;
      game.defeated++;
      noteEvent(game.hud, `Officer down — ${game.defeated} / 3`);
      raiseHeat(game.wanted, 1);
    }
  }
  for (const p of game.peds) {
    if (flatDist(p.x, p.z, player.x, player.z) < 30) p.flee = 3;
  }
}

/** Damage Mara: armour absorbs first, then health. */
function harmMara(game, n) {
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
    flatlined(game);
  }
}

function arrested(game) {
  game.state = 'busted';
  const fine = Math.min(300, game.cash);
  game.cash -= fine;
  playSfx(game.audio, 'busted');
  writeSave(game);
  openScreen(`<h1>BUSTED</h1><h2>THE LCPD CAUGHT UP WITH MARA</h2>
    <p>The cruisers box her in on Calle Sol. Bail is $${fine} — the crew
    springs her by dawn, but the heat is gone and so is the money.</p>
    <button id="playbtn">BACK TO THE SAFEHOUSE</button>`);
  document.getElementById('playbtn').addEventListener('click', () => backToSafehouse(game));
}

function flatlined(game) {
  game.state = 'wasted';
  const fine = Math.min(200, game.cash);
  game.cash -= fine;
  playSfx(game.audio, 'busted');
  writeSave(game);
  openScreen(`<h1>WASTED</h1><h2>MARA GOES DOWN ON THE STREETS OF PUERTO LUMEN</h2>
    <p>Ambulance, hospital, a $200 bill. The crew patches her up at the
    safehouse — the city is still out there, and so are the jobs.</p>
    <button id="playbtn">BACK TO THE SAFEHOUSE</button>`);
  document.getElementById('playbtn').addEventListener('click', () => backToSafehouse(game));
}

function backToSafehouse(game) {
  const player = game.player;
  closeScreen();
  player.health = WALKER.maxHealth;
  player.armour = 0;
  player.x = PLACES.safehouse.x;
  player.z = PLACES.safehouse.z;
  player.heading = 0;
  if (player.inCar) {
    player.inCar = null;
    player.mesh.group.visible = true;
  }
  game.setWanted(0);
  game.state = 'play';
  noteEvent(game.hud, 'Back at the safehouse. The city is still yours to take.');
}

function writeSave(game) {
  try {
    localStorage.setItem(SAVE_SLOT, JSON.stringify({
      cash: game.cash, done: game.missions.done, index: game.missions.index,
      x: game.player.x, z: game.player.z,
    }));
  } catch (e) { /* private mode — play on without a save */ }
}

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_SLOT);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/** Build the per-frame HUD view from the live game state. */
function hudSnapshot(game) {
  const player = game.player;
  const w = ARSENAL[player.weapon];
  return {
    wanted: game.wanted,
    player,
    cash: game.cash,
    radioName: game.radioName,
    objective: objectiveLine(game.missions),
    marker: beaconAt(game.missions),
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
function openNextJob(game) {
  if (game.missions.active) {
    noteEvent(game.hud, 'Finish the current job first.');
    return;
  }
  if (game.missions.index >= JOBS.length) {
    noteEvent(game.hud, 'All 8 jobs done — Puerto Lumen is yours.');
    return;
  }
  openJobInGame(game, game.missions.index);
}

function main() {
  const game = assembleGame();
  const params = new URLSearchParams(location.search);
  const shotName = params.get('shot');
  void params.get('seed');

  game.step = (dt, input) => tickGame(game, dt, input);

  function renderFrame() {
    refreshHud(game.hud, hudSnapshot(game), 1 / 60);
    game.renderer.render(game.scene, game.cam.camera);
  }
  game.render = renderFrame;

  const save = readSave();
  if (shotName) {
    // Screenshot mode: skip the title, stage the scene, render, flag ready.
    game.state = 'play';
    closeScreen();
    stageScene(game, shotName);
    // Age the HUD timers so the job-start banner and the radio dialogue
    // have faded: the shot must show the HUD and the action, not the intro.
    for (let i = 0; i < 10; i++) refreshHud(game.hud, hudSnapshot(game), 1.0);
    renderFrame();
    renderFrame();
    window.__shotReady = true;
    window.__game = game;
    return;
  }
  game.state = 'title';
  openScreen(titleMarkup(!!save, save ? save.cash : 0, save ? save.done.length : 0));
  document.getElementById('playbtn').addEventListener('click', () => {
    startAudio(game.audio);
    closeScreen();
    game.state = 'play';
    if (save) {
      game.cash = save.cash;
      game.missions.done = save.done || [];
      game.missions.index = save.index || 0;
      game.player.x = save.x ?? PLACES.safehouse.x;
      game.player.z = save.z ?? PLACES.safehouse.z;
      noteEvent(game.hud, `Welcome back, Mara. $${game.cash.toLocaleString('en-US')} in the pocket.`);
    } else {
      noteEvent(game.hud, 'Puerto Lumen, 18:40. Press M for your first job.');
      sayLine(game.hud, CAST.tio, 'Mara. The Comet GT is sitting at the marina, keys in the sun visor. Take it.', 6);
    }
  });

  window.addEventListener('resize', () => handleResize(game.renderer, game.cam));

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
        if (justPressed(input, 'KeyM')) openNextJob(game);
        if (justPressed(input, 'KeyR')) {
          game.radioName = tuneStation(game.audio, game.audio.station + 1);
          noteEvent(game.hud, `Radio: ${game.radioName}`);
        }
        if (justPressed(input, 'KeyP')) {
          game.state = 'pause';
          openScreen('<h1>PAUSED</h1><p>The sun waits for no one — but it will wait for you.</p><button id="playbtn">RESUME</button>');
          document.getElementById('playbtn').addEventListener('click', () => {
            closeScreen();
            game.state = 'play';
          });
        }
        tickGame(game, STEP, input);
        clearEdges(input);
        acc -= STEP;
      }
      renderFrame();
    } else if (game.state === 'pause') {
      clearEdges(input);
    }
  }
  requestAnimationFrame(frame);
  window.__game = game;
}

main();
