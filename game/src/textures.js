// LUMEN BAY — textures.js
// Every surface texture is painted on a canvas at load, seeded so the
// same seed paints the same city. No image assets anywhere.

import * as THREE from 'three';

function canvasTexture(w, h, painter) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  painter(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Building facade: base colour, vertical shading, a 9x5 window grid with
// about 42% lit, a darker ground floor band and a light top edge.
// Returns { map, emissive } — the emissive twin is black except lit
// windows, so windows glow at night.
export function facadeTexture(baseColor, rng) {
  const lit = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 5; c++) {
      lit.push(rng.chance(0.42));
    }
  }
  const warm = [];
  for (let i = 0; i < 45; i++) warm.push(rng.chance(0.7));
  const map = canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0.16)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    let i = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 5; c++) {
        const x = 8 + c * 24;
        const y = 14 + r * 26;
        if (lit[i]) {
          ctx.fillStyle = warm[i] ? '#ffd98a' : '#9fc4e8';
        } else {
          ctx.fillStyle = '#14161c';
        }
        ctx.fillRect(x, y, 14, 16);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeRect(x, y, 14, 16);
        i++;
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(0, h - 26, w, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, 0, w, 4);
  });
  const emissive = canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    let i = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 5; c++) {
        if (lit[i]) {
          ctx.fillStyle = warm[i] ? '#ffb84d' : '#6fa8d8';
          ctx.fillRect(8 + c * 24, 14 + r * 26, 14, 16);
        }
        i++;
      }
    }
  });
  return { map, emissive };
}

export function roadTexture(rng) {
  const tex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#23252b';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const g = rng.int(0, 1);
      ctx.fillStyle = g ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.16)';
      ctx.fillRect(rng.int(0, w - 2), rng.int(0, h - 2), 2, 2);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function sandTexture(rng) {
  const tex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e3c98f';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const g = rng.int(0, 1);
      ctx.fillStyle = g ? 'rgba(255,244,214,0.25)' : 'rgba(146,110,58,0.22)';
      ctx.fillRect(rng.int(0, w - 2), rng.int(0, h - 2), 2, 2);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function signTexture(text, bg, fg) {
  return canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = fg;
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 1);
  });
}

// Torre Lumen clock face: cream face, dark ring, 12 hour dots,
// hands at 6:10, red centre dot.
export function clockTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const cx = 64;
    const cy = 64;
    ctx.fillStyle = '#f4ecd4';
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a2118';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#2a2118';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const r = 50;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Hour hand: 6:10 -> just past 6. Minute hand: 10 minutes -> at 2.
    const hourA = ((6 + 10 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    const minA = (10 / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#1c1712';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hourA) * 28, cy + Math.sin(hourA) * 28);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(minA) * 46, cy + Math.sin(minA) * 46);
    ctx.stroke();
    ctx.fillStyle = '#c22a1e';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Radial glow sprite: solid centre colour fading to transparent.
export function glowTexture(color) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

// Build the shared texture set once per load.
export function makeTextures(rng) {
  const facadeRng = rng.fork('facades');
  const facades = {};
  const facadeList = [
    '#c96f4a', '#d9a441', '#9caf88', '#f2e3c6',
    '#7d94a8', '#a8543f', '#b5c48a', '#c9b8d9',
  ];
  for (const c of facadeList) facades[c] = facadeTexture(c, facadeRng);
  return {
    facades,
    road: roadTexture(rng.fork('road')),
    sand: sandTexture(rng.fork('sand')),
    clock: clockTexture(),
    glowWhite: glowTexture('rgba(255,244,200,1)'),
    glowWarm: glowTexture('rgba(255,190,90,1)'),
    glowRed: glowTexture('rgba(255,60,50,1)'),
    glowBlue: glowTexture('rgba(80,140,255,1)'),
    glowHeadlight: glowTexture('rgba(255,246,220,1)'),
    sign(text, bg, fg) {
      return signTexture(text, bg, fg);
    },
  };
}
