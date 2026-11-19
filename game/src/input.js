// LUMEN BAY r6 — input: keyboard state, one-shot action flags, mouse orbit
// and click-to-fire. Held keys steer; presses are queued once and taken by the
// loop, so a press between frames is never lost or double-counted.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MISSION = 4;
export const ACTION_INTERACT = 8;
export const ACTION_WEAPON1 = 16;
export const ACTION_WEAPON2 = 32;
export const ACTION_WEAPON3 = 64;
export const ACTION_RADIO = 128;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  Space: 'brake',
};

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false, sprint: false, brake: false };
  let actions = 0;
  let mouseDX = 0;
  let mouseDY = 0;
  let mouseDown = false;
  let firing = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('keydown', (event) => {
    const name = KEYMAP[event.code];
    if (name) { held[name] = true; event.preventDefault(); return; }
    if (event.repeat) return;
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    else if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACTION_PAUSE;
    else if (event.code === 'KeyM') actions |= ACTION_MISSION;
    else if (event.code === 'KeyE') actions |= ACTION_INTERACT;
    else if (event.code === 'Digit1') actions |= ACTION_WEAPON1;
    else if (event.code === 'Digit2') actions |= ACTION_WEAPON2;
    else if (event.code === 'Digit3') actions |= ACTION_WEAPON3;
    else if (event.code === 'KeyR') actions |= ACTION_RADIO;
  });
  window.addEventListener('keyup', (event) => {
    const name = KEYMAP[event.code];
    if (name) held[name] = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(held)) held[k] = false;
    firing = false;
    dragging = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    firing = true;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    mouseDX += event.clientX - lastX;
    mouseDY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  const endPointer = () => { mouseDown = false; firing = false; dragging = false; };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  return {
    held,
    get firing() { return firing; },
    get mouseDown() { return mouseDown; },
    takeMouse() {
      const d = { dx: mouseDX, dy: mouseDY };
      mouseDX = 0;
      mouseDY = 0;
      return d;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Test hook: pretend a key was pressed (used by the scripted probes). */
    press(action) { actions |= action; },
    setHeld(name, v) { if (name in held) held[name] = v; },
  };
}

// ---- steering helpers -------------------------------------------------------

/** Forward/strafe from held keys, relative to a camera yaw. */
export function moveVector(held, yaw) {
  const f = (held.up ? 1 : 0) - (held.down ? 1 : 0);
  const s = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const mx = sin * f + cos * s;
  const mz = cos * f - sin * s;
  const len = Math.hypot(mx, mz);
  if (len > 1) return [mx / len, mz / len];
  return [mx, mz];
}

/** Car throttle/steer from held keys. */
export function driveVector(held) {
  const throttle = (held.up ? 1 : 0) - (held.down ? 0.7 : 0);
  const steer = (held.left ? 1 : 0) - (held.right ? 1 : 0);
  return { throttle, steer };
}
