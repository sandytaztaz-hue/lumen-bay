// LUMEN BAY — keyboard and mouse input.
// WASD move/drive, mouse orbit + click to shoot, E enter/steal, Shift sprint,
// Space handbrake, 1/2 weapons, M start job, R radio, Esc pause, Enter confirm.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MISSION = 4;
export const ACTION_RADIO = 8;
export const ACTION_ENTER = 16;

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseDX: 0,
    mouseDY: 0,
    mouseDown: false,
    clicked: false,
    actions: 0,
    pointerLocked: false,
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    input.keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') input.actions |= ACTION_CONFIRM;
    if (event.code === 'Escape') input.actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') input.actions |= ACTION_MISSION;
    if (event.code === 'KeyR') input.actions |= ACTION_RADIO;
    if (event.code === 'KeyE') input.actions |= ACTION_ENTER;
    if (event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.mouseDown = true;
      input.clicked = true;
      if (!input.pointerLocked && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
      }
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouseDown = false;
  });
  document.addEventListener('pointerlockchange', () => {
    input.pointerLocked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', (event) => {
    if (input.pointerLocked) {
      input.mouseDX += event.movementX || 0;
      input.mouseDY += event.movementY || 0;
    }
  });
  return input;
}

// Read the current movement state, normalised for the frame.
export function readMove(input) {
  const keys = input.keys;
  return {
    forward: keys.has('KeyW') || keys.has('ArrowUp'),
    back: keys.has('KeyS') || keys.has('ArrowDown'),
    left: keys.has('KeyA') || keys.has('ArrowLeft'),
    right: keys.has('KeyD') || keys.has('ArrowRight'),
    sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    handbrake: keys.has('Space'),
  };
}

// Consume the mouse deltas accumulated since the last frame.
export function takeMouse(input) {
  const dx = input.mouseDX;
  const dy = input.mouseDY;
  input.mouseDX = 0;
  input.mouseDY = 0;
  return { dx, dy };
}

// Consume one-shot actions (M, R, E, Esc, Enter) raised since the last frame.
export function takeActions(input) {
  const actions = input.actions;
  input.actions = 0;
  return actions;
}

export function takeClick(input) {
  const clicked = input.clicked;
  input.clicked = false;
  return clicked;
}

// Weapon switching and fire-rate helpers, kept beside input so the main loop
// stays readable: which keys switch weapons, and whether the trigger is live
// this frame (pistol fires on click, SMG on hold).
export function weaponKey(input) {
  if (input.keys.has('Digit1')) return 'pistol';
  if (input.keys.has('Digit2')) return 'smg';
  return null;
}

export function triggerLive(input, weapon) {
  if (weapon.auto) return input.mouseDown;
  return takeClick(input);
}
