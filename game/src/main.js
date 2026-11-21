// LUMEN BAY — the game. Third-person open world: Mara on foot and in
// the Comet RS, traffic and pedestrians on the boulevard, LCPD cruisers
// and the AIR-1 helicopter at 3+ stars, 15 story jobs, combat, garage,
// races, turf, a save slot and a dense HUD with a live minimap.
// ?shot=1..4 stages a fixed screenshot scene and settles it, then raises
// window.__lumen.shotReady for the shot driver.

import * as THREE from '../vendor/three/three.module.min.js';
import { WORLD, MISSIONS, CAR_DEFS, TRAFFIC_COLOURS, WEAPONS, RADIO, SAVE_KEY, START_CASH } from './config.js';
import { makeRng, range, pick } from './random.js';
import { toTexture, glowTexture, flashTexture } from './textures.js';
import { buildCity } from './city.js';
import { makeComet, makeSedan, makeHelicopter, makeBoat, makeBike } from './vehicles.js';
import { makeMara, makeOfficer, makePerson, poseAim, makeFlash, makeDownedCop, createPedSystem } from './people.js';
import { MissionManager } from './missions.js';
import { GameAudio } from './audio.js';
import { HUD } from './hud.js';
import { createRenderer, applyPreset } from './render.js';
import { Input } from './input.js';
import { stageShot } from './shots.js';
import { Garage } from './garage.js';
import { Race } from './race.js';
import { Turf } from './turf.js';

