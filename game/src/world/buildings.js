// Procedural architecture. Each block is split into lots, each lot becomes a building with
// a real facade: punched windows (some lit), floor bands, corner pilasters, ground-floor
// shops with awnings and neon signs, balconies, parapets, AC units and rooftop water tanks.
// Everything is merged into one opaque and one unlit buffer per 2x2-block chunk so the whole
// skyline costs about thirty draw calls.
import * as THREE from '../../vendor/three.module.min.js';
import { CFG, PALETTES } from '../config.js';
import { MeshBatch } from '../render/geoBuilder.js';
import { roadCoord, blockBounds, districtOf } from './cityGrid.js';
import { clamp, shade, mixHex } from '../core/math.js';

const SIDES = [
  { n: [0, 1], t: [1, 0], half: 'd' },   // faces +Z
  { n: [0, -1], t: [-1, 0], half: 'd' }, // faces -Z
  { n: [1, 0], t: [0, -1], half: 'w' },  // faces +X
  { n: [-1, 0], t: [0, 1], half: 'w' },  // faces -X
];
const LIT_COLORS = [0xffd79a, 0xffc46b, 0xfff0c8, 0xbfd8ff, 0xffb877];
const SHOP_COLORS = [0xff6b6b, 0x4fc3f7, 0xffd166, 0x9be36b, 0xe58cff, 0xff9d4d];
const AWNING_COLORS = [0xb8434f, 0x2f6f6a, 0xc99a3e, 0x4a5a8a, 0x8a4a6a, 0x3f7a4a];

export function signUV(i) {
  const col = i % 4, row = Math.floor(i / 4) % 8;
  return [col / 4 + 0.005, 1 - row / 8 - 0.004, (col + 1) / 4 - 0.005, 1 - (row + 1) / 8 + 0.004];
}

// One flat panel on a building side, wound to face outward.
function panel(batch, cx, cz, side, half, u0, u1, y0, y1, color, uv = null) {
  const { n, t } = side;
  const px = (u) => cx + n[0] * half + t[0] * u;
  const pz = (u) => cz + n[1] * half + t[1] * u;
  batch.quad([px(u0), y0, pz(u0)], [px(u1), y0, pz(u1)], [px(u1), y1, pz(u1)], [px(u0), y1, pz(u0)], color, uv);
}

function facadeWindows(solid, glow, rng, cx, cz, side, half, width, groundH, floors, floorH, glass, opts) {
  const cols = clamp(Math.round(width / (opts.winSpacing || 3.2)), 2, 5);
  const winW = opts.winW || 1.25, winH = opts.winH || 1.6;
  const span = width - 1.6;
  for (let f = 0; f < floors; f++) {
    const y = groundH + f * floorH + 0.95;
    for (let c = 0; c < cols; c++) {
      const u = -span / 2 + (span / (cols - 1 || 1)) * c;
      const u0 = u - winW / 2, u1 = u + winW / 2;
      const lit = rng.chance(opts.litChance ?? 0.34);
      if (lit) {
        panel(glow, cx, cz, side, half + 0.045, u0, u1, y, y + winH, rng.pick(LIT_COLORS));
      } else {
        panel(solid, cx, cz, side, half + 0.04, u0, u1, y, y + winH, glass);
      }
      // sill / lintel give the grid a little relief
      panel(solid, cx, cz, side, half + 0.06, u0 - 0.12, u1 + 0.12, y - 0.16, y - 0.05, opts.trim);
    }
    if (opts.band) panel(solid, cx, cz, side, half + 0.05, -width / 2, width / 2, y + winH + 0.35, y + winH + 0.55, opts.bandColor);
  }
}

