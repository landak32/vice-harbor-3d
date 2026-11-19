// Vice Harbor — entry point. Builds the harbor, wires the player, traffic, crowd, police,
// combat, missions and HUD together, and runs a fixed-timestep loop. With ?shot=<name> it boots
// straight into a scene, simulates it forward on autopilot and renders one frame.
import * as THREE from '../vendor/three.module.min.js';
import { CFG } from './config.js';
import { Rng } from './core/rng.js';
import { Input } from './core/input.js';
import { Timestep } from './core/timestep.js';
import { clamp, dampAngle, forwardX, forwardZ, headingTo } from './core/math.js';
import { createRenderer } from './render/renderer.js';
import { Sky } from './render/sky.js';
import { Lighting } from './render/lighting.js';
import { Effects } from './render/effects.js';
import { buildCity } from './world/city.js';
import { districtAt, streetAt, roadCoord, blockCenter } from './world/cityGrid.js';
import { Character } from './entities/character.js';
import { Car } from './entities/vehicles.js';
import { Traffic } from './entities/traffic.js';
import { Crowd } from './entities/pedestrians.js';
import { Police } from './entities/police.js';
import { Helicopter } from './entities/helicopter.js';
import { raycast, WeaponState } from './entities/projectiles.js';
import { CollisionWorld } from './systems/collision.js';
import { OnFoot } from './systems/onFoot.js';
import { Vehicle } from './systems/driving.js';
import { CameraRig } from './systems/cameraRig.js';
import { Wanted } from './systems/wanted.js';
import { Missions } from './systems/missions.js';
import { Dialogue } from './systems/dialogue.js';
import { Audio } from './systems/audio.js';
import { Hud } from './ui/hud.js';
import { Menus } from './ui/menus.js';
import { saveGame, loadGame } from './systems/save.js';
import { setupShot, dressShot, SHOT_STEPS } from './systems/shotScenes.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const SEED = Number(params.get('seed')) || 7;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    const r = createRenderer(canvas);
    this.renderer = r.renderer; this.scene = r.scene; this.camera = r.camera;
    this.rng = new Rng(SEED);
    this.city = buildCity(this.scene, this.rng);
    this.sky = new Sky(this.scene, this.city.mats, this.rng.fork());
    this.light = new Lighting(this.scene);
    this.world = new CollisionWorld(this.city.buildings.buildings);
    this.effects = new Effects(this.scene, this.city.mats);
    Car.glowTex = this.city.mats.glowTex;

    this.player = new Character(this.rng.fork(), { jacket: 0x2f8f8a, pants: 0x27303c, shirt: 0xdfe8e4 });
    this.scene.add(this.player.root);
    this.onFoot = new OnFoot(this.player, this.world);
    this.onFoot.setPos(-90, roadCoord(4) + 10.4, -Math.PI / 2);

    this.traffic = new Traffic(this.scene, this.city.mats, this.rng.fork(), 30);
    this.crowd = new Crowd(this.scene, this.city.mats, this.rng.fork(), 88);
    this.police = new Police(this.scene, this.city.mats, this.world, this.rng.fork());
    this.heli = new Helicopter(this.scene, this.city.mats);
    this.wanted = new Wanted();
    this.weapons = new WeaponState();
    this.dialogue = new Dialogue();
    this.missions = new Missions(this.dialogue);
    this.hud = new Hud();
    this.menus = new Menus();
    this.audio = new Audio();
    this.input = new Input(canvas);
    this.rig = new CameraRig(this.camera);
    this.ts = new Timestep(CFG.FPS_STEP, CFG.MAX_STEPS);

    this.cars = [];
    this.mode = 'foot';
    this.vehicle = null;
    this.money = 450;
    this.hp = 100;
    this.ap = 60;
    this.hour = 11.5;
    this.playing = false;
    this.paused = false;
    this.over = false;
    this.kills = 0;
    this.policeTimer = 0;
    this.camYaw = this.onFoot.yaw;
    this.aiming = false;
    this.shotMode = !!shotName;
    this.shotClock = 0;

    this.spawnParkedCars();
    this.setHour(this.hour);
    this.rig.snap({ x: this.onFoot.x, y: this.onFoot.y, z: this.onFoot.z, yaw: this.onFoot.yaw, speed: 0 }, 'foot');

    if (this.shotMode) {
      setupShot(this, shotName);
      this.hud.show(true);
      this.menus.showTitle(false);
      document.body.classList.add('playing');
    } else {
      this.menus.showTitle(true);
      this.bindStart();
    }
    this.last = performance.now();
    this.shotFrames = 0;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  spawnParkedCars() {
    const types = ['sedan', 'coupe', 'van', 'pickup', 'sports', 'taxi', 'sedan', 'coupe', 'van', 'sedan', 'sports', 'pickup'];
    const paints = [0xb03a3a, 0x2f5a8a, 0xd8d0b8, 0x3a7a5a, 0xc8a03a, 0x6a3a8a, 0x8a8f96, 0x2a3a4a, 0xa05a2a, 0xd0d0d0, 0x1f4a3c, 0x9a3a5a];
    for (let i = 0; i < 12; i++) {
      const bi = this.rng.int(CFG.BLOCKS), bj = this.rng.int(CFG.BLOCKS);
      const horizontal = this.rng.chance(0.5);
      const along = this.rng.range(-12, 12);
      const x = horizontal ? blockCenter(bi) + along : roadCoord(bi) + (this.rng.chance(0.5) ? 5.4 : -5.4);
      const z = horizontal ? roadCoord(bj) + (this.rng.chance(0.5) ? 5.4 : -5.4) : blockCenter(bj) + along;
      const yaw = horizontal ? (this.rng.chance(0.5) ? -Math.PI / 2 : Math.PI / 2) : (this.rng.chance(0.5) ? 0 : Math.PI);
      const car = new Car(types[i % types.length], paints[i % paints.length], {});
      car.group.position.set(x, 0, z);
      car.group.rotation.y = yaw;
      this.scene.add(car.group);
      this.cars.push({ car, veh: new Vehicle(car, x, z, yaw) });
    }
  }

  setHour(h) {
    this.hour = h;
    const pal = this.sky.setHour(h);
    this.sky.applyToMaterials();
    this.light.apply(pal, this.sky.dir);
    this.traffic.setNight(pal.neon);
    if (this.city.mats.halo) this.city.mats.halo.opacity = pal.neon * 0.85;
    Car.lampMat.color.setScalar(0.32 + pal.neon * 0.68);
    for (const c of this.cars) c.car.setLightLevel(pal.neon > 0.35 ? 1 : 0);
    if (this.vehicle) this.vehicle.car.setLightLevel(pal.neon > 0.35 ? 1 : 0);
  }

  bindStart() {
    const start = () => {
      if (!this.menus.ready) return;
      this.audio.init();
      this.audio.resume();
      this.menus.showTitle(false);
      this.hud.show(true);
      this.playing = true;
      document.body.classList.add('playing');
      this.input.lock();
      this.dialogue.say('dispatch', 'Welcome back to the harbor. Try not to make the news.', 4);
      this.missions.start(0);
      window.removeEventListener('keydown', keyHandler);
    };
    const keyHandler = (e) => { if (e.code === 'Enter') start(); };
    window.addEventListener('keydown', keyHandler);
    this.canvas.addEventListener('click', start);
  }

  // ---------------------------------------------------------------- simulation
  step(dt) {
    this.shotClock += dt;
    if (this.autoTick) this.autoTick(dt);
    if (!this.shotMode) this.hour = (this.hour + dt * 0.035) % 24;
    this.setHour(this.hour);

    if (this.mode === 'drive' && this.vehicle) this.stepDriving(dt);
    else this.stepOnFoot(dt);

    this.traffic.update(dt, this.vehicle);
    const threat = this.mode === 'drive' ? { x: this.vehicle.x, z: this.vehicle.z } : { x: this.onFoot.x, z: this.onFoot.z };
    this.crowd.update(dt, threat, false);
    this.updatePolice(dt);
    this.heli.update(dt, threat);
    this.effects.update(dt);
    this.weapons.update(dt);
    this.dialogue.update(dt);
    this.missions.update(dt, threat.x, threat.z, { kills: this.kills, stars: this.wanted.stars });
    if (this.missions.moneyGain) { this.money += this.missions.moneyGain; this.missions.moneyGain = 0; }
    this.rig.update(dt, this.camTarget(), this.mode === 'drive' ? 'drive' : this.aiming ? 'aim' : 'foot', { world: this.world });
    this.light.follow(threat.x, threat.z);
    this.sky.update(dt, this.camera);
    this.audio.update(dt, {
      inCar: this.mode === 'drive', speed: this.vehicle ? this.vehicle.speed : 0,
      maxSpeed: this.vehicle ? this.vehicle.maxSpeed : 1, moving: this.onFoot.speed > 0.4,
      running: this.onFoot.running, siren: this.nearestSiren(),
    });
    this.hud.update(dt, this.hudState());
  }

  camTarget() {
    if (this.mode === 'drive' && this.vehicle) {
      return { x: this.vehicle.x, y: 0, z: this.vehicle.z, yaw: this.vehicle.yaw, speed: this.vehicle.speed };
    }
    return { x: this.onFoot.x, y: this.onFoot.y, z: this.onFoot.z, yaw: this.camYaw, speed: this.onFoot.speed };
  }

  stepOnFoot(dt) {
    const i = this.input;
    const move = { x: i.axis('KeyA', 'KeyD'), z: i.axis('KeyS', 'KeyW') };
    const m = i.takeMouse();
    if (i.locked) this.camYaw -= m.x * 0.0024;
    this.aiming = i.firing && this.weapons.key !== 'fists';
    if (move.x || move.z) this.camYaw = dampAngle(this.camYaw, this.onFoot.yaw, 2.2, dt);
    this.onFoot.update(dt, move, this.camYaw, i.down('ShiftLeft') || i.down('ShiftRight'), this.aiming);
    this.player.setDrive(false);
    this.player.setAim(this.aiming);
    this.player.root.visible = true;

    if (i.hit('KeyE')) this.tryEnterCar();
    if (i.hit('Digit1')) this.weapons.select(0);
    if (i.hit('Digit2')) this.weapons.select(1);
    if (i.hit('Digit3')) this.weapons.select(2);
    if (i.hit('Digit4')) this.weapons.select(3);
    if (i.hit('KeyR')) this.weapons.reload();
    if (i.hit('KeyH')) { this.audio.horn(); this.crowd.panic(this.onFoot.x, this.onFoot.z, 22); }
    if (i.firing) this.fire();
  }

  stepDriving(dt) {
    const i = this.input;
    const v = this.vehicle;
    const thr = i.axis('KeyS', 'KeyW');
    const steer = i.axis('KeyD', 'KeyA');
    v.step(dt, { throttle: thr, steer, handbrake: i.down('Space') }, this.world);
    this.onFoot.x = v.x; this.onFoot.z = v.z;
    this.onFoot.yaw = v.yaw;
    this.camYaw = v.yaw;
    this.player.root.visible = false;
    this.player.root.position.set(v.x, 0, v.z);
    this.player.root.rotation.y = v.yaw;
    this.player.setDrive(true);
    if (v.damage > 55 && this.rng.chance(0.25)) this.effects.smoke(v.x + 0.6, 0.8, v.z, 1.2, 0.35);
    const hit = this.crowd.nearest(v.x, v.z, 2.4);
    if (hit && Math.abs(v.speed) > 4) {
      hit.dead = true; this.kills++;
      this.wanted.crime(9);
      this.effects.spark(hit.x, 0.6, hit.z, 10, 0xa02020, 3);
      this.rig.addShake(0.5);
      this.audio.hurt();
    }
    if (i.hit('KeyE')) this.exitCar();
    if (i.hit('KeyH')) this.audio.horn();
    if (i.hit('KeyR')) this.weapons.reload();
    if (i.firing) this.fire();
  }

  tryEnterCar() {
    let best = null, bd = 26;
    for (const c of this.cars) {
      const d = (c.veh.x - this.onFoot.x) ** 2 + (c.veh.z - this.onFoot.z) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    if (!best) return;
    this.vehicle = best.veh;
    this.vehicle.occupied = true;
    this.mode = 'drive';
    this.player.root.visible = false;
    this.weapons.select(1);
    const copNear = this.police.units.some((u) => Math.hypot(u.veh.x - this.onFoot.x, u.veh.z - this.onFoot.z) < 45);
    if (copNear) { this.wanted.crime(8); this.wanted.setStatus('GRAND THEFT AUTO', 3); }
    this.audio.pickup();
  }

  exitCar() {
    const v = this.vehicle;
    if (!v) return;
    const x = v.x + Math.cos(v.yaw) * 2.4, z = v.z - Math.sin(v.yaw) * 2.4;
    const spot = this.world.freeSpot(x, z, 0.5);
    this.onFoot.setPos(spot.x, spot.z, v.yaw);
    this.onFoot.vx = 0; this.onFoot.vz = 0;
    v.stop();
    v.occupied = false;
    this.vehicle = null;
    this.mode = 'foot';
    this.player.root.visible = true;
    this.player.setDrive(false);
  }

  fire() {
    const w = this.weapons;
    if (!w.canFire()) { if (w.empty) w.reload(); return; }
    w.consume();
    const def = w.def;
    const origin = this.mode === 'drive'
      ? { x: this.vehicle.x + forwardX(this.vehicle.yaw) * 2, y: 1.2, z: this.vehicle.z + forwardZ(this.vehicle.yaw) * 2 }
      : this.player.muzzleWorld();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const targets = this.targets();
    const pellets = def.pellets ?? 1;
    for (let p = 0; p < pellets; p++) {
      const spread = def.spread * (pellets > 1 ? 1.6 : 1);
      const d = dir.clone();
      d.x += (this.rng.next() - 0.5) * spread * 2;
      d.y += (this.rng.next() - 0.5) * spread * 2;
      d.z += (this.rng.next() - 0.5) * spread * 2;
      d.normalize();
      const hit = raycast(this.world, origin.x, origin.y, origin.z, d.x, d.y, d.z, def.range, targets);
      this.effects.tracer(origin.x, origin.y, origin.z, hit.x, hit.y, hit.z);
      if (hit.target) this.applyHit(hit.target, def.dmg, hit);
      else this.effects.spark(hit.x, hit.y, hit.z, 4, 0xffcf90, 2.5);
    }
    this.effects.flash(origin.x, origin.y, origin.z, 1.9);
    this.rig.addShake(def.kick * 0.09);
    this.audio.gunshot(w.key);
    this.wanted.crime(w.key === 'shotgun' ? 6 : 4);
    this.crowd.panic(this.onFoot.x, this.onFoot.z, 46);
    if (w.empty) w.reload();
  }

  targets() {
    const t = [];
    for (const p of this.crowd.peds) {
      if (!p.dead) t.push({ x: p.x, y: p.y + 1.05, z: p.z, r: 0.55, kind: 'ped', ref: p });
    }
    for (const o of this.police.officers) {
      if (!o.dead) t.push({ x: o.x, y: 1.05, z: o.z, r: 0.6, kind: 'cop', ref: o });
    }
    for (const u of this.police.units) {
      t.push({ x: u.veh.x, y: 1.0, z: u.veh.z, r: 1.5, kind: 'car', ref: u });
    }
    return t;
  }

  applyHit(target, dmg, hit) {
    this.effects.spark(hit.x, hit.y, hit.z, 7, 0xffa040, 3);
    if (target.kind === 'ped') {
      target.ref.dead = true;
      this.kills++;
      this.wanted.crime(10);
      this.audio.hurt();
    } else if (target.kind === 'cop') {
      target.ref.hp -= dmg;
      this.wanted.crime(4);
      if (target.ref.hp <= 0) { this.police.killOfficer(target.ref); this.kills++; }
    } else if (target.kind === 'car') {
      target.ref.veh.addDamage(dmg * 0.7);
      if (target.ref.veh.damage > 90) this.effects.explosion(target.ref.veh.x, 1.2, target.ref.veh.z);
    }
  }

  updatePolice(dt) {
    const stars = this.wanted.stars;
    const px = this.mode === 'drive' ? this.vehicle.x : this.onFoot.x;
    const pz = this.mode === 'drive' ? this.vehicle.z : this.onFoot.z;
    this.policeTimer -= dt;
    const want = stars === 0 ? 0 : Math.min(6, stars + 1);
    if (this.police.units.length < want && this.policeTimer <= 0 && !this.shotMode) {
      this.policeTimer = 2.6;
      const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(70, 110);
      const sx = clamp(px + Math.cos(a) * d, -190, 190), sz = clamp(pz + Math.sin(a) * d, -190, 190);
      this.police.spawnCruiser(sx, sz, headingTo(px - sx, pz - sz));
      this.wanted.setStatus(`${this.police.units.length} UNITS RESPONDING`, 2.5);
    }
    if (stars === 0 && this.police.units.length) this.police.clear();
    let seen = false;
    for (const u of this.police.units) if (Math.hypot(u.veh.x - px, u.veh.z - pz) < 110) seen = true;
    this.wanted.update(dt, seen, this.police.units.length);
    this.heli.setActive(stars >= 3);
    this.police.update(dt, {
      px, pz, inCar: this.mode === 'drive',
      onShot: (o) => this.officerShot(o),
      onRam: () => { this.hurt(8); this.rig.addShake(0.5); },
    });
  }

  officerShot(o) {
    const px = this.mode === 'drive' ? this.vehicle.x : this.onFoot.x;
    const pz = this.mode === 'drive' ? this.vehicle.z : this.onFoot.z;
    const ox = o.x, oz = o.z, oy = 1.35;
    const dx = px - ox, dz = pz - oz;
    const len = Math.hypot(dx, dz) || 1;
    const dir = { x: dx / len + (this.rng.next() - 0.5) * 0.09, y: (1.1 - oy) / len, z: dz / len + (this.rng.next() - 0.5) * 0.09 };
    const hit = raycast(this.world, ox, oy, oz, dir.x, dir.y, dir.z, 60, []);
    this.effects.tracer(ox, oy, oz, hit.x, hit.y, hit.z);
    this.effects.flash(ox + dir.x * 0.6, oy + 0.1, oz + dir.z * 0.6, 1.3);
    this.audio.gunshot('pistol');
    if (hit.dist > len - 0.9) { this.hurt(7); this.rig.addShake(0.35); }
  }

  hurt(dmg) {
    if (this.over) return;
    this.ap = Math.max(0, this.ap - dmg * 0.7);
    this.hp -= dmg * (this.ap > 0 ? 0.35 : 1);
    this.audio.hurt();
    if (this.hp <= 0) this.gameOver();
  }

  gameOver() {
    this.hp = 0;
    this.over = true;
    this.playing = false;
    this.menus.showOver(true, 'St. Alder Hospital will bill you $500.');
    document.body.classList.remove('playing');
    this.input.unlock();
    const respawn = (e) => {
      if (e.code !== 'Enter') return;
      window.removeEventListener('keydown', respawn);
      this.menus.showOver(false);
      this.hp = 100; this.ap = 40; this.money = Math.max(0, this.money - 500);
      this.wanted.clear();
      this.police.clear();
      this.mode = 'foot'; this.vehicle = null;
      this.onFoot.setPos(-90, roadCoord(4) + 10.4, -Math.PI / 2);
      this.over = false; this.playing = true;
      document.body.classList.add('playing');
      this.input.lock();
    };
    window.addEventListener('keydown', respawn);
  }

  nearestSiren() {
    let best = 0;
    for (const u of this.police.units) {
      const d = Math.hypot(u.veh.x - this.onFoot.x, u.veh.z - this.onFoot.z);
      best = Math.max(best, clamp(1 - d / 140, 0, 1));
    }
    return best;
  }

  hudState() {
    const p = this.mode === 'drive' ? { x: this.vehicle.x, z: this.vehicle.z } : { x: this.onFoot.x, z: this.onFoot.z };
    const st = streetAt(p.x, p.z);
    const w = this.weapons;
    return {
      px: p.x, pz: p.z, yaw: this.mode === 'drive' ? this.vehicle.yaw : this.camYaw,
      money: this.money, stars: this.wanted.stars, hp: this.hp, ap: this.ap,
      district: districtAt(p.x, p.z).name, street: st.name,
      hour: this.hour, day: 'MON', time: this.shotClock,
      inCar: this.mode === 'drive',
      kmh: this.vehicle ? this.vehicle.kmh : this.onFoot.speed * 3.6,
      carName: this.vehicle ? this.vehicle.car.type.toUpperCase() : 'ON FOOT',
      damage: this.vehicle ? this.vehicle.damage : 0,
      weapon: w.def.name, ammoText: w.def.ammo < 0 ? '—' : `${w.mag[w.key]} / ${w.reserve[w.key]}`,
      missionName: this.missions.def?.name,
      missionStage: this.missions.active ? `Stage ${this.missions.stage + 1} of ${this.missions.def.stages.length}` : 'Free roam',
      objective: this.missions.objectiveText(), progress: this.missions.progress,
      marker: this.missions.marker, units: this.police.units.map((u) => ({ x: u.veh.x, z: u.veh.z })),
      dialogue: this.dialogue.current,
      toast: this.wanted.statusT > 0 ? this.wanted.status : this.missions.toast,
      banner: this.missions.banner,
    };
  }

  // ---------------------------------------------------------------- loop
  loop(now) {
    if (this.shotMode) {
      // Hold the finished frame: a handful of paints is enough for the compositor, and it
      // keeps the software renderer from redrawing the whole city for twelve seconds.
      if (this.shotFrames++ < 6) this.renderer.render(this.scene, this.camera);
      return;
    }
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.menus.loadingBeat(dt);
    if (this.playing && !this.paused && !this.over) {
      const n = this.ts.consume(dt);
      for (let i = 0; i < n; i++) { this.ts.advance(); this.step(this.ts.step); }
      this.handleKeys();
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }

  handleKeys() {
    const i = this.input;
    if (i.hit('Escape')) this.togglePause();
    if (i.hit('KeyF')) {
      saveGame({ x: this.onFoot.x, z: this.onFoot.z, money: this.money, wanted: this.wanted.heat,
        mission: this.missions.index, stage: this.missions.stage, hour: this.hour, hp: this.hp });
      this.wanted.setStatus('GAME SAVED', 2);
    }
    if (i.hit('KeyG')) {
      const s = loadGame();
      if (s) {
        this.money = s.money; this.hour = s.hour; this.hp = s.hp;
        this.onFoot.setPos(s.x, s.z, this.onFoot.yaw);
        this.wanted.heat = s.wanted; this.wanted.stars = this.wanted.starsFor(s.wanted);
        if (s.mission >= 0) { this.missions.index = s.mission; this.missions.stage = s.stage; this.missions.active = true; }
        this.wanted.setStatus('GAME LOADED', 2);
      }
    }
    i.endFrame();
  }

  togglePause() {
    this.paused = !this.paused;
    this.menus.showPause(this.paused);
    if (this.paused) this.input.unlock(); else this.input.lock();
  }

  // Screenshot mode: simulate forward, then hold the frame.
  runShot() {
    for (let i = 0; i < SHOT_STEPS; i++) { this.ts.advance(); this.step(CFG.FPS_STEP); }
    dressShot(this, shotName);
    this.renderer.render(this.scene, this.camera);
  }
}

const game = new Game(document.getElementById('game'));
window.__game = game;
if (shotName) game.runShot();
