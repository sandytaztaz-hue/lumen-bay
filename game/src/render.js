// LUMEN BAY r7 — the renderer: three.js scene, BRIGHT MIDDAY lighting, close
// low chase camera, muzzle flashes, tracers, damage numbers, mission beacon.
// The old golden-hour dusk is deleted: blue sky, white sun high overhead,
// pale-blue fog far away, exposure up, hero car big in frame.
import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';

export function createRenderer3D(canvas, opts) {
  const o = opts || {};
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(o.lowRes ? 0.5 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = o.shadows !== false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyTop);
  scene.fog = new THREE.Fog(0xbfe3ff, 400, 900);
  // High white midday sun, nearly overhead: short shadows, everything bright.
  const sun = new THREE.DirectionalLight(0xfff2b0, 3.0);
  sun.position.set(60, 220, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 700;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0x9fd4ff, 0x58a83c, 1.0);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xcfe8ff, 0.55);
  fill.position.set(-120, 60, -140);
  scene.add(fill);
  // Sun disc HIGH in the sky, small and bright white.
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(14, 32),
    new THREE.MeshBasicMaterial({ color: 0xfffbe0, fog: false }));
  sunDisc.position.set(90, 260, 60);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const camera = new THREE.PerspectiveCamera(70, 1280 / 720, 0.1, 1200);
  scene.add(camera);
  return { renderer, scene, camera, sun };
}
export function resizeRenderer(r, w, h) {
  r.renderer.setSize(w, h, false);
  r.camera.aspect = w / h;
  r.camera.updateProjectionMatrix();
}
/** Chase camera: LOW and CLOSE so the hero car dominates the lower frame. */
export function updateCamera(camera, px, pz, heading, camYaw, camPitch, inCar, speed, nosBurning, dt) {
  const dist = inCar ? 8 : 7;
  const height = inCar ? 3.0 : 3.0;
  const yaw = camYaw;
  const tx = px - Math.sin(yaw) * dist;
  const tz = pz - Math.cos(yaw) * dist;
  const ty = height + camPitch * 4;
  camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 8);
  camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 8);
  camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 8);
  camera.lookAt(px + Math.sin(heading) * 4, 1.6, pz + Math.cos(heading) * 4);
  const targetFov = nosBurning ? 80 : 70;
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
