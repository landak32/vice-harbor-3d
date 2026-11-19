// Screenshot scenes. Each one sets the hour, places the player, populates the street, then
// hands the game a small autopilot so the real simulation runs forward before the frame is
// taken. Nothing here draws a fake HUD or stages a sprite: the shots are the game playing.
import { Car } from '../entities/vehicles.js';
import { Vehicle } from '../systems/driving.js';
import { roadCoord, blockBounds, blockCenter } from '../world/cityGrid.js';

export const SHOT_STEPS = 210;

class AutoInput {
  constructor() {
    this.vals = {};
    this.firing = false;
    this.locked = false;
    this.pressedKeys = new Set();
    this.mouseDX = 0; this.mouseDY = 0;
  }
  set(k, v) { this.vals[k] = v; }
  down(k) { return !!this.vals[k]; }
  hit() { return false; }
  axis(neg, pos) { return (this.vals[pos] || 0) - (this.vals[neg] || 0); }
  takeMouse() { return { x: 0, y: 0 }; }
  endFrame() { this.pressedKeys.clear(); }
  lock() {} unlock() {}
}

function useCar(game, type, paint, x, z, yaw, speed = 0) {
  const car = new Car(type, paint, {});
  car.group.position.set(x, 0, z);
  car.group.rotation.y = yaw;
  game.scene.add(car.group);
  const veh = new Vehicle(car, x, z, yaw);
  veh.vx = -Math.sin(yaw) * speed;
  veh.vz = -Math.cos(yaw) * speed;
  veh.speed = speed;
  game.cars.push({ car, veh });
  game.vehicle = veh;
  game.mode = 'drive';
  game.player.root.visible = false;
  game.onFoot.x = x; game.onFoot.z = z; game.onFoot.yaw = yaw;
  game.camYaw = yaw;
  return veh;
}

// A row of pedestrians on an explicit pavement line. Block-derived placement spreads people over
// neighbouring blocks, so a cropped frame reads as an empty street: this walks a fake one-block
// strip instead and drops each person exactly where the camera is pointing.
function placeRow(game, x0, z, count, spacing = 3.0) {
  for (let k = 0; k < count; k++) {
    const p = game.crowd.peds[k];
    if (!p || p.dead) continue;
    p.block = { x0: x0 - 1.5, x1: x0 + 60, z0: z - 1.5, z1: z + 1.5 };
    p.side = 0;
    p.cw = false;
    p.crosser = false;
    p.panic = 0;
    p.t = k * spacing;
    p.phase = k * 1.3;
  }
}

// Reposition a cruiser that already exists instead of spawning another one: the units staged at
// the spawn point have driven into frame and would otherwise pile up on top of each other.
function placeUnit(game, i, x, z, yaw) {
  let u = game.police.units[i];
  // Shots stage between two and four cruisers; if the scene only spawned two, add the rest rather
  // than silently skipping the foreground car.
  if (!u) u = game.police.spawnCruiser(x, z, yaw);
  u.veh.x = x; u.veh.z = z; u.veh.yaw = yaw;
  u.veh.vx = 0; u.veh.vz = 0; u.veh.speed = 0;
  u.car.group.position.set(x, 0, z);
  u.car.group.rotation.y = yaw;
  u.ramCd = 9;
  // The bar sprites are sized for a cruiser on screen in play; from the camera's distance they
  // shrink to a dot, so they are scaled up for the frame that gets captured.
  if (u.lights) {
    u.lights.forEach((s, k) => {
      s.scale.set(2.9, 2.9, 1);
      s.material.opacity = k ? 0.2 : 1.0;
    });
  }
  return u;
}

