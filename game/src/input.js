// LUMEN BAY — input: keyboard + mouse orbit + click to shoot.
// WASD move/drive, mouse drag orbits the camera, E steals/exits cars,
// Shift burns NOS, Space handbrakes, M opens the map, P/Esc pauses,
// 1/2/3 switch weapons, R starts the radio.
export function bindInput(G) {
  const keys = new Set();
  G.keys = keys;
  G.mouse = { dx: 0, dy: 0, down: false };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    G.audio.ensure();
    if (e.code === 'KeyE') G.tryEnterExitCar();
    if (e.code === 'KeyM') G.toggleMap();
    if (e.code === 'KeyP' || e.code === 'Escape') G.togglePause();
    if (e.code === 'Digit1') G.setWeapon('FISTS');
    if (e.code === 'Digit2') G.setWeapon('PISTOL');
    if (e.code === 'Digit3') G.setWeapon('SMG');
    if (e.code === 'KeyR') G.toggleRadio();
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  const canvas = document.getElementById('c3d');
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    G.mouse.down = true;
    G.audio.ensure();
    if (e.button === 0) G.tryShoot();
  });
  window.addEventListener('mouseup', () => { G.mouse.down = false; });
  window.addEventListener('mousemove', (e) => {
    if (!G.mouse.down) return;
    G.mouse.dx += e.movementX || 0;
    G.mouse.dy += e.movementY || 0;
  });
  // click the PLAY / CONTINUE button on the title screen
  document.getElementById('playBtn')?.addEventListener('click', () => G.startGame());
  document.getElementById('resumeBtn')?.addEventListener('click', () => G.togglePause());
}

export function axis(keys, neg, pos) {
  return (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);
}
