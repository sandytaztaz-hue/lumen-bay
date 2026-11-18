// Input for LUMEN BAY: keyboard state, one-shot action flags, mouse orbit
// and click-to-shoot. Held keys are read every frame; presses that must fire
// exactly once (mission start, enter car, pause, weapon switch, radio) are
// queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. A key released while the tab
// is hidden never sends keyup, so blur clears everything held.

export const ACTION_MISSION = 1;
export const ACTION_ENTER = 2;
export const ACTION_PAUSE = 4;
export const ACTION_WEAPON1 = 8;
export const ACTION_WEAPON2 = 16;
export const ACTION_RADIO = 32;
export const ACTION_CONFIRM = 64;

const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  Space: 'handbrake',
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseDown = false;
  let mouseMoved = { x: 0, y: 0 };
  let clicked = false;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const name = KEYMAP[event.code];
    if (name) { held.add(name); event.preventDefault(); return; }
    if (event.code === 'KeyM') actions |= ACTION_MISSION;
    else if (event.code === 'KeyE') actions |= ACTION_ENTER;
    else if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACTION_PAUSE;
    else if (event.code === 'Digit1') actions |= ACTION_WEAPON1;
    else if (event.code === 'Digit2') actions |= ACTION_WEAPON2;
    else if (event.code === 'KeyR') actions |= ACTION_RADIO;
    else if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    const name = KEYMAP[event.code];
    if (name) held.delete(name);
  });
  window.addEventListener('blur', () => { held.clear(); mouseDown = false; });

  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    clicked = true;
    if (canvas.requestPointerLock) {
      try { canvas.requestPointerLock(); } catch { /* pointer lock is optional */ }
    }
    event.preventDefault();
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });
  window.addEventListener('pointermove', (event) => {
    if (!mouseDown) return;
    mouseMoved.x += event.movementX || 0;
    mouseMoved.y += event.movementY || 0;
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas) mouseDown = false;
  });

  return {
    held(name) { return held.has(name); },
    // WASD as a -1..1 pair, already combined (both keys = 0).
    move() {
      return {
        x: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
        y: (held.has('forward') ? 1 : 0) - (held.has('back') ? 1 : 0),
      };
    },
    sprint() { return held.has('sprint'); },
    handbrake() { return held.has('handbrake'); },
    firing() { return mouseDown; },
    // One-shot click since the last take (used for the title-screen start and
    // for firing a single shot on a click in menus).
    takeClick() { const c = clicked; clicked = false; return c; },
    takeOrbit() { const m = mouseMoved; mouseMoved = { x: 0, y: 0 }; return m; },
    takeActions() { const a = actions; actions = 0; return a; },
    // For probes: pretend a key was pressed (dispatches the same flags).
    press(code) {
      if (code === 'KeyM') actions |= ACTION_MISSION;
      else if (code === 'KeyE') actions |= ACTION_ENTER;
      else if (code === 'Escape') actions |= ACTION_PAUSE;
      else if (code === 'Digit1') actions |= ACTION_WEAPON1;
      else if (code === 'Digit2') actions |= ACTION_WEAPON2;
      else if (code === 'KeyR') actions |= ACTION_RADIO;
      else if (code === 'Enter' || code === 'Space') actions |= ACTION_CONFIRM;
    },
    hold(name, on) { if (on) held.add(name); else held.delete(name); },
  };
}
