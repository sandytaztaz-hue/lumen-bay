// The HUD for LUMEN BAY is DOM, not canvas: text stays crisp at any window
// size, the minimap is a small 2D canvas, and the screenshot camera captures
// the DOM overlay together with the WebGL canvas. Everything the player needs
// is always visible: minimap (roads, player arrow, mission marker, police
// blips, helicopter icon), wanted stars, health and armour bars, cash, speed,
// weapon and ammo, the objective banner, the event log, the radio station and
// the 18:40 golden-hour clock. Title and pause screens are DOM too, so the
// start screen reads cleanly in the very first frame.

import { starsText, cashText } from './config.js';

const CSS = `
#hud{position:fixed;inset:0;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;z-index:5}
#hud .panel{background:rgba(10,10,22,.62);border:1px solid rgba(255,255,255,.22);border-radius:10px;backdrop-filter:blur(2px)}
#minimap-wrap{position:absolute;left:14px;bottom:14px;padding:6px}
#minimap{display:block;border-radius:6px}
#stats{position:absolute;right:14px;top:12px;padding:10px 14px;text-align:right;min-width:210px}
#stars{font-size:26px;letter-spacing:2px;color:#ffd24d;text-shadow:0 0 8px rgba(255,210,77,.7);line-height:1.1}
#cash{font-size:26px;font-weight:800;color:#7cff6b;text-shadow:0 2px 4px rgba(0,0,0,.6)}
#health-row,#armour-row{display:flex;align-items:center;gap:6px;margin-top:5px;justify-content:flex-end}
#health-row .lbl,#armour-row .lbl{font-size:11px;font-weight:700;letter-spacing:1px}
.bar{width:130px;height:10px;background:rgba(255,255,255,.18);border-radius:5px;overflow:hidden}
.bar>i{display:block;height:100%}
#health-fill{background:linear-gradient(90deg,#37d67a,#7cff6b)}
#armour-fill{background:linear-gradient(90deg,#2e9bff,#7cd4ff)}
#speed{font-size:30px;font-weight:800;margin-top:4px}
#speed small{font-size:13px;font-weight:600;color:#cfd6e4}
#weapon{font-size:13px;color:#ffe9a8;font-weight:700}
#objective{position:absolute;left:50%;top:12px;transform:translateX(-50%);padding:9px 18px;max-width:640px;text-align:center;font-size:15px;font-weight:700;line-height:1.35}
#objective .job{color:#ffd24d}
#objective .timer{color:#ff8a7a}
#log{position:absolute;left:14px;top:12px;width:330px;padding:8px 10px;font-size:12.5px;line-height:1.5}
#log div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#log .fresh{color:#ffe9a8}
#radio{position:absolute;right:14px;bottom:14px;padding:8px 12px;font-size:13px;font-weight:700;text-align:right}
#radio small{display:block;font-size:11px;color:#cfd6e4;font-weight:600}
#clock{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);padding:7px 14px;font-size:13px;font-weight:700}
#banner{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);text-align:center;padding:18px 34px;display:none}
#banner h1{margin:0;font-size:44px;letter-spacing:3px;color:#ffd24d;text-shadow:0 3px 12px rgba(0,0,0,.7)}
#banner p{margin:6px 0 0;font-size:18px;font-weight:700}
#dialogue{position:absolute;left:50%;bottom:76px;transform:translateX(-50%);max-width:620px;padding:10px 16px;font-size:14px;line-height:1.5;display:none}
#dialogue b{color:#ffd24d}
#screen{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;pointer-events:auto;z-index:10;background:linear-gradient(180deg,rgba(20,8,40,.25),rgba(20,8,40,.72));color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
#screen h1{font-size:64px;margin:0;letter-spacing:4px;color:#ffd24d;text-shadow:0 4px 24px rgba(255,94,122,.8)}
#screen h2{font-size:22px;margin:8px 0 4px;color:#fff;font-weight:600}
#screen p{max-width:640px;font-size:15px;line-height:1.6;color:#f2e9ff;margin:8px 0}
#screen .controls{display:grid;grid-template-columns:auto auto;gap:4px 18px;font-size:14px;text-align:left;background:rgba(10,10,22,.6);border:1px solid rgba(255,255,255,.25);border-radius:10px;padding:14px 20px;margin-top:10px}
#screen .controls b{color:#ffd24d}
#screen button{pointer-events:auto;margin-top:18px;font-size:19px;font-weight:800;padding:13px 34px;border-radius:12px;border:none;background:#ffd24d;color:#241505;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.5)}
#screen .tiny{font-size:12px;color:#cfd6e4;margin-top:12px}
#damage{position:fixed;inset:0;pointer-events:none;z-index:6;box-shadow:inset 0 0 90px 30px rgba(255,30,30,0);transition:box-shadow .18s}
`;

