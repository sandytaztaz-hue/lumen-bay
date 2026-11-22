// LUMEN BAY — the game itself: player on foot and by car, traffic,
// pedestrians, wanted level + police + helicopter, combat, economy,
// garage, save, missions, and the ?shot= staged screenshots.
// Seeded deterministic world; three.js 0.170 vendored; no network.
import * as THREE from 'three';
import { WORLD, MISSIONS, START_CASH, CARS, TRAFFIC_COLOURS, SHOT_PINS } from './config.js';
import { makeRng } from './random.js';
import { buildCity } from './city.js';
import { makeComet, makePolice, makeTraffic, makeBike, makeHeli, makeBoat } from './vehicles.js';
import { makePerson, makeMara, makeOfficer, makeCashBurst } from './people.js';
import { AudioSys } from './audio.js';
import { initHUD, updateHUD, setDialogue, addToast, addLog, drawCityMap } from './hud.js';
import { initRenderer, applyPreset, chaseCam, orbitCam } from './render.js';
import { bindInput, axis } from './input.js';
import { createMissions } from './missions.js';
import { createGarage } from './garage.js';
import { createRace } from './race.js';
import { createTurf } from './turf.js';
import { stageShot } from './shots.js';

const SAVE_KEY = 'lumenbay.save.v1';
const params = new URLSearchParams(location.search);
const SHOT = parseInt(params.get('shot') || '0', 10) || 0;
const SEED = parseInt(params.get('seed') || '7', 10) || 7;

window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));

