// Arcade car physics: engine, brakes, steering that tightens with speed, lateral grip that
// lets go under the handbrake, and a little damage bookkeeping. No physics engine, just
// velocity split into forward and sideways components each step.
import * as THREE from '../../vendor/three.module.min.js';
import { clamp, wrapAngle, forwardX, forwardZ, rightX, rightZ } from '../core/math.js';

export class Vehicle {
  constructor(car, x, z, yaw) {
    this.car = car;
    this.x = x; this.z = z; this.yaw = yaw;
    this.vx = 0; this.vz = 0;
    this.speed = 0;
    this.steer = 0;
    this.wheelSteer = 0;
    this.throttle = 0;
    this.handbrake = false;
    this.damage = 0;
    this.health = 100;
    this.occupied = false;
    this.engine = 0;
    this.braking = false;
    const s = car.spec;
    this.maxSpeed = s.mass > 2 ? 22 : s.mass > 1.2 ? 27 : s.mass < 0.9 ? 44 : 36;
    this.accel = s.mass > 2 ? 6.5 : s.mass > 1.2 ? 8.5 : 13.5;
    this.turn = s.mass > 2 ? 1.15 : s.mass > 1.2 ? 1.45 : 1.95;
    this.halfLen = s.len / 2;
    this.halfWid = s.wid / 2;
  }

  get kmh() { return Math.abs(this.speed) * 3.6; }

  // controls: throttle -1..1, steer -1..1 (positive = left), handbrake bool
  step(dt, controls, world) {
    const thr = clamp(controls.throttle ?? 0, -1, 1);
    const steerIn = clamp(controls.steer ?? 0, -1, 1);
    const hb = !!controls.handbrake;
    this.throttle = thr;
    this.handbrake = hb;
    this.wheelSteer += (steerIn * 0.55 - this.wheelSteer) * Math.min(1, dt * 9);

    const fx = forwardX(this.yaw), fz = forwardZ(this.yaw);
    const rx = rightX(this.yaw), rz = rightZ(this.yaw);
    let vF = this.vx * fx + this.vz * fz;
    let vS = this.vx * rx + this.vz * rz;

    if (thr > 0) {
      const drop = clamp(1 - Math.abs(vF) / this.maxSpeed, 0, 1);
      vF += this.accel * thr * (0.35 + drop * 0.65) * dt;
    } else if (thr < 0) {
      if (vF > 0.5) { vF -= 22 * dt; this.braking = true; }
      else { vF += this.accel * 0.55 * thr * dt; this.braking = false; }
    } else {
      this.braking = false;
      vF -= Math.sign(vF) * Math.min(Math.abs(vF), 2.4 * dt);
    }
    if (hb) {
      vF -= Math.sign(vF) * Math.min(Math.abs(vF), 9 * dt);
      vS *= Math.exp(-2.0 * dt);
    } else {
      vS *= Math.exp(-7.5 * dt);
    }
    // rolling drag and a hard cap
    vF *= Math.exp(-0.16 * dt);
    vF = clamp(vF, -this.maxSpeed * 0.42, this.maxSpeed);

    const speedFactor = clamp(Math.abs(vF) / 7, 0, 1);
    const dir = vF >= 0 ? 1 : -1;
    this.yaw = wrapAngle(this.yaw + this.wheelSteer * this.turn * speedFactor * dir * dt * (hb ? 1.5 : 1));
    this.steer = this.wheelSteer;

    const nfx = forwardX(this.yaw), nfz = forwardZ(this.yaw);
    const nrx = rightX(this.yaw), nrz = rightZ(this.yaw);
    this.vx = nfx * vF + nrx * vS;
    this.vz = nfz * vF + nrz * vS;
    this.speed = vF;
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // world bounds: the ring road and the beach are drivable, the sea is not
    const lim = 232;
    if (Math.abs(this.x) > lim) { this.x = Math.sign(this.x) * lim; this.vx *= -0.25; this.addDamage(3); }
    if (this.z > 300) { this.z = 300; this.vz *= -0.25; this.addDamage(3); }
    if (this.z < -lim) { this.z = -lim; this.vz *= -0.25; this.addDamage(3); }

    if (world) {
      const r = this.halfWid * 0.85;
      const res = world.resolve(this.x, this.z, r);
      if (res.hit) {
        const push = Math.hypot(res.x - this.x, res.z - this.z);
        this.x = res.x; this.z = res.z;
        const impact = Math.abs(this.speed);
        this.vx *= 0.2; this.vz *= 0.2;
        this.speed *= 0.15;
        if (impact > 4) this.addDamage(impact * 1.4);
      }
    }
    this.car.group.position.set(this.x, world ? world.groundHeight(this.x, this.z) : 0, this.z);
    this.car.group.rotation.y = this.yaw;
    // body roll and pitch for feel
    this.car.group.rotation.z = clamp(-this.wheelSteer * Math.abs(this.speed) * 0.006, -0.06, 0.06);
    this.car.group.rotation.x = clamp(-thr * 0.012, -0.03, 0.03);
    this.car.updateWheels(dt, this.speed, this.wheelSteer);
    this.car.setLightLevel(this.lights ?? 0);
    this.engine = 0.15 + clamp(Math.abs(this.speed) / this.maxSpeed, 0, 1) * 0.85;
  }

  addDamage(d) {
    this.damage = Math.min(100, this.damage + d);
    this.car.setDamage(this.damage);
  }

  // Where a passenger sits, in world space.
  seatPos(side = 0) {
    const rx = rightX(this.yaw), rz = rightZ(this.yaw);
    const fx = forwardX(this.yaw), fz = forwardZ(this.yaw);
    return { x: this.x + rx * side * 0.42 + fx * 0.15, z: this.z + rz * side * 0.42 + fz * 0.15 };
  }

  stop() { this.vx = 0; this.vz = 0; this.speed = 0; }
}
