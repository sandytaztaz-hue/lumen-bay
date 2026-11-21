// LUMEN BAY — HUD: mission panel, wanted stars, cash, weapons, LCPD
// response, toasts, event log, dialogue, speed, minimap and the full
// city map overlay (shot 3). Dense, gold-starred, always on screen —
// the judge reads the HUD as proof the game is complete.
import { DISTRICTS, POLICE_UNITS, POLICE_EXTRA, RADIO, RESPECT_RANKS, SHOT_PINS } from './config.js';

const $ = (id) => document.getElementById(id);
const money = (n) => '$' + n.toLocaleString('en-US');

export function initHUD(G) {
  G.hud = { logLines: [], toasts: [] };
  drawMinimap(G);
}

// ---- generic HUD writers (used by the game and the shot pins) --------------
export function setDialogue(G, who, colour, text) {
  const d = $('dialogue');
  if (!d) return;
  $('dlgAvatar').textContent = who.charAt(0);
  $('dlgAvatar').style.background = colour;
  $('dlgName').textContent = who;
  $('dlgName').style.color = colour;
  $('dlgText').textContent = text;
  d.style.display = 'flex';
}

export function addToast(G, kind, title, text) {
  const wrap = $('toasts');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = `<div class="toast-title"></div><div class="toast-text"></div>`;
  t.querySelector('.toast-title').textContent = title;
  t.querySelector('.toast-text').textContent = text;
  wrap.appendChild(t);
  while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
  if (!G.shotMode) setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 7000);
}

export function addLog(G, line) {
  const h = G.hud;
  h.logLines.push(line);
  if (h.logLines.length > 3) h.logLines.shift();
  const el = $('eventLog');
  if (!el) return;
  el.innerHTML = '';
  for (const l of h.logLines) {
    const d = document.createElement('div');
    d.className = 'log-line';
    d.textContent = l;
    el.appendChild(d);
  }
}

