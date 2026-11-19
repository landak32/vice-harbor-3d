// Vice Harbor's tuning table. Every magic number the game leans on lives here so the
// city, the cars and the cameras stay in agreement about how big the world is.
export const CFG = {
  // The grid: 8 x 8 city blocks, a two-lane road between each pair, plus a ring road.
  BLOCKS: 8,
  ROAD_W: 16,
  BLOCK_W: 34,
  PITCH: 50,
  CITY_W: 416,
  HALF: 208,
  LANE: 4.0,          // lane centre offset from the road centre line
  SIDEWALK: 3.2,
  CURB_H: 0.18,
  BEACH_Z: 224,       // where the sand starts (south edge)
  OCEAN_Z: 286,
  FPS_STEP: 1 / 60,
  MAX_STEPS: 5,
  SHADOW: 1024,
};

export const WEAPONS = {
  fists:   { name: 'Fists',   dmg: 12, rate: 0.42,  spread: 0,     range: 2.6, ammo: -1,  mag: -1,  auto: false, kick: 0.6 },
  pistol:  { name: 'Pistol',  dmg: 34, rate: 0.26,  spread: 0.022, range: 120, ammo: 120, mag: 12,  auto: false, kick: 2.2 },
  smg:     { name: 'SMG',     dmg: 19, rate: 0.085, spread: 0.055, range: 90,  ammo: 240, mag: 30,  auto: true,  kick: 1.5 },
  shotgun: { name: 'Shotgun', dmg: 22, rate: 0.78,  spread: 0.14,  range: 42,  ammo: 40,  mag: 6,   auto: false, kick: 5.0, pellets: 7 },
};

// Times of day used by the sky, the windows and the streetlights. `sun` is the elevation
// in degrees, `az` the compass angle the sunlight comes from, measured in world radians.
export const TIMES = {
  dawn:    { hour: 5.6,  sun: 4,   az: -1.15,  top: 0x2a3a63, hor: 0xf2a37e, fog: 0xc9a99a, amb: 0.62, neon: 0.55, sunCol: 0xffb07a },
  morning: { hour: 8.5,  sun: 38,  az: 0.55,  top: 0x5f9ad6, hor: 0xd8e6ef, fog: 0xc4d6e2, amb: 0.95, neon: 0.06, sunCol: 0xfff3dc },
  noon:    { hour: 12.5, sun: 68,  az: -0.25, top: 0x4f8fd8, hor: 0xcfe4f0, fog: 0xc3d8e6, amb: 1.0,  neon: 0.0,  sunCol: 0xfffaf0 },
  sunset:  { hour: 19.4, sun: 5,   az: 1.05, top: 0x2c3a72, hor: 0xff9b52, fog: 0xd98a63, amb: 0.72, neon: 0.5,  sunCol: 0xffa257 },
  dusk:    { hour: 20.3, sun: -3,  az: 1.05, top: 0x1b2447, hor: 0xc4635e, fog: 0x7d5a63, amb: 0.58,  neon: 0.9,  sunCol: 0xff8a5a },
  night:   { hour: 22.6, sun: -22, az: 1.05, top: 0x08101f, hor: 0x26344f, fog: 0x18202f, amb: 0.44,  neon: 1.0,  sunCol: 0x8fa8d8 },
};

export const PALETTES = {
  downtown: { wall: [0x8f97a6, 0x7b8492, 0x9aa4b4, 0x6f7887, 0xa8b0bd], trim: 0x5a6270, glass: 0x1b2734, accent: 0x2f7f9e, store: 0x2a3340 },
  strand:   { wall: [0xe9d6b4, 0xf0c9a8, 0xd9c6a0, 0xe7b9a0, 0xf2ddc0], trim: 0xb99478, glass: 0x2a3a42, accent: 0xd2607a, store: 0x3a3038 },
  row:      { wall: [0xb98a6a, 0xa8795d, 0xc59c78, 0x9c7156, 0xb08e74], trim: 0x6e5040, glass: 0x222d38, accent: 0x4a7f6a, store: 0x2c2622 },
  yards:    { wall: [0x7d7f7a, 0x8a8377, 0x6c6f6b, 0x9a9184, 0x74766f], trim: 0x4a4c48, glass: 0x1d262e, accent: 0xc47b3a, store: 0x272b2c },
};

export const STREETS_X = ['Halcyon Ave', 'Kessler Row', 'Marigold St', 'Sundara Way', 'Oru Quay', 'Tidewater', 'Pelican Rd', 'Coral Lane', 'Kumala Blvd'];
export const STREETS_Z = ['Northline', 'Bellamy St', 'Cinder Row', 'Kessler Heights', 'Amber St', 'Saltmarsh', 'Anchor Way', 'Strand Parade', 'Shoreline Dr'];