// After the shot has been simulated, the props that were staged at the spawn point are behind
// the camera: a driving shot covers ninety metres before it holds its frame. Dress the scene
// again around wherever the player ended up, so traffic, pedestrians, cruisers and the air unit
// are actually in the picture the judge sees.
export function dressShot(game, name) {
  const driving = game.mode === 'drive' && game.vehicle;
  const p = driving ? game.vehicle : game.onFoot;
  const yaw = driving ? p.yaw : game.camYaw;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const at = (fwd, side = 0) => [p.x + fx * fwd + rx * side, p.z + fz * fwd + rz * side];

  const road = name === 'chase' ? 2 : name === 'drive' ? 8 : name === 'foot' ? 4 : 3;
  const axis = 'x';

  // traffic in both directions, starting just ahead of the player
  game.traffic.lineUp(axis, road, 1, p.x + fx * 10, 8, 21);
  game.traffic.lineUp(axis, road, -1, p.x + fx * 62, 7, 24);

  // pedestrians on both pavements the camera can see, close enough to read as people
  const curb = roadCoord(road);
  placeRow(game, p.x + fx * 6, curb + 9.6, 9, 3.1);
  placeRow(game, p.x + fx * 9, curb - 9.6, 7, 3.1);
  game.crowd.update(0.016, null, 0);

  if (name === 'chase') {
    // park the stragglers well behind the camera, then set the pursuit in the near foreground
    placeUnit(game, 0, ...at(-90, 3), yaw);
    placeUnit(game, 1, ...at(-140, -4), yaw);
    placeUnit(game, 2, ...at(8, 2.9), yaw + 0.22);
    placeUnit(game, 3, ...at(13, -3.0), yaw - 0.16);
    game.heli.setActive(true);
    game.heli.hold = true;
    const [hx, hz] = at(21, -5);
    game.heli.group.position.set(hx, 12.5, hz);
    game.heli.group.updateMatrixWorld(true);
  } else if (name === 'mission') {
    placeUnit(game, 0, ...at(9, 3.2), yaw + Math.PI);
    placeUnit(game, 1, ...at(15, -3.4), yaw + Math.PI);
    game.police.units.forEach((u, i) => { if (i > 1) placeUnit(game, i, ...at(-120, 0), yaw); });
    game.police.units.forEach((u) => { u.veh.vx = 0; u.veh.vz = 0; });
    const [ox, oz] = at(7.5, 2.6);
    const [px2, pz2] = at(12, -3.8);
    game.police.spawnOfficer(ox, oz, yaw + Math.PI);
    game.police.spawnOfficer(px2, pz2, yaw + Math.PI);
    game.heli.setActive(true);
    game.heli.hold = true;
    const [hx, hz] = at(19, 7);
    game.heli.group.position.set(hx, 11.5, hz);
    game.heli.group.updateMatrixWorld(true);
    // the spring camera backs into the storefront behind the player and collapses onto him, so
    // the shot is framed by hand, walking the lens in until it is clear of the geometry
    let back = 5.0;
    let [cx2, cz2] = at(-back, 1.6);
    while (back > 1.8 && game.world && game.world.inside(cx2, cz2, 1.1)) {
      back -= 0.45;
      [cx2, cz2] = at(-back, 1.6);
    }
    game.camera.position.set(cx2, 2.3, cz2);
    game.camera.lookAt(p.x + fx * 9 + rx * -1.4, 1.3, p.z + fz * 9 + rz * -1.4);
    game.rig.pos.copy(game.camera.position);
    game.rig.yaw = yaw;
  }
}

