# Vice Harbor — an open-world crime sandbox in the browser

A third-person, low-poly crime sandbox that runs in a single HTML page: drive, walk, get
wanted, shake the police, and take missions across a foggy harbour city at dusk. Everything
is drawn with three.js — no build step, no bundler, no network at runtime.

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/landak32/vice-harbor-3d/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/landak32/vice-harbor-3d/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Built for the [make.fun](https://make.fun) "Make GTA 6" bounty.

## What is in it

- **A real 3D city.** Instanced low-poly blocks with lit windows and neon storefronts, a
  harbour skyline, a ferry terminal, street lamps and palms, on a 400 m grid of roads.
- **Two cameras.** A chase camera that rides over the shoulder on foot and pulls back and
  drops low in a car; the horizon tilts with the road.
- **A day/night cycle.** Sunset bleeds into a blue hour with a moon fill, so night frames
  stay readable instead of going black.
- **Traffic that behaves.** Cars follow lane logic, brake for each other and for the player,
  and honk instead of driving through you.
- **Pedestrians** on the pavements, crossing at corners.
- **Police.** Cruisers with flashing light bars, officers on foot who shoot, a wanted level
  that rises with the damage you do, and a helicopter air unit that orbits with a
  searchlight.
- **Missions, money, HUD.** A mission chain with objectives, cash, a minimap, wanted stars
  and a clock, all in DOM over the canvas.

## Run it

The game is static — serve the `game/` directory with any static server and open it:

```sh
node serve.ts --port 8080      # or: python3 -m http.server 8080 --directory game
```

Then open <http://localhost:8080>. No install, no build.

The four screenshots in `screenshots/` are generated from the same page: `shots.json` maps
each file to a query string (`?shot=chase&seed=7`), and the page stages that scene, holds
the camera and stops, so a capture is deterministic.

## Layout

```
game/index.html          the page: canvas, HUD, menu
game/src/main.js         game loop, shot mode, wiring
game/src/config.js       tunables: city size, traffic counts, police aggression
game/src/core/           seeded rng, math helpers
game/src/world/          city grid, road network
game/src/render/         renderer, sky, lighting
game/src/entities/       player, vehicles, traffic, pedestrians, police, helicopter
game/src/systems/        camera rig, shot scenes, missions, wanted level
game/src/ui/             HUD, minimap, menus
game/vendor/             three.js r187, vendored
```

## Notes

- Seeded randomness: the same `seed` query gives the same city and the same traffic, which
  is what makes the screenshots repeatable.
- three.js is vendored into `game/vendor/` rather than loaded from a CDN, so the page works
  offline and the harness can run it with no network.