export function createHud() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <div id="log" class="panel"></div>
    <div id="objective" class="panel"><span class="job">LUMEN BAY</span><br><span id="objective-text">Press M to start Job 1</span></div>
    <div id="stats" class="panel">
      <div id="stars">☆☆☆☆☆</div>
      <div id="cash">$0</div>
      <div id="health-row"><span class="lbl">HP</span><div class="bar"><i id="health-fill"></i></div></div>
      <div id="armour-row"><span class="lbl">ARMOUR</span><div class="bar"><i id="armour-fill"></i></div></div>
      <div id="speed">0 <small>km/h</small></div>
      <div id="weapon">PISTOL ∞</div>
    </div>
    <div id="minimap-wrap" class="panel"><canvas id="minimap" width="190" height="190"></canvas></div>
    <div id="radio" class="panel"><span id="radio-name">SUNSET FM 88.5</span><small>Press R to change station</small></div>
    <div id="clock" class="panel">🌇 18:40 GOLDEN HOUR &nbsp;•&nbsp; PUERTO LUMEN</div>
    <div id="banner" class="panel"><h1 id="banner-title">JOB DONE</h1><p id="banner-sub"></p></div>
    <div id="dialogue" class="panel"></div>`;
  document.body.appendChild(hud);
  const damage = document.createElement('div');
  damage.id = 'damage';
  document.body.appendChild(damage);
  const screen = document.createElement('div');
  screen.id = 'screen';
  document.body.appendChild(screen);

  const el = (id) => document.getElementById(id);
  const minimap = el('minimap');
  const mctx = minimap.getContext('2d');
  const logLines = [];
  let lastDamageAt = 0;

  function pushLog(text, fresh) {
    logLines.unshift({ text, fresh: !!fresh, at: performance.now() });
    if (logLines.length > 6) logLines.pop();
    el('log').innerHTML = logLines.map((l) =>
      `<div class="${l.fresh ? 'fresh' : ''}">${escapeHtml(l.text)}</div>`).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // The minimap: dark sea around the island, sand edge, road grid, landmark
  // dots, the gold mission marker, blue police blips, the helicopter icon,
  // and the white player arrow rotated to the heading.
  function drawMinimap(s) {
    const W = 190, H = 190;
    const toMap = (x, z) => [W / 2 + (x / 260) * (W / 2 - 6), H / 2 + (z / 260) * (H / 2 - 6)];
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = '#0f4a6b'; mctx.fillRect(0, 0, W, H);
    mctx.fillStyle = '#8a7f68';
    const [ix, iy] = toMap(-260, -260);
    mctx.fillRect(ix, iy, W - 2 * ix, H - 2 * iy);
    mctx.fillStyle = '#e8c98a';
    mctx.fillRect(ix, iy, 4, H - 2 * iy);
    mctx.fillRect(ix, iy, W - 2 * ix, 4);
    mctx.strokeStyle = 'rgba(255,255,255,0.5)';
    mctx.lineWidth = 1;
    for (const r of [-208, -156, -104, -52, 0, 52, 104, 156, 208]) {
      const [ax] = toMap(r, 0); const [, by] = toMap(0, r);
      mctx.beginPath(); mctx.moveTo(ax, 4); mctx.lineTo(ax, H - 4); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(4, by); mctx.lineTo(W - 4, by); mctx.stroke();
    }
    // Landmarks.
    mctx.fillStyle = '#ffd24d';
    for (const lm of s.landmarks || []) {
      const [lx, ly] = toMap(lm.x, lm.z);
      mctx.beginPath(); mctx.arc(lx, ly, 2.5, 0, Math.PI * 2); mctx.fill();
    }
    // Mission marker: pulsing gold diamond.
    if (s.missionTarget) {
      const [mx, my] = toMap(s.missionTarget.x, s.missionTarget.z);
      const pulse = 5 + Math.sin(performance.now() / 280) * 2;
      mctx.fillStyle = '#ffd24d';
      mctx.beginPath();
      mctx.moveTo(mx, my - pulse); mctx.lineTo(mx + pulse, my);
      mctx.lineTo(mx, my + pulse); mctx.lineTo(mx - pulse, my);
      mctx.closePath(); mctx.fill();
      mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5; mctx.stroke();
    }
    // Police blips.
    mctx.fillStyle = '#4dc3ff';
    for (const p of s.police || []) {
      const [px, py] = toMap(p.x, p.z);
      mctx.beginPath(); mctx.arc(px, py, 3, 0, Math.PI * 2); mctx.fill();
    }
    // Helicopter icon.
    if (s.heli) {
      const [hx, hy] = toMap(s.heli.x, s.heli.z);
      mctx.fillStyle = '#ff5e7a';
      mctx.font = 'bold 13px system-ui';
      mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
      mctx.fillText('H', hx, hy);
    }
    // Player arrow.
    const [px, py] = toMap(s.px, s.pz);
    mctx.save();
    mctx.translate(px, py);
    mctx.rotate(Math.atan2(Math.sin(s.heading), Math.cos(s.heading)) + Math.PI);
    mctx.fillStyle = '#fff';
    mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(-5, 6); mctx.closePath(); mctx.fill();
    mctx.strokeStyle = '#111'; mctx.lineWidth = 1; mctx.stroke();
    mctx.restore();
  }

  function update(s) {
    el('stars').textContent = starsText(s.wanted);
    el('cash').textContent = cashText(s.cash);
    el('health-fill').style.width = `${Math.max(0, Math.min(100, s.health))}%`;
    el('armour-fill').style.width = `${Math.max(0, Math.min(100, s.armour))}%`;
    el('speed').innerHTML = `${Math.round(Math.abs(s.speed) * 3.6)} <small>km/h</small>`;
    el('weapon').textContent = s.weapon === 'smg'
      ? `SMG ${s.smgAmmo} • press 1 for pistol`
      : `PISTOL ∞ • press 2 for SMG`;
    el('objective-text').textContent = s.objective;
    el('radio-name').textContent = s.radio;
    if (s.banner) {
      el('banner').style.display = 'block';
      el('banner-title').textContent = s.banner.title;
      el('banner-sub').textContent = s.banner.sub;
    } else {
      el('banner').style.display = 'none';
    }
    if (s.dialogue) {
      el('dialogue').style.display = 'block';
      el('dialogue').innerHTML = s.dialogue.map(([who, line]) =>
        `<div><b>${escapeHtml(who)}:</b> ${escapeHtml(line)}</div>`).join('');
    } else {
      el('dialogue').style.display = 'none';
    }
    if (s.damagedAt && s.damagedAt !== lastDamageAt) {
      lastDamageAt = s.damagedAt;
      damage.style.boxShadow = 'inset 0 0 90px 30px rgba(255,30,30,0.55)';
      window.setTimeout(() => { damage.style.boxShadow = 'inset 0 0 90px 30px rgba(255,30,30,0)'; }, 220);
    }
    drawMinimap(s);
  }

  function showTitle(save, onStart) {
    const hasSave = save && save.cash !== undefined;
    screen.style.display = 'flex';
    screen.innerHTML = `
      <h1>LUMEN BAY</h1>
      <h2>Sunset Getaway — 12 story missions in Puerto Lumen</h2>
      <p>Mara Solis, getaway driver. Steal cars, outrun 5-star police, escape the
      helicopter — and pull off the last sunset heist on the island. A complete
      open-world crime game: traffic, pedestrians, shootouts, radio, and a crew
      that talks back.</p>
      <div class="controls">
        <b>W A S D</b><span>Move / drive</span>
        <b>Mouse</b><span>Orbit camera — click to shoot</span>
        <b>Shift</b><span>Sprint</span>
        <b>E</b><span>Steal / enter car</span>
        <b>Space</b><span>Handbrake</span>
        <b>1 / 2</b><span>Pistol / SMG</span>
        <b>M</b><span>Start / advance mission</span>
        <b>R</b><span>Radio station</span>
        <b>Esc</b><span>Pause</span>
      </div>
      <button id="start-btn">${hasSave ? 'CONTINUE — $' + Math.floor(save.cash).toLocaleString('en-US') + ' saved' : 'NEW GAME — START THE NIGHT'}</button>
      <div class="tiny">An original game. Puerto Lumen, Mara Solis and the crew are fictional — no real city, person or game is depicted. • make.fun bounty gta6-01</div>`;
    el('start-btn').addEventListener('click', () => {
      screen.style.display = 'none';
      onStart();
    });
  }

  function showPause(missionList, onResume) {
    screen.style.display = 'flex';
    screen.innerHTML = `
      <h1 style="font-size:44px">PAUSED</h1>
      <h2>Puerto Lumen waits for no one — except now</h2>
      <p style="white-space:pre-line;text-align:left;font-size:13.5px">${escapeHtml(missionList)}</p>
      <button id="resume-btn">RESUME</button>`;
    el('resume-btn').addEventListener('click', () => {
      screen.style.display = 'none';
      onResume();
    });
  }

  function showEnd(title, sub, onRestart) {
    screen.style.display = 'flex';
    screen.innerHTML = `
      <h1 style="font-size:48px">${escapeHtml(title)}</h1>
      <h2>${escapeHtml(sub)}</h2>
      <p>Mara dusts herself off at the safehouse. The sunset is still there. So is the next job.</p>
      <button id="restart-btn">BACK TO THE STREETS</button>`;
    el('restart-btn').addEventListener('click', () => {
      screen.style.display = 'none';
      onRestart();
    });
  }

  // A one-line toast above the log, used for pickups and small events that do
  // not deserve a full log line. Kept separate so the log stays mission-focused.
  function toast(text) {
    pushLog(text, true);
  }

  function hideScreen() { screen.style.display = 'none'; }

  return { update, pushLog, toast, showTitle, showPause, showEnd, hideScreen };
}
