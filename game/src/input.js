// LUMEN BAY — keyboard + mouse input. WASD/arrows drive and walk, Space
// handbrakes, Shift burns NOS, E enters/exits cars and interacts, M opens
// the map, P pauses, 1/2/3 switch weapons, mouse drag orbits the camera
// and click fires. State is polled by main.js; edge events (key presses)
// go through a small queue the game drains each frame.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = [];
    this.mouseDown = false;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.push(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.pressed.push('MouseClick');
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
      this.dragging = false;
    });
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (this.dragging) {
        this.mouseDX += e.clientX - this.lastX;
        this.mouseDY += e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
  }

  down(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  // Drain the pressed queue (edge-triggered actions only).
  takePressed() {
    const out = this.pressed;
    this.pressed = [];
    return out;
  }

  takeMouseDelta() {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }

  // Simulate a key press (used by the probe through window.__lumen).
  simulate(code) {
    this.keys.add(code);
    this.pressed.push(code);
    setTimeout(() => this.keys.delete(code), 120);
  }
}
