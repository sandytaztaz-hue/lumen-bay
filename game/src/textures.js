// LUMEN BAY — procedural canvas textures. No image assets: every surface
// (building facades, road, sand, signs) is painted on a canvas at load,
// seeded so the same seed paints the same city.
import * as THREE from 'three';
import { makeRng } from './random.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A building facade: base colour, lit window grid, darker ground floor.
export function buildingTexture(seed, base) {
  const rng = makeRng(seed);
  // lit-window layout is decided once so the map and the emissive agree
  const windows = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 5; c++) {
      const lit = rng.chance(0.42);
      windows.push({ x: 10 + c * 22, y: 14 + r * 26, lit, warm: lit ? rng.chance(0.6) : false });
    }
  }
  const map = canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // subtle vertical shading so flat boxes read as shaded volumes
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.28)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.10)'); grad.addColorStop(1, 'rgba(0,0,0,0.30)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (const win of windows) {
      g.fillStyle = win.lit ? (win.warm ? '#ffd98a' : '#bfe3ff') : 'rgba(10,14,22,0.85)';
      g.fillRect(win.x, win.y, 14, 16);
    }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, h - 26, w, 26);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, w, 3);
  });
  // emissive twin: black except the lit windows, so they glow at night
  const emissive = canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#000000'; g.fillRect(0, 0, w, h);
    for (const win of windows) {
      if (!win.lit) continue;
      g.fillStyle = win.warm ? '#ffd98a' : '#bfe3ff';
      g.fillRect(win.x, win.y, 14, 16);
    }
  });
  return { map, emissive };
}

// Shared speckle pass: dusts a canvas with light/dark 2px grains.
function speckle(g, w, h, rng, n, light, dark) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = rng.chance(0.5) ? light : dark;
    g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2);
  }
}

// Asphalt with a faint centre wear line; lane markings are separate meshes.
export function roadTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#3a3d44'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, makeRng(99), 900, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.10)');
  });
}

// Warm beach sand with speckle.
export function sandTexture(seed) {
  const rng = makeRng(seed);
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#d9b380'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, rng, 700, 'rgba(255,240,210,0.20)', 'rgba(120,80,40,0.16)');
  });
}

// A shop sign board ("CAFÉ SOL", "TALLER LUMEN", ...).
export function signTexture(text, bg, fg) {
  return canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = fg; g.font = 'bold 30px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 1);
  });
}

// The Torre Lumen clock face.
export function clockTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#f5ecd0'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#1a1a1a';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath(); g.arc(64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48, 4, 0, Math.PI * 2); g.fill();
    }
    // hands: 6:10, the dawn hour of the finale
    g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 26, 64 + 8); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 - 6, 64 - 40); g.stroke();
    g.fillStyle = '#d2001a'; g.beginPath(); g.arc(64, 64, 6, 0, Math.PI * 2); g.fill();
  });
}

// A soft radial glow sprite (headlights, muzzle flash halo, sun glare).
export function glowTexture(inner, outer) {
  return canvasTexture(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, inner); grad.addColorStop(1, outer);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}