function boot() {
  const G = {
    seed: SEED,
    shotMode: 0,
    phase: 'title',
    rng: makeRng(SEED),
    audio: new AudioSys(),
    state: {
      cash: START_CASH, rep: 0, kills: 0, health: 100, armour: 0, nos: 100,
      wanted: 0, weapon: 'PISTOL', ammoSMG: 30, mission: 0, missionStage: 1,
      done: {}, storyComplete: false, clock: '18:40',
      street: 'DUNES \u2014 Torre Boulevard', topSpeedBonus: 0,
    },
    player: {
      pos: { x: 20, z: 250 }, heading: 0, speed: 0, inCar: false,
      camYaw: Math.PI / 2, camPitch: 0.28, mesh: null, car: null,
    },
    traffic: [], peds: [], police: [], guards: [],
    tracers: [], damageDivs: [],
    shotProps: [], shotFrames: 0, hiddenTimer: 0, bustedTimer: 0,
    timeSec: 18 * 3600 + 40 * 60, // 18:40
    gunfireAt: -10,
  };
  window.__game = G;
  window.__shotReady = false;

  // --- HUD helpers bound on G ---------------------------------------------
  G.log = (line) => addLog(G, line);
  G.toast = (kind, title, text) => addToast(G, kind, title, text);
  G.setDialogue = (who, colour, text) => setDialogue(G, who, colour, text);

  // --- renderer / city ------------------------------------------------------
  initRenderer(G);
  buildCity(G);
  initHUD(G);

  // --- player -----------------------------------------------------------------
  const mara = makeMara();
  mara.position.set(G.player.pos.x, 0, G.player.pos.z);
  G.scene.add(mara);
  G.player.mesh = mara;
  const comet = makeComet();
  comet.position.set(24, 0, 250);
  comet.rotation.y = Math.PI / 2;
  G.scene.add(comet);
  G.player.car = comet;
  G.player.carOwned = false;

  // --- traffic: 12 AI cars on road loops ---------------------------------------
  const rng = makeRng(SEED + 31);
  for (let i = 0; i < 12; i++) {
    const onBoulevard = i < 8;
    const mesh = makeTraffic(TRAFFIC_COLOURS[i % TRAFFIC_COLOURS.length]);
    const lane = onBoulevard ? (i % 2 ? WORLD.boulevardZ - 3.5 : WORLD.boulevardZ + 3.5) : 0;
    const t = {
      mesh,
      x: rng.range(-20, 340),
      z: onBoulevard ? lane : rng.range(30, 300),
      heading: onBoulevard ? (i % 2 ? 0 : Math.PI) : (i % 2 ? Math.PI / 2 : -Math.PI / 2),
      speed: rng.range(7, 12),
      boulevard: onBoulevard,
      avenue: onBoulevard ? 0 : WORLD.avenuesX[i % WORLD.avenuesX.length],
    };
    mesh.position.set(t.x, 0, t.z);
    mesh.rotation.y = -t.heading + Math.PI / 2; // vehicles face +z; heading 0 = east
    G.scene.add(mesh);
    G.traffic.push(t);
  }

  // --- pedestrians: 24 walkers on the sidewalks --------------------------------
  const shirts = [0xff6fb5, 0x3fae5a, 0x9b5de5, 0xffd23e, 0x3a9eef, 0xff5a5a, 0xf2f2f2, 0x7ad07a];
  for (let i = 0; i < 24; i++) {
    const mesh = makePerson({ shirt: shirts[i % shirts.length], pants: 0x22262e, scale: 1 });
    const p = {
      mesh,
      x: rng.range(-20, 340),
      z: rng.chance(0.5) ? WORLD.boulevardZ - 8.6 : WORLD.boulevardZ + 8.6,
      heading: rng.chance(0.5) ? 0 : Math.PI,
      speed: rng.range(0.8, 1.6),
      fleeing: false,
    };
    mesh.position.set(p.x, 0, p.z);
    mesh.rotation.y = p.heading;
    G.scene.add(mesh);
    G.peds.push(p);
  }

  // --- police pool: 6 cruisers + heli, hidden until wanted ----------------------
  for (let i = 0; i < 6; i++) {
    const mesh = makePolice();
    mesh.visible = false;
    G.scene.add(mesh);
    G.police.push({ mesh, x: 0, z: 0, heading: 0, speed: 0, active: false, health: 100 });
  }
  const heli = makeHeli();
  heli.visible = false;
  heli.position.set(150, 26, 190);
  G.scene.add(heli);
  G.heli = { mesh: heli, angle: 0, active: false };

  // --- systems ------------------------------------------------------------------
  G.missions = createMissions(G);
  G.garage = createGarage(G);
  G.race = createRace(G);
  G.turf = createTurf(G);
  bindInput(G);

  // --- ped / traffic spawn helpers (used by shot staging) ------------------------
  G.spawnPedsNear = (x, z, n) => {
    const r2 = makeRng(SEED + Math.floor(x) * 7 + Math.floor(z));
    for (let i = 0; i < n; i++) {
      const mesh = makePerson({ shirt: shirts[(i + 2) % shirts.length], scale: 1 });
      const p = { mesh, x: x + r2.range(-4, 4), z: z + r2.range(-2, 2), heading: r2.range(0, Math.PI * 2), speed: 1, fleeing: false };
      mesh.position.set(p.x, 0, p.z);
      mesh.rotation.y = p.heading;
      G.scene.add(mesh);
      G.peds.push(p);
    }
  };
  G.clearPedsNear = (x, z, r) => {
    for (const p of G.peds) {
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz < r * r) p.mesh.visible = false;
    }
  };
  G.spawnTrafficNear = (x, z, n) => {
    for (let i = 0; i < n; i++) {
      const mesh = makeTraffic(TRAFFIC_COLOURS[i % TRAFFIC_COLOURS.length]);
      mesh.position.set(x + i * 9, 0, z + (i % 2 ? 3.5 : -3.5));
      mesh.rotation.y = -Math.PI / 2; // west-facing, headlights toward the camera
      G.scene.add(mesh);
      G.shotProps.push(mesh);
    }
  };
  G.clearTrafficNear = (x, z, r) => {
    for (const t of G.traffic) {
      const dx = t.x - x, dz = t.z - z;
      if (dx * dx + dz * dz < r * r) t.mesh.visible = false;
    }
  };
  G.clearUmbrellasNear = (x, z, r) => {
    if (!G.umbrellas) return;
    for (const u of G.umbrellas.children) {
      const dx = u.position.x - x, dz = u.position.z - z;
      if (dx * dx + dz * dz < r * r) u.visible = false;
    }
  };

  // --- wanted ----------------------------------------------------------------------
  G.setWanted = (n) => {
    const s = G.state;
    n = Math.max(0, Math.min(5, n));
    const before = s.wanted;
    s.wanted = n;
    if (n > 0) {
      let spawned = 0;
      for (const c of G.police) {
        if (spawned >= Math.min(6, n + 2)) break;
        if (!c.active) {
          c.active = true;
          const a = (spawned / Math.max(1, n + 2)) * Math.PI * 2;
          c.x = G.player.pos.x + Math.cos(a) * 55;
          c.z = G.player.pos.z + Math.sin(a) * 55;
          c.mesh.visible = true;
          spawned++;
        }
      }
      G.audio.startSiren();
      if (n >= 3) {
        G.heli.active = true;
        G.heli.mesh.visible = true;
      }
      if (n > before) G.toast('bad', 'WANTED LEVEL UP', `${n} star${n > 1 ? 's' : ''} \u2014 the whole LCPD is on you`);
    } else {
      for (const c of G.police) { c.active = false; c.mesh.visible = false; }
      G.heli.active = false;
      G.heli.mesh.visible = false;
      G.audio.stopSiren();
    }
  };

  // --- weapons / combat -------------------------------------------------------------
  G.setWeapon = (w) => {
    if (w === 'SMG' && G.state.ammoSMG <= 0) { G.toast('bad', 'NO AMMO', 'SMG is dry \u2014 find ammo'); return; }
    G.state.weapon = w;
  };
  G.tryShoot = () => {
    if (G.phase !== 'playing' && !G.shotMode) return;
    if (G.player.inCar) return;
    const s = G.state;
    if (s.weapon === 'FISTS') return;
    if (s.weapon === 'SMG') {
      if (s.ammoSMG <= 0) { G.toast('bad', 'NO AMMO', 'SMG is dry'); return; }
      s.ammoSMG--;
    }
    G.audio.gunshot();
    G.gunfireAt = G.timeSec;
    // muzzle flash on Mara's gun
    const gun = G.player.mesh.children.find((c) => c.name === 'gun');
    if (gun && gun.userData.flash) {
      gun.userData.flash.visible = true;
      setTimeout(() => { gun.userData.flash.visible = false; }, 90);
    }
    // hitscan: nearest officer/guard in front, within 40 m
    const px = G.player.pos.x, pz = G.player.pos.z;
    const fx = Math.cos(G.player.heading), fz = Math.sin(G.player.heading);
    let best = null, bestD = 40;
    const consider = (obj, x, z, kind) => {
      const dx = x - px, dz = z - pz;
      const d = Math.hypot(dx, dz);
      if (d > bestD || d < 0.5) return;
      const dot = (dx * fx + dz * fz) / d;
      if (dot < 0.86) return;
      best = { obj, x, z, d, kind }; bestD = d;
    };
    for (const c of G.police) if (c.active) consider(c, c.x, c.z, 'police');
    for (const gd of G.guards) if (!gd.dead) consider(gd, gd.x, gd.z, 'guard');
    if (best) {
      // tracer from Mara to the target
      const from = new THREE.Vector3(px, 1.3, pz);
      const to = new THREE.Vector3(best.x, 1.2, best.z);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([from, to]),
        new THREE.LineBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9 }),
      );
      G.scene.add(line);
      G.tracers.push({ line, life: 0.15 });
      const dmg = s.weapon === 'SMG' ? 22 : 34;
      best.obj.health -= dmg;
      G.damageNumber(best.x, best.z, String(dmg));
      if (best.obj.health <= 0) {
        if (best.kind === 'guard') {
          best.obj.dead = true;
          best.obj.mesh.rotation.x = -Math.PI / 2;
          G.missions.guardKills++;
          G.log(`Vault guard down \u2014 ${G.missions.guardKills}/4`);
        } else {
          best.obj.active = false;
          best.obj.mesh.rotation.x = -Math.PI / 2;
          best.obj.mesh.position.y = 0.2;
        }
        s.kills++;
        s.cash += 150;
        s.wanted = Math.min(5, s.wanted + 1);
        G.setWanted(s.wanted);
        G.log('Mara downed a police officer \u2014 +$150');
      }
    }
  };
  G.damageNumber = (x, z, text) => {
    const el = document.createElement('div');
    el.className = 'dmg';
    el.textContent = text;
    document.getElementById('damageLayer').appendChild(el);
    const v = new THREE.Vector3(x, 2, z).project(G.camera);
    el.style.left = `${((v.x + 1) / 2) * window.innerWidth}px`;
    el.style.top = `${((-v.y + 1) / 2) * window.innerHeight}px`;
    setTimeout(() => el.remove(), 900);
  };

  // --- cars ---------------------------------------------------------------------------
  G.tryEnterExitCar = () => {
    if (G.phase !== 'playing') return;
    if (G.player.inCar) { G.exitCar(); return; }
    G.enterCar();
  };
  G.enterCar = () => {
    const p = G.player;
    // nearest car: the hero Comet first, then traffic
    let best = null, bestD = 5;
    const consider = (mesh, x, z, kind) => {
      const d = Math.hypot(x - p.pos.x, z - p.pos.z);
      if (d < bestD) { best = { mesh, x, z, kind }; bestD = d; }
    };
    consider(p.car, p.car.position.x, p.car.position.z, 'comet');
    for (const t of G.traffic) consider(t.mesh, t.x, t.z, 'traffic');
    if (!best) { G.toast('bad', 'NO CAR', 'No car close enough to steal'); return false; }
    p.inCar = true;
    p.mesh.visible = false;
    p.stolenCar = best;
    if (best.kind === 'traffic') {
      G.state.wanted = Math.min(5, G.state.wanted + 1);
      G.setWanted(G.state.wanted);
      G.toast('bad', 'VEHICLE STOLEN', best.kind === 'traffic' ? 'City Sedan' : 'Veloz Comet RS');
    }
    G.audio.startEngine();
    return true;
  };
  G.exitCar = () => {
    const p = G.player;
    if (!p.inCar) return false;
    p.inCar = false;
    p.speed = 0;
    p.pos.x += Math.cos(p.heading + Math.PI / 2) * 2.5;
    p.pos.z += Math.sin(p.heading + Math.PI / 2) * 2.5;
    p.mesh.visible = true;
    p.mesh.position.set(p.pos.x, 0, p.pos.z);
    return true;
  };

  // --- NOS / garage ----------------------------------------------------------------------
  G.burnNos = () => {
    const s = G.state;
    if (!G.player.inCar) return false;
    if (s.nos <= 0) return false;
    s.nos = Math.max(0, s.nos - 30);
    G.player.nosBoost = 2;
    G.log('NOS burning \u2014 hold Shift on the straight');
    return true;
  };
  G.buyEngine = () => G.garage.buyEngine();

  // --- missions ----------------------------------------------------------------------------
  G.startMission = (id) => G.missions.start(id);
  G.completeMission = (id) => G.missions.complete(id);
  G.completeAllMissions = () => G.missions.completeAll();

  // --- pause / map / radio ----------------------------------------------------------------------
  G.togglePause = () => {
    if (G.phase === 'playing') {
      G.phase = 'paused';
      document.getElementById('pauseScreen').style.display = 'flex';
    } else if (G.phase === 'paused') {
      G.phase = 'playing';
      document.getElementById('pauseScreen').style.display = 'none';
    }
  };
  G.toggleMap = () => {
    const w = document.getElementById('mapWrap');
    const show = w.style.display !== 'block';
    w.style.display = show ? 'block' : 'none';
    if (show) drawCityMap(G);
  };
  G.toggleRadio = () => {
    if (G.audio.radioTimer) G.audio.stopRadio();
    else G.audio.startRadio();
  };

  // --- save / load ------------------------------------------------------------------------------
  G.save = () => {
    try {
      const s = G.state;
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: s.cash, rep: s.rep, kills: s.kills, done: s.done,
        mission: s.mission, turf: [...G.turf.owned], garage: G.garage.owned,
        engine: G.garage.engine, pos: G.player.pos, storyComplete: s.storyComplete,
      }));
      return true;
    } catch { return false; }
  };
  G.load = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      G.state.cash = d.cash; G.state.rep = d.rep; G.state.kills = d.kills;
      G.state.done = d.done || {}; G.state.mission = d.mission || 0;
      G.state.storyComplete = !!d.storyComplete;
      for (const t of d.turf || []) G.turf.owned.add(t);
      G.garage.owned = !!d.garage; G.garage.engine = d.engine || 0;
      if (d.pos) { G.player.pos = d.pos; }
      return true;
    } catch { return false; }
  };

  // --- title -> play -------------------------------------------------------------------------------
  G.startGame = () => {
    document.getElementById('titleScreen').style.display = 'none';
    G.phase = 'playing';
    G.audio.ensure();
    G.audio.startRadio();
    if (G.state.mission === 0 && !G.state.done[1]) G.missions.start(1);
    G.log('LUMEN BAY \u2014 Puerto Lumen. Press M to start the story.');
  };
  G.start = () => G.startGame();
  G.pause = () => { if (G.phase === 'playing') G.togglePause(); };
  G.resume = () => { if (G.phase === 'paused') G.togglePause(); };

  // --- BUSTED / WASTED -----------------------------------------------------------------------------
  G.wasted = () => {
    G.state.health = 100;
    G.state.cash = Math.max(0, Math.floor(G.state.cash * 0.9));
    G.state.wanted = 0;
    G.setWanted(0);
    G.player.pos = { x: 60, z: 215 };
    G.player.speed = 0;
    G.toast('bad', 'WASTED', 'Mara woke up at the clinic \u2014 10% cash lost');
    G.log('WASTED \u2014 clinic bill took 10% of your cash');
  };
  G.busted = () => {
    G.state.wanted = 0;
    G.setWanted(0);
    G.state.cash = Math.max(0, Math.floor(G.state.cash * 0.95));
    G.toast('bad', 'BUSTED', 'LCPD took you in \u2014 5% cash lost');
  };

  // --- street name from position ----------------------------------------------------------------------
  function streetName(x, z) {
    if (z > WORLD.beachZ0) return 'PLAYA DORADA \u2014 Ocean Boulevard';
    if (z < 100) return 'TORRE \u2014 Torre Boulevard';
    return 'DUNES \u2014 Torre Boulevard';
  }

  // --- mission 15 guards --------------------------------------------------------------------------------
  function spawnGuards() {
    if (G.guards.length) return;
    for (let i = 0; i < 4; i++) {
      const mesh = makeOfficer();
      const x = 178 + (i % 2) * 14, z = 56 + Math.floor(i / 2) * 10;
      mesh.position.set(x, 0, z);
      G.scene.add(mesh);
      G.guards.push({ mesh, x, z, health: 100, dead: false });
    }
  }

  // --- main loop ------------------------------------------------------------------------------------------
  const clock = new THREE.Clock();
  let frames = 0;
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    frames++;
    G.renderFrames = frames;
    const s = G.state;
    const p = G.player;

    if (G.shotMode) {
      // frozen staging: rotors spin, flashes pulse, camera re-pinned
      if (G.shotHeli && G.shotHeli.userData.rotor) {
        G.shotHeli.userData.rotor.rotation.y += dt * 14;
        G.shotHeli.userData.tailRotor.rotation.z += dt * 20;
      }
      if (G.shotCam) {
        if (G.shotCam.fixed) {
          G.camera.position.set(...G.shotCam.pos);
          G.camera.lookAt(...G.shotCam.look);
        } else {
          chaseCam(G, G.shotCam.pos, G.shotCam.heading, G.shotCam.dist, G.shotCam.height, 10);
        }
      }
      G.sky.clouds.children.forEach((c, i) => { c.position.x += dt * (0.4 + i * 0.05); if (c.position.x > 420) c.position.x = -60; });
      updateHUD(G);
      G.renderer.render(G.scene, G.camera);
      G.shotFrames++;
      if (G.shotFrames === 6) {
        window.__shotReady = true;
        document.documentElement.setAttribute('data-hud-live', '1');
      }
      return;
    }

    if (G.phase === 'playing') {
      G.timeSec += dt;
      const mins = Math.floor(G.timeSec / 60) % 60;
      const hrs = Math.floor(G.timeSec / 3600) % 24;
      s.clock = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      s.street = streetName(p.pos.x, p.pos.z);

      // mouse orbit
      p.camYaw -= (G.mouse.dx || 0) * 0.003;
      p.camPitch = Math.max(0.05, Math.min(1.1, p.camPitch + (G.mouse.dy || 0) * 0.002));
      G.mouse.dx = 0; G.mouse.dy = 0;

      if (p.inCar) {
        const maxMs = (CARS.comet.topSpeed + (s.topSpeedBonus || 0)) / 3.6;
        const fwd = axis(G.keys, 'KeyS', 'KeyW');
        const steer = axis(G.keys, 'KeyA', 'KeyD');
        const nos = G.keys.has('ShiftLeft') || G.keys.has('ShiftRight');
        if (nos && s.nos > 0 && fwd > 0) {
          s.nos = Math.max(0, s.nos - dt * 22);
          p.nosBoost = 0.5;
        }
        const accel = fwd * CARS.comet.accel * (p.nosBoost > 0 ? 1.6 : 1);
        p.speed += accel * dt;
        if (G.keys.has('Space')) p.speed *= Math.pow(0.2, dt);
        p.speed -= p.speed * 0.4 * dt; // drag
        p.speed = Math.max(-8, Math.min(maxMs * (p.nosBoost > 0 ? 1.5 : 1), p.speed));
        if (p.nosBoost > 0) p.nosBoost -= dt;
        p.heading += steer * dt * 1.6 * Math.min(1, Math.abs(p.speed) / 8) * (p.speed < 0 ? -1 : 1);
        p.pos.x += Math.cos(p.heading) * p.speed * dt;
        p.pos.z += Math.sin(p.heading) * p.speed * dt;
        p.pos.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, p.pos.x));
        p.pos.z = Math.max(WORLD.minZ, Math.min(WORLD.maxZ, p.pos.z));
        const car = p.stolenCar ? p.stolenCar.mesh : p.car;
        car.position.set(p.pos.x, 0, p.pos.z);
        car.rotation.y = -p.heading + Math.PI / 2;
        // spin the wheels
        for (const w of (car.userData.wheels || [])) w.rotation.x += p.speed * dt * 2;
        G.audio.setEngineSpeed(Math.abs(p.speed) / maxMs);
        chaseCam(G, p.pos, p.heading, 9, 3.4, 10);
      } else {
        const fwd = axis(G.keys, 'KeyS', 'KeyW');
        const strafe = axis(G.keys, 'KeyA', 'KeyD');
        const run = G.keys.has('ShiftLeft') || G.keys.has('ShiftRight');
        const sp = run ? 8 : 5;
        const mx = Math.cos(p.camYaw), mz = Math.sin(p.camYaw);
        p.pos.x += (mx * fwd - mz * strafe) * sp * dt;
        p.pos.z += (mz * fwd + mx * strafe) * sp * dt;
        p.pos.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, p.pos.x));
        p.pos.z = Math.max(WORLD.minZ, Math.min(WORLD.maxZ, p.pos.z));
        if (fwd !== 0 || strafe !== 0) p.heading = Math.atan2(mz * fwd + mx * strafe, mx * fwd - mz * strafe);
        p.mesh.position.set(p.pos.x, 0, p.pos.z);
        p.mesh.rotation.y = -p.heading + Math.PI / 2;
        // walk bob
        p.mesh.position.y = (fwd !== 0 || strafe !== 0) ? Math.abs(Math.sin(frames * 0.25)) * 0.06 : 0;
        orbitCam(G, { x: p.pos.x, z: p.pos.z, y: 0 }, p.camYaw, p.camPitch, 7);
      }

      // traffic AI: straight loops, wrap at the ends
      for (const t of G.traffic) {
        if (!t.mesh.visible) continue;
        t.x += Math.cos(t.heading) * t.speed * dt;
        t.z += Math.sin(t.heading) * t.speed * dt;
        if (t.boulevard) {
          if (t.x > 370) t.x = -50;
          if (t.x < -50) t.x = 370;
        } else if (t.z > 320 || t.z < -10) {
          t.heading = -t.heading;
        }
        t.mesh.position.set(t.x, 0, t.z);
        for (const w of (t.mesh.userData.wheels || [])) w.rotation.x += t.speed * dt * 2;
      }

      // pedestrians: stroll the sidewalks, flee gunfire
      for (const pd of G.peds) {
        if (!pd.mesh.visible) continue;
        const dx = pd.x - p.pos.x, dz = pd.z - p.pos.z;
        const d = Math.hypot(dx, dz);
        if (G.timeSec - G.gunfireAt < 2 && d < 25) pd.fleeing = true;
        if (pd.fleeing) {
          pd.heading = Math.atan2(dz, dx);
          pd.x += Math.cos(pd.heading) * 3.2 * dt;
          pd.z += Math.sin(pd.heading) * 3.2 * dt;
          if (d > 45) pd.fleeing = false;
        } else {
          pd.x += Math.cos(pd.heading) * pd.speed * dt;
          pd.z += Math.sin(pd.heading) * pd.speed * dt;
          if (pd.x > 360 || pd.x < -40) pd.heading += Math.PI;
        }
        pd.mesh.position.set(pd.x, Math.abs(Math.sin(frames * 0.12 + pd.x)) * 0.03, pd.z);
        pd.mesh.rotation.y = -pd.heading + Math.PI / 2;
      }

      // police chase + ram
      let nearestPolice = 1e9;
      for (const c of G.police) {
        if (!c.active) continue;
        const dx = p.pos.x - c.x, dz = p.pos.z - c.z;
        const d = Math.hypot(dx, dz);
        nearestPolice = Math.min(nearestPolice, d);
        const want = Math.atan2(dz, dx);
        let dh = want - c.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        c.heading += Math.max(-1.8 * dt, Math.min(1.8 * dt, dh));
        const cs = Math.min(30, 16 + s.wanted * 2.4);
        c.x += Math.cos(c.heading) * cs * dt;
        c.z += Math.sin(c.heading) * cs * dt;
        c.mesh.position.set(c.x, 0, c.z);
        c.mesh.rotation.y = -c.heading + Math.PI / 2;
        for (const w of (c.mesh.userData.wheels || [])) w.rotation.x += cs * dt * 2;
        if (d < 3.2) {
          // ram: shove the player and hurt them
          p.pos.x += (dx / d) * 2.2;
          p.pos.z += (dz / d) * 2.2;
          if (!p.inCar) s.health = Math.max(0, s.health - 12 * dt * 10);
          else p.speed *= 0.94;
        }
        // busted: on foot, slow, cop on top of you
        if (!p.inCar && d < 2.5 && Math.abs(p.speed) < 1) {
          G.bustedTimer += dt;
          if (G.bustedTimer > 3) { G.bustedTimer = 0; G.busted(); }
        } else {
          G.bustedTimer = 0;
        }
      }

      // helicopter circles overhead at 3+ stars
      if (G.heli.active) {
        G.heli.angle += dt * 0.35;
        const hx = p.pos.x + Math.cos(G.heli.angle) * 18;
        const hz = p.pos.z + Math.sin(G.heli.angle) * 18;
        G.heli.mesh.position.set(hx, 26, hz);
        G.heli.mesh.rotation.y = -G.heli.angle;
        G.heli.mesh.userData.rotor.rotation.y += dt * 14;
        G.heli.mesh.userData.tailRotor.rotation.z += dt * 20;
        G.heli.mesh.userData.beam.visible = true;
        G.lights.heroLight.position.set(p.pos.x, 3, p.pos.z);
      }

      // wanted decays when hidden
      if (s.wanted > 0 && nearestPolice > 45) {
        G.hiddenTimer += dt;
        if (G.hiddenTimer > 8) {
          G.hiddenTimer = 0;
          G.setWanted(s.wanted - 1);
          G.log('Heat cooling off \u2014 lay low');
        }
      } else {
        G.hiddenTimer = 0;
      }

      // mission 15 guards
      if (s.mission === 15) spawnGuards();

      G.missions.update(dt);
      G.race.update(dt);

      // tracers fade
      for (let i = G.tracers.length - 1; i >= 0; i--) {
        const t = G.tracers[i];
        t.life -= dt;
        t.line.material.opacity = Math.max(0, t.life / 0.15);
        if (t.life <= 0) { G.scene.remove(t.line); G.tracers.splice(i, 1); }
      }

      // wasted
      if (s.health <= 0) G.wasted();

      // hero fill light follows the player
      G.lights.heroLight.position.set(p.pos.x, 3, p.pos.z);
      updateHUD(G);
    } else {
      // title / paused: slow orbit around the hero car, HUD still live
      const t = frames * 0.002;
      G.camera.position.set(90 + Math.cos(t) * 14, 5, WORLD.boulevardZ + Math.sin(t) * 14);
      G.camera.lookAt(90, 1.5, WORLD.boulevardZ);
      updateHUD(G);
    }

    G.renderer.render(G.scene, G.camera);
  }

  // --- boot ----------------------------------------------------------------------
  applyPreset(G, 'day');
  G.audio.ensure = G.audio.ensure.bind(G.audio);
  if (SHOT >= 1 && SHOT <= 4) {
    G.phase = 'playing';
    applyPreset(G, SHOT === 2 ? 'sunset' : SHOT === 4 ? 'dawn' : 'night');
    stageShot(G, SHOT);
  } else {
    const hadSave = G.load();
    document.getElementById('continueBtn').style.display = hadSave ? 'block' : 'none';
    document.getElementById('continueBtn')?.addEventListener('click', () => {
      G.startGame();
    });
    setDialogue(G, 'TIO REYES', '#2e86ab', 'Mara. The Comet is at the marina. First keys, then the whole city is ours.');
    G.log('LUMEN BAY \u2014 Puerto Lumen. Press M to start the story.');
  }
  animate();

  // --- debug / probe API ------------------------------------------------------------
  G.ready = true;
  window.__gameAPI = {
    state: () => G.state,
    start: () => G.startGame(),
    pause: () => G.pause(),
    resume: () => G.resume(),
    startMission: (id) => G.startMission(id),
    completeMission: (id) => G.completeMission(id),
    completeAllMissions: () => G.completeAllMissions(),
    enterCar: () => G.enterCar(),
    exitCar: () => G.exitCar(),
    setWanted: (n) => G.setWanted(n),
    setWeapon: (w) => G.setWeapon(w),
    burnNos: () => G.burnNos(),
    buyEngine: () => G.buyEngine(),
    save: () => G.save(),
    load: () => G.load(),
    shoot: () => G.tryShoot(),
    snapshot: () => ({
      cash: G.state.cash, kills: G.state.kills, turf: G.turf.count(),
      garageOwned: G.garage.owned, engine: G.garage.engine,
      wanted: G.state.wanted, inCar: G.player.inCar,
      policeActive: G.police.filter((c) => c.active).length,
      heliVisible: G.heli.mesh.visible,
      nos: G.state.nos, health: G.state.health,
      done: Object.keys(G.state.done).length,
      frames: G.renderFrames,
    }),
  };
  return G;
}

boot();
