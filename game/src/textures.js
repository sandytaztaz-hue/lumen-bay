// Procedural canvas textures: every surface in Puerto Lumen is painted at load
// from a seeded RNG — building facades, road asphalt, sand, water, neon signs,
// the clock tower face and the lighthouse bands. No external images anywhere.
import * as THREE from 'three';
import { int, pick, range } from './random.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  return t;
}

/** A sun-bleached facade: warm plaster, a grid of lit windows, a shop awning. */
export function buildingTexture(rng, base) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i += 1) {
    g.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    g.fillRect(rng() * 256, rng() * 256, range(rng, 2, 9), range(rng, 2, 9));
  }
  const cols = 5, rows = 7;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const wx = 18 + x * 46, wy = 16 + y * 33;
      const lit = rng() > 0.45;
      g.fillStyle = '#241a12'; g.fillRect(wx - 3, wy - 3, 30, 26);
      g.fillStyle = lit ? pick(rng, ['#ffd98a', '#ffb36b', '#fff2c0']) : '#3a4a5e';
      g.fillRect(wx, wy, 24, 20);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(wx, wy, 24, 4);
    }
  }
  // Ground-floor shopfront with a striped awning.
  g.fillStyle = '#1d1410'; g.fillRect(0, 222, 256, 34);
  for (let x = 0; x < 8; x += 1) {
    g.fillStyle = x % 2 ? '#e84a6f' : '#f6ead2';
    g.fillRect(x * 32, 214, 32, 12);
  }
  return toTexture(c);
}

/** Asphalt with a centre line, edge lines and patchy wear. */
export function roadTexture(rng) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#2e2e38'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i += 1) {
    g.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.10)';
    g.fillRect(rng() * 128, rng() * 128, range(rng, 1, 4), range(rng, 1, 4));
  }
  g.fillStyle = '#d8c25a'; g.fillRect(62, 0, 4, 128);
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(6, 0, 3, 128); g.fillRect(119, 0, 3, 128);
  return toTexture(c, 1, 8);
}

/** Warm beach sand with speckles and a few shells. */
export function sandTexture(rng) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#e8c98a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i += 1) {
    g.fillStyle = pick(rng, ['rgba(120,80,30,0.12)', 'rgba(255,255,255,0.14)', 'rgba(200,140,60,0.15)']);
    g.fillRect(rng() * 256, rng() * 256, range(rng, 1, 3), range(rng, 1, 3));
  }
  return toTexture(c, 6, 6);
}

/** Open water: deep teal with sun glints and soft wave bands. */
export function waterTexture(rng) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#1f6f8e'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i += 1) {
    g.strokeStyle = `rgba(255,255,255,${range(rng, 0.05, 0.16)})`;
    g.lineWidth = range(rng, 1, 3);
    g.beginPath();
    const y = rng() * 256;
    g.moveTo(0, y); g.bezierCurveTo(80, y + range(rng, -8, 8), 170, y + range(rng, -8, 8), 256, y);
    g.stroke();
  }
  for (let i = 0; i < 220; i += 1) {
    g.fillStyle = 'rgba(255,220,160,0.20)';
    g.fillRect(rng() * 256, rng() * 256, range(rng, 2, 7), 1);
  }
  return toTexture(c, 10, 10);
}

/** A glowing neon shop sign: text on a dark plate with a bright rim. */
export function neonSignTexture(text, color) {
  const [c, g] = canvas(512, 128);
  g.fillStyle = '#140d18'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
  g.font = 'bold 64px Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 26;
  g.fillStyle = color; g.fillText(text, 256, 66);
  g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.fillText(text, 256, 66);
  return toTexture(c);
}

/** The Torre Lumen clock face: cream dial, roman numerals, golden hands at 18:40. */
export function clockTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#f6ead2'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#8a6a2f'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 114, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#241a12'; g.font = 'bold 30px Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const nums = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.fillText(nums[i], 128 + Math.cos(a) * 88, 128 + Math.sin(a) * 88);
  }
  // 18:40 — hour hand near VII, minute hand on VIII.
  const ha = ((6 + 40 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const ma = (40 / 60) * Math.PI * 2 - Math.PI / 2;
  g.strokeStyle = '#241a12'; g.lineCap = 'round';
  g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(ha) * 58, 128 + Math.sin(ha) * 58); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(ma) * 92, 128 + Math.sin(ma) * 92); g.stroke();
  g.fillStyle = '#c0392b'; g.beginPath(); g.arc(128, 128, 9, 0, Math.PI * 2); g.fill();
  return toTexture(c);
}

/** Red and white horizontal bands for the Farol Rojo lighthouse. */
export function lighthouseTexture() {
  const [c, g] = canvas(128, 256);
  for (let i = 0; i < 8; i += 1) {
    g.fillStyle = i % 2 ? '#f6ead2' : '#c0392b';
    g.fillRect(0, i * 32, 128, 32);
  }
  return toTexture(c);
}

/** Warm plaster for the safehouse walls. */
export function plasterTexture(rng, base) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 300; i += 1) {
    g.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    g.fillRect(rng() * 128, rng() * 128, range(rng, 2, 8), range(rng, 2, 8));
  }
  return toTexture(c);
}

export function makeTextures(rng) {
  const facades = [
    '#e8a06a', '#d98a5f', '#c97e6b', '#e0b56f', '#b98a7a',
    '#7fa3b8', '#a8b89a', '#d9a0a0', '#e8c98a', '#c9b8a0',
  ].map((base) => buildingTexture(rng, base));
  return {
    facades,
    road: roadTexture(rng),
    sand: sandTexture(rng),
    water: waterTexture(rng),
    plaster: plasterTexture(rng, '#e8cfa8'),
    lighthouse: lighthouseTexture(),
    clock: clockTexture(),
    signs: {
      mercado: neonSignTexture('MERCADO VIEJO', '#ff4fa3'),
      taller: neonSignTexture('TALLER LUMEN', '#39d5ff'),
      casino: neonSignTexture('CASINO SOL', '#ffd24a'),
      playa: neonSignTexture('PLAYA DORADA', '#7dff9a'),
      faro: neonSignTexture('FAROL ROJO', '#ff6a4a'),
    },
  };
}
