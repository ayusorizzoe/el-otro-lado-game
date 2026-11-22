// The hour and what's been heard. Pure state: no rendering.

export class GameState {
  constructor() {
    this.hour = 9;
    this.hourGoal = 9.5;        // winning moves the day along; the light follows
    this.heard = [];
    this.ended = null;
    this.events = [];
  }
  get abs() { return this.hour; }

  tick(dt) {
    if (this.ended || this.hour >= this.hourGoal) return;
    this.hour = Math.min(this.hourGoal, this.hour + dt * Math.min(0.09, 0.02 + (this.hourGoal - this.hour) * 0.03));
  }
  windowActive(from, to) { return this.hour >= from && this.hour < to; }

  markHeard(id) { if (!this.heard.includes(id)) this.heard.push(id); }
  end(kind) {
    if (this.ended) return;
    this.ended = kind;
    this.events.push({ type: 'end', kind });
  }
}
