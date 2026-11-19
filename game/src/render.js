// LUMEN BAY r10 — the renderer: three.js scene, PER-SHOT lighting
// (r10: golden hour / night / vault interior / dawn — one preset per
// screenshot, applied by shots.js before the first frame), close low chase
// camera, muzzle flashes, tracers, damage numbers, mission beacon. r9 adds
// optional per-shot camera overrides (dist/height) so a variant can pull the
// chase camera tighter or lower for a bigger, pinker hero read without
// touching the normal camera. The sky is a real gradient dome (deep blue
// zenith → pale horizon) with a HIGH white sun disc + light glare ahead-east,
// so the chase cam (looking east down Playa Drive) catches a bright airy sky.
// A PMREM environment map baked from that sky makes the hero car's clearcoat
// paint pick up real daylight reflections, and a cool sky-blue rim light
// gives the bright edge glow. Short crisp shadows, pale blue haze fog.
import * as THREE from 'three';
import { WORLD, PALETTE, DAYLIGHT, LIGHTING_PRESETS } from './config.js';
import { daySkyTexture, sunsetSkyTexture, nightSkyTexture, dawnSkyTexture, sunGlowTexture, sunStreakTexture } from './textures.js';

export function createRenderer3D(canvas, opts) {
  const o = opts || {};
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(o.lowRes ? 0.5 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = o.shadows !== false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(DAYLIGHT.fog, 400, 1100);
  // --- bright daytime sky dome: gradient texture on the inside of a big sphere.
  // r10: all four sky gradients are painted once at boot; setLighting() swaps
  // the dome's map per shot (sunset / night / dawn) or hides the dome
  // entirely for the vault interior.
  const skyTex = daySkyTexture();
  const skyTexes = { day: skyTex, sunset: sunsetSkyTexture(), night: nightSkyTexture(), dawn: dawnSkyTexture() };
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(950, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  skyDome.renderOrder = -10;
  scene.add(skyDome);
  // --- PMREM environment map baked from the same daytime sky, so metallic
  // paint (hero car, chrome, glass) reflects bright blue daylight like a
  // clear midday. The env sun ball sits HIGH, matching the disc.
  try {
    const envScene = new THREE.Scene();
    const envSky = new THREE.Mesh(
      new THREE.SphereGeometry(100, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide }),
    );
    envScene.add(envSky);
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    sunBall.position.set(55, 28, 20);
    envScene.add(sunBall);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    if ('environmentIntensity' in scene) scene.environmentIntensity = 1.0;
    pmrem.dispose();
  } catch { /* env map is a bonus: the game still renders without it */ }
  // High white midday sun ahead-east: short shadows, everything lit bright
  // and even. The light sits higher than the visible disc (elevation ~36°)
  // so shadows stay short even though the disc itself rides at ~20° in the
  // frame's upper sky. Position is relative to the world origin (target
  // 0,0,0); keep it on the same line as the sun disc.
  const sun = new THREE.DirectionalLight(DAYLIGHT.sunColour, DAYLIGHT.sunIntensity);
  sun.position.set(320, 260, 170);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 800;
  scene.add(sun);
  // Cool sky-blue rim light from the opposite side, so car edges pick up a
  // bright daylight edge — strong, because the chase camera looks at the
  // car's shadow side.
  const rim = new THREE.DirectionalLight(DAYLIGHT.rimColour, 0.9);
  rim.position.set(-160, 200, -120);
  scene.add(rim);
  // Rear fill from behind the camera: the hero car's tail must read RED,
  // not black, in the chase view. White daylight fill, not warm dusk.
  const rearFill = new THREE.DirectionalLight(0xffffff, 0.9);
  rearFill.position.set(-220, 70, 200);
  scene.add(rearFill);
  const hemi = new THREE.HemisphereLight(0x9fd4ff, 0x5da244, 1.25);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xeaf4ff, 0.5);
  fill.position.set(-120, 80, 140);
  scene.add(fill);
  // Sun disc HIGH in the sky ahead-east + a light additive glow sprite, so
  // the chase cam (looking east down Playa Drive) catches a bright white
  // midday sun high above the rooftops. Big on purpose: the disc must read
  // as a poster sun, not a speck — but high and white, never a low orange disc.
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(30, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  sunDisc.position.set(DAYLIGHT.sunPos[0], DAYLIGHT.sunPos[1], DAYLIGHT.sunPos[2]);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTexture(), transparent: true, opacity: 0.5, fog: false, depthWrite: false,
  }));
  glow.position.set(DAYLIGHT.sunPos[0], DAYLIGHT.sunPos[1], DAYLIGHT.sunPos[2]);
  glow.scale.set(220, 220, 1);
  scene.add(glow);
  // r8c daylight glare: two thin horizontal streak planes across the disc
  // (the top-3 poster sun), kept LIGHT in daylight — a soft white glare,
  // not the heavy orange dusk streak.
  const streakTex = sunStreakTexture();
  const streaks = [];
  for (const [w, h, op] of [[300, 10, 0.35], [200, 5, 0.28]]) {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: streakTex, transparent: true, opacity: op, fog: false,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
    streak.position.set(DAYLIGHT.sunPos[0], DAYLIGHT.sunPos[1], DAYLIGHT.sunPos[2]);
    streak.lookAt(0, 0, 0);
    scene.add(streak);
    streaks.push(streak);
  }
  const camera = new THREE.PerspectiveCamera(72, 1280 / 720, 0.1, 1400);
  scene.add(camera);
  // Debug probe (like window.__game): sun disc + glow + camera for CDP checks.
  window.__r8sun = { disc: sunDisc, glow, camera, streaks };
  // ---- r10: per-shot lighting -------------------------------------------
  // setLighting('sunset'|'night'|'interior'|'dawn'|'day') re-tints the whole
  // scene from LIGHTING_PRESETS (config.js): sky dome texture (or hidden),
  // sun disc position/colour/size, halo + streaks, the shadow sun, rim/rear/
  // hemi/fill lights, fog (the weather), background, exposure and env-map
  // strength. Called once by shots.js before the first frame; plain play
  // never calls it and stays on the day default above. The disc + streaks
  // are re-aimed at the origin after every move so the disc face stays
  // toward the city (a disc left facing its old direction reads edge-on).
  function setLighting(name) {
    const p = LIGHTING_PRESETS[name] || LIGHTING_PRESETS.day;
    if (p.sky) {
      skyDome.visible = true;
      skyDome.material.map = skyTexes[p.sky] || skyTex;
      skyDome.material.needsUpdate = true;
    } else {
      skyDome.visible = false;
    }
    const [dx, dy, dz] = p.sunPos;
    sunDisc.visible = p.sunDisc[2];
    sunDisc.position.set(dx, dy, dz);
    sunDisc.material.color.setHex(p.sunDisc[0]);
    sunDisc.scale.set(p.sunDisc[1], p.sunDisc[1], 1);
    sunDisc.lookAt(0, 0, 0);
    glow.visible = p.glow[1] > 0;
    glow.position.set(dx, dy, dz);
    glow.material.color.setHex(p.glow[0]);
    glow.material.opacity = p.glow[1];
    glow.scale.set(p.glow[2], p.glow[2], 1);
    for (const s of streaks) {
      s.visible = p.streakOpacity > 0;
      s.position.set(dx, dy, dz);
      s.material.opacity = p.streakOpacity;
      s.lookAt(0, 0, 0);
    }
    sun.color.setHex(p.sunLight[0]);
    sun.intensity = p.sunLight[1];
    sun.position.set(p.sunLight[2], p.sunLight[3], p.sunLight[4]);
    rim.color.setHex(p.rim[0]);
    rim.intensity = p.rim[1];
    rearFill.intensity = p.rearFill;
    hemi.color.setHex(p.hemi[0]);
    hemi.groundColor.setHex(p.hemi[1]);
    hemi.intensity = p.hemi[2];
    fill.intensity = p.fill;
    scene.fog.color.setHex(p.fog[0]);
    scene.fog.near = p.fog[1];
    scene.fog.far = p.fog[2];
    scene.background.setHex(p.bg);
    renderer.toneMappingExposure = p.exposure;
    if ('environmentIntensity' in scene) scene.environmentIntensity = p.envIntensity;
    return p.clock;
  }
  return { renderer, scene, camera, sun, skyDome, setLighting };
}
export function resizeRenderer(r, w, h) {
  r.renderer.setSize(w, h, false);
  r.camera.aspect = w / h;
  r.camera.updateProjectionMatrix();
}
/** Chase camera: CLOSE and LOW so the hero car is poster-big — r8b dist 9.5
 / height 3.2 (r8: 10.5 / 3.4, hero only ~12% of frame; dist 7.0 made the
 chase cruisers loom over the lens). The hero mesh is 1.35x poster-scaled,
 so the two together land it near ~30% of frame width like the HALCYON
 reference. NOS kick is small now (76, not 82) so the burn doesn't shrink
 the hero back down. */
