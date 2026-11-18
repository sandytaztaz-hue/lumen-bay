// LUMEN BAY — the HUD: minimap, wanted stars, health/armour, cash, speed,
// weapon, objective banner, event log, radio station, golden-hour clock,
// plus the title screen, pause menu and job-done banner. All DOM, drawn over
// the WebGL canvas, legible at 1280x720.
import { GOLDEN_HOUR, LANDMARKS, STREET_LINES } from './config.js';

export function createHud() {
  const root = document.getElementById('hud');
  root.innerHTML = `
    <div id="hud-top-left">
      <canvas id="minimap" width="190" height="190"></canvas>
      <div id="wanted"></div>
    </div>
    <div id="hud-top-right">
      <div id="cash">$0</div>
      <div id="clock">${GOLDEN_HOUR} · GOLDEN HOUR</div>
      <div id="radio">LUMEN FM 88.4 — Sunset Synth</div>
    </div>
    <div id="objective"></div>
    <div id="hud-bottom-left">
      <div class="bar-row"><span class="bar-label">HEALTH</span><div class="bar"><div id="health-fill"></div></div></div>
      <div class="bar-row"><span class="bar-label">ARMOUR</span><div class="bar"><div id="armour-fill"></div></div></div>
      <div id="weapon">PISTOL · ∞</div>
    </div>
    <div id="hud-bottom-right">
      <div id="speed">0</div>
      <div id="speed-unit">km/h</div>
    </div>
    <div id="event-log"></div>
    <div id="banner"></div>
    <div id="damage-layer"></div>
    <div id="title-screen">
      <h1>LUMEN BAY</h1>
      <h2>Sunset Getaway</h2>
      <p class="tagline">12 story missions in Puerto Lumen — steal cars, outrun 5-star police, escape the helicopter.</p>
      <p class="crew">Mara Solis · Tio Reyes · Lena Cruz · Big Dario</p>
      <div id="title-buttons"></div>
      <p class="controls">WASD move / drive · Mouse look &amp; click to shoot · E enter car · Shift sprint · Space handbrake · 1/2 weapons · M start job · R radio · Esc pause</p>
    </div>
    <div id="pause-screen"><h2>PAUSED</h2><p>Esc to resume · M for the next job · R to change radio</p></div>
    <div id="end-screen"></div>`;
  const hud = {
    root,
    minimap: document.getElementById('minimap'),
    wantedEl: document.getElementById('wanted'),
    cashEl: document.getElementById('cash'),
    radioEl: document.getElementById('radio'),
    objectiveEl: document.getElementById('objective'),
    healthFill: document.getElementById('health-fill'),
    armourFill: document.getElementById('armour-fill'),
    weaponEl: document.getElementById('weapon'),
    speedEl: document.getElementById('speed'),
    logEl: document.getElementById('event-log'),
    bannerEl: document.getElementById('banner'),
    damageLayer: document.getElementById('damage-layer'),
    titleScreen: document.getElementById('title-screen'),
    titleButtons: document.getElementById('title-buttons'),
    pauseScreen: document.getElementById('pause-screen'),
    endScreen: document.getElementById('end-screen'),
    logLines: [],
  };
  return hud;
}

export function setWanted(hud, stars) {
  let html = '';
  for (let i = 0; i < 5; i += 1) html += `<span class="star ${i < stars ? 'on' : ''}">★</span>`;
  hud.wantedEl.innerHTML = html;
}

export function setVitals(hud, health, armour) {
  hud.healthFill.style.width = `${Math.max(0, Math.min(100, health))}%`;
  hud.armourFill.style.width = `${Math.max(0, Math.min(100, armour))}%`;
}

export function setCash(hud, cash) {
  hud.cashEl.textContent = `$${Math.floor(cash).toLocaleString('en-US')}`;
}

export function setSpeed(hud, kmh) {
  hud.speedEl.textContent = String(Math.round(kmh));
}

export function setWeapon(hud, name, ammo) {
  hud.weaponEl.textContent = `${name.toUpperCase()} · ${ammo}`;
}

export function setRadio(hud, name) {
  hud.radioEl.textContent = name;
}

export function setObjective(hud, text) {
  if (hud.objectiveEl.textContent !== text) hud.objectiveEl.textContent = text;
}

export function logEvent(hud, message) {
  hud.logLines.push(message);
  if (hud.logLines.length > 6) hud.logLines.shift();
  hud.logEl.innerHTML = hud.logLines.map((l) => `<div>${l}</div>`).join('');
}

