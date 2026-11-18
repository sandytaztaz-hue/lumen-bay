// Procedural textures, all painted on canvases at boot — no image files,
// no network, no downloads. Every texture is seeded, so the city looks
// identical on every run and every screenshot.
import * as THREE from 'three';
import { makeRng } from './random.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function canvasTexture(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Warm stucco wall with a grid of windows, some lit gold for dusk. */
export function paintFacade(base, seed, floors = 6, cols = 5) {
  const rng = makeRng(seed);
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
    g.fillRect(rng() * 256, rng() * 256, 2, 2);
  }
  const cw = 256 / cols;
  const ch = 256 / floors;
  for (let f = 0; f < floors; f++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw + cw * 0.22;
      const y = f * ch + ch * 0.22;
      const w = cw * 0.56;
      const h = ch * 0.52;
      const lit = rng();
      g.fillStyle = '#241a2e';
      g.fillRect(x - 2, y - 2, w + 4, h + 4);
      g.fillStyle = lit < 0.45 ? '#ffd76b' : lit < 0.7 ? '#9fd8ff' : '#3a2f45';
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x, y, w, 2);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(x, y + h - 2, w, 2); // sill shadow under each window
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 0, 256, 8); // roofline shadow
  return canvasTexture(c);
}

/** Asphalt with a dashed yellow centre line and worn white edges. */
export function paintRoad() {
  const [c, g] = makeCanvas(128, 256);
  g.fillStyle = '#464152';
  g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 300; i++) {
    const v = (i * 2654435761) % 3;
    g.fillStyle = v === 0 ? 'rgba(0,0,0,0.12)' : v === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    g.fillRect((i * 37) % 128, (i * 53) % 256, 2, 2);
  }
  g.fillStyle = '#ffd23e';
  for (const y of [0, 80, 160, 240]) g.fillRect(62, y, 4, y === 240 ? 16 : 40);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(6, 0, 3, 256);
  g.fillRect(119, 0, 3, 256);
  return canvasTexture(c, 1, 8);
}

/** Paving slabs for sidewalks, plazas and the tower square. */
export function paintPavement() {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = '#8d8578';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i * 32); g.lineTo(128, i * 32); g.stroke();
  }
  return canvasTexture(c, 6, 6);
}

/** Warm beach sand with shell speckles. */
export function paintSand(seed) {
  const rng = makeRng(seed);
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = '#f2d49b';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(180,140,80,0.35)' : 'rgba(255,255,255,0.4)';
    g.fillRect(rng() * 128, rng() * 128, 2, 1);
  }
  return canvasTexture(c, 10, 10);
}

/** A glowing neon sign board with a district name on it. */
export function paintSign(text, fg = '#ffd23e', bg = '#1a0f2e') {
  const [c, g] = makeCanvas(512, 128);
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg;
  g.lineWidth = 6;
  g.strokeRect(6, 6, 500, 116);
  g.fillStyle = fg;
  g.font = '900 56px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  return canvasTexture(c);
}

/** Soft round blob — the fake shadow under cars, people and crates. */
export function paintBlob() {
  const [c, g] = makeCanvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return canvasTexture(c);
}

/** Ocean surface: deep teal with slow white sparkle strokes. */
export function paintOcean(seed) {
  const rng = makeRng(seed);
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#0e6f8f';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i++) {
    g.strokeStyle = rng() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,40,70,0.25)';
    g.lineWidth = 1 + rng() * 2;
    const x = rng() * 256;
    const y = rng() * 256;
    const len = 8 + rng() * 22;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
  }
  return canvasTexture(c, 8, 8);
}