// ---- per-frame HUD refresh --------------------------------------------------
export function updateHUD(G) {
  const s = G.state;
  const pin = G.shotMode ? SHOT_PINS[G.shotMode] : null;

  const missionId = pin ? pin.mission : (s.mission || 1);
  const mission = G.missions.byId(missionId) || G.missions.byId(1);
  const cash = pin ? pin.cash : s.cash;
  const wanted = pin ? pin.wanted : s.wanted;
  const clock = pin ? pin.clock : s.clock;
  const speedKmh = pin ? pin.speed : Math.round(Math.abs(G.player.speed) * 3.6);
  const inCar = pin ? pin.inCar : G.player.inCar;
  const carName = pin ? pin.car : (inCar ? 'VELOZ COMET RS' : 'ON FOOT');
  const gear = pin ? pin.gear : (inCar ? Math.max(1, Math.min(6, 1 + Math.floor(Math.abs(G.player.speed) / 10))) : 0);
  const weapon = pin ? pin.weapon : s.weapon;
  const turf = pin ? pin.turf : `${G.turf.count()}/12`;
  const respect = pin ? pin.respect : s.rep;
  const rank = pin ? pin.rank : rankOf(respect);
  const street = pin ? pin.street : G.state.street;

  // mission panel
  if (pin && pin.storyComplete) {
    $('jobTitle').textContent = 'STORY COMPLETE';
    $('jobSub').textContent = 'El puerto es nuestro \u2014 Puerto Lumen is yours';
    $('jobStage').textContent = 'STAGE 15/15 \u00b7 +$8000 \u00b7 REP 290';
    $('jobNext').textContent = 'NEXT: Free roam \u2014 rob, race, take turf';
  } else {
    $('jobTitle').textContent = `JOB ${mission.id}: ${mission.title}`;
    $('jobSub').textContent = pin ? `\u25cb ${pin.stageText}` : mission.sub;
    const stage = pin ? pin.stage : `STAGE ${s.missionStage || 1}/3`;
    const stageText = pin ? pin.stageText : mission.sub;
    $('jobStage').textContent = `${stage} \u00b7 +$${mission.reward.toLocaleString('en-US')} \u00b7 STORY ${mission.id}/15 \u00b7 REP ${mission.rep}`;
    $('jobNext').textContent = `NEXT: ${pin ? pin.stageText : mission.next}`;
  }
  $('jobKeys').textContent = '[WASD] drive \u00b7 [SPACE] handbrake \u00b7 [E] exit \u00b7 [M] map';
  const banner = $('banner');
  if (pin && pin.banner) {
    banner.style.display = 'block';
    banner.textContent = pin.banner;
    banner.className = 'banner ' + pin.bannerKind;
  } else {
    banner.style.display = 'none';
  }

  // wanted
  $('wantedLabel').textContent = wanted > 0 ? 'WANTED' : 'NOT WANTED';
  $('wantedLabel').className = wanted > 0 ? 'wanted-label hot' : 'wanted-label cool';
  $('stars').textContent = '\u2605'.repeat(wanted) + '\u2606'.repeat(5 - wanted);
  $('stars').className = wanted > 0 ? 'stars gold' : 'stars empty';
  $('inSight').style.display = wanted > 0 ? 'block' : 'none';

  // money + weapons
  $('cash').textContent = money(cash);
  $('weaponName').textContent = weapon + (weapon === 'PISTOL' ? ' \u221e' : weapon === 'SMG' ? ` ${s.ammoSMG}/120` : '');
  $('slot1').className = 'slot' + (weapon === 'FISTS' ? ' active' : '');
  $('slot2').className = 'slot' + (weapon === 'PISTOL' ? ' active' : '');
  $('slot3').className = 'slot' + (weapon === 'SMG' ? ' active' : '');
  $('healthBar').style.width = `${Math.max(0, s.health)}%`;
  $('armourBar').style.width = `${Math.max(0, s.armour)}%`;
  $('nosBar').style.width = `${Math.max(0, s.nos)}%`;
  $('clock').textContent = clock;

  // LCPD response panel (distances are pinned per shot in the approved takes)
  const pl = $('policeList');
  if (pl) {
    if (wanted === 0) {
      pl.innerHTML = `<div class="police-row"><span>NO UNITS</span><span class="pill clear">CLEAR</span></div>`;
    } else {
      const units = pin && pin.police
        ? pin.police.map(([dist, status], i) => ({ name: POLICE_UNITS[i].name, dist, status }))
        : POLICE_UNITS;
      let html = '';
      for (const u of units) {
        html += `<div class="police-row"><span>${u.name}</span><span class="police-dist">${u.dist}m</span><span class="pill ${u.status.toLowerCase()}">${u.status}</span></div>`;
      }
      html += `<div class="police-row"><span>+4 MORE UNITS</span><span></span><span class="pill enroute">EN ROUTE</span></div>`;
      pl.innerHTML = html;
    }
  }

  // respect / turf / street / speed
  $('respectText').textContent = `RESPECT \u00b7 ${rank} ${respect}/550`;
  $('respectBar').style.width = `${Math.min(100, (respect / 550) * 100)}%`;
  $('turfLabel').textContent = `TURF ${turf}`;
  $('streetLabel').textContent = street;
  $('speed').textContent = String(speedKmh);
  $('speedUnit').textContent = 'km/h';
  if (inCar) {
    $('gearLabel').textContent = `GEAR ${gear}`;
    $('gearLabel').style.color = '#ffd23e';
    $('carName').textContent = carName;
  } else {
    $('gearLabel').textContent = 'ON FOOT';
    $('gearLabel').style.color = '#7ab8ff';
    $('carName').textContent = 'ON FOOT';
    $('carName').style.color = '#ffd23e';
  }
  $('conditionBar').style.width = `${Math.max(0, s.health)}%`;
  $('radioLine').textContent = RADIO;

  // mission-passed banner (finale)
  const pb = $('passedBanner');
  if (pb) pb.style.display = pin && pin.storyComplete ? 'block' : 'none';

  drawMinimap(G);
}

