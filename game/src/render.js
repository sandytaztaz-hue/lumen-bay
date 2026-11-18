// LUMEN BAY — rendering: WebGL renderer, golden-hour lighting, cameras,
// tracers and muzzle flash. The sun sits low in the west so the whole city
// glows orange-pink with long shadows; fog warms the horizon.
import * as THREE from 'three';
import { PALETTE } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyHorizon);
  scene.fog = new THREE.Fog(PALETTE.fog, 180, 620);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 30, 60);

  // Low western sun: warm directional light with shadows.
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.6);
  sun.position.set(-180, 90, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 700;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffb27a, 0x2e4a7a, 0.9);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffd9a0, 0.35);
  scene.add(ambient);

  // The sun disc itself, low over the ocean.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xffdf8a, fog: false }),
  );
  sunDisc.position.set(-420, 70, -260);
  sunDisc.lookAt(0, 20, 0);
  scene.add(sunDisc);

  const tracers = [];
  const muzzle = new THREE.PointLight(0xffc266, 0, 18);
  scene.add(muzzle);

  return { renderer, scene, camera, sun, tracers, muzzle };
}

export function resizeRenderer(render, width, height) {
  render.renderer.setSize(width, height);
  render.camera.aspect = width / height;
  render.camera.updateProjectionMatrix();
}

// Third-person orbit on foot; low chase camera in a car; both smooth-lerped.
export function updateCamera(render, mode, target, yaw, pitch, distance, dt) {
  const camera = render.camera;
  let desired;
  if (mode === 'car') {
    const back = distance + 4;
    desired = new THREE.Vector3(
      target.x - Math.sin(yaw) * back,
      target.y + 4.2,
      target.z - Math.cos(yaw) * back,
    );
    camera.position.lerp(desired, Math.min(1, dt * 6));
    camera.lookAt(target.x + Math.sin(yaw) * 10, target.y + 1.6, target.z + Math.cos(yaw) * 10);
  } else {
    const cx = target.x - Math.sin(yaw) * Math.cos(pitch) * distance;
    const cz = target.z - Math.cos(yaw) * Math.cos(pitch) * distance;
    const cy = target.y + 2.2 + Math.sin(pitch) * distance;
    desired = new THREE.Vector3(cx, Math.max(1.2, cy), cz);
    camera.position.lerp(desired, Math.min(1, dt * 10));
    camera.lookAt(target.x, target.y + 1.6, target.z);
  }
}

// A tracer line from muzzle to hit point, fading out over 0.09 s.
export function addTracer(render, from, to) {
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.95 }));
  render.scene.add(line);
  render.tracers.push({ line, life: 0.09 });
  render.muzzle.position.copy(from);
  render.muzzle.intensity = 26;
}

export function updateEffects(render, dt) {
  render.muzzle.intensity = Math.max(0, render.muzzle.intensity - dt * 320);
  for (let i = render.tracers.length - 1; i >= 0; i -= 1) {
    const tracer = render.tracers[i];
    tracer.life -= dt;
    tracer.line.material.opacity = Math.max(0, tracer.life / 0.09) * 0.95;
    if (tracer.life <= 0) {
      render.scene.remove(tracer.line);
      tracer.line.geometry.dispose();
      tracer.line.material.dispose();
      render.tracers.splice(i, 1);
    }
  }
}

// Project a world point to screen pixels for floating damage numbers.
export function worldToScreen(render, point) {
  const vector = point.clone().project(render.camera);
  return {
    x: (vector.x * 0.5 + 0.5) * window.innerWidth,
    y: (-vector.y * 0.5 + 0.5) * window.innerHeight,
    behind: vector.z > 1,
  };
}

// Keep the shadow camera centred on the player so shadows stay crisp nearby.
export function followShadows(render, x, z) {
  render.sun.position.set(x - 180, 90, z + 60);
  render.sun.target.position.set(x, 0, z);
  render.sun.target.updateMatrixWorld();
}
