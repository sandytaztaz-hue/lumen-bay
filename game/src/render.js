// Rendering: the sunset itself. A warm gradient sky dome, a low orange sun,
// long-shadow directional light, sea haze fog, the chase camera and the
// third-person camera, plus the transient effects — tracers, muzzle flash and
// the pulsing mission beacon.
import * as THREE from 'three';
import { PALETTE } from './config.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.fog, 180, 720);

  // Sky dome: a big sphere shaded top-to-bottom from dusk blue to sunset orange.
  const skyGeo = new THREE.SphereGeometry(900, 24, 14);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(PALETTE.skyMid) },
      low: { value: new THREE.Color(PALETTE.skyLow) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low;
      void main(){ float h = normalize(vP).y; vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.8, h)) : mix(low, mid, smoothstep(-0.05, 0.25, h)); gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // The low sun: a glowing disc hanging over the western sea.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(46, 24),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
  );
  sun.position.set(-620, 118, -260);
  sun.lookAt(0, 60, 0);
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0xffb36b, 0x3a2a3a, 0.85);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xff9a4a, 2.1);
  sunLight.position.set(-320, 150, -180);
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0x6a7ab8, 0.35);
  fill.position.set(200, 120, 240);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 40, 80);
  scene.add(camera);
  return { renderer, scene, camera };
}

export function resize(renderer, camera) {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

/** Third-person camera: orbits the player on foot, chases the car when driving. */
export function updateCamera(camera, target, yaw, pitch, distance, dt, smoothing = 8) {
  const cx = target.x - Math.sin(yaw) * Math.cos(pitch) * distance;
  const cz = target.z - Math.cos(yaw) * Math.cos(pitch) * distance;
  const cy = target.y + 2.2 + Math.sin(pitch) * distance;
  const k = Math.min(1, smoothing * dt);
  camera.position.x += (cx - camera.position.x) * k;
  camera.position.y += (cy - camera.position.y) * k;
  camera.position.z += (cz - camera.position.z) * k;
  camera.lookAt(target.x, target.y + 1.6, target.z);
}

/** A hitscan tracer: a bright line from muzzle to impact that fades in 120 ms. */
export class Tracers {
  constructor(scene) {
    this.scene = scene;
    this.lines = [];
  }

  fire(from, to, color = 0xffe9a0) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
    this.scene.add(line);
    this.lines.push({ line, life: 0.12 });
  }

  update(dt) {
    for (let i = this.lines.length - 1; i >= 0; i -= 1) {
      const t = this.lines[i];
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.12);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        this.lines.splice(i, 1);
      }
    }
  }
}

/** A muzzle flash: a point light that flares for one frame at the gun. */
export class MuzzleFlash {
  constructor(scene) {
    this.light = new THREE.PointLight(0xffc36b, 0, 26, 1.6);
    scene.add(this.light);
    this.life = 0;
  }

  fire(pos) {
    this.light.position.copy(pos);
    this.light.intensity = 60;
    this.life = 0.06;
  }

  update(dt) {
    if (this.life > 0) {
      this.life -= dt;
      if (this.life <= 0) this.light.intensity = 0;
    }
  }
}

/** The mission beacon: a tall pulsing column of light over the current target. */
export function makeBeacon(scene) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.6, 90, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}

export function updateBeacon(beacon, marker, time) {
  if (!marker) { beacon.visible = false; return; }
  beacon.visible = true;
  beacon.position.set(marker.x, 45, marker.z);
  beacon.material.opacity = 0.2 + Math.sin(time * 3.2) * 0.1;
  beacon.rotation.y = time * 0.8;
}
