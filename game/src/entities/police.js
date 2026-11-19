// The police response: cruisers that chase, ram and box the player in, officers who get out
// and shoot, and the flashing light bars. The helicopter lives in its own module.
import * as THREE from '../../vendor/three.module.min.js';
import { Car } from '../entities/vehicles.js';
import { Vehicle } from '../systems/driving.js';
import { Character } from '../entities/character.js';
import { headingTo, wrapAngle, clamp, dist } from '../core/math.js';

export class Police {
  constructor(scene, mats, world, rng) {
    this.scene = scene;
    this.mats = mats;
    this.world = world;
    this.rng = rng;
    this.units = [];
    this.officers = [];
    this.time = 0;
    this.officerGeo = null;
  }

  spawnCruiser(x, z, yaw = 0, parked = false) {
    const car = new Car('police', 0x20252c, {});
    car.group.position.set(x, 0, z);
    car.group.rotation.y = yaw;
    this.scene.add(car.group);
    const veh = new Vehicle(car, x, z, yaw);
    veh.lights = 1;
    const lights = [];
    for (let i = 0; i < 2; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.mats.glowTex, color: i ? 0xff2a2a : 0x3b6bff,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
      s.position.set(i ? 0.36 : -0.36, 1.62, 0.1);
      s.scale.set(1.5, 1.5, 1);
      car.group.add(s);
      lights.push(s);
    }
    const unit = { veh, car, lights, parked, officers: [], cooldown: 0 };
    this.units.push(unit);
    return unit;
  }

  spawnOfficer(x, z, yaw = 0) {
    const ch = new Character(this.rng, { jacket: 0x232a36, pants: 0x1b2028, shirt: 0xd8dde6, hair: 0x2a2018 });
    ch.root.position.set(x, this.world.groundHeight(x, z), z);
    ch.root.rotation.y = yaw;
    this.scene.add(ch.root);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.34), new THREE.MeshLambertMaterial({ color: 0x15181c }));
    gun.position.set(0.05, 1.15, -0.32);
    ch.root.add(gun);
    const off = { ch, x, z, yaw, gun, cool: this.rng.range(0.2, 1.2), aim: 0, hp: 100, dead: false };
    this.officers.push(off);
    return off;
  }

  clear() {
    for (const u of this.units) this.scene.remove(u.car.group);
    for (const o of this.officers) this.scene.remove(o.ch.root);
    this.units.length = 0;
    this.officers.length = 0;
  }

  // ctx: {px, pz, playerCar, onShot(officer), onRam(unit)}
  update(dt, ctx) {
    this.time += dt;
    const flash = Math.floor(this.time * 5) % 2;
    for (const u of this.units) {
      u.lights[0].material.opacity = flash ? 0.95 : 0.06;
      u.lights[1].material.opacity = flash ? 0.06 : 0.95;
      const d = dist(u.veh.x, u.veh.z, ctx.px, ctx.pz);
      if (u.parked) {
        u.veh.step(dt, { throttle: 0, steer: 0 }, this.world);
      } else {
        const desired = headingTo(ctx.px - u.veh.x, ctx.pz - u.veh.z);
        const err = wrapAngle(desired - u.veh.yaw);
        const steer = clamp(err * 1.9, -1, 1);
        const throttle = d < 9 ? -0.6 : d < 16 ? 0.35 : 1;
        u.veh.step(dt, { throttle, steer, handbrake: d < 11 && Math.abs(u.veh.speed) > 9 }, this.world);
        u.ramCd = (u.ramCd ?? 0) - dt;
        if (d < 3.6 && Math.abs(u.veh.speed) > 4 && u.ramCd <= 0 && ctx.onRam) { u.ramCd = 1.1; ctx.onRam(u); }
        // deploy an officer when the player is on foot and close
        if (!ctx.inCar && d < 22 && u.officers.length < 2 && this.officers.length < 8) {
          const side = u.officers.length ? -1 : 1;
          const ox = u.veh.x + Math.cos(u.veh.yaw) * side * 2.2;
          const oz = u.veh.z - Math.sin(u.veh.yaw) * side * 2.2;
          u.officers.push(this.spawnOfficer(ox, oz, headingTo(ctx.px - ox, ctx.pz - oz)));
        }
      }
    }
    for (const o of this.officers) {
      if (o.dead) { o.ch.update(dt, 0, 'walk'); continue; }
      const d = dist(o.x, o.z, ctx.px, ctx.pz);
      o.yaw = headingTo(ctx.px - o.x, ctx.pz - o.z);
      o.ch.root.rotation.y = o.yaw;
      o.ch.update(dt, 0, 'idle');
      o.cool -= dt;
      if (d < 34 && o.cool <= 0 && ctx.onShot) {
        o.cool = this.rng.range(0.9, 1.8);
        o.ch.parts.armR.rotation.x = -1.3;
        ctx.onShot(o);
      }
      o.ch.parts.armR.rotation.x = Math.max(-1.3, o.ch.parts.armR.rotation.x - dt * 3);
    }
  }

  killOfficer(o) {
    if (o.dead) return;
    o.dead = true;
    o.ch.die();
  }

  // Where the cruiser should sit for a scripted shot: alongside and behind the player.
  placeUnit(unit, x, z, yaw) {
    unit.veh.x = x; unit.veh.z = z; unit.veh.yaw = yaw;
    unit.veh.vx = 0; unit.veh.vz = 0; unit.veh.speed = 0;
    unit.car.group.position.set(x, 0, z);
    unit.car.group.rotation.y = yaw;
  }
}