// Big centre banner (job done, busted, wasted, mission start).
export function showBanner(hud, title, sub, ms) {
  hud.bannerEl.innerHTML = `<div class="banner-title">${title}</div><div class="banner-sub">${sub || ''}</div>`;
  hud.bannerEl.classList.add('show');
  window.clearTimeout(hud._bannerTimer);
  hud._bannerTimer = window.setTimeout(() => hud.bannerEl.classList.remove('show'), ms || 2600);
}

export function hideBanner(hud) {
  hud.bannerEl.classList.remove('show');
}

// Floating damage numbers over the 3D hit point, projected to screen space.
export function damageNumber(hud, screenX, screenY, text, color) {
  const el = document.createElement('div');
  el.className = 'damage-number';
  el.textContent = text;
  el.style.left = `${screenX}px`;
  el.style.top = `${screenY}px`;
  el.style.color = color || '#ffd27a';
  hud.damageLayer.appendChild(el);
  window.setTimeout(() => el.remove(), 900);
}

// Minimap: roads, beach, landmarks, player arrow, mission marker, police blips,
// helicopter icon, traffic dots. North is up; the island is 480x480.
export function drawMinimap(hud, state) {
  const canvas = hud.minimap;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / 520;
  const toMap = (x, z) => [(x + 260) * scale, (z + 260) * scale];
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#1e6f8e';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#7fae6e';
  const [gx, gy] = toMap(-240, -240);
  ctx.fillRect(gx, gy, 480 * scale, 480 * scale);
  ctx.fillStyle = '#e8c98a';
  ctx.fillRect(gx, gy + 380 * scale, 480 * scale, 100 * scale);
  ctx.strokeStyle = '#3a3a44';
  ctx.lineWidth = 5;
  for (const line of STREET_LINES) {
    const [ax] = toMap(line, 0);
    ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, size); ctx.stroke();
    const [, ay] = toMap(0, line);
    ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(size, ay); ctx.stroke();
  }
  // Landmark dots.
  ctx.fillStyle = '#ffd27a';
  for (const lm of Object.values(LANDMARKS)) {
    const [lx, ly] = toMap(lm.x, lm.z);
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Mission marker: pulsing gold diamond.
  if (state.missionTarget) {
    const [mx, my] = toMap(state.missionTarget.x, state.missionTarget.z);
    const pulse = 5 + Math.sin(state.time * 4) * 2;
    ctx.fillStyle = '#ffd27a';
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
    ctx.restore();
  }
  // Traffic dots.
  ctx.fillStyle = '#ffffff';
  for (const car of state.traffic || []) {
    const [tx, ty] = toMap(car.x, car.z);
    ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
  }
  // Police blips: flashing blue/red.
  ctx.fillStyle = Math.floor(state.time * 4) % 2 === 0 ? '#2244ff' : '#ff2222';
  for (const car of state.policeCars || []) {
    const [px, py] = toMap(car.x, car.z);
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Helicopter icon.
  if (state.heliActive) {
    const [hx, hy] = toMap(state.playerX, state.playerZ);
    ctx.fillStyle = '#ff2222';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('H', hx + 8, hy - 8);
  }
  // Player arrow, rotated by heading.
  const [px, py] = toMap(state.playerX, state.playerZ);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.playerYaw || 0);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Title screen buttons: Continue (when a save exists) and New Game.
export function showTitle(hud, hasSave, onContinue, onNew) {
  hud.titleScreen.style.display = 'block';
  hud.pauseScreen.style.display = 'none';
  hud.endScreen.style.display = 'none';
  hud.titleButtons.innerHTML = '';
  const mkButton = (label, fn) => {
    const button = document.createElement('button');
    button.className = 'title-button';
    button.textContent = label;
    button.addEventListener('click', fn);
    hud.titleButtons.appendChild(button);
  };
  if (hasSave) mkButton('CONTINUE', onContinue);
  mkButton(hasSave ? 'NEW GAME' : 'START GAME', onNew);
}

export function hideTitle(hud) {
  hud.titleScreen.style.display = 'none';
}

export function showPause(hud, paused) {
  hud.pauseScreen.style.display = paused ? 'block' : 'none';
}

export function showEnd(hud, title, sub) {
  hud.endScreen.innerHTML = `<h2>${title}</h2><p>${sub}</p><p>Press Enter to respawn at the safehouse.</p>`;
  hud.endScreen.style.display = 'block';
}

export function hideEnd(hud) {
  hud.endScreen.style.display = 'none';
}
