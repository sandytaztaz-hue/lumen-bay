// Rendering for LUMEN BAY: the WebGL renderer, the chase/orbit camera, the
// sun-lens flare sprite, muzzle-flash light, tracer lines and floating damage
// numbers. The camera is the game's feel: on foot it orbits Mara at shoulder
// height; in a car it pulls back into a chase cam that lags behind turns and
// widens with speed. The mouse drags the orbit; the camera never clips below
// the ground plane.

import * as THREE from '../vendor/three/three.module.min.js';
import { clamp, lerp } from './random.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  return { renderer, scene, camera };
}

// Floating damage numbers and the kill feed live as sprites in the scene so
// they sit in the world, not on the HUD. Each entry rises and fades.
export function createEffects(scene) {
  const tracers = [];
  const numbers = [];
  const flash = new THREE.PointLight(0xffc36b, 0, 26, 1.6);
  scene.add(flash);

  function tracer(from, to, colour) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y, from.z),
      new THREE.Vector3(to.x, to.y, to.z),
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.95 }));
    scene.add(line);
    tracers.push({ line, life: 0.09 });
  }

  function damageNumber(pos, text, colour) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const g = c.getContext('2d');
    g.font = 'bold 34px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeStyle = 'rgba(0,0,0,0.9)'; g.lineWidth = 6;
    g.strokeText(text, 64, 32);
    g.fillStyle = colour; g.fillText(text, 64, 32);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(3.2, 1.6, 1);
    spr.position.set(pos.x, pos.y + 1.6, pos.z);
    scene.add(spr);
    numbers.push({ spr, life: 0.9 });
  }

  function muzzleFlash(pos) {
    flash.position.set(pos.x, pos.y, pos.z);
    flash.intensity = 60;
  }

  function update(dt) {
    flash.intensity = Math.max(0, flash.intensity - dt * 700);
    for (let i = tracers.length - 1; i >= 0; i -= 1) {
      tracers[i].life -= dt;
      if (tracers[i].life <= 0) {
        scene.remove(tracers[i].line);
        tracers[i].line.geometry.dispose();
        tracers[i].line.material.dispose();
        tracers.splice(i, 1);
      }
    }
    for (let i = numbers.length - 1; i >= 0; i -= 1) {
      const n = numbers[i];
      n.life -= dt;
      n.spr.position.y += dt * 2.4;
      n.spr.material.opacity = Math.max(0, n.life / 0.9);
      if (n.life <= 0) {
        scene.remove(n.spr);
        n.spr.material.map.dispose();
        n.spr.material.dispose();
        numbers.splice(i, 1);
      }
    }
  }

  return { tracer, damageNumber, muzzleFlash, update };
}

// The camera rig. `mode` is 'foot' or 'car'. Orbit yaw/pitch come from the
// mouse; the rig smooths toward its target so fast turns feel weighted.
export function createCameraRig(camera) {
  let yaw = Math.PI;
  let pitch = 0.32;
  let dist = 9;
  let smoothPos = new THREE.Vector3(0, 8, -14);
  let smoothLook = new THREE.Vector3(0, 2, 0);

  function addOrbit(dx, dy) {
    yaw -= dx * 0.0042;
    pitch = clamp(pitch + dy * 0.0032, -0.08, 1.05);
  }

  function update(target, mode, speed, dt) {
    const wantDist = mode === 'car' ? 10 + Math.min(4, Math.abs(speed) * 0.09) : 8.5;
    dist = lerp(dist, wantDist, Math.min(1, 3 * dt));
    const h = mode === 'car' ? 3.9 : 3.4;
    const lookH = mode === 'car' ? 2.2 : 1.8;
    const cx = target.x - Math.sin(yaw) * Math.cos(pitch) * dist;
    const cz = target.z - Math.cos(yaw) * Math.cos(pitch) * dist;
    const cy = Math.max(1.6, target.y + h + Math.sin(pitch) * dist * 0.7);
    const k = Math.min(1, (mode === 'car' ? 5.5 : 8) * dt);
    smoothPos.x = lerp(smoothPos.x, cx, k);
    smoothPos.y = lerp(smoothPos.y, cy, k);
    smoothPos.z = lerp(smoothPos.z, cz, k);
    smoothLook.x = lerp(smoothLook.x, target.x, Math.min(1, 10 * dt));
    smoothLook.y = lerp(smoothLook.y, target.y + lookH, Math.min(1, 10 * dt));
    smoothLook.z = lerp(smoothLook.z, target.z, Math.min(1, 10 * dt));
    camera.position.copy(smoothPos);
    camera.lookAt(smoothLook);
  }

  function snap(target, mode) {
    const wantDist = mode === 'car' ? 12 : 8.5;
    const h = mode === 'car' ? 4.6 : 3.4;
    smoothPos.set(
      target.x - Math.sin(yaw) * wantDist, target.y + h, target.z - Math.cos(yaw) * wantDist,
    );
    smoothLook.set(target.x, target.y + 2, target.z);
    camera.position.copy(smoothPos);
    camera.lookAt(smoothLook);
  }

  // The forward direction the camera is looking, on the ground plane — the
  // on-foot movement basis. WASD moves relative to this, not to the world.
  // The camera sits at target - (sin yaw, cos yaw) * dist and looks at the
  // target, so its look direction is (sin yaw, cos yaw).
  function forward() {
    return { x: Math.sin(yaw), z: Math.cos(yaw) };
  }

  return { addOrbit, update, snap, forward, get yaw() { return yaw; }, set yaw(v) { yaw = v; } };
}