function storefront(solid, glow, sign, rng, cx, cz, side, half, width, accent, glass, awning) {
  const w = width * 0.88;
  // glazing
  panel(solid, cx, cz, side, half + 0.05, -w / 2, w / 2, 0.55, 3.1, glass);
  // mullions
  for (let m = 1; m < 4; m++) {
    const u = -w / 2 + (w / 4) * m;
    panel(solid, cx, cz, side, half + 0.09, u - 0.06, u + 0.06, 0.55, 3.1, shade(glass, 1.9));
  }
  // warm interior glow at night
  if (rng.chance(0.7)) panel(glow, cx, cz, side, half + 0.06, -w / 2 + 0.2, w / 2 - 0.2, 0.75, 2.9, rng.pick([0x3a2a18, 0x2a2418, 0x40281c]));
  // awning: slab + hanging valance, striped by splitting into bands
  if (awning) {
    const proj = 1.5;
    panel(solid, cx, cz, side, half + proj, -w / 2, w / 2, 3.25, 3.4, awning);
    panel(solid, cx, cz, side, half + proj, -w / 2, w / 2, 2.95, 3.25, shade(awning, 0.7));
    for (let s = 0; s < 6; s++) {
      const u0 = -w / 2 + (w / 6) * s;
      panel(solid, cx, cz, side, half + proj + 0.02, u0, u0 + w / 12, 3.28, 3.4, shade(awning, 1.25));
    }
    // brackets
    panel(solid, cx, cz, side, half + proj * 0.5, -w / 2, -w / 2 + 0.12, 3.1, 3.3, shade(awning, 0.55));
    panel(solid, cx, cz, side, half + proj * 0.5, w / 2 - 0.12, w / 2, 3.1, 3.3, shade(awning, 0.55));
  }
  // neon sign band above the shop
  const idx = rng.int(32);
  const sw = Math.min(width * 0.8, 7.2);
  panel(sign, cx, cz, side, half + 0.14, -sw / 2, sw / 2, 4.0, 4.0 + sw * 0.11, 0xffffff, signUV(idx));
  panel(glow, cx, cz, side, half + 0.11, -sw / 2 - 0.15, sw / 2 + 0.15, 3.9, 4.15 + sw * 0.11, shade(accent, 0.35));
}

function rooftop(solid, glow, rng, cx, cz, w, d, h, pal) {
  // parapet ring
  const t = 0.35, ph = 0.85;
  solid.box(cx, h + ph / 2, cz + d / 2 - t / 2, w, ph, t, pal.trim);
  solid.box(cx, h + ph / 2, cz - d / 2 + t / 2, w, ph, t, pal.trim);
  solid.box(cx + w / 2 - t / 2, h + ph / 2, cz, t, ph, d, pal.trim);
  solid.box(cx - w / 2 + t / 2, h + ph / 2, cz, t, ph, d, pal.trim);
  // stair hut
  if (rng.chance(0.75)) solid.box(cx + w * 0.18, h + 1.3, cz - d * 0.16, 3.2, 2.6, 2.8, shade(pal.wall[0], 0.78));
  // AC units
  const acs = 1 + rng.int(3);
  for (let i = 0; i < acs; i++) {
    const ax = cx + rng.range(-w * 0.32, w * 0.32), az = cz + rng.range(-d * 0.32, d * 0.32);
    solid.box(ax, h + 0.55, az, 1.5, 0.9, 1.1, 0xb9bec4);
    solid.box(ax, h + 1.05, az, 1.2, 0.14, 0.9, 0x8d9399);
  }
  // water tank on legs
  if (rng.chance(0.4)) {
    const tx = cx + rng.range(-w * 0.25, w * 0.25), tz = cz + rng.range(-d * 0.25, d * 0.25);
    for (const s of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) solid.box(tx + s[0], h + 0.9, tz + s[1], 0.16, 1.8, 0.16, 0x4c4a45);
    solid.cylinder(tx, h + 1.8, tz, 1.35, 2.4, 0x7d6a52, 8, 1.2);
    solid.cylinder(tx, h + 4.2, tz, 1.25, 0.25, 0x5f5244, 8);
  }
  // antenna with a red aircraft light
  if (rng.chance(0.55)) {
    solid.box(cx - w * 0.22, h + 2.4, cz + d * 0.2, 0.12, 4.8, 0.12, 0x9aa0a6);
    glow.box(cx - w * 0.22, h + 4.85, cz + d * 0.2, 0.3, 0.3, 0.3, 0xff3b3b);
  }
}

