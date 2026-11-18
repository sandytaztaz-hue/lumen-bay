// The HUD: wanted stars, health + armour, cash, clock, radio, objective,
// minimap, speedometer, weapon, event log, dialogue and banners — all DOM
// plus one 2D minimap canvas, updated every frame from the game state.
import { WORLD, LANDMARKS, allStreets, CLOCK_LABEL } from './config.js';

const $ = (id) => document.getElementById(id);

export function makeHud() {
  return {
    logLines: [],
    dialogTimer: 0,
    bannerTimer: 0,
  };
}

function starRow(stars) {
  let s = '';
  for (let i = 0; i < 5; i++) s += i < stars ? '★' : '<span class="off">★</span>';
  return s;
}

export function updateHud(hud, g, dt) {
  $('stars').innerHTML = starRow(g.wanted.stars);
  const hp = Math.max(0, Math.round(g.player.health));
  $('healthfill').style.width = `${hp}%`;
  const armour = Math.max(0, Math.round(g.player.armour || 0));
  $('healthtext').textContent = `HEALTH ${hp}${armour > 0 ? `  ·  ARMOUR ${armour}` : ''}${g.player.inCar ? `  ·  ${g.player.inCar.model.name}` : ''}`;
  $('cash').textContent = `$${g.cash.toLocaleString('en-US')}`;
  $('clock').textContent = CLOCK_LABEL;
  $('radio').textContent = `♪ ${g.radioName}`;
  const speed = g.player.inCar
    ? Math.round(Math.abs(g.player.inCar.speed) * 3.6)
    : Math.round(g.player.speed * 3.6);
  $('speed').textContent = String(speed);
  $('weapon').textContent = g.player.inCar
    ? `DRIVING — ${g.player.inCar.model.name}`
    : g.weaponName + (g.ammoText ? ` · ${g.ammoText}` : '');
  $('crosshair').style.display = (!g.player.inCar && g.aiming) ? 'block' : 'none';
  $('objtitle').textContent = g.objective.title;
  $('objtext').textContent = g.objective.text;
  if (hud.dialogTimer > 0) {
    hud.dialogTimer -= dt;
    if (hud.dialogTimer <= 0) $('dialog').style.display = 'none';
  }
  if (hud.bannerTimer > 0) {
    hud.bannerTimer -= dt;
    if (hud.bannerTimer <= 0) $('banner').style.display = 'none';
  }
  drawMinimap(g);
}

export function logEvent(hud, text) {
  hud.logLines.push(text);
  if (hud.logLines.length > 4) hud.logLines.shift();
  $('eventlog').innerHTML = hud.logLines.map((l) => `<div>${l}</div>`).join('');
}

export function showDialogue(hud, speaker, text, seconds = 5) {
  $('dialog').innerHTML = `<b>${speaker}:</b> ${text}`;
  $('dialog').style.display = 'block';
  hud.dialogTimer = seconds;
}

export function showBanner(hud, text, sub = '', seconds = 2.6) {
  $('bannertext').textContent = text;
  $('bannersub').textContent = sub;
  $('banner').style.display = 'block';
  hud.bannerTimer = seconds;
}

/** Minimap: streets, blocks, beach, player arrow, mission marker, police. */
export function drawMinimap(g) {
  const cv = $('minimap');
  const ctx = cv.getContext('2d');
  const S = 180;
  const half = WORLD.half;
  const toMap = (x, z) => [(x + half) / (half * 2) * S, (z + half) / (half * 2) * S];
  ctx.fillStyle = '#241a3e';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#0e6f8f';
  ctx.fillRect(0, 0, 6, S); // ocean, west edge
  ctx.fillStyle = '#f2d49b';
  ctx.fillRect(0, S - 10, S, 10); // beach, south edge
  ctx.fillStyle = '#4a4360';
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      const [x0, z0] = toMap(-245 + 70 * i + 7, -245 + 70 * j + 7);
      ctx.fillRect(x0, z0, 18, 18);
    }
  }
  ctx.strokeStyle = '#8d8578';
  ctx.lineWidth = 2;
  for (const s of allStreets()) {
    const [x] = toMap(s, 0);
    const [, z] = toMap(0, s);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, z); ctx.lineTo(S, z); ctx.stroke();
  }
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 9px system-ui, sans-serif';
  const [tx, tz] = toMap(LANDMARKS.torre.x, LANDMARKS.torre.z);
  ctx.beginPath(); ctx.arc(tx, tz, 3, 0, 7); ctx.fill();
  ctx.fillText('TORRE', tx + 5, tz + 3);
  if (g.marker) {
    const [mx, mz] = toMap(g.marker.x, g.marker.z);
    const pulse = 5 + Math.sin(performance.now() / 200) * 1.5;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(mx, mz - pulse);
    ctx.lineTo(mx + pulse, mz);
    ctx.lineTo(mx, mz + pulse);
    ctx.lineTo(mx - pulse, mz);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#2e7dff';
  for (const p of g.policeBlips) {
    const [px, pz] = toMap(p.x, p.z);
    ctx.beginPath(); ctx.arc(px, pz, 2.5, 0, 7); ctx.fill();
  }
  if (g.heliBlip) {
    const [hx, hz] = toMap(g.heliBlip.x, g.heliBlip.z);
    ctx.fillStyle = '#ff2e3e';
    ctx.beginPath(); ctx.arc(hx, hz, 3, 0, 7); ctx.fill();
  }
  const [px, pz] = toMap(g.player.x, g.player.z);
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(g.player.heading);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4.5, 5);
  ctx.lineTo(0, 2.5);
  ctx.lineTo(-4.5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function showScreen(html) {
  const el = $('screen');
  el.innerHTML = html;
  el.style.display = 'flex';
}

export function hideScreen() {
  $('screen').style.display = 'none';
}

/** Title screen HTML: name, story hook, controls, save state. */
export function titleHtml(hasSave, cash, jobsDone) {
  return `
    <h1>LUMEN BAY</h1>
    <h2>SUNSET GETAWAY &middot; PUERTO LUMEN</h2>
    <p>Mara Solis drives for the crew that owns the sunset. Eight jobs stand
    between her and the last boat out — steal the cars, lose the heat, and
    take the Torre vault before the sun goes down on Puerto Lumen.</p>
    <p class="keys"><b>WASD</b> move / drive &nbsp; <b>Mouse drag</b> look &nbsp;
    <b>E</b> enter / steal car &nbsp; <b>Click</b> shoot &nbsp; <b>1 / 2 / 3</b> weapons<br>
    <b>M</b> start next job &nbsp; <b>R</b> radio &nbsp; <b>Shift</b> sprint &nbsp;
    <b>C</b> reset camera &nbsp; <b>P</b> pause &nbsp; <b>Esc</b> menu</p>
    ${hasSave ? `<p>Save found — $${cash.toLocaleString('en-US')} banked, ${jobsDone} job${jobsDone === 1 ? '' : 's'} done.</p>` : ''}
    <button id="playbtn">${hasSave ? 'CONTINUE' : 'START ENGINE'}</button>
    <p class="keys">An original game. Puerto Lumen, Mara Solis and every car, song and
    street are invented here — nothing from any other game.</p>`;
}
