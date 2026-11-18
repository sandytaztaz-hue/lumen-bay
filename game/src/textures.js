// Procedural canvas textures for LUMEN BAY. Every surface in Puerto Lumen is
// painted at boot from a seeded RNG — building facades with lit windows, asphalt
// with lane dashes, sand, water, palm fronds, neon signs — so the game ships
// zero image files and makes zero network requests at runtime. Each painter
// returns a THREE.CanvasTexture; the city module decides repeat and anisotropy.

import * as THREE from '../vendor/three/three.module.min.js';
import { createRandom, pick } from './random.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A building facade: warm plaster, a grid of windows (some lit gold for the
// sunset hour), a darker ground floor with a shop awning stripe, and a few
// air-conditioner boxes so the wall does not read as flat colour.
export function buildingTexture(seed, base) {
  const rng = createRandom(seed);
  const [c, g] = canvas(256, 256);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  // Subtle plaster mottling.
  for (let i = 0; i < 420; i += 1) {
    g.fillStyle = `rgba(0,0,0,${(rng() * 0.05).toFixed(3)})`;
    g.fillRect(rng() * 256, rng() * 256, 2 + rng() * 5, 2 + rng() * 5);
  }
  // Window grid: 4 columns x 6 rows.
  for (let r = 0; r < 6; r += 1) {
    for (let col = 0; col < 4; col += 1) {
      const x = 18 + col * 58, y = 16 + r * 34;
      const lit = rng() < 0.55;
      g.fillStyle = '#2b2620'; g.fillRect(x - 3, y - 3, 40, 26);
      g.fillStyle = lit ? (rng() < 0.5 ? '#ffd27a' : '#ff9a52') : '#3d5a74';
      g.fillRect(x, y, 34, 20);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, 34, 4);
    }
  }
  // Ground-floor shop band with a striped awning.
  g.fillStyle = '#241d18'; g.fillRect(0, 224, 256, 32);
  for (let i = 0; i < 8; i += 1) {
    g.fillStyle = i % 2 ? '#ff5e7a' : '#fff3d6';
    g.fillRect(i * 32, 224, 32, 10);
  }
  // AC boxes.
  for (let i = 0; i < 5; i += 1) {
    g.fillStyle = '#6b6258';
    g.fillRect(20 + rng() * 200, 40 + rng() * 160, 16, 10);
  }
  return toTexture(c);
}

// Asphalt with a centre dash line and edge wear. Tiled along road length.
export function roadTexture(seed) {
  const rng = createRandom(seed);
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#3a3a40'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 260; i += 1) {
    g.fillStyle = `rgba(255,255,255,${(rng() * 0.05).toFixed(3)})`;
    g.fillRect(rng() * 128, rng() * 256, 2, 2);
  }
  g.fillStyle = '#e8d24a';
  g.fillRect(62, 20, 4, 60); g.fillRect(62, 140, 4, 60);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect(6, 0, 3, 256); g.fillRect(119, 0, 3, 256);
  return toTexture(c, 1, 6);
}

// Golden sand with speckles and a few darker patches.
export function sandTexture(seed) {
  const rng = createRandom(seed);
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#e8c98a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i += 1) {
    const v = rng();
    g.fillStyle = v < 0.5 ? 'rgba(120,90,40,0.18)' : 'rgba(255,240,200,0.25)';
    g.fillRect(rng() * 256, rng() * 256, 1 + rng() * 3, 1 + rng() * 3);
  }
  return toTexture(c, 8, 8);
}

// Ocean: deep blue-green with lighter wave streaks, tiled wide.
export function waterTexture(seed) {
  const rng = createRandom(seed);
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#1e6f8e'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i += 1) {
    g.strokeStyle = `rgba(255,255,255,${(0.08 + rng() * 0.16).toFixed(3)})`;
    g.lineWidth = 1 + rng() * 2;
    const y = rng() * 256, x = rng() * 256, len = 20 + rng() * 60;
    g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + len * 0.3, y - 4, x + len * 0.7, y + 4, x + len, y);
    g.stroke();
  }
  return toTexture(c, 10, 10);
}

// Sidewalk paving slabs.
export function sidewalkTexture(seed) {
  const rng = createRandom(seed);
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#9a8f7a'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(60,50,40,0.5)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i += 1) {
    g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i * 32); g.lineTo(128, i * 32); g.stroke();
  }
  for (let i = 0; i < 80; i += 1) {
    g.fillStyle = `rgba(0,0,0,${(rng() * 0.06).toFixed(3)})`;
    g.fillRect(rng() * 128, rng() * 128, 2, 2);
  }
  return toTexture(c, 6, 6);
}

// Palm fronds: a radial burst of green blades on transparency, used on crossed
// planes so a palm reads from any angle.
export function palmTexture(seed) {
  const rng = createRandom(seed);
  const [c, g] = canvas(128, 128);
  g.clearRect(0, 0, 128, 128);
  g.translate(64, 70);
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2 + rng() * 0.3;
    g.save(); g.rotate(a);
    const grad = g.createLinearGradient(0, 0, 58, 0);
    grad.addColorStop(0, '#2f7a3a'); grad.addColorStop(1, '#7cc46a');
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(0, -4); g.quadraticCurveTo(30, -9, 58, -2);
    g.quadraticCurveTo(30, 3, 0, 4); g.closePath(); g.fill();
    g.restore();
  }
  g.fillStyle = '#8a6a3a'; g.fillRect(-3, 0, 6, 58);
  return toTexture(c);
}

// A neon shop sign: glowing text on a dark board, one of several wordings.
export function neonTexture(word, colour) {
  const [c, g] = canvas(256, 96);
  g.fillStyle = '#140f1e'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = colour; g.lineWidth = 4; g.strokeRect(6, 6, 244, 84);
  g.shadowColor = colour; g.shadowBlur = 18;
  g.fillStyle = colour; g.font = 'bold 34px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(word, 128, 50);
  g.shadowBlur = 0;
  return toTexture(c);
}

// A big wall poster / mural texture for the market square: sun, palms, waves.
export function muralTexture(seed) {
  const rng = createRandom(seed);
  const [c, g] = canvas(256, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#ff9a52'); grad.addColorStop(1, '#ff5e7a');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#ffd27a';
  g.beginPath(); g.arc(128, 96, 46, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1e6f8e'; g.fillRect(0, 180, 256, 76);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 5; i += 1) g.fillRect(10 + rng() * 200, 196 + rng() * 44, 40, 4);
  g.fillStyle = '#2f7a3a';
  for (let i = 0; i < 4; i += 1) {
    const x = 30 + i * 60;
    g.fillRect(x, 120, 6, 62);
    g.beginPath(); g.ellipse(x + 3, 116, 26, 9, -0.4, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#fff3d6'; g.font = 'bold 30px system-ui, sans-serif';
  g.textAlign = 'center'; g.fillText('PUERTO LUMEN', 128, 40);
  return toTexture(c);
}

// Sunset sky gradient painted once and used as a big background dome texture.
export function skyTexture() {
  const [c, g] = canvas(64, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#2e4a7a');
  grad.addColorStop(0.45, '#7a5a9e');
  grad.addColorStop(0.68, '#ff7a5c');
  grad.addColorStop(0.85, '#ff9a52');
  grad.addColorStop(1.0, '#ffd27a');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 512);
  // The sun disc, low on the horizon.
  g.fillStyle = '#fff0b8';
  g.beginPath(); g.arc(32, 430, 26, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,210,122,0.35)';
  g.beginPath(); g.arc(32, 430, 44, 0, Math.PI * 2); g.fill();
  return toTexture(c);
}

export { pick };
