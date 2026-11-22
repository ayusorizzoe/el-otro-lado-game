// Frame timing. Provides a clamped delta so a hidden tab or a long frame
// never produces a huge step for systems that integrate over time.

export class Time {
  constructor(maxDelta = 0.1) {
    this.maxDelta = maxDelta;
    this.delta = 0;
    this.elapsed = 0;
    this.frame = 0;
    this._last = performance.now();
  }

  tick(now = performance.now()) {
    this.delta = Math.min(this.maxDelta, (now - this._last) / 1000);
    this._last = now;
    this.elapsed += this.delta;
    this.frame++;
    return this.delta;
  }
}
