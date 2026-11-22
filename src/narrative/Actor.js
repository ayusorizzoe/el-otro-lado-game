// A person who walks to a place, stays, and walks away. Shared by residents and by the
// people heard talking around the street.

import { Human } from '../entities/Human.js';
import { collision } from '../systems/CollisionSystem.js';

const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export class Actor {
  constructor(scene, materials, look, name) {
    this.h = new Human(materials, look, name);
    this.h.object3d.visible = false;
    scene.add(this.h.object3d);
    this.state = 'away';
    this.path = null;
    this.pos = { x: 0, z: 0 };
  }
  arrive(mark) {
    this.mark = mark;
    const via = mark.via || [[Math.max(-18, Math.min(18, mark.x + (mark.x > 0 ? 8 : -8))), 7.95]];
    this.path = via.concat([[mark.x, mark.z]]).map((p) => [p[0], p[1]]);
    this.pos = { x: this.path[0][0], z: this.path[0][1] };
    this.path.shift();
    this.state = 'moving'; this.next = 'here';
    this.h.object3d.visible = true;
  }
  leave() {
    if (this.state === 'away' || this.next === 'away') return;
    const via = this.mark.via ? this.mark.via.slice().reverse() : [[this.pos.x, 7.95], [Math.max(-18, Math.min(18, this.pos.x + (this.pos.x > 0 ? 9 : -9))), 7.95]];
    this.path = via.map((p) => [p[0], p[1]]);
    this.state = 'moving'; this.next = 'away';
  }
  walk(route, then) { this.path = route.map((p) => [p[0], p[1]]); this.state = 'moving'; this.next = then; }
  hide() { this.state = 'away'; this.next = null; this.h.object3d.visible = false; }
  get here() { return this.state === 'here'; }

  // o: { speed, hold, face, headTurn, headPitch, pose, talking }
  update(dt, o, cat) {
    if (this.state === 'away') return;
    const obj = this.h.object3d;
    let speed = 0, yaw = this.mark ? this.mark.face : 0;
    if (this.state === 'moving') {
      yaw = obj.rotation.y;
      if (!o.hold && this.path.length) {
        const [tx, tz] = this.path[0];
        const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
        speed = o.speed || 1.1;
        const step = speed * dt;
        if (d <= Math.max(0.1, step)) { this.pos.x = tx; this.pos.z = tz; this.path.shift(); }
        else { this.pos.x += (dx / d) * step; this.pos.z += (dz / d) * step; yaw = Math.atan2(dx, dz); }
      }
      if (!this.path.length) { this.state = this.next; if (this.state === 'away') { this.hide(); return; } }
    }
    // sitting, they stay at floor level (the pose does the lowering): the bench's floor, or the
    // street below the curb they sit on
    const seated = this.state === 'here' && o.pose && (o.pose.sit || o.pose.curb);
    this.y = seated ? (o.pose.curb ? 0 : collision.groundAt(this.pos.x, this.pos.z, 0.3)) : collision.groundAt(this.pos.x, this.pos.z, Math.max(0.3, (this.y || 0) + 0.3));
    obj.position.set(this.pos.x, this.y, this.pos.z);
    obj.rotation.y += wrap((o.face ?? yaw) - obj.rotation.y) * Math.min(1, 6 * dt);
    let headTurn = o.headTurn || 0, pitch = o.headPitch || 0;
    if (cat && this.state === 'here' && !o.headTurn && o.glance !== false) {
      const dx = cat.x - this.pos.x, dz = cat.z - this.pos.z;
      if (dx * dx + dz * dz < 2.2 && Math.sin(performance.now() / 1300 + this.pos.x) > 0.3) { headTurn = Math.max(-0.8, Math.min(0.8, wrap(Math.atan2(dx, dz) - obj.rotation.y))) * 0.6; pitch = 0.3; }
    }
    this.h.animate(dt, { speed, ...o.pose, talking: o.talking || (o.pose && o.pose.talking), headTurn, headPitch: pitch });
  }

  angleTo(p) { return Math.atan2(p.x - this.pos.x, p.z - this.pos.z); }
  distTo(p) { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }
}