const FORWARD = (h) => ({ x: Math.sin(h), z: Math.cos(h) });

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = createRenderer(canvas);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(80, 6, 200);
    this.lightRig = { sun: null, hemi: null, amb: null, sky: null };
    this.clock = new THREE.Clock();
    this.time = 0;
    this.frames = 0;
    this.errors = [];
    this.screen = 'title';
    this.paused = false;
    this.seed = 7;

    // Player state.
    this.player = {
      x: WORLD.heroSpawn.x, z: WORLD.heroSpawn.z, heading: WORLD.heroSpawn.heading,
      speed: 0, speedKmh: 0, inCar: false, car: null,
      health: 100, healthMax: 100, armour: 0, armourMax: 100,
      nos: 100, nosMax: 100, weapon: 'pistol', ammo: { smg: 30 },
      camYaw: 0, camPitch: 0.32,
    };
    this.cash = START_CASH;
    this.rep = 0;
    this.kills = 0;
    this.wanted = 0;
    this.wantedQuietT = 0;
    this.clockMinutes = 18 * 60 + 40;
    this.nosBurning = false;
    this.flashMara = false;
    this.shotMode = false;
    this.freezePeds = false;
    this.settleFrames = 0;
    this.shotReady = false;
    this.storyDone = false;
    this.bustedT = 0;
    this.hudTick = 0;
    this.streetName = null;
    this.preset = 'night';

    this.hud = new HUD();
    this.audio = new GameAudio();
    this.input = new Input(canvas);
    this.garage = new Garage(this);
    this.race = new Race(this);
    this.turf = new Turf(this);
    this.missions = new MissionManager(this);
    this.rng = makeRng(this.seed);

    this.glowTex = toTexture(THREE, glowTexture(), 1, 1);
    this.flashTex = toTexture(THREE, flashTexture(), 1, 1);
    this.fx = []; // transient effects: tracers, cash, damage numbers

    this.buildWorld();
    this.buildActors();
    this.loadSave();
    this.wireTitle();
    this.exposeDebug();
    this.applyHudStatic();
  }

  buildWorld() {
    const city = buildCity(THREE, this.seed);
    this.scene.add(city.group);
    this.city = city;
    this.colliders = city.colliders;
    applyPreset(this.scene, this.renderer, this.camera, 'night', this.lightRig);
    // Heli spotlight pool on the ground (positioned by placeHeli).
    this.beamPool = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.beamPool.rotation.x = -Math.PI / 2;
    this.beamPool.position.set(90, 0.14, 215);
    this.beamPool.visible = false;
    this.scene.add(this.beamPool);
    this.heliLight = new THREE.SpotLight(0xfff2b0, 0, 60, 0.5, 0.5, 1.2);
    this.scene.add(this.heliLight);
    this.scene.add(this.heliLight.target);
  }

  buildActors() {
    // Hero car.
    this.heroCar = makeComet(THREE, this.glowTex);
    this.heroCar.position.set(WORLD.heroSpawn.x, 0, WORLD.heroSpawn.z);
    this.heroCar.rotation.y = WORLD.heroSpawn.heading;
    this.scene.add(this.heroCar);
    this.player.car = this.heroCar;

    // Mara on foot.
    this.mara = makeMara(THREE);
    this.mara.position.set(WORLD.heroSpawn.x + 3, 0, WORLD.heroSpawn.z + 2);
    this.mara.rotation.y = WORLD.heroSpawn.heading;
    this.scene.add(this.mara);
    this.maraFlash = makeFlash(THREE, this.flashTex);
    this.scene.add(this.maraFlash);

    // Helicopter (hidden until wanted >= 3 or a shot places it).
    this.heli = { mesh: makeHelicopter(THREE, this.glowTex), visible: false, angle: 0 };
    this.heli.mesh.visible = false;
    this.scene.add(this.heli.mesh);

    // Boat (hidden until shot 4 or the finale).
    this.boat = { mesh: makeBoat(THREE), visible: false };
    this.boat.mesh.visible = false;
    this.boat.mesh.position.set(60, 0.1, 252);
    this.scene.add(this.boat.mesh);

    // Peds + traffic + police pools.
    this.peds = createPedSystem(THREE, this.scene);
    this.spawnInitialPeds();
    this.traffic = [];
    this.spawnInitialTraffic();
    this.police = { cruisers: [], bikes: [] };
    this.officers = [];
    this.enemies = [];
    this.downed = null;
    this.parked = [];
    this.allies = [];
  }

  spawnInitialPeds() {
    this.peds.spawnPedsNear(40, 206, 4);
    this.peds.spawnPedsNear(100, 206, 4);
    this.peds.spawnPedsNear(160, 206, 4);
    this.peds.spawnPedsNear(220, 206, 4);
    this.peds.spawnPedsNear(60, 225, 4);
    this.peds.spawnPedsNear(140, 225, 4);
    this.peds.spawnPedsNear(200, 228, 4);
  }

  spawnInitialTraffic() {
    for (let i = 0; i < 12; i += 1) {
      const kind = this.rng() < 0.14 ? 'taxi' : (this.rng() < 0.12 ? 'van' : 'sedan');
      const car = makeSedan(THREE, this.glowTex, kind, pick(this.rng, TRAFFIC_COLOURS));
      const onBoulevard = i < 8;
      const x = onBoulevard ? range(this.rng, -40, 300) : pick(this.rng, [40, 120, 175, 225, 275]);
      const z = onBoulevard ? WORLD.roadZ + (this.rng() < 0.5 ? -3.5 : 3.5) : range(this.rng, 130, 280);
      car.position.set(x, 0, z);
      const heading = onBoulevard ? (z < WORLD.roadZ ? Math.PI / 2 : -Math.PI / 2) : (this.rng() < 0.5 ? 0 : Math.PI);
      car.rotation.y = heading;
      this.scene.add(car);
      this.traffic.push({ mesh: car, route: onBoulevard ? 'blvd' : 'cross', speed: range(this.rng, 8, 14), heading });
    }
  }

  // ---- placement helpers used by shots.js and the probe ----
  setPreset(name) {
    applyPreset(this.scene, this.renderer, this.camera, name, this.lightRig);
    this.preset = name;
  }

  moveSun(x, y, z) {
    const sky = this.scene.getObjectByName('sky');
    if (!sky) return;
    for (const child of sky.children) {
      if (child.name === 'sun') child.position.set(x, y, z);
      else if (child.geometry && child.geometry.type === 'CircleGeometry') {
        child.position.set(x * 0.995, y * 0.995, z * 0.995);
      }
    }
  }

  placeHero(x, z, heading, inCar) {
    this.heroCar.position.set(x, 0, z);
    this.heroCar.rotation.y = heading;
    this.player.x = x; this.player.z = z; this.player.heading = heading;
    this.player.inCar = inCar;
    this.player.speed = 0; this.player.speedKmh = inCar ? this.player.speedKmh : 0;
    this.mara.visible = !inCar;
    if (!inCar) {
      this.mara.position.set(x + 3, 0, z + 2);
      this.mara.rotation.y = heading;
    }
  }

  placeMara(x, z, heading) {
    this.player.x = x; this.player.z = z; this.player.heading = heading;
    this.player.inCar = false;
    this.player.speed = 0; this.player.speedKmh = 0;
    this.mara.visible = true;
    this.mara.position.set(x, 0, z);
    this.mara.rotation.y = heading;
    poseAim(THREE, this.mara);
  }

  setShotCamera(pos, look) {
    this.camMode = 'shot';
    this.camera.position.set(pos.x, pos.y, pos.z);
    this.camera.lookAt(look.x, look.y, look.z);
  }

  spawnCruiser(x, z, heading) {
    const car = makeSedan(THREE, this.glowTex, 'police');
    car.position.set(x, 0, z);
    car.rotation.y = heading;
    this.scene.add(car);
    const cruiser = { mesh: car, speed: 0, heading };
    this.police.cruisers.push(cruiser);
    return cruiser;
  }

  clearPolice() {
    for (const c of this.police.cruisers) this.scene.remove(c.mesh);
    for (const b of this.police.bikes) this.scene.remove(b.mesh);
    this.police.cruisers = [];
    this.police.bikes = [];
    this.setHeliVisible(false);
  }

  spawnBike(x, z, heading) {
    const bike = makeBike(THREE);
    bike.position.set(x, 0, z);
    bike.rotation.y = heading;
    this.scene.add(bike);
    this.police.bikes.push({ mesh: bike, heading });
    return bike;
  }

  placeHeli(x, y, z, tx, tz) {
    this.heli.mesh.visible = true;
    this.heli.visible = true;
    this.heli.mesh.position.set(x, y, z);
    this.heli.target = { x: tx, z: tz };
    this.beamPool.visible = true;
    this.beamPool.position.set(tx, 0.14, tz);
    this.heliLight.intensity = 25;
    this.heliLight.position.set(x, y - 1, z);
    this.heliLight.target.position.set(tx, 0, tz);
    this.audio.siren(true);
  }

  setHeliVisible(on) {
    this.heli.mesh.visible = on;
    this.heli.visible = on;
    this.beamPool.visible = on;
    this.heliLight.intensity = on ? 25 : 0;
    if (!on) this.audio.siren(false);
  }

  spawnOfficer(x, z, heading, aiming = false) {
    const officer = makeOfficer(THREE);
    officer.position.set(x, 0, z);
    officer.rotation.y = heading;
    this.scene.add(officer);
    let flash = null;
    if (aiming) {
      poseAim(THREE, officer, 0.9);
      flash = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.flashTex, color: 0xffd76a, transparent: true, opacity: 0.9, depthWrite: false }));
      flash.scale.set(1.6, 1.6, 1);
      flash.position.set(0, 1.35, 1.1);
      officer.add(flash);
    }
    const enemy = { mesh: officer, health: 100, flash, isOfficer: true };
    this.officers.push(enemy);
    this.enemies.push(enemy);
    return enemy;
  }

  clearOfficers() {
    for (const e of this.officers) this.scene.remove(e.mesh);
    this.officers = [];
    this.enemies = this.enemies.filter((e) => !e.isOfficer);
    if (this.downed) { this.scene.remove(this.downed); this.downed = null; }
  }

  placeDownedCop(x, z, rotY) {
    if (this.downed) this.scene.remove(this.downed);
    this.downed = makeDownedCop(THREE);
    this.downed.position.set(x, 0, z);
    this.downed.rotation.y = rotY;
    this.scene.add(this.downed);
    return this.downed;
  }

  placeParkedCar(type, x, z, heading) {
    const car = type === 'comet' ? makeComet(THREE, this.glowTex)
      : makeSedan(THREE, this.glowTex, type, pick(this.rng, TRAFFIC_COLOURS));
    car.position.set(x, 0, z);
    car.rotation.y = heading;
    this.scene.add(car);
    this.parked.push(car);
    return car;
  }

  placeBoat(x, z, heading, scale) {
    this.boat.mesh.visible = true;
    this.boat.visible = true;
    this.boat.mesh.position.set(x, 0.1, z);
    this.boat.mesh.rotation.y = heading;
    this.boat.mesh.scale.setScalar(scale);
    return this.boat.mesh;
  }

  placeAlly(x, z, shirt) {
    const ally = makePerson(THREE, { shirt, pants: 0x2a2d33, skin: 0xd9a06b, name: 'ally', kind: 'ally' });
    ally.position.set(x, 0, z);
    ally.rotation.y = Math.PI;
    this.scene.add(ally);
    this.allies.push(ally);
    return ally;
  }

  spawnCashBurst(x, z, count) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.6 });
    for (let i = 0; i < count; i += 1) {
      const bill = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.28), mat);
      bill.position.set(x + range(this.rng, -4, 4), range(this.rng, 1, 3.5), z + range(this.rng, -3, 3));
      bill.rotation.set(range(this.rng, 0, 3), range(this.rng, 0, 3), range(this.rng, 0, 3));
      this.scene.add(bill);
      this.fx.push({ mesh: bill, ttl: 9999, kind: 'cash', spin: range(this.rng, 0.5, 2) });
    }
  }

  spawnCashPile(x, z) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.7 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xffd21a, metalness: 0.9, roughness: 0.25 });
    for (let i = 0; i < 8; i += 1) {
      const m = i % 3 === 0 ? gold : mat;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), m);
      bar.position.set(x + range(this.rng, -1, 1), 0.1 + (i % 3) * 0.16, z + range(this.rng, -1, 1));
      bar.rotation.y = range(this.rng, 0, 3);
      this.scene.add(bar);
      this.fx.push({ mesh: bar, ttl: 9999, kind: 'pile' });
    }
  }

  spawnPedsNear(x, z, n, opts) { return this.peds.spawnPedsNear(x, z, n, opts); }
  clearPedsNear(x, z, r) { this.peds.clearPedsNear(x, z, r); }
  clearRoadPeds() { this.peds.clearRoadPeds(); }

  spawnTrafficNear(cx, cz, n) {
    for (let i = 0; i < n; i += 1) {
      const kind = this.rng() < 0.2 ? 'taxi' : 'sedan';
      const car = makeSedan(THREE, this.glowTex, kind, pick(this.rng, TRAFFIC_COLOURS));
      const x = cx + 40 + i * 14 + range(this.rng, -3, 3);
      const z = WORLD.roadZ + (i % 2 === 0 ? -3.5 : 3.5);
      car.position.set(x, 0, z);
      car.rotation.y = z < WORLD.roadZ ? Math.PI / 2 : -Math.PI / 2;
      this.scene.add(car);
      this.traffic.push({ mesh: car, route: 'blvd', speed: 0, heading: car.rotation.y });
    }
  }

  clearTrafficNear(cx, cz, radius) {
    for (let i = this.traffic.length - 1; i >= 0; i -= 1) {
      const t = this.traffic[i];
      if (Math.hypot(t.mesh.position.x - cx, t.mesh.position.z - cz) < radius) {
        this.scene.remove(t.mesh);
        this.traffic.splice(i, 1);
      }
    }
  }

  setStreetLabel(name) {
    this.streetName = name;
    this.hud.setStreet(name);
  }

  log(line) { this.hud.log(line); }

  // ---- wanted / police ----
  setWanted(n) {
    const prev = this.wanted;
    this.wanted = Math.max(0, Math.min(5, n));
    this.hud.setWanted(this.wanted);
    const wantCruisers = this.wanted === 0 ? 0 : Math.min(8, 2 + this.wanted);
    while (this.police.cruisers.length < wantCruisers) {
      const a = range(this.rng, 0, Math.PI * 2);
      this.spawnCruiser(
        this.player.x + Math.cos(a) * 45, this.player.z + Math.sin(a) * 45, 0);
    }
    while (this.police.cruisers.length > wantCruisers) {
      const c = this.police.cruisers.pop();
      this.scene.remove(c.mesh);
    }
    this.setHeliVisible(this.wanted >= 3);
    if (this.wanted > prev) {
      this.hud.toast('WANTED LEVEL UP', this.wanted + ' stars — the whole LCPD is on you', 'bad');
      this.audio.siren(this.wanted > 0);
    }
    if (this.wanted === 0) this.audio.siren(false);
  }

  // ---- missions ----
  startMission(id) {
    const ok = this.missions.start(id);
    if (!ok) return false;
    const m = MISSIONS[id - 1];
    if (m.kind === 'shoot' && m.kills) {
      for (let i = 0; i < m.kills; i += 1) {
        this.spawnOfficer(
          m.target.x + range(this.rng, -8, 8), m.target.z + range(this.rng, -6, 6),
          range(this.rng, 0, Math.PI * 2), false);
      }
    }
    return true;
  }

  storyComplete() {
    this.storyDone = true;
    this.hud.banner('STORY COMPLETE', 'El puerto es nuestro — Puerto Lumen is yours');
    this.placeBoat(60, 252, Math.PI / 2 - 0.35, 3.4);
    this.save();
  }

  // ---- save ----
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        mission: this.missions.index, cash: this.cash, rep: this.rep,
        turf: this.turf.owned, kills: this.kills,
        x: this.player.x, z: this.player.z,
        garage: [...this.garage.bought], owned: this.garage.owned,
        storyDone: this.storyDone,
      }));
    } catch { /* storage unavailable — play on */ }
  }

  loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      this.missions.index = s.mission || 0;
      this.cash = s.cash ?? START_CASH;
      this.rep = s.rep || 0;
      this.kills = s.kills || 0;
      this.storyDone = !!s.storyDone;
      if (s.garage) for (const id of s.garage) this.garage.bought.add(id);
      this.garage.owned = !!s.owned;
      for (let i = 0; i < (s.turf || 0); i += 1) {
        const spot = this.turf.spots.find((t) => t.owner === 'tiburon');
        if (spot) { spot.owner = 'mara'; this.turf.owned += 1; }
      }
      return true;
    } catch {
      return false;
    }
  }

  // ---- screens ----
  wireTitle() {
    const start = document.getElementById('start-btn');
    const cont = document.getElementById('continue-btn');
    const resume = document.getElementById('resume-btn');
    if (start) start.addEventListener('click', () => this.startGame(false));
    if (cont) cont.addEventListener('click', () => this.startGame(true));
    if (resume) resume.addEventListener('click', () => this.resumeGame());
    const hasSave = (() => {
      try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
    })();
    if (cont) cont.style.display = hasSave ? 'block' : 'none';
  }

  startGame(continueSave) {
    this.audio.unlock();
    this.audio.radio(true);
    this.screen = 'play';
    this.hud.showTitle(false);
    if (!continueSave) {
      this.missions.index = 0;
      this.startMission(1);
    } else {
      const next = this.missions.current;
      if (next) this.hud.setMission(next, 0);
    }
    this.hud.dialogue('TIO REYES', 'Mara. The Comet is at the marina. Take it, and the city is ours.', '#2e6f8e');
    this.log('LUMEN BAY — Puerto Lumen, 18:40. Press M to start the story.');
  }

  pauseGame() {
    if (this.screen !== 'play') return false;
    this.paused = true;
    this.screen = 'paused';
    this.hud.showPause(true);
    return true;
  }

  resumeGame() {
    if (this.screen !== 'paused') return false;
    this.paused = false;
    this.screen = 'play';
    this.hud.showPause(false);
    return true;
  }

  applyHudStatic() {
    this.hud.setCash(this.cash);
    this.hud.setRep(this.rep);
    this.hud.setWanted(0);
    this.hud.setWeapon('pistol');
    this.hud.setBars(100, 100, 0, 100, 100, 100);
    this.hud.setTurf(0);
    this.hud.setSpeed(0, 0, 'ON FOOT', true);
    this.hud.setClock('18:40');
    const m = this.missions.current;
    if (m) this.hud.setMission(m, 0);
    this.hud.setPolice([], 0);
  }

  // ---- combat ----
  shoot() {
    if (this.player.inCar) return;
    const w = WEAPONS.find((x) => x.id === this.player.weapon);
    if (!w || w.id === 'fists') return;
    if (w.id === 'smg') {
      if (this.player.ammo.smg <= 0) return;
      this.player.ammo.smg -= 1;
    }
    this.audio.gunshot();
    // Muzzle flash at Mara's pistol.
    const f = FORWARD(this.player.heading);
    const mx = this.player.x + f.x * 1.2, mz = this.player.z + f.z * 1.2;
    this.maraFlash.position.set(mx, 1.35, mz);
    this.maraFlash.visible = true;
    this.maraFlash.userData.t = 0.09;
    // Hitscan: raycast from the camera through the screen centre.
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    ray.far = w.range;
    const hits = ray.intersectObjects(this.enemies.map((e) => e.mesh), true);
    if (hits.length > 0) {
      let target = null;
      let obj = hits[0].object;
      while (obj && !target) {
        target = this.enemies.find((e) => e.mesh === obj);
        obj = obj.parent;
      }
      if (target) {
        target.health -= w.damage;
        this.spawnDamageNumber(target.mesh.position, '-' + w.damage, '#ffd21a');
        this.addTracer(new THREE.Vector3(mx, 1.35, mz), hits[0].point);
        if (target.health <= 0) this.killEnemy(target);
        return;
      }
    }
    const end = new THREE.Vector3(mx, 1.35, mz).add(
      new THREE.Vector3(f.x, 0, f.z).multiplyScalar(30));
    this.addTracer(new THREE.Vector3(mx, 1.35, mz), end);
  }

  killEnemy(enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx >= 0) this.enemies.splice(idx, 1);
    const oi = this.officers.indexOf(enemy);
    if (oi >= 0) this.officers.splice(oi, 1);
    this.scene.remove(enemy.mesh);
    this.missions.onKill();
    this.hud.log('Mara downed a police officer');
    this.audio.cash();
  }

  addTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    this.scene.add(line);
    this.fx.push({ mesh: line, ttl: 0.09, kind: 'tracer' });
  }

  spawnDamageNumber(worldPos, text, colour) {
    const fx = document.getElementById('fx');
    if (!fx) return;
    const v = new THREE.Vector3(worldPos.x, worldPos.y + 2, worldPos.z).project(this.camera);
    if (v.z > 1) return;
    const d = document.createElement('div');
    d.className = 'dmg';
    d.textContent = text;
    d.style.color = colour;
    d.style.left = ((v.x + 1) / 2 * window.innerWidth) + 'px';
    d.style.top = ((-v.y + 1) / 2 * window.innerHeight) + 'px';
    fx.appendChild(d);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 900);
  }

  // ---- per-frame update ----
  update(dt) {
    this.time += dt;
    const p = this.player;
    const pressed = this.input.takePressed();
    const mouse = this.input.takeMouseDelta();

    if (this.screen === 'play' && !this.paused) {
      // Edge-triggered actions.
      for (const code of pressed) {
        if (code === 'KeyE') this.interact();
        if (code === 'KeyM') {
          if (this.hud.mapVisible) this.hud.hideMap();
          else this.hud.showMap(this);
        }
        if (code === 'KeyP' || code === 'Escape') this.pauseGame();
        if (code === 'Digit1') this.setWeapon('fists');
        if (code === 'Digit2') this.setWeapon('pistol');
        if (code === 'Digit3') this.setWeapon('smg');
        if (code === 'MouseClick') this.shoot();
      }
      // Camera orbit (mouse drag).
      p.camYaw -= mouse.x * 0.004;
      p.camPitch = Math.max(0.05, Math.min(1.1, p.camPitch + mouse.y * 0.003));

      if (p.inCar) this.updateDriving(dt);
      else this.updateWalking(dt);

      // NOS.
      if (this.nosBurning || (this.input.down('ShiftLeft', 'ShiftRight') && p.inCar && p.nos > 0)) {
        if (p.nos > 0 && p.speed > 1) {
          p.nos = Math.max(0, p.nos - dt * 22);
          p.speed = Math.min(p.speed * 1.0 + 14 * dt, (p.car.userData.def.topSpeed + 16));
        }
      } else if (!this.shotMode) {
        p.nos = Math.min(p.nosMax, p.nos + dt * 2);
      }
      p.speedKmh = Math.abs(p.speed) * 3.6;

      // Missions / race / turf / clock / wanted — frozen in shot mode so
      // the staged frame cannot drift while the renderer settles.
      if (!this.shotMode) {
        this.missions.update(dt);
        if (this.race.active) this.race.update(p);
        this.turf.update(dt, p);
        this.clockMinutes += dt / 3;
        if (this.clockMinutes >= 1440) this.clockMinutes -= 1440;
      }

      // Wanted decay: quiet for 8 seconds with no cruiser near.
      if (this.wanted > 0 && !this.shotMode) {
        const near = this.police.cruisers.some((c) =>
          Math.hypot(c.mesh.position.x - p.x, c.mesh.position.z - p.z) < 25);
        if (!near) {
          this.wantedQuietT += dt;
          if (this.wantedQuietT > 8) {
            this.wantedQuietT = 0;
            this.setWanted(this.wanted - 1);
          }
        } else this.wantedQuietT = 0;
      }
      // Busted: on foot, wanted, and a cruiser on top of Mara.
      if (!p.inCar && this.wanted > 0 && !this.shotMode) {
        const touching = this.police.cruisers.some((c) =>
          Math.hypot(c.mesh.position.x - p.x, c.mesh.position.z - p.z) < 2.5);
        if (touching) {
          this.bustedT += dt;
          if (this.bustedT > 3) {
            this.bustedT = 0;
            this.screen = 'over';
            this.hud.banner('BUSTED', 'The LCPD took you in — the story restarts at the safehouse.');
            this.hud.showTitle(true);
          }
        } else this.bustedT = 0;
      }
    } else if (this.screen === 'title') {
      for (const code of pressed) {
        if (code === 'Enter' || code === 'Space') this.startGame(false);
      }
    } else if (this.screen === 'paused') {
      for (const code of pressed) {
        if (code === 'KeyP' || code === 'Escape') this.resumeGame();
      }
    }

    // World life: traffic, peds, police, heli, effects — frozen in shot
    // mode except the cosmetic bits (rotor, bob, flashes, clouds).
    this.updateTraffic(dt);
    this.peds.update(dt, this.time, this.freezePeds || this.shotMode,
      this.shotMode ? null : (this.player.weapon !== 'fists' && this.maraFlash.visible ? { x: p.x, z: p.z } : null));
    this.updatePolice(dt);
    this.updateHeli(dt);
    this.updateFx(dt);

    // Rotor + lightbar blink + beam shimmer.
    if (this.heli.mesh) {
      const u = this.heli.mesh.userData;
      if (u.rotor) u.rotor.rotation.y += dt * 18;
      if (u.tailRotor) u.tailRotor.rotation.x += dt * 30;
    }
    for (const c of this.police.cruisers) {
      const u = c.mesh.userData;
      if (u.barRed && u.barBlue) {
        const phase = Math.floor(this.time * 3) % 2 === 0;
        u.barRed.material.emissiveIntensity = phase ? 3.5 : 0.4;
        u.barBlue.material.emissiveIntensity = phase ? 0.4 : 3.5;
      }
    }

    // Mara's flash stays ON in shot mode (a frozen moment needs the
    // flash in the frame); officer flashes alternate by index.
    if (this.shotMode && this.flashMara) {
      this.maraFlash.position.set(
        this.player.x + Math.sin(this.player.heading) * 1.3, 1.35,
        this.player.z + Math.cos(this.player.heading) * 1.3);
      this.maraFlash.visible = true;
    }
    if (this.shotMode) {
      this.officers.forEach((e, i) => {
        if (e.flash) e.flash.visible = ((this.frames + i) % 2) === 0;
      });
    }

    // HUD refresh (throttled to 4 Hz in play; every settle frame in shots;
    // unthrottled for the first 10 frames so the minimap is painted
    // before any boot check can sample it).
    this.hudTick += dt;
    if (this.shotMode || this.hudTick > 0.25 || this.frames < 10) {
      this.hudTick = 0;
      this.refreshHud();
    }
    this.updateCamera(dt);
  }

  updateDriving(dt) {
    const p = this.player;
    const def = p.car.userData.def;
    const fwd = this.input.down('KeyW', 'ArrowUp') ? 1 : this.input.down('KeyS', 'ArrowDown') ? -1 : 0;
    const steer = (this.input.down('KeyA', 'ArrowLeft') ? 1 : 0) - (this.input.down('KeyD', 'ArrowRight') ? 1 : 0);
    if (fwd !== 0) {
      p.speed += fwd * def.accel * dt;
      if (fwd < 0) p.speed = Math.max(p.speed, -12);
    } else {
      p.speed *= Math.max(0, 1 - dt * 0.8);
    }
    if (this.input.down('Space')) p.speed *= Math.max(0, 1 - dt * 3.2);
    p.speed = Math.max(-14, Math.min(def.topSpeed, p.speed));
    const turn = steer * def.grip * dt * Math.min(1, Math.abs(p.speed) / 8) * Math.sign(p.speed || 1);
    p.heading += turn;
    const f = FORWARD(p.heading);
    let nx = p.x + f.x * p.speed * dt;
    let nz = p.z + f.z * p.speed * dt;
    [nx, nz] = this.collide(nx, nz, 1.4);
    nx = Math.max(WORLD.minX, Math.min(WORLD.maxX, nx));
    nz = Math.max(WORLD.minZ, Math.min(WORLD.maxZ, nz));
    p.x = nx; p.z = nz;
    p.car.position.set(p.x, 0, p.z);
    p.car.rotation.y = p.heading;
    // Wheel spin + NOS flames.
    for (const w of p.car.userData.wheels) w.rotation.x += p.speed * dt * 1.6;
    this.audio.engineStart();
    this.audio.engine(Math.abs(p.speed) / def.topSpeed);
    // Hero point light in the dark (kept small for SwiftShader).
    this.mara.position.set(p.x, 0, p.z);
    this.mara.rotation.y = p.heading;
  }

  updateWalking(dt) {
    const p = this.player;
    let mx = 0, mz = 0;
    if (this.input.down('KeyW', 'ArrowUp')) mz -= 1;
    if (this.input.down('KeyS', 'ArrowDown')) mz += 1;
    if (this.input.down('KeyA', 'ArrowLeft')) mx -= 1;
    if (this.input.down('KeyD', 'ArrowRight')) mx += 1;
    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz);
      const yaw = p.camYaw;
      const dx = (mx * Math.cos(yaw) - mz * Math.sin(yaw)) / len;
      const dz = (mx * Math.sin(yaw) + mz * Math.cos(yaw)) / len;
      const speed = this.input.down('ShiftLeft', 'ShiftRight') ? 8 : 5;
      let nx = p.x + dx * speed * dt;
      let nz = p.z + dz * speed * dt;
      [nx, nz] = this.collide(nx, nz, 0.6);
      p.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, nx));
      p.z = Math.max(WORLD.minZ, Math.min(WORLD.maxZ, nz));
      p.heading = Math.atan2(dx, dz);
      p.speed = speed;
      p.speedKmh = speed * 3.6;
    } else {
      p.speed = 0;
      p.speedKmh = 0;
    }
    this.mara.position.set(p.x, 0, p.z);
    this.mara.rotation.y = p.heading;
    // Walk-cycle legs on Mara herself.
    const u = this.mara.userData;
    if (p.speed > 0) {
      u.phase = (u.phase || 0) + dt * 9;
      const s = Math.sin(u.phase) * 0.5;
      u.legL.rotation.x = s;
      u.legR.rotation.x = -s;
      u.armL.rotation.x = -s * 0.6;
      u.armR.rotation.x = s * 0.6;
    } else {
      u.legL.rotation.x *= 0.8;
      u.legR.rotation.x *= 0.8;
    }
  }

  collide(x, z, radius) {
    for (const c of this.colliders) {
      if (x > c.minX - radius && x < c.maxX + radius && z > c.minZ - radius && z < c.maxZ + radius) {
        const dxl = x - (c.minX - radius), dxr = (c.maxX + radius) - x;
        const dzl = z - (c.minZ - radius), dzr = (c.maxZ + radius) - z;
        const m = Math.min(dxl, dxr, dzl, dzr);
        if (m === dxl) x = c.minX - radius;
        else if (m === dxr) x = c.maxX + radius;
        else if (m === dzl) z = c.minZ - radius;
        else z = c.maxZ + radius;
      }
    }
    return [x, z];
  }

  interact() {
    const p = this.player;
    if (p.inCar) {
      // Exit the car.
      p.inCar = false;
      this.mara.visible = true;
      const f = FORWARD(p.heading);
      p.x += -f.z * 2.2;
      p.z += f.x * 2.2;
      this.mara.position.set(p.x, 0, p.z);
      this.mara.rotation.y = p.heading;
      p.speed = 0;
      p.speedKmh = 0;
      this.audio.engineStop();
      this.log('Mara is on foot.');
      return;
    }
    // Enter the nearest car within 4.5 m (hero first, then traffic).
    const candidates = [this.heroCar, ...this.parked, ...this.traffic.map((t) => t.mesh)];
    let best = null, bestD = 4.5;
    for (const car of candidates) {
      const d = Math.hypot(car.position.x - p.x, car.position.z - p.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    if (best) {
      p.inCar = true;
      p.car = best;
      p.x = best.position.x;
      p.z = best.position.z;
      p.heading = best.rotation.y;
      this.mara.visible = false;
      const name = best.userData.def ? best.userData.def.name : (best.name || 'car');
      this.hud.toast('VEHICLE STOLEN: ' + String(name).toUpperCase(), 'E to exit · Shift for NOS.', 'job');
      this.log('Vehicle stolen: ' + name);
      this.audio.engineStart();
      if (this.wanted === 0) this.setWanted(1);
    }
  }

  setWeapon(id) {
    this.player.weapon = id;
    this.hud.setWeapon(id);
  }

  updateTraffic(dt) {
    if (this.shotMode) return;
    for (const t of this.traffic) {
      if (t.speed === 0) continue; // staged traffic stays put
      const f = FORWARD(t.heading);
      let nx = t.mesh.position.x + f.x * t.speed * dt;
      let nz = t.mesh.position.z + f.z * t.speed * dt;
      if (t.route === 'blvd') {
        if (nx > 310 || nx < -50) { t.heading += Math.PI; nx = t.mesh.position.x; nz = t.mesh.position.z; }
      } else if (nz > 290 || nz < 120) {
        t.heading += Math.PI; nx = t.mesh.position.x; nz = t.mesh.position.z;
      }
      t.mesh.position.set(nx, 0, nz);
      t.mesh.rotation.y = t.heading;
      for (const w of t.mesh.userData.wheels) w.rotation.x += t.speed * dt * 1.6;
    }
  }

  updatePolice(dt) {
    if (this.shotMode) return;
    const p = this.player;
    for (const c of this.police.cruisers) {
      const dx = p.x - c.mesh.position.x, dz = p.z - c.mesh.position.z;
      const d = Math.hypot(dx, dz) || 1;
      if (this.wanted > 0 && d > 4) {
        const targetHeading = Math.atan2(dx, dz);
        let dh = targetHeading - c.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        c.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
        c.speed = Math.min(30, c.speed + 12 * dt);
      } else {
        c.speed = Math.max(0, c.speed - 20 * dt);
      }
      const f = FORWARD(c.heading);
      let nx = c.mesh.position.x + f.x * c.speed * dt;
      let nz = c.mesh.position.z + f.z * c.speed * dt;
      [nx, nz] = this.collide(nx, nz, 1.4);
      c.mesh.position.set(nx, 0, nz);
      c.mesh.rotation.y = c.heading;
      for (const w of c.mesh.userData.wheels) w.rotation.x += c.speed * dt * 1.6;
      // Ram: nudge the player's car and chip its condition.
      if (p.inCar && d < 3.2) {
        p.x += (dx / d) * 1.2 * dt * 8;
        p.z += (dz / d) * 1.2 * dt * 8;
        p.car.position.set(p.x, 0, p.z);
      }
    }
  }

  updateHeli(dt) {
    if (!this.heli.visible) return;
    const p = this.player;
    this.heli.angle += dt * 0.35;
    if (!this.shotMode) {
      const hx = p.x + Math.cos(this.heli.angle) * 16;
      const hz = p.z + Math.sin(this.heli.angle) * 16;
      this.heli.mesh.position.set(hx, 15, hz);
      this.beamPool.position.set(p.x, 0.14, p.z);
      this.heliLight.position.set(hx, 14, hz);
      this.heliLight.target.position.set(p.x, 0, p.z);
    }
    this.heli.mesh.rotation.y = this.heli.angle + Math.PI / 2;
  }

  updateFx(dt) {
    for (let i = this.fx.length - 1; i >= 0; i -= 1) {
      const e = this.fx[i];
      if (e.kind === 'cash') {
        e.mesh.rotation.y += dt * e.spin;
        e.mesh.position.y += Math.sin(this.time * 2 + e.spin * 5) * dt * 0.4;
        continue;
      }
      e.ttl -= dt;
      if (e.ttl <= 0) {
        this.scene.remove(e.mesh);
        if (e.mesh.material) e.mesh.material.dispose?.();
        if (e.mesh.geometry) e.mesh.geometry.dispose?.();
        this.fx.splice(i, 1);
      }
    }
    if (this.maraFlash.visible && !this.shotMode) {
      this.maraFlash.userData.t -= dt;
      if (this.maraFlash.userData.t <= 0) this.maraFlash.visible = false;
    }
  }

  refreshHud() {
    const p = this.player;
    if (this.shotMode) {
      this.hud.drawMinimap(this);
      return;
    }
    this.hud.setCash(this.cash);
    this.hud.setRep(this.rep);
    this.hud.setWanted(this.wanted);
    this.hud.setWeapon(p.weapon);
    this.hud.setBars(p.health, p.healthMax, p.armour, p.armourMax, p.nos, p.nosMax);
    const hh = String(Math.floor(this.clockMinutes / 60)).padStart(2, '0');
    const mm = String(Math.floor(this.clockMinutes % 60)).padStart(2, '0');
    this.hud.setClock(hh + ':' + mm);
    this.hud.setTurf(this.turf.owned);
    this.hud.setSpeed(p.speedKmh, Math.min(5, 1 + Math.floor(Math.abs(p.speed) / 12)), p.inCar ? (p.car.userData.def?.name || 'VELOZ COMET RS') : 'ON FOOT', !p.inCar);
    this.hud.setCondition(100);
    if (!this.streetName) {
      let best = 'DUNES — Torre Boulevard', bd = 1e9;
      for (const s of [{ name: 'DUNES — Torre Boulevard', x: 90, z: 215 }, { name: 'DUNES — Festival Avenue', x: 60, z: 220 }, { name: 'PLAYA DORADA — Ocean Boulevard', x: -20, z: 244 }, { name: 'MARINA — Marina Road', x: 30, z: 140 }, { name: 'OLD TOWN — Mercado Street', x: 150, z: 185 }]) {
        const d = Math.hypot(p.x - s.x, p.z - s.z);
        if (d < bd) { bd = d; best = s.name; }
      }
      this.hud.setStreet(best);
    }
    // Police panel: live distances.
    if (this.wanted > 0) {
      const units = this.police.cruisers.slice(0, 4).map((c, i) => ({
        name: ['PELICAN-11', 'GECKO-25', 'BARRACUDA-18', 'TAC-45'][i % 4],
        dist: Math.round(Math.hypot(c.mesh.position.x - p.x, c.mesh.position.z - p.z)),
        status: i < 2 ? 'CHASING' : 'FLANKING',
      }));
      if (this.heli.visible) units.push({ name: 'AIR-1', dist: 17, status: 'SPOTLIGHT' });
      this.hud.setPolice(units, this.police.cruisers.length + (this.heli.visible ? 1 : 0));
    } else {
      this.hud.setPolice([], 0);
    }
    this.hud.drawMinimap(this);
  }

  updateCamera(dt) {
    if (this.camMode === 'shot') return; // fixed by the shot staging
    const p = this.player;
    if (p.inCar) {
      const f = FORWARD(p.heading);
      const dist = 9.5, height = 3.6;
      const tx = p.x - f.x * dist, tz = p.z - f.z * dist;
      const k = 1 - Math.pow(0.001, dt);
      this.camera.position.x += (tx - this.camera.position.x) * k;
      this.camera.position.y += (height - this.camera.position.y) * k;
      this.camera.position.z += (tz - this.camera.position.z) * k;
      this.camera.lookAt(p.x + f.x * 8, 1.4, p.z + f.z * 8);
    } else {
      const yaw = p.camYaw;
      const dist = 7.5;
      const cx = p.x + Math.sin(yaw) * dist;
      const cz = p.z + Math.cos(yaw) * dist;
      const cy = 2.2 + Math.sin(p.camPitch) * dist * 0.7;
      const k = 1 - Math.pow(0.001, dt);
      this.camera.position.x += (cx - this.camera.position.x) * k;
      this.camera.position.y += (cy - this.camera.position.y) * k;
      this.camera.position.z += (cz - this.camera.position.z) * k;
      this.camera.lookAt(p.x, 1.5, p.z);
    }
  }

  // ---- shot settle: step the cosmetic bits, render, raise the flag ----
  runShotSettle() {
    if (!this.shotMode) return;
    if (this.settleFrames > 0) {
      this.settleFrames -= 1;
      this.refreshHud();
      if (this.settleFrames === 0 && !this.shotReady) {
        this.shotReady = true;
        if (window.__lumen) window.__lumen.shotReady = true;
      }
    }
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta() || 0.016);
    if (!this.paused) this.update(dt);
    this.runShotSettle();
    this.renderer.render(this.scene, this.camera);
    this.frames += 1;
  }

  start() {
    const params = new URLSearchParams(window.location.search);
    const shot = Number(params.get('shot') || 0);
    if (shot >= 1 && shot <= 4) {
      this.screen = 'play';
      this.hud.showTitle(false);
      stageShot(this, shot);
      this.settleFrames = 18;
      this.hudTick = 0;
    }
    const loop = () => {
      requestAnimationFrame(loop);
      try {
        this.frame();
      } catch (err) {
        this.errors.push(String(err && err.message || err));
      }
    };
    requestAnimationFrame(loop);
  }

  exposeDebug() {
    const G = this;
    window.__lumen = {
      game: G,
      version: 'lumen-bay-r14',
      get ready() { return G.frames > 0; },
      get frames() { return G.frames; },
      get errors() { return G.errors.slice(); },
      get shotReady() { return G.shotReady; },
      set shotReady(v) { G.shotReady = v; },
      get screen() { return G.screen; },
      startGame: (cont) => G.startGame(!!cont),
      startMission: (id) => G.startMission(id),
      completeMission: (id) => G.missions.forceComplete(id),
      completeAllMissions: () => G.missions.forceCompleteAll(),
      enterCar: () => { if (!G.player.inCar) G.interact(); return G.player.inCar; },
      exitCar: () => { if (G.player.inCar) G.interact(); return !G.player.inCar; },
      setWanted: (n) => { G.setWanted(n); return G.wanted; },
      burnNos: () => {
        if (!G.player.inCar) G.interact();
        const before = G.player.nos;
        G.nosBurning = true;
        G.player.speed = 20;
        G.update(0.5);
        G.nosBurning = false;
        return { before, after: G.player.nos, speedKmh: G.player.speedKmh };
      },
      buyUpgrade: (id) => G.garage.buy(id),
      pauseGame: () => G.pauseGame(),
      resumeGame: () => G.resumeGame(),
      saveGame: () => { G.save(); return localStorage.getItem(SAVE_KEY); },
      getSave: () => { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } },
      teleport: (x, z) => { G.player.x = x; G.player.z = z; G.mara.position.set(x, 0, z); return true; },
      state: () => ({
        screen: G.screen, cash: Math.round(G.cash), rep: G.rep, kills: G.kills,
        missionsDone: G.missions.doneCount, mission: G.missions.current ? G.missions.current.id : 15,
        turf: G.turf.owned, garageOwned: G.garage.owned,
        wanted: G.wanted, cruisers: G.police.cruisers.length, heli: G.heli.visible,
        inCar: G.player.inCar, speedKmh: Math.round(G.player.speedKmh),
        nos: Math.round(G.player.nos), health: G.player.health,
        peds: G.peds.peds.length, traffic: G.traffic.length,
        topSpeed: G.player.car ? G.player.car.userData.def.topSpeed : 0,
      }),
    };
    window.addEventListener('error', (e) => {
      G.errors.push(String(e.message || e.error || 'window error'));
    });
    window.addEventListener('unhandledrejection', (e) => {
      G.errors.push('unhandled: ' + String(e.reason && e.reason.message || e.reason));
    });
  }
}
