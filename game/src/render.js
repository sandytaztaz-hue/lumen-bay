// LUMEN BAY — renderer, sky and lighting. One WebGLRenderer with soft
// shadows and ACES tone mapping; a gradient sky dome with a sun disc and
// drifting cloud sprites; four lighting presets (bright night for the
// chase, sunset for the shootout, night map, dawn for the boat) that set
// the sun, the hemisphere light, the fog and the exposure together.

import * as THREE from '../vendor/three/three.module.min.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return renderer;
}

function skyMaterial(top, mid, bottom) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      mid: { value: new THREE.Color(mid) },
      bottom: { value: new THREE.Color(bottom) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.7, h))
                          : mix(bottom, mid, smoothstep(-0.08, 0.12, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

export function makeSky(THREE, preset) {
  const group = new THREE.Group();
  group.name = 'sky';
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const mat = skyMaterial(preset.skyTop, preset.skyMid, preset.skyBottom);
  const dome = new THREE.Mesh(geo, mat);
  group.add(dome);

  // Sun disc + halo.
  const sunMat = new THREE.MeshBasicMaterial({ color: preset.sunColour, fog: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(preset.sunSize, 32), sunMat);
  sun.position.set(preset.sunX, preset.sunY, preset.sunZ);
  sun.lookAt(0, 0, 0);
  sun.name = 'sun';
  group.add(sun);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(preset.sunSize * 2.4, 32),
    new THREE.MeshBasicMaterial({
      color: preset.sunColour, transparent: true, opacity: preset.halo !== undefined ? preset.halo : 0.22, fog: false }));
  halo.position.copy(sun.position).multiplyScalar(0.995);
  halo.lookAt(0, 0, 0);
  group.add(halo);

  // A few soft cloud sprites, high up, drifting slowly.
  const cloudMat = new THREE.MeshBasicMaterial({
    color: preset.cloudColour, transparent: true, opacity: 0.5, fog: false, depthWrite: false });
  const clouds = [];
  const seeds = [11, 47, 83, 129, 171, 203, 251, 307];
  for (let i = 0; i < 8; i += 1) {
    const s = seeds[i];
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cloudMat);
    cloud.scale.set(60 + (s % 50), 7 + (s % 6), 22 + (s % 20));
    cloud.position.set(-500 + s * 2.2, 180 + (s % 90), -350 + (s % 500));
    cloud.name = 'cloud';
    group.add(cloud);
    clouds.push(cloud);
  }
  group.userData = { clouds, sun, dome };
  return group;
}

export const PRESETS = {
  night: {
    name: 'night', skyTop: 0x060a18, skyMid: 0x101c3a, skyBottom: 0x1c2a4a,
    sunColour: 0xf5ead0, sunSize: 16, sunX: 500, sunY: 260, sunZ: -300, cloudColour: 0x2a3a5a,
    sunLight: { color: 0x8fb0ff, intensity: 0.45, pos: [-60, 120, -40] },
    hemi: { sky: 0x3a4a6a, ground: 0x1a1410, intensity: 0.6 },
    fog: 0x0a1020, fogNear: 120, fogFar: 700, exposure: 1.2, ambient: 0.42,
  },
  sunset: {
    name: 'sunset', skyTop: 0x2a1e5a, skyMid: 0xff7a4a, skyBottom: 0xffb36a,
    sunColour: 0xffc860, sunSize: 12, sunX: 480, sunY: 190, sunZ: 380, halo: 0.12, cloudColour: 0xff9a7a,
    sunLight: { color: 0xffa050, intensity: 2.2, pos: [180, 90, 120] },
    hemi: { sky: 0xff9a6a, ground: 0x5a3a28, intensity: 0.9 },
    fog: 0xd88a5a, fogNear: 150, fogFar: 800, exposure: 1.1, ambient: 0.55,
  },
  dawn: {
    name: 'dawn', skyTop: 0x7a9ac8, skyMid: 0xffb38a, skyBottom: 0xffd9a0,
    sunColour: 0xffa030, sunSize: 42, sunX: 380, sunY: 70, sunZ: 420, cloudColour: 0xffc8a0,
    sunLight: { color: 0xffc080, intensity: 2.0, pos: [160, 80, 140] },
    hemi: { sky: 0xffc8a0, ground: 0x6a5a48, intensity: 0.95 },
    fog: 0xe8b088, fogNear: 160, fogFar: 850, exposure: 1.15, ambient: 0.6,
  },
  day: {
    name: 'day', skyTop: 0x2a6ac8, skyMid: 0x7ab8e8, skyBottom: 0xc8e8f2,
    sunColour: 0xfff8d0, sunSize: 26, sunX: 300, sunY: 320, sunZ: 200, cloudColour: 0xffffff,
    sunLight: { color: 0xfff2d0, intensity: 2.6, pos: [120, 200, 80] },
    hemi: { sky: 0x9ac8e8, ground: 0x5a6a4a, intensity: 1.0 },
    fog: 0x9ac8e8, fogNear: 200, fogFar: 900, exposure: 1.05, ambient: 0.7,
  },
};

export function applyPreset(scene, renderer, camera, presetName, rig) {
  const preset = PRESETS[presetName] || PRESETS.night;
  // Swap the sky dome.
  const old = scene.getObjectByName('sky');
  if (old) scene.remove(old);
  const sky = makeSky(THREE, preset);
  scene.add(sky);
  if (rig) rig.sky = sky;
  // Sun + hemisphere.
  if (!rig.sun) {
    rig.sun = new THREE.DirectionalLight(0xffffff, 2);
    rig.sun.castShadow = true;
    rig.sun.shadow.mapSize.set(2048, 2048);
    rig.sun.shadow.camera.left = -160;
    rig.sun.shadow.camera.right = 160;
    rig.sun.shadow.camera.top = 160;
    rig.sun.shadow.camera.bottom = -160;
    rig.sun.shadow.camera.far = 600;
    rig.sun.shadow.bias = -0.0004;
    scene.add(rig.sun);
    scene.add(rig.sun.target);
    rig.hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1);
    scene.add(rig.hemi);
    rig.amb = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(rig.amb);
  }
  rig.sun.color.set(preset.sunLight.color);
  rig.sun.intensity = preset.sunLight.intensity;
  rig.sun.position.set(...preset.sunLight.pos);
  rig.sun.target.position.set(130, 0, 210);
  rig.hemi.color.set(preset.hemi.sky);
  rig.hemi.groundColor.set(preset.hemi.ground);
  rig.hemi.intensity = preset.hemi.intensity;
  rig.amb.intensity = preset.ambient;
  scene.fog = new THREE.Fog(preset.fog, preset.fogNear, preset.fogFar);
  scene.background = new THREE.Color(preset.fog);
  renderer.toneMappingExposure = preset.exposure;
  if (camera) {
    camera.far = 2000;
    camera.updateProjectionMatrix();
  }
  return preset;
}
