// LUMEN BAY — input.js
// Keyboard, mouse orbit, click to shoot, and the title and pause
// buttons. Plus a small helper that turns two keys into a
// minus-one-to-one axis.

export function axis(input, negKey, posKey) {
  const neg = input.keys.has(negKey) ? 1 : 0;
  const pos = input.keys.has(posKey) ? 1 : 0;
  return pos - neg;
}

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.canvas = canvas;
    this.yaw = 0;
    this.pitch = 0.35;
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.onShoot = null;
    this.onKey = null;
    this._keydown = (e) => {
      this.keys.add(e.code);
      if (this.onKey) this.onKey(e.code, true);
      if (e.code === 'Space') e.preventDefault();
    };
    this._keyup = (e) => {
      this.keys.delete(e.code);
      if (this.onKey) this.onKey(e.code, false);
    };
    this._mousedown = (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.downX = e.clientX;
      this.downY = e.clientY;
    };
    this._mousemove = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.yaw -= dx * 0.005;
      this.pitch += dy * 0.004;
      if (this.pitch < 0.05) this.pitch = 0.05;
      if (this.pitch > 1.2) this.pitch = 1.2;
    };
    this._mouseup = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      // A click (no real drag since mousedown) fires the weapon. The
      // drag distance is measured from the mousedown point: measuring
      // from the last mousemove would fire after every orbit drag.
      const moved = Math.abs(e.clientX - this.downX) + Math.abs(e.clientY - this.downY);
      if (moved < 6 && this.onShoot) this.onShoot();
    };
    window.addEventListener('keydown', this._keydown);
    window.addEventListener('keyup', this._keyup);
    canvas.addEventListener('mousedown', this._mousedown);
    window.addEventListener('mousemove', this._mousemove);
    window.addEventListener('mouseup', this._mouseup);
  }

  destroy() {
    window.removeEventListener('keydown', this._keydown);
    window.removeEventListener('keyup', this._keyup);
    this.canvas.removeEventListener('mousedown', this._mousedown);
    window.removeEventListener('mousemove', this._mousemove);
    window.removeEventListener('mouseup', this._mouseup);
  }
}
