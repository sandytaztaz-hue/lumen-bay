// Rendering: the three.js scene, golden-hour sky and sun, chase camera,
// mission beacon, tracers and muzzle flashes. No shadow maps (SwiftShader
// friendly) — fake blob shadows live on the meshes themselves.
import * as THREE from 'three';
import { PALETTE } from './config.js';
import { clamp, lerp } from './random.js';

export function initRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xff9d5e, 180, 620);
  // gradient sky dome: violet zenith → orange horizon
  const skyGeo = new THREE.SphereGeometry(900, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(PALETTE.skyMid) },
      low: { value: new THREE.Color(PALETTE.skyLow) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low;
      void main(){ float h = normalize(vP).y; vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.9, h)) : mix(low, mid, smoothstep(-0.05, 0.25, h)); gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  // low golden sun disc, west over the ocean
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
  );
  sun.position.set(-620, 95, 60); sun.lookAt(0, 95, 60); scene.add(sun);
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(70, 32),
    new THREE.MeshBasicMaterial({ color: 0xff8c2e, transparent: true, opacity: 0.35, fog: false }),
  );
  sunGlow.position.set(-622, 95, 60); sunGlow.lookAt(0, 95, 60); scene.add(sunGlow);
  // warm sunset key light + cool ambient fill
  const dir = new THREE.DirectionalLight(0xffb36b, 2.4);
  dir.position.set(-180, 120, 60); scene.add(dir);
  scene.add(new THREE.HemisphereLight(0x8a6bbf, 0x3a2a1e, 0.9));
  // drifting clouds: flat white ellipsoids
  const cloudMat = new THREE.MeshLambertMaterial({ color: '#ffd9c9', transparent: true, opacity: 0.85 });
  const clouds = [];
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cloudMat);
    c.scale.set(26 + (i % 4) * 8, 4, 12 + (i % 3) * 5);
    c.position.set(-400 + i * 75, 120 + (i % 3) * 18, -320 + (i * 53) % 640);
    scene.add(c); clouds.push(c);
  }
  return { scene, clouds };
}

/** Chase camera: follows behind the player or car, mouse drag orbits. */
export function makeCamera() {
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1500);
  return {
    camera, yaw: 0, pitch: 0.32, dist: 10, smooth: new THREE.Vector3(0, 4, -12),
  };
}

export function updateCamera(cam, target, inCar, dt) {
  const wantDist = inCar ? 10.5 : 7;
  const wantHeight = inCar ? 3.4 : 2.8;
  cam.dist = lerp(cam.dist, wantDist, dt * 3);
  const yaw = target.heading + Math.PI + cam.yaw;
  const cx = target.x + Math.sin(yaw) * cam.dist * Math.cos(cam.pitch);
  const cz = target.z + Math.cos(yaw) * cam.dist * Math.cos(cam.pitch);
  const cy = wantHeight + Math.sin(cam.pitch) * cam.dist * 0.6;
  cam.smooth.x = lerp(cam.smooth.x, cx, 1 - Math.exp(-dt * 7));
  cam.smooth.y = lerp(cam.smooth.y, cy, 1 - Math.exp(-dt * 7));
  cam.smooth.z = lerp(cam.smooth.z, cz, 1 - Math.exp(-dt * 7));
  cam.camera.position.copy(cam.smooth);
  cam.camera.lookAt(target.x, inCar ? 1.6 : 1.5, target.z);
}

/** Mission beacon: a golden light pillar + spinning diamond at the marker. */
export function makeBeacon(scene) {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.6, 60, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 30; group.add(beam);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.6),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  diamond.position.y = 7; group.add(diamond);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 3.0, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; group.add(ring);
  group.visible = false;
  scene.add(group);
  return { group, diamond, ring };
}

export function updateBeacon(beacon, marker, t) {
  if (!marker) { beacon.group.visible = false; return; }
  beacon.group.visible = true;
  beacon.group.position.set(marker.x, 0, marker.z);
  beacon.diamond.position.y = 7 + Math.sin(t * 2.2) * 0.8;
  beacon.diamond.rotation.y = t * 1.5;
  const s = 1 + Math.sin(t * 3) * 0.12;
  beacon.ring.scale.set(s, s, 1);
}

/** Tracer pool: short-lived glowing lines for gunfire. */
export function makeTracers(scene) {
  const pool = [];
  const mat = new THREE.LineBasicMaterial({ color: 0xffe9a3, transparent: true });
  for (let i = 0; i < 12; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(geo, mat.clone());
    line.visible = false; scene.add(line);
    pool.push({ line, life: 0 });
  }
  return pool;
}

export function fireTracer(pool, from, to) {
  const t = pool.find((p) => p.life <= 0) || pool[0];
  t.line.geometry.setFromPoints([from, to]);
  t.line.visible = true;
  t.line.material.opacity = 1;
  t.life = 0.09;
}

export function stepTracers(pool, dt) {
  for (const t of pool) {
    if (t.life > 0) {
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.09);
      if (t.life <= 0) t.line.visible = false;
    }
  }
}

/** Muzzle flash: a quick point light + sprite at the gun. */
export function makeMuzzle(scene) {
  const light = new THREE.PointLight(0xffc46b, 0, 18);
  scene.add(light);
  const sprite = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0 }),
  );
  scene.add(sprite);
  return { light, sprite, life: 0 };
}

export function flashMuzzle(muzzle, pos) {
  muzzle.light.position.copy(pos);
  muzzle.light.intensity = 60;
  muzzle.sprite.position.copy(pos);
  muzzle.sprite.material.opacity = 1;
  muzzle.sprite.scale.setScalar(1.6);
  muzzle.life = 0.06;
}

export function stepMuzzle(muzzle, dt) {
  if (muzzle.life > 0) {
    muzzle.life -= dt;
    if (muzzle.life <= 0) {
      muzzle.light.intensity = 0;
      muzzle.sprite.material.opacity = 0;
    }
  }
}

/** Resize the renderer + camera when the window changes size. */
export function onResize(renderer, cam) {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  cam.camera.aspect = w / h;
  cam.camera.updateProjectionMatrix();
}