export function updateCamera(camera, px, pz, heading, camYaw, camPitch, inCar, speed, nosBurning, dt, shotCam) {
  // r9: a staged shot may override distance / height (null fields = normal).
  const dist = shotCam && shotCam.dist != null ? shotCam.dist : (inCar ? 9.5 : 8);
  const height = shotCam && shotCam.height != null ? shotCam.height : (inCar ? 3.2 : 3.0);
  const yaw = camYaw;
  const tx = px - Math.sin(yaw) * dist;
  const tz = pz - Math.cos(yaw) * dist;
  const ty = height + camPitch * 4;
  camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 8);
  camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 8);
  camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 8);
  camera.lookAt(px + Math.sin(heading) * 1.0, 1.6, pz + Math.cos(heading) * 1.0);
  const targetFov = nosBurning ? 76 : 72;
  if (Math.abs(camera.fov - targetFov) > 0.2) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
    camera.updateProjectionMatrix();
  }
}
/** A glowing beacon pillar at the current objective, visible across the city. */
export function makeBeacon(scene) {
  const geo = new THREE.CylinderGeometry(2.2, 2.2, 60, 12, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd23f, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 30; mesh.visible = false;
  scene.add(mesh);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.4, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3; ring.visible = false;
  scene.add(ring);
  return { mesh, ring };
}
export function setBeacon(beacon, pos) {
  if (!pos) { beacon.mesh.visible = false; beacon.ring.visible = false; return; }
  beacon.mesh.visible = true; beacon.ring.visible = true;
  beacon.mesh.position.x = pos[0]; beacon.mesh.position.z = pos[1];
  beacon.ring.position.x = pos[0]; beacon.ring.position.z = pos[1];
}
/** A tracer line from the muzzle to the hit point, fading in 80 ms. */
export function spawnTracer(scene, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(from[0], from[1], from[2]),
    new THREE.Vector3(to[0], to[1], to[2]),
  ]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.95 }));
  scene.add(line);
  setTimeout(() => { scene.remove(line); geo.dispose(); }, 90);
  return line;
}
/** A muzzle flash: a small bright sprite at the gun, gone in 60 ms. */
export function spawnMuzzle(scene, pos) {
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
  flash.position.set(pos[0], pos[1], pos[2]);
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 60);
}
// ---- floating damage numbers (DOM, projected from 3D) -----------------------
/** A damage number that floats up and fades over the hit point. */
export function spawnDamageNumber(layer, camera, x, y, z, text, colour) {
  if (!layer) return;
  const v = new THREE.Vector3(x, y, z).project(camera);
  if (v.z > 1) return;
  const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
  const div = document.createElement('div');
  div.className = 'dmg';
  div.textContent = text;
  div.style.left = `${sx}px`;
  div.style.top = `${sy}px`;
  div.style.color = colour || '#ffd23f';
  layer.appendChild(div);
  setTimeout(() => div.remove(), 900);
}
