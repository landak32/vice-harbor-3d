// Assembles the whole harbor: pavements and roads, the four districts of buildings, street
// furniture, the sea, the horizon, then hands back the pieces the simulation needs.
import { createMaterials } from '../render/materials.js';
import { buildRoads } from './roads.js';
import { buildBuildings } from './buildings.js';
import { buildProps } from './props.js';
import { buildOcean } from './ocean.js';
import { buildSkyline } from './skyline.js';

export function buildCity(scene, rng) {
  const mats = createMaterials(rng.fork());
  const roads = buildRoads(scene, mats, rng.fork());
  const buildings = buildBuildings(scene, mats, rng.fork());
  const props = buildProps(scene, mats, rng.fork());
  const ocean = buildOcean(scene, mats, rng.fork());
  const skyline = buildSkyline(scene, rng.fork());
  mats.halo = props.haloMat;
  return { mats, roads, buildings, props, ocean, skyline, colliders: buildings.buildings };
}