function balconies(solid, rng, cx, cz, side, half, width, groundH, floors, floorH) {
  const count = Math.min(floors, 3);
  for (let f = 0; f < count; f++) {
    if (!rng.chance(0.55)) continue;
    const y = groundH + f * floorH + 0.4;
    const u = rng.range(-width * 0.3, width * 0.3);
    const bw = Math.min(3.2, width * 0.4);
    panel(solid, cx, cz, side, half + 0.7, u - bw / 2, u + bw / 2, y, y + 0.18, 0xcfcabd); // slab
    panel(solid, cx, cz, side, half + 1.38, u - bw / 2, u + bw / 2, y + 0.18, y + 0.95, 0x8f9aa2); // rail
    for (let b = 0; b < 5; b++) {
      const bu = u - bw / 2 + (bw / 4) * b;
      panel(solid, cx, cz, side, half + 1.4, bu - 0.05, bu + 0.05, y + 0.18, y + 0.95, 0x5d666d);
    }
  }
}

function buildOne(solid, glow, sign, rng, pal, x, z, w, d, floors, style, faces) {
  const floorH = 3.35, groundH = 4.4;
  const h = groundH + floors * floorH;
  const wall = pal.wall[rng.int(pal.wall.length)];
  const wall2 = shade(wall, 1.06);
  const glass = mixHex(pal.glass, 0x0a1018, rng.range(0, 0.4));

  // main mass, slightly tapered by stacking a narrower crown on tall towers
  solid.box(x, h / 2, z, w, h, d, wall);
  solid.box(x, 0.5, z, w + 0.5, 1.0, d + 0.5, shade(pal.trim, 0.85));
  if (floors > 9) {
    const cw = w * 0.76, cd = d * 0.76, ch = h * 0.14;
    solid.box(x, h + ch / 2, z, cw, ch, cd, wall2);
    solid.box(x, h + ch + 0.25, z, cw + 0.4, 0.5, cd + 0.4, pal.trim);
    rooftop(solid, glow, rng, x, z, cw, cd, h + ch, pal);
  } else {
    rooftop(solid, glow, rng, x, z, w, d, h, pal);
  }

  for (let s = 0; s < 4; s++) {
    const side = SIDES[s];
    const face = faces[s];
    const width = side.half === 'w' ? w : d;
    const half = (side.half === 'w' ? w : d) / 2;
    // corner pilasters on the two edges of every side
    if (style !== 'tower') {
      panel(solid, x, z, side, half + 0.06, -width / 2, -width / 2 + 0.55, 1.0, h, shade(pal.trim, 1.05));
      panel(solid, x, z, side, half + 0.06, width / 2 - 0.55, width / 2, 1.0, h, shade(pal.trim, 1.05));
    }
    if (!face && style !== 'tower') continue;
    facadeWindows(solid, glow, rng, x, z, side, half, width, groundH, floors, floorH, glass, {
      trim: shade(pal.trim, 1.12), band: style === 'tower', bandColor: shade(wall, 0.86),
      winSpacing: style === 'tower' ? 2.9 : 3.3, winW: style === 'tower' ? 1.5 : 1.2,
      winH: style === 'tower' ? 1.9 : 1.55, litChance: style === 'tower' ? 0.42 : 0.3,
    });
    if (face) {
      storefront(solid, glow, sign, rng, x, z, side, half, width, rng.pick(SHOP_COLORS),
        mixHex(pal.glass, 0x20303c, 0.5), style === 'yard' ? 0 : rng.pick(AWNING_COLORS));
      if (style === 'row' || style === 'strand') balconies(solid, rng, x, z, side, half, width, groundH, floors, floorH);
    }
  }

  // corrugated ribs and a big roll-up door for the warehouses in Oru Yards
  if (style === 'yard') {
    for (let i = 0; i < 8; i++) {
      const u = -w / 2 + (w / 8) * i + 0.6;
      panel(solid, x, z, SIDES[0], d / 2 + 0.05, u, u + 0.35, 1.0, h - 0.4, shade(wall, 0.92));
    }
    panel(solid, x, z, SIDES[1], d / 2 + 0.08, -3.4, 3.4, 0.1, 4.6, 0x5a5f63);
    for (let i = 0; i < 7; i++) panel(solid, x, z, SIDES[1], d / 2 + 0.1, -3.3, 3.3, 0.4 + i * 0.6, 0.52 + i * 0.6, 0x7a7f83);
  }
}

