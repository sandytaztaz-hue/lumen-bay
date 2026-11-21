// LUMEN BAY — procedural canvas textures. Every building face, road and
// patch of sand is painted at load time from a seeded generator, so the
// game ships zero image assets and still reads as a real place.

import { makeRng, range, intRange, pick } from './random.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// A building facade: warm plaster, a grid of windows (some lit gold for
// night), a darker ground floor with a shopfront band.
export function buildingTexture(seed, base) {
  const rng = makeRng(seed);
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  // plaster noise
  for (let i = 0; i < 900; i += 1) {
    g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    g.fillRect(Math.floor(rng() * 256), Math.floor(rng() * 256), 2, 2);
  }
  const floors = intRange(rng, 4, 7);
  const cols = intRange(rng, 4, 6);
  const cw = 256 / cols, ch = 200 / floors;
  for (let f = 0; f < floors; f += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * cw + cw * 0.22, y = 12 + f * ch + ch * 0.2;
      const lit = rng() < 0.42;
      g.fillStyle = lit ? '#ffd98a' : (rng() < 0.5 ? '#1d2733' : '#2b3a4a');
      g.fillRect(x, y, cw * 0.56, ch * 0.55);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(x, y, cw * 0.56, 3);
      if (lit) {
        g.fillStyle = 'rgba(255,217,138,0.25)';
        g.fillRect(x - 3, y - 3, cw * 0.56 + 6, ch * 0.55 + 6);
      }
    }
  }
  // ground-floor shopfront
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, 212, 256, 44);
  g.fillStyle = pick(rng, ['#ff5a3c', '#2ec4b6', '#f2b705', '#7a4a8a']);
  g.fillRect(0, 212, 256, 8);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.font = 'bold 15px sans-serif';
  g.textAlign = 'center';
  g.fillText(pick(rng, ['MERCADO', 'TALLER', 'CAFÉ SOL', 'CASINO', 'FARMACIA', 'TACOS']), 128, 240);
  return { canvas: c };
}

// Asphalt with a worn centre and faint tyre tracks. Lane paint is drawn
// as geometry in city.js so it stays crisp at any distance.
export function roadTexture(seed) {
  const rng = makeRng(seed);
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#33363d';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i += 1) {
    g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
    g.fillRect(Math.floor(rng() * 256), Math.floor(rng() * 256), 2, 2);
  }
  g.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 6; i += 1) {
    const y = 30 + i * 38 + rng() * 8;
    g.fillRect(0, y, 256, 5);
  }
  return { canvas: c };
}

export function sandTexture(seed) {
  const rng = makeRng(seed);
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#d9b380';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2200; i += 1) {
    g.fillStyle = rng() < 0.5 ? 'rgba(255,240,210,0.16)' : 'rgba(120,85,40,0.12)';
    g.fillRect(Math.floor(rng() * 256), Math.floor(rng() * 256), 2, 2);
  }
  return { canvas: c };
}

export function grassTexture(seed) {
  const rng = makeRng(seed);
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#3f6b3a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i += 1) {
    g.fillStyle = rng() < 0.5 ? 'rgba(120,180,90,0.15)' : 'rgba(20,50,20,0.15)';
    g.fillRect(Math.floor(rng() * 256), Math.floor(rng() * 256), 2, 3);
  }
  return { canvas: c };
}

// Round soft glow sprite (headlights, lamps, muzzle flash core).
export function glowTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,240,190,0.55)');
  grad.addColorStop(1, 'rgba(255,240,190,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return { canvas: c };
}

// Muzzle flash starburst: 8 thin rays on a transparent canvas.
export function flashTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.translate(64, 64);
  for (let i = 0; i < 8; i += 1) {
    g.rotate(Math.PI / 4);
    const grad = g.createLinearGradient(0, 0, 62, 0);
    grad.addColorStop(0, 'rgba(255,250,200,1)');
    grad.addColorStop(1, 'rgba(255,160,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, -3.5); g.lineTo(62, 0); g.lineTo(0, 3.5);
    g.closePath(); g.fill();
  }
  g.fillStyle = '#fff8d0';
  g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.fill();
  return { canvas: c };
}

// Clock face for the Torre Lumen tower.
export function clockTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#f5efdd';
  g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#222'; g.lineWidth = 5;
  g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#222';
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.arc(64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48, i % 3 === 0 ? 5 : 3, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#222'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 26, 64 - 30); g.stroke();
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(64, 64); g.lineTo(64 - 34, 64 + 8); g.stroke();
  return { canvas: c };
}

// Turn a painted canvas into a THREE.CanvasTexture. The THREE namespace
// is passed in by the caller so this module stays renderer-agnostic.
export function toTexture(THREE, painted, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(painted.canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