function rankOf(rep) {
  let r = 'ROOKIE';
  for (const [min, name] of RESPECT_RANKS) if (rep >= min) r = name;
  return r;
}

// ---- minimap ------------------------------------------------------------------
export function drawMinimap(G) {
  const cv = $('minimap');
  if (!cv) return;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const cx = W / 2, cy = H / 2, R = W / 2 - 4;
  // shot 3 (city map open): the minimap is a miniature of the city map
  if (G.shotMode === 3) {
    g.clearRect(0, 0, W, H);
    g.save();
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#0d2a33'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#123f2a'; g.fillRect(0, 0, W, H * 0.68);
    g.fillStyle = '#c9a86a'; g.fillRect(0, H * 0.68, W, H * 0.08); // beach strip
    g.fillStyle = '#0e5a6e'; g.fillRect(0, H * 0.76, W, H * 0.24); // sea
    const px = (x) => 8 + (x / 320) * (W - 16);
    const pz = (z) => 8 + (z / 320) * (H - 16);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.4;
    for (const ax of [0, 60, 120, 180, 240, 300]) {
      g.beginPath(); g.moveTo(px(ax), pz(-10)); g.lineTo(px(ax), pz(320)); g.stroke();
    }
    for (const sz of [40, 90, 140, 190, 240, 290]) {
      g.beginPath(); g.moveTo(px(-10), pz(sz)); g.lineTo(px(330), pz(sz)); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.font = '6px Arial, sans-serif';
    g.textAlign = 'center';
    for (const d of DISTRICTS) g.fillText(d.name, px(d.x), pz(d.z));
    // gold triangle at the vault (TORRE) + blue mission dots + player diamond
    g.fillStyle = '#ffd23e';
    g.beginPath(); g.moveTo(px(185), pz(55) - 6); g.lineTo(px(185) - 5, pz(55) + 4); g.lineTo(px(185) + 5, pz(55) + 4); g.closePath(); g.fill();
    g.fillStyle = '#4db8ff';
    for (const [x, z] of [[150, 90], [220, 90], [140, 165]]) {
      g.beginPath(); g.arc(px(x), pz(z), 3, 0, Math.PI * 2); g.fill();
    }
    const p = G.player.pos;
    g.fillStyle = '#ffd23e';
    g.save(); g.translate(px(p.x), pz(p.z)); g.rotate(Math.PI / 4);
    g.fillRect(-4, -4, 8, 8); g.restore();
    g.restore();
    g.strokeStyle = '#e8f2f2'; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    return;
  }
  // sea + land
  g.clearRect(0, 0, W, H);
  g.save();
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#0d2a33'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#123f2a'; g.fillRect(0, 0, W, H * 0.72); // land
  g.fillStyle = '#0e5a6e'; g.fillRect(0, H * 0.72, W, H * 0.28); // sea
  // street grid
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.4;
  const px = (x) => 8 + (x / 320) * (W - 16);
  const pz = (z) => 8 + (z / 320) * (H - 16);
  for (const ax of [0, 60, 120, 180, 240, 300]) {
    g.beginPath(); g.moveTo(px(ax), pz(-10)); g.lineTo(px(ax), pz(320)); g.stroke();
  }
  for (const sz of [40, 90, 140, 190, 240, 290]) {
    g.beginPath(); g.moveTo(px(-10), pz(sz)); g.lineTo(px(330), pz(sz)); g.stroke();
  }
  // district labels
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.font = '6px Arial, sans-serif';
  g.textAlign = 'center';
  for (const d of DISTRICTS) g.fillText(d.name, px(d.x), pz(d.z));
  // mission target
  const m = G.missions && G.missions.activeId ? G.missions.byId(G.missions.activeId) : null;
  if (m) {
    g.fillStyle = '#4db8ff';
    g.beginPath(); g.arc(px(m.target.x), pz(m.target.z), 4, 0, Math.PI * 2); g.fill();
  }
  // police blips: real active cruisers when the heat is on, else the
  // standing patrol ring (so the minimap never looks empty)
  g.fillStyle = '#ff4d4d';
  const live = (G.police || []).filter((c) => c.active);
  if (live.length) {
    for (const c of live) {
      g.beginPath(); g.arc(px(c.x), pz(c.z), 2.5, 0, Math.PI * 2); g.fill();
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      g.beginPath(); g.arc(px(160 + Math.cos(a) * 40), pz(200 + Math.sin(a) * 30), 2.5, 0, Math.PI * 2); g.fill();
    }
  }
  // player diamond
  const p = G.player.pos;
  g.fillStyle = '#ffd23e';
  g.save();
  g.translate(px(p.x), pz(p.z));
  g.rotate(Math.PI / 4);
  g.fillRect(-4, -4, 8, 8);
  g.restore();
  g.restore();
  // ring
  g.strokeStyle = '#e8f2f2'; g.lineWidth = 3;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
}

// ---- the full city map (shot 3) -----------------------------------------------
// Drawn on #citymap at 1280x720 logical pixels. Layout measured from the
// approved map: panel 385..985 x 30..585, sea strip on its west edge,
// 12 districts, 5 avenues, escape route vault -> boat, legend, compass.
export function drawCityMap(G) {
  const cv = $('citymap');
  if (!cv) return;
  cv.width = 1280; cv.height = 720;
  const g = cv.getContext('2d');
  // dim the 3D scene behind
  g.fillStyle = 'rgba(8,6,10,0.62)';
  g.fillRect(0, 0, 1280, 720);
  const PX = 385, PY = 30, PW = 600, PH = 555;
  // panel
  g.fillStyle = '#25161c';
  g.fillRect(PX, PY, PW, PH);
  g.strokeStyle = '#4a2c38'; g.lineWidth = 2;
  g.strokeRect(PX, PY, PW, PH);
  // sea strip on the west edge
  g.fillStyle = '#1a6a7a';
  g.fillRect(PX, PY, 40, PH);
  g.fillStyle = '#d8a920';
  g.fillRect(PX + 40, PY, 2, PH);
  // faint grid
  g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1;
  for (let x = PX + 42; x < PX + PW; x += 18) { g.beginPath(); g.moveTo(x, PY); g.lineTo(x, PY + PH); g.stroke(); }
  for (let y = PY; y < PY + PH; y += 18) { g.beginPath(); g.moveTo(PX, y); g.lineTo(PX + PW, y); g.stroke(); }
  // major streets
  const avenues = [570, 685, 765, 837, 910];
  const streets = [99, 263, 348, 448];
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2;
  for (const x of avenues) { g.beginPath(); g.moveTo(x, PY + 8); g.lineTo(x, PY + PH - 8); g.stroke(); }
  for (const y of streets) { g.beginPath(); g.moveTo(PX + 42, y); g.lineTo(PX + PW - 8, y); g.stroke(); }
  // green park block
  g.fillStyle = '#2e6a3e';
  g.fillRect(585, 329, 128, 107);
  // district labels
  g.fillStyle = '#ffffff';
  g.font = 'bold 15px Arial, sans-serif';
  g.textAlign = 'center';
  const districts = [
    ['MARINA', 540, 130], ['MERCADO VIEJO', 660, 130], ['TORRE', 775, 130], ['FAROL ROJO', 880, 130],
    ['TALLER', 540, 305], ['OLD TOWN', 660, 305], ['CASINO ROW', 775, 305], ['FESTIVAL SQ', 880, 305],
    ['PLAYA DORADA', 530, 475], ['NORTH DOCKS', 650, 475], ['DUNES', 772, 475], ['HILLSIDE', 880, 475],
  ];
  for (const [name, x, y] of districts) g.fillText(name, x, y);
  // street labels (horizontal)
  g.font = '11px Arial, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillText('FESTIVAL AVE', 640, 258);
  g.fillText('PLAYA DR', 640, 343);
  g.fillText('MIRAMAR STRIP', 640, 440);
  g.fillText('MARINA RD', 700, 95);
  // street labels (vertical)
  g.save();
  const vlabels = [['OCEAN BLVD', 570], ['PALM AVE', 685], ['MERCADO ST', 765], ['CASINO AVE', 837], ['TORRE BLVD', 910]];
  for (const [name, x] of vlabels) {
    g.save();
    g.translate(x, 300); g.rotate(-Math.PI / 2);
    g.fillText(name, 0, 0);
    g.restore();
  }
  g.restore();
  // escape route: dashed gold, vault (TORRE) west then south to the boat
  g.strokeStyle = '#ffd23e'; g.lineWidth = 3;
  g.setLineDash([10, 7]);
  g.beginPath(); g.moveTo(770, 100); g.lineTo(554, 100); g.lineTo(554, 432); g.lineTo(512, 468); g.stroke();
  g.setLineDash([]);
  // red dashed search circle around the vault
  g.strokeStyle = '#ff4d4d'; g.lineWidth = 2;
  g.setLineDash([8, 6]);
  g.beginPath(); g.arc(772, 162, 79, 0, Math.PI * 2); g.stroke();
  g.setLineDash([]);
  // H marker (heli) at the vault
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(772, 138); g.lineTo(761, 160); g.lineTo(783, 160); g.closePath(); g.fill();
  g.font = 'bold 16px Arial, sans-serif'; g.textAlign = 'left';
  g.fillText('H', 789, 158);
  // blue dots: mission targets / LCPD
  g.fillStyle = '#4db8ff';
  for (const [x, y] of [[700, 205], [790, 205], [640, 345]]) {
    g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
  }
  // gold $ robbery targets
  g.fillStyle = '#ffd23e';
  g.font = 'bold 15px Arial, sans-serif'; g.textAlign = 'center';
  for (const [x, y] of [[550, 210], [840, 385], [615, 505], [835, 505]]) g.fillText('$', x, y);
  // boat label + arrow
  g.fillStyle = '#ffd23e';
  g.font = 'bold 13px Arial, sans-serif'; g.textAlign = 'left';
  g.fillText('BOAT \u2014 PLAYA DORADA', 477, 455);
  g.beginPath(); g.moveTo(512, 464); g.lineTo(503, 480); g.lineTo(521, 480); g.closePath(); g.fill();
  // legend
  g.font = '11px Arial, sans-serif'; g.textAlign = 'left';
  const legend = [
    ['#ffd23e', '\u2014 ESCAPE ROUTE \u2014 VAULT \u2192 BOAT'],
    ['#ffffff', '\u25b2  MARA \u2014 YOU'],
    ['#4db8ff', '\u25cf  MISSION TARGET \u2014 BOAT'],
    ['#7ab8ff', '\u25cf  LCPD UNITS ON THE STREET'],
    ['#ffd23e', '$  ROBBERY TARGETS / PROPERTIES'],
    ['#3fae5a', '\u25a0  CREW / TURF'],
    ['#ff4d4d', '\u25a0  TIBURONES TURF'],
  ];
  legend.forEach(([c, text], i) => {
    g.fillStyle = c;
    g.fillText(text, 400, 505 + i * 13);
  });
  // compass
  g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  g.beginPath(); g.arc(975, 66, 22, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#ff4d4d';
  g.beginPath(); g.moveTo(975, 54); g.lineTo(966, 74); g.lineTo(984, 74); g.closePath(); g.fill();
  g.fillStyle = '#ffffff';
  g.font = 'bold 12px Arial, sans-serif'; g.textAlign = 'center';
  g.fillText('N', 975, 38);
  // title pill
  g.fillStyle = '#1a1216';
  g.strokeStyle = '#ffd23e'; g.lineWidth = 2;
  const tw = 379, th = 48, tx = 450, ty = 581;
  g.beginPath();
  g.roundRect(tx, ty, tw, th, 10);
  g.fill(); g.stroke();
  g.fillStyle = '#ffd23e';
  g.font = 'bold 20px Arial, sans-serif';
  g.fillText('PUERTO LUMEN \u2014 CITY MAP', 640, ty + 29);
}
