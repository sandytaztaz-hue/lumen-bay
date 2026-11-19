// LUMEN BAY r8 — the renderer: three.js scene, GOLDEN HOUR 18:48 lighting,
// close low chase camera, muzzle flashes, tracers, damage numbers, mission
// beacon. The sky is a real gradient dome (orange horizon → pink → purple
// zenith) with a low sun disc + glow sprite ahead-east, so the chase camera
// looks straight into the glare. A PMREM environment map baked from that sky
// makes the hero car's clearcoat paint pick up real reflections, and a warm
// rim light gives the sunset edge glow. Long shadows, warm mauve fog.
import * as THREE from 'three';
import { WORLD, PALETTE, SUNSET } from './config.js';
import { sunsetSkyTexture, sunGlowTexture } from './textures.js';

export function createRenderer3D(canvas, opts) {
  const o = opts || {};
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(o.lowRes ? 0.5 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = o.shadows !== false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a1540);
  scene.fog = new THREE.Fog(SUNSET.fog, 350, 850);
  // --- golden-hour sky dome: gradient texture on the inside of a big sphere.
  const skyTex = sunsetSkyTexture();
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(950, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  skyDome.renderOrder = -10;
  scene.add(skyDome);
  // --- PMREM environment map baked from the same sunset sky, so metallic
  // paint (hero car, chrome, glass) reflects orange/pink like real dusk.
  try {
    const envScene = new THREE.Scene();
    const envSky = new THREE.Mesh(
      new THREE.SphereGeometry(100, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide }),
    );
    envScene.add(envSky);
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    sunBall.position.set(60, 14, 26);
    envScene.add(sunBall);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    if ('environmentIntensity' in scene) scene.environmentIntensity = 0.9;
    pmrem.dispose();
  } catch { /* env map is a bonus: the game still renders without it */ }
  // Low warm sun ahead-east, on the road axis: long shadows back toward the
  // camera, everything rimmed orange. Position is relative to the world
  // origin (target 0,0,0); keep it on the same line as the sun disc.
  const sun = new THREE.DirectionalLight(SUNSET.sunColour, SUNSET.sunIntensity);
  sun.position.set(320, 75, 170);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 800;
  scene.add(sun);
  // Warm rim light from the opposite side, so car edges glow pink-orange —
  // strong, because the chase camera looks at the car's shadow side.
  const rim = new THREE.DirectionalLight(SUNSET.rimColour, 1.4);
  rim.position.set(-160, 40, -120);
  scene.add(rim);
  // Rear fill from behind the camera: the hero car's tail must read RED,
  // not black, in the chase view.
  const rearFill = new THREE.DirectionalLight(0xffc8a0, 0.8);
  rearFill.position.set(-220, 70, 200);
  scene.add(rearFill);
  const hemi = new THREE.HemisphereLight(0xff9a6b, 0x4a2a3a, 1.1);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xffb8c8, 0.4);
  fill.position.set(-120, 80, 140);
  scene.add(fill);
  // Sun disc LOW on the horizon ahead-east + a big additive glow sprite, so
  // the chase cam (looking east down Playa Drive) catches the glare. Big on
  // purpose: the disc must read as a poster sun, not a speck.
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }));
  sunDisc.position.set(SUNSET.sunPos[0], SUNSET.sunPos[1], SUNSET.sunPos[2]);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTexture(), transparent: true, opacity: 0.85, fog: false, depthWrite: false,
  }));
  glow.position.set(SUNSET.sunPos[0], SUNSET.sunPos[1], SUNSET.sunPos[2]);
  glow.scale.set(300, 300, 1);
  scene.add(glow);
  const camera = new THREE.PerspectiveCamera(72, 1280 / 720, 0.1, 1400);
  scene.add(camera);
  // Debug probe (like window.__game): sun disc + glow + camera for CDP checks.
  window.__r8sun = { disc: sunDisc, glow, camera };
  return { renderer, scene, camera, sun, skyDome };
}
export function resizeRenderer(r, w, h) {
  r.renderer.setSize(w, h, false);
  r.camera.aspect = w / h;
  r.camera.updateProjectionMatrix();
}
/** Chase camera: CLOSE and LOW so the hero car is poster-big — but far
 enough back (dist ~9.5) that the police cruisers chasing right behind it
 stay IN FRAME ahead of the camera (r8 lesson: at dist 6.5 the whole chase
 was behind the lens and invisible). FOV 72, NOS kick to 82. */
export function updateCamera(camera, px, pz, heading, camYaw, camPitch, inCar, speed, nosBurning, dt) {
  const dist = inCar ? 10.5 : 8;
  const height = inCar ? 3.4 : 3.0;
  const yaw = camYaw;
  const tx = px - Math.sin(yaw) * dist;
  const tz = pz - Math.cos(yaw) * dist;
  const ty = height + camPitch * 4;
  camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 8);
  camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 8);
  camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 8);
  camera.lookAt(px + Math.sin(heading) * 4, 1.6, pz + Math.cos(heading) * 4);
  const targetFov = nosBurning ? 82 : 72;
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
