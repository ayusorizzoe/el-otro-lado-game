// Keyboard and mouse state, read once per frame by the systems that need it.

export class InputSystem {
  constructor(dom) {
    this.keys = new Set();
    this.pressed = new Set();     // went down this frame
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
    this.dragging = false;
    addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('mousedown', () => { this.dragging = true; });
    addEventListener('mouseup', () => { this.dragging = false; });
    addEventListener('mousemove', (e) => { if (this.dragging) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; } });
    dom.addEventListener('wheel', (e) => { this.wheel += e.deltaY; }, { passive: true });
  }

  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  hit(...codes) { return codes.some((c) => this.pressed.has(c)); }

  get move() {
    return {
      fwd: (this.down('KeyW', 'ArrowUp') ? 1 : 0) - (this.down('KeyS', 'ArrowDown') ? 1 : 0),
      right: (this.down('KeyD', 'ArrowRight') ? 1 : 0) - (this.down('KeyA', 'ArrowLeft') ? 1 : 0),
    };
  }

  endFrame() { this.pressed.clear(); this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0; }
}