export function buildBuildings(scene, mats, rng) {
  const chunks = new Map();
  const buildings = [];
  const signs = [];
  const chunk = (i, j) => {
    const key = `${i >> 1}_${j >> 1}`;
    let c = chunks.get(key);
    if (!c) { c = { solid: new MeshBatch(), glow: new MeshBatch(), sign: new MeshBatch() }; chunks.set(key, c); }
    return c;
  };

  for (let i = 0; i < CFG.BLOCKS; i++) {
    for (let j = 0; j < CFG.BLOCKS; j++) {
      const dkey = districtOf(i, j);
      const pal = PALETTES[dkey];
      const b = blockBounds(i, j);
      const c = chunk(i, j);
      // Buildings sit back from the curb so the pavement is walkable and reads as a pavement.
      const sb = CFG.SIDEWALK;
      const bx0 = b.x0 + sb, bx1 = b.x1 - sb, bz0 = b.z0 + sb, bz1 = b.z1 - sb;
      const n = dkey === 'downtown' ? 2 : dkey === 'yards' ? 2 : (rng.chance(0.5) ? 2 : 3);
      const gap = 1.6;
      const lw = (bx1 - bx0 - gap * (n - 1)) / n;
      const ld = (bz1 - bz0 - gap * (n - 1)) / n;
      for (let a = 0; a < n; a++) {
        for (let bb = 0; bb < n; bb++) {
          if (rng.chance(dkey === 'yards' ? 0.22 : 0.1)) continue; // empty lot / parking
          const lx = bx0 + a * (lw + gap) + lw / 2;
          const lz = bz0 + bb * (ld + gap) + ld / 2;
          const inset = rng.range(0.5, 2.2);
          const w = lw - inset, d = ld - inset;
          const dist = Math.hypot(lx, lz);
          let floors;
          if (dkey === 'downtown') floors = Math.round(clamp(13 - dist / 26, 6, 13) + rng.range(-1.5, 1.5));
          else if (dkey === 'strand') floors = 1 + rng.int(3);
          else if (dkey === 'yards') floors = 1 + rng.int(2);
          else floors = 1 + rng.int(5);
          floors = Math.max(1, Math.min(14, floors));
          const style = dkey === 'downtown' ? 'tower' : dkey === 'yards' ? 'yard' : dkey === 'strand' ? 'strand' : 'row';
          const faces = [
            Math.abs(lz + d / 2 - bz1) < 1.6,
            Math.abs(lz - d / 2 - bz0) < 1.6,
            Math.abs(lx + w / 2 - bx1) < 1.6,
            Math.abs(lx - w / 2 - bx0) < 1.6,
          ];
          buildOne(c.solid, c.glow, c.sign, rng, pal, lx, lz, w, d, floors, style, faces);
          buildings.push({ x: lx, z: lz, w, d, h: 4.4 + floors * 3.35, district: dkey });
          if (faces.some(Boolean)) signs.push({ x: lx, z: lz, w, d, faces });
        }
      }
    }
  }

  const group = new THREE.Group();
  group.name = 'buildings';
  for (const [, c] of chunks) {
    const m = new THREE.Mesh(c.solid.build(), mats.solid);
    m.receiveShadow = true;
    group.add(m);
    if (c.glow.n > 0) group.add(new THREE.Mesh(c.glow.build(), mats.glow));
    if (c.sign.n > 0) group.add(new THREE.Mesh(c.sign.build(), mats.sign));
  }
  scene.add(group);
  return { group, buildings, signs };
}
