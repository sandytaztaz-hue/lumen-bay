// LUMEN BAY r8c — procedural canvas textures, rebuilt for BRIGHT DAYTIME
// 12:30. Every surface is painted on a <canvas> at boot from the seeded RNG:
// no image files, no network. Bright sunlit facades with mostly reflective
// blue-glass windows (only a few lit), lighter daylight asphalt, a bright
// turquoise day sea, white clouds, neon signs on dark boards that glow softer
// in daylight, and the big blue → pale-horizon sky gradient + white sun-glow
// sprites the renderer uses.
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
/** Daylight facade: bright sunlit plaster, mostly reflective blue-glass
 windows (daylight sky reflected), only a few lit amber — lights are OFF at
 midday — white frames, sign band + striped awning at street level. */
export function buildingTexture(rng, hue) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = `hsl(${hue}, ${52 + randInt(rng, 0, 14)}%, ${66 + randInt(rng, 0, 10)}%)`;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i += 1) {
    g.fillStyle = `rgba(255,255,255,${0.02 + rng() * 0.05})`;
    g.fillRect(rng() * 256, rng() * 256, 2, 2);
  }
  // Windows: mostly sky-blue reflective glass, a few warm-lit, a few dark.
  const litCols = ['#ffd27a', '#ffb347'];
  const glassCols = ['#7fb8d8', '#9fd0e8', '#6aa8cc', '#a8d8f0'];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const x = 20 + col * 56, y = 18 + row * 44;
      const r = rng();
      const lit = r < 0.12;
      g.fillStyle = lit ? litCols[Math.floor(rng() * litCols.length)]
        : r < 0.2 ? '#2a3a4a' : glassCols[Math.floor(rng() * glassCols.length)];
      g.fillRect(x, y, 38, 30);
      if (lit) {
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x, y, 38, 5);
      } else {
        // Sky glare band across the glass — daylight reflection.
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.fillRect(x, y, 38, 6);
      }
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(x, y, 38, 6);
      g.strokeStyle = '#ffffff'; g.lineWidth = 2;
      g.strokeRect(x, y, 38, 30);
      g.beginPath(); g.moveTo(x + 19, y); g.lineTo(x + 19, y + 30); g.stroke();
      g.beginPath(); g.moveTo(x, y + 15); g.lineTo(x + 38, y + 15); g.stroke();
    }
  }
  // Sign band + striped awning at street level — no blank ground floor.
  g.fillStyle = `hsl(${(hue + 140) % 360}, 75%, 46%)`;
  g.fillRect(0, 208, 256, 18);
  g.fillStyle = '#3a2430';
  g.fillRect(0, 226, 256, 30);
  g.fillStyle = `hsl(${(hue + 180) % 360}, 80%, 55%)`;
  for (let x = 0; x < 256; x += 32) g.fillRect(x, 226, 16, 30);
  return toTexture(c, 1, 1);
}
/** Lighter daylight asphalt: pale centre line, pale edges, crosswalk stripes. */
export function roadTexture(rng) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#55565e'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i += 1) {
    g.fillStyle = `rgba(255,255,255,${rng() * 0.06})`;
    g.fillRect(rng() * 128, rng() * 128, 2, 2);
  }
  g.fillStyle = '#ffd23f';
  g.fillRect(61, 8, 6, 40); g.fillRect(61, 80, 6, 40);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fillRect(4, 0, 3, 128); g.fillRect(121, 0, 3, 128);
  // Crosswalk at the tile edge.
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let x = 8; x < 120; x += 18) g.fillRect(x, 116, 10, 12);
  return toTexture(c, 1, 1);
}
/** Warm dusk sand with speckles and dune ripple. */
export function sandTexture(rng) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#e8c48a'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i += 1) {
    const v = rng();
    g.fillStyle = v < 0.5 ? 'rgba(160,110,50,0.16)' : 'rgba(255,230,180,0.2)';
    g.fillRect(rng() * 128, rng() * 128, 2, 1);
  }
  g.strokeStyle = 'rgba(170,120,60,0.18)';
  for (let i = 0; i < 6; i += 1) {
    g.beginPath(); g.moveTo(0, 10 + i * 20 + rng() * 6);
    g.bezierCurveTo(40, 6 + i * 20, 80, 16 + i * 20, 128, 10 + i * 20); g.stroke();
  }
  return toTexture(c, 8, 8);
}
/** Daylight sea: bright turquoise shading into pale aqua, white sun sparkle
 on the water under the high midday sun. */
export function waterTexture(rng) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#1e9bb5'); grad.addColorStop(0.55, '#3fb8cc'); grad.addColorStop(1, '#8fd8e8');
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
  g.strokeStyle = '#2f6a24'; g.lineWidth = 6; g.lineCap = 'round';
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2 + rng() * 0.3;
    g.beginPath(); g.moveTo(64, 70);
    g.quadraticCurveTo(64 + Math.cos(a) * 42, 70 + Math.sin(a) * 42 - 24, 64 + Math.cos(a) * 60, 70 + Math.sin(a) * 60 - 6);
    g.stroke();
  }
  g.strokeStyle = '#4a9a34'; g.lineWidth = 3;
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    g.beginPath(); g.moveTo(64, 70);
    g.quadraticCurveTo(64 + Math.cos(a) * 36, 70 + Math.sin(a) * 36 - 20, 64 + Math.cos(a) * 52, 70 + Math.sin(a) * 52 - 4);
    g.stroke();
  }
  g.strokeStyle = '#6b4a2a'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(64, 70); g.lineTo(64, 126); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** Striped beach umbrella: pink/red/white radial stripes. */
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
/** White daytime clouds on transparency — bright cumulus puffs, shaded
 pale blue-grey underneath, lit white on top by the high sun. */
