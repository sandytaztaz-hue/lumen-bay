// LUMEN BAY — renderer: WebGL, sky dome, sun, clouds, lighting presets.
// Three.js 0.170, vendored. One renderer, one scene, ACES tone mapping,
// soft shadows. Presets: night (22:40 chase), sunset (18:45 shootout),
// dawn (06:10 finale) and day.
import * as THREE from 'three';

export const PRESETS = {
  night: {
    skyTop: 0x060a18, skyMid: 0x0e1626, skyLow: 0x2a1a2e,
    sunColor: 0xffd9a0, sunIntensity: 0.55, sunPos: [300, 60, 215],
    hemiSky: 0x1a2440, hemiGround: 0x0a0a0c, hemiIntensity: 0.75,
    fog: 0x0a0e18, fogNear: 120, fogFar: 480, exposure: 1.05, lampGlow: true,
    sunDisc: false, // night: no sun disc in the sky (the old giant pale disc)
    sunGlow: 0.12, cloudColor: 0x2a3450, cloudOpacity: 0.35,
  },
  sunset: {
    skyTop: 0x2a1a4a, skyMid: 0xd84a1e, skyLow: 0xff8a3c,
    sunColor: 0xffb36b, sunIntensity: 1.6, sunPos: [360, 26, 215],
    hemiSky: 0xff9a5a, hemiGround: 0x3a2a20, hemiIntensity: 0.85,
    fog: 0xe87a3a, fogNear: 140, fogFar: 520, exposure: 1.15, lampGlow: false,
    sunGlow: 1.0, cloudColor: 0xffd9b0, cloudOpacity: 0.6,
  },
  dawn: {
    skyTop: 0x3a4a7a, skyMid: 0xff8a5a, skyLow: 0xffc98a,
    sunColor: 0xffd9a0, sunIntensity: 1.5, sunPos: [62, 57, 351],
    hemiSky: 0xffb98a, hemiGround: 0x4a3a30, hemiIntensity: 1.4,
    fog: 0xf2a06a, fogNear: 150, fogFar: 560, exposure: 1.25, lampGlow: false,
    sunGlow: 1.0, cloudColor: 0xffe8c8, cloudOpacity: 0.6,
  },
  day: {
    skyTop: 0x2a7ac8, skyMid: 0x7ab8e8, skyLow: 0xcfe8f5,
    sunColor: 0xfff2d0, sunIntensity: 2.2, sunPos: [200, 220, 60],
    hemiSky: 0x9ac8e8, hemiGround: 0x6a7a5a, hemiIntensity: 1.0,
    fog: 0xa8c8e0, fogNear: 180, fogFar: 700, exposure: 1.0, lampGlow: false,
    sunGlow: 0.6, cloudColor: 0xffffff, cloudOpacity: 0.55,
  },
};

export function initRenderer(G) {
  const canvas = document.getElementById('c3d');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0e18, 120, 480);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(80, 4, 215);

  // gradient sky dome with a sun glow baked in
  const skyUniforms = {
    topColor: { value: new THREE.Color(0x060a18) },
    midColor: { value: new THREE.Color(0x0e1626) },
    lowColor: { value: new THREE.Color(0x2a1a2e) },
    sunDir: { value: new THREE.Vector3(1, 0.1, 0).normalize() },
    sunColor: { value: new THREE.Color(0xffd9a0) },
    sunGlow: { value: 0.12 }, // per-preset strength of the sky sun glow
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 midColor; uniform vec3 lowColor;
        uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunGlow; varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y, -0.1, 1.0);
          vec3 col = h > 0.45 ? mix(midColor, topColor, (h-0.45)/0.55) : mix(lowColor, midColor, h/0.45);
          float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          col += sunColor * sunGlow * (pow(s, 220.0)*1.6 + pow(s, 18.0)*0.45 + pow(s, 4.0)*0.18);
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  scene.add(sky);

  // sun disc + halo, repositioned per preset (DoubleSide: the disc must
  // read from any camera angle the shot staging uses)
  const sunGroup = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false, side: THREE.DoubleSide }));
  sunGroup.add(disc);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      grad.addColorStop(0, 'rgba(255,230,160,0.9)'); grad.addColorStop(1, 'rgba(255,230,160,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })(), transparent: true, depthWrite: false, fog: false,
  }));
  halo.scale.setScalar(260);
  sunGroup.add(halo);
  scene.add(sunGroup);

  // clouds: flat white ellipsoids drifting slowly
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, fog: false });
  const rng = { s: 12345, next() { this.s = (this.s * 1103515245 + 12345) & 0x7fffffff; return this.s / 0x7fffffff; } };
  for (let i = 0; i < 14; i++) {
    const cl = new THREE.Group();
    const puffs = 2 + Math.floor(rng.next() * 3);
    for (let j = 0; j < puffs; j++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(6 + rng.next() * 9, 8, 6), cloudMat);
      p.scale.y = 0.32;
      p.position.set(j * 9 - puffs * 4, rng.next() * 2, rng.next() * 4 - 2);
      cl.add(p);
    }
    cl.position.set(-40 + rng.next() * 440, 62 + rng.next() * 46, -40 + rng.next() * 300);
    clouds.add(cl);
  }
  scene.add(clouds);

  // lights
  const sun = new THREE.DirectionalLight(0xffd9a0, 0.55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.002;
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0x1a2440, 0x0a0a0c, 0.5);
  scene.add(hemi);
  // hero fill light: a soft point light that follows the hero car
  const heroLight = new THREE.PointLight(0xffe9b0, 60, 26, 1.6);
  heroLight.position.set(90, 3, 215);
  scene.add(heroLight);

  G.renderer = renderer; G.scene = scene; G.camera = camera;
  G.lights = { sun, hemi, heroLight };
  G.sky = { mesh: sky, uniforms: skyUniforms, sunGroup, clouds, cloudMat };
  G.renderFrames = 0;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return { renderer, scene, camera };
}

