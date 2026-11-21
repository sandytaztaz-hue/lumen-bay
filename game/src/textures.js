// LUMEN BAY — procedural canvas textures. Every texture in the game is
// painted here from a seeded RNG: no image files, no network. Each function
// returns a THREE.CanvasTexture ready to drop on a material.
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Building facade: warm plaster + a grid of lit blue-glass windows. */
export function buildingTexture(rng, hue) {
  const [c, g] = makeCanvas(256, 256);
  const h = hue === undefined ? 40 : hue;
  g.fillStyle = `hsl(${h}, 45%, 78%)`;
  g.fillRect(0, 0, 256, 256);
  // Plaster noise.
  for (let i = 0; i < 900; i += 1) {
    g.fillStyle = `hsla(${h}, 30%, ${55 + Math.floor(rng() * 30)}%, 0.25)`;
    g.fillRect(Math.floor(rng() * 256), Math.floor(rng() * 256), 3, 3);
  }
  // Window grid: dark frames, blue glass, some lit warm.
  for (let y = 14; y < 246; y += 34) {
    for (let x = 14; x < 246; x += 42) {
      g.fillStyle = '#2a2f3a';
      g.fillRect(x - 2, y - 2, 30, 24);
      const lit = rng() < 0.35;
      g.fillStyle = lit ? '#ffd98a' : (rng() < 0.5 ? '#7fb8d8' : '#4d7a9e');
      g.fillRect(x, y, 26, 20);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(x, y, 26, 4);
    }
  }
  // Ground-floor shop band.
  g.fillStyle = '#3a2a3a';
  g.fillRect(0, 226, 256, 30);
  return toTexture(c);
}

/** Asphalt with a dashed centre line and worn patches. */
export function roadTexture(rng) {
  const [c, g] = makeCanvas(128, 256);
  g.fillStyle = '#4a4b52';
  g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 500; i += 1) {
    g.fillStyle = `rgba(0,0,0,${0.05 + rng() * 0.12})`;
    g.fillRect(Math.floor(rng() * 128), Math.floor(rng() * 256), 4, 4);
  }
  g.fillStyle = '#e8d44d';
  for (let y = 0; y < 256; y += 64) g.fillRect(62, y + 8, 4, 34);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fillRect(4, 0, 3, 256);
  g.fillRect(121, 0, 3, 256);
  return toTexture(c);
}

/** Beach sand: warm tan with speckles and a few shells. */
export function sandTexture(rng) {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#f0d49a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i += 1) {
    g.fillStyle = `hsla(38, 60%, ${55 + Math.floor(rng() * 30)}%, 0.5)`;
    g.fillRect(Math.floor(rng() * 256), Math.floor(rng() * 256), 2, 2);
  }
  for (let i = 0; i < 12; i += 1) {
    g.fillStyle = '#fff8e8';
    g.beginPath();
    g.arc(Math.floor(rng() * 256), Math.floor(rng() * 256), 2 + rng() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return toTexture(c);
}

/** Sea water: turquoise with moving-looking wave streaks. */
export function waterTexture(rng) {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#1e9bb5';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i += 1) {
    g.strokeStyle = `rgba(255,255,255,${0.08 + rng() * 0.18})`;
    g.lineWidth = 1 + rng() * 2;
    const y = Math.floor(rng() * 256);
    g.beginPath();
    g.moveTo(Math.floor(rng() * 120), y);
    g.lineTo(120 + Math.floor(rng() * 136), y + (rng() - 0.5) * 8);
    g.stroke();
  }
  return toTexture(c);
}

/** Palm frond fan, painted on transparency for the palm crowns. */
export function palmTexture(rng) {
  const [c, g] = makeCanvas(128, 128);
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = '#2f7a2a';
  g.lineWidth = 7;
  g.lineCap = 'round';
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2;
    g.beginPath();
    g.moveTo(64, 64);
    g.quadraticCurveTo(
      64 + Math.cos(a) * 40, 64 + Math.sin(a) * 40 - 12,
      64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58 + 14,
    );
    g.stroke();
  }
  return toTexture(c);
}

