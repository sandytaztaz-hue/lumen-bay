// Input: keyboard state + mouse drag to orbit the camera + click to shoot.
// Also exposes edge-triggered "pressed" keys (E, M, R, P, digits) so the
// main loop can act on them exactly once per keypress.
export function makeInput() {
  const input = {
    forward: false, back: false, left: false, right: false,
    run: false, fire: false, aiming: false,
    camHeading: 0, camYaw: 0, camPitch: 0.32,
    pressed: new Set(),
    mouseDown: false, lastX: 0, lastY: 0,
  };
  const heldKeys = {
    KeyW: 'forward', ArrowUp: 'forward',
    KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
  };
  window.addEventListener('keydown', (e) => {
    if (heldKeys[e.code] !== undefined) {
      input[heldKeys[e.code]] = true;
      e.preventDefault();
    }
    if (!e.repeat) input.pressed.add(e.code);
    if (e.code === 'Space') e.preventDefault();
    // C snaps the camera back behind the player/car.
    if (e.code === 'KeyC' && !e.repeat) {
      input.camYaw = 0;
      input.camPitch = 0.32;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (heldKeys[e.code] !== undefined) input[heldKeys[e.code]] = false;
  });
  window.addEventListener('blur', () => {
    input.forward = input.back = input.left = input.right = input.run = false;
  });
  const canvas = document.getElementById('game');
  canvas.addEventListener('mousedown', (e) => {
    input.mouseDown = true;
    input.lastX = e.clientX;
    input.lastY = e.clientY;
    if (e.button === 0) input.fire = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.fire = false;
    input.mouseDown = false;
  });
  const dragLook = (dx, dy) => {
    input.camYaw -= dx * 0.005;
    input.camPitch = Math.max(-0.1, Math.min(0.9, input.camPitch + dy * 0.003));
  };
  window.addEventListener('mousemove', (e) => {
    if (!input.mouseDown) return;
    const dx = e.clientX - input.lastX;
    const dy = e.clientY - input.lastY;
    input.lastX = e.clientX;
    input.lastY = e.clientY;
    dragLook(dx, dy);
  });
  // Touch: drag anywhere to look around.
  let touchId = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchId = t.identifier;
    input.lastX = t.clientX;
    input.lastY = t.clientY;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      const dx = t.clientX - input.lastX;
      const dy = t.clientY - input.lastY;
      input.lastX = t.clientX;
      input.lastY = t.clientY;
      dragLook(dx, dy);
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { touchId = null; });
  return input;
}

/** True once, for the frame the key went down. Call after reading. */
export function wasPressed(input, code) {
  return input.pressed.has(code);
}

export function clearPressed(input) {
  input.pressed.clear();
}

/** Synthetic input for the screenshot autopilot: drives straight ahead. */
export function autopilotInput(forward = true) {
  return {
    forward, back: false, left: false, right: false, run: false,
    fire: false, aiming: false, camHeading: 0, camYaw: 0, camPitch: 0.32,
    pressed: new Set(), mouseDown: false, lastX: 0, lastY: 0,
  };
}