export function cloudTexture(rng) {
  const c = makeCanvas(256, 128);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 128);
  for (let i = 0; i < 9; i += 1) {
    const x = 30 + rng() * 196, y = 45 + rng() * 40, r = 18 + rng() * 26;
    const grad = g.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.6, 'rgba(230,242,250,0.55)');
    grad.addColorStop(1, 'rgba(200,220,235,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** The bright daytime sky: vertical gradient deep blue (zenith) → light
 blue → pale near-white horizon, painted for the inside of the sky dome.
 Top of the canvas is the zenith, bottom is the horizon. */
export function daySkyTexture() {
  const c = makeCanvas(64, 512);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#1e6fc0');
  grad.addColorStop(0.3, '#2f7fd0');
  grad.addColorStop(0.55, '#5aa8e0');
  grad.addColorStop(0.78, '#9fd0ec');
  grad.addColorStop(0.92, '#cfe8f5');
  grad.addColorStop(1.0, '#e8f4fa');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** Soft radial glow reused for dust puffs (same cool-white falloff as the
 midday sun). */
export function dustTexture() {
  return sunGlowTexture();
}
/** Soft radial sun glow — a HALO, not a blob: the centre stays dim enough
 that the sun disc reads as the hot core inside it. White daylight halo,
 not the warm orange of dusk. (Also reused for dust.) */
export function sunGlowTexture() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 4, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.3, 'rgba(220,238,255,0.42)');
  grad.addColorStop(0.6, 'rgba(180,215,245,0.18)');
  grad.addColorStop(1, 'rgba(160,200,235,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** A glowing shop sign: bold coloured text on a DARK board — the board stays
 dark so the neon still reads in daylight, but the halo is softer at midday
 (the renderer/city set a lower halo opacity than at dusk). */
export function neonSignTexture(text, colour) {
  const c = makeCanvas(256, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#1c1220'; g.fillRect(0, 0, 256, 64);
  g.font = 'bold 30px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = colour; g.shadowBlur = 14;
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
// ---- r8b: patterned clothes, paved plaza, police lettering, sun streak -----
/** A shirt fabric: solid / stripes / checks / polka dots / print, painted on
 a small canvas from the SEEDED rng so every pedestrian's outfit is stable
 across runs. `pattern` 0 solid, 1 stripes, 2 checks, 3 dots, 4 print. */
export function shirtTexture(rng, base, pattern) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  const alt = pattern === 1 ? 'rgba(255,255,255,0.85)' : pattern === 2 ? 'rgba(20,20,30,0.55)'
    : pattern === 3 ? 'rgba(255,255,255,0.9)' : 'rgba(255,210,63,0.9)';
  if (pattern === 1) { // horizontal stripes
    for (let y = 0; y < 128; y += 22) g.fillRect(0, y, 128, 9);
  } else if (pattern === 2) { // checks / plaid
    for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 12, 128);
    for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 12);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = 0; x < 128; x += 32) g.fillRect(x + 12, 0, 4, 128);
  } else if (pattern === 3) { // polka dots
    for (let y = 16; y < 128; y += 32) for (let x = 16; x < 128; x += 32) {
      g.beginPath(); g.arc(x + ((y / 32) % 2) * 16, y, 8, 0, Math.PI * 2); g.fill();
    }
  } else if (pattern === 4) { // bold print: big flowers / palm blobs
    g.fillStyle = alt;
    for (let i = 0; i < 5; i += 1) {
      const x = 16 + rng() * 96, y = 16 + rng() * 96;
      g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x + 14, y + 6, 7, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(20,60,20,0.7)';
    for (let i = 0; i < 4; i += 1) g.fillRect(10 + rng() * 100, 10 + rng() * 100, 16, 5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** Paved festival plaza: warm terracotta stone tiles with grout lines and
 speckles — a street-festival floor, not a lawn. */
export function plazaTexture(rng) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#b98a5e'; g.fillRect(0, 0, 256, 256);
  const tiles = ['#c99a6b', '#b98a5e', '#d8ab7d', '#a87a4e', '#c48a5a'];
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) {
    g.fillStyle = tiles[Math.floor(rng() * tiles.length)];
    g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
  }
  g.strokeStyle = 'rgba(60,35,20,0.5)'; g.lineWidth = 2;
  for (let i = 0; i <= 8; i += 1) {
    g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * 32); g.lineTo(256, i * 32); g.stroke();
  }
  for (let i = 0; i < 500; i += 1) {
    g.fillStyle = `rgba(255,220,170,${rng() * 0.12})`;
    g.fillRect(rng() * 256, rng() * 256, 2, 2);
  }
  return toTexture(c, 10, 10);
}
/** Bold "POLICE" door lettering on a transparent canvas (white text, dark
 outline) — the cruiser's readable marking, like the top-3 police cars. */
export function policeTextTexture(text) {
  const c = makeCanvas(256, 64);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 64);
  g.font = 'bold 44px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#111111';
  g.strokeText(text, 128, 34);
  g.fillStyle = '#ffffff';
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** Horizontal anamorphic sun streak: a thin bright bar with a soft falloff,
 painted for the white daylight glare across the sun disc (top-3 style). */
export function sunStreakTexture() {
  const c = makeCanvas(256, 32);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.95)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 32);
  const grad2 = g.createLinearGradient(0, 0, 0, 32);
  grad2.addColorStop(0, 'rgba(255,255,255,0)');
  grad2.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  grad2.addColorStop(1, 'rgba(255,255,255,0)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = grad2; g.fillRect(0, 0, 256, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
