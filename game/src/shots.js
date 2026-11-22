// LUMEN BAY — shots.js
// The four staged screenshots. Each shot pins the camera, the hero, the
// police, the helicopter, the pedestrians and the HUD to one fixed scene,
// then freezes the AI so the render is identical every time. The frozen
// staging advances 6 frames and then marks the shot ready.

import * as THREE from 'three';
import { SHOT_PINS, WORLD } from './config.js';
import { makeCruiser, makeSedan, makeBike, makeBoat } from './vehicles.js';
import { makePerson, makeOfficer, makeDownedOfficer, makeCashBurst } from './people.js';

function place(group, x, z, heading) {
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  return group;
}

function hideAll(list) {
  for (const item of list) {
    if (item.group) item.group.visible = false;
    else if (item.visible !== undefined) item.visible = false;
  }
}

export function applyShot(n, G) {
  const pin = SHOT_PINS[n];
  if (!pin) return false;
  const { scene, state, hud, render, textures, rng } = G;

  // Common staging: hide the live world, freeze the AI, pin the HUD.
  state.frozen = true;
  state.started = true;
  state.shotActive = true;
  state.shotFrames = 0;
  window.__shotReady = false;
  hideAll(G.traffic);
  hideAll(G.peds);
  hideAll(G.police);
  hideAll(G.officers);
  if (G.heli) G.heli.visible = false;
  if (G.maraMesh) G.maraMesh.visible = false;
  if (G.heroCar) G.heroCar.visible = false;
  if (G.marker) G.marker.visible = false;
  if (G.race) G.race.stop();
  if (G.staged) {
    for (const g of G.staged) scene.remove(g);
  }
  G.staged = [];
  const add = (g) => {
    scene.add(g);
    G.staged.push(g);
    return g;
  };

  // Clear umbrellas near a point (shots 2 and 4).
  function clearUmbrellasNear(cx, cz, radius) {
    for (const um of G.city.umbrellas) {
      const dx = um.position.x - cx;
      const dz = um.position.z - cz;
      um.visible = !(dx * dx + dz * dz < radius * radius);
    }
  }

  render.setPreset(pin.preset);
  render.resetShadow();
  hud.setPin(pin);
  hud.setMapOpen(false);
  // Pin the player position and job so the minimap draws the right
  // diamond and target for this shot.
  const shotPlayer = {
    1: { x: 90, z: 215, job: 11 },
    2: { x: 100, z: 229, job: 14 },
    3: { x: 70, z: 203, job: 14 },
    4: { x: -28, z: 235, job: 14 },
  }[n];
  state.player.x = shotPlayer.x;
  state.player.z = shotPlayer.z;
  state.jobIndex = shotPlayer.job;
  if (n === 3) state.mapOpen = true;
  const title = document.getElementById('titleScreen');
  if (title) title.style.display = 'none';
  const pause = document.getElementById('pauseScreen');
  if (pause) pause.style.display = 'none';

  if (n === 1) {
    // Night boulevard chase. Hero at (90, 215) facing east, camera low
    // behind and above, about 28 percent of the frame.
    const hero = G.heroCar;
    hero.visible = true;
    place(hero, 90, WORLD.boulevardZ, Math.PI / 2);
    G.nosFlames.visible = false;
    render.setFill(82, 3.5, WORLD.boulevardZ, 38);
    render.chaseCamera({ x: 90, y: 0, z: WORLD.boulevardZ }, Math.PI / 2, 7.0, 2.7, 10);
    // 8-cruiser pack in two staggered rows, facing west toward camera.
    const packRows = [
      { z: 211, xs: [132, 154, 176, 198] },
      { z: 218, xs: [143, 165, 187, 196] },
    ];
    for (const row of packRows) {
      for (const x of row.xs) add(place(makeCruiser(textures), x, row.z, -Math.PI / 2));
    }
    // Roadblock pair side by side.
    add(place(makeCruiser(textures), 208, 210.5, -Math.PI / 2));
    add(place(makeCruiser(textures), 208, 219.5, -Math.PI / 2));
    // Three oncoming traffic cars.
    add(place(makeSedan(0x8a8f96, textures), 180, 215, -Math.PI / 2));
    add(place(makeSedan(0x3a5a8a, textures), 225, 212, -Math.PI / 2));
    add(place(makeSedan(0xc9a227, textures), 245, 218, -Math.PI / 2));
    // Helicopter ahead-east, beam tilted back onto the hero.
    const heli = G.heli;
    heli.visible = true;
    heli.position.set(115, 20, 200);
    heli.rotation.y = Math.PI / 2;
    heli.userData.beamMat.opacity = 0.22;
    const beamDir = new THREE.Vector3(90 - 115, 1.7 - 20, 215 - 200);
    const beamLen = beamDir.length();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 2.4, beamLen, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff2c8, transparent: true, opacity: 0.13,
        depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      }),
    );
    beam.position.set((115 + 90) / 2, (20 + 1.7) / 2, (200 + 215) / 2);
    beam.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(115 - 90, 20 - 1.7, 200 - 215).normalize(),
    );
    add(beam);
    // Bright beam pool disc on the hero's roof.
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(1.9, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfff2c8, transparent: true, opacity: 0.4,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(90, 1.75, WORLD.boulevardZ);
    add(pool);
    // One police bike in each lane, facing east.
    add(place(makeBike(), 94, 208.5, Math.PI / 2));
    add(place(makeBike(), 96, 221.5, Math.PI / 2));
    // Exactly THREE people on the right (south) sidewalk. None on the
    // north sidewalk, none in the road.
    const pedDefs = [
      { x: 108, z: 225, shirt: 0xff5a8a },
      { x: 108, z: 228, shirt: 0x4ade80 },
      { x: 104, z: 228, shirt: 0xa55eea },
    ];
    for (const d of pedDefs) {
      add(place(makePerson({ shirt: d.shirt, trousers: 0x1c1e24 }), d.x, d.z, 0));
    }
    // Five small beachgoers on the sand far east.
    for (let i = 0; i < 5; i++) {
      const bx = 168 + i * 3;
      const bz = 230 + (i % 2) * 2;
      add(place(makePerson({ shirt: [0xffd21c, 0x4aa3ff, 0xff5a8a, 0x4ade80, 0xffffff][i], trousers: 0x1c1e24 }), bx, bz, Math.PI));
    }
  }

  if (n === 2) {
    // Beach shootout at sunset. Camera west on the beach, fov 48.
    render.camera.fov = 48;
    render.camera.updateProjectionMatrix();
    render.camera.position.set(87, 2.6, 230);
    render.camera.lookAt(118, 2.0, 219);
    clearUmbrellasNear(110, 222, 45);
    // Warm fill so the Comet's red flank and Mara read at sunset.
    render.setFill(95, 4, 220, 26);
    // Mara right of frame, aiming east, muzzle flash showing.
    const mara = G.maraMesh;
    mara.visible = true;
    place(mara, 100, 229, Math.PI / 2);
    const gun = mara.children.find((c) => c.name === 'gun');
    if (gun && gun.userData.flash) gun.userData.flash.visible = true;
    // A 12-officer cordon in two rows, aiming west at Mara.
    for (let i = 0; i < 6; i++) {
      add(place(makeOfficer(textures), 112 + i * 3, 212, -Math.PI / 2));
      add(place(makeOfficer(textures), 112 + i * 3, 224, -Math.PI / 2));
    }
    // Two cruisers flanking.
    add(place(makeCruiser(textures), 106, 206, -Math.PI / 2));
    add(place(makeCruiser(textures), 130, 230, -Math.PI / 2));
    // Cash burst of 26 green bills over the cordon.
    const cash = makeCashBurst(26, rng.fork('shot2-cash'));
    cash.position.set(116, 0, 220);
    add(cash);
    // ONE downed officer flat in the open foreground centre, head east.
    const downed = makeDownedOfficer();
    downed.rotation.y = -Math.PI / 2;
    downed.position.set(94, 0, 227);
    add(downed);
    // Helicopter overhead, beam down on the cordon.
    const heli = G.heli;
    heli.visible = true;
    heli.position.set(122, 18, 208);
    heli.rotation.y = Math.PI;
    heli.userData.beamMat.opacity = 0.16;
    // Hero Comet at the left edge as a foreground anchor.
    const hero = G.heroCar;
    hero.visible = true;
    place(hero, 100, 212, Math.PI / 2);
    G.nosFlames.visible = false;
  }

  if (n === 3) {
    // Full city map over a dimmed night street view.
    render.camera.fov = 62;
    render.camera.updateProjectionMatrix();
    render.camera.position.set(70, 4.5, 203);
    render.camera.lookAt(200, 2, 215);
    hud.setMapOpen(true);
    // A soft fill so the dimmed street view still reads.
    render.setFill(88, 4, 208, 16);
    // Two cruisers in the dimmed street view left of the map panel.
    add(place(makeCruiser(textures), 96, 211, Math.PI / 2));
    add(place(makeCruiser(textures), 104, 219, Math.PI / 2));
    const mara = G.maraMesh;
    mara.visible = true;
    place(mara, 88, 212, Math.PI / 2);
  }

  if (n === 4) {
    // Dawn boat. The speedboat scaled 3.6, BIG and centre frame.
    render.camera.fov = 62;
    render.camera.updateProjectionMatrix();
    render.camera.position.set(-28, 3.2, 228);
    render.camera.lookAt(-22, 1.5, 252);
    clearUmbrellasNear(-20, 240, 45);
    const boat = makeBoat();
    boat.scale.setScalar(3.6);
    boat.rotation.y = -Math.PI / 2 + 0.3;
    boat.position.set(-29, 0, 252);
    add(boat);
    // Hero Comet in the foreground, rear to the camera, nose to the boat.
    const hero = G.heroCar;
    hero.visible = true;
    place(hero, -28, 235, 0);
    G.nosFlames.visible = false;
    render.setFill(-28, 4, 229, 30);
    // Two allies on the sand flanking the car, facing the camera.
    const tio = makePerson({ shirt: 0x2e8b8b, trousers: 0x1c1e24, scale: 1.3 });
    place(tio, -24.5, 236, Math.PI);
    add(tio);
    const lena = makePerson({ shirt: 0xff7a1a, trousers: 0x1c1e24, scale: 1.3 });
    place(lena, -29, 236, Math.PI);
    add(lena);
    // Big low sun over the sea, upper-left of frame: re-aim the sun disc
    // and the sky glow at the shot camera.
    render.aimSunAtCamera({ x: -28, y: 3.2, z: 228 }, [62, 57, 351]);
    // Lift the sand's emissive warmth so the foreground reads bright tan.
    G.city.sandMat.emissive.setHex(0x8a5a2a);
    G.city.sandMat.emissiveIntensity = 0.85;
    // Re-centre the shadow camera on the shot area.
    render.retargetShadow(-20, 240, 130);
  }

  return true;
}
