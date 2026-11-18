// Procedural textures, all drawn on canvas at boot — no image files, no
// network. Seeded, so the city looks identical on every run.
import * as THREE from 'three';
import { mulberry32 } from './random.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A building face: warm stucco + a grid of windows, some lit gold. */
export function facadeTexture(base, seed, floors = 6, cols = 5) {
  const random = mulberry32(seed);
  const [c, g] = canvas(256, 256);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  // stucco speckle
  for (let i = 0; i < 500; i++) {
    g.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
    g.fillRect(random() * 256, random() * 256, 2, 2);
  }
  const cw = 256 / cols, ch = 256 / floors;
  for (let f = 0; f < floors; f++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw + cw * 0.22, y = f * ch + ch * 0.22;
      const w = cw * 0.56, h = ch * 0.52;
      const lit = random();
      g.fillStyle = '#241a2e';
      g.fillRect(x - 2, y - 2, w + 4, h + 4);
      g.fillStyle = lit < 0.45 ? '#ffd76b' : lit < 0.7 ? '#9fd8ff' : '#3a2f45';
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x, y, w, 2);
    }
  }
  // roofline shadow
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 256, 8);
  return toTexture(c);
}

/** Asphalt with a dashed centre line and worn edges. */
export function roadTexture() {
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#464152'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = randomShade(i);
    g.fillRect((i * 37) % 128, (i * 53) % 256, 2, 2);
  }
  g.fillStyle = '#ffd23e';
  g.fillRect(62, 0, 4, 40); g.fillRect(62, 80, 4, 40); g.fillRect(62, 160, 4, 40); g.fillRect(62, 240, 4, 16);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(6, 0, 3, 256); g.fillRect(119, 0, 3, 256);
  return toTexture(c, 1, 8);
}

function randomShade(i) {
  const v = (i * 2654435761) % 3;
  return v === 0 ? 'rgba(0,0,0,0.12)' : v === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
}

/** Paving slabs for sidewalks and plazas. */
export function sidewalkTexture() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#8d8578'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i * 32); g.lineTo(128, i * 32); g.stroke();
  }
  return toTexture(c, 6, 6);
}

/** Warm sand with a few shell speckles. */
export function sandTexture(seed) {
  const random = mulberry32(seed);
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#f2d49b'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = random() < 0.5 ? 'rgba(180,140,80,0.35)' : 'rgba(255,255,255,0.4)';
    g.fillRect(random() * 128, random() * 128, 2, 1);
  }
  return toTexture(c, 10, 10);
}

/** A neon sign board with the district name, for the Torre and the marina. */
export function signTexture(text, fg = '#ffd23e', bg = '#1a0f2e') {
  const [c, g] = canvas(512, 128);
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
  g.fillStyle = fg;
  g.font = '900 56px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  return toTexture(c);
}

/** Soft round blob used as a fake shadow under cars and people. */
export function blobTexture() {
  const [c, g] = canvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return toTexture(c);
}

/** Ocean surface: deep teal with a slow sparkle. */
export function oceanTexture(seed) {
  const random = mulberry32(seed);
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#0e6f8f'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i++) {
    g.strokeStyle = random() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,40,70,0.25)';
    g.lineWidth = 1 + random() * 2;
    const x = random() * 256, y = random() * 256, len = 8 + random() * 22;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
  }
  return toTexture(c, 8, 8);
}
