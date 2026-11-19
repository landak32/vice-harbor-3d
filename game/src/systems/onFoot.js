// Walking, running and aiming on foot. Movement is relative to where the camera looks, the
// body turns to face the way it is going, and the character rig is driven from the resulting
// speed so the walk cycle and the run cycle match the ground covered.
import { clamp, dampAngle, forwardX, forwardZ, rightX, rightZ, headingTo, wrapAngle } from '../core/math.js';

export class OnFoot {
  constructor(character, world) {
    this.ch = character;
    this.world = world;
    this.x = 0; this.z = 0; this.y = 0;
    this.yaw = 0;
    this.vx = 0; this.vz = 0;
    this.speed = 0;
    this.aiming = false;
    this.stamina = 1;
    this.stepPhase = 0;
  }

  setPos(x, z, yaw) {
    this.x = x; this.z = z; this.yaw = yaw;
    this.y = this.world.groundHeight(x, z);
    this.ch.root.position.set(x, this.y, z);
    this.ch.root.rotation.y = yaw;
  }

  // move: {x: strafe, z: forward} in camera space. camYaw: where the camera looks.
  update(dt, move, camYaw, sprint, aiming) {
    const mz = clamp(move.z, -1, 1), mx = clamp(move.x, -1, 1);
    const mag = Math.min(1, Math.hypot(mx, mz));
    const running = sprint && mag > 0.1 && !aiming && this.stamina > 0.02;
    const targetSpeed = aiming ? 2.2 : running ? 6.6 : 3.1;
    const fx = forwardX(camYaw), fz = forwardZ(camYaw);
    const rx = rightX(camYaw), rz = rightZ(camYaw);
    let dx = fx * mz + rx * mx, dz = fz * mz + rz * mx;
    const dl = Math.hypot(dx, dz);
    if (dl > 0.001) { dx /= dl; dz /= dl; }
    const wantVx = dx * targetSpeed * mag, wantVz = dz * targetSpeed * mag;
    const accel = mag > 0 ? 16 : 20;
    this.vx += (wantVx - this.vx) * Math.min(1, accel * dt);
    this.vz += (wantVz - this.vz) * Math.min(1, accel * dt);
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.speed = Math.hypot(this.vx, this.vz);
    this.stamina = clamp(this.stamina + (running ? -0.18 : 0.3) * dt, 0, 1);

    const res = this.world.resolve(this.x, this.z, 0.42);
    this.x = res.x; this.z = res.z;
    this.x = clamp(this.x, -228, 228);
    this.z = clamp(this.z, -228, 300);
    this.y = this.world.groundHeight(this.x, this.z);

    let wantYaw = this.yaw;
    if (aiming) wantYaw = camYaw;
    else if (this.speed > 0.35) wantYaw = headingTo(this.vx, this.vz);
    this.yaw = dampAngle(this.yaw, wantYaw, aiming ? 16 : 11, dt);

    this.ch.root.position.set(this.x, this.y, this.z);
    this.ch.root.rotation.y = this.yaw;
    this.ch.update(dt, this.speed, running ? 'run' : 'walk');
    this.aiming = aiming;
    this.running = running;
  }

  get forward() { return { x: forwardX(this.yaw), z: forwardZ(this.yaw) }; }
  get eye() { return { x: this.x, y: this.y + 1.55, z: this.z }; }
}