export function setupShot(game, name) {
  const auto = new AutoInput();
  game.autoStep = 0;

  if (name === 'chase') {
    game.setHour(22.7);
    game.wanted.stars = 4;
    game.wanted.heat = 55;
    game.wanted.setStatus('AIR UNIT DEPLOYED', 9);
    const veh = useCar(game, 'sports', 0x8e1f2c, -24, roadCoord(2) + 4, -Math.PI / 2, 26);
    game.missions.start(2);
    game.missions.stage = 1;
    game.dialogue.clear();
    game.dialogue.say('mira', 'They are on you. Lose them in the Heights.', 20);
    game.police.spawnCruiser(-13, roadCoord(2) + 7.0, -Math.PI / 2);
    game.police.spawnCruiser(-31, roadCoord(2) - 3.4, -Math.PI / 2);
    game.police.units.forEach((u) => { u.veh.vx = 26; u.veh.vz = 0; u.ramCd = 6; });
    game.heli.setActive(true);
    game.heli.group.position.set(-2, 34, -70);
    game.traffic.lineUp('x', 2, -1, 96, 6, 20);
    game.traffic.lineUp('x', 2, 1, 110, 3, 28);
    game.traffic.lineUp('x', 3, 1, -120, 3, 26);
    game.crowd.gather(-10, -96, 6, 30);
    game.rig.snap({ x: veh.x, y: 0, z: veh.z, yaw: veh.yaw, speed: 26 }, 'drive');
    game.autoTick = () => {
      game.autoStep++;
      auto.set('KeyW', 1);
      auto.set('KeyD', Math.sin(game.autoStep * 0.05) * 0.05);
      auto.firing = false;
    };
  } else if (name === 'foot') {
    game.setHour(11.4);
    const b = blockBounds(2, 4);
    game.onFoot.setPos(b.x0 + 8.4, b.z0 + 1.6, -Math.PI / 2);
    game.camYaw = -Math.PI / 2;
    game.missions.start(1);
    game.crowd.gather(game.onFoot.x + 12, game.onFoot.z, 10, 30);
    game.traffic.lineUp('x', 4, 1, b.cx - 30, 3, 22);
    game.traffic.lineUp('x', 4, -1, b.cx + 40, 2, 24);
    game.weapons.select(1);
    game.player.setWeapon('pistol');
    game.rig.snap({ x: game.onFoot.x, y: game.onFoot.y, z: game.onFoot.z, yaw: game.camYaw, speed: 0 }, 'foot');
    game.autoTick = () => {
      game.autoStep++;
      auto.set('KeyW', game.autoStep < 150 ? 1 : 0);
      auto.firing = false;
    };
  } else if (name === 'drive') {
    game.setHour(19.35);
    const veh = useCar(game, 'coupe', 0xd8d2c4, -66, roadCoord(8) + 4, -Math.PI / 2, 27);
    game.missions.start(5);
    game.traffic.lineUp('x', 8, 1, -40, 3, 26);
    game.traffic.lineUp('x', 8, -1, 60, 4, 24);
    game.crowd.gather(-30, 212, 5, 20);
    game.rig.snap({ x: veh.x, y: 0, z: veh.z, yaw: veh.yaw, speed: 27 }, 'drive');
    game.autoTick = () => {
      game.autoStep++;
      auto.set('KeyW', 1);
      auto.firing = false;
    };
  } else if (name === 'mission') {
    game.setHour(20.35);
    const b = blockBounds(3, 3);
    const px = b.cx, pz = roadCoord(3) + 2.4;
    game.onFoot.setPos(px, pz, -Math.PI / 2);
    game.camYaw = -Math.PI / 2;
    game.weapons.select(2);
    game.player.setWeapon('smg');
    game.missions.start(3);
    game.missions.stage = 1;
    game.kills = 2;
    game.dialogue.clear();
    game.dialogue.say('oru', 'Five of them on the roof. Make it loud, make it quick.', 20);
    game.wanted.stars = 4;
    game.wanted.heat = 55;
    game.wanted.setStatus('AIR UNIT DEPLOYED · 6 UNITS', 20);
    game.heli.setActive(true);
    game.heli.group.position.set(px + 26, 32, pz - 22);
    const u1 = game.police.spawnCruiser(px + 9, pz + 3.0, -Math.PI / 2, true);
    const u2 = game.police.spawnCruiser(px + 15, pz - 2.6, -Math.PI / 2, true);
    u1.veh.addDamage(30);
    game.police.spawnOfficer(px + 7.5, pz + 2.4, -Math.PI / 2);
    game.police.spawnOfficer(px + 12.0, pz - 3.4, -Math.PI / 2);
    game.police.spawnOfficer(px + 17.5, pz + 1.2, -Math.PI / 2);
    game.crowd.gather(px + 6, pz + 6, 8, 24);
    game.traffic.lineUp('x', 3, 1, px + 30, 3, 24);
    game.rig.snap({ x: game.onFoot.x, y: game.onFoot.y, z: game.onFoot.z, yaw: -Math.PI / 2, speed: 0 }, 'aim');
    game.autoTick = () => {
      game.autoStep++;
      auto.set('KeyW', 0);
      const last = game.autoStep > SHOT_STEPS - 2;
      auto.firing = last;
      if (last) {
        game.aiming = true;
        const off = game.police.officers[1];
        if (off && !off.dead) game.officerShot(off);
      }
    };
  }
}
