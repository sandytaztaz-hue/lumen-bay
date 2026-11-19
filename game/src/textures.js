// LUMEN BAY r7 — procedural canvas textures, rebuilt for bright midday.
// Every surface is painted on a <canvas> at boot from the seeded RNG: no image
// files, no network. Saturated pastels, big daylight windows, bright yellow
// road lines, turquoise water with white sparkle, striped beach umbrellas.
import * as THREE from 'three';
import { randInt } from './random.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function toTexture(canvas, rx, ry) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx || 1, ry || 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** Saturated pastel facade: big bright daylight windows, sign band, awning. */
export function buildingTexture(rng, hue) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = `hsl(${hue}, ${68 + randInt(rng, 0, 18)}%, ${66 + randInt(rng, 0, 10)}%)`;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i += 1) {
    g.fillStyle = `rgba(255,255,255,${0.02 + rng() * 0.05})`;
    g.fillRect(rng() * 256, rng() * 256, 2, 2);
  }
  // Big windows: bright blue-white daylight glass, white frames, crossbars.
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const x = 20 + col * 56, y = 18 + row * 44;
      const sky = rng() < 0.5;
      g.fillStyle = sky ? '#bfe3ff' : '#e8f6ff';
      g.fillRect(x, y, 38, 30);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(x, y, 38, 6);
      g.strokeStyle = '#ffffff'; g.lineWidth = 2;
      g.strokeRect(x, y, 38, 30);
      g.beginPath(); g.moveTo(x + 19, y); g.lineTo(x + 19, y + 30); g.stroke();
      g.beginPath(); g.moveTo(x, y + 15); g.lineTo(x + 38, y + 15); g.stroke();
    }
  }
  // Sign band + striped awning at street level — no blank ground floor.
  g.fillStyle = `hsl(${(hue + 140) % 360}, 75%, 52%)`;
  g.fillRect(0, 208, 256, 18);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 226, 256, 30);
  g.fillStyle = `hsl(${(hue + 180) % 360}, 80%, 55%)`;
  for (let x = 0; x < 256; x += 32) g.fillRect(x, 226, 16, 30);
  return toTexture(c, 1, 1);
}
/** Light asphalt: bright yellow centre line, white edges, crosswalk stripes. */
export function roadTexture(rng) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#4a4d55'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i += 1) {
    g.fillStyle = `rgba(255,255,255,${rng() * 0.05})`;
    g.fillRect(rng() * 128, rng() * 128, 2, 2);
  }
  g.fillStyle = '#ffd23f';
  g.fillRect(61, 8, 6, 40); g.fillRect(61, 80, 6, 40);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(4, 0, 3, 128); g.fillRect(121, 0, 3, 128);
  // Crosswalk at the tile edge.
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let x = 8; x < 120; x += 18) g.fillRect(x, 116, 10, 12);
  return toTexture(c, 1, 1);
}
/** Bright warm sand with speckles and dune ripple. */
export function sandTexture(rng) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#f2ddab'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i += 1) {
    const v = rng();
    g.fillStyle = v < 0.5 ? 'rgba(180,130,50,0.14)' : 'rgba(255,246,214,0.2)';
    g.fillRect(rng() * 128, rng() * 128, 2, 1);
  }
  g.strokeStyle = 'rgba(190,140,60,0.16)';
  for (let i = 0; i < 6; i += 1) {
    g.beginPath(); g.moveTo(0, 10 + i * 20 + rng() * 6);
    g.bezierCurveTo(40, 6 + i * 20, 80, 16 + i * 20, 128, 10 + i * 20); g.stroke();
  }
  return toTexture(c, 8, 8);
}
/** Bright turquoise sea: cyan gradient, white sparkle, no sunset orange. */
export function waterTexture(rng) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#19b8c4'); grad.addColorStop(0.55, '#2fd3de'); grad.addColorStop(1, '#7fe8ee');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i += 1) {
    g.fillStyle = `rgba(255,255,255,${0.12 + rng() * 0.25})`;
    g.fillRect(rng() * 256, rng() * 256, 10 + rng() * 26, 2);
  }
  return toTexture(c, 6, 6);
}
// ---- more painted surfaces -------------------------------------------------
/** Lush green palm fronds on transparency, for crossed-plane palm trees. */
export function palmTexture(rng) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = '#2f8a2a'; g.lineWidth = 6; g.lineCap = 'round';
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2 + rng() * 0.3;
    g.beginPath(); g.moveTo(64, 70);
    g.quadraticCurveTo(64 + Math.cos(a) * 42, 70 + Math.sin(a) * 42 - 24, 64 + Math.cos(a) * 60, 70 + Math.sin(a) * 60 - 6);
    g.stroke();
  }
  g.strokeStyle = '#58c93c'; g.lineWidth = 3;
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    g.beginPath(); g.moveTo(64, 70);
    g.quadraticCurveTo(64 + Math.cos(a) * 36, 70 + Math.sin(a) * 36 - 20, 64 + Math.cos(a) * 52, 70 + Math.sin(a) * 52 - 4);
    g.stroke();
  }
  g.strokeStyle = '#7a5a34'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(64, 70); g.lineTo(64, 126); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** Striped beach umbrella: pink/red/white radial stripes (NEW r7). */
export function umbrellaTexture(rng) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  const cols = ['#ff2a5e', '#ffffff', '#ff7a1a', '#ffffff', '#19b8c4', '#ffffff'];
  for (let i = 0; i < 12; i += 1) {
    g.fillStyle = cols[(i + (rng() < 0.5 ? 0 : 2)) % cols.length];
    g.beginPath(); g.moveTo(64, 64);
    g.arc(64, 64, 62, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2);
    g.closePath(); g.fill();
  }
  g.fillStyle = '#ffd23f';
  g.beginPath(); g.arc(64, 64, 7, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** Soft white cloud puffs on transparency (NEW r7). */
export function cloudTexture(rng) {
  const c = makeCanvas(256, 128);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 128);
  for (let i = 0; i < 9; i += 1) {
    const x = 30 + rng() * 196, y = 45 + rng() * 40, r = 18 + rng() * 26;
    const grad = g.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** A bright shop sign: bold coloured text on a white board, drawn per name. */
export function neonSignTexture(text, colour) {
  const c = makeCanvas(256, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 64);
  g.font = 'bold 30px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = colour; g.shadowBlur = 10;
  g.fillStyle = colour;
  g.fillText(text.slice(0, 14).toUpperCase(), 128, 34);
  g.shadowBlur = 0; g.strokeStyle = colour; g.lineWidth = 3;
  g.strokeRect(3, 3, 250, 58);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** Festival lantern glow texture (radial warm light). */
export function lanternTexture() {
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,210,110,1)');
  grad.addColorStop(0.5, 'rgba(255,140,80,0.55)');
  grad.addColorStop(1, 'rgba(255,110,60,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** A paper-lantern disc used by the festival scene and shot 3. */
export function makeLanternMaterial() {
  return new THREE.MeshBasicMaterial({ map: lanternTexture(), transparent: true, depthWrite: false });
}