export function applyPreset(G, name) {
  const p = PRESETS[name] || PRESETS.day;
  const u = G.sky.uniforms;
  u.topColor.value.setHex(p.skyTop);
  u.midColor.value.setHex(p.skyMid);
  u.lowColor.value.setHex(p.skyLow);
  u.sunColor.value.setHex(p.sunColor);
  const dir = new THREE.Vector3(p.sunPos[0] - 160, p.sunPos[1], p.sunPos[2] - 155).normalize();
  u.sunDir.value.copy(dir);
  G.sky.sunGroup.position.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]);
  G.sky.sunGroup.lookAt(G.camera.position);
  G.sky.sunGroup.visible = p.sunDisc !== false;
  u.sunGlow.value = p.sunGlow ?? 0.6;
  if (G.sky.cloudMat) {
    G.sky.cloudMat.color.setHex(p.cloudColor ?? 0xffffff);
    G.sky.cloudMat.opacity = p.cloudOpacity ?? 0.55;
  }
  G.lights.sun.color.setHex(p.sunColor);
  G.lights.sun.intensity = p.sunIntensity;
  G.lights.sun.position.set(p.sunPos[0], p.sunPos[1] + 40, p.sunPos[2]);
  G.lights.sun.target.position.set(160, 0, 200);
  G.lights.hemi.color.setHex(p.hemiSky);
  G.lights.hemi.groundColor.setHex(p.hemiGround);
  G.lights.hemi.intensity = p.hemiIntensity;
  G.scene.fog.color.setHex(p.fog);
  G.scene.fog.near = p.fogNear; G.scene.fog.far = p.fogFar;
  G.renderer.toneMappingExposure = p.exposure;
  G.preset = name;
}

// Chase camera: behind-and-above a target that faces `heading` (radians,
// 0 = +x east). dist back, height up, look a little ahead of the target.
export function chaseCam(G, pos, heading, dist, height, lookAhead = 8) {
  const back = new THREE.Vector3(-Math.cos(heading), 0, -Math.sin(heading));
  const cam = G.camera;
  cam.position.set(
    pos.x + back.x * dist,
    height,
    pos.z + back.z * dist,
  );
  cam.lookAt(pos.x + Math.cos(heading) * lookAhead, 1.4, pos.z + Math.sin(heading) * lookAhead);
}

// Orbit camera for on-foot play: yaw/pitch around the player.
export function orbitCam(G, pos, yaw, pitch, dist) {
  const cam = G.camera;
  const cx = pos.x - Math.cos(yaw) * Math.cos(pitch) * dist;
  const cz = pos.z - Math.sin(yaw) * Math.cos(pitch) * dist;
  const cy = pos.y + 1.6 + Math.sin(pitch) * dist;
  cam.position.set(cx, Math.max(cy, 0.6), cz);
  cam.lookAt(pos.x, pos.y + 1.4, pos.z);
}
