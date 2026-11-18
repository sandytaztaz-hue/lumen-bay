// Keyboard and mouse input. Held keys give movement and driving; one-shot
// presses (enter a car, start a mission, pause, switch weapon, cycle radio)
// are queued as flags and taken once by the loop, so a press between two frames
// is never lost and never counted twice. The camera orbits by mouse drag.
export const ACTION_ENTER = 1;
export const ACTION_MISSION = 2;
export const ACTION_PAUSE = 4;
export const ACTION_FIRE = 8;
export const ACTION_WEAPON1 = 16;
export const ACTION_WEAPON2 = 32;
export const ACTION_RADIO = 64;
export const ACTION_CONFIRM = 128;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let dragging = false;
  let lastX = 0, lastY = 0;
  let yawDelta = 0, pitchDelta = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    switch (event.code) {
      case 'KeyE': actions |= ACTION_ENTER; break;
      case 'KeyM': actions |= ACTION_MISSION; break;
      case 'Escape': case 'KeyP': actions |= ACTION_PAUSE; break;
      case 'Digit1': actions |= ACTION_WEAPON1; break;
      case 'Digit2': actions |= ACTION_WEAPON2; break;
      case 'KeyR': actions |= ACTION_RADIO; break;
      case 'Enter': case 'Space': actions |= ACTION_CONFIRM; break;
      default: break;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) { actions |= ACTION_FIRE; keys.add('MouseLeft'); }
    if (event.button === 2 || event.button === 0) { dragging = true; lastX = event.clientX; lastY = event.clientY; }
  });
  window.addEventListener('mouseup', (event) => { dragging = false; if (event.button === 0) keys.delete('MouseLeft'); });
  window.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    yawDelta += (event.clientX - lastX) * 0.005;
    pitchDelta += (event.clientY - lastY) * 0.004;
    lastX = event.clientX; lastY = event.clientY;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    get forward() { return keys.has('KeyW') || keys.has('ArrowUp'); },
    get back() { return keys.has('KeyS') || keys.has('ArrowDown'); },
    get left() { return keys.has('KeyA') || keys.has('ArrowLeft'); },
    get right() { return keys.has('KeyD') || keys.has('ArrowRight'); },
    get sprint() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    get handbrake() { return keys.has('Space'); },
    get firing() { return keys.has('MouseLeft'); },
    takeActions() { const a = actions; actions = 0; return a; },
    takeOrbit() {
      const d = { yaw: yawDelta, pitch: pitchDelta };
      yawDelta = 0; pitchDelta = 0;
      return d;
    },
    // Test hooks: probes and the shot autopilot drive the game through these.
    press(code) { keys.add(code); },
    release(code) { keys.delete(code); },
    queue(action) { actions |= action; },
  };
}