/** Beach umbrella: alternating bright panels. */
export function umbrellaTexture(rng) {
  const [c, g] = makeCanvas(128, 128);
  const cols = ['#ff2a5e', '#ffd23f', '#19b8c4', '#ffffff'];
  for (let i = 0; i < 8; i += 1) {
    g.fillStyle = cols[(i + Math.floor(rng() * 4)) % 4];
    g.beginPath();
    g.moveTo(64, 64);
    g.arc(64, 64, 62, (i / 8) * Math.PI * 2, ((i + 1) / 8) * Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(64, 64, 6, 0, Math.PI * 2);
  g.fill();
  return toTexture(c);
}

/** Soft white cloud puff on transparency. */
export function cloudTexture(rng) {
  const [c, g] = makeCanvas(128, 64);
  g.clearRect(0, 0, 128, 64);
  for (let i = 0; i < 7; i += 1) {
    const x = 20 + rng() * 88;
    const y = 26 + rng() * 16;
    const r = 12 + rng() * 14;
    const grad = g.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return toTexture(c);
}

function skyGradient(stops) {
  const [c, g] = makeCanvas(4, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  for (const [t, col] of stops) grad.addColorStop(t, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  return toTexture(c);
}

export function daySkyTexture() {
  return skyGradient([[0, '#2f7fd0'], [0.55, '#7fb8e8'], [0.8, '#cfe8f5'], [1, '#e8f4f8']]);
}

export function sunsetSkyTexture() {
  return skyGradient([[0, '#3a1a5e'], [0.4, '#c94a6a'], [0.65, '#ff8c2a'], [0.85, '#ffc46b'], [1, '#ffe9b0']]);
}

export function nightSkyTexture() {
  const [c, g] = makeCanvas(256, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#02040a');
  grad.addColorStop(0.55, '#0a1428');
  grad.addColorStop(0.85, '#1a2a4a');
  grad.addColorStop(1, '#2a3a5e');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 512);
  // Baked stars.
  for (let i = 0; i < 220; i += 1) {
    const x = (i * 37) % 256;
    const y = (i * 91) % 330;
    const b = 0.4 + ((i * 13) % 10) / 16;
    g.fillStyle = `rgba(255,255,255,${b})`;
    g.fillRect(x, y, (i % 3) === 0 ? 2 : 1, (i % 3) === 0 ? 2 : 1);
  }
  return toTexture(c);
}

export function dawnSkyTexture() {
  return skyGradient([[0, '#7a6a9e'], [0.4, '#c98a9e'], [0.65, '#ff9a7a'], [0.85, '#ffc4a0'], [1, '#ffe9c8']]);
}

/** Soft round glow (halo sprite / dust / mist). */
export function dustTexture() {
  return sunGlowTexture();
}

export function sunGlowTexture() {
  const [c, g] = makeCanvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return toTexture(c);
}

/** A neon shop sign: glowing text on a dark plate. */
export function neonSignTexture(text, colour) {
  const [c, g] = makeCanvas(256, 64);
  g.fillStyle = '#14101c';
  g.fillRect(0, 0, 256, 64);
  g.strokeStyle = colour || '#ff4d8d';
  g.lineWidth = 3;
  g.strokeRect(3, 3, 250, 58);
  g.font = '900 30px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = colour || '#ff4d8d';
  g.shadowBlur = 14;
  g.fillStyle = colour || '#ff4d8d';
  g.fillText((text || 'NEON').slice(0, 14), 128, 34);
  return toTexture(c);
}

export function lanternTexture() {
  const [c, g] = makeCanvas(64, 64);
  g.fillStyle = '#ff2a5e';
  g.beginPath();
  g.ellipse(32, 32, 22, 28, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffd23f';
  g.fillRect(26, 2, 12, 6);
  g.fillRect(26, 56, 12, 6);
  g.strokeStyle = '#ffd23f';
  g.lineWidth = 2;
  for (let y = 12; y < 54; y += 10) {
    g.beginPath();
    g.moveTo(12, y);
    g.lineTo(52, y);
    g.stroke();
  }
  return toTexture(c);
}

export function makeLanternMaterial() {
  return new THREE.MeshBasicMaterial({ map: lanternTexture(), transparent: true });
}

/** Patterned shirt: solid / stripes / checks / dots / print. */
export function shirtTexture(rng, base, pattern) {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = base || '#ff2a5e';
  g.fillRect(0, 0, 128, 128);
  const p = pattern === undefined ? 0 : pattern;
  if (p === 1) {
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let x = 0; x < 128; x += 18) g.fillRect(x, 0, 7, 128);
  } else if (p === 2) {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = 0; x < 128; x += 24) {
      g.fillRect(x, 0, 6, 128);
      g.fillRect(0, x, 128, 6);
    }
  } else if (p === 3) {
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let y = 12; y < 128; y += 22) {
      for (let x = 12; x < 128; x += 22) {
        g.beginPath();
        g.arc(x, y, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
  } else if (p === 4) {
    g.fillStyle = '#ffd23f';
    g.font = '900 44px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('★', 64, 78);
  }
  // Fabric noise.
  for (let i = 0; i < 200; i += 1) {
    g.fillStyle = `rgba(0,0,0,${0.03 + rng() * 0.06})`;
    g.fillRect(Math.floor(rng() * 128), Math.floor(rng() * 128), 3, 3);
  }
  return toTexture(c);
}

/** Terracotta plaza tiles for Festival Square. */
export function plazaTexture(rng) {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#c98a5a';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      const l = 55 + Math.floor(rng() * 18);
      g.fillStyle = `hsl(24, 55%, ${l}%)`;
      g.fillRect(x + 1, y + 1, 30, 30);
    }
  }
  return toTexture(c);
}

/** POLICE door text on transparency, for cruiser flanks. */
export function policeTextTexture(text) {
  const [c, g] = makeCanvas(256, 64);
  g.clearRect(0, 0, 256, 64);
  g.font = '900 40px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#0d1a3a';
  g.fillText(text || 'POLICE', 128, 34);
  return toTexture(c);
}

/** Horizontal anamorphic glare streak for the sun disc. */
export function sunStreakTexture() {
  const [c, g] = makeCanvas(256, 32);
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 32);
  return toTexture(c);
}
