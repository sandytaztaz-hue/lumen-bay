// LUMEN BAY — mapstats.js
// Full-screen stats/map screen (shot 3). Draws the entire 1280x720
// frame from scratch on every call: top bar, left progress panel,
// centre city map, right rank/career/save panel, bottom hint line.
// Written fresh from the shot-3 redesign spec. No round minimap here.
export function drawMapStats(ctx, v) {
  var W = 1280, H = 720;

  // ---------- palette: Lumen Bay sunset / dusk ----------
  var BG = '#140e20';        // deep dusk plum-indigo, near-black
  var TOPBAR = '#221832';    // slightly lighter plum band
  var PANEL = '#1e152e';     // side-panel fill
  var PANEL_LINE = 'rgba(245,185,66,0.28)';
  var GOLD = '#f5b942';      // gold-amber title / key numbers
  var GOLD_LINE = '#ffd23e'; // gold dashed route
  var GREEN = '#3ddc5a';     // money
  var INK = '#f5f0e6';       // main text
  var DIM = '#9a93a8';       // secondary text
  var OUTLINE = 'rgba(12,6,20,0.92)'; // dark outline behind every label
  var SEA = '#0e4d5c';      // deep teal sea
  var BEACH = '#e8d5a8';    // pale sand beach
  var ROAD = 'rgba(255,238,214,0.9)'; // warm-white major roads
  var MAROON = '#47101d';      // old map land: dark maroon/burgundy
  var MAROON_GRID = 'rgba(8,2,6,0.4)'; // fine darker grid on the old map
  var TURF_GREEN = '#357a35';  // crew turf block on the old map
  var TIB_RED = '#b02718';     // Tiburones turf block on the old map

  // ---------- layout ----------
  var MAP = { x: 300, y: 70, w: 680, h: 580 }; // map frame
  var LEFT = { x: 20, y: 72, w: 260, h: 588 };
  var RIGHT = { x: 1000, y: 72, w: 260, h: 588 };

  // Old-map geometry, re-created from the reference screenshot of the
  // old map (dark maroon land, white major roads, teal sea on the west,
  // pale sand beach on the south). No district fills: the old map is
  // one maroon landmass cut by white roads.
  var ROAD_V = [480, 606, 732, 858]; // vertical major roads (5px bands)
  var ROAD_H = [170, 320, 534];      // horizontal major roads (5px bands)
  var SEA_X1 = 352;                  // sea strip ends, land begins
  var BEACH_TOP = 629;               // beach strip (y 629..650)
  // Escape route: vault near TORRE west along the top, down the
  // west-side road, then west to the boat at Playa Dorada.
  var VAULT = [795, 116];
  var ROUTE = [
    [795, 116], // Torre Lumen vault
    [480, 116], // west along the top to the west-side road
    [480, 496], // down the west side (on the road)
    [360, 496], // west to the boat at Playa Dorada
  ];
  var PLAYER = [760, 116];    // Mara, white triangle on the route, TORRE
  var HIDEOUT = [830, 107];   // hideout square (top-left), H glyph last
  var CORDON = { x: 790, y: 196, r: 76 }; // red dashed cordon, TORRE area
  var dollars = [[700, 560], [834, 517]]; // robbery $: Miramar, Hillside
  var missions = [[750, 212], [845, 212], [581, 405]]; // blue dots
  var cops = [[520, 260], [700, 360], [880, 380]];     // red dots, LCPD
  var TURF = { x: 527, y: 380, w: 129, h: 110 }; // crew turf, PALM AVE
  var TIB = { x: 900, y: 190, w: 24, h: 16 };    // Tiburones turf, FAROL
  var COMPASS = [952, 108];
  var LEGEND = { x: 308, y: 540, w: 372, h: 96 }; // legend box, bottom-left
  var legRows = [578, 594, 610, 626]; // legend entry baselines

  function money(n) {
    return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Rounded-rect path (no reliance on ctx.roundRect existing).
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
  }

  // Text helper: every label gets a dark outline so it reads on any
  // background. All labels are drawn in the final phase, after every
  // marker, line and block, so nothing ever covers a letter.
  function label(s, x, y, font, color, align, outlineW) {
    ctx.font = font;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = outlineW || 3;
    ctx.strokeStyle = OUTLINE;
    // outlineW 0 means fill-only: a dark glyph on a bright gold disc
    // or button must not be stroked — a dark stroke swallows it whole.
    if (outlineW !== 0) ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  // Vertical street name: rotated -90 so it reads bottom-to-top
  // along its road. Centred on (x, y); drawn last like every label.
  function vlabel(s, x, y, font, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    label(s, 0, 0, font, color, 'center', 3);
    ctx.restore();
  }

  function divider(x0, x1, y) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }

  function heading(s, x, y) {
    label(s, x, y, 'bold 11px Arial, Helvetica, sans-serif', GOLD, 'left', 3);
  }

  // ================================================================
  // PHASE 1 — opaque background, top bar, panel frames
  // ================================================================
  ctx.save();
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Top bar (0..60): slightly lighter plum band, gold hairline below.
  ctx.fillStyle = TOPBAR;
  ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = 'rgba(245,185,66,0.45)';
  ctx.fillRect(0, 60, W, 2);

  // Tabs: MAP active with a warm accent background, the rest plain.
  var TABS = ['MAP', 'STORY', 'STATS', 'CREW', 'SETTINGS', 'CONTROLS', 'SAVE'];
  var tabW = 88, tabH = 34, tabY = 13;
  var tabX0 = (W - TABS.length * tabW) / 2;
  for (var ti = 0; ti < TABS.length; ti++) {
    var tx = tabX0 + ti * tabW;
    if (ti === 0) {
      ctx.fillStyle = '#b3541e';
      rr(tx + 2, tabY, tabW - 4, tabH, 6);
      ctx.fill();
    }
  }

  // Side panels.
  ctx.fillStyle = PANEL;
  rr(LEFT.x, LEFT.y, LEFT.w, LEFT.h, 10);
  ctx.fill();
  ctx.strokeStyle = PANEL_LINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = PANEL;
  rr(RIGHT.x, RIGHT.y, RIGHT.w, RIGHT.h, 10);
  ctx.fill();
  ctx.strokeStyle = PANEL_LINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // ================================================================
  // PHASE 2 — the map: sea, beach, districts, roads, route, markers
  // (no text in this phase)
  // ================================================================
  var mx = MAP.x, my = MAP.y, mw = MAP.w, mh = MAP.h;

  // Old map land: one dark maroon mass, no district fills.
  ctx.fillStyle = MAROON;
  ctx.fillRect(mx, my, mw, mh);

  // Fine darker grid across the whole landmass.
  ctx.strokeStyle = MAROON_GRID;
  ctx.lineWidth = 1;
  for (var gx = SEA_X1 + 24; gx < mx + mw; gx += 24) {
    ctx.beginPath();
    ctx.moveTo(gx, my);
    ctx.lineTo(gx, BEACH_TOP);
    ctx.stroke();
  }
  for (var gy = my + 24; gy < BEACH_TOP; gy += 24) {
    ctx.beginPath();
    ctx.moveTo(SEA_X1, gy);
    ctx.lineTo(mx + mw, gy);
    ctx.stroke();
  }

  // Sea strip along the west edge (deep teal), beach along the south.
  ctx.fillStyle = SEA;
  ctx.fillRect(mx, my, SEA_X1 - mx, mh);
  ctx.fillStyle = BEACH;
  ctx.fillRect(SEA_X1, BEACH_TOP, mx + mw - SEA_X1, my + mh - BEACH_TOP);
  // Foam line where beach meets the land, and where sea meets land.
  ctx.fillStyle = 'rgba(255,246,220,0.7)';
  ctx.fillRect(SEA_X1, BEACH_TOP - 2, mx + mw - SEA_X1, 2);
  ctx.fillStyle = 'rgba(255,246,220,0.45)';
  ctx.fillRect(SEA_X1 - 2, my, 2, mh);

  // Major roads: strong white bands on the grid lines, plus the
  // coastal road where the sea meets the land.
  ctx.fillStyle = ROAD;
  for (var ri = 0; ri < ROAD_V.length; ri++) {
    ctx.fillRect(ROAD_V[ri] - 2, my, 5, BEACH_TOP - my);
  }
  for (var rj = 0; rj < ROAD_H.length; rj++) {
    ctx.fillRect(SEA_X1, ROAD_H[rj] - 2, mx + mw - SEA_X1, 5);
  }
  ctx.fillRect(SEA_X1 - 2, my, 4, BEACH_TOP - my); // coastal road

  // Sea waves (west strip): small white marks.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (var wi = 0; wi < 5; wi++) {
    var wy = my + 80 + wi * 104;
    ctx.beginPath();
    ctx.moveTo(mx + 8, wy);
    ctx.quadraticCurveTo(mx + 18, wy - 7, mx + 28, wy);
    ctx.quadraticCurveTo(mx + 36, wy + 7, mx + 40, wy);
    ctx.stroke();
  }

  // ---- escape route: gold dashed line, vault (TORRE) to boat (PLAYA)
  // Dark under-dash first so the gold reads on the white roads too.
  ctx.lineWidth = 6;
  ctx.setLineDash([12, 8]);
  ctx.strokeStyle = 'rgba(12,6,20,0.85)';
  ctx.beginPath();
  ctx.moveTo(ROUTE[0][0], ROUTE[0][1]);
  for (var pi = 1; pi < ROUTE.length; pi++) ctx.lineTo(ROUTE[pi][0], ROUTE[pi][1]);
  ctx.stroke();
  ctx.strokeStyle = GOLD_LINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ROUTE[0][0], ROUTE[0][1]);
  for (var pj = 1; pj < ROUTE.length; pj++) ctx.lineTo(ROUTE[pj][0], ROUTE[pj][1]);
  ctx.stroke();
  ctx.setLineDash([]);

  // ---- markers (shapes only; their glyphs are labels, drawn last) --
  // Cordon + turf blocks first: discs and dots paint over them, so the
  // mission dot inside the green turf block stays visible and the
  // vault disc sits on top of the cordon arc.
  // Police cordon: red dashed circle around the TORRE area.
  ctx.strokeStyle = '#e23b2e';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 6]);
  circle(CORDON.x, CORDON.y, CORDON.r);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crew turf: big green block covering the PALM AVE area.
  ctx.fillStyle = TURF_GREEN;
  ctx.fillRect(TURF.x, TURF.y, TURF.w, TURF.h);
  ctx.strokeStyle = '#145c26';
  ctx.lineWidth = 2;
  ctx.strokeRect(TURF.x, TURF.y, TURF.w, TURF.h);

  // Tiburones turf: small red block in FAROL ROJO.
  ctx.fillStyle = TIB_RED;
  ctx.fillRect(TIB.x, TIB.y, TIB.w, TIB.h);
  ctx.strokeStyle = '#6d130c';
  ctx.lineWidth = 2;
  ctx.strokeRect(TIB.x, TIB.y, TIB.w, TIB.h);

  // Vault: gold ring at the route start in TORRE.
  ctx.fillStyle = GOLD_LINE;
  circle(VAULT[0], VAULT[1], 11);
  ctx.fill();
  ctx.strokeStyle = '#7a5200';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Robbery targets: gold dollar discs (Miramar Strip, Hillside).
  for (var dli = 0; dli < dollars.length; dli++) {
    ctx.fillStyle = GOLD_LINE;
    circle(dollars[dli][0], dollars[dli][1], 10);
    ctx.fill();
    ctx.strokeStyle = '#7a5200';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Mission targets: blue dots with a white ring (two near TORRE,
  // one in the crew-turf block).
  for (var mi = 0; mi < missions.length; mi++) {
    ctx.fillStyle = '#2f6fd0';
    circle(missions[mi][0], missions[mi][1], 7);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // LCPD units: red dots on the streets.
  for (var ci = 0; ci < cops.length; ci++) {
    ctx.fillStyle = '#e23b2e';
    circle(cops[ci][0], cops[ci][1], 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Hideout: dark square with a gold border, near TORRE.
  ctx.fillStyle = '#1a1226';
  ctx.fillRect(HIDEOUT[0], HIDEOUT[1], 18, 18);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(HIDEOUT[0], HIDEOUT[1], 18, 18);

  // Player triangle on the route near TORRE (white, pointing up).
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1a1226';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PLAYER[0], PLAYER[1] - 10);
  ctx.lineTo(PLAYER[0] - 10, PLAYER[1] + 8);
  ctx.lineTo(PLAYER[0] + 10, PLAYER[1] + 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Boat at the end of the route, Playa Dorada: small white triangle.
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1a1226';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(358, 492);
  ctx.lineTo(349, 510);
  ctx.lineTo(367, 510);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Compass: dark disc with a gold ring, top-right of the map,
  // red triangle inside pointing north.
  ctx.fillStyle = '#1a1226';
  circle(COMPASS[0], COMPASS[1], 14);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e23b2e';
  ctx.beginPath();
  ctx.moveTo(COMPASS[0], COMPASS[1] - 9);
  ctx.lineTo(COMPASS[0] - 6, COMPASS[1] + 6);
  ctx.lineTo(COMPASS[0] + 6, COMPASS[1] + 6);
  ctx.closePath();
  ctx.fill();

  // Map frame.
  ctx.strokeStyle = 'rgba(245,185,66,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(mx + 1, my + 1, mw - 2, mh - 2);

  // Bottom banner pill: PUERTO LUMEN — CITY MAP, straddling the map's
  // bottom edge like the old map.
  ctx.fillStyle = 'rgba(20,12,28,0.88)';
  rr(530, 641, 220, 30, 15);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,185,66,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Legend box, bottom-left interior of the map.
  ctx.fillStyle = 'rgba(20,12,28,0.88)';
  rr(LEGEND.x, LEGEND.y, LEGEND.w, LEGEND.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,185,66,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Legend swatches (shapes only; captions are labels, drawn last).
  // col 1 (x 320): escape route, Mara, mission target, LCPD units
  ctx.strokeStyle = GOLD_LINE;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(320, legRows[0] - 3);
  ctx.lineTo(334, legRows[0] - 3);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(328, legRows[1] - 9);
  ctx.lineTo(322, legRows[1] + 1);
  ctx.lineTo(334, legRows[1] + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f6fd0';
  circle(328, legRows[2] - 3, 5);
  ctx.fill();
  ctx.fillStyle = '#e23b2e';
  circle(328, legRows[3] - 3, 5);
  ctx.fill();
  // col 2 (x 500): robbery targets, crew turf, Tiburones turf
  ctx.fillStyle = GOLD_LINE;
  circle(508, legRows[0] - 3, 6);
  ctx.fill();
  ctx.fillStyle = TURF_GREEN;
  ctx.fillRect(502, legRows[1] - 9, 12, 9);
  ctx.fill();
  ctx.fillStyle = TIB_RED;
  ctx.fillRect(502, legRows[2] - 9, 12, 9);
  ctx.fill();

  // ================================================================
  // LEFT PANEL — shapes (ring, bars, checkboxes)
  // ================================================================
  var pct = Math.round((v.jobN / v.jobTotal) * 100);
  // Completion ring, full.
  var ringX = 150, ringY = 144, ringR = 52;
  ctx.strokeStyle = '#3a2b52';
  ctx.lineWidth = 10;
  circle(ringX, ringY, ringR);
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (pct / 100));
  ctx.stroke();

  // Progress items: checkbox + thin bar each.
  var prog = [
    { label: 'Street races won', done: 1, total: 1 },
    { label: 'Turf taken', done: v.turf, total: v.turfTotal },
    { label: 'Crew recruited', done: v.crew.length, total: 4 },
    { label: 'Vaults cracked', done: 1, total: 1 },
  ];
  var progY = [290, 330, 370, 410];
  for (var pri = 0; pri < prog.length; pri++) {
    var p = prog[pri];
    var py = progY[pri];
    // Checkbox square.
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(36, py - 12, 13, 13);
    if (p.done >= p.total) {
      ctx.fillStyle = GOLD;
      ctx.fillRect(38, py - 10, 9, 9);
    }
    // Thin progress bar under the label.
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(36, py + 8, 228, 5);
    ctx.fillStyle = GOLD;
    ctx.fillRect(36, py + 8, 228 * Math.min(1, p.done / p.total), 5);
  }

  // ================================================================
  // RIGHT PANEL — shapes (respect bar, save-slot boxes, buttons)
  // ================================================================
  // Respect bar.
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(1016, 192, 228, 7);
  ctx.fillStyle = '#ff8c1a';
  ctx.fillRect(1016, 192, 228 * Math.min(1, v.respect / v.respectMax), 7);

  // Save slots.
  var slot1 = { x: 1016, y: 452, w: 228, h: 62 };
  var slot2 = { x: 1016, y: 524, w: 228, h: 44 };
  var slot3 = { x: 1016, y: 578, w: 228, h: 44 };
  // Save slots. Slot 1 is the current run: a much lighter card with a
  // strong gold border so its text reads clearly (Sand: slot 1 was
  // too dark to read). Slots 2/3 stay as they were.
  ctx.fillStyle = '#4b355f';
  rr(slot1.x, slot1.y, slot1.w, slot1.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,185,66,0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  rr(slot2.x, slot2.y, slot2.w, slot2.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  rr(slot3.x, slot3.y, slot3.w, slot3.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.stroke();
  // SAVE buttons: bright gold fill on slot 1, outlined on 2 and 3.
  ctx.fillStyle = '#ffd23e';
  rr(1182, 462, 50, 24, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,185,66,0.7)';
  ctx.lineWidth = 1.5;
  rr(1182, 534, 50, 24, 6);
  ctx.stroke();
  rr(1182, 588, 50, 24, 6);
  ctx.stroke();

  // ================================================================
  // PHASE 3 — ALL labels, last, with dark outlines.
  // Nothing drawn after this can cover a letter.
  // ================================================================
  // --- top bar ---
  label('LUMEN BAY', 24, 41, 'bold 30px Arial, Helvetica, sans-serif', GOLD, 'left', 4);
  for (var tj = 0; tj < TABS.length; tj++) {
    var tcx = tabX0 + tj * tabW + tabW / 2;
    label(TABS[tj], tcx, 36, 'bold 13px Arial, Helvetica, sans-serif',
      tj === 0 ? '#ffffff' : '#cbbfd6', 'center', 3);
  }
  label(money(v.cash), 1256, 41, 'bold 28px Arial, Helvetica, sans-serif', GREEN, 'right', 4);

  // --- left panel ---
  label(pct + '%', ringX, 152, 'bold 26px Arial, Helvetica, sans-serif', INK, 'center', 4);
  label(v.jobN + '/' + v.jobTotal + ' STORY JOBS', ringX, 222,
    'bold 13px Arial, Helvetica, sans-serif', GOLD, 'center', 3);
  divider(36, 264, 240);
  heading('PROGRESS', 36, 266);
  for (var pli = 0; pli < prog.length; pli++) {
    var pp = prog[pli];
    label(pp.label, 58, progY[pli], '13px Arial, Helvetica, sans-serif', INK, 'left', 3);
    label(pp.done + '/' + pp.total, 264, progY[pli],
      'bold 13px Arial, Helvetica, sans-serif', GOLD, 'right', 3);
  }
  divider(36, 264, 440);
  heading('CREW', 36, 466);
  var crewY = [490, 513, 536, 559];
  for (var cri = 0; cri < v.crew.length; cri++) {
    var cm = v.crew[cri];
    label(cm.name, 36, crewY[cri], 'bold 13px Arial, Helvetica, sans-serif', INK, 'left', 3);
    label('— ' + cm.role, 36 + ctx.measureText(cm.name).width + 34, crewY[cri],
      '13px Arial, Helvetica, sans-serif', DIM, 'left', 3);
  }
  divider(36, 264, 576);
  heading('CURRENT JOB', 36, 600);
  label('JOB ' + v.jobN + ' · ' + v.jobTitle, 36, 624,
    'bold 12px Arial, Helvetica, sans-serif', INK, 'left', 3);
  label('STAGE ' + v.jobStage + ' · +' + money(v.jobReward) + ' · +' + v.jobRep + ' REP',
    36, 646, '12px Arial, Helvetica, sans-serif', DIM, 'left', 3);

  // --- map: old-map labels, all drawn last with dark outlines ---
  // State + street names first (smallest), then districts, then markers.
  label('LEONIDA', 360, 98, 'bold 11px Arial, Helvetica, sans-serif', '#c9b8a0', 'left', 3);
  label('MARINA RD', 600, 98, '10px Arial, Helvetica, sans-serif', INK, 'center', 3);
  label('LUMEN BAY', 964, 642, 'bold italic 13px Arial, Helvetica, sans-serif',
    '#f2e3c6', 'right', 3);
  // District names (bold white). Long names sit clear of the roads
  // and the route; right-edge names are right-aligned.
  label('MARINA', 360, 150, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'left', 3);
  label('MERCADO VIEJO', 545, 150, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'center', 3);
  label('TORRE', 795, 158, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'center', 3);
  label('FAROL ROJO', 972, 142, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'right', 3);
  label('FESTIVAL AVE', 669, 250, 'bold 11px Arial, Helvetica, sans-serif', '#ffffff', 'center', 3);
  label('TALLER', 360, 300, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'left', 3);
  label('OLD TOWN', 669, 290, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'center', 3);
  label('CASINO ROW', 795, 300, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'center', 3);
  label('FESTIVAL SQ', 972, 300, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'right', 3);
  label('PLAYA DORADA', 381, 517, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'left', 3);
  label('NORTH DOCKS', 760, 600, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'center', 3);
  label('DUNES', 753, 522, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'center', 3);
  label('HILLSIDE', 972, 522, 'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'right', 3);
  // Street names: horizontal ones first, then verticals along roads.
  label('MIRAMAR STRIP', 665, 512, '11px Arial, Helvetica, sans-serif', INK, 'center', 3);
  label('PLAYA DR', 510, 350, '11px Arial, Helvetica, sans-serif', INK, 'left', 3);
  vlabel('OCEAN BLVD', 496, 360, '10px Arial, Helvetica, sans-serif', INK);
  vlabel('PALM AVE', 618, 445, '10px Arial, Helvetica, sans-serif', '#ffffff');
  vlabel('MERCADO ST', 812, 390, '10px Arial, Helvetica, sans-serif', INK);
  vlabel('TORRE BLVD', 940, 390, '10px Arial, Helvetica, sans-serif', INK);
  // Compass letter.
  label('N', 952, 86, 'bold 13px Arial, Helvetica, sans-serif', GOLD, 'center', 3);
  // Banner pill.
  label('PUERTO LUMEN — CITY MAP', 640, 661,
    'bold 13px Arial, Helvetica, sans-serif', GOLD, 'center', 3);
  // Marker glyphs.
  label('$', VAULT[0], VAULT[1] + 4, 'bold 13px Arial, Helvetica, sans-serif', '#1a1200', 'center', 0);
  for (var dgi = 0; dgi < dollars.length; dgi++) {
    label('$', dollars[dgi][0], dollars[dgi][1] + 4,
      'bold 12px Arial, Helvetica, sans-serif', '#1a1200', 'center', 0);
  }
  label('H', HIDEOUT[0] + 9, HIDEOUT[1] + 14, 'bold 12px Arial, Helvetica, sans-serif', GOLD, 'center', 3);
  label('BOAT — PLAYA DORADA', 322, 488, 'bold 11px Arial, Helvetica, sans-serif', GOLD, 'left', 3);
  // Legend captions (old-map entries, full text).
  label('LEGEND', 320, 560, 'bold 11px Arial, Helvetica, sans-serif', GOLD, 'left', 3);
  var legCap = [
    ['ESCAPE ROUTE — VAULT TO BOAT', 336, legRows[0]],
    ['MARA / YOU', 336, legRows[1]],
    ['MISSION TARGET — BOAT', 336, legRows[2]],
    ['LCPD UNITS ON THE STREET', 336, legRows[3]],
    ['ROBBERY TARGETS / PROPERTIES', 516, legRows[0]],
    ['CREW / TURF', 516, legRows[1]],
    ['TIBURONES TURF', 516, legRows[2]],
  ];
  for (var lgi = 0; lgi < legCap.length; lgi++) {
    label(legCap[lgi][0], legCap[lgi][1], legCap[lgi][2],
      '9px Arial, Helvetica, sans-serif', INK, 'left', 3);
  }
  label('$', 508, legRows[0] + 1, 'bold 9px Arial, Helvetica, sans-serif', '#1a1200', 'center', 0);

  // --- right panel ---
  heading('RANK', 1016, 100);
  label(v.rank, 1016, 132, 'bold 30px Arial, Helvetica, sans-serif', GOLD, 'left', 4);
  label('RESPECT ' + v.respect + ' / ' + v.respectMax, 1016, 160,
    '13px Arial, Helvetica, sans-serif', INK, 'left', 3);
  label('NEXT: ' + v.nextRank + ' AT ' + v.nextRankAt, 1016, 182,
    '12px Arial, Helvetica, sans-serif', DIM, 'left', 3);
  divider(1016, 1244, 214);
  heading('CAREER', 1016, 240);
  var career = [
    ['Taken out', String(v.kills)],
    ['Highest wanted', '★'.repeat(v.wanted)],
    ['Turf', v.turf + ' / ' + v.turfTotal],
    ['Day', String(v.day)],
    ['Clock', v.clock],
    ['Standing', v.standingDistrict + ' ' + v.standingPct + '%'],
  ];
  var careerY = [266, 290, 314, 338, 362, 386];
  for (var cai = 0; cai < career.length; cai++) {
    label(career[cai][0], 1016, careerY[cai], '13px Arial, Helvetica, sans-serif', INK, 'left', 3);
    label(career[cai][1], 1244, careerY[cai],
      'bold 13px Arial, Helvetica, sans-serif', cai === 1 ? '#ff5a4e' : INK, 'right', 3);
  }
  divider(1016, 1244, 408);
  heading('SAVE SLOTS', 1016, 434);
  label('SLOT 1', 1028, 470, 'bold 12px Arial, Helvetica, sans-serif', GOLD, 'left', 3);
  label(v.standingDistrict + ' — City Map', 1028, 490,
    'bold 14px Arial, Helvetica, sans-serif', '#ffffff', 'left', 3);
  label(v.jobN + '/' + v.jobTotal + ' missions · Day ' + v.day + ' · ' + v.clock,
    1028, 507, '12px Arial, Helvetica, sans-serif', '#ddd6e6', 'left', 3);
  label('SAVE', 1207, 479, 'bold 12px Arial, Helvetica, sans-serif', '#1a1200', 'center', 0);
  label('SLOT 2 — EMPTY', 1028, 546, '12px Arial, Helvetica, sans-serif', DIM, 'left', 3);
  label('SAVE', 1207, 551, 'bold 11px Arial, Helvetica, sans-serif', GOLD, 'center', 3);
  label('SLOT 3 — EMPTY', 1028, 600, '12px Arial, Helvetica, sans-serif', DIM, 'left', 3);
  label('SAVE', 1207, 605, 'bold 11px Arial, Helvetica, sans-serif', GOLD, 'center', 3);

  // --- bottom hint line ---
  label('ESC  resume      ·      Q / E  switch tab      ·      Click the map to set a waypoint',
    640, 700, '13px Arial, Helvetica, sans-serif', DIM, 'center', 3);

  ctx.restore();
}
