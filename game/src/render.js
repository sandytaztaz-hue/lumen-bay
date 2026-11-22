// LUMEN BAY — render.js
// The renderer, the gradient sky dome, the sun and clouds, the lights,
// the four lighting presets, and the chase and orbit cameras.

import * as THREE from 'three';

export const PRESETS = {
  night: {
    skyTop: 0x0a1030, skyMid: 0x1c2440, skyLow: 0x2c1a30,
    sunColor: 0xffe8c0, sunIntensity: 0.55, sunPos: [300, 60, 215],
    hemiSky: 0x24304f, hemiGround: 0x0a0a12, hemiIntensity: 0.75,
    fogColor: 0x0d1226, fogNear: 120, fogFar: 480,
    exposure: 1.05, lampGlow: true, sunDisc: false, sunGlow: 0.12,
    cloudColor: 0x3a4258, cloudOpacity: 0.35,
  },
  sunset: {
    skyTop: 0x3a1c5e, skyMid: 0xd95f1e, skyLow: 0xff8c2e,
    sunColor: 0xff8c2e, sunIntensity: 1.6, sunPos: [360, 26, 215],
    hemiSky: 0xff9a4d, hemiGround: 0x4a2a1a, hemiIntensity: 0.85,
    fogColor: 0xd96a2e, fogNear: 140, fogFar: 520,
    exposure: 1.15, lampGlow: false, sunDisc: true, sunGlow: 1.0,
    cloudColor: 0xffd9b0, cloudOpacity: 0.6,
  },
  dawn: {
    skyTop: 0x5a7aa8, skyMid: 0xff9a4d, skyLow: 0xffd9a8,
    sunColor: 0xffe8c0, sunIntensity: 1.5, sunPos: [62, 57, 351],
    hemiSky: 0xffc49a, hemiGround: 0x6a4a30, hemiIntensity: 1.4,
    fogColor: 0xffc49a, fogNear: 150, fogFar: 560,
    exposure: 1.25, lampGlow: false, sunDisc: true, sunGlow: 1.0,
    cloudColor: 0xfff2dc, cloudOpacity: 0.6,
  },
  day: {
    skyTop: 0x2e7ad9, skyMid: 0x7ab8e8, skyLow: 0xcfe8f5,
    sunColor: 0xfff4dd, sunIntensity: 2.2, sunPos: [200, 220, 60],
    hemiSky: 0x9fc4e8, hemiGround: 0x8a8a5a, hemiIntensity: 1.0,
    fogColor: 0xbdd8ea, fogNear: 180, fogFar: 700,
    exposure: 1.0, lampGlow: false, sunDisc: true, sunGlow: 0.6,
    cloudColor: 0xffffff, cloudOpacity: 0.55,
  },
};

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w;
}
`;

const SKY_FRAG = `
uniform vec3 topColor;
uniform vec3 midColor;
uniform vec3 lowColor;
uniform vec3 sunDir;
uniform float sunGlow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.1, 1.0);
  vec3 col = mix(lowColor, midColor, smoothstep(0.0, 0.25, h));
  col = mix(col, topColor, smoothstep(0.2, 0.75, h));
  float s = max(dot(d, normalize(sunDir)), 0.0);
  col += vec3(1.0, 0.75, 0.45) * pow(s, 220.0) * 1.4 * sunGlow;
  col += vec3(1.0, 0.6, 0.3) * pow(s, 8.0) * 0.45 * sunGlow;
  gl_FragColor = vec4(col, 1.0);
}
`;

// A radial-gradient disc texture, painted on a canvas: the sun sprite
// needs a real disc, or it renders as a solid square in the sky.
function discTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,246,220,1)');
  grad.addColorStop(0.55, 'rgba(255,230,170,0.95)');
  grad.addColorStop(0.8, 'rgba(255,200,110,0.35)');
  grad.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class RenderSys {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);
    this.camera.position.set(20, 8, 240);
    this.presetName = 'sunset';
    this.preset = PRESETS.sunset;

    // Sky dome: a big sphere with a custom shader, drawn on its inside.
    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x3a1c5e) },
      midColor: { value: new THREE.Color(0xd95f1e) },
      lowColor: { value: new THREE.Color(0xff8c2e) },
      sunDir: { value: new THREE.Vector3(1, 0.1, 0) },
      sunGlow: { value: 1.0 },
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat);
    this.scene.add(this.sky);

    // Sun disc + halo sprite at the preset sun position.
    this.sunTexture = discTexture();
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.sunTexture, color: 0xfff2c8, transparent: true, opacity: 0.95, depthWrite: false, fog: false,
    }));
    this.sunSprite.scale.set(90, 90, 1);
    this.scene.add(this.sunSprite);
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.sunTexture, color: 0xffc861, transparent: true, opacity: 0.35, depthWrite: false, fog: false,
    }));
    this.sunHalo.scale.set(220, 220, 1);
    this.scene.add(this.sunHalo);

    // Directional sun with a 1024 shadow map over a 180 m box.
    this.sun = new THREE.DirectionalLight(0xff8c2e, 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.002;
    this.sun.shadow.camera.left = -90;
    this.sun.shadow.camera.right = 90;
    this.sun.shadow.camera.top = 90;
    this.sun.shadow.camera.bottom = -90;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 600;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Hemisphere light.
    this.hemi = new THREE.HemisphereLight(0xff9a4d, 0x4a2a1a, 0.85);
    this.scene.add(this.hemi);

    // Warm point "hero fill" that follows the player or the hero car.
    this.fill = new THREE.PointLight(0xffc890, 12, 60, 1.6);
    this.fill.position.set(24, 4, 250);
    this.scene.add(this.fill);

    // Clouds: 14 flat white ellipsoid clusters drifting slowly.
    this.clouds = [];
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffd9b0, transparent: true, opacity: 0.6, fog: false,
    });
    for (let i = 0; i < 14; i++) {
      const cluster = new THREE.Group();
      const n = 2 + (i % 3);
      for (let j = 0; j < n; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(9 + ((i * 7 + j * 5) % 8), 10, 8), cloudMat);
        puff.scale.y = 0.32;
        puff.position.set(j * 10 - n * 5, (j % 2) * 2, (j % 3) * 4 - 4);
        cluster.add(puff);
      }
      cluster.position.set(-40 + (i * 29) % 440, 95 + (i * 13) % 45, 20 + (i * 53) % 300);
      cluster.userData.speed = 0.4 + (i % 5) * 0.15;
      cluster.userData.mat = cloudMat;
      this.scene.add(cluster);
      this.clouds.push(cluster);
    }
    this.cloudMat = cloudMat;
    this.setPreset('sunset');
    this.resize();
  }

  setPreset(name) {
    const p = PRESETS[name] || PRESETS.sunset;
    this.presetName = name;
    this.preset = p;
    this.skyUniforms.topColor.value.setHex(p.skyTop);
    this.skyUniforms.midColor.value.setHex(p.skyMid);
    this.skyUniforms.lowColor.value.setHex(p.skyLow);
    this.skyUniforms.sunGlow.value = p.sunGlow;
    const sunPos = new THREE.Vector3(p.sunPos[0], p.sunPos[1], p.sunPos[2]);
    this.skyUniforms.sunDir.value.copy(sunPos).normalize();
    this.sun.color.setHex(p.sunColor);
    this.sun.intensity = p.sunIntensity;
    this.sun.position.copy(sunPos);
    this.sun.target.position.set(160, 0, 155);
    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGround);
    this.hemi.intensity = p.hemiIntensity;
    this.scene.fog = new THREE.Fog(p.fogColor, p.fogNear, p.fogFar);
    this.renderer.toneMappingExposure = p.exposure;
    this.sunSprite.visible = p.sunDisc;
    this.sunHalo.visible = p.sunDisc;
    const sunDir = sunPos.clone().normalize();
    this.sunSprite.position.copy(sunDir).multiplyScalar(820);
    this.sunHalo.position.copy(sunDir).multiplyScalar(820);
    this.cloudMat.color.setHex(p.cloudColor);
    this.cloudMat.opacity = p.cloudOpacity;
  }

  // Re-aim the sun disc and the sky glow at the shot camera: the glow
  // direction must be the camera-to-sun vector, or it lands on the
  // wrong side of the sky (the sphere is centred on the origin).
  aimSunAtCamera(camPos, sunWorldPos) {
    const dir = new THREE.Vector3(
      sunWorldPos[0] - camPos.x, sunWorldPos[1] - camPos.y, sunWorldPos[2] - camPos.z,
    ).normalize();
    this.skyUniforms.sunDir.value.copy(dir);
    this.sunSprite.position.set(
      camPos.x + dir.x * 820, camPos.y + dir.y * 820, camPos.z + dir.z * 820,
    );
    this.sunHalo.position.copy(this.sunSprite.position);
  }

  // Re-centre the shadow camera on a shot area (the default 180 m box
  // around the world centre does not reach the far-west beach).
  retargetShadow(x, z, halfSize) {
    this.sun.target.position.set(x, 0, z);
    this.sun.position.set(x + 120, 140, z + 60);
    const c = this.sun.shadow.camera;
    c.left = -halfSize;
    c.right = halfSize;
    c.top = halfSize;
    c.bottom = -halfSize;
    c.updateProjectionMatrix();
  }

  resetShadow() {
    this.sun.target.position.set(160, 0, 155);
    this.sun.position.copy(new THREE.Vector3(...this.preset.sunPos));
    const c = this.sun.shadow.camera;
    c.left = -90;
    c.right = 90;
    c.top = 90;
    c.bottom = -90;
    c.updateProjectionMatrix();
  }

  setFill(x, y, z, intensity) {
    this.fill.position.set(x, y, z);
    if (intensity !== undefined) this.fill.intensity = intensity;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Chase camera: behind and above the target, looking a little ahead.
  chaseCamera(targetPos, heading, distance, height, lookAhead) {
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    this.camera.position.set(
      targetPos.x - fx * distance,
      targetPos.y + height,
      targetPos.z - fz * distance,
    );
    this.camera.lookAt(
      targetPos.x + fx * lookAhead,
      targetPos.y + 1,
      targetPos.z + fz * lookAhead,
    );
  }

  // Orbit camera: yaw and pitch around a point at a fixed distance.
  orbitCamera(targetPos, yaw, pitch, distance) {
    const cx = targetPos.x + Math.sin(yaw) * Math.cos(pitch) * distance;
    const cz = targetPos.z + Math.cos(yaw) * Math.cos(pitch) * distance;
    const cy = targetPos.y + Math.sin(pitch) * distance;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(targetPos.x, targetPos.y + 1.4, targetPos.z);
  }

  update(dt) {
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 420) cloud.position.x = -60;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
