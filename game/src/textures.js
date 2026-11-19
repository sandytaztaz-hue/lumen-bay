// LUMEN BAY r6 — procedural canvas textures. Every surface in Puerto Lumen is
// painted on a <canvas> at boot from the seeded RNG: no image files, no network.
import * as THREE from 'three';
import { randInt } from './random.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas, repeatX, repeatY) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX || 1, repeatY || 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A sun-warmed building facade: pastel plaster, lit windows, a shop awning. */
export function buildingTexture(rng, hue) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const base = `hsl(${hue}, ${55 + randInt(rng, 0, 20)}%, ${62 + randInt(rng, 0, 14)}%)`;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  // Plaster noise.
  for (let i = 0; i < 500; i += 1) {
    g.fillStyle = `rgba(0,0,0,${0.02 + rng() * 0.05})`;
    g.fillRect(rng() * 256, rng() * 256, 2, 2);
  }
  // Window grid, some lit gold by the sunset.
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const x = 24 + col * 56;
      const y = 22 + row * 46;
      const lit = rng() < 0.45;
      g.fillStyle = lit ? '#ffd27a' : '#2c3550';
      g.fillRect(x, y, 34, 28);
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.strokeRect(x, y, 34, 28);
      g.beginPath();
      g.moveTo(x + 17, y);
      g.lineTo(x + 17, y + 28);
      g.stroke();
    }
  }
  // Ground-floor awning stripe.
  g.fillStyle = `hsl(${(hue + 180) % 360}, 70%, 55%)`;
  g.fillRect(0, 224, 256, 32);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let x = 0; x < 256; x += 32) g.fillRect(x, 224, 16, 32);
  return toTexture(c, 1, 1);
}

/** Asphalt with a dashed centre line and worn edges. */
export function roadTexture(rng) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#33363d';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 300; i += 1) {
    g.fillStyle = `rgba(255,255,255,${rng() * 0.04})`;
    g.fillRect(rng() * 128, rng() * 128, 2, 2);
  }
  g.fillStyle = '#e8d44d';
  g.fillRect(62, 8, 4, 40);
  g.fillRect(62, 80, 4, 40);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(4, 0, 3, 128);
  g.fillRect(121, 0, 3, 128);
  return toTexture(c, 1, 1);
}

/** Golden beach sand with speckles and a soft dune ripple. */
export function sandTexture(rng) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#e8c98a';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i += 1) {
    const v = rng();
    g.fillStyle = v < 0.5 ? 'rgba(120,80,20,0.12)' : 'rgba(255,240,200,0.18)';
    g.fillRect(rng() * 128, rng() * 128, 2, 1);
  }
  g.strokeStyle = 'rgba(160,110,40,0.15)';
  for (let i = 0; i < 6; i += 1) {
    g.beginPath();
    g.moveTo(0, 10 + i * 20 + rng() * 6);
    g.bezierCurveTo(40, 6 + i * 20, 80, 16 + i * 20, 128, 10 + i * 20);
    g.stroke();
  }
  return toTexture(c, 8, 8);
}

/** Sunset sea: deep teal with warm sparkle streaks. */
export function waterTexture(rng) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#1d6f8e');
  grad.addColorStop(0.6, '#2a8aa8');
  grad.addColorStop(1, '#ff9a56');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 140; i += 1) {
    g.fillStyle = `rgba(255,210,122,${0.08 + rng() * 0.2})`;
    g.fillRect(rng() * 256, rng() * 256, 14 + rng() * 30, 2);
  }
  return toTexture(c, 6, 6);
}

// ---- more painted surfaces -------------------------------------------------

/** Palm fronds on transparency, for crossed-plane palm trees. */
export function palmTexture(rng) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = '#3f7a2e';
  g.lineWidth = 5;
  g.lineCap = 'round';
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + rng() * 0.3;
    g.beginPath();
    g.moveTo(64, 70);
    g.quadraticCurveTo(64 + Math.cos(a) * 40, 70 + Math.sin(a) * 40 - 22, 64 + Math.cos(a) * 58, 70 + Math.sin(a) * 58 - 8);
    g.stroke();
  }
  g.strokeStyle = '#7a5a34';
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(64, 70);
  g.lineTo(64, 126);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A neon shop sign: bright text on a dark board, drawn per shop name. */
export function neonSignTexture(text, colour) {
  const c = makeCanvas(256, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#14101c';
  g.fillRect(0, 0, 256, 64);
  g.font = 'bold 30px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = colour;
  g.shadowBlur = 14;
  g.fillStyle = colour;
  g.fillText(text.slice(0, 14).toUpperCase(), 128, 34);
  g.shadowBlur = 0;
  g.strokeStyle = colour;
  g.lineWidth = 2;
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
  grad.addColorStop(0, 'rgba(255,190,90,1)');
  grad.addColorStop(0.5, 'rgba(255,110,60,0.55)');
  grad.addColorStop(1, 'rgba(255,80,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A paper-lantern disc used by the festival scene and shot 3. */
export function makeLanternMaterial() {
  return new THREE.MeshBasicMaterial({ map: lanternTexture(), transparent: true, depthWrite: false });
}
