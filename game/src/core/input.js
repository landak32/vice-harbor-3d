// Keyboard and mouse, with edge detection so "press E once" means once. The mouse is only
// read while the pointer is locked, except in screenshot mode where the camera is scripted.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.firing = false;
    this.locked = false;
    this.enabled = true;
    this.canvas = canvas;
    this._down = (e) => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressedKeys.add(e.code);
      this.keys.add(e.code);
    };
    this._up = (e) => this.keys.delete(e.code);
    this._move = (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    };
    this._mouseDown = (e) => { if (e.button === 0) this.firing = true; };
    this._mouseUp = (e) => { if (e.button === 0) this.firing = false; };
    this._lockChange = () => { this.locked = document.pointerLockElement === canvas; };
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('mousemove', this._move);
    window.addEventListener('mousedown', this._mouseDown);
    window.addEventListener('mouseup', this._mouseUp);
    document.addEventListener('pointerlockchange', this._lockChange);
    window.addEventListener('blur', () => { this.keys.clear(); this.firing = false; });
  }
  down(code) { return this.keys.has(code); }
  hit(code) { return this.pressedKeys.has(code); }
  axis(neg, pos) { return (this.down(pos) ? 1 : 0) - (this.down(neg) ? 1 : 0); }
  takeMouse() { const d = { x: this.mouseDX, y: this.mouseDY }; this.mouseDX = 0; this.mouseDY = 0; return d; }
  endFrame() { this.pressedKeys.clear(); }
  lock() { if (this.canvas.requestPointerLock) this.canvas.requestPointerLock(); }
  unlock() { if (document.exitPointerLock) document.exitPointerLock(); }
}
