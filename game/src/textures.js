// LUMEN BAY — procedural canvas textures.
// Every texture is painted at load from the seeded RNG: building facades with
// windows and neon shop signs, asphalt with lane markings, sand, water and
// palm fronds. No external images, no network requests at runtime.
import * as THREE from 'three';
import { PALETTE } from './config.js';

function makeCanvas(width, height, painter) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  painter(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function hexCss(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

// A building facade: warm plaster, rows of lit windows, a neon shop sign band.
export function buildingTexture(random, baseColor, neonColor) {
  return makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = hexCss(baseColor);
    ctx.fillRect(0, 0, w, h);
    // Subtle plaster noise.
    for (let i = 0; i < 500; i += 1) {
      const shade = random.next() * 0.08;
      ctx.fillStyle = random.chance(0.5) ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${shade})`;
      ctx.fillRect(random.next() * w, random.next() * h, 3, 3);
    }
    // Window grid, some lit gold by the sunset.
    const cols = 5;
    const rows = 7;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = 18 + c * 46;
        const y = 22 + r * 30;
        const lit = random.chance(0.45);
        ctx.fillStyle = lit ? '#ffd27a' : '#2c3550';
        ctx.fillRect(x, y, 26, 18);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeRect(x, y, 26, 18);
        if (lit) {
          ctx.fillStyle = 'rgba(255,210,122,0.25)';
          ctx.fillRect(x - 3, y - 3, 32, 24);
        }
      }
    }
    // Ground-floor shop band with a neon sign.
    ctx.fillStyle = 'rgba(20,16,28,0.85)';
    ctx.fillRect(0, h - 34, w, 34);
    ctx.fillStyle = hexCss(neonColor);
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    const signs = ['TACOS', 'BAR', 'CAFE', 'TIENDA', 'HOTEL', 'SURF', 'PIZZA', 'CLUB'];
    ctx.fillText(random.pick(signs), w / 2, h - 10);
  });
}

// Asphalt with a dashed centre line and worn edges.
export function roadTexture(random) {
  return makeCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETTE.asphalt);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${random.next() * 0.05})`;
      ctx.fillRect(random.next() * w, random.next() * h, 2, 2);
    }
    ctx.fillStyle = '#e8d27a';
    ctx.fillRect(w / 2 - 2, 0, 4, 40);
    ctx.fillRect(w / 2 - 2, 64, 4, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(4, 0, 2, h);
    ctx.fillRect(w - 6, 0, 2, h);
  });
}

// Warm beach sand with speckles and a few shells.
export function sandTexture(random) {
  return makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETTE.sand);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i += 1) {
      const s = random.next();
      ctx.fillStyle = s < 0.5 ? 'rgba(120,80,30,0.12)' : 'rgba(255,255,255,0.18)';
      ctx.fillRect(random.next() * w, random.next() * h, 2, 2);
    }
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = random.pick(['#fff', '#ffb6c1', '#ffe4b5']);
      ctx.beginPath();
      ctx.arc(random.next() * w, random.next() * h, 3 + random.next() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// Ocean water: deep teal with sun-glint streaks and slow wave lines.
export function waterTexture(random) {
  return makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETTE.water);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i += 1) {
      ctx.strokeStyle = `rgba(255,220,150,${0.05 + random.next() * 0.12})`;
      ctx.lineWidth = 1 + random.next() * 2;
      ctx.beginPath();
      const y = random.next() * h;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + random.range(-14, 14), w * 0.7, y + random.range(-14, 14), w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${random.next() * 0.08})`;
      ctx.fillRect(random.next() * w, random.next() * h, 8 + random.next() * 20, 1);
    }
  });
}

// A palm frond sprite, painted as a star of long leaves.
export function palmTexture(random) {
  return makeCanvas(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    for (let i = 0; i < 9; i += 1) {
      const angle = (i / 9) * Math.PI * 2 + random.range(-0.15, 0.15);
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = random.chance(0.5) ? '#2f7d4f' : '#3a9a5c';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(34, -10, 60, -4);
      ctx.quadraticCurveTo(34, 8, 0, 4);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#6b4a2a';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Sidewalk / plaza paving in warm terracotta tiles.
export function plazaTexture(random) {
  return makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c98a5e';
    ctx.fillRect(0, 0, w, h);
    const tile = 32;
    for (let y = 0; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        const v = random.next() * 0.12;
        ctx.fillStyle = random.chance(0.5) ? `rgba(255,220,180,${v})` : `rgba(90,40,20,${v})`;
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      }
    }
  });
}

// Build the whole texture set once, from one seeded stream.
export function makeTextures(random) {
  const buildings = [];
  for (let i = 0; i < PALETTE.building.length; i += 1) {
    buildings.push(buildingTexture(random, PALETTE.building[i], PALETTE.neon[i % PALETTE.neon.length]));
  }
  return {
    buildings,
    road: roadTexture(random),
    sand: sandTexture(random),
    water: waterTexture(random),
    palm: palmTexture(random),
    plaza: plazaTexture(random),
  };
}
